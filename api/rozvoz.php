<?php
// Přehled objednávek pro farmu: po dnech, co naložit, mapa s trasou rozvozu, stav plateb.
// Přihlášení odkazem poslaným e-mailem na adresu @ovoce-holub.cz; telefon si ho pamatuje (rok, obnovuje se).
require __DIR__ . '/_spolecne.php';
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Referrer-Policy: strict-origin-when-cross-origin');

const FARMA = 'Krtely 70, Netolice';
const COOKIE = 'oh_rozvoz';

$n = nastaveni();
if (empty($n['klic'])) { $n['klic'] = bin2hex(random_bytes(32)); if (!empty($n['heslo'])) ulozit_nastaveni($n); }

function podpis(int $exp, string $klic): string { return hash_hmac('sha256', "rozvoz|$exp", $klic); }
function nastavit_cookie(string $klic): void {
  $exp = time() + 365 * 86400;
  setcookie(COOKIE, $exp . '.' . podpis($exp, $klic), ['expires' => $exp, 'path' => '/api/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
}
function prihlasen(array $n): bool {
  [$exp, $sig] = array_pad(explode('.', $_COOKIE[COOKIE] ?? '', 2), 2, '');
  return (int)$exp > time() && hash_equals(podpis((int)$exp, $n['klic']), $sig);
}
function povoleny_email(string $e): bool { return (bool)preg_match('/^[a-z0-9._%+-]+@ovoce-holub\.cz$/i', $e); }

$chyba = ''; $info = '';
$akce = $_POST['akce'] ?? '';
if ($akce === 'poslat-odkaz') {
  $email = strtolower(trim((string)($_POST['email'] ?? '')));
  if (!limit('rozvoz', 6, 3600)) $chyba = 'Příliš mnoho pokusů, zkuste to za hodinu.';
  elseif (empty($n['heslo'])) $chyba = 'Přihlašování ještě není nastavené (chybí heslo na stránce nastaveni.php).';
  else {
    if (povoleny_email($email)) {
      $token = bin2hex(random_bytes(24));
      $tokeny = array_filter(nacist_json('prihlaseni.json', []), fn($exp) => $exp > time());
      $tokeny[hash('sha256', $token)] = time() + 3600;
      ulozit_json('prihlaseni.json', $tokeny);
      $odkaz = WEB . '/api/rozvoz.php?t=' . $token;
      poslat_email($email, 'Přihlášení k objednávkám – Ovocnářství Holub',
        "Pro přihlášení k přehledu objednávek otevřete tento odkaz (platí 1 hodinu):
$odkaz

Pokud jste o přihlášení nežádali, e-mail ignorujte.
",
        email_html('Přihlášení k objednávkám', '<p style="line-height:1.5">Pro přihlášení k přehledu objednávek klikněte na tlačítko. Odkaz platí 1 hodinu.</p>'
          . '<p><a href="' . h($odkaz) . '" style="display:inline-block;background:#2f5a33;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Přihlásit se</a></p>'
          . '<p style="font-size:13px;color:#6b6f66">Pokud jste o přihlášení nežádali, e-mail ignorujte.</p>'), null, false);
    }
    $info = 'Pokud je adresa oprávněná, přišel na ni e-mail s odkazem pro přihlášení. Otevřete ho v telefonu, ve kterém chcete zůstat přihlášený.';
  }
}
if ($akce === 'potvrdit' || isset($_GET['t'])) {
  $token = (string)($_POST['t'] ?? $_GET['t'] ?? '');
  $tokeny = nacist_json('prihlaseni.json', []);
  $h = hash('sha256', $token);
  if (($tokeny[$h] ?? 0) <= time()) $chyba = 'Odkaz pro přihlášení už neplatí. Nechte si poslat nový.';
  elseif ($akce === 'potvrdit') {
    // Potvrzení tlačítkem: e-mailové filtry odkazy předem otevírají a jinak by je „spotřebovaly“.
    unset($tokeny[$h]);
    ulozit_json('prihlaseni.json', $tokeny);
    nastavit_cookie($n['klic']);
    header('Location: rozvoz.php'); exit;
  } else {
    $potvrdit = $token;
  }
}
if (($_GET['odhlasit'] ?? '') === '1') {
  setcookie(COOKIE, '', ['expires' => 1, 'path' => '/api/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
  header('Location: rozvoz.php'); exit;
}

function stranka(string $titulek, string $obsah, string $hlava = ''): void {
  echo '<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    . '<meta name="robots" content="noindex"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="theme-color" content="#17241a">'
    . '<title>' . h($titulek) . '</title>' . $hlava . '<style>
:root{--paper:#f8f5ef;--line:#dfd7c9;--ink:#1d231c;--muted:#6b6f66;--leaf:#2f5a33;--berry:#8c2f2b;--amber:#8a5a00}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.45 Arial,Helvetica,sans-serif}
header{background:#17241a;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:1000}
header a{color:#cfe0c9;font-size:14px}main{max-width:760px;margin:0 auto;padding:16px}
h1{font:normal 24px Georgia,serif;margin:0}h2{font:normal 21px Georgia,serif;margin:24px 0 10px}
.dny{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px}.dny a{flex:none;padding:8px 12px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);text-decoration:none;font-size:14px}
.dny a.akt{background:var(--leaf);border-color:var(--leaf);color:#fff}.dny small{opacity:.7}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:10px 0}
.obj{position:relative}.obj.hotovo{opacity:.55}.cislo{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--leaf);color:#fff;font-weight:bold;font-size:14px;margin-right:8px}
.jm{font-weight:bold;font-size:17px}.muted{color:var(--muted);font-size:14px}ul{margin:8px 0;padding-left:20px}
.stitek{display:inline-block;font-size:13px;font-weight:bold;padding:3px 8px;border-radius:6px;margin:6px 6px 0 0}
.ok{background:#e3efe0;color:var(--leaf)}.ceka{background:#f6e2df;color:var(--berry)}.hot{background:#f5ead2;color:var(--amber)}
.akce{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.akce a,.akce button,.btn{font:inherit;font-size:14px;padding:9px 12px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--ink);text-decoration:none;cursor:pointer}
.btn.hl,.akce .hl{background:var(--leaf);border-color:var(--leaf);color:#fff}form{display:inline}
table{width:100%;border-collapse:collapse;font-size:15px}td{padding:6px 0;border-bottom:1px solid var(--line)}td.r{text-align:right;font-weight:bold;white-space:nowrap}
#mapa{height:340px;border-radius:10px;border:1px solid var(--line);margin:10px 0}
input[type=password]{width:100%;padding:12px;border:1px solid var(--line);border-radius:8px;font-size:16px}
.err{color:var(--berry);font-weight:bold}
.akce a.waze{background:#33ccff;border-color:#33ccff;color:#0b2530;font-weight:bold}
details.qr{margin-top:10px}details.qr summary{display:inline-block;list-style:none}details.qr summary::-webkit-details-marker{display:none}
</style></head><body>' . $obsah . '</body></html>';
  exit;
}

if (!prihlasen($n)) {
  $formular = isset($potvrdit)
    ? '<form method="post" class="box" style="display:block"><input type="hidden" name="akce" value="potvrdit"><input type="hidden" name="t" value="' . h($potvrdit) . '">'
      . '<p>Přihlásit tento telefon / počítač k přehledu objednávek?</p><button class="btn hl" style="width:100%">Přihlásit</button></form>'
    : '<form method="post" class="box" style="display:block"><input type="hidden" name="akce" value="poslat-odkaz">'
      . '<label for="email" class="muted">Váš e-mail @ovoce-holub.cz</label>'
      . '<input type="email" id="email" name="email" autocomplete="email" required placeholder="pavel@ovoce-holub.cz" style="width:100%;padding:12px;border:1px solid var(--line);border-radius:8px;font-size:16px;margin-top:6px">'
      . '<button class="btn hl" style="margin-top:12px;width:100%">Poslat odkaz pro přihlášení</button></form>';
  stranka('Objednávky – přihlášení', '<main style="max-width:420px;padding-top:48px"><h1>Objednávky a rozvoz</h1>'
    . '<p class="muted">Přihlášení stačí jednou – zařízení si ho pamatuje.</p>'
    . ($chyba ? '<p class="err">' . h($chyba) . '</p>' : '') . ($info ? '<p class="box">' . h($info) . '</p>' : '')
    . $formular . '</main>');
}
nastavit_cookie($n['klic']);

// ---------- načtení objednávek ----------
$vse = [];
foreach (glob(DATA . '/objednavky/*.json') ?: [] as $f) {
  $o = json_decode((string)file_get_contents($f), true);
  if (is_array($o) && !empty($o['cislo'])) $vse[$o['vs']] = $o;
}

// ---------- akce (doručeno, zaplaceno hotově, zrušeno) ----------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['vs'], $vse[$_POST['vs']])) {
  $vs = $_POST['vs'];
  $o = $vse[$vs];
  $pole = ['doruceno' => 'doruceno', 'hotove' => 'zaplaceno_hotove', 'zruseno' => 'zruseno'][$_POST['akce'] ?? ''] ?? null;
  if ($pole) {
    $o[$pole] = empty($o[$pole]);
    $melDoklad = !empty($o['doklad']);
    $o = vystavit_doklad($o);
    $uctenka = !empty($o['doklad'])
      ? ['text' => "
Účtenka: " . odkaz_na_doklad($o) . "
", 'html' => '<p><a href="' . h(odkaz_na_doklad($o)) . '" style="color:#2f5a33">Zobrazit účtenku č. ' . h($o['doklad']['cislo']) . '</a></p>']
      : ['text' => '', 'html' => ''];
    // Zákazník dostane jednou e-mail, že objednávka byla doručena / předána.
    $posilaDoruceni = $pole === 'doruceno' && $o['doruceno'] && empty($o['email_doruceno']) && filter_var($o['email'], FILTER_VALIDATE_EMAIL);
    if (!$posilaDoruceni && !$melDoklad && !empty($o['doklad']) && filter_var($o['email'], FILTER_VALIDATE_EMAIL)) {
      poslat_email($o['email'], "Účtenka k objednávce {$o['cislo']} – Ovocnářství Holub",
        "Dobrý den,

děkujeme za platbu. Účtenka k objednávce {$o['cislo']}:
" . odkaz_na_doklad($o) . "

Ovocnářství Holub
",
        email_html('Účtenka k objednávce', '<p style="line-height:1.5">Dobrý den,<br>děkujeme za platbu.</p>' . $uctenka['html']), null, false);
    }
    if ($posilaDoruceni) {
      $dovoz = !empty($o['rozvoz']);
      $nadpis = $dovoz ? 'Objednávka doručena' : 'Objednávka předána';
      $veta = $dovoz ? 'vaši objednávku jsme dnes doručili' : 'vaši objednávku jste si dnes vyzvedli';
      $o['email_doruceno'] = poslat_email($o['email'], "$nadpis {$o['cislo']} – Ovocnářství Holub",
        "Dobrý den,

$veta. Děkujeme za nákup a přejeme dobrou chuť!

{$o['souhrn']}
{$uctenka['text']}
Budeme rádi, když u nás nakoupíte znovu: " . WEB . "/eshop.html

Ovocnářství Holub
",
        email_html($nadpis, '<p style="line-height:1.5">Dobrý den,<br>' . h($veta) . '. Děkujeme za nákup a přejeme dobrou chuť!</p>'
          . '<div style="background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:18px 20px;line-height:1.55;font-size:14px">' . nl2br(h($o['souhrn'])) . '</div>'
          . $uctenka['html'] . '<p><a href="' . WEB . '/eshop.html" style="color:#2f5a33">Objednat znovu</a></p>'), null, false);
    }
    ulozit_json("objednavky/$vs.json", $o);
  }
  header('Location: rozvoz.php?den=' . urlencode($_POST['den'] ?? '') . '#o' . $vs); exit;
}

// ---------- přehled účtenek (a export pro účetní) ----------
if (isset($_GET['uctenky'])) {
  $doklady = array_values(array_filter($vse, fn($o) => !empty($o['doklad'])));
  usort($doklady, fn($a, $b) => strcmp($b['doklad']['cislo'], $a['doklad']['cislo']));
  $mesice = array_values(array_unique(array_map(fn($o) => substr($o['doklad']['vystaveno'], 0, 7), $doklady)));
  $mesic = in_array($_GET['mesic'] ?? '', $mesice, true) ? $_GET['mesic'] : ($mesice[0] ?? date('Y-m'));
  $vMesici = array_values(array_filter($doklady, fn($o) => str_starts_with($o['doklad']['vystaveno'], $mesic)));
  $sazby = array_values(array_unique([(int)PRODAVAJICI['sazba_dph'], (int)PRODAVAJICI['sazba_dph_napoje']]));
  $f2 = fn($x) => number_format($x, 2, ',', ' ') . ' Kč';
  if (($_GET['uctenky'] ?? '') === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="uctenky-' . $mesic . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    $hlavicka = ['Číslo účtenky', 'Datum vystavení', 'DUZP', 'Objednávka', 'Zákazník', 'Úhrada'];
    foreach ($sazby as $sz) { $hlavicka[] = "Základ $sz %"; $hlavicka[] = "DPH $sz %"; }
    $hlavicka[] = 'Celkem';
    fputcsv($out, $hlavicka, ';', '"', '');
    foreach (array_reverse($vMesici) as $o) {
      $r = rozpis_dph($o);
      $radek = [$o['doklad']['cislo'], date('j.n.Y', strtotime($o['doklad']['vystaveno'])), !empty($o['datum']) ? date('j.n.Y', strtotime($o['datum'])) : '',
        $o['cislo'], $o['jmeno'], $o['doklad']['uhrada']];
      foreach ($sazby as $sz) {
        $radek[] = number_format($r[$sz]['zaklad'] ?? 0, 2, ',', '');
        $radek[] = number_format($r[$sz]['dan'] ?? 0, 2, ',', '');
      }
      $radek[] = number_format(cil_platby($o), 2, ',', '');
      fputcsv($out, $radek, ';', '"', '');
    }
    exit;
  }
  $obsah = '<header><h1 style="font-size:19px">Účtenky</h1><span><a href="rozvoz.php">Objednávky</a> · <a href="?odhlasit=1">Odhlásit</a></span></header><main>';
  if (PRODAVAJICI['ico'] === '') $obsah .= '<p class="box">Účtenky se začnou vystavovat po doplnění IČO.</p>';
  $obsah .= '<p class="muted">Účtenka se vystaví sama, když je objednávka doručená a zaplacená. Zákazník dostane odkaz e-mailem.</p>';
  if (!$doklady) {
    $obsah .= '<p class="box">Zatím žádné účtenky.</p>';
  } else {
    $obsah .= '<nav class="dny">';
    foreach ($mesice as $m) $obsah .= '<a href="?uctenky=1&mesic=' . h($m) . '"' . ($m === $mesic ? ' class="akt"' : '') . '>' . h(date('n/Y', strtotime("$m-01"))) . '</a>';
    $obsah .= '</nav>';
    $celkem = 0; $poSazbach = [];
    $obsah .= '<div class="box"><table><tr><td class="muted">Účtenka</td><td class="muted">Zákazník</td><td class="r muted">Celkem</td></tr>';
    foreach ($vMesici as $o) {
      $c = cil_platby($o);
      $celkem += $c;
      foreach (rozpis_dph($o) as $sz => $x) {
        $poSazbach[$sz]['zaklad'] = ($poSazbach[$sz]['zaklad'] ?? 0) + $x['zaklad'];
        $poSazbach[$sz]['dan'] = ($poSazbach[$sz]['dan'] ?? 0) + $x['dan'];
      }
      $obsah .= '<tr><td><a href="' . h(odkaz_na_doklad($o)) . '">' . h($o['doklad']['cislo']) . '</a><br><span class="muted">' . h(date('j. n.', strtotime($o['doklad']['vystaveno']))) . ' · ' . h($o['doklad']['uhrada']) . '</span></td>'
        . '<td>' . h($o['jmeno']) . '<br><span class="muted">' . h($o['cislo']) . '</span></td><td class="r">' . h(kc($c)) . '</td></tr>';
    }
    ksort($poSazbach);
    $obsah .= '</table><p style="margin:12px 0 0"><b>Celkem za měsíc: ' . h($f2($celkem)) . '</b>';
    if (PRODAVAJICI['platce_dph']) foreach ($poSazbach as $sz => $x) {
      $obsah .= '<br><span class="muted">DPH ' . (int)$sz . ' %: základ ' . h($f2($x['zaklad'])) . ' · daň ' . h($f2($x['dan'])) . '</span>';
    }
    $obsah .= '</p></div>'
      . '<div class="akce"><a class="hl" href="?uctenky=csv&mesic=' . h($mesic) . '">Stáhnout pro účetní (CSV / Excel)</a></div>';
  }
  stranka('Účtenky', $obsah . '</main>');
}

// ---------- výběr dne ----------
$dny = [];
foreach ($vse as $o) {
  $d = $o['datum'] ?? '';
  if ($d === '') $d = 'bez-terminu';
  $dny[$d] = ($dny[$d] ?? 0) + (empty($o['zruseno']) ? 1 : 0);
}
ksort($dny);
$dnes = date('Y-m-d');
$vybrany = $_GET['den'] ?? '';
if (!isset($dny[$vybrany])) {
  $vybrany = '';
  foreach (array_keys($dny) as $d) if ($d >= $dnes && $d !== 'bez-terminu') { $vybrany = $d; break; }
  if ($vybrany === '' && $dny) $vybrany = array_key_last($dny);
}
$nazevDne = function (string $d): string {
  if ($d === 'bez-terminu') return 'Bez termínu';
  $t = strtotime($d);
  $jm = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'][(int)date('w', $t)];
  return $jm . ' ' . date('j. n.', $t);
};

$den = array_values(array_filter($vse, fn($o) => (($o['datum'] ?? '') ?: 'bez-terminu') === $vybrany));
$aktivni = array_values(array_filter($den, fn($o) => empty($o['zruseno'])));
$rozvoz = array_values(array_filter($aktivni, fn($o) => !empty($o['rozvoz'])));
$odber = array_values(array_filter($aktivni, fn($o) => empty($o['rozvoz'])));
$zrusene = array_values(array_filter($den, fn($o) => !empty($o['zruseno'])));

// ---------- geokódování adres (OpenStreetMap Nominatim, výsledky se pamatují) ----------
$geo = nacist_json('geo.json', []);
$dotazu = 0;
$souradnice = function (string $adresa) use (&$geo, &$dotazu): ?array {
  $k = mb_strtolower(trim($adresa));
  if (array_key_exists($k, $geo)) return $geo[$k];
  if ($dotazu >= 8) return null;
  if ($dotazu++) usleep(1100000);
  $url = 'https://nominatim.openstreetmap.org/search?' . http_build_query(['q' => $adresa, 'format' => 'json', 'limit' => 1, 'countrycodes' => 'cz']);
  $ctx = stream_context_create(['http' => ['timeout' => 8, 'header' => "User-Agent: ovoce-holub.cz rozvoz (objednavky@ovoce-holub.cz)\r\n"]]);
  $r = json_decode((string)@file_get_contents($url, false, $ctx), true);
  $geo[$k] = !empty($r[0]) ? [(float)$r[0]['lat'], (float)$r[0]['lon']] : null;
  return $geo[$k];
};
$farma = $souradnice(FARMA) ?? $souradnice('Krtely, Česko');
$body = [];
foreach ($rozvoz as $i => $o) {
  // Adresa ověřená při objednávce v registru adres (RÚIAN) má přesné souřadnice; jinak dohledání přes OpenStreetMap.
  $adr = !empty($o['adresa_overena']) ? $o['adresa_overena']
    : $o['adresa'] . ', ' . trim(($o['psc'] ?? '') . ' ' . (($o['mesto'] ?? '') ?: 'České Budějovice'));
  $rozvoz[$i]['plna_adresa'] = $adr;
  $rozvoz[$i]['gps'] = $o['gps_overena'] ?? $souradnice($adr);
}
if ($dotazu) ulozit_json('geo.json', $geo);

// Pořadí zastávek: nejdřív hrubě „vždy k nejbližší další“, pak nejkratší okruh po silnicích (OSRM).
$vzd = fn($a, $b) => hypot(($a[0] - $b[0]) * 111, ($a[1] - $b[1]) * 111 * cos(deg2rad($a[0])));
$zbyva = $rozvoz; $poradi = []; $kde = $farma;
while ($zbyva) {
  $nej = 0;
  if ($kde) foreach ($zbyva as $i => $o) if ($o['gps'] && (!$zbyva[$nej]['gps'] || $vzd($kde, $o['gps']) < $vzd($kde, $zbyva[$nej]['gps']))) $nej = $i;
  $poradi[] = $zbyva[$nej];
  if ($zbyva[$nej]['gps']) $kde = $zbyva[$nej]['gps'];
  array_splice($zbyva, $nej, 1);
}
$rozvoz = $poradi;

$trasa = null;
$sGps = array_values(array_filter($rozvoz, fn($o) => !empty($o['gps'])));
if ($farma && $sGps) {
  $body = array_merge([$farma], array_map(fn($o) => $o['gps'], $sGps));
  $klicTrasy = sha1(json_encode($body));
  $trasy = nacist_json('trasy.json', []);
  if (!isset($trasy[$klicTrasy])) {
    $souradniceUrl = implode(';', array_map(fn($b) => $b[1] . ',' . $b[0], $body));
    $url = "https://router.project-osrm.org/trip/v1/driving/$souradniceUrl?source=first&roundtrip=true&geometries=geojson&overview=full";
    $ctx = stream_context_create(['http' => ['timeout' => 10, 'header' => "User-Agent: ovoce-holub.cz rozvoz\r\n"]]);
    $r = json_decode((string)@file_get_contents($url, false, $ctx), true);
    if (($r['code'] ?? '') === 'Ok') {
      $trasy = array_slice($trasy, -50, null, true);
      $trasy[$klicTrasy] = [
        'poradi' => array_map(fn($w) => (int)$w['waypoint_index'], $r['waypoints']),
        'km' => round($r['trips'][0]['distance'] / 1000, 1),
        'min' => (int)round($r['trips'][0]['duration'] / 60),
        'cara' => array_map(fn($c) => [round($c[1], 5), round($c[0], 5)], $r['trips'][0]['geometry']['coordinates']),
      ];
      ulozit_json('trasy.json', $trasy);
    }
  }
  if (isset($trasy[$klicTrasy])) {
    $trasa = $trasy[$klicTrasy];
    // waypoint_index = pořadí bodu na trase; bod 0 je statek.
    $serazene = $sGps;
    usort($serazene, fn($x, $y) => $trasa['poradi'][array_search($x, $sGps, true) + 1] <=> $trasa['poradi'][array_search($y, $sGps, true) + 1]);
    $rozvoz = array_merge($serazene, array_values(array_filter($rozvoz, fn($o) => empty($o['gps']))));
  }
}

// ---------- co naložit ----------
$nalozit = [];
foreach ($aktivni as $o) foreach ($o['polozky'] ?? [] as $r) {
  if (preg_match('/^(\d+(?:[.,]\d+)?)\s*(kg|ks|×|x)?\s*(.+?)\s+–/u', $r, $m)) {
    $k = $m[3] . '|' . ($m[2] ?: 'ks');
    $nalozit[$k] = ($nalozit[$k] ?? 0) + (float)str_replace(',', '.', $m[1]);
  } else $nalozit[$r . '|'] = ($nalozit[$r . '|'] ?? 0) + 1;
}
ksort($nalozit);

// ---------- výstup ----------
$cil = fn(array $o): int => (int)($o['castka'] ?: ($o['celkem'] ?? 0));
$zaplaceno = fn(array $o): bool => !empty($o['zaplaceno_hotove']) || ($cil($o) > 0 && $o['zaplaceno'] + 0.001 >= $cil($o));
$platba = function (array $o) use ($cil): string {
  if (!empty($o['zaplaceno_hotove'])) return '<span class="stitek ok">Zaplaceno na místě</span>';
  if ($cil($o) > 0 && $o['zaplaceno'] + 0.001 >= $cil($o)) return '<span class="stitek ok">Zaplaceno převodem</span>';
  if ($o['zaplaceno'] > 0) return '<span class="stitek ceka">Zaplaceno jen ' . h(kc((int)$o['zaplaceno'])) . ' z ' . h(kc($cil($o))) . '</span>';
  if (($o['platba'] ?? '') === 'prevod' || $o['castka'] > 0) return '<span class="stitek ceka">Čeká na platbu převodem · ' . h(kc($cil($o))) . '</span>';
  return '<span class="stitek hot">Platí na místě · ' . h(kc($cil($o))) . '</span>';
};
// Řetězec QR Platby (stejný formát jako na webu).
$spd = fn(array $o) => implode('*', ['SPD*1.0', 'ACC:' . UCET['iban'] . '+GIBACZPX', 'AM:' . number_format($cil($o) - (float)$o['zaplaceno'], 2, '.', ''),
  'CC:CZK', 'X-VS:' . $o['vs'], 'RN:PAVEL HOLUB', 'MSG:Objednavka ' . $o['cislo']]);
$tlacitko = fn($o, $akce, $text, $hl = false) => '<form method="post"' . ($akce === 'zruseno' && empty($o['zruseno']) ? ' onsubmit="return confirm(' . h(json_encode("Opravdu stornovat objednávku {$o['cislo']} ({$o['jmeno']})?", JSON_UNESCAPED_UNICODE)) . ')"' : '') . '><input type="hidden" name="vs" value="' . h($o['vs']) . '">'
  . '<input type="hidden" name="akce" value="' . $akce . '"><input type="hidden" name="den" value="' . h($GLOBALS['vybrany']) . '">'
  . '<button' . ($hl ? ' class="hl"' : '') . '>' . $text . '</button></form>';
$karta = function (array $o, ?int $cislo) use ($platba, $tlacitko, $zaplaceno, $spd, $cil): string {
  $hotovo = !empty($o['doruceno']);
  $s = '<div class="box obj' . ($hotovo ? ' hotovo' : '') . '" id="o' . h($o['vs']) . '">'
    . ($cislo ? '<span class="cislo">' . $cislo . '</span>' : '')
    . '<span class="jm">' . h($o['jmeno']) . '</span> <span class="muted">' . h($o['cislo']) . '</span>'
    . (!empty($o['skupina']) ? ' <span class="stitek ok">skupina ' . h($o['skupina']) . '</span>' : '');
  if (!empty($o['rozvoz'])) {
    $s .= '<div><a href="https://www.google.com/maps/dir/?api=1&destination=' . urlencode($o['plna_adresa'] ?? $o['adresa']) . '">' . h($o['adresa']) . '</a>'
      . (!empty($o['adresa_overena'])
          ? '<br><span class="muted" style="color:var(--leaf)">✓ ověřeno: ' . h($o['adresa_overena']) . '</span>'
          : '<br><span class="stitek ceka">⚠ Adresa neověřená – zkontrolujte' . (empty($o['gps']) ? ', nenašla se ani na mapě' : '') . '</span>')
      . '</div>';
  }
  if (!empty($o['telefon'])) $s .= '<div><a href="tel:' . h(preg_replace('/[^\d+]/', '', $o['telefon'])) . '">' . h($o['telefon']) . '</a></div>';
  $s .= '<ul>' . implode('', array_map(fn($r) => '<li>' . h($r) . '</li>', $o['polozky'] ?? [])) . '</ul>';
  if (empty($o['polozky'])) $s .= '<div class="muted" style="white-space:pre-line">' . h($o['souhrn']) . '</div>';
  if (!empty($o['poznamka'])) $s .= '<div><b>Poznámka:</b> ' . h($o['poznamka']) . '</div>';
  $s .= $platba($o) . ($hotovo ? '<span class="stitek ok">' . (!empty($o['rozvoz']) ? 'Doručeno' : 'Vyzvednuto') . (!empty($o['email_doruceno']) ? ' · zákazník dostal e-mail' : '') . '</span>' : '');
  if (!$zaplaceno($o) && $cil($o) > 0) {
    $s .= '<details class="qr"><summary class="btn">Ukázat QR kód k platbě</summary><div class="box" style="text-align:center">'
      . '<div class="qrkod" data-spd="' . h($spd($o)) . '" style="display:inline-block;background:#fff;padding:10px"></div>'
      . '<p style="margin:8px 0 0"><b>' . h(kc($cil($o) - (int)$o['zaplaceno'])) . '</b> · VS ' . h($o['vs']) . '<br><span class="muted">' . h(UCET['cislo']) . '</span></p>'
      . '<p class="muted" style="margin:6px 0 0">Po připsání platby se objednávka označí jako zaplacená sama.</p></div></details>';
  }
  if (!empty($o['doklad'])) $s .= '<div style="margin-top:8px"><a href="' . h(odkaz_na_doklad($o)) . '">Účtenka č. ' . h($o['doklad']['cislo']) . '</a></div>';
  if (!empty($o['rozvoz'])) {
    $kam = $o['plna_adresa'] ?? $o['adresa'];
    $waze = !empty($o['gps'])
      ? 'https://waze.com/ul?ll=' . $o['gps'][0] . ',' . $o['gps'][1] . '&navigate=yes'
      : 'https://waze.com/ul?q=' . rawurlencode($kam) . '&navigate=yes';
    $gmaps = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination='
      . (!empty($o['gps']) ? $o['gps'][0] . ',' . $o['gps'][1] : urlencode($kam));
    $s .= '<div class="akce"><a class="nav waze" href="' . h($waze) . '">Navigovat ve Waze</a>'
      . '<a class="nav" href="' . h($gmaps) . '">Google Maps</a></div>';
  }
  $s .= '<div class="akce">'
    . $tlacitko($o, 'doruceno', $hotovo ? 'Vrátit: nedoručeno' : (!empty($o['rozvoz']) ? '✓ Doručeno' : '✓ Vyzvednuto'), !$hotovo)
    . (!$zaplaceno($o) || !empty($o['zaplaceno_hotove']) ? $tlacitko($o, 'hotove', empty($o['zaplaceno_hotove']) ? 'Zaplaceno na místě' : 'Zrušit: zaplaceno na místě') : '')
    . $tlacitko($o, 'zruseno', empty($o['zruseno']) ? 'Stornovat' : 'Obnovit objednávku')
    . '</div></div>';
  return $s;
};

$obsah = '<header><h1 style="font-size:19px">Objednávky a rozvoz</h1><span><a href="?uctenky=1">Účtenky</a> · <a href="?odhlasit=1">Odhlásit</a></span></header><main>';
if (!$dny) {
  $obsah .= '<p class="box">Zatím žádné objednávky z e-shopu.</p>';
} else {
  $obsah .= '<nav class="dny">';
  foreach ($dny as $d => $pocet) {
    $obsah .= '<a href="?den=' . urlencode($d) . '"' . ($d === $vybrany ? ' class="akt"' : '') . '>' . h($nazevDne($d)) . ' <small>' . $pocet . '</small></a>';
  }
  $obsah .= '</nav>';
  $suma = array_sum(array_map(fn($o) => (int)(($o['celkem'] ?? 0) ?: $o['castka']), $aktivni));
  $obsah .= '<h2>' . h(ucfirst($nazevDne($vybrany))) . '</h2><p class="muted">' . count($rozvoz) . '× rozvoz · ' . count($odber) . '× osobní odběr · celkem ' . h(kc($suma)) . '</p>';

  if ($nalozit) {
    $obsah .= '<div class="box"><b>Co připravit</b><table>';
    foreach ($nalozit as $k => $mn) {
      [$nazev, $jed] = explode('|', $k);
      $obsah .= '<tr><td>' . h($nazev) . '</td><td class="r">' . h(rtrim(rtrim(number_format($mn, 1, ',', ' '), '0'), ',') . ($jed ? " $jed" : '×')) . '</td></tr>';
    }
    $obsah .= '</table></div>';
  }

  if ($rozvoz) {
    $obsah .= '<h2>Rozvoz</h2>';
    $gps = [];
    foreach ($rozvoz as $i => $o) if ($o['gps']) $gps[] = [
      'n' => $i + 1, 'gps' => $o['gps'], 'jm' => $o['jmeno'], 'adr' => $o['adresa'],
      'co' => $o['polozky'] ?? [],
      'vybrat' => $zaplaceno($o) ? 'zaplaceno' : 'vybrat ' . kc($cil($o) - (int)$o['zaplaceno']),
    ];
    if ($gps) $obsah .= '<div id="mapa"></div>' . ($trasa ? '<p class="muted">Nejkratší okruh ze statku a zpět: <b>' . h(str_replace('.', ',', (string)$trasa['km'])) . ' km</b>, cca <b>' . h(intdiv($trasa['min'], 60) ? intdiv($trasa['min'], 60) . ' h ' . ($trasa['min'] % 60) . ' min' : $trasa['min'] . ' min') . '</b> jízdy. Čísla zastávek odpovídají pořadí jízdy.</p>' : '<p class="muted">Trasu po silnicích se teď nepodařilo spočítat – pořadí je podle vzdušné vzdálenosti.</p>');
    $stops = array_map(fn($o) => $o['plna_adresa'], $rozvoz);
    $posledni = array_pop($stops);
    $navigace = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' . urlencode(FARMA)
      . '&destination=' . urlencode($posledni) . ($stops ? '&waypoints=' . urlencode(implode('|', $stops)) : '');
    $obsah .= '<div class="akce"><a class="hl" href="' . h($navigace) . '">Navigovat celou trasu (Google Maps)</a></div>';
    if (count($rozvoz) > 9) $obsah .= '<p class="muted">Google Maps v telefonu zvládne jen 9 zastávek najednou – další navigujte u jednotlivých adres.</p>';
    foreach ($rozvoz as $i => $o) $obsah .= $karta($o, $i + 1);
    if ($gps) {
      $obsah .= '<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script><script>'
        . 'const b=' . json_encode($gps, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) . ',f=' . json_encode($farma) . ',t=' . json_encode($trasa['cara'] ?? null) . ';'
        . 'const m=L.map("mapa");L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,referrerPolicy:"strict-origin-when-cross-origin",attribution:"© OpenStreetMap"}).addTo(m);'
        . 'const e=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));'
        . 'const pts=[];if(f){L.circleMarker(f,{radius:8,color:"#17241a",fillOpacity:1}).addTo(m).bindPopup("Statek – start a cíl");pts.push(f)}'
        . 'b.forEach(x=>{L.marker(x.gps,{icon:L.divIcon({className:"",html:`<span class="cislo">${x.n}</span>`,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(m)'
        . '.bindPopup(`<b>${x.n}. ${e(x.jm)}</b><br>${e(x.adr)}<br>${x.co.map(e).join("<br>")}<br><b>${e(x.vybrat)}</b>`);pts.push(x.gps)});'
        . 'if(t){L.polyline(t,{color:"#2f5a33",weight:5,opacity:.75}).addTo(m)}else{L.polyline(pts,{color:"#2f5a33",weight:3,opacity:.6,dashArray:"6 6"}).addTo(m)}'
        . 'm.fitBounds(t||pts,{padding:[30,30]});</script>';
    }
  }
  if ($odber) {
    $obsah .= '<h2>Osobní odběr – Krtely</h2>';
    foreach ($odber as $o) $obsah .= $karta($o, null);
  }
  if ($zrusene) {
    $obsah .= '<h2>Stornované</h2>';
    foreach ($zrusene as $o) $obsah .= $karta($o, null);
  }
  if (!$aktivni && !$zrusene) $obsah .= '<p class="box">Na tento den nejsou objednávky.</p>';
}
$obsah .= '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script><script>'
  . 'document.querySelectorAll("details.qr").forEach(d=>d.addEventListener("toggle",()=>{const el=d.querySelector(".qrkod");'
  . 'if(d.open&&!el.dataset.hotovo){new QRCode(el,{text:el.dataset.spd,width:260,height:260,correctLevel:QRCode.CorrectLevel.M});el.dataset.hotovo=1}}));</script>';
if (PRODAVAJICI['ico'] === '') $obsah .= '<p class="box muted">Účtenky se začnou vystavovat automaticky po doplnění IČO do nastavení webu.</p>';
$obsah .= '<p class="muted" style="margin-top:28px">Objednávky z e-shopu. Platby převodem se označí samy podle upozornění z banky.</p></main>';
stranka('Objednávky a rozvoz', $obsah, '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">');
