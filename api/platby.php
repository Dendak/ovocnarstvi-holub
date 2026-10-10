<?php
// Párování plateb: přečte ve schránce SCHRANKA_PLATEB (pavel@) nová upozornění České spořitelny na příchozí platbu,
// podle variabilního symbolu je spáruje s objednávkami a pošle potvrzení zákazníkovi i farmě.
// Je to osobní schránka – stahují se z ní jen zprávy od banky (hledání podle odesílatele), ostatní pošta se nečte.
// Spouští se cronem na Wedos a při návštěvě e-shopu (nejvýš jednou za pár minut).
// Veřejně vrací jen {ok}; podrobnosti (a ?znovu=1 = projít znovu posledních 7 dní, ?ted=1 = zkontrolovat hned,
// tlačítko v rozvoz.php) jen přihlášené farmě.
require __DIR__ . '/_spolecne.php';

const INTERVAL = 180;

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
$farma = prihlasen();
function konec(array $d): void {
  global $farma;
  echo json_encode($farma ? $d : ['ok' => $d['ok'] ?? false], JSON_UNESCAPED_UNICODE);
  exit;
}

$n = nastaveni();
if (empty($n['heslo_platby'])) konec(['ok' => false, 'duvod' => 'nenastaveno']);

$zamek = fopen(data_cesta('platby.lock'), 'c');
if (!flock($zamek, LOCK_EX | LOCK_NB)) konec(['ok' => true, 'duvod' => 'bezi']);
$znovu = $farma && isset($_GET['znovu']);
$ted = $farma && isset($_GET['ted']);
$stav = nacist_json('stav.json', []);
if (!$znovu && !$ted && time() - ($stav['kontrola'] ?? 0) < INTERVAL) konec(['ok' => true, 'duvod' => 'nedavno']);
$stav['kontrola'] = time();
ulozit_json('stav.json', $stav);

try {
  $imap = new Imap(SCHRANKA_PLATEB, $n['heslo_platby']);
} catch (RuntimeException $e) {
  $stav['chyba'] = $e->getMessage();
  ulozit_json('stav.json', $stav);
  konec(['ok' => false, 'duvod' => 'prihlaseni']);
}

[$ok, $radky] = $imap->prikaz('SELECT INBOX');
$uidValidity = preg_match('/UIDVALIDITY (\d+)/', implode('', $radky), $m) ? $m[1] : '';
// Jiná schránka nebo nová UIDVALIDITY = čísla zpráv neplatí: projít znovu posledních 7 dní
// (už připsané platby se podle 'zpracovane' nepřipíšou podruhé).
if (($stav['schranka'] ?? '') !== SCHRANKA_PLATEB || ($stav['uidvalidity'] ?? '') !== $uidValidity || $znovu) {
  $stav = ['kontrola' => $stav['kontrola'], 'schranka' => SCHRANKA_PLATEB, 'uidvalidity' => $uidValidity, 'posledni' => 0, 'zpracovane' => $stav['zpracovane'] ?? [], 'odmitnuto' => $stav['odmitnuto'] ?? null];
  $hledat = 'UID SEARCH SINCE ' . date('j-M-Y', strtotime('-7 days'));
} else {
  $hledat = 'UID SEARCH UID ' . (($stav['posledni'] ?? 0) + 1) . ':*';
}
$hledat .= ' FROM "' . DOMENA_BANKY . '"';
[, $radky] = $imap->prikaz($hledat);
$uids = [];
foreach ($radky as $r) if (preg_match('/^\* SEARCH ([\d ]+)/', $r, $m)) $uids = array_map('intval', preg_split('/\s+/', trim($m[1])));
$uids = array_values(array_filter($uids, fn($u) => $u > ($stav['posledni'] ?? 0)));
sort($uids);

$vysledek = ['ok' => true, 'zprav' => count($uids), 'z_banky' => 0, 'sparovano' => 0];
register_shutdown_function(function () use (&$stav) { ulozit_json('stav.json', $stav); });
foreach ($uids as $uid) {
  [, , $literaly] = $imap->prikaz("UID FETCH $uid BODY.PEEK[]");
  $stav['posledni'] = $uid;
  if (!$literaly) continue;
  // Připíše se jen ověřené upozornění přímo od banky (odesílatel + podpis), viz zpracovat_zpravu_banky().
  zpracovat_zpravu_banky($literaly[0], $stav, $vysledek);
}
$imap->konec();
unset($stav['chyba']);
$stav['vysledek'] = $vysledek + ['cas' => date('c')];
ulozit_json('stav.json', $stav);
konec($vysledek);
