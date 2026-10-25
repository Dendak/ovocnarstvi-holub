<?php
// Přihlášení farmy k přehledu objednávek přes Microsoft (OpenID Connect, authorization code + PKCE).
// Bez parametrů přesměruje na Microsoft; Microsoft se vrátí sem s ?code=… a po ověření se zařízení přihlásí
// stejně jako heslem (cookie na rok). Pustí jen účty z MICROSOFT_UCTY v adresáři MICROSOFT_TENANT.
require __DIR__ . '/_spolecne.php';
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Referrer-Policy: no-referrer');

const MS_COOKIE = 'oh_ms';
const MS_NAVRAT = WEB . '/api/microsoft.php';
const MS_ADRESA = 'https://login.microsoftonline.com/' . MICROSOFT_TENANT . '/oauth2/v2.0/';

function chyba(string $text): void {
  http_response_code(400);
  exit('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Přihlášení</title>'
    . '<p style="font:16px/1.5 Arial,sans-serif;padding:40px 16px;max-width:480px;margin:0 auto">' . h($text)
    . '<br><br><a href="rozvoz.php" style="color:#2f5a33">← Zpět na přihlášení</a></p>');
}

$tajny = (string)(nastaveni()['microsoft_tajny'] ?? '');
if ($tajny === '') chyba('Přihlášení přes Microsoft ještě není nastavené (chybí tajný klíč na stránce Nastavení).');

// 1) Začátek: náhodný state, nonce a PKCE ověřovač do krátké cookie, pak na Microsoft.
if (!isset($_GET['code']) && !isset($_GET['error'])) {
  if (!limit('microsoft', 20, 3600)) chyba('Příliš mnoho pokusů, zkuste to za hodinu.');
  $state = bin2hex(random_bytes(16)); $nonce = bin2hex(random_bytes(16)); $overovac = b64url(random_bytes(32));
  setcookie(MS_COOKIE, "$state.$nonce.$overovac", ['expires' => time() + 600, 'path' => '/api/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
  header('Location: ' . MS_ADRESA . 'authorize?' . http_build_query([
    'client_id' => MICROSOFT_CLIENT_ID, 'response_type' => 'code', 'redirect_uri' => MS_NAVRAT, 'response_mode' => 'query',
    'scope' => 'openid profile email', 'state' => $state, 'nonce' => $nonce,
    'code_challenge' => b64url(hash('sha256', $overovac, true)), 'code_challenge_method' => 'S256', 'prompt' => 'select_account',
  ]));
  exit;
}

// 2) Návrat z Microsoftu.
[$state, $nonce, $overovac] = array_pad(explode('.', retezec($_COOKIE[MS_COOKIE] ?? ''), 3), 3, '');
setcookie(MS_COOKIE, '', ['expires' => 1, 'path' => '/api/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
if (isset($_GET['error'])) chyba('Přihlášení přes Microsoft se nedokončilo: ' . retezec($_GET['error_description'] ?? $_GET['error']));
if ($state === '' || !hash_equals($state, retezec($_GET['state'] ?? ''))) chyba('Přihlášení vypršelo nebo bylo zahájeno v jiném prohlížeči. Zkuste to znovu.');

$ctx = stream_context_create(['http' => [
  'method' => 'POST', 'timeout' => 15, 'ignore_errors' => true,
  'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
  'content' => http_build_query([
    'client_id' => MICROSOFT_CLIENT_ID, 'client_secret' => $tajny, 'grant_type' => 'authorization_code',
    'code' => retezec($_GET['code'] ?? ''), 'redirect_uri' => MS_NAVRAT, 'code_verifier' => $overovac, 'scope' => 'openid profile email',
  ]),
]]);
$r = json_decode((string)@file_get_contents(MS_ADRESA . 'token', false, $ctx), true);
if (empty($r['id_token'])) {
  error_log('ovoce-holub: microsoft token – ' . ($r['error'] ?? 'bez odpovědi') . ' ' . mb_substr((string)($r['error_description'] ?? ''), 0, 200));
  chyba('Microsoft přihlášení odmítl (' . ($r['error'] ?? 'bez odpovědi') . '). Zkontrolujte tajný klíč na stránce Nastavení.');
}
// id_token přišel přímo z tokenového endpointu přes TLS (OIDC Core 3.1.3.7) – kontroluje se obsah, ne podpis.
$c = json_decode((string)base64_decode(strtr(explode('.', $r['id_token'])[1] ?? '', '-_', '+/')), true);
if (!is_array($c) || ($c['aud'] ?? '') !== MICROSOFT_CLIENT_ID || ($c['tid'] ?? '') !== MICROSOFT_TENANT
  || !hash_equals($nonce, (string)($c['nonce'] ?? '')) || (int)($c['exp'] ?? 0) < time()) chyba('Neplatná odpověď od Microsoftu. Zkuste to znovu.');

$adresy = array_values(array_unique(array_filter(array_map(fn($k) => mb_strtolower(trim((string)($c[$k] ?? ''))), ['email', 'preferred_username', 'upn']))));
foreach ($adresy as $a) {
  if (in_array(hash('sha256', $a), MICROSOFT_UCTY, true)) {
    prihlasit_zarizeni();
    header('Location: rozvoz.php');
    exit;
  }
}
chyba('Účet ' . ($adresy ? implode(' / ', $adresy) : '(bez e-mailu)') . ' nemá přístup k přehledu objednávek.');
