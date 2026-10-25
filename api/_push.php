<?php
// Upozornění na telefon (Web Push) pro farmu: nová objednávka, platby, večerní přehled na zítra.
// Bez knihoven: šifrování zprávy podle RFC 8291 (aes128gcm) a přihlášení serveru VAPID (RFC 8292, ES256) přes openssl.
// Odběry (telefony, které upozornění zapnuly v nastaveni.php) jsou v data/push.json. Klíče VAPID v nastavení.
// Do upozornění nepatří adresy ani telefony zákazníků – jen jméno, číslo objednávky a částka; podrobnosti po ťuknutí.
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) { http_response_code(404); exit; }

const PUSH_SOUBOR = 'push.json';
const PUSH_MAX_ODBERU = 20;
// Push služby prohlížečů – jiné adresy se jako odběr neuloží (server by jinak posílal požadavky kamkoli).
const PUSH_SLUZBY = '/^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com)\//';
// Začátek DER SubjectPublicKeyInfo pro nekomprimovaný bod P-256 (za ním 65 bajtů 0x04 || X || Y).
const PUSH_SPKI_P256 = '3059301306072a8648ce3d020106082a8648ce3d030107034200';

function b64url(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64url_dekodovat(string $s): string|false { return base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), true); }

// Veřejný klíč P-256 jako 65 bajtů (0x04 || X || Y).
function push_bod($klic): string {
  $d = openssl_pkey_get_details($klic)['ec'];
  return "\x04" . str_pad($d['x'], 32, "\0", STR_PAD_LEFT) . str_pad($d['y'], 32, "\0", STR_PAD_LEFT);
}
function push_verejny_z_bodu(string $bod) {
  $pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode(hex2bin(PUSH_SPKI_P256) . $bod), 64, "\n") . "-----END PUBLIC KEY-----\n";
  return openssl_pkey_get_public($pem);
}
function push_novy_klic() {
  $k = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
  if (!$k) throw new RuntimeException('klíč P-256 nejde vytvořit');
  return $k;
}

// Klíče VAPID serveru (vytvoří se při první potřebě a uloží do nastavení). Vrací [soukromý klíč, veřejný bod].
function push_vapid(): array {
  $n = nastaveni();
  if (empty($n['vapid_pem'])) {
    $n = zmenit_nastaveni(function (array &$n) {
      if (!empty($n['vapid_pem'])) return;
      openssl_pkey_export(push_novy_klic(), $pem);
      $n['vapid_pem'] = $pem;
    });
  }
  $klic = openssl_pkey_get_private($n['vapid_pem']);
  if (!$klic) throw new RuntimeException('klíč VAPID nejde načíst');
  return [$klic, push_bod($klic)];
}

// Zašifruje zprávu pro jeden odběr (RFC 8291, jeden záznam aes128gcm). $docasny a $sul jen pro test podle RFC.
function push_zasifrovat(string $zprava, string $uaBod, string $auth, $docasny = null, ?string $sul = null): string {
  $docasny ??= push_novy_klic();
  $sul ??= random_bytes(16);
  $asBod = push_bod($docasny);
  $sdileny = openssl_pkey_derive(push_verejny_z_bodu($uaBod), $docasny);
  if ($sdileny === false) throw new RuntimeException('ECDH selhal');
  $prkKlic = hash_hmac('sha256', $sdileny, $auth, true);
  $ikm = hash_hmac('sha256', "WebPush: info\0" . $uaBod . $asBod . "\x01", $prkKlic, true);
  $prk = hash_hmac('sha256', $ikm, $sul, true);
  $cek = substr(hash_hmac('sha256', "Content-Encoding: aes128gcm\0\x01", $prk, true), 0, 16);
  $nonce = substr(hash_hmac('sha256', "Content-Encoding: nonce\0\x01", $prk, true), 0, 12);
  $sifra = openssl_encrypt($zprava . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
  if ($sifra === false) throw new RuntimeException('šifrování selhalo');
  return $sul . pack('N', 4096) . chr(65) . $asBod . $sifra . $tag;
}

// Podpis ES256 z DER (openssl) na 64 bajtů r || s, jak ho chce JWT.
function push_der_na_rs(string $der): string {
  $i = 2;
  if (ord($der[1]) & 0x80) $i += ord($der[1]) & 0x7f;
  $cast = function () use ($der, &$i): string {
    $delka = ord($der[$i + 1]);
    $v = substr($der, $i + 2, $delka);
    $i += 2 + $delka;
    return str_pad(ltrim($v, "\0"), 32, "\0", STR_PAD_LEFT);
  };
  return $cast() . $cast();
}

function push_jwt(string $endpoint, $klic): string {
  $u = parse_url($endpoint);
  $hlava = b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
  $telo = b64url(json_encode(['aud' => $u['scheme'] . '://' . $u['host'], 'exp' => time() + 12 * 3600, 'sub' => 'mailto:' . ODESILATEL]));
  if (!openssl_sign("$hlava.$telo", $der, $klic, OPENSSL_ALGO_SHA256)) throw new RuntimeException('podpis VAPID selhal');
  return "$hlava.$telo." . b64url(push_der_na_rs($der));
}

// Jméno do upozornění na zamčené obrazovce: křestní jméno a iniciála příjmení („Jan N.“).
function push_jmeno(array $o): string {
  $c = preg_split('/\s+/u', trim((string)($o['jmeno'] ?? '')));
  return trim(($c[0] ?? '') . (count($c) > 1 ? ' ' . mb_substr(end($c), 0, 1) . '.' : '')) ?: 'Zákazník';
}

function push_odbery(): array { $o = nacist_json(PUSH_SOUBOR, []); return is_array($o) ? $o : []; }

// Uloží nebo odebere odběr (pod zámkem). $odber = ['endpoint', 'p256dh', 'auth', …] nebo null = odebrat endpoint.
function push_zmenit_odbery(callable $zmena): void {
  $zamek = fopen(data_cesta('push.lock'), 'c');
  flock($zamek, LOCK_EX);
  try {
    $o = push_odbery();
    $zmena($o);
    ulozit_json(PUSH_SOUBOR, array_values($o));
  } finally {
    flock($zamek, LOCK_UN);
    fclose($zamek);
  }
}

// Ověří odběr z prohlížeče; vrací normalizovaný záznam, nebo null.
function push_platny_odber($s): ?array {
  if (!is_array($s) || !is_string($s['endpoint'] ?? null) || strlen($s['endpoint']) > 1000 || !preg_match(PUSH_SLUZBY, $s['endpoint'])) return null;
  $p = b64url_dekodovat(retezec($s['keys']['p256dh'] ?? ''));
  $a = b64url_dekodovat(retezec($s['keys']['auth'] ?? ''));
  if ($p === false || strlen($p) !== 65 || $p[0] !== "\x04" || $a === false || strlen($a) !== 16 || !push_verejny_z_bodu($p)) return null;
  return ['endpoint' => $s['endpoint'], 'p256dh' => b64url($p), 'auth' => b64url($a)];
}

// Pošle upozornění všem odběrům. $url = kam ťuknutí vede (relativně k /api/). Neplatné odběry (404/410) smaže.
// Chyba nesmí zastavit volajícího (objednávku, párování plateb) – jen se zapíše do logu.
function poslat_push(string $nadpis, string $text, string $url = 'rozvoz.php', string $znacka = ''): int {
  try {
    $odbery = push_odbery();
    if (!$odbery) return 0;
    [$klic, $verejny] = push_vapid();
    $zprava = json_encode(['title' => $nadpis, 'body' => $text, 'url' => $url, 'tag' => $znacka], JSON_UNESCAPED_UNICODE);
    $odeslano = 0; $neplatne = [];
    foreach ($odbery as $s) {
      $telo = push_zasifrovat($zprava, b64url_dekodovat($s['p256dh']), b64url_dekodovat($s['auth']));
      $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'timeout' => 8, 'ignore_errors' => true,
        'header' => implode("\r\n", [
          'Authorization: vapid t=' . push_jwt($s['endpoint'], $klic) . ', k=' . b64url($verejny),
          'Content-Encoding: aes128gcm', 'Content-Type: application/octet-stream',
          'TTL: 86400', 'Urgency: high', 'Content-Length: ' . strlen($telo),
        ]),
        'content' => $telo,
      ]]);
      $http_response_header = [];
      @file_get_contents($s['endpoint'], false, $ctx);
      $kod = preg_match('#^HTTP/\S+\s+(\d{3})#', $http_response_header[0] ?? '', $m) ? (int)$m[1] : 0;
      if ($kod >= 200 && $kod < 300) $odeslano++;
      elseif ($kod === 404 || $kod === 410) $neplatne[] = $s['endpoint'];
      else zapsat_log("push: chyba $kod (" . parse_url($s['endpoint'], PHP_URL_HOST) . ')');
    }
    if ($neplatne) push_zmenit_odbery(function (array &$o) use ($neplatne) { $o = array_filter($o, fn($s) => !in_array($s['endpoint'], $neplatne, true)); });
    return $odeslano;
  } catch (Throwable $e) {
    zapsat_log('push: ' . $e->getMessage());
    return 0;
  }
}

// Večerní přehled na zítra (jednou denně po uzávěrce objednávek v 18:00). Volá upozorneni.php (GitHub Actions každých 10 min).
function push_vecerni_prehled(): string {
  $ted = time();
  if ((int)date('G', $ted) < 18 || (int)date('G', $ted) >= 22 || ((int)date('G', $ted) === 18 && (int)date('i', $ted) < 5)) return 'mimo čas';
  $dnes = date('Y-m-d', $ted);
  $stav = nacist_json('push-stav.json', []);
  if (($stav['prehled'] ?? '') === $dnes) return 'už odesláno';
  if (!push_odbery()) return 'žádné odběry';
  $stav['prehled'] = $dnes;
  ulozit_json('push-stav.json', $stav);

  $zitra = date('Y-m-d', strtotime('tomorrow', $ted));
  $zprava = push_text_prehledu($zitra);
  if (!$zprava) return 'zítra nic';
  $n = poslat_push($zprava[0], $zprava[1], 'rozvoz.php?den=' . $zitra, 'prehled-' . $zitra);
  return "odesláno $n";
}

// [nadpis, text] večerního přehledu pro den $den (Y-m-d), nebo null, když ten den nic není.
function push_text_prehledu(string $den): ?array {
  $zitra = $den;
  $obj = [];
  foreach (glob(DATA . '/objednavky/*.json') ?: [] as $f) {
    $o = json_decode((string)file_get_contents($f), true);
    if (is_array($o) && !empty($o['cislo']) && empty($o['zruseno']) && ($o['datum'] ?? '') === $zitra) $obj[] = $o;
  }
  if (!$obj) return null;
  $rozvoz = count(array_filter($obj, fn($o) => !empty($o['rozvoz'])));
  $odber = count($obj) - $rozvoz;
  $kg = 0; $mosty = 0;
  foreach (pripravit_polozky($obj) as $x) {
    if ($x['jed'] === 'kg') $kg += $x['mn'];
    $kg += $x['kg'];
    if (stripos($x['nazev'], 'mošt') !== false) $mosty += $x['mn'];
  }
  $casy = array_values(array_filter(array_map(fn($o) => empty($o['rozvoz']) ? ($o['cas'] ?? '') : '', $obj)));
  sort($casy);
  $pocet = fn(int $n, string $a, string $b, string $c) => $n . ' ' . ($n === 1 ? $a : ($n < 5 ? $b : $c));
  $text = $pocet(count($obj), 'objednávka', 'objednávky', 'objednávek') . ': '
    . implode(', ', array_filter([$rozvoz ? "rozvoz $rozvoz" : '', $odber ? "odběr $odber" . ($casy ? ' (' . implode(', ', $casy) . ')' : '') : '']))
    . ($kg ? ' · ovoce ' . rtrim(rtrim(number_format($kg, 1, ',', ' '), '0'), ',') . ' kg' : '')
    . ($mosty ? ' · mošty ' . rtrim(rtrim(number_format($mosty, 1, ',', ' '), '0'), ',') . '×' : '');
  $den = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'][(int)date('w', strtotime($zitra))] . ' ' . date('j. n.', strtotime($zitra));
  return ["Zítra ($den)", $text];
}
