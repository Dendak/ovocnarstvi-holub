<?php
// Převodník údajů o uživateli z „Přihlášení přes Seznam“ do standardního tvaru (OIDC userinfo),
// který čte Supabase u vlastního poskytovatele (custom:seznam). Seznam posílá oauth_user_id místo sub.
// Supabase sem pošle přístupový token uživatele; ten se jen předá Seznamu, nikam se neukládá.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? (function_exists('getallheaders') ? (array_change_key_case(getallheaders())['authorization'] ?? '') : '');
if (!preg_match('/^Bearer\s+([A-Za-z0-9._~+\/=-]{10,4096})$/i', $auth, $m)) {
  http_response_code(401);
  exit('{"error":"missing_token"}');
}

$ctx = stream_context_create(['http' => [
  'timeout' => 10,
  'ignore_errors' => true,
  'header' => "Authorization: Bearer {$m[1]}\r\nAccept: application/json\r\nUser-Agent: ovoce-holub.cz\r\n",
]]);
$odpoved = @file_get_contents('https://login.seznam.cz/api/v1/user', false, $ctx);
$kod = (int)(preg_match('#^HTTP/\S+\s+(\d+)#', $http_response_header[0] ?? '', $k) ? $k[1] : 502);
$u = json_decode((string)$odpoved, true);
if ($kod !== 200 || empty($u['oauth_user_id'])) {
  http_response_code($kod >= 400 ? $kod : 502);
  exit('{"error":"seznam_userinfo_failed"}');
}

$jmeno = trim(($u['firstname'] ?? '') . ' ' . ($u['lastname'] ?? ''));
echo json_encode(array_filter([
  'sub' => (string)$u['oauth_user_id'],
  'email' => $u['email'] ?? null,
  // E-mail je adresa účtu na Seznamu (ověřená Seznamem).
  'email_verified' => !empty($u['email']),
  'name' => $jmeno !== '' ? $jmeno : ($u['account_name'] ?? null),
  'given_name' => $u['firstname'] ?? null,
  'family_name' => $u['lastname'] ?? null,
  'picture' => $u['avatar_url'] ?? null,
], fn($v) => $v !== null && $v !== ''), JSON_UNESCAPED_UNICODE);
