<?php
// Společné věci pro e-shop skripty: účet, odesílání e-mailů, úložiště objednávek, IMAP.
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) { http_response_code(404); exit; }
// Wedos CDN jinak odpovědi skriptů cachuje na 10 minut.
header('Cache-Control: no-store, max-age=0');

date_default_timezone_set('Europe/Prague');

const ODESILATEL = 'objednavky@ovoce-holub.cz';
const JMENO_ODESILATELE = 'Ovocnářství Holub';
const WEB = 'https://ovoce-holub.cz';
const UCET = ['cislo' => '662075319/0800', 'iban' => 'CZ3008000000000662075319', 'majitel' => 'Pavel Holub'];
const IMAP_SERVER = 'ssl://wes1-imap.wedos.net:993';
const SMTP_SERVERY = ['ssl://wes1-smtp.wedos.net:465', 'tcp://wes1-smtp.wedos.net:587', 'tcp://wes1-smtp.wedos.net:25'];
const DATA = __DIR__ . '/data';

// Údaje prodávajícího na účtenkách. Účtenky se vystavují, až je vyplněné IČO.
const PRODAVAJICI = [
  'jmeno' => 'Pavel Holub',
  'adresa' => 'Krtely 70, 384 11 Malovice',
  'ico' => '12320030',
  'dic' => 'CZ6803300394',
  'platce_dph' => true,
  'sazba_dph' => 12, // snížená sazba – ovoce a mošty; ověřit s účetní
  'telefon' => '+420 607 575 271',
  'zapis' => '',
];

function data_cesta(string $soubor): string {
  if (!is_dir(DATA . '/objednavky')) @mkdir(DATA . '/objednavky', 0700, true);
  return DATA . '/' . $soubor;
}

function nacist_json(string $soubor, $vychozi = null) {
  $s = @file_get_contents(data_cesta($soubor));
  $d = $s === false ? null : json_decode($s, true);
  return $d ?? $vychozi;
}

function ulozit_json(string $soubor, $data): void {
  $cesta = data_cesta($soubor);
  file_put_contents($cesta . '.tmp', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
  rename($cesta . '.tmp', $cesta);
}

function nastaveni(): array {
  $f = DATA . '/nastaveni.php';
  return is_file($f) ? (include $f) : [];
}

function ulozit_nastaveni(array $n): void {
  data_cesta('x');
  file_put_contents(DATA . '/nastaveni.php', "<?php\nreturn " . var_export($n, true) . ";\n", LOCK_EX);
}

// Limit počtu volání z jedné IP adresy.
function limit(string $nazev, int $max, int $sekund): bool {
  $ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . $nazev);
  $soubor = sys_get_temp_dir() . "/oh_{$nazev}_$ip";
  $casy = array_filter(array_map('intval', @file($soubor, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > time() - $sekund);
  if (count($casy) >= $max) return false;
  $casy[] = time();
  @file_put_contents($soubor, implode("\n", $casy));
  return true;
}

// „středa 30. 9.“ → „2026-09-30“ (rok podle toho, aby termín ležel v nejbližší budoucnosti).
function datum_terminu(string $den): string {
  if (!preg_match('/(\d{1,2})\.\s*(\d{1,2})\./', $den, $m)) return '';
  $rok = (int)date('Y');
  $t = mktime(12, 0, 0, (int)$m[2], (int)$m[1], $rok);
  if ($t < strtotime('-60 days')) $t = mktime(12, 0, 0, (int)$m[2], (int)$m[1], $rok + 1);
  return date('Y-m-d', $t);
}

function kc(int $castka): string { return number_format($castka, 0, ',', ' ') . ' Kč'; }
function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

// HTML obálka e-mailu v barvách webu.
function email_html(string $nadpis, string $obsah): string {
  return '<!doctype html><html><body style="margin:0;background:#f8f5ef;font-family:Arial,Helvetica,sans-serif;color:#1d231c">'
    . '<div style="max-width:560px;margin:0 auto;padding:28px 20px">'
    . '<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#2f5a33;margin:0 0 6px">Ovocnářství Holub</p>'
    . '<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:26px;margin:0 0 18px">' . h($nadpis) . '</h1>'
    . $obsah
    . '<p style="font-size:13px;color:#6b6f66;margin:18px 0 0">Ovocnářství Holub · Krtely 70, Netolice · <a href="' . WEB . '" style="color:#2f5a33">ovoce-holub.cz</a></p>'
    . '</div></body></html>';
}

function poslat_email(string $komu, string $predmet, string $text, string $html, ?string $png = null, bool $kopie = true): bool {
  $eol = "\r\n";
  $b1 = 'oh1_' . bin2hex(random_bytes(8));
  $b2 = 'oh2_' . bin2hex(random_bytes(8));
  $alt = "--$b2{$eol}Content-Type: text/plain; charset=UTF-8{$eol}Content-Transfer-Encoding: base64{$eol}{$eol}"
    . chunk_split(base64_encode($text)) . $eol
    . "--$b2{$eol}Content-Type: text/html; charset=UTF-8{$eol}Content-Transfer-Encoding: base64{$eol}{$eol}"
    . chunk_split(base64_encode($html)) . $eol . "--$b2--$eol";
  if ($png) {
    $typ = "multipart/related; boundary=\"$b1\"; type=\"multipart/alternative\"";
    $telo = "--$b1{$eol}Content-Type: multipart/alternative; boundary=\"$b2\"{$eol}{$eol}$alt{$eol}"
      . "--$b1{$eol}Content-Type: image/png; name=\"qr-platba.png\"{$eol}Content-Transfer-Encoding: base64{$eol}"
      . "Content-ID: <qrplatba>{$eol}Content-Disposition: inline; filename=\"qr-platba.png\"{$eol}{$eol}"
      . chunk_split(base64_encode($png)) . "--$b1--$eol";
  } else {
    $typ = "multipart/alternative; boundary=\"$b2\"";
    $telo = $alt;
  }
  $od = '=?UTF-8?B?' . base64_encode(JMENO_ODESILATELE) . '?= <' . ODESILATEL . '>';
  $predmetMime = '=?UTF-8?B?' . base64_encode($predmet) . '?=';
  $hlavicky = ['From: ' . $od, 'Reply-To: ' . $od, 'MIME-Version: 1.0', 'Content-Type: ' . $typ];
  $prijemci = [$komu];
  if ($kopie && strcasecmp($komu, ODESILATEL) !== 0) $prijemci[] = ODESILATEL;
  $komuLog = preg_replace('/^(.).*(@.*)$/', '$1…$2', $komu);

  // Přes přihlášené SMTP Wedosu (e-maily jsou podepsané DKIM a nekončí ve spamu); mail() jen jako záloha.
  $heslo = nastaveni()['heslo'] ?? '';
  if ($heslo !== '') {
    try {
      smtp_odeslat($heslo, $prijemci, array_merge([
        'Date: ' . date('r'),
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@ovoce-holub.cz>',
        'To: ' . $komu,
        'Subject: ' . $predmetMime,
      ], $hlavicky), $telo);
      zapsat_log("odesláno (SMTP): $predmet → $komuLog");
      return true;
    } catch (RuntimeException $e) {
      zapsat_log('SMTP selhalo (' . $e->getMessage() . '), zkouším mail()');
    }
  }

  if (count($prijemci) > 1) $hlavicky[] = 'Bcc: ' . ODESILATEL;
  $ok = mail($komu, $predmetMime, $telo, implode($eol, $hlavicky), '-f' . ODESILATEL);
  zapsat_log(($ok ? 'odesláno (mail)' : 'CHYBA mail()') . ": $predmet → $komuLog");
  return $ok;
}

function smtp_odeslat(string $heslo, array $prijemci, array $hlavicky, string $telo): void {
  // Hosting může mít některé odchozí porty zavřené – zkusí se 465 (SSL), pak 587 a 25 (STARTTLS).
  $s = null; $starttls = false;
  foreach (SMTP_SERVERY as $server) {
    $s = @stream_socket_client($server, $errno, $errstr, 8);
    if ($s) { $starttls = str_starts_with($server, 'tcp://'); break; }
  }
  if (!$s) throw new RuntimeException('nelze se připojit (porty 465, 587, 25)');
  stream_set_timeout($s, 30);
  $cti = function (string $ocekavam) use ($s): void {
    do {
      $r = fgets($s);
      if ($r === false) throw new RuntimeException('spojení přerušeno');
    } while (isset($r[3]) && $r[3] === '-');
    if (!str_starts_with($r, $ocekavam)) throw new RuntimeException(trim($r));
  };
  $posli = function (string $c, string $ocekavam) use ($s, $cti): void { fwrite($s, "$c\r\n"); $cti($ocekavam); };
  try {
    $cti('220');
    $posli('EHLO ovoce-holub.cz', '250');
    if ($starttls) {
      $posli('STARTTLS', '220');
      if (!stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) throw new RuntimeException('STARTTLS selhalo');
      $posli('EHLO ovoce-holub.cz', '250');
    }
    $posli('AUTH LOGIN', '334');
    $posli(base64_encode(ODESILATEL), '334');
    $posli(base64_encode($heslo), '235');
    $posli('MAIL FROM:<' . ODESILATEL . '>', '250');
    foreach ($prijemci as $p) $posli("RCPT TO:<$p>", '25');
    $posli('DATA', '354');
    $data = implode("\r\n", $hlavicky) . "\r\n\r\n" . $telo;
    $data = preg_replace('/^\./m', '..', str_replace(["\r\n", "\n"], ["\n", "\r\n"], $data));
    $posli(rtrim($data, "\r\n") . "\r\n.", '250');
    @fwrite($s, "QUIT\r\n");
  } finally {
    @fclose($s);
  }
}

function zapsat_log(string $radek): void {
  $f = data_cesta('log.txt');
  $radky = array_slice(@file($f, FILE_IGNORE_NEW_LINES) ?: [], -199);
  $radky[] = date('Y-m-d H:i:s') . ' ' . $radek;
  file_put_contents($f, implode("\n", $radky) . "\n", LOCK_EX);
}

// ---------------------------------------------------------------------------
// Minimální IMAP klient (PHP 8.4+ už nemá rozšíření imap).
// ---------------------------------------------------------------------------
final class Imap {
  private $s;
  private int $tag = 0;

  public function __construct(string $uzivatel, string $heslo) {
    $this->s = @stream_socket_client(IMAP_SERVER, $errno, $errstr, 20);
    if (!$this->s) throw new RuntimeException('Nelze se připojit k poštovnímu serveru');
    stream_set_timeout($this->s, 30);
    $this->radek();
    [$ok] = $this->prikaz('LOGIN ' . $this->q($uzivatel) . ' ' . $this->q($heslo));
    if (!$ok) throw new RuntimeException('Špatné heslo');
  }

  private function q(string $s): string { return '"' . addcslashes($s, "\"\\") . '"'; }

  private function radek(): string {
    $r = fgets($this->s);
    if ($r === false) throw new RuntimeException('Spojení se serverem přerušeno');
    return $r;
  }

  /** @return array{0: bool, 1: string[], 2: string[]} ok, řádky odpovědi, literály (obsahy zpráv) */
  public function prikaz(string $c): array {
    $t = 'A' . (++$this->tag);
    fwrite($this->s, "$t $c\r\n");
    $radky = []; $literaly = [];
    while (true) {
      $r = $this->radek();
      if (preg_match('/\{(\d+)\}\r\n$/', $r, $m)) {
        $n = (int)$m[1]; $buf = '';
        while (strlen($buf) < $n) {
          $kus = fread($this->s, $n - strlen($buf));
          if ($kus === false || $kus === '') throw new RuntimeException('Spojení se serverem přerušeno');
          $buf .= $kus;
        }
        $literaly[] = $buf;
        $radky[] = $r;
        continue;
      }
      if (str_starts_with($r, "$t ")) return [(bool)preg_match("/^$t OK/i", $r), $radky, $literaly];
      $radky[] = $r;
    }
  }

  public function konec(): void { @fwrite($this->s, "Z LOGOUT\r\n"); @fclose($this->s); }
}

// Z MIME zprávy vytáhne čitelný text (text/plain, jinak text/html bez značek).
function text_zpravy(string $raw): string {
  $casti = [];
  $projit = function (string $cast) use (&$projit, &$casti) {
    [$hl, $telo] = array_pad(preg_split("/\r?\n\r?\n/", $cast, 2), 2, '');
    $hl = preg_replace("/\r?\n[ \t]+/", ' ', $hl);
    $typ = preg_match('/^Content-Type:\s*([^;\s]+)/im', $hl, $m) ? strtolower($m[1]) : 'text/plain';
    if (str_starts_with($typ, 'multipart/') && preg_match('/boundary="?([^";\r\n]+)"?/i', $hl, $b)) {
      foreach (preg_split('/\r?\n--' . preg_quote($b[1], '/') . '(?:--)?[ \t]*\r?\n?/', "\n" . $telo) as $p) {
        if (trim($p) !== '') $projit($p);
      }
      return;
    }
    if ($typ === 'message/rfc822') { $projit($telo); return; }
    if (!str_starts_with($typ, 'text/')) return;
    $kod = preg_match('/^Content-Transfer-Encoding:\s*(\S+)/im', $hl, $m) ? strtolower($m[1]) : '';
    if ($kod === 'base64') $telo = base64_decode(preg_replace('/\s+/', '', $telo)) ?: '';
    elseif ($kod === 'quoted-printable') $telo = quoted_printable_decode($telo);
    $znaky = preg_match('/charset="?([^";\s]+)/i', $hl, $m) ? $m[1] : 'UTF-8';
    if (strcasecmp($znaky, 'UTF-8') !== 0) $telo = @mb_convert_encoding($telo, 'UTF-8', $znaky) ?: $telo;
    $casti[$typ][] = $telo;
  };
  $projit($raw);
  if (!empty($casti['text/plain'])) $t = implode("\n", $casti['text/plain']);
  elseif (!empty($casti['text/html'])) {
    $t = preg_replace('#<(style|script)\b.*?</\1>#is', '', implode("\n", $casti['text/html']));
    $t = preg_replace('#<(br|/p|/div|/tr|/li|/h\d)\b[^>]*>#i', "\n", $t);
    $t = html_entity_decode(strip_tags($t), ENT_QUOTES | ENT_HTML5, 'UTF-8');
  } else $t = '';
  $t = str_replace(["\u{00A0}", "\u{202F}"], ' ', $t);
  return preg_replace("/[ \t]+/", ' ', $t);
}

// Rozpozná upozornění České spořitelny na příchozí platbu.
function platba_z_upozorneni(string $text): ?array {
  if (!preg_match('/Směr platby:\s*p[řr][íi]choz/iu', $text)) return null;
  if (!preg_match('/Variabilní symbol:\s*(\d+)/u', $text, $vs)) $vs = [1 => ''];
  $castka = null;
  foreach (['Částka v měně účtu', 'Částka v měně transakce'] as $pole) {
    if (preg_match('/' . $pole . ':\s*([\d ]+(?:,\d{1,2})?)\s*Kč/u', $text, $m)) {
      $castka = (float)str_replace([' ', ','], ['', '.'], $m[1]);
      break;
    }
  }
  if ($castka === null) return null;
  preg_match('/Datum a čas platby:\s*([^\n]+)/u', $text, $d);
  preg_match('/Číslo účtu protistrany:\s*([^\n]+)/u', $text, $p);
  preg_match('/Zpráva pro příjemce:\s*([^\n]+)/u', $text, $z);
  return [
    'vs' => ltrim($vs[1], '0'),
    'castka' => $castka,
    'datum' => trim($d[1] ?? ''),
    'protiucet' => trim($p[1] ?? ''),
    'zprava' => trim($z[1] ?? ''),
  ];
}

// ---------------------------------------------------------------------------
// Účtenky (doklady o prodeji)
// ---------------------------------------------------------------------------
function cil_platby(array $o): int { return (int)($o['castka'] ?: ($o['celkem'] ?? 0)); }
function je_zaplaceno(array $o): bool {
  return !empty($o['zaplaceno_hotove']) || (cil_platby($o) > 0 && (float)$o['zaplaceno'] + 0.001 >= cil_platby($o));
}

function odkaz_na_doklad(array $o): string {
  $k = substr(hash_hmac('sha256', 'doklad|' . $o['vs'], nastaveni()['klic'] ?? ''), 0, 24);
  return WEB . '/api/doklad.php?' . http_build_query(['vs' => $o['vs'], 'k' => $k]);
}

// Vystaví účtenku, když je objednávka doručená i zaplacená (a vyplněné IČO). Vrací upravenou objednávku.
function vystavit_doklad(array $o): array {
  if (!empty($o['doklad']) || PRODAVAJICI['ico'] === '' || empty($o['doruceno']) || !empty($o['zruseno']) || !je_zaplaceno($o)) return $o;
  $f = fopen(data_cesta('doklady.lock'), 'c');
  flock($f, LOCK_EX);
  $rada = nacist_json('doklady.json', []);
  $rok = date('Y');
  $rada[$rok] = ($rada[$rok] ?? 0) + 1;
  ulozit_json('doklady.json', $rada);
  flock($f, LOCK_UN);
  $o['doklad'] = [
    'cislo' => sprintf('%s%04d', $rok, $rada[$rok]),
    'vystaveno' => date('c'),
    'uhrada' => !empty($o['zaplaceno_hotove']) ? 'hotově / na místě' : 'bankovním převodem',
  ];
  return $o;
}
