<?php
// Příjem objednávky z e-shopu (react-verze/src/eshop/Pokladna.jsx).
// Ceny, součet a částku k platbě počítá server sám – podle ceníku _cenik.php (vzniká při sestavení webu
// z katalogu e-shopu) a u zákaznických skupin podle _skupiny.php, ale jen pro přihlášeného člena skupiny.
// Objednávku uloží (přehled rozvozu, párování plateb), pošle ji farmě na objednavky@ovoce-holub.cz
// a zákazníkovi potvrzení (u převodu s QR platbou, kterou vytvoří tady na serveru).
//
// POST JSON: cislo 'OH-RRMMDD-NNNN', email, jmeno, telefon, ico, rozvoz, den ('středa 1. 10.'), adresa, psc, mesto,
//   adresaOverena (adresa z registru adres vybraná v pokladně), platba 'prevod'|'prevzeti', poznamka,
//   kosik [{produkt, varianta, pocet}] (klíče jako v košíku), celkem (součet v prohlížeči – jen ke kontrole),
//   skupina (id skupiny, když prohlížeč počítá její ceny; k tomu hlavička Authorization: Bearer <token Supabase>),
//   polozky (řádky s cenami z prohlížeče – použijí se, jen když na serveru chybí _cenik.php).
// Odpovědi:
//   200 {ok, ulozeno: true, farma, potvrzeni, cislo, vs, celkem, castka, souhrn, polozky} – platí údaje ze serveru;
//       stejná objednávka poslaná znovu pod stejným číslem vrátí totéž a nic se neposílá podruhé
//   409 {kolize: true, dnes} – číslo je obsazené nebo nemá dnešní datum: pokladna zkusí nové číslo s datem `dnes`
//   409 {chyba: 'termin', terminy} – na zvolený den už objednat nejde
//   400 {chyba: 'cenik'} – položka, kterou ceník nezná (nabídka se mezitím změnila)
//   400 {chyba: 'neplatne'|'email'|'cislo'|'kosik'|'verze'} · 403 cizí web · 429 moc objednávek z jedné adresy
require __DIR__ . '/_spolecne.php';
require __DIR__ . '/_skupiny.php';
require __DIR__ . '/_qr.php';

const POVOLENE_ORIGINY = ['https://ovoce-holub.cz', 'https://www.ovoce-holub.cz'];
const POTVRZENI_NA_ADRESU = 5;    // nejvýš tolik potvrzovacích e-mailů na jednu adresu za 24 hodin
const POTVRZENI_ZA_HODINU = 60;   // a nejvýš tolik potvrzení za hodinu celkem (běžně jich je pár za den)
const ODKLAD_UZAVERKY = 15 * 60;  // objednávka odeslaná chvíli po uzávěrce (hodiny v telefonu) se ještě přijme
const MAX_RADKU = 100;
const DNY_TYDNE = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];

header('Content-Type: application/json; charset=utf-8');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, POVOLENE_ORIGINY, true)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
}

function konec(int $kod, array $data): void {
  http_response_code($kod);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

// Odpověď prohlížeči hned – zákazník nečeká, než se odešle potvrzovací e-mail. Skript pak ještě doběhne.
function odpovedet_predem(array $data): void {
  $j = json_encode($data, JSON_UNESCAPED_UNICODE);
  http_response_code(200);
  if (function_exists('fastcgi_finish_request')) {
    echo $j;
    fastcgi_finish_request();
    return;
  }
  if (!ini_get('zlib.output_compression')) header('Content-Length: ' . strlen($j));
  echo $j;
  while (ob_get_level() > 0) @ob_end_flush();
  flush();
}

// Ceník z _cenik.php; null = soubor chybí (web sestavený starší verzí) – ceny pak ověřit nejde.
function cenik(): ?array {
  static $c = false;
  if ($c === false) {
    $x = is_file(__DIR__ . '/_cenik.php') ? include __DIR__ . '/_cenik.php' : null;
    $c = is_array($x) && !empty($x['produkty']) && is_array($x['produkty']) ? $x : null;
  }
  return $c;
}

// Text z objednávky: jen řetězec, bez řídicích a neviditelných znaků, zkrácený. $radky = nechat konce řádků.
function text_pole($v, int $max, bool $radky = false): string {
  if (!is_string($v) && !is_int($v) && !is_float($v)) return '';
  $v = str_replace(["\r\n", "\r"], "\n", (string)$v);
  $v = preg_replace($radky ? '/[^\P{C}\n]+/u' : '/\p{C}+/u', ' ', $v) ?? '';
  return trim(mb_substr($v, 0, $max));
}

function token_zakaznika(): string {
  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
    ?? (function_exists('getallheaders') ? (array_change_key_case(getallheaders())['authorization'] ?? '') : '');
  return is_string($auth) && preg_match('/^Bearer\s+(\S+)$/i', $auth, $m) ? $m[1] : '';
}

// Skupina, jejíž ceny zákazník v e-shopu viděl. Platí jen pro přihlášeného člena (data/skupiny.json).
// Vrací [ověřená skupina | null, požadovaná skupina | null].
function skupina_objednavky(string $pozadovana): array {
  if ($pozadovana === '') return [null, null];
  $s = null;
  foreach (skupiny() as $x) {
    if ($x['id'] === $pozadovana || mb_strtolower($x['nazev']) === mb_strtolower($pozadovana)) $s = $x;
  }
  if (!$s) return [null, ['id' => '', 'nazev' => $pozadovana, 'bedynky' => []]];
  $token = token_zakaznika();
  $u = $token !== '' ? supabase_uzivatel($token) : null;
  if (!$u) return [null, $s];
  $vse = clenove_vse();
  $clen = in_array($u['uid'], array_column($vse[$s['id']] ?? [], 'uid'), true) && !in_array($u['uid'], $vse[$s['id'] . '#blok'] ?? [], true);
  return [$clen ? $s : null, $s];
}

// Cena pro skupinu – stejně jako cenaSkupiny() v e-shopu (src/eshop/skupina.js): pevná cena za kg podle druhu,
// jinak procentní sleva zaokrouhlená na celé koruny (jako Math.round v prohlížeči).
function cena_skupiny(?array $s, string $druh, $cena): ?int {
  if ($cena === null) return null;
  $cena = (int)$cena;
  if (!$s) return $cena;
  $pevna = $s['ceny'][$druh] ?? null;
  if (is_int($pevna) || is_float($pevna)) return (int)round($pevna);
  $sleva = (float)($s['sleva'] ?? 0);
  return $sleva > 0 ? (int)floor($cena * (100 - $sleva) / 100 + 0.5) : $cena;
}

// Je položka podle ceníku mimo sezónu nebo mimo aktuální nabídku (aktuality.nabidka, dostupne: false)?
// Jen upozornění pro farmu – objednávka platí. Sezóna se bere k dnešku i ke včerejšku (stránka otevřená
// od včerejška, hodiny v telefonu), ať se kvůli pár minutám nic neztratí.
function mimo_nabidku(?array $p): bool {
  if (!$p) return false;
  if (($p['nabizeno'] ?? true) === false) return true;
  $s = $p['sezona'] ?? null;
  if (!is_array($s) || count($s) !== 2 || !is_array($s[0]) || !is_array($s[1])) return false;
  $od = (int)($s[0][0] ?? 0) * 100 + (int)($s[0][1] ?? 0);
  $do = (int)($s[1][0] ?? 0) * 100 + (int)($s[1][1] ?? 0);
  foreach ([time(), time() - 86400] as $t) {
    $den = (int)date('n', $t) * 100 + (int)date('j', $t);
    if ($od <= $do ? $den >= $od && $den <= $do : $den >= $od || $den <= $do) return false;
  }
  return true;
}

// Řádek objednávky podle ceníku – stejný text jako radekPolozky() v e-shopu (přehled rozvozu, účtenky):
//   „3 kg Bohemia (Jablka) – 120 Kč“, „2× 5 l Mošt hruška (Mošty) – 340 Kč“,
//   „1× Bedýnka 3 kg: 2 kg Gala (Jablka) + 1 kg Novembra (Hrušky) – 100 Kč“.
// Vrací ['text', 'cena' (null = cena na dotaz), 'mimo' (mimo sezónu / nabídku)], nebo null, když položku ceník nezná.
function radek_objednavky(array $r, array $cenik, ?array $skupina, ?array $pozadovana): ?array {
  $id = $r['produkt']; $var = $r['varianta']; $n = $r['pocet'];
  $produkty = $cenik['produkty'];
  if (str_starts_with($id, 'bedynka-')) {
    // Bedýnka skupiny: pevná cena za bedýnku. Neověřenému zákazníkovi se kila počítají za běžné ceny.
    $b = null;
    foreach (($skupina ?? $pozadovana)['bedynky'] ?? [] as $x) {
      if ('bedynka-' . $x['id'] === $id) $b = $x;
    }
    if (!$b) return null;
    $cenaKg = fn(array $p): int => (int)($p['varianty']['kg']['cena'] ?? 0);
    $mimo = false;
    if ($var === 'mix') {
      if (empty($b['mix'])) return null;
      $slozeni = $b['mix'];
      $ceny = array_map($cenaKg, array_filter($produkty, fn($p) => in_array($p['druh'], $b['druhy'], true)));
      $bezne = ($ceny ? max($ceny) : 0) * (int)$b['kg'];
    } else {
      $casti = []; $kg = 0; $bezne = 0;
      foreach (explode(',', $var) as $c) {
        if (!preg_match('/^([^:,]+):([1-9]\d{0,2})$/', $c, $m)) return null;
        $p = $produkty[$m[1]] ?? null;
        if (!$p || !in_array($p['druh'], $b['druhy'], true)) return null;
        $casti[] = "$m[2] kg {$p['nazev']} ({$p['druhNazev']})";
        $kg += (int)$m[2];
        $bezne += (int)$m[2] * $cenaKg($p);
        $mimo = $mimo || mimo_nabidku($p);
      }
      if ($kg !== (int)$b['kg']) return null;
      $slozeni = implode(' + ', $casti);
    }
    $cena = ($skupina ? (int)$b['cena'] : $bezne) * $n;
    return ['text' => "{$n}× {$b['nazev']}: $slozeni – " . kc($cena), 'cena' => $cena, 'mimo' => $mimo];
  }
  $p = $produkty[$id] ?? null;
  $v = is_array($p) ? ($p['varianty'][$var] ?? null) : null;
  if (!is_array($v)) return null;
  $jednotkova = cena_skupiny($skupina, $p['druh'], $v['cena'] ?? null);
  $cena = $jednotkova === null ? null : $jednotkova * $n;
  $mnozstvi = $p['jednotka'] === 'kg' ? "$n kg" : "{$n}× {$v['label']}";
  return ['text' => "$mnozstvi {$v['nazev']} ({$p['druhNazev']}) – " . ($cena === null ? 'cena na dotaz' : kc($cena)), 'cena' => $cena, 'mimo' => mimo_nabidku($p)];
}

// Odkazy z textu od zákazníka ven z potvrzení, které jde na zadanou (třeba i cizí) adresu – e-shop nesmí
// posloužit k rozesílání odkazů jménem farmy. Celé adresy, „www.…“ i holé domény („neco.cz/…“), e-mailové adresy zůstávají.
function bez_odkazu(string $s): string {
  return preg_replace([
    '~(?:https?://|www\.)\S+~iu',
    '~(?<![\w@.-])(?:[a-z0-9-]+\.)+[a-z]{2,}/\S*~iu', // doména s cestou („bit.ly/abc“)
    '~(?<![\w@.-])(?:[a-z0-9-]+\.)+(?:cz|sk|com|net|org|eu|info|biz|io|ru|de|at|pl|xyz|top|site|online|shop|store|app|me|co|uk|us|cc|tk|ml|ga|cf|gq|link|click|live|club|pro|icu|vip|buzz|ly|to|gl|gg)\b~iu',
  ], '[odkaz]', $s) ?? $s;
}

// Velikonoční neděle ('RRRR-MM-DD') – stejný výpočet jako v e-shopu (src/eshop/terminy.js).
function velikonocni_nedele(int $rok): string {
  $a = $rok % 19; $b = intdiv($rok, 100); $c = $rok % 100;
  $d = intdiv($b, 4); $e = $b % 4; $f = intdiv($b + 8, 25); $g = intdiv($b - $f + 1, 3);
  $h = (19 * $a + $b - $d - $g + 15) % 30; $i = intdiv($c, 4); $k = $c % 4;
  $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7; $m = intdiv($a + 11 * $h + 22 * $l, 451);
  $n = $h + $l - 7 * $m + 114;
  return date('Y-m-d', mktime(12, 0, 0, intdiv($n, 31), $n % 31 + 1, $rok));
}

function zavreno(array $p, int $den): bool {
  $datum = date('Y-m-d', $den);
  if (in_array(date('j.n.', $den), $p['svatky'] ?? [], true) || in_array($datum, $p['zavreno'] ?? [], true)) return true;
  $v = strtotime(velikonocni_nedele((int)date('Y', $den)) . ' 12:00');
  return $datum === date('Y-m-d', strtotime('-2 days', $v)) || $datum === date('Y-m-d', strtotime('+1 day', $v));
}

// Dny, na které jde v čase $ted objednat – jako terminy() v e-shopu: ['RRRR-MM-DD' => 'středa 1. 10.'].
function nabizene_dny(array $p, bool $rozvoz, int $ted): array {
  $dny = $p[$rozvoz ? 'rozvoz' : 'odber'] ?? [];
  $out = [];
  for ($i = 1; count($out) < (int)($p['pocet'] ?? 6) && $i < 60; $i++) {
    $den = mktime(12, 0, 0, (int)date('n', $ted), (int)date('j', $ted) + $i, (int)date('Y', $ted));
    if (!in_array((int)date('w', $den), $dny, true) || zavreno($p, $den)) continue;
    $uzaverka = mktime((int)($p['uzaverka'] ?? 18), 0, 0, (int)date('n', $den), (int)date('j', $den) - 1, (int)date('Y', $den));
    if ($ted >= $uzaverka) continue;
    $out[date('Y-m-d', $den)] = DNY_TYDNE[(int)date('w', $den)] . ' ' . date('j. n.', $den);
  }
  return $out;
}

// Adresa z registru adres (RÚIAN), kterou zákazník vybral v pokladně. Ověřená je jen tehdy, když ji předtím
// vrátil náš adresa.php (je v jeho mezipaměti); souřadnice se berou odtud, ne z prohlížeče.
// Vrací ['adresa', 'gps' => [lat, lon] | null], nebo null.
function adresa_z_registru(string $adresa): ?array {
  if ($adresa === '') return null;
  $nalezena = null;
  foreach (['adresy.json', 'adresy-naseptavac.json'] as $soubor) {
    foreach ((array)nacist_json($soubor, []) as $z) {
      foreach ((array)($z['kandidati'] ?? []) as $k) {
        if (!is_array($k) || ($k['adresa'] ?? null) !== $adresa) continue;
        $g = $k['gps'] ?? null;
        if (is_array($g) && count($g) === 2 && is_numeric($g[0]) && is_numeric($g[1])) return ['adresa' => $adresa, 'gps' => [(float)$g[0], (float)$g[1]]];
        $nalezena = ['adresa' => $adresa, 'gps' => null];
      }
    }
  }
  return $nalezena;
}

// Limit potvrzovacích e-mailů ze všech IP dohromady – e-shop nesmí posloužit k rozesílání e-mailů cizím lidem:
// nejvýš POTVRZENI_NA_ADRESU na jednu adresu za den ($klic = e-mail) a POTVRZENI_ZA_HODINU celkem ($klic = '*').
// Soubor je pojmenovaný jako u limit(), takže ho limit() sám uklidí.
function limit_potvrzeni(string $klic, int $max, int $sekund): bool {
  $f = @fopen(sys_get_temp_dir() . '/oh_' . ($klic === '*' ? 'potvrzeni-vse' : 'prijemce') . '_' . hash('sha256', mb_strtolower($klic)), 'c+');
  if (!$f) return true;
  flock($f, LOCK_EX);
  $casy = array_filter(array_map('intval', preg_split('/\s+/', (string)stream_get_contents($f), -1, PREG_SPLIT_NO_EMPTY)), fn($t) => $t > time() - $sekund);
  $ok = count($casy) < $max;
  if ($ok) {
    $casy[] = time();
    ftruncate($f, 0);
    rewind($f);
    fwrite($f, implode("\n", $casy));
  }
  flock($f, LOCK_UN);
  fclose($f);
  return $ok;
}

// QR Platba (SPD) na účet farmy – stejný formát jako v e-shopu (src/eshop/platba.js).
function spd_platba(int $castka, string $vs, string $zprava): string {
  $ascii = fn(string $s) => preg_replace('/[^\x20-\x7E]/', '', strtr($s, [
    'á' => 'a', 'č' => 'c', 'ď' => 'd', 'é' => 'e', 'ě' => 'e', 'í' => 'i', 'ň' => 'n', 'ó' => 'o', 'ř' => 'r', 'š' => 's', 'ť' => 't', 'ú' => 'u', 'ů' => 'u', 'ý' => 'y', 'ž' => 'z',
    'Á' => 'A', 'Č' => 'C', 'Ď' => 'D', 'É' => 'E', 'Ě' => 'E', 'Í' => 'I', 'Ň' => 'N', 'Ó' => 'O', 'Ř' => 'R', 'Š' => 'S', 'Ť' => 'T', 'Ú' => 'U', 'Ů' => 'U', 'Ý' => 'Y', 'Ž' => 'Z',
  ]));
  return implode('*', ['SPD*1.0', 'ACC:' . UCET['iban'] . '+GIBACZPX', 'AM:' . number_format($castka, 2, '.', ''), 'CC:CZK',
    "X-VS:$vs", 'RN:' . strtoupper($ascii(UCET['majitel'])), 'MSG:' . substr(str_replace('*', '', $ascii($zprava)), 0, 60)]);
}

// Proč server účtoval jinak, než ukázal e-shop: 'skupina' (ceny skupiny neověřené), 'cenik' (ceny se mezitím
// změnily nebo je upravil prohlížeč), null = souhlasí.
function zmena_ceny(array $o): ?string {
  return empty($o['kontrola_cen']) ? null : (!empty($o['skupina_neoverena']) ? 'skupina' : 'cenik');
}

// Odpověď k objednávce, která už je uložená (opakované odeslání téže objednávky).
function odpoved_ulozene(array $o): array {
  return ['ok' => true, 'ulozeno' => true, 'farma' => $o['email_farma'] ?? true, 'potvrzeni' => empty($o['potvrzeni_limit']),
    'cislo' => $o['cislo'], 'vs' => $o['vs'], 'celkem' => (int)($o['celkem'] ?? 0), 'castka' => (int)($o['castka'] ?? 0),
    'souhrn' => (string)($o['souhrn'] ?? ''), 'polozky' => $o['polozky'] ?? [], 'zmena_ceny' => zmena_ceny($o)];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') konec(200, ['ok' => true, 'mail' => function_exists('mail'), 'cenik' => cenik() !== null]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') konec(405, ['ok' => false]);
if ($origin !== '' && !in_array($origin, POVOLENE_ORIGINY, true)) konec(403, ['ok' => false]);
if (!limit('potvrzeni', 30, 3600)) konec(429, ['ok' => false, 'chyba' => 'limit']);
// Rozepsaná objednávka se dokončí, i kdyby zákazník mezitím zavřel stránku.
ignore_user_abort(true);

$d = json_decode(file_get_contents('php://input', false, null, 0, 200000), true);
if (!is_array($d)) konec(400, ['ok' => false, 'chyba' => 'neplatne']);

$email = text_pole($d['email'] ?? '', 254);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) konec(400, ['ok' => false, 'chyba' => 'email']);
$cislo = text_pole($d['cislo'] ?? '', 20);
if (!preg_match('/^OH-(\d{6})-(\d{3,4})$/', $cislo, $mc)) konec(400, ['ok' => false, 'chyba' => 'cislo']);
// Číslo nese datum objednávky. Jiné než dnešní (±1 den kvůli časovým pásmům) se nepřijme, takže nejde dopředu
// obsadit čísla, pod kterými budou objednávat jiní. Pokladna pak zkusí nové číslo s datem `dnes`.
$dnes = date('ymd');
if (!in_array($mc[1], [date('ymd', strtotime('-1 day')), $dnes, date('ymd', strtotime('+1 day'))], true)) {
  konec(409, ['ok' => false, 'ulozeno' => false, 'kolize' => true, 'dnes' => $dnes]);
}
$vs = $mc[1] . $mc[2];

$cenik = cenik();
$maKosik = is_array($d['kosik'] ?? null);
if (!$maKosik && $cenik) {
  // Stará pokladna (před nasazením) posílá jen hotové řádky s cenami – ty server nepřijme; pokladna pošle objednávku přes zálohu.
  zapsat_log("potvrzeni: $cislo nepřijata – stará verze pokladny bez košíku");
  konec(400, ['ok' => false, 'ulozeno' => false, 'chyba' => 'verze']);
}

$jmeno = text_pole($d['jmeno'] ?? '', 100);
$telefon = text_pole($d['telefon'] ?? '', 40);
$ico = preg_replace('/\D/', '', text_pole($d['ico'] ?? '', 12));
$rozvoz = !empty($d['rozvoz']);
$denKlient = text_pole($d['den'] ?? '', 40);
$adresa = $rozvoz ? text_pole($d['adresa'] ?? '', 200) : '';
$psc = $rozvoz ? text_pole($d['psc'] ?? '', 10) : '';
$mesto = $rozvoz ? text_pole($d['mesto'] ?? '', 60) : '';
$adresaKlient = $rozvoz ? text_pole($d['adresaOverena'] ?? '', 200) : '';
$platba = ($d['platba'] ?? '') === 'prevod' ? 'prevod' : 'prevzeti';
$poznamka = text_pole($d['poznamka'] ?? '', 1000, true);
$skupinaId = text_pole($d['skupina'] ?? '', 40);
// Součet z prohlížeče jen ke kontrole – před převodem na int omezený (1e300 by v PHP 8.5 hlásilo varování).
$klientCelkem = is_int($d['celkem'] ?? null) || is_float($d['celkem'] ?? null) ? (int)round(max(0, min(10000000, $d['celkem']))) : null;

$kosik = [];
if ($maKosik) {
  if (count($d['kosik']) > MAX_RADKU) konec(400, ['ok' => false, 'chyba' => 'kosik']);
  foreach ($d['kosik'] as $r) {
    $p = is_array($r) ? ($r['produkt'] ?? null) : null;
    $v = is_array($r) ? ($r['varianta'] ?? null) : null;
    $n = is_array($r) ? ($r['pocet'] ?? null) : null;
    if (!is_string($p) || !is_string($v) || !is_int($n) || $n < 1 || $n > 500 || $p === '' || strlen($p) > 100 || strlen($v) > 500) {
      konec(400, ['ok' => false, 'chyba' => 'kosik']);
    }
    $kosik[] = ['produkt' => $p, 'varianta' => $v, 'pocet' => $n];
  }
  if (!$kosik) konec(400, ['ok' => false, 'chyba' => 'kosik']);
}

// Otisk objednávky: stejné číslo se stejným obsahem = opakované odeslání (výpadek spojení), ne kolize.
$otisk = sha1((string)json_encode([mb_strtolower($email), $jmeno, $telefon, $ico, $rozvoz, $denKlient, $adresa, $psc, $mesto, $adresaKlient,
  $platba, $poznamka, $skupinaId, $kosik, $maKosik ? null : ($d['polozky'] ?? null)], JSON_UNESCAPED_UNICODE));
$existuje = nacist_json("objednavky/$vs.json");
if ($existuje) {
  if (($existuje['otisk'] ?? '') === $otisk) konec(200, odpoved_ulozene($existuje));
  konec(409, ['ok' => false, 'ulozeno' => false, 'kolize' => true, 'dnes' => $dnes]);
}

// ---------- skupina, položky a ceny ----------
[$skupina, $pozadovana] = skupina_objednavky($skupinaId);
$upozorneni = [];
$kontrola = null;
$bezCeny = false;
$mimo = [];
if ($cenik && $maKosik) {
  $radky = [];
  $celkem = 0;
  foreach ($kosik as $r) {
    $x = radek_objednavky($r, $cenik, $skupina, $pozadovana);
    if (!$x) {
      zapsat_log("potvrzeni: $cislo nepřijata – položka mimo ceník (" . mb_substr($r['produkt'] . '|' . $r['varianta'], 0, 80) . ')');
      konec(400, ['ok' => false, 'ulozeno' => false, 'chyba' => 'cenik']);
    }
    $radky[] = $x['text'];
    if ($x['cena'] === null) $bezCeny = true;
    else $celkem += $x['cena'];
    if (!empty($x['mimo'])) $mimo[] = preg_replace('/\s+–\s+[^–]*$/u', '', $x['text']);
  }
  // Prohlížeč počítal jinak (upravená stránka, neověřená skupina): objednávka platí za ceny z ceníku.
  if ($klientCelkem !== null && $klientCelkem !== $celkem) {
    $kontrola = ['klient' => $klientCelkem, 'cenik' => $celkem];
    $upozorneni[] = 'Cena nesouhlasí s ceníkem: v e-shopu ' . kc($klientCelkem) . ', podle ceníku ' . kc($celkem) . ' – platí ' . kc($celkem) . '.';
  }
  // Mimo sezónu / nabídku (stránka otevřená dlouho, ručně poslaný košík): objednávka platí, farma jen ověří.
  if ($mimo) $upozorneni[] = 'Mimo sezónu nebo mimo aktuální nabídku – ověřit, jestli je k dispozici: ' . implode('; ', $mimo) . '.';
} else {
  // Na serveru chybí ceník (web sestavený starší verzí): řádky a součet z prohlížeče jako dřív.
  zapsat_log("potvrzeni: $cislo – chybí _cenik.php, ceny z prohlížeče nejde ověřit");
  $radky = array_values(array_filter(array_map(fn($r) => text_pole($r, 200), array_slice(is_array($d['polozky'] ?? null) ? $d['polozky'] : [], 0, MAX_RADKU)), fn($r) => $r !== ''));
  if (!$radky) konec(400, ['ok' => false, 'chyba' => 'kosik']);
  $celkem = max(0, min(200000, (int)$klientCelkem));
  $upozorneni[] = 'Ceny nešlo ověřit (na webu chybí ceník) – zkontrolujte je.';
}
if ($pozadovana && !$skupina) {
  $upozorneni[] = "Skupinu {$pozadovana['nazev']} se nepodařilo ověřit (zákazník není přihlášený člen)" . ($cenik ? ' – účtováno za běžné ceny.' : '.');
}

// ---------- adresa ----------
$adresaOverena = '';
$gps = null;
$pevna = false;
if ($skupina && !empty($skupina['adresa'])) {
  // Pevná doručovací adresa skupiny (jen pro ověřeného člena).
  $rozvoz = $pevna = true;
  $adresaOverena = $skupina['adresa'];
  $gps = is_array($skupina['gps'] ?? null) && count($skupina['gps']) === 2 ? [(float)$skupina['gps'][0], (float)$skupina['gps'][1]] : null;
  if ($adresa === '') $adresa = $skupina['adresa'];
} elseif ($rozvoz && ($a = adresa_z_registru($adresaKlient))) {
  $adresaOverena = $a['adresa'];
  $gps = $a['gps'];
}
$adresaDovozu = $adresaOverena !== '' ? $adresaOverena : $adresa . ', ' . trim("$psc $mesto");

// ---------- termín ----------
$datum = datum_terminu($denKlient);
$pravidla = is_array($cenik['terminy'] ?? null) ? $cenik['terminy'] : null;
$poUzaverce = false;
if ($pravidla) {
  $nabidka = nabizene_dny($pravidla, $rozvoz, time());
  $predUzaverkou = isset($nabidka[$datum]) ? [] : nabizene_dny($pravidla, $rozvoz, time() - ODKLAD_UZAVERKY);
  if (isset($nabidka[$datum])) $den = $nabidka[$datum];
  elseif (isset($predUzaverkou[$datum])) { $den = $predUzaverkou[$datum]; $poUzaverce = true; }
  else konec(409, ['ok' => false, 'ulozeno' => false, 'chyba' => 'termin', 'terminy' => array_values($nabidka)]);
} else {
  $den = $denKlient;
  if ($datum === '' || $datum <= date('Y-m-d')) $upozorneni[] = "Termín „{$denKlient}“ už nejde stihnout – domluvit se zákazníkem jiný den.";
}
if ($poUzaverce) $upozorneni[] = 'Objednáno po uzávěrce (' . date('j. n. G:i') . ') – stihnout, nebo domluvit jiný den.';
$uzaverka = (int)($pravidla['uzaverka'] ?? 18);

// ---------- uložení ----------
$castka = $platba === 'prevod' ? $celkem : 0;
// Souhrn objednávky; $adresa = doručovací adresa (v potvrzení zákazníkovi bez odkazů, viz bez_odkazu()).
$sestavitSouhrn = fn(string $adresa): string => implode("\n", array_merge($radky, [
  '',
  'Celkem: ' . kc($celkem) . ($bezCeny ? ' + položky s cenou na dotaz' : '') . ($rozvoz ? ' (doprava v ceně)' : ''),
  $rozvoz ? "Dovoz až domů: $den dopoledne, $adresa" : "Osobní odběr: $den, " . PRODAVAJICI['adresa'],
  $platba === 'prevod' ? "Platba: převodem předem, VS $vs" : 'Platba: při převzetí',
], $skupina ? ["Skupina: {$skupina['nazev']} (zvýhodněné ceny)"] : []));
$souhrn = $sestavitSouhrn($adresaDovozu);

// Potvrzení zákazníkovi – nejvýš POTVRZENI_NA_ADRESU za den a POTVRZENI_ZA_HODINU celkem;
// objednávka se uloží a farmě ohlásí vždy.
$naAdresu = limit_potvrzeni($email, POTVRZENI_NA_ADRESU, 86400);
$posilat = $naAdresu && limit_potvrzeni('*', POTVRZENI_ZA_HODINU, 3600);
if (!$naAdresu) zapsat_log("potvrzeni: $cislo – potvrzení neodesláno (limit na adresu " . maskovat_prijemce($email) . ')');
elseif (!$posilat) zapsat_log("potvrzeni: $cislo – potvrzení neodesláno (celkový limit " . POTVRZENI_ZA_HODINU . ' za hodinu)');

$zaznam = [
  'cislo' => $cislo, 'vs' => $vs, 'castka' => $castka, 'email' => $email, 'jmeno' => $jmeno,
  'souhrn' => $souhrn, 'vytvoreno' => date('c'), 'zaplaceno' => 0, 'platby' => [],
  'rozvoz' => $rozvoz, 'den' => $den, 'datum' => $datum, 'telefon' => $telefon,
  'adresa' => $adresa, 'psc' => $psc, 'mesto' => $mesto, 'ico' => $ico,
  'adresa_overena' => $adresaOverena, 'gps_overena' => $gps,
  'polozky' => $radky, 'celkem' => $celkem, 'platba' => $platba, 'poznamka' => $poznamka,
  'skupina' => $skupina['nazev'] ?? '',
  'doruceno' => false,
  // Jak objednávka vznikla: košík (produkt, varianta, počet), zda ceny spočítal server, otisk pro opakované odeslání.
  'kosik' => $kosik, 'ceny_overeny' => (bool)($cenik && $maKosik), 'otisk' => $otisk,
];
if ($kontrola) $zaznam['kontrola_cen'] = $kontrola;
if ($pozadovana && !$skupina) $zaznam['skupina_neoverena'] = $pozadovana['nazev'];
if ($poUzaverce) $zaznam['po_uzaverce'] = true;
if (!$posilat) $zaznam['potvrzeni_limit'] = true;
if ($upozorneni) $zaznam['upozorneni'] = $upozorneni;

// Číslo se zabere pod stejným zámkem, pod kterým se objednávky mění – dvě objednávky ho nedostanou obě.
$zamek = fopen(data_cesta('objednavky.lock'), 'c');
flock($zamek, LOCK_EX);
$existuje = nacist_json("objednavky/$vs.json");
$ulozeno = $existuje ? false : ulozit_json("objednavky/$vs.json", $zaznam);
flock($zamek, LOCK_UN);
fclose($zamek);
// Uložit nešlo (plný disk…): 5xx – pokladna pak objednávku pošle záložní cestou, ať se neztratí.
if (!$existuje && !$ulozeno) konec(500, ['ok' => false, 'ulozeno' => false, 'chyba' => 'ulozeni']);
if ($existuje) {
  if (($existuje['otisk'] ?? '') === $otisk) konec(200, odpoved_ulozene($existuje));
  konec(409, ['ok' => false, 'ulozeno' => false, 'kolize' => true, 'dnes' => $dnes]);
}

// ---------- e-mail farmě ----------
$varovani = array_merge($kontrola ? ['NESEDÍ CENA'] : [], $pozadovana && !$skupina ? ['SKUPINA NEOVĚŘENA'] : [],
  $poUzaverce ? ['PO UZÁVĚRCE'] : [], !$cenik ? ['CENY NEOVĚŘENY'] : [], $mimo ? ['MIMO NABÍDKU'] : []);
$radkyFarma = [
  'Objednávka' => $cislo,
  'Termín' => ($rozvoz ? 'Rozvoz' : 'Osobní odběr') . ' – ' . $den,
  'Jméno' => $jmeno . ($ico !== '' ? " (IČO $ico)" : ''),
  'Telefon' => $telefon,
  'E-mail' => $email,
  'Adresa' => !$rozvoz ? '— (osobní odběr)'
    : ($adresaOverena !== '' ? $adresaOverena . ($pevna ? ' (pevná adresa skupiny)' : ' (ověřeno v registru adres)') : "$adresaDovozu – NEOVĚŘENO, zkontrolovat"),
  'Položky' => implode("\n", $radky),
  'Celkem' => kc($celkem) . ($bezCeny ? ' + položky s cenou na dotaz' : ''),
  'Platba' => $platba === 'prevod' ? "PŘEVODEM PŘEDEM – VS $vs – označí se sama po příchodu platby" : 'při převzetí',
  'Poznámka' => $poznamka !== '' ? $poznamka : '—',
];
if ($skupina) $radkyFarma['Skupina'] = $skupina['nazev'] . ' (ověřený člen)';
if ($upozorneni) $radkyFarma['⚠ Zkontrolovat'] = implode("\n", $upozorneni);
if (!$posilat) $radkyFarma['Potvrzení zákazníkovi'] = 'NEODESLÁNO – ' . ($naAdresu
  ? 'za poslední hodinu už odešlo ' . POTVRZENI_ZA_HODINU . ' potvrzení (ochrana proti zneužití e-shopu)'
  : 'na tuto adresu už dnes odešlo ' . POTVRZENI_NA_ADRESU . ' potvrzení');
$predmetFarma = ($varovani ? '⚠ ' . implode(', ', $varovani) . ' | ' : '')
  . ($rozvoz ? 'ROZVOZ' : 'ODBĚR') . " $den | $cislo | $jmeno | " . kc($celkem) . ($skupina ? " | skupina {$skupina['nazev']}" : '');
$textFarma = ''; $htmlFarma = '<table style="border-collapse:collapse;font-size:14px">';
foreach ($radkyFarma as $k => $v) {
  $textFarma .= "$k: $v\n";
  $barva = str_starts_with($k, '⚠') ? '#8c2f2b' : '#6b6f66';
  $htmlFarma .= '<tr><td style="padding:6px 16px 6px 0;color:' . $barva . ';vertical-align:top">' . h($k) . '</td><td style="padding:6px 0">' . nl2br(h($v)) . '</td></tr>';
}
$htmlFarma .= '</table><p style="margin:16px 0 0"><a href="' . WEB . '/api/rozvoz.php" style="color:#2f5a33">Otevřít přehled objednávek</a></p>';
$farma = poslat_email(ODESILATEL, $predmetFarma, $textFarma . "\nPřehled: " . WEB . "/api/rozvoz.php\n", email_html("Nová objednávka $cislo", $htmlFarma), null, false,
  '=?UTF-8?B?' . base64_encode($jmeno) . '?= <' . $email . '>');
zmenit_objednavku($vs, function (array &$o) use ($farma) { $o['email_farma'] = $farma; });

// Objednávka je uložená a farma o ní ví – prohlížeč dostane odpověď hned, potvrzení zákazníkovi se pošle potom.
odpovedet_predem(['ok' => true, 'ulozeno' => true, 'farma' => $farma, 'potvrzeni' => $posilat,
  'cislo' => $cislo, 'vs' => $vs, 'celkem' => $celkem, 'castka' => $castka, 'souhrn' => $souhrn, 'polozky' => $radky,
  'zmena_ceny' => zmena_ceny($zaznam)]);
if (!$posilat) exit;
@set_time_limit(120);

// ---------- potvrzení zákazníkovi ----------
// Sestavené jen z údajů, které server ověřil nebo spočítal. Z textu od zákazníka jen jméno, adresa
// a jeho poznámka (zkrácená, jasně označená a bez odkazů – potvrzení jde na adresu, kterou kdokoli zadá).
$jmeno = bez_odkazu($jmeno);
$souhrn = $sestavitSouhrn(bez_odkazu($adresaDovozu));
$poznamka = bez_odkazu($poznamka);
$odkazPlatby = WEB . '/eshop.html?' . http_build_query(['platba' => $cislo, 'castka' => $castka]);
$qrPng = null;
if ($castka > 0) {
  try {
    $qrPng = qr_png(spd_platba($castka, $vs, "Objednavka $cislo"));
  } catch (Throwable $e) {
    zapsat_log("potvrzeni: $cislo – QR platbu se nepodařilo vytvořit (" . $e->getMessage() . ')');
  }
}
$vasePoznamka = mb_strlen($poznamka) > 300 ? rtrim(mb_substr($poznamka, 0, 300)) . '…' : $poznamka;
$dovozInfo = !$rozvoz || $pevna ? ''
  : ($adresaOverena === '' ? 'Adresu se nepodařilo ověřit v registru adres – kdyby s ní byl problém, zavoláme vám.'
    : (!str_contains($adresaOverena, 'České Budějovice') ? 'Mimo České Budějovice dovážíme po domluvě – termín dovozu vám ještě potvrdíme telefonem.' : ''));
// Částka je jiná, než ukázal e-shop – zákazník se dozví proč (název skupiny jen ze _skupiny.php, ne z prohlížeče).
$cenyInfo = match (zmena_ceny($zaznam)) {
  'skupina' => 'Zvýhodněné ceny skupiny' . ($pozadovana['id'] !== '' ? " {$pozadovana['nazev']}" : '') . ' jsme nemohli použít – nepodařilo se ověřit, '
    . 'že jste přihlášený člen skupiny. Objednávka je proto spočítaná za běžné ceny. Kdyby to byl omyl, odpovězte prosím na tento e-mail.',
  'cenik' => 'Ceny v e-shopu se mezitím změnily – objednávka je spočítaná podle aktuálního ceníku. Kdyby vám to nevyhovovalo, odpovězte prosím na tento e-mail.',
  default => '',
};
$zmena = "Změnu nebo zrušení nám prosím napište nejpozději den před termínem do $uzaverka:00 – stačí odpovědět na tento e-mail.";
// Obchodní podmínky v trvalé podobě (§ 1824 OZ): odkaz a to nejdůležitější z nich.
$podminky = WEB . '/obchodni-podminky.html';
$pravidla = 'Čerstvé ovoce a bedýnky po převzetí vrátit nejde (§ 1837 písm. d) občanského zákoníku), nenačatý mošt můžete vrátit do 14 dnů od převzetí. '
  . 'Vadné zboží reklamujte co nejdříve – telefonem na ' . PRODAVAJICI['telefon'] . ' nebo odpovědí na tento e-mail.';

$text = "Dobrý den" . ($jmeno !== '' ? ", $jmeno" : '') . ",\n\n"
  . "děkujeme – vaše objednávka $cislo je přijatá a platí. Nic dalšího potvrzovat nemusíte.\n\n"
  . ($cenyInfo !== '' ? "$cenyInfo\n\n" : '')
  . "$souhrn\n\n"
  . ($vasePoznamka !== '' ? "Vaše poznámka k objednávce: $vasePoznamka\n\n" : '')
  . ($dovozInfo !== '' ? "$dovozInfo\n\n" : '');
if ($castka > 0) {
  $text .= "PLATBA PŘEVODEM\nČástka: " . kc($castka) . "\nČíslo účtu: " . UCET['cislo'] . "\nVariabilní symbol: $vs\n"
    . "IBAN: " . UCET['iban'] . "\nQR kód k platbě: $odkazPlatby\n"
    . "Zaplaťte prosím nejpozději den před termínem. Jakmile platba dorazí, pošleme vám potvrzení.\n\n";
}
$text .= "Pokud by něco z objednávky nebylo k dispozici, ozveme se vám. $zmena\n\n"
  . "Obchodní podmínky (odstoupení od smlouvy, reklamace): $podminky\n$pravidla\n\n"
  . JMENO_ODESILATELE . ', ' . PRODAVAJICI['adresa'] . "\n" . WEB . "\n";

$radek = fn($k, $v) => '<tr><td style="padding:6px 16px 6px 0;color:#6b6f66">' . h($k) . '</td><td style="padding:6px 0;font-weight:600">' . h($v) . '</td></tr>';
$ramecek = 'background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:18px 20px;margin:0 0 18px';
$obsah = '<p style="margin:0 0 18px;line-height:1.5">Dobrý den' . ($jmeno !== '' ? ', ' . h($jmeno) : '') . ',<br>děkujeme – objednávka platí, nic dalšího potvrzovat nemusíte.</p>'
  . ($cenyInfo !== '' ? '<p style="margin:0 0 18px;font-size:14px;line-height:1.5"><b>' . h($cenyInfo) . '</b></p>' : '')
  . '<div style="' . $ramecek . ';line-height:1.55;font-size:14px">' . nl2br(h($souhrn)) . '</div>'
  . ($vasePoznamka !== '' ? '<p style="margin:0 0 18px;font-size:14px;line-height:1.5"><span style="color:#6b6f66">Vaše poznámka k objednávce:</span><br>' . nl2br(h($vasePoznamka)) . '</p>' : '')
  . ($dovozInfo !== '' ? '<p style="margin:0 0 18px;font-size:14px;line-height:1.5"><b>' . h($dovozInfo) . '</b></p>' : '');
if ($castka > 0) {
  $obsah .= '<div style="' . $ramecek . '">'
    . '<h2 style="font-family:Georgia,serif;font-weight:normal;font-size:20px;margin:0 0 12px">Platba převodem</h2>'
    . ($qrPng ? '<img src="cid:qrplatba" width="200" height="200" alt="QR Platba" style="display:block;border:1px solid #dfd7c9;margin:0 0 12px">' : '')
    . '<table style="font-size:14px;border-collapse:collapse">'
    . $radek('Částka', kc($castka)) . $radek('Číslo účtu', UCET['cislo']) . $radek('Variabilní symbol', $vs)
    . $radek('IBAN', UCET['iban']) . $radek('Příjemce', UCET['majitel'])
    . '</table>'
    . '<p style="font-size:13px;color:#6b6f66;margin:12px 0 0">' . ($qrPng ? 'Naskenujte QR kód v aplikaci banky. ' : '')
    . 'Zaplaťte prosím nejpozději den před termínem – jakmile platba dorazí, pošleme vám potvrzení. '
    . '<a href="' . h($odkazPlatby) . '" style="color:#2f5a33">Otevřít platbu na webu</a></p></div>';
}
$obsah .= '<p style="font-size:13px;color:#6b6f66;line-height:1.5;margin:0">Pokud by něco nebylo k dispozici, ozveme se vám. ' . h($zmena) . '</p>'
  . '<p style="font-size:13px;color:#6b6f66;line-height:1.5;margin:12px 0 0"><a href="' . h($podminky) . '" style="color:#2f5a33">Obchodní podmínky</a>'
  . ' (odstoupení od smlouvy, reklamace). ' . h($pravidla) . '</p>';

// Kopie potvrzení farmě se neposílá – farma dostala vlastní e-mail s objednávkou.
if (poslat_email($email, "Potvrzení objednávky $cislo – Ovocnářství Holub", $text, email_html("Objednávka $cislo je přijatá", $obsah), $qrPng, false)) {
  zmenit_objednavku($vs, function (array &$o) { $o['email_potvrzeni'] = date('c'); });
}
exit;
