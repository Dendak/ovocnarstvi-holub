<?php
// Upozornění na telefon – zapnutí / vypnutí / zkouška pro přihlášenou farmu (volá nastaveni.php z prohlížeče).
//   GET                              → {ok, klic}  veřejný klíč VAPID serveru (pro pushManager.subscribe)
//   POST {akce:'zapnout', odber}     → uloží odběr tohoto telefonu
//   POST {akce:'vypnout', endpoint}  → smaže ho
//   POST {akce:'zkouska'}            → pošle zkušební upozornění na všechny telefony
require __DIR__ . '/_spolecne.php';
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

function konec(int $kod, array $d): void { http_response_code($kod); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }

if (!prihlasen()) konec(401, ['ok' => false, 'chyba' => 'prihlaseni']);
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  try { [, $verejny] = push_vapid(); } catch (RuntimeException $e) { konec(500, ['ok' => false, 'chyba' => 'klic']); }
  konec(200, ['ok' => true, 'klic' => b64url($verejny), 'odberu' => count(push_odbery())]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || cizi_puvod()) konec(403, ['ok' => false]);
if (!limit('push', 30, 3600)) konec(429, ['ok' => false, 'chyba' => 'limit']);
$v = json_decode((string)file_get_contents('php://input', false, null, 0, 8192), true);
$akce = is_array($v) ? retezec($v['akce'] ?? '') : '';

if ($akce === 'zapnout') {
  $s = push_platny_odber($v['odber'] ?? null);
  if (!$s) konec(400, ['ok' => false, 'chyba' => 'odber']);
  $s['popis'] = mb_substr(preg_replace('/[^\w .,;:()\/-]/u', '', retezec($_SERVER['HTTP_USER_AGENT'] ?? '')), 0, 120);
  $s['pridano'] = date('c');
  push_zmenit_odbery(function (array &$o) use ($s) {
    $o = array_values(array_filter($o, fn($x) => $x['endpoint'] !== $s['endpoint']));
    $o[] = $s;
    $o = array_slice($o, -PUSH_MAX_ODBERU);
  });
  konec(200, ['ok' => true]);
}
if ($akce === 'vypnout') {
  $e = retezec($v['endpoint'] ?? '');
  push_zmenit_odbery(function (array &$o) use ($e) { $o = array_values(array_filter($o, fn($x) => $x['endpoint'] !== $e)); });
  konec(200, ['ok' => true]);
}
if ($akce === 'zkouska') {
  $n = poslat_push('Ovocnářství Holub', 'Zkušební upozornění – funguje to.', 'nastaveni.php', 'zkouska');
  konec(200, ['ok' => $n > 0, 'odeslano' => $n]);
}
konec(400, ['ok' => false]);
