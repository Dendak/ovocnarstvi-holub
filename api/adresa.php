<?php
// Ověření adresy pro rozvoz v oficiálním registru adres ČR (RÚIAN, ČÚZK).
// Adresy psané bez diakritiky se nejdřív dohledají přes OpenStreetMap a pak znovu ověří v RÚIAN.
require __DIR__ . '/_spolecne.php';
header('Content-Type: application/json; charset=utf-8');

const MESTO = 'České Budějovice';

function konec(array $d): void { echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }

function http_json(string $url): ?array {
  $ctx = stream_context_create(['http' => ['timeout' => 8, 'header' => "User-Agent: ovoce-holub.cz (objednavky@ovoce-holub.cz)\r\n"]]);
  $r = @file_get_contents($url, false, $ctx);
  return $r === false ? null : json_decode($r, true);
}

function ruian(string $dotaz): array {
  $r = http_json('https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/exts/GeocodeSOE/findAddressCandidates?'
    . http_build_query(['SingleLine' => $dotaz, 'maxLocations' => 6, 'outSR' => 4326, 'f' => 'json']));
  $out = [];
  foreach ($r['candidates'] ?? [] as $c) {
    if (($c['attributes']['Type'] ?? '') !== 'AdresniMisto' || ($c['score'] ?? 0) < 90) continue;
    $out[] = [
      'adresa' => $c['address'],
      'gps' => [round($c['location']['y'], 6), round($c['location']['x'], 6)],
      'vMeste' => str_contains($c['address'], MESTO),
    ];
  }
  return $out;
}

$q = trim(mb_substr((string)($_GET['q'] ?? ''), 0, 120));
if (mb_strlen($q) < 3) konec(['kandidati' => []]);
if (!preg_match('/\d/', $q)) konec(['kandidati' => [], 'chybiCislo' => true]);

$klic = mb_strtolower($q);
$cache = nacist_json('adresy.json', []);
if (isset($cache[$klic])) konec($cache[$klic]);
if (!limit('adresa', 40, 3600)) konec(['kandidati' => [], 'limit' => true]);

$dotaz = preg_match('/budějovic|budejovic/iu', $q) ? $q : "$q, " . MESTO;
$kandidati = ruian($dotaz);

if (!$kandidati) {
  // Bez diakritiky / překlep: OpenStreetMap vrátí správný název ulice.
  $osm = http_json('https://nominatim.openstreetmap.org/search?' . http_build_query(['q' => $dotaz, 'format' => 'json', 'addressdetails' => 1, 'limit' => 1, 'countrycodes' => 'cz']));
  $a = $osm[0]['address'] ?? [];
  if (!empty($a['road']) && !empty($a['house_number'])) $kandidati = ruian("{$a['road']} {$a['house_number']}, " . MESTO);
}

// Víc stejných adres (číslo popisné vs. orientační) necháme zákazníka vybrat; v Budějovicích první.
usort($kandidati, fn($x, $y) => $y['vMeste'] <=> $x['vMeste']);
$vysledek = ['kandidati' => array_slice($kandidati, 0, 5)];

$cache = array_slice($cache, -500, null, true);
$cache[$klic] = $vysledek;
ulozit_json('adresy.json', $cache);
konec($vysledek);
