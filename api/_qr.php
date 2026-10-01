<?php
// QR kód jako obrázek PNG – bez rozšíření GD (na hostingu nemusí být). Pro QR Platbu v e-mailech.
//   qr_png($text)            → binární PNG (černobílý, okraj 4 moduly, cca 8 px na modul, nejvýš ~400 px)
//   qr_matice($text, $maska) → matice modulů [řádek][sloupec] = true (tmavý); $maska -1 = vybrat automaticky
// Jen bajtový režim (UTF-8 text tak, jak je), úroveň opravy chyb M, verze 1–40.
//
// Převzato (zkráceno a přeloženo do PHP) z knihovny „QR Code generator library“, Project Nayuki
// https://www.nayuki.io/page/qr-code-generator-library
//
// Copyright (c) Project Nayuki. (MIT License)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
// - The above copyright notice and this permission notice shall be included in
//   all copies or substantial portions of the Software.
// - The Software is provided "as is", without warranty of any kind, express or
//   implied, including but not limited to the warranties of merchantability,
//   fitness for a particular purpose and noninfringement. In no event shall the
//   authors or copyright holders be liable for any claim, damages or other
//   liability, whether in an action of contract, tort or otherwise, arising from,
//   out of or in connection with the Software or the use or other dealings in the
//   Software.
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) { http_response_code(404); exit; }

// Úroveň M: počet opravných bajtů v jednom bloku a počet bloků podle verze (index 0 se nepoužívá).
const QR_ECC_NA_BLOK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const QR_BLOKU = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];

// Počet modulů pro data a opravné bajty (bez funkčních vzorů) ve verzi $v.
function qr_datove_moduly(int $v): int {
  $r = (16 * $v + 128) * $v + 64;
  if ($v >= 2) {
    $n = intdiv($v, 7) + 2;
    $r -= (25 * $n - 10) * $n - 55;
    if ($v >= 7) $r -= 36;
  }
  return $r;
}

function qr_datove_bajty(int $v): int {
  return intdiv(qr_datove_moduly($v), 8) - QR_ECC_NA_BLOK[$v] * QR_BLOKU[$v];
}

// Násobení v GF(2^8) s polynomem 0x11D.
function qr_rs_nasobit(int $x, int $y): int {
  $z = 0;
  for ($i = 7; $i >= 0; $i--) {
    $z = ($z << 1) ^ (($z >> 7) * 0x11D);
    $z ^= (($y >> $i) & 1) * $x;
  }
  return $z;
}

function qr_rs_delitel(int $stupen): array {
  $r = array_fill(0, $stupen, 0);
  $r[$stupen - 1] = 1;
  $koren = 1;
  for ($i = 0; $i < $stupen; $i++) {
    for ($j = 0; $j < $stupen; $j++) {
      $r[$j] = qr_rs_nasobit($r[$j], $koren);
      if ($j + 1 < $stupen) $r[$j] ^= $r[$j + 1];
    }
    $koren = qr_rs_nasobit($koren, 0x02);
  }
  return $r;
}

function qr_rs_zbytek(array $data, array $delitel): array {
  $r = array_fill(0, count($delitel), 0);
  foreach ($data as $b) {
    $f = $b ^ array_shift($r);
    $r[] = 0;
    foreach ($delitel as $i => $c) $r[$i] ^= qr_rs_nasobit($c, $f);
  }
  return $r;
}

// Datové bajty doplněné o opravné a proložené po blocích (pořadí, v jakém se kreslí do matice).
function qr_kodova_slova(string $text, int $v): array {
  $n = strlen($text);
  $bity = [];
  $pridat = function (int $hodnota, int $delka) use (&$bity): void {
    for ($i = $delka - 1; $i >= 0; $i--) $bity[] = ($hodnota >> $i) & 1;
  };
  $pridat(4, 4);                        // bajtový režim
  $pridat($n, $v <= 9 ? 8 : 16);        // délka
  for ($i = 0; $i < $n; $i++) $pridat(ord($text[$i]), 8);
  $kapacita = qr_datove_bajty($v) * 8;
  $pridat(0, min(4, $kapacita - count($bity)));
  $pridat(0, (8 - count($bity) % 8) % 8);
  for ($vypln = 0xEC; count($bity) < $kapacita; $vypln ^= 0xEC ^ 0x11) $pridat($vypln, 8);
  $data = [];
  foreach (array_chunk($bity, 8) as $bajt) {
    $b = 0;
    foreach ($bajt as $bit) $b = ($b << 1) | $bit;
    $data[] = $b;
  }

  $bloku = QR_BLOKU[$v];
  $ecc = QR_ECC_NA_BLOK[$v];
  $celkem = intdiv(qr_datove_moduly($v), 8);
  $kratkych = $bloku - $celkem % $bloku;
  $kratkaDelka = intdiv($celkem, $bloku);
  $delitel = qr_rs_delitel($ecc);
  $bloky = [];
  for ($i = 0, $k = 0; $i < $bloku; $i++) {
    $dat = array_slice($data, $k, $kratkaDelka - $ecc + ($i < $kratkych ? 0 : 1));
    $k += count($dat);
    $opravne = qr_rs_zbytek($dat, $delitel);
    if ($i < $kratkych) $dat[] = 0;
    $bloky[] = array_merge($dat, $opravne);
  }
  $vysledek = [];
  for ($i = 0, $m = count($bloky[0]); $i < $m; $i++) {
    foreach ($bloky as $j => $blok) {
      if ($i !== $kratkaDelka - $ecc || $j >= $kratkych) $vysledek[] = $blok[$i];
    }
  }
  return $vysledek;
}

function qr_matice(string $text, int $maska = -1): array {
  $n = strlen($text);
  for ($v = 1; ; $v++) {
    if ($v > 40) throw new InvalidArgumentException('Text je pro QR kód příliš dlouhý');
    if (4 + ($v <= 9 ? 8 : 16) + 8 * $n <= qr_datove_bajty($v) * 8) break;
  }
  $slova = qr_kodova_slova($text, $v);
  $vel = $v * 4 + 17;
  $mod = array_fill(0, $vel, array_fill(0, $vel, false));
  $fun = $mod;
  $nastavit = function (int $x, int $y, bool $tmavy) use (&$mod, &$fun): void { $mod[$y][$x] = $tmavy; $fun[$y][$x] = true; };

  // Časovací vzory, hledací vzory v rozích a zarovnávací vzory.
  for ($i = 0; $i < $vel; $i++) { $nastavit(6, $i, $i % 2 === 0); $nastavit($i, 6, $i % 2 === 0); }
  foreach ([[3, 3], [$vel - 4, 3], [3, $vel - 4]] as [$cx, $cy]) {
    for ($dy = -4; $dy <= 4; $dy++) for ($dx = -4; $dx <= 4; $dx++) {
      $x = $cx + $dx; $y = $cy + $dy;
      $d = max(abs($dx), abs($dy));
      if ($x >= 0 && $x < $vel && $y >= 0 && $y < $vel) $nastavit($x, $y, $d !== 2 && $d !== 4);
    }
  }
  $pozice = [];
  if ($v > 1) {
    $pocet = intdiv($v, 7) + 2;
    $krok = intdiv($v * 8 + $pocet * 3 + 5, $pocet * 4 - 4) * 2;
    $pozice = [6];
    for ($p = $vel - 7; count($pozice) < $pocet; $p -= $krok) array_splice($pozice, 1, 0, [$p]);
  }
  $np = count($pozice);
  for ($i = 0; $i < $np; $i++) for ($j = 0; $j < $np; $j++) {
    if (($i === 0 && $j === 0) || ($i === 0 && $j === $np - 1) || ($i === $np - 1 && $j === 0)) continue;
    for ($dy = -2; $dy <= 2; $dy++) for ($dx = -2; $dx <= 2; $dx++) $nastavit($pozice[$i] + $dx, $pozice[$j] + $dy, max(abs($dx), abs($dy)) !== 1);
  }

  // Informace o formátu (úroveň M = 0b00 a maska), dvakrát.
  $format = function (int $m) use ($nastavit, $vel): void {
    $data = (0 << 3) | $m;
    $zb = $data;
    for ($i = 0; $i < 10; $i++) $zb = ($zb << 1) ^ (($zb >> 9) * 0x537);
    $bity = (($data << 10) | $zb) ^ 0x5412;
    $bit = fn(int $i): bool => (($bity >> $i) & 1) !== 0;
    for ($i = 0; $i <= 5; $i++) $nastavit(8, $i, $bit($i));
    $nastavit(8, 7, $bit(6));
    $nastavit(8, 8, $bit(7));
    $nastavit(7, 8, $bit(8));
    for ($i = 9; $i < 15; $i++) $nastavit(14 - $i, 8, $bit($i));
    for ($i = 0; $i < 8; $i++) $nastavit($vel - 1 - $i, 8, $bit($i));
    for ($i = 8; $i < 15; $i++) $nastavit(8, $vel - 15 + $i, $bit($i));
    $nastavit(8, $vel - 8, true);
  };
  $format(0);

  // Informace o verzi (od verze 7).
  if ($v >= 7) {
    $zb = $v;
    for ($i = 0; $i < 12; $i++) $zb = ($zb << 1) ^ (($zb >> 11) * 0x1F25);
    $bity = ($v << 12) | $zb;
    for ($i = 0; $i < 18; $i++) {
      $tmavy = (($bity >> $i) & 1) !== 0;
      $a = $vel - 11 + $i % 3;
      $b = intdiv($i, 3);
      $nastavit($a, $b, $tmavy);
      $nastavit($b, $a, $tmavy);
    }
  }

  // Data „cik-cak“ ve dvojsloupcích zprava doleva.
  $i = 0;
  $bitu = count($slova) * 8;
  for ($vpravo = $vel - 1; $vpravo >= 1; $vpravo -= 2) {
    if ($vpravo === 6) $vpravo = 5;
    $nahoru = (($vpravo + 1) & 2) === 0;
    for ($svisle = 0; $svisle < $vel; $svisle++) {
      $y = $nahoru ? $vel - 1 - $svisle : $svisle;
      for ($j = 0; $j < 2; $j++) {
        $x = $vpravo - $j;
        if (!$fun[$y][$x] && $i < $bitu) {
          $mod[$y][$x] = (($slova[$i >> 3] >> (7 - ($i & 7))) & 1) !== 0;
          $i++;
        }
      }
    }
  }

  $maskovat = function (int $m) use (&$mod, &$fun, $vel): void {
    for ($y = 0; $y < $vel; $y++) for ($x = 0; $x < $vel; $x++) {
      if ($fun[$y][$x]) continue;
      $obratit = match ($m) {
        0 => ($x + $y) % 2 === 0,
        1 => $y % 2 === 0,
        2 => $x % 3 === 0,
        3 => ($x + $y) % 3 === 0,
        4 => (intdiv($x, 3) + intdiv($y, 2)) % 2 === 0,
        5 => $x * $y % 2 + $x * $y % 3 === 0,
        6 => ($x * $y % 2 + $x * $y % 3) % 2 === 0,
        7 => (($x + $y) % 2 + $x * $y % 3) % 2 === 0,
      };
      if ($obratit) $mod[$y][$x] = !$mod[$y][$x];
    }
  };

  if ($maska < 0 || $maska > 7) {
    $nejmensi = PHP_INT_MAX;
    for ($m = 0; $m < 8; $m++) {
      $maskovat($m);
      $format($m);
      $skore = qr_trest($mod);
      if ($skore < $nejmensi) { $maska = $m; $nejmensi = $skore; }
      $maskovat($m); // XOR vrátí masku zpět
    }
  }
  $maskovat($maska);
  $format($maska);
  return $mod;
}

// Trestné body podle normy (N1 řady, N2 bloky 2×2, N3 vzory podobné hledacím, N4 poměr tmavých modulů).
function qr_trest(array $mod): int {
  $vel = count($mod);
  $vysledek = 0;
  $pridatHistorii = function (int $delka, array &$historie) use ($vel): void {
    if ($historie[0] === 0) $delka += $vel; // světlý okraj před prvním během
    array_pop($historie);
    array_unshift($historie, $delka);
  };
  $vzory = function (array $h): int {
    $n = $h[1];
    $jadro = $n > 0 && $h[2] === $n && $h[3] === $n * 3 && $h[4] === $n && $h[5] === $n;
    return ($jadro && $h[0] >= $n * 4 && $h[6] >= $n ? 1 : 0) + ($jadro && $h[6] >= $n * 4 && $h[0] >= $n ? 1 : 0);
  };
  $ukoncit = function (bool $barva, int $delka, array $historie) use ($pridatHistorii, $vzory, $vel): int {
    if ($barva) { $pridatHistorii($delka, $historie); $delka = 0; }
    $delka += $vel;
    $pridatHistorii($delka, $historie);
    return $vzory($historie);
  };
  foreach ([false, true] as $sloupce) {
    for ($a = 0; $a < $vel; $a++) {
      $barva = false; $beh = 0; $historie = [0, 0, 0, 0, 0, 0, 0];
      for ($b = 0; $b < $vel; $b++) {
        $c = $sloupce ? $mod[$b][$a] : $mod[$a][$b];
        if ($c === $barva) {
          $beh++;
          if ($beh === 5) $vysledek += 3;
          elseif ($beh > 5) $vysledek++;
        } else {
          $pridatHistorii($beh, $historie);
          if (!$barva) $vysledek += $vzory($historie) * 40;
          $barva = $c;
          $beh = 1;
        }
      }
      $vysledek += $ukoncit($barva, $beh, $historie) * 40;
    }
  }
  $tmavych = 0;
  for ($y = 0; $y < $vel; $y++) {
    for ($x = 0; $x < $vel; $x++) {
      if ($mod[$y][$x]) $tmavych++;
      if ($y < $vel - 1 && $x < $vel - 1) {
        $c = $mod[$y][$x];
        if ($c === $mod[$y][$x + 1] && $c === $mod[$y + 1][$x] && $c === $mod[$y + 1][$x + 1]) $vysledek += 3;
      }
    }
  }
  $celkem = $vel * $vel;
  $k = (int)ceil(abs($tmavych * 20 - $celkem * 10) / $celkem) - 1;
  return $vysledek + $k * 10;
}

// PNG (1 bit na pixel, odstíny šedi) sestavený ručně: IHDR, IDAT (zlib), IEND.
function qr_png(string $text): string {
  $mod = qr_matice($text);
  $vel = count($mod);
  $okraj = 4;
  $meritko = max(1, min(8, intdiv(400, $vel + 2 * $okraj)));
  $px = ($vel + 2 * $okraj) * $meritko;
  $obraz = '';
  for ($my = -$okraj; $my < $vel + $okraj; $my++) {
    $radek = "\0"; // filtr „žádný“
    $bajt = 0; $n = 0;
    for ($mx = -$okraj; $mx < $vel + $okraj; $mx++) {
      $tmavy = $my >= 0 && $my < $vel && $mx >= 0 && $mx < $vel && $mod[$my][$mx];
      for ($k = 0; $k < $meritko; $k++) {
        $bajt = ($bajt << 1) | ($tmavy ? 0 : 1); // 0 = černá, 1 = bílá
        if (++$n === 8) { $radek .= chr($bajt); $bajt = 0; $n = 0; }
      }
    }
    if ($n) $radek .= chr(($bajt << (8 - $n)) | ((1 << (8 - $n)) - 1));
    $obraz .= str_repeat($radek, $meritko);
  }
  $blok = fn(string $typ, string $data): string => pack('N', strlen($data)) . $typ . $data . pack('N', crc32($typ . $data));
  return "\x89PNG\r\n\x1a\n"
    . $blok('IHDR', pack('NNCCCCC', $px, $px, 1, 0, 0, 0, 0))
    . $blok('IDAT', qr_zlib($obraz))
    . $blok('IEND', '');
}

// Komprese zlib; bez rozšíření zlib aspoň nekomprimované bloky (PNG je pak jen větší).
function qr_zlib(string $data): string {
  if (function_exists('gzcompress')) {
    $z = gzcompress($data, 9);
    if ($z !== false) return $z;
  }
  return qr_zlib_bez_komprese($data);
}

function qr_zlib_bez_komprese(string $data): string {
  $out = "\x78\x01";
  $kusy = str_split($data, 65535) ?: [''];
  foreach ($kusy as $i => $kus) {
    $delka = strlen($kus);
    $out .= chr($i === count($kusy) - 1 ? 1 : 0) . pack('v', $delka) . pack('v', $delka ^ 0xFFFF) . $kus;
  }
  return $out . pack('N', hexdec(hash('adler32', $data)));
}
