<?php
// Stav objednávek přihlášeného zákazníka pro „Moje objednávky“ v e-shopu.
//   GET + hlavička Authorization: Bearer <přístupový token Supabase>
//   → {ok: true, objednavky: [{cislo, vytvoreno, den, datum, rozvoz, stav, platba, celkem, zaplaceno, zbyva,
//       polozky, kosik, doklad}]}  nebo 401 {chyba: 'prihlaseni'} · 429 {chyba: 'limit'}
// stav: 'prijato' | 'zaplaceno' | 'doruceno' (dovoz) | 'predano' (osobní odběr) | 'zruseno'
// Jen objednávky s potvrzeným e-mailem přihlášeného účtu a jen údaje o objednávce – bez adresy, telefonu a poznámky.
require __DIR__ . '/_spolecne.php';
require __DIR__ . '/_skupiny.php';
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

const MAX_OBJEDNAVEK = 50;

function konec(int $kod, array $d): void { http_response_code($kod); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'GET') konec(405, ['ok' => false]);
if (!limit('stav', 60, 3600)) konec(429, ['ok' => false, 'chyba' => 'limit']);

// E-mail přihlášeného zákazníka – jen když ho Supabase má za potvrzený (registrace přes odkaz v e-mailu,
// Google, Seznam…). Jinak by si kdokoli mohl založit účet s cizí adresou a dívat se na cizí objednávky.
// null = token neplatí nebo e-mail účtu není potvrzený.
function potvrzeny_email(string $token): ?string {
  if (!preg_match('/^[A-Za-z0-9._~+\/=-]{20,4096}$/', $token)) return null;
  $ctx = stream_context_create(['http' => [
    'timeout' => 8, 'ignore_errors' => true,
    'header' => "apikey: " . SUPABASE_KLIC . "\r\nAuthorization: Bearer $token\r\n",
  ]]);
  $u = json_decode((string)@file_get_contents(SUPABASE_URL . '/auth/v1/user', false, $ctx), true);
  return is_array($u) ? email_uctu($u) : null;
}

// Domény, jejichž adresy Seznam opravdu vlastní (u přihlášení přes Seznam s cizí adresou ověření nezaručuje).
const DOMENY_SEZNAMU = ['seznam.cz', 'email.cz', 'post.cz', 'spoluzaci.cz', 'stream.cz', 'firmy.cz'];

// Potvrzený e-mail z údajů o uživateli Supabase (/auth/v1/user), nebo null. Potvrzení e-mailu se nevěří, když
// ho mohl dát jen poskytovatel, který adresu sám neověřuje: přihlášení přes Seznam (jen adresy na doménách
// Seznamu) a Microsoft (azure – jen když poskytovatel adresu označil jako ověřenou).
function email_uctu(array $u): ?string {
  $email = !empty($u['id']) && !empty($u['email_confirmed_at']) ? mb_strtolower(trim((string)($u['email'] ?? ''))) : '';
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return null;
  $identity = array_values(array_filter(is_array($u['identities'] ?? null) ? $u['identities'] : [], 'is_array'));
  if (!$identity) return $email; // odpověď bez seznamu identit – rozhoduje potvrzení e-mailu jako dřív
  $domena = substr(strrchr($email, '@') ?: '', 1);
  foreach ($identity as $i) {
    $poskytovatel = strtolower((string)($i['provider'] ?? ''));
    if (str_contains($poskytovatel, 'seznam')) $ok = in_array($domena, DOMENY_SEZNAMU, true);
    elseif ($poskytovatel === 'azure') $ok = ($i['identity_data']['email_verified'] ?? null) === true;
    else $ok = true; // e-mail s heslem (potvrzený odkazem z e-mailu), Google…
    if ($ok) return $email;
  }
  return null;
}

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
  ?? (function_exists('getallheaders') ? (array_change_key_case(getallheaders())['authorization'] ?? '') : '');
$token = is_string($auth) && preg_match('/^Bearer\s+(\S+)$/i', $auth, $m) ? $m[1] : '';
$email = $token !== '' ? potvrzeny_email($token) : null;
if ($email === null) konec(401, ['ok' => false, 'chyba' => 'prihlaseni']);

// Co z objednávky zákazník uvidí.
function stav_objednavky(array $o): array {
  $cil = cil_platby($o);
  $prevod = ($o['platba'] ?? '') === 'prevod' || !empty($o['castka']);
  $zaplaceno = !empty($o['zaplaceno_hotove']) ? $cil : (int)round((float)($o['zaplaceno'] ?? 0));
  $stav = !empty($o['zruseno']) ? 'zruseno'
    : (!empty($o['doruceno']) ? (!empty($o['rozvoz']) ? 'doruceno' : 'predano')
      : (je_zaplaceno($o) ? 'zaplaceno' : 'prijato'));
  return [
    'cislo' => (string)$o['cislo'],
    'vytvoreno' => (string)($o['vytvoreno'] ?? ''),
    'den' => (string)($o['den'] ?? ''),
    'datum' => (string)($o['datum'] ?? ''),
    'rozvoz' => !empty($o['rozvoz']),
    'stav' => $stav,
    'platba' => $prevod ? 'prevod' : 'prevzeti',
    'celkem' => (int)($o['celkem'] ?? 0) ?: $cil,
    'zaplaceno' => $zaplaceno,
    // Kolik zbývá zaplatit převodem (u zrušené objednávky nic).
    'zbyva' => $prevod && $stav !== 'zruseno' ? max(0, $cil - $zaplaceno) : 0,
    'polozky' => array_values(array_filter((array)($o['polozky'] ?? []), 'is_string')),
    'kosik' => array_values(array_filter((array)($o['kosik'] ?? []), 'is_array')),
    'doklad' => platny_doklad($o) ? odkaz_na_doklad($o) : null,
  ];
}

// E-mail v uloženém JSON (jen rychlé předběžné hledání – porovná se pak přesně).
$hledat = substr((string)json_encode($email, JSON_UNESCAPED_UNICODE), 1, -1);
$out = [];
foreach (glob(DATA . '/objednavky/*.json') ?: [] as $f) {
  $s = @file_get_contents($f);
  if ($s === false || stripos($s, $hledat) === false) continue;
  $o = json_decode($s, true);
  if (!is_array($o) || empty($o['cislo']) || mb_strtolower(trim((string)($o['email'] ?? ''))) !== $email) continue;
  $out[] = stav_objednavky($o);
}
usort($out, fn($a, $b) => strcmp($b['vytvoreno'], $a['vytvoreno']) ?: strcmp($b['cislo'], $a['cislo']));
konec(200, ['ok' => true, 'objednavky' => array_slice($out, 0, MAX_OBJEDNAVEK)]);
