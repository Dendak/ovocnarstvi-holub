<?php
// Ověření a našeptávání adres v oficiálním registru adres ČR (RÚIAN, ČÚZK).
//   ?q=Lannova 12&mesto=České Budějovice            → ověření (přesné adresy se souřadnicemi)
//   ?q=Lann&mesto=České Budějovice&naseptat=1       → našeptávač při psaní
// Adresy psané bez diakritiky se při ověření dohledají přes OpenStreetMap.
require __DIR__ . '/_spolecne.php';
header('Content-Type: application/json; charset=utf-8');

const RUIAN = 'https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/exts/GeocodeSOE/';

function konec(array $d): void { echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }

function http_json(string $url): ?array {
  $ctx = stream_context_create(['http' => ['timeout' => 8, 'header' => "User-Agent: ovoce-holub.cz (objednavky@ovoce-holub.cz)\r\n"]]);
  $r = @file_get_contents($url, false, $ctx);
  return $r === false ? null : json_decode($r, true);
}

// „Lannova tř. 12/5, České Budějovice 6, 37001 České Budějovice“ → ulice, PSČ, obec
function rozlozit(string $adresa, ?array $gps): array {
  $casti = array_map('trim', explode(',', $adresa));
  $posledni = end($casti);
  preg_match('/^(\d{3})\s?(\d{2})\s+(.+)$/u', $posledni, $m);
  return [
    'adresa' => $adresa,
    'ulice' => $casti[0],
    'psc' => $m ? "$m[1] $m[2]" : '',
    'mesto' => $m ? $m[3] : $posledni,
    'gps' => $gps,
  ];
}

function ruian(string $dotaz): array {
  $r = http_json(RUIAN . 'findAddressCandidates?' . http_build_query(['SingleLine' => $dotaz, 'maxLocations' => 8, 'outSR' => 4326, 'f' => 'json']));
  $out = [];
  foreach ($r['candidates'] ?? [] as $c) {
    if (($c['attributes']['Type'] ?? '') !== 'AdresniMisto' || ($c['score'] ?? 0) < 90) continue;
    $out[] = rozlozit($c['address'], [round($c['location']['y'], 6), round($c['location']['x'], 6)]);
  }
  return $out;
}

// Patří adresa do zadané obce? (bez ohledu na velikost písmen a diakritiku)
function bez_diakritiky(string $s): string {
  return mb_strtolower(strtr($s, [
    'á' => 'a', 'č' => 'c', 'ď' => 'd', 'é' => 'e', 'ě' => 'e', 'í' => 'i', 'ň' => 'n', 'ó' => 'o', 'ř' => 'r', 'š' => 's', 'ť' => 't', 'ú' => 'u', 'ů' => 'u', 'ý' => 'y', 'ž' => 'z',
    'Á' => 'a', 'Č' => 'c', 'Ď' => 'd', 'É' => 'e', 'Ě' => 'e', 'Í' => 'i', 'Ň' => 'n', 'Ó' => 'o', 'Ř' => 'r', 'Š' => 's', 'Ť' => 't', 'Ú' => 'u', 'Ů' => 'u', 'Ý' => 'y', 'Ž' => 'z',
  ]));
}
function v_obci(array $k, string $mesto): bool {
  return $mesto === '' || str_contains(bez_diakritiky($k['adresa']), bez_diakritiky($mesto));
}

$q = trim(mb_substr((string)($_GET['q'] ?? ''), 0, 120));
$mesto = trim(mb_substr((string)($_GET['mesto'] ?? ''), 0, 60));
if (mb_strlen($q) < 3) konec(['kandidati' => []]);

// ---------- našeptávač ----------
if (isset($_GET['naseptat'])) {
  $klic = 'n:' . mb_strtolower("$q|$mesto");
  $cache = nacist_json('adresy-naseptavac.json', []);
  if (isset($cache[$klic])) konec($cache[$klic]);
  if (!limit('naseptavac', 400, 3600)) konec(['kandidati' => [], 'limit' => true]);

  $out = [];
  // 1) suggest zvládá i psaní bez diakritiky, ale potřebuje přesné číslo domu
  $s = http_json(RUIAN . 'suggest?' . http_build_query(['text' => trim("$q $mesto"), 'maxSuggestions' => 12, 'f' => 'json']));
  foreach ($s['suggestions'] ?? [] as $x) {
    if (($x['type'] ?? '') !== 'AdresniMisto') continue;
    $k = rozlozit($x['text'], null);
    if (v_obci($k, $mesto)) $out[$k['adresa']] = $k;
  }
  // 2) hledání podle názvu ulice vrátí první adresy v ulici (i se souřadnicemi)
  if (count($out) < 5) {
    foreach (ruian($mesto !== '' ? "$q, $mesto" : $q) as $k) {
      if (v_obci($k, $mesto)) $out[$k['adresa']] = $k;
    }
  }
  $vysledek = ['kandidati' => array_slice(array_values($out), 0, 7)];
  $cache = array_slice($cache, -1500, null, true);
  $cache[$klic] = $vysledek;
  ulozit_json('adresy-naseptavac.json', $cache);
  konec($vysledek);
}

// ---------- ověření ----------
if (!preg_match('/\d/', $q)) konec(['kandidati' => [], 'chybiCislo' => true]);

$klic = mb_strtolower("$q|$mesto");
$cache = nacist_json('adresy.json', []);
if (isset($cache[$klic])) konec($cache[$klic]);
if (!limit('adresa', 60, 3600)) konec(['kandidati' => [], 'limit' => true]);

// Celá adresa z našeptávače už obec obsahuje; jinak se doplní z pole Město.
$dotaz = ($mesto === '' || str_contains(bez_diakritiky($q), bez_diakritiky($mesto))) ? $q : "$q, $mesto";
$kandidati = ruian($dotaz);

if (!$kandidati) {
  // Bez diakritiky / překlep: OpenStreetMap vrátí správný název ulice.
  $osm = http_json('https://nominatim.openstreetmap.org/search?' . http_build_query(['q' => $dotaz, 'format' => 'json', 'addressdetails' => 1, 'limit' => 1, 'countrycodes' => 'cz']));
  $a = $osm[0]['address'] ?? [];
  $obec = $a['city'] ?? $a['town'] ?? $a['village'] ?? $mesto;
  if (!empty($a['house_number'])) $kandidati = ruian(trim(($a['road'] ?? $obec) . " {$a['house_number']}, $obec"));
}

$kandidati = array_values(array_filter($kandidati, fn($k) => v_obci($k, $mesto)));
$vysledek = ['kandidati' => array_slice($kandidati, 0, 5)];

$cache = array_slice($cache, -500, null, true);
$cache[$klic] = $vysledek;
ulozit_json('adresy.json', $cache);
konec($vysledek);
