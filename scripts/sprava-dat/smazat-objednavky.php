<?php
// Jednorázové smazání objednávek jednoho zákazníka (testovací objednávky) i s účtenkou – jen přes workflow
// smazat-objednavky.yml: nahraje se do /api/ pod náhodným jménem, zavolá se a hned se smaže.
//   ?h=<sha256 e-mailu malými písmeny>            → jen výpis nalezených objednávek
//   ?h=<…>&smazat=1                                → smaže je a přepočítá číselnou řadu účtenek
// Vypisuje jen číslo objednávky, datum, částku a číslo účtenky – žádné osobní údaje (logy jsou veřejné).
require __DIR__ . '/_spolecne.php';
header('Content-Type: text/plain; charset=utf-8');

$h = retezec($_GET['h'] ?? '');
if (!preg_match('/^[0-9a-f]{64}$/', $h)) { http_response_code(400); exit("CHYBA: neplatný otisk e-mailu\n"); }
$smazat = isset($_GET['smazat']);

$zamek = fopen(data_cesta('objednavky.lock'), 'c');
flock($zamek, LOCK_EX);
$nalezeno = [];
foreach (glob(DATA . '/objednavky/*.json') ?: [] as $f) {
  $o = json_decode((string)file_get_contents($f), true);
  if (!is_array($o) || hash('sha256', mb_strtolower(trim((string)($o['email'] ?? '')))) !== $h) continue;
  $nalezeno[$f] = $o;
}
if (!$nalezeno) { echo "Nenalezena žádná objednávka.\n"; exit; }
foreach ($nalezeno as $o) {
  printf("%s | termín %s | %s Kč | účtenka %s%s\n", $o['cislo'] ?? '?', ($o['datum'] ?? '') ?: '-', $o['celkem'] ?? '?',
    $o['doklad']['cislo'] ?? '-', !empty($o['zruseno']) ? ' | stornováno' : '');
}
if (!$smazat) { echo "Jen výpis – nic nesmazáno.\n"; exit; }
if (!ZKUSEBNI_PROVOZ && array_filter($nalezeno, fn($o) => !empty($o['doklad']))) {
  exit("CHYBA: mimo zkušební provoz účtenky mazat nejde – nic nesmazáno.\n");
}

foreach (array_keys($nalezeno) as $f) {
  if (!@unlink($f)) exit('CHYBA: nepodařilo se smazat ' . basename($f) . "\n");
}
// Číselná řada účtenek podle zbývajících objednávek (jako smazat_doklad v rozvoz.php).
$z = fopen(data_cesta('doklady.lock'), 'c');
flock($z, LOCK_EX);
$rada = [];
foreach (glob(DATA . '/objednavky/*.json') ?: [] as $f) {
  $x = json_decode((string)file_get_contents($f), true);
  $rp = rok_a_poradi_dokladu((string)($x['doklad']['cislo'] ?? ''));
  if ($rp) $rada[$rp[0]] = max($rada[$rp[0]] ?? 0, $rp[1]);
}
ulozit_json('doklady.json', $rada);
flock($z, LOCK_UN);
zapsat_log('správa: smazáno ' . count($nalezeno) . ' testovacích objednávek');
echo 'Smazáno: ' . count($nalezeno) . ". Řada účtenek přepočítána.\n";
