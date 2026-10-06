<?php
// Ověření kódu zákaznické skupiny (kód zná jen skupina).
//   ?kod=…                              → jen zjistí, jestli kód existuje a skupina není plná (při registraci)
//   ?kod=… + Authorization: Bearer …    → zapíše přihlášený účet mezi členy skupiny (hlídá limit účtů)
//   ?kod=…&odebrat=1 + Authorization    → účet ze skupiny odebere (zákazník kód zrušil)
require __DIR__ . '/_spolecne.php';
require __DIR__ . '/_skupiny.php';
header('Content-Type: application/json; charset=utf-8');

function konec(array $d, int $kod = 200): void { http_response_code($kod); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }

$kod = mb_strtolower(trim(mb_substr(retezec($_GET['kod'] ?? ''), 0, 40)));
if ($kod === '') konec(['ok' => false]);
if (!limit('skupina', 30, 3600)) konec(['ok' => false, 'limit' => true], 429);

$s = skupiny()[hash('sha256', $kod)] ?? null;
if (!$s) konec(['ok' => false]);
$max = (int)($s['max'] ?? 0);
$verejne = array_diff_key($s, ['max' => 1]);

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? (function_exists('getallheaders') ? (array_change_key_case(getallheaders())['authorization'] ?? '') : '');
$token = preg_match('/^Bearer\s+(\S+)$/i', $auth, $m) ? $m[1] : '';

// Bez přihlášení: jen informace, jestli má smysl kód zadávat.
if ($token === '') {
  $plno = $max > 0 && count(clenove_vse()[$s['id']] ?? []) >= $max;
  konec($plno ? ['ok' => false, 'plno' => true] : ['ok' => true, 'skupina' => $verejne, 'neprihlasen' => true]);
}

$u = supabase_uzivatel($token);
if (!$u) konec(['ok' => false, 'prihlaseni' => true], 401);

if (isset($_GET['odebrat'])) {
  clenove_zmena(function (array &$vse) use ($s, $u) {
    $vse[$s['id']] = array_values(array_filter($vse[$s['id']] ?? [], fn($c) => $c['uid'] !== $u['uid']));
  });
  konec(['ok' => true]);
}

$prijat = clenove_zmena(function (array &$vse) use ($s, $u, $max) {
  $clenove = $vse[$s['id']] ?? [];
  foreach ($clenove as $c) if ($c['uid'] === $u['uid']) return true;
  if (in_array($u['uid'], $vse[$s['id'] . '#blok'] ?? [], true)) return false; // odebrán správcem
  if ($max > 0 && count($clenove) >= $max) return false;
  $clenove[] = ['uid' => $u['uid'], 'email' => $u['email'], 'cas' => date('c')];
  $vse[$s['id']] = $clenove;
  return true;
});
konec($prijat ? ['ok' => true, 'skupina' => $verejne] : ['ok' => false, 'plno' => true]);
