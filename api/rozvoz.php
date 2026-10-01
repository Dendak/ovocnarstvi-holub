<?php
// Přehled objednávek pro farmu: po dnech, co naložit, mapa s trasou rozvozu, stav plateb.
// Přihlášení odkazem poslaným e-mailem na adresu @ovoce-holub.cz; telefon si ho pamatuje (rok, obnovuje se).
require __DIR__ . '/_spolecne.php';
require __DIR__ . '/_skupiny.php';
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Referrer-Policy: strict-origin-when-cross-origin');

const FARMA_GPS = [49.0826258, 14.1703712]; // statek – stejné souřadnice jako ve strukturovaných datech webu
// Kontrolní součty (SRI) Leafletu 1.9.4 – soubory leaflet.js a leaflet.css z balíčku leaflet@1.9.4 (stejné jako na cdnjs).
// Při změně verze Leafletu je nutné změnit i součty, jinak se mapa nenačte.
const LEAFLET_JS_SRI = 'sha512-BwHfrr4c9kmRkLw6iXFdzcdWV/PGkVgiIyIWLLlTSXzWQzxuSg4DiQUCpauz/EWjgk5TYQqX/kvn9pG1NpYfqg==';
const LEAFLET_CSS_SRI = 'sha512-Zcn6bjR/8RZbLEpLIeOwNtzREBAJnUKESxces60Mpoj+2okopSAcSUIUOseddDm0cxnGQzxIR7vJgsLZbdLE3w==';

function povoleny_email(string $e): bool { return (bool)preg_match('/^[a-z0-9._%+-]+@ovoce-holub\.cz$/i', $e); }

// Formulář odeslaný z cizí stránky se nezpracuje (k cookie se SameSite=Lax druhá pojistka).
if ($_SERVER['REQUEST_METHOD'] === 'POST' && cizi_puvod()) { http_response_code(403); exit('Formulář odeslaný z cizí stránky.'); }
try {
  $n = nastaveni();
} catch (RuntimeException $e) {
  http_response_code(500);
  exit('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><p style="font:16px Arial;padding:40px 16px">'
    . 'Nastavení webu na hostingu je poškozené. Nic neměňte a ozvěte se prosím správci webu.</p>');
}
$chyba = ''; $info = '';
$akce = is_string($_POST['akce'] ?? null) ? $_POST['akce'] : '';
if ($akce === 'prihlasit-heslem') {
  $heslo = retezec($_POST['heslo'] ?? '');
  // Omezení pokusů: na jednu adresu i celkově (hádání hesla z více adres).
  if (!limit('rozvoz-heslo', 10, 3600) || !limit('rozvoz-heslo-vse', 40, 3600, true)) $chyba = 'Příliš mnoho pokusů, zkuste to za hodinu.';
  elseif (!empty($n['heslo_farmy']) && $heslo !== '' && password_verify($heslo, $n['heslo_farmy'])) {
    prihlasit_zarizeni();
    header('Location: rozvoz.php'); exit;
  } else $chyba = 'Špatné heslo.';
}
if ($akce === 'poslat-odkaz') {
  $email = strtolower(trim(retezec($_POST['email'] ?? '')));
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
  $token = retezec($_POST['t'] ?? $_GET['t'] ?? '');
  $tokeny = nacist_json('prihlaseni.json', []);
  $h = hash('sha256', $token);
  if (($tokeny[$h] ?? 0) <= time()) $chyba = 'Odkaz pro přihlášení už neplatí. Nechte si poslat nový.';
  elseif ($akce === 'potvrdit') {
    // Potvrzení tlačítkem: e-mailové filtry odkazy předem otevírají a jinak by je „spotřebovaly“.
    unset($tokeny[$h]);
    ulozit_json('prihlaseni.json', $tokeny);
    prihlasit_zarizeni();
    header('Location: rozvoz.php'); exit;
  } else {
    $potvrdit = $token;
  }
}
// Odhlášení jen tlačítkem (POST) – obyčejný odkaz z cizí stránky telefon neodhlásí.
if ($akce === 'odhlasit' && $_SERVER['REQUEST_METHOD'] === 'POST') {
  odhlasit_zarizeni();
  header('Location: rozvoz.php', true, 303); exit;
}

function stranka(string $titulek, string $obsah, string $hlava = ''): void {
  // Bez „apple-mobile-web-app-capable“: ikona na ploše iPhonu by běžela jako samostatná aplikace s vlastními cookies
  // a odkaz pro přihlášení z e-mailu (otevře se v Safari) by ji nikdy nepřihlásil.
  echo '<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    . '<meta name="robots" content="noindex"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><meta name="theme-color" content="#17241a">'
    . '<title>' . h($titulek) . '</title>' . $hlava . '<style>
:root{--paper:#f8f5ef;--line:#dfd7c9;--ink:#1d231c;--muted:#6b6f66;--leaf:#2f5a33;--berry:#8c2f2b;--amber:#7a4f00}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.45 Arial,Helvetica,sans-serif}
header{background:#17241a;color:#fff;padding:0 6px 0 16px;display:flex;justify-content:space-between;align-items:center;gap:8px;position:sticky;top:0;z-index:1000}
header h1{font:normal 19px Georgia,serif;white-space:nowrap}header nav{display:flex;flex-wrap:wrap;justify-content:flex-end}
header nav a{display:inline-block;padding:11px 7px;line-height:22px;color:#cfe0c9;font-size:15px}main{max-width:760px;margin:0 auto;padding:16px}
h1{font:normal 24px Georgia,serif;margin:0}h2{font:normal 21px Georgia,serif;margin:24px 0 10px}h3{font-size:16px;margin:14px 0 2px}
.dny{position:relative;display:flex;gap:8px;overflow-x:auto;padding-bottom:6px}.dny a{flex:none;padding:10px 14px;line-height:22px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);text-decoration:none;font-size:15px}
.dny a.akt{background:var(--leaf);border-color:var(--leaf);color:#fff}.dny small{display:inline-block;min-width:22px;margin-left:4px;padding:0 6px;border-radius:11px;background:#efe9dd;color:var(--ink);font-size:13px;text-align:center}.dny a.akt small{background:#fff;color:var(--leaf)}.dny a.pozor{border:2px solid var(--berry);color:var(--berry);font-weight:bold;padding:9px 13px}
.jiny-den{display:flex;gap:8px;align-items:center;margin:8px 0 0}.jiny-den label{white-space:nowrap}.jiny-den select{flex:1 1 auto;min-width:0}select{font:inherit;font-size:16px;min-height:44px;padding:8px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);max-width:100%}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:10px 0}
.obj{position:relative;scroll-margin-top:76px}.obj:target{box-shadow:0 0 0 3px #d9b64a}
.obj.hotovo{background:#f1f6ef;border-color:#b7cdb0}.obj.zrusena{background:#f2f1ee;border-style:dashed;border-color:#b9b4aa}.obj.zrusena ul{text-decoration:line-through}
.cislo{display:inline-grid;place-items:center;min-width:28px;height:28px;padding:0 6px;border-radius:14px;background:var(--leaf);color:#fff;font-weight:bold;font-size:14px;margin-right:8px}.cislo.hotova{background:#6b6f66}
.jm{font-weight:bold;font-size:17px}.muted{color:var(--muted);font-size:14px}ul{margin:8px 0;padding-left:20px}
.stitek{display:inline-block;font-size:13px;font-weight:bold;padding:3px 8px;border-radius:6px;margin:6px 6px 0 0}
.ok{background:#e3efe0;color:var(--leaf)}.ceka{background:#f6e2df;color:var(--berry)}.hot{background:#f5ead2;color:var(--amber)}.zrus{background:#d9d6d0;color:var(--ink)}
.akce{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.akce a,.akce button,.btn{display:inline-block;font:inherit;font-size:15px;line-height:22px;padding:10px 14px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--ink);text-decoration:none;cursor:pointer;text-align:center}
.btn.hl,.akce .hl{background:var(--leaf);border-color:var(--leaf);color:#fff}form{display:inline}
a.tel,a.adr,a.odk{display:inline-block;padding:11px 0;line-height:22px}
table{width:100%;border-collapse:collapse;font-size:15px}td{padding:6px 0;border-bottom:1px solid var(--line);vertical-align:top}td.r{text-align:right;font-weight:bold;white-space:nowrap;padding-left:10px}tr.soucet td{border-bottom:0;color:var(--muted)}
#mapa{height:340px;border-radius:10px;border:1px solid var(--line);margin:10px 0}.leaflet-popup-content p{margin:8px 0 0}
input[type=password]{width:100%;padding:12px;border:1px solid var(--line);border-radius:8px;font-size:16px}
.err{color:var(--berry);font-weight:bold}
.akce a.waze{background:#33ccff;border-color:#33ccff;color:#0b2530;font-weight:bold}
details.dor{flex-basis:100%}details.dor:not([open]){flex-basis:auto}details summary{list-style:none}details summary::-webkit-details-marker{display:none}details.dor summary{display:inline-block}.volby{margin:8px 0 0}button.odkaz{background:none;border:0;padding:11px 4px;margin:0;color:#a33;text-decoration:underline;font:inherit;line-height:22px;cursor:pointer;width:auto}.zapl{display:flex;gap:10px;align-items:center;min-height:44px;margin:0 0 12px;font-size:15px;cursor:pointer}.zapl input{width:22px;height:22px;accent-color:var(--leaf)}.volby p{margin:0 0 8px;font-weight:bold}.volby .akce{margin-top:0}
details.qr,details.upravit{margin-top:10px}details.qr summary,details.upravit summary{display:inline-block}
.radek{display:flex;gap:10px;align-items:center;margin:0 0 8px;font-size:15px}.radek input{width:76px;flex:none;padding:10px;font:inherit;font-size:16px;border:1px solid var(--line);border-radius:8px}
details.storno{display:inline}details.storno summary{display:inline-block;padding:11px 4px;line-height:22px;color:#a33;text-decoration:underline;cursor:pointer}
details.storno form{display:flex;gap:6px;margin-top:6px}details.storno input{flex:1;min-width:0;padding:10px;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:16px}
.pozor{border-color:var(--berry);background:#fbeeec}.pozor p{margin:0 0 6px}.nevyrizene .btn{margin:8px 8px 0 0;border-color:var(--berry);color:var(--berry);font-weight:bold}
.pata{margin-top:32px;padding-top:12px;border-top:1px solid var(--line)}.pata .btn{margin-top:4px}
@media (max-width:370px){header{padding-left:10px}header h1{font-size:17px!important}header nav a{padding:11px 5px;font-size:14px}}
</style></head><body>' . $obsah
    // Dvojí ťuknutí na tlačítko odešle formulář jen jednou (hodnota tlačítka se přitom zachová);
    // po 8 s jde odeslat znovu, kdyby se na slabém signálu nic nestalo.
    . '<script>document.addEventListener("submit",e=>{if(e.defaultPrevented)return;const f=e.target;if(f.dataset.odeslano){e.preventDefault();return}f.dataset.odeslano=1;setTimeout(()=>delete f.dataset.odeslano,8000)});'
    . 'addEventListener("pageshow",()=>document.querySelectorAll("form").forEach(f=>delete f.dataset.odeslano));</script>'
    . '</body></html>';
  exit;
}

// Záhlaví přehledu: nadpis a odkazy (dost velké na ťuknutí). Odhlášení je až v patičce, ať se netrefí omylem.
function hlavicka(string $nadpis, array $odkazy): string {
  $s = '<header><h1 style="font-size:19px">' . h($nadpis) . '</h1><nav>';
  foreach ($odkazy as $adresa => $text) $s .= '<a href="' . h($adresa) . '">' . h($text) . '</a>';
  return $s . '</nav></header>';
}
function paticka(): string {
  return '<footer class="pata"><p class="muted">Tento telefon zůstává přihlášený – přihlášení se při každém otevření prodlouží o rok, odhlašovat se nemusíte.</p>'
    . '<form method="post" action="rozvoz.php" onsubmit="return confirm(' . h(json_encode('Opravdu odhlásit tento telefon? Pro nové přihlášení si pak budete muset nechat poslat odkaz e-mailem.', JSON_UNESCAPED_UNICODE)) . ')">'
    . '<input type="hidden" name="akce" value="odhlasit"><button class="btn">Odhlásit tento telefon</button></form></footer>';
}

// Řádek objednávky, u kterého jde při předání snížit množství (cena se přepočítá poměrem):
// „5 kg Topaz (Jablka) – 200 Kč“, „2× 5 l Mošt Jablko (Mošty) – 320 Kč“, „2× Bedýnka 3 kg: … – 200 Kč“.
function upravitelny_radek(string $r): ?array {
  if (!preg_match('/^(\d+)(\s*kg\s+|×\s*)(.+?)\s+–\s+([\d\s]+)\s*Kč\s*$/u', $r, $m) || (int)$m[1] < 1) return null;
  return ['mn' => (int)$m[1], 'jed' => $m[2], 'popis' => $m[3], 'cena' => (int)preg_replace('/\D/', '', $m[4])];
}

// Řetězec QR Platby na zbývající částku (stejný formát jako na webu).
function spd_objednavky(array $o): string {
  return implode('*', ['SPD*1.0', 'ACC:' . UCET['iban'] . '+GIBACZPX', 'AM:' . number_format(cil_platby($o) - (float)($o['zaplaceno'] ?? 0), 2, '.', ''),
    'CC:CZK', 'X-VS:' . $o['vs'], 'RN:PAVEL HOLUB', 'MSG:Objednavka ' . $o['cislo']]);
}

if (!prihlasen()) {
  $formular = isset($potvrdit)
    ? '<form method="post" class="box" style="display:block"><input type="hidden" name="akce" value="potvrdit"><input type="hidden" name="t" value="' . h($potvrdit) . '">'
      . '<p>Přihlásit tento telefon / počítač k přehledu objednávek?</p><button class="btn hl" style="width:100%">Přihlásit</button></form>'
    : (!empty($n['heslo_farmy'])
      ? '<form method="post" class="box" style="display:block"><input type="hidden" name="akce" value="prihlasit-heslem">'
        . '<label for="heslo" class="muted">Heslo</label>'
        . '<input type="password" id="heslo" name="heslo" autocomplete="current-password" required autofocus style="width:100%;padding:12px;border:1px solid var(--line);border-radius:8px;font-size:16px;margin-top:6px">'
        . '<button class="btn hl" style="margin-top:12px;width:100%">Přihlásit</button></form>'
        . '<details class="box" style="display:block"><summary class="muted" style="cursor:pointer">Zapomenuté heslo? Poslat odkaz e-mailem</summary>'
      : '')
    . '<form method="post"' . (!empty($n['heslo_farmy']) ? ' style="margin-top:12px"' : ' class="box" style="display:block"') . '><input type="hidden" name="akce" value="poslat-odkaz">'
      . '<label for="email" class="muted">Váš e-mail @ovoce-holub.cz</label>'
      . '<input type="email" id="email" name="email" autocomplete="email" required placeholder="pavel@ovoce-holub.cz" style="width:100%;padding:12px;border:1px solid var(--line);border-radius:8px;font-size:16px;margin-top:6px">'
      . '<button class="btn' . (!empty($n['heslo_farmy']) ? '' : ' hl') . '" style="margin-top:12px;width:100%">Poslat odkaz pro přihlášení</button></form>'
    . (!empty($n['heslo_farmy']) ? '</details>' : '');
  stranka('Objednávky – přihlášení', '<main style="max-width:420px;padding-top:48px"><h1>Objednávky a rozvoz</h1>'
    . '<p class="muted">Přihlášení stačí jednou – zařízení si ho pamatuje.</p>'
    . ($chyba ? '<p class="err">' . h($chyba) . '</p>' : '') . ($info ? '<p class="box">' . h($info) . '</p>' : '')
    . $formular
    . (isset($potvrdit) ? '' : '<p class="muted">Nechodí e-mail s odkazem (např. po změně hesla ke schránce)? <a class="odk" href="nastaveni.php">Přihlásit se heslem ke schránce ' . h(ODESILATEL) . '</a></p>')
    // Ikona na ploše spuštěná jako samostatná aplikace má vlastní cookies – odkaz z e-mailu se otevře v prohlížeči, ne v ní.
    . '<p class="box pozor" id="samostatne" hidden>Tuto ikonu na ploše nejde přihlásit odkazem z e-mailu – odkaz se otevře v prohlížeči (Safari / Chrome), ne v ní. '
    . 'Používejte přehled přímo v prohlížeči, nebo ikonu smažte a po přihlášení ji přidejte znovu z prohlížeče (u iPhonu s vypnutým „Otevřít jako webovou aplikaci“).</p>'
    . '<script>if(navigator.standalone||matchMedia("(display-mode: standalone)").matches)document.getElementById("samostatne").hidden=false</script>'
    . '</main>');
}
// ---------- odhlášení všech ostatních zařízení (ztracený telefon); toto zařízení zůstane přihlášené ----------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $akce === 'odhlasit-vsude') {
  odhlasit_vsechna_zarizeni();
  prihlasit_zarizeni();
  header('Location: rozvoz.php?hlaseni=odhlaseno'); exit;
}
// ---------- QR kód k platbě u auta: obrázek PNG ze serveru (?qr=VS), jen pro nezaplacenou a nestornovanou objednávku ----------
if (isset($_GET['qr'])) {
  require __DIR__ . '/_qr.php';
  $vs = is_string($_GET['qr']) ? preg_replace('/\D/', '', $_GET['qr']) : '';
  $o = preg_match('/^\d{6,12}$/', $vs) ? nacist_json("objednavky/$vs.json") : null;
  if (!is_array($o) || empty($o['cislo']) || !empty($o['zruseno']) || je_zaplaceno($o) || cil_platby($o) <= 0) { http_response_code(404); exit; }
  header('Content-Type: image/png');
  header('Cache-Control: private, no-store');
  echo qr_png(spd_objednavky($o));
  exit;
}
prihlasit_zarizeni(); // přihlášení se při každé návštěvě prodlouží o rok

// Zkušební provoz: smazání účtenky; číslování pokračuje od nejvyššího zbývajícího čísla.
function smazat_doklad(string $vs): void {
  zmenit_objednavku($vs, function (array &$o) use ($vs) {
    if (empty($o['doklad'])) return;
    unset($o['doklad']);
    $o['chce_doklad'] = false; // jinak by se při další akci vystavila znovu
    $zamek = fopen(data_cesta('doklady.lock'), 'c');
    flock($zamek, LOCK_EX);
    // Nejvyšší čísla se počítají z aktuálních souborů (pod zámkem objednávek), ne ze stavu načteného dřív.
    $rada = [];
    foreach (glob(DATA . '/objednavky/*.json') ?: [] as $f) {
      if (basename($f, '.json') === $vs) continue;
      $x = json_decode((string)file_get_contents($f), true);
      if (empty($x['doklad']['cislo'])) continue;
      $rok = substr($x['doklad']['cislo'], 0, 4);
      $rada[$rok] = max($rada[$rok] ?? 0, (int)substr($x['doklad']['cislo'], 4));
    }
    ulozit_json('doklady.json', $rada);
    flock($zamek, LOCK_UN);
    fclose($zamek);
  });
}

// ---------- akce s objednávkou (doručeno, zaplaceno hotově, storno, účtenka) ----------
// Tlačítka posílají cílový stav (hodnota=1 / 0), takže dvojí ťuknutí nebo opakované odeslání nic nepřepne zpět.
// Objednávka se mění pod zámkem (souběžné párování plateb se neztratí), e-maily jdou až po uložení.
if ($_SERVER['REQUEST_METHOD'] === 'POST' && is_string($_POST['vs'] ?? null)) {
  $vs = preg_replace('/\D/', '', $_POST['vs']);
  $zpet = isset($_POST['zpet']) ? 'rozvoz.php?uctenky=1' : 'rozvoz.php?den=' . urlencode(is_string($_POST['den'] ?? null) ? $_POST['den'] : '');
  $kotva = isset($_POST['zpet']) ? '' : '#o' . $vs;
  $hlaseni = '';
  $hodnota = is_string($_POST['hodnota'] ?? null) ? $_POST['hodnota'] === '1' : null;
  if ($hodnota === null && $akce === 'doruceno' && isset($_POST['uctenka'])) $hodnota = true; // starší formulář „✓ Doručeno“

  if ($akce === 'smazat-doklad') {
    if (ZKUSEBNI_PROVOZ) smazat_doklad($vs);
  } elseif ($akce === 'storno-doklad') {
    // Mimo zkušební provoz: účtenka zůstává (i její číslo), jen se označí jako stornovaná s důvodem.
    $duvod = trim(mb_substr(retezec($_POST['duvod'] ?? ''), 0, 200));
    if ($duvod === '') $hlaseni = 'duvod';
    else zmenit_objednavku($vs, function (array &$o) use ($duvod) {
      if (!platny_doklad($o)) return;
      $o['doklad']['storno'] = date('c');
      $o['doklad']['storno_duvod'] = $duvod;
    });
  } elseif ($akce === 'vyridit-upozorneni') {
    zmenit_objednavku($vs, function (array &$o) {
      if (empty($o['upozorneni'])) return;
      $o['upozorneni_vyrizena'] = array_merge($o['upozorneni_vyrizena'] ?? [], array_map(fn($u) => $u . ' (vyřízeno ' . date('j. n. Y') . ')', $o['upozorneni']));
      unset($o['upozorneni']);
    });
  } elseif ($akce === 'upravit') {
    // Dodáno méně (odrůda došla…): mn[i] = kolik se předá z i-tého řádku PŮVODNÍ objednávky.
    // Počítá se vždy z původní objednávky (uložené v 'puvodni'), takže opakované odeslání nic nezdvojí.
    // Jen dokud není účtenka – účtenka i export pro účetní pak ukazují skutečně předané zboží.
    $mn = is_array($_POST['mn'] ?? null) ? $_POST['mn'] : [];
    zmenit_objednavku($vs, function (array &$o) use ($mn, &$hlaseni) {
      if (!empty($o['zruseno']) || !empty($o['doklad'])) { $hlaseni = 'upravit'; return; }
      $puv = $o['puvodni'] ?? ['polozky' => $o['polozky'] ?? [], 'celkem' => (int)($o['celkem'] ?? 0), 'castka' => (int)($o['castka'] ?? 0)];
      $radky = []; $zmeny = []; $ubyde = 0;
      foreach ($puv['polozky'] as $i => $r) {
        $p = upravitelny_radek((string)$r);
        $chci = $p && is_string($mn[$i] ?? null) && ctype_digit(trim($mn[$i])) ? min((int)trim($mn[$i]), $p['mn']) : null;
        if (!$p || $chci === null || $chci === $p['mn']) { $radky[] = $r; continue; }
        $zmeny[$i] = $chci;
        $cena = (int)round($p['cena'] * $chci / $p['mn']);
        $ubyde += $p['cena'] - $cena;
        if ($chci > 0) $radky[] = $chci . $p['jed'] . $p['popis'] . ' – ' . kc($cena);
      }
      if (!$radky) { $hlaseni = 'nic'; return; }
      if (!$zmeny) { // všechno jako v objednávce → zpět původní stav
        if (isset($o['puvodni'])) { $o['polozky'] = $puv['polozky']; $o['celkem'] = $puv['celkem']; $o['castka'] = $puv['castka']; unset($o['puvodni'], $o['upraveno']); }
      } else {
        $o['puvodni'] = ['polozky' => $puv['polozky'], 'celkem' => $puv['celkem'], 'castka' => $puv['castka'], 'mn' => $zmeny];
        $o['polozky'] = $radky;
        $o['celkem'] = max(0, $puv['celkem'] - $ubyde);
        $o['castka'] = $puv['castka'] > 0 ? max(0, $puv['castka'] - $ubyde) : 0;
        $o['upraveno'] = date('c');
      }
      // Převodem už zaplaceno víc, než je nová cena: připomenout vrácení (farma ho odklikne „Vyřízeno“).
      $upoz = array_values(array_filter($o['upozorneni'] ?? [], fn($u) => !str_starts_with($u, 'Po úpravě objednávky')));
      $navic = (float)($o['zaplaceno'] ?? 0) - cil_platby($o);
      if (empty($o['zaplaceno_hotove']) && $navic > 0.5) $upoz[] = 'Po úpravě objednávky zaplaceno převodem o ' . kc((int)round($navic)) . ' víc – vrátit';
      if ($upoz) $o['upozorneni'] = $upoz; else unset($o['upozorneni']);
    });
  } else {
    $poslat = [];
    $o = zmenit_objednavku($vs, function (array &$o) use ($akce, $hodnota, &$poslat, &$hlaseni) {
      // Stornovaná objednávka: jde jen obnovit (žádné „doručeno“, platba ani účtenka omylem).
      if (!empty($o['zruseno']) && $akce !== 'zruseno') return;
      $melDoklad = !empty($o['doklad']);
      if ($akce === 'doklad') {
        if (!empty($o['chce_doklad'])) return;           // dodatečné vystavení účtenky – už požádáno
        $o['chce_doklad'] = true;
      } else {
        $pole = ['doruceno' => 'doruceno', 'hotove' => 'zaplaceno_hotove', 'zruseno' => 'zruseno'][$akce] ?? null;
        if (!$pole) return;
        $novy = $hodnota ?? empty($o[$pole]);              // bez „hodnota“ (stará stránka v prohlížeči) přepnout jako dřív
        if (!empty($o[$pole]) === $novy) return;          // už nastaveno – nic nedělat
        if ($pole === 'zruseno' && $novy && platny_doklad($o) && !ZKUSEBNI_PROVOZ) { $hlaseni = 'doklad'; return; }
        $o[$pole] = $novy;
        if ($pole === 'doruceno' && $novy) {
          $o['doruceno_cas'] = date('c');                 // skutečný den předání = DUZP na účtence
          // Při označení „doručeno“ farma volí, jestli se má vystavit účtenka.
          $o['chce_doklad'] = ($_POST['uctenka'] ?? '') === '1';
          // Při předání jde rovnou potvrdit i platbu na místě.
          if (($_POST['zaplaceno'] ?? '') === '1' && !je_zaplaceno($o)) $o['zaplaceno_hotove'] = true;
        } elseif ($pole === 'doruceno') {
          unset($o['doruceno_cas']);
        } elseif ($pole === 'zruseno') {
          // Storno objednávky, za kterou už přišel převod: připomínka vrácení peněz (při obnovení zmizí).
          $upoz = array_values(array_filter($o['upozorneni'] ?? [], fn($u) => !str_starts_with($u, 'Stornováno, ale')));
          if ($novy && (float)($o['zaplaceno'] ?? 0) > 0) $upoz[] = 'Stornováno, ale už zaplaceno převodem ' . kc((int)round((float)$o['zaplaceno'])) . ' – vrátit';
          if ($upoz) $o['upozorneni'] = $upoz; else unset($o['upozorneni']);
        }
      }
      $o = vystavit_doklad($o);
      $email = (bool)filter_var($o['email'] ?? '', FILTER_VALIDATE_EMAIL);
      // Zákazník dostane jednou e-mail, že objednávka byla doručena / předána (s účtenkou, pokud je).
      $poslat['doruceni'] = $akce === 'doruceno' && !empty($o['doruceno']) && empty($o['email_doruceno']) && $email;
      $poslat['doklad'] = !$poslat['doruceni'] && !$melDoklad && !empty($o['doklad']) && $email;
    });
    if ($o && !empty($poslat['doklad'])) {
      poslat_email($o['email'], "Účtenka k objednávce {$o['cislo']} – Ovocnářství Holub",
        "Dobrý den,

děkujeme za platbu. Účtenka k objednávce {$o['cislo']}:
" . odkaz_na_doklad($o) . "

Ovocnářství Holub
",
        email_html('Účtenka k objednávce', '<p style="line-height:1.5">Dobrý den,<br>děkujeme za platbu.</p>'
          . '<p><a href="' . h(odkaz_na_doklad($o)) . '" style="color:#2f5a33">Zobrazit účtenku č. ' . h($o['doklad']['cislo']) . '</a></p>'), null, false);
    }
    if ($o && !empty($poslat['doruceni'])) {
      $uctenka = !empty($o['doklad'])
        ? ['text' => "
Účtenka: " . odkaz_na_doklad($o) . "
", 'html' => '<p><a href="' . h(odkaz_na_doklad($o)) . '" style="color:#2f5a33">Zobrazit účtenku č. ' . h($o['doklad']['cislo']) . '</a></p>']
        : ['text' => '', 'html' => ''];
      $dovoz = !empty($o['rozvoz']);
      $nadpis = $dovoz ? 'Objednávka doručena' : 'Objednávka předána';
      // Doručení označené dodatečně (den už minul): místo „dnes“ den z objednávky.
      $datum = is_string($o['datum'] ?? null) ? $o['datum'] : '';
      $t = $datum !== '' && $datum < date('Y-m-d') ? strtotime($datum) : false;
      $kdy = $t ? ['v neděli', 'v pondělí', 'v úterý', 've středu', 've čtvrtek', 'v pátek', 'v sobotu'][(int)date('w', $t)] . ' ' . date('j. n.', $t) : 'dnes';
      $veta = $dovoz ? "vaši objednávku jsme $kdy doručili" : "vaši objednávku jste si $kdy vyzvedli";
      // Upravená objednávka (dodáno méně): zákazník dostane skutečně předané zboží a novou cenu.
      $seznam = $o['souhrn'];
      if (!empty($o['puvodni'])) {
        $navic = empty($o['zaplaceno_hotove']) ? (float)$o['zaplaceno'] - cil_platby($o) : 0;
        $seznam = 'Oproti objednávce jsme ' . ($dovoz ? 'dovezli' : 'předali') . " jen toto:\n" . implode("\n", $o['polozky'] ?? [])
          . "\n\nCelkem: " . kc(cil_platby($o)) . ($navic > 0.5 ? "\nRozdíl " . kc((int)round($navic)) . ', který jste zaplatili navíc, vám vrátíme.' : '');
      }
      $odeslano = poslat_email($o['email'], "$nadpis {$o['cislo']} – Ovocnářství Holub",
        "Dobrý den,

$veta. Děkujeme za nákup a přejeme dobrou chuť!

$seznam
{$uctenka['text']}
Ovocnářství Holub
",
        email_html($nadpis, '<p style="line-height:1.5">Dobrý den,<br>' . h($veta) . '. Děkujeme za nákup a přejeme dobrou chuť!</p>'
          . '<div style="background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:18px 20px;line-height:1.55;font-size:14px">' . nl2br(h($seznam)) . '</div>'
          . $uctenka['html']), null, false);
      if ($odeslano) zmenit_objednavku($vs, function (array &$o) { $o['email_doruceno'] = true; });
    }
  }
  header('Location: ' . $zpet . ($hlaseni !== '' ? '&hlaseni=' . $hlaseni : '') . $kotva); exit;
}

// Krátká hlášení po akci (text je pevný, z adresy se bere jen kód).
$hlaseni = [
  'doklad' => 'Objednávka má vystavenou účtenku. Nejdřív účtenku stornujte (odkaz „Stornovat účtenku“), potom půjde stornovat i objednávka.',
  'duvod' => 'Pro storno účtenky napište krátký důvod.',
  'odhlaseno' => 'Ostatní telefony a počítače jsou odhlášené. Tady zůstáváte přihlášení.',
  'upravit' => 'Stornovanou objednávku ani objednávku s účtenkou nejde upravit. (Účtenku nejdřív smažte nebo stornujte.)',
  'nic' => 'Když se nepředá nic, objednávku raději stornujte (tlačítko „Stornovat“).',
][is_string($_GET['hlaseni'] ?? null) ? $_GET['hlaseni'] : ''] ?? '';
$hlaseniHtml = $hlaseni !== '' ? '<p class="box pozor err">' . h($hlaseni) . '</p>' : '';

// ---------- načtení objednávek ----------
$vse = [];
foreach (glob(DATA . '/objednavky/*.json') ?: [] as $f) {
  $o = json_decode((string)file_get_contents($f), true);
  if (is_array($o) && !empty($o['cislo'])) $vse[$o['vs']] = $o;
}

// U účtenky: ve zkušebním provozu „Smazat“, jinak „Stornovat účtenku“ s povinným důvodem (číslo zůstává).
$zrusitDoklad = function (array $o, bool $zPrehledu = false): string {
  if (!empty($o['doklad']['storno'])) return '<b style="color:var(--berry)">STORNO</b>' . (!empty($o['doklad']['storno_duvod']) ? ' – ' . h($o['doklad']['storno_duvod']) : '');
  $skryte = '<input type="hidden" name="vs" value="' . h($o['vs']) . '">'
    . ($zPrehledu ? '<input type="hidden" name="zpet" value="1">' : '<input type="hidden" name="den" value="' . h($GLOBALS['vybrany'] ?? '') . '">');
  if (ZKUSEBNI_PROVOZ) {
    return '<form method="post" style="display:inline" onsubmit="return confirm(' . h(json_encode("Smazat účtenku č. {$o['doklad']['cislo']} ({$o['jmeno']})? Zákazník ji už mohl dostat e-mailem – jeho odkaz přestane fungovat. Číslování bude pokračovat od nejvyššího zbývajícího čísla.", JSON_UNESCAPED_UNICODE)) . ')">'
      . $skryte . '<input type="hidden" name="akce" value="smazat-doklad"><button class="odkaz">Smazat</button></form>';
  }
  return '<details class="storno"><summary>Stornovat účtenku</summary><form method="post" onsubmit="return confirm(' . h(json_encode("Stornovat účtenku č. {$o['doklad']['cislo']} ({$o['jmeno']})? Číslo účtenky zůstane, zákazníkovi se zobrazí jako STORNO.", JSON_UNESCAPED_UNICODE)) . ')">'
    . $skryte . '<input type="hidden" name="akce" value="storno-doklad"><input name="duvod" required maxlength="200" placeholder="Důvod storna" aria-label="Důvod storna"><button class="btn">Stornovat</button></form></details>';
};

// ---------- skupiny s kódem: kdo kód používá, uvolnění místa ----------
if (isset($_GET['skupiny']) || $akce === 'odebrat-clena') {
  if ($akce === 'odebrat-clena') {
    $id = retezec($_POST['skupina'] ?? ''); $uid = retezec($_POST['uid'] ?? '');
    clenove_zmena(function (array &$vse) use ($id, $uid) {
      $vse[$id] = array_values(array_filter($vse[$id] ?? [], fn($c) => $c['uid'] !== $uid));
      $vse["$id#blok"] = array_values(array_unique(array_merge($vse["$id#blok"] ?? [], [$uid])));
    });
    header('Location: rozvoz.php?skupiny=1'); exit;
  }
  $clenove = clenove_vse();
  $obsah = hlavicka('Skupiny', ['rozvoz.php' => 'Objednávky', 'rozvoz.php?uctenky=1' => 'Účtenky']) . '<main>'
    . '<p class="muted">Zákazníci se zvýhodněnými cenami podle kódu skupiny. Místo se uvolní, když zákazník kód zruší nebo ho tady odeberete.</p>';
  foreach (skupiny() as $sk) {
    $seznam = $clenove[$sk['id']] ?? [];
    $max = (int)($sk['max'] ?? 0);
    $obsah .= '<h2>' . h($sk['nazev']) . ' <span class="muted">' . count($seznam) . ($max ? " z $max účtů" : ' účtů') . '</span></h2>'
      . '<p class="muted">' . h($sk['adresa'] ?? '') . '</p>';
    if (!$seznam) { $obsah .= '<p class="box">Kód zatím nikdo nepoužil.</p>'; continue; }
    $obsah .= '<div class="box"><table>';
    foreach ($seznam as $c) {
      $obsah .= '<tr><td>' . h($c['email']) . '<br><span class="muted">od ' . h(date('j. n. Y', strtotime($c['cas']))) . '</span></td><td class="r">'
        . '<form method="post" onsubmit="return confirm(' . h(json_encode("Odebrat {$c['email']} ze skupiny {$sk['nazev']}?", JSON_UNESCAPED_UNICODE)) . ')">'
        . '<input type="hidden" name="akce" value="odebrat-clena"><input type="hidden" name="skupina" value="' . h($sk['id']) . '">'
        . '<input type="hidden" name="uid" value="' . h($c['uid']) . '"><button class="btn">Odebrat</button></form></td></tr>';
    }
    $obsah .= '</table></div>';
  }
  stranka('Skupiny', $obsah . paticka() . '</main>');
}

// ---------- přehled účtenek a exporty pro účetní ----------
//   ?uctenky=csv&mesic=RRRR-MM – účtenky vystavené v měsíci (stornované s nulovými částkami a poznámkou)
//   ?prodeje=csv&mesic=RRRR-MM – všechny doručené, nestornované objednávky podle dne předání (DUZP), s účtenkou i bez
if (isset($_GET['uctenky']) || isset($_GET['prodeje'])) {
  $doklady = array_values(array_filter($vse, fn($o) => !empty($o['doklad'])));
  usort($doklady, fn($a, $b) => strcmp($b['doklad']['cislo'], $a['doklad']['cislo']));
  $prodeje = array_values(array_filter($vse, fn($o) => !empty($o['doruceno']) && empty($o['zruseno'])));
  usort($prodeje, fn($a, $b) => [duzp($a), $a['cislo']] <=> [duzp($b), $b['cislo']]);
  $mesice = array_values(array_unique(array_merge(
    array_map(fn($o) => substr($o['doklad']['vystaveno'], 0, 7), $doklady),
    array_map(fn($o) => substr(duzp($o), 0, 7), $prodeje))));
  rsort($mesice);
  $mesic = in_array($_GET['mesic'] ?? '', $mesice, true) ? $_GET['mesic'] : ($mesice[0] ?? date('Y-m'));
  $vMesici = array_values(array_filter($doklady, fn($o) => str_starts_with($o['doklad']['vystaveno'], $mesic)));
  $prodejeMesic = array_values(array_filter($prodeje, fn($o) => str_starts_with(duzp($o), $mesic)));
  $sazby = array_values(array_unique([(int)PRODAVAJICI['sazba_dph'], (int)PRODAVAJICI['sazba_dph_napoje']]));
  $f2 = fn($x) => number_format($x, 2, ',', ' ') . ' Kč';
  $c2 = fn($x) => number_format((float)$x, 2, ',', '');
  $datum = fn(string $d) => $d !== '' ? date('j.n.Y', strtotime($d)) : '';
  $uhrada = function (array $o): string {
    if (!empty($o['zaplaceno_hotove'])) return 'hotově / na místě';
    $z = (float)($o['zaplaceno'] ?? 0);
    if (cil_platby($o) > 0 && $z + 0.001 >= cil_platby($o)) return 'bankovním převodem';
    return $z > 0 ? 'převodem jen ' . number_format($z, 2, ',', ' ') . ' Kč' : 'nezaplaceno';
  };
  $csv = function (string $nazev, array $hlavicka, array $radky): void {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $nazev . '"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, $hlavicka, ';', '"', '');
    // csv_bunka() jen u textových sloupců (volající) – záporná částka „-5,00“ musí v Excelu zůstat číslem.
    foreach ($radky as $r) fputcsv($out, $r, ';', '"', '');
    exit;
  };
  $sloupceDph = [];
  foreach ($sazby as $sz) { $sloupceDph[] = "Základ $sz %"; $sloupceDph[] = "DPH $sz %"; }
  $castkyDph = function (array $o, bool $nulove = false) use ($sazby, $c2): array {
    $r = rozpis_dph($o);
    $out = [];
    foreach ($sazby as $sz) { $out[] = $c2($nulove ? 0 : ($r[$sz]['zaklad'] ?? 0)); $out[] = $c2($nulove ? 0 : ($r[$sz]['dan'] ?? 0)); }
    $out[] = $c2($nulove ? 0 : cil_platby($o));
    return $out;
  };
  if (($_GET['uctenky'] ?? '') === 'csv') {
    $radky = [];
    foreach (array_reverse($vMesici) as $o) {
      $storno = !empty($o['doklad']['storno']);
      $radky[] = array_merge(array_map('csv_bunka', [$o['doklad']['cislo'], $datum($o['doklad']['vystaveno']), $datum(duzp($o)), $o['cislo'], $o['jmeno'], $o['doklad']['uhrada']]),
        $castkyDph($o, $storno),
        [csv_bunka($storno ? 'STORNO ' . $datum($o['doklad']['storno']) . (!empty($o['doklad']['storno_duvod']) ? ': ' . $o['doklad']['storno_duvod'] : '') : '')]);
    }
    $csv("uctenky-$mesic.csv", array_merge(['Číslo účtenky', 'Datum vystavení', 'DUZP', 'Objednávka', 'Zákazník', 'Úhrada'], $sloupceDph, ['Celkem', 'Stav']), $radky);
  }
  if (($_GET['prodeje'] ?? '') === 'csv') {
    $radky = [];
    foreach ($prodejeMesic as $o) {
      $doklad = !empty($o['doklad']['cislo']) ? $o['doklad']['cislo'] . (!empty($o['doklad']['storno']) ? ' (storno)' : '') : '';
      $radky[] = array_merge(array_map('csv_bunka', [$datum(duzp($o)), $o['cislo'], $o['jmeno'], $o['ico'] ?? '', $uhrada($o), $doklad]), $castkyDph($o));
    }
    $csv("prodeje-$mesic.csv", array_merge(['DUZP', 'Objednávka', 'Zákazník', 'IČO', 'Úhrada', 'Účtenka'], $sloupceDph, ['Celkem']), $radky);
  }
  $obsah = hlavicka('Účtenky', ['rozvoz.php' => 'Objednávky', 'rozvoz.php?skupiny=1' => 'Skupiny']) . '<main>' . $hlaseniHtml;
  if (PRODAVAJICI['ico'] === '') $obsah .= '<p class="box">Účtenky se začnou vystavovat po doplnění IČO.</p>';
  $obsah .= '<p class="muted">Účtenka se vystaví, když ji při označení „Doručeno“ zvolíte a objednávka je zaplacená. Zákazník dostane odkaz e-mailem.</p>';
  if (!$mesice) {
    $obsah .= '<p class="box">Zatím žádné účtenky.</p>';
  } else {
    $obsah .= '<nav class="dny">';
    foreach ($mesice as $m) $obsah .= '<a href="?uctenky=1&mesic=' . h($m) . '"' . ($m === $mesic ? ' class="akt" aria-current="page"' : '') . '>' . h(date('n/Y', strtotime("$m-01"))) . '</a>';
    $obsah .= '</nav>';
    $celkem = 0; $poSazbach = [];
    if (!$vMesici) $obsah .= '<p class="box">V tomto měsíci žádné účtenky.</p>';
    else {
      $obsah .= '<div class="box"><table><tr><td class="muted">Účtenka</td><td class="muted">Zákazník</td><td class="r muted">Celkem</td></tr>';
      foreach ($vMesici as $o) {
        $c = cil_platby($o);
        $storno = !empty($o['doklad']['storno']);
        if (!$storno) {
          $celkem += $c;
          foreach (rozpis_dph($o) as $sz => $x) {
            $poSazbach[$sz]['zaklad'] = ($poSazbach[$sz]['zaklad'] ?? 0) + $x['zaklad'];
            $poSazbach[$sz]['dan'] = ($poSazbach[$sz]['dan'] ?? 0) + $x['dan'];
          }
        }
        $obsah .= '<tr><td><a href="' . h(odkaz_na_doklad($o)) . '">' . h($o['doklad']['cislo']) . '</a><br><span class="muted">' . h(date('j. n.', strtotime($o['doklad']['vystaveno']))) . ' · ' . h($o['doklad']['uhrada']) . ' · ' . $zrusitDoklad($o, true) . '</span></td>'
          . '<td>' . h($o['jmeno']) . '<br><span class="muted">' . h($o['cislo']) . '</span></td><td class="r"' . ($storno ? ' style="text-decoration:line-through"' : '') . '>' . h(kc($c)) . '</td></tr>';
      }
      ksort($poSazbach);
      $obsah .= '</table><p style="margin:12px 0 0"><b>Celkem za měsíc: ' . h($f2($celkem)) . '</b>' . ($celkem && count(array_filter($vMesici, fn($o) => !empty($o['doklad']['storno']))) ? ' <span class="muted">(bez stornovaných)</span>' : '');
      if (PRODAVAJICI['platce_dph']) foreach ($poSazbach as $sz => $x) {
        $obsah .= '<br><span class="muted">DPH ' . (int)$sz . ' %: základ ' . h($f2($x['zaklad'])) . ' · daň ' . h($f2($x['dan'])) . '</span>';
      }
      $obsah .= '</p></div>';
    }
    $trzby = array_sum(array_map('cil_platby', $prodejeMesic));
    $obsah .= '<div class="akce">' . ($vMesici ? '<a class="hl" href="?uctenky=csv&mesic=' . h($mesic) . '">Stáhnout účtenky (CSV / Excel)</a>' : '')
      . '<a href="?prodeje=csv&mesic=' . h($mesic) . '">Všechny prodeje za měsíc (CSV)</a></div>'
      . '<p class="muted">Všechny prodeje = každá doručená a nestornovaná objednávka podle dne předání, s účtenkou i bez: '
      . count($prodejeMesic) . '×, celkem ' . h(kc($trzby)) . ' včetně DPH, rozepsáno podle sazeb DPH.</p>';
  }
  stranka('Účtenky', $obsah . paticka() . '</main>');
}

// ---------- výběr dne ----------
// Nevyřízená objednávka: nestornovaná a nedoručená nebo nezaplacená; nebo s upozorněním k platbě (i stornovaná).
$nevyrizena = fn(array $o): bool => !empty($o['upozorneni'])
  || (empty($o['zruseno']) && (empty($o['doruceno']) || (!je_zaplaceno($o) && cil_platby($o) > 0)));
$dny = []; // den => ['pocet' => nestornované objednávky, 'otevrene' => nevyřízené]
foreach ($vse as $o) {
  $d = ($o['datum'] ?? '') ?: 'bez-terminu';
  $dny[$d] ??= ['pocet' => 0, 'otevrene' => 0];
  if (empty($o['zruseno'])) $dny[$d]['pocet']++;
  if ($nevyrizena($o)) $dny[$d]['otevrene']++;
}
ksort($dny);
$dnes = date('Y-m-d');
$zitra = date('Y-m-d', strtotime('tomorrow'));
$datovane = array_values(array_filter(array_keys($dny), fn($d) => $d !== 'bez-terminu'));
$minuly = fn(string $d): bool => $d !== 'bez-terminu' && $d < $dnes;
$vybrany = $_GET['den'] ?? '';
if (!is_string($vybrany) || !isset($dny[$vybrany])) {
  // Bez volby: nejbližší den s objednávkami od dneška, jinak poslední den, který nějaké měl.
  $budouci = array_values(array_filter($datovane, fn($d) => $d >= $dnes));
  $vybrany = $budouci[0] ?? ($datovane ? $datovane[count($datovane) - 1] : ($dny ? 'bez-terminu' : ''));
}
$nazevDne = function (string $d): string {
  if ($d === 'bez-terminu') return 'Bez termínu';
  $t = strtotime($d);
  $jm = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'][(int)date('w', $t)];
  return $jm . ' ' . date('j. n.', $t);
};
// Krátký popisek do proužku dnů: „dnes 30. 9.“, „zítra 1. 10.“, „pá 2. 10.“.
$kratce = function (string $d) use ($dnes, $zitra): string {
  if ($d === 'bez-terminu') return 'bez termínu';
  $t = strtotime($d);
  return ($d === $dnes ? 'dnes' : ($d === $zitra ? 'zítra' : ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'][(int)date('w', $t)])) . ' ' . date('j. n.', $t);
};

$den = array_values(array_filter($vse, fn($o) => (($o['datum'] ?? '') ?: 'bez-terminu') === $vybrany));
$aktivni = array_values(array_filter($den, fn($o) => empty($o['zruseno'])));
$rozvoz = array_values(array_filter($aktivni, fn($o) => !empty($o['rozvoz'])));
$odber = array_values(array_filter($aktivni, fn($o) => empty($o['rozvoz'])));
$zrusene = array_values(array_filter($den, fn($o) => !empty($o['zruseno'])));

// ---------- geokódování adres (OpenStreetMap Nominatim, výsledky se pamatují) ----------
// Výpadek služby se nepamatuje (příště se zkusí znovu); „nenalezeno“ se zkusí znovu po týdnu.
$geo = nacist_json('geo.json', []);
$dotazu = 0; $vypadek = false;
$souradnice = function (string $adresa) use (&$geo, &$dotazu, &$vypadek): ?array {
  $k = mb_strtolower(trim($adresa));
  $z = $geo[$k] ?? null;
  if (is_array($z) && isset($z[0], $z[1])) return [(float)$z[0], (float)$z[1]];
  if (is_array($z) && ($z['nenalezeno'] ?? 0) > time() - 7 * 86400) return null;
  if ($vypadek || $dotazu >= 3) return null;
  if ($dotazu++) usleep(1100000);
  $url = 'https://nominatim.openstreetmap.org/search?' . http_build_query(['q' => $adresa, 'format' => 'json', 'limit' => 1, 'countrycodes' => 'cz']);
  $ctx = stream_context_create(['http' => ['timeout' => 6, 'header' => "User-Agent: ovoce-holub.cz rozvoz (objednavky@ovoce-holub.cz)\r\n"]]);
  $raw = @file_get_contents($url, false, $ctx);
  $r = $raw === false ? null : json_decode($raw, true);
  if (!is_array($r)) { $vypadek = true; return null; } // výpadek, 403/429… – nic neukládat, další dotazy vynechat
  $geo[$k] = !empty($r[0]) ? [(float)$r[0]['lat'], (float)$r[0]['lon']] : ['nenalezeno' => time()];
  ulozit_json('geo.json', $geo, false);
  return isset($geo[$k][0]) ? $geo[$k] : null;
};
$farma = FARMA_GPS;
foreach ($rozvoz as $i => $o) {
  // Adresa ověřená při objednávce v registru adres (RÚIAN) má přesné souřadnice; jinak dohledání přes OpenStreetMap.
  $adr = !empty($o['adresa_overena']) ? $o['adresa_overena']
    : $o['adresa'] . ', ' . trim(($o['psc'] ?? '') . ' ' . (($o['mesto'] ?? '') ?: 'České Budějovice'));
  $rozvoz[$i]['plna_adresa'] = $adr;
  $rozvoz[$i]['gps'] = $o['gps_overena'] ?? $souradnice($adr);
}

// ---------- zastávky ----------
// Objednávky na stejné místo (skupina má jednu pevnou adresu) jsou jedna zastávka: jedno číslo, jedna značka na mapě,
// jeden bod navigace. Karty mají písmena 3a, 3b…
$zastavky = [];
foreach ($rozvoz as $o) {
  $k = $o['gps'] ? round((float)$o['gps'][0], 5) . ',' . round((float)$o['gps'][1], 5) : 'a|' . mb_strtolower(trim($o['plna_adresa']));
  $zastavky[$k] ??= ['gps' => $o['gps'], 'adresa' => $o['plna_adresa'], 'obj' => []];
  $zastavky[$k]['obj'][] = $o;
}
$zastavky = array_values($zastavky);

// Pořadí zastávek: nejdřív hrubě „vždy k nejbližší další“, pak nejkratší okruh po silnicích (OSRM).
$vzd = fn($a, $b) => hypot(($a[0] - $b[0]) * 111, ($a[1] - $b[1]) * 111 * cos(deg2rad($a[0])));
$zbyva = $zastavky; $poradi = []; $kde = $farma;
while ($zbyva) {
  $nej = 0;
  if ($kde) foreach ($zbyva as $i => $z) if ($z['gps'] && (!$zbyva[$nej]['gps'] || $vzd($kde, $z['gps']) < $vzd($kde, $zbyva[$nej]['gps']))) $nej = $i;
  $poradi[] = $zbyva[$nej];
  if ($zbyva[$nej]['gps']) $kde = $zbyva[$nej]['gps'];
  array_splice($zbyva, $nej, 1);
}
$zastavky = $poradi;

$trasa = null;
$sGps = array_values(array_filter($zastavky, fn($z) => !empty($z['gps'])));
if ($farma && $sGps) {
  $body = array_merge([$farma], array_map(fn($z) => $z['gps'], $sGps));
  $klicTrasy = sha1(json_encode($body));
  $trasy = nacist_json('trasy.json', []);
  if (!isset($trasy[$klicTrasy])) {
    $souradniceUrl = implode(';', array_map(fn($b) => $b[1] . ',' . $b[0], $body));
    $url = "https://router.project-osrm.org/trip/v1/driving/$souradniceUrl?source=first&roundtrip=true&geometries=geojson&overview=full";
    $ctx = stream_context_create(['http' => ['timeout' => 10, 'header' => "User-Agent: ovoce-holub.cz rozvoz\r\n"]]);
    $r = json_decode((string)@file_get_contents($url, false, $ctx), true);
    if (($r['code'] ?? '') === 'Ok') {
      $trasy = array_slice($trasy, -9, null, true); // pamatovat jen posledních 10 tras
      $trasy[$klicTrasy] = [
        'poradi' => array_map(fn($w) => (int)$w['waypoint_index'], $r['waypoints']),
        'km' => round($r['trips'][0]['distance'] / 1000, 1),
        'min' => (int)round($r['trips'][0]['duration'] / 60),
        'cara' => array_map(fn($c) => [round($c[1], 5), round($c[0], 5)], $r['trips'][0]['geometry']['coordinates']),
      ];
      ulozit_json('trasy.json', $trasy, false);
    }
  }
  if (count($trasy[$klicTrasy]['poradi'] ?? []) === count($body)) {
    $trasa = $trasy[$klicTrasy];
    // waypoint_index = pořadí bodu na trase; bod 0 je statek.
    $klice = array_keys($sGps);
    usort($klice, fn($x, $y) => $trasa['poradi'][$x + 1] <=> $trasa['poradi'][$y + 1]);
    $zastavky = array_merge(array_map(fn($i) => $sGps[$i], $klice), array_values(array_filter($zastavky, fn($z) => empty($z['gps']))));
  }
}
// Čísla zastávek podle pořadí jízdy; ta se během dne nemění (doručené zastávky zůstávají na trase i na mapě).
$rozvoz = [];
foreach ($zastavky as $i => $z) {
  $zastavky[$i]['n'] = $i + 1;
  foreach ($z['obj'] as $j => $o) {
    $zastavky[$i]['obj'][$j]['znacka'] = ($i + 1) . (count($z['obj']) > 1 ? ($j < 26 ? chr(97 + $j) : '.' . ($j + 1)) : '');
    $rozvoz[] = $zastavky[$i]['obj'][$j];
  }
}

// ---------- co připravit (zvlášť na rozvoz a na osobní odběr) ----------
// „5 kg Topaz (Jablka) – 200 Kč“ → Topaz (Jablka) 5 kg; „2× 5 l Mošt Jablko (Mošty) – 320 Kč“ → 5 l Mošt Jablko (Mošty) 2×;
// „2× Bedýnka 3 kg: 2 kg Bohemia (Jablka) + 1 kg Novembra (Hrušky) – 200 Kč“ → počet bedýnek + kila jednotlivých odrůd;
// „1× Bedýnka 3 kg: Mix jablek a hrušek – výběr nechám na vás – 100 Kč“ → počet bedýnek a kila, odrůdy vybírá farma.
$pripravit = function (array $objednavky): array {
  $t = [];
  $pridat = function (string $klic, string $nazev, float $mn, string $jed, int $poradi, int $kg = 0, string $pozn = '') use (&$t): void {
    $t[$klic] ??= ['nazev' => $nazev, 'mn' => 0, 'jed' => $jed, 'poradi' => $poradi, 'kg' => 0, 'pozn' => $pozn];
    $t[$klic]['mn'] += $mn;
    $t[$klic]['kg'] += $kg;
  };
  foreach ($objednavky as $o) foreach ($o['polozky'] ?? [] as $r) {
    $r = preg_replace('/\s+–\s+(?:[\d\s]+Kč|cena na dotaz)\s*$/u', '', trim((string)$r));
    if (preg_match('/^(\d+)×\s*(Bedýnka[^:]*):\s*(.+)$/u', $r, $m)) {
      $n = (int)$m[1];
      $casti = array_map(fn($c) => preg_match('/^(\d+)\s*kg\s+(.+)$/u', trim($c), $x) ? $x : null, explode(' + ', $m[3]));
      if (!in_array(null, $casti, true)) {
        $pridat("b|{$m[2]}", "{$m[2]} – podle složení", $n, '×', 0);
        foreach ($casti as $c) $pridat("kg|{$c[2]}", $c[2], (int)$c[1] * $n, 'kg', 1);
      } else {
        $kg = preg_match('/(\d+)\s*kg/u', $m[2], $x) ? (int)$x[1] * $n : 0;
        $pridat("m|{$m[2]}", "{$m[2]} – mix, výběr na nás", $n, '×', 0, $kg, explode(' – ', $m[3])[0]);
      }
    } elseif (preg_match('/^(\d+(?:[.,]\d+)?)\s*(kg|ks|×|x)?\s*(.+)$/u', $r, $m)) {
      $jed = in_array($m[2], ['kg', 'ks'], true) ? $m[2] : ($m[2] === '' ? 'ks' : '×');
      $pridat("$jed|{$m[3]}", $m[3], (float)str_replace(',', '.', $m[1]), $jed, $jed === 'kg' ? 1 : 2);
    } else $pridat("?|$r", $r, 1, '×', 3);
  }
  // Bedýnky, pak ovoce na váhu podle druhu (Hrušky, Jablka…), pak mošty a ostatní.
  $druh = fn(string $n): string => preg_match('/\(([^()]*)\)\s*$/u', $n, $m) ? $m[1] : '';
  uasort($t, fn($a, $b) => [$a['poradi'], $druh($a['nazev']), $a['nazev']] <=> [$b['poradi'], $druh($b['nazev']), $b['nazev']]);
  return $t;
};
$cislo = fn(float $x): string => rtrim(rtrim(number_format($x, 1, ',', ' '), '0'), ',');
$tabulkaPripravit = function (array $t) use ($cislo): string {
  $s = '<table>'; $kg = 0;
  foreach ($t as $x) {
    $mn = $cislo($x['mn']) . ($x['jed'] === '×' ? '×' : ' ' . $x['jed']);
    if ($x['jed'] === 'kg') $kg += $x['mn'];
    if ($x['kg']) { $mn .= ' · ' . $cislo($x['kg']) . ' kg'; $kg += $x['kg']; }
    $s .= '<tr><td>' . h($x['nazev']) . ($x['pozn'] !== '' ? '<br><span class="muted">' . h($x['pozn']) . '</span>' : '') . '</td><td class="r">' . h($mn) . '</td></tr>';
  }
  if ($kg) $s .= '<tr class="soucet"><td>Ovoce celkem</td><td class="r">' . h($cislo($kg)) . ' kg</td></tr>';
  return $s . '</table>';
};

// ---------- výstup ----------
$cil = fn(array $o): int => cil_platby($o);
$zaplaceno = fn(array $o): bool => je_zaplaceno($o);
$prevodem = fn(array $o): bool => ($o['platba'] ?? '') === 'prevod' || ($o['castka'] ?? 0) > 0;
$platba = function (array $o) use ($cil): string {
  if (!empty($o['zaplaceno_hotove'])) return '<span class="stitek ok">Zaplaceno na místě</span>';
  if ($cil($o) > 0 && $o['zaplaceno'] + 0.001 >= $cil($o)) return '<span class="stitek ok">Zaplaceno převodem</span>';
  if ($o['zaplaceno'] > 0) return '<span class="stitek ceka">Zaplaceno jen ' . h(kc((int)$o['zaplaceno'])) . ' z ' . h(kc($cil($o))) . '</span>';
  if (($o['platba'] ?? '') === 'prevod' || $o['castka'] > 0) return '<span class="stitek ceka">Čeká na platbu převodem · ' . h(kc($cil($o))) . '</span>';
  return '<span class="stitek hot">Platí na místě · ' . h(kc($cil($o))) . '</span>';
};
// Storno zákazníkovi nic nepošle – potvrzovací okno to připomene (i vrácení peněz za převod).
$potvrditStorno = fn(array $o): string => "Stornovat objednávku {$o['cislo']} ({$o['jmeno']})?\n\nZákazník o stornu nedostane žádnou zprávu – dejte mu vědět"
  . (!empty($o['telefon']) ? " (tel. {$o['telefon']})" : '') . '.'
  . ((float)($o['zaplaceno'] ?? 0) > 0 ? "\nUž zaplatil převodem " . kc((int)round((float)$o['zaplaceno'])) . ' – peníze mu vraťte.' : '');
// Tlačítko s cílovým stavem ($hodnota '1' / '0'), aby opakované odeslání nic nepřepnulo zpět.
$tlacitko = fn($o, $akce, $text, $hl = false, $hodnota = null, $potvrdit = '') => '<form method="post"' . ($potvrdit !== '' ? ' onsubmit="return confirm(' . h(json_encode($potvrdit, JSON_UNESCAPED_UNICODE)) . ')"' : '') . '><input type="hidden" name="vs" value="' . h($o['vs']) . '">'
  . '<input type="hidden" name="akce" value="' . $akce . '"><input type="hidden" name="den" value="' . h($GLOBALS['vybrany']) . '">'
  . ($hodnota !== null ? '<input type="hidden" name="hodnota" value="' . $hodnota . '">' : '')
  . '<button' . ($hl ? ' class="hl"' : '') . '>' . $text . '</button></form>';
// „✓ Doručeno“ se rozbalí: potvrzení platby na místě (u nezaplacených) a volba s účtenkou / bez účtenky.
$doruceno = function (array $o): string {
  $popis = !empty($o['rozvoz']) ? '✓ Doručeno' : '✓ Vyzvednuto';
  $nezaplaceno = !je_zaplaceno($o);
  // Platba na místě bývá při předání zaplacená; u převodu se čeká na banku, proto tam není předvolená.
  $predvoleno = $nezaplaceno && ($o['platba'] ?? '') !== 'prevod' && !$o['castka'];
  $pole = '<input type="hidden" name="vs" value="' . h($o['vs']) . '"><input type="hidden" name="akce" value="doruceno"><input type="hidden" name="hodnota" value="1">'
    . '<input type="hidden" name="den" value="' . h($GLOBALS['vybrany']) . '">';
  $tl = fn(string $uctenka, string $text, bool $hl) => '<button name="uctenka" value="' . $uctenka . '"' . ($hl ? ' class="hl"' : '') . '>' . $text . '</button>';
  if (PRODAVAJICI['ico'] === '' && !$nezaplaceno) return '<form method="post">' . $pole . $tl('0', $popis, true) . '</form>';
  return '<details class="dor"><summary class="btn hl">' . $popis . '</summary><form method="post" class="box volby" style="display:block">' . $pole
    . ($nezaplaceno ? '<label class="zapl"><input type="checkbox" name="zaplaceno" value="1"' . ($predvoleno ? ' checked' : '') . '> Zákazník zaplatil na místě ('
        . h(kc(cil_platby($o) - (int)$o['zaplaceno'])) . ')</label>' : '')
    . (PRODAVAJICI['ico'] === '' ? '<div class="akce">' . $tl('0', 'Potvrdit', true) . '</div>'
        : '<p>Vystavit k objednávce účtenku?</p><div class="akce">' . $tl('1', 'Ano, s účtenkou', true) . $tl('0', 'Ne, bez účtenky', false) . '</div>')
    . '</form></details>';
};
// „Dodáno méně? Upravit množství“ – jen dokud není účtenka; množství se zadávají k řádkům původní objednávky.
$upravit = function (array $o): string {
  $radky = '';
  foreach ($o['puvodni']['polozky'] ?? $o['polozky'] ?? [] as $i => $r) {
    $p = upravitelny_radek((string)$r);
    if (!$p) continue;
    $radky .= '<label class="radek"><input type="number" name="mn[' . (int)$i . ']" min="0" max="' . $p['mn'] . '" step="1" inputmode="numeric" value="' . (int)($o['puvodni']['mn'][$i] ?? $p['mn']) . '">'
      . '<span>' . (trim($p['jed']) === 'kg' ? 'kg' : 'ks') . ' z ' . $p['mn'] . ' · ' . h($p['popis']) . '</span></label>';
  }
  if ($radky === '') return '';
  return '<details class="upravit"><summary class="btn">' . (!empty($o['puvodni']) ? 'Upravit množství' : 'Dodáno méně? Upravit množství') . '</summary>'
    . '<form method="post" class="box volby" style="display:block"><input type="hidden" name="vs" value="' . h($o['vs']) . '"><input type="hidden" name="akce" value="upravit">'
    . '<input type="hidden" name="den" value="' . h($GLOBALS['vybrany']) . '"><p>Kolik skutečně předáte?</p>' . $radky
    . '<p class="muted" style="font-weight:normal">0 = nedodáno. Cena se přepočítá; zákazník upravený seznam uvidí v e-mailu o předání i na účtence. '
    . 'Původní objednávka zůstává uložená – vyplněním původních množství se vrátí.</p>'
    . '<div class="akce"><button class="hl">Uložit úpravu</button></div></form></details>';
};
$karta = function (array $o) use ($platba, $tlacitko, $zaplaceno, $cil, $doruceno, $zrusitDoklad, $upravit, $potvrditStorno): string {
  $zruseno = !empty($o['zruseno']);
  $hotovo = !$zruseno && !empty($o['doruceno']);
  $dovoz = !empty($o['rozvoz']);
  $znacka = (string)($o['znacka'] ?? '');
  $s = '<div class="box obj' . ($zruseno ? ' zrusena' : ($hotovo ? ' hotovo' : '')) . '" id="o' . h($o['vs']) . '"><div>'
    . ($znacka !== '' ? '<span class="cislo' . ($hotovo ? ' hotova' : '') . '">' . h($znacka) . '</span>' : '')
    . '<span class="jm">' . h($o['jmeno']) . '</span> <span class="muted">' . h($o['cislo']) . '</span>'
    . (!empty($o['skupina']) ? ' <span class="stitek ok">skupina ' . h($o['skupina']) . '</span>' : '')
    . ($zruseno ? ' <span class="stitek zrus">Stornováno</span>' : '')
    // Zákazník už dnes dostal příliš mnoho potvrzení – tohle mu neodešlo (objednávka platí).
    . (!$zruseno && !empty($o['potvrzeni_limit']) ? ' <span class="stitek hot">Potvrzení e-mailem zákazníkovi neodešlo</span>' : '')
    . ($hotovo ? ' <span class="stitek ok">✓ ' . ($dovoz ? 'Doručeno' : 'Vyzvednuto') . (!empty($o['email_doruceno']) ? ' · zákazník dostal e-mail' : '') . '</span>' : '')
    . '</div>';
  // Na co si dát pozor: cena nesedí s ceníkem (kontrola na serveru), neověřená adresa.
  // Rozdíl v ceně bývá i mezi upozorněními (s tlačítkem „Vyřízeno“) – pak se neopakuje a po vyřízení už nesvítí.
  $pozor = [];
  $kontrola = $o['kontrola_cen'] ?? null;
  $cenaVUpozorneni = (bool)array_filter(array_merge((array)($o['upozorneni'] ?? []), (array)($o['upozorneni_vyrizena'] ?? [])), fn($u) => is_string($u) && str_starts_with($u, 'Cena nesouhlasí'));
  if (!$zruseno && !$cenaVUpozorneni && is_array($kontrola) && is_numeric($kontrola['klient'] ?? null) && is_numeric($kontrola['cenik'] ?? null)) {
    $pozor[] = '⚠ Cena nesouhlasí s ceníkem: zákazník ' . kc((int)round((float)$kontrola['klient'])) . ', ceník ' . kc((int)round((float)$kontrola['cenik']));
  }
  if (!$zruseno && $dovoz && empty($o['adresa_overena'])) {
    $pozor[] = '⚠ Adresa neověřená – zkontrolujte ji' . (empty($o['gps']) ? ' (nenašla se ani na mapě)' : '') . ', případně zákazníkovi zavolejte.';
  }
  if ($pozor) $s .= '<div class="box pozor">' . implode('', array_map(fn($p) => '<p class="err">' . h($p) . '</p>', $pozor)) . '</div>';
  // Upozornění z objednávky (cena, skupina, po uzávěrce) a z plateb (přeplatek, dvojí platba, platba za storno, vrácení po úpravě).
  if (!empty($o['upozorneni'])) {
    $s .= '<div class="box pozor">' . implode('', array_map(fn($u) => '<p class="err">⚠ ' . h($u) . '</p>', $o['upozorneni']))
      . '<form method="post" style="display:block"><input type="hidden" name="vs" value="' . h($o['vs']) . '"><input type="hidden" name="akce" value="vyridit-upozorneni">'
      . '<input type="hidden" name="den" value="' . h($GLOBALS['vybrany']) . '"><button class="btn">Vyřízeno</button></form></div>';
  }
  if ($dovoz) {
    $s .= '<div>' . ($zruseno ? h($o['adresa']) : '<a class="adr" href="' . h('https://www.google.com/maps/dir/?api=1&destination=' . urlencode($o['plna_adresa'] ?? $o['adresa'])) . '">' . h($o['adresa']) . '</a>')
      . (!empty($o['adresa_overena']) ? '<br><span class="muted" style="color:var(--leaf)">✓ ověřeno: ' . h($o['adresa_overena']) . '</span>' : '')
      . '</div>';
    // Mimo ČB se zákazníkovi po objednání slíbilo, že termín dovozu potvrdíme telefonem.
    if (!$zruseno && !empty($o['adresa_overena']) && !str_contains($o['adresa_overena'], 'České Budějovice')) {
      $s .= '<span class="stitek hot">Mimo České Budějovice – termín dovozu zákazníkovi potvrďte telefonem</span>';
    }
  }
  if (!empty($o['telefon'])) $s .= '<div><a class="tel" href="tel:' . h(preg_replace('/[^\d+]/', '', $o['telefon'])) . '">' . h($o['telefon']) . '</a></div>';
  $s .= '<ul>' . implode('', array_map(fn($r) => '<li>' . h($r) . '</li>', $o['polozky'] ?? [])) . '</ul>';
  if (empty($o['polozky'])) $s .= '<div class="muted" style="white-space:pre-line">' . h($o['souhrn']) . '</div>';
  if (!empty($o['poznamka'])) $s .= '<div><b>Poznámka:</b> ' . h($o['poznamka']) . '</div>';
  if (!$zruseno) $s .= $platba($o);
  elseif ((float)($o['zaplaceno'] ?? 0) > 0) $s .= '<span class="stitek hot">Převodem zaplaceno ' . h(kc((int)round((float)$o['zaplaceno']))) . '</span>';
  if (!empty($o['puvodni'])) $s .= '<span class="stitek hot">Upraveno – původně ' . h(kc(cil_platby($o['puvodni']))) . '</span>';
  if (!$zruseno && !$zaplaceno($o) && $cil($o) > 0) {
    $s .= '<details class="qr"><summary class="btn">Ukázat QR kód k platbě</summary><div class="box" style="text-align:center">'
      // Obrázek se načte až po rozbalení (loading=lazy ve sbaleném bloku); částka v adrese, ať se po změně nenačte starý.
      . '<img src="rozvoz.php?qr=' . h($o['vs']) . '&amp;k=' . (int)round(($cil($o) - (float)$o['zaplaceno']) * 100) . '" width="300" height="300" loading="lazy" alt="QR kód k platbě" style="display:block;margin:0 auto;width:100%;max-width:300px;height:auto">'
      . '<p style="margin:8px 0 0"><b>' . h(kc($cil($o) - (int)$o['zaplaceno'])) . '</b> · VS ' . h($o['vs']) . '<br><span class="muted">' . h(UCET['cislo']) . '</span></p>'
      . '<p class="muted" style="margin:6px 0 0">Po připsání platby se objednávka označí jako zaplacená sama.</p></div></details>';
  }
  if (!empty($o['doklad'])) $s .= '<div style="margin-top:8px"><a class="odk" href="' . h(odkaz_na_doklad($o)) . '">Účtenka č. ' . h($o['doklad']['cislo']) . '</a> <span class="muted">· ' . $zrusitDoklad($o) . '</span></div>';
  elseif ($hotovo && !empty($o['chce_doklad'])) $s .= '<div class="muted" style="margin-top:8px">Účtenka se vystaví, jakmile bude objednávka zaplacená.</div>';
  elseif ($hotovo) $s .= '<div class="muted" style="margin-top:8px">Bez účtenky.</div>';
  if ($dovoz && !$zruseno && !$hotovo) {
    $kam = $o['plna_adresa'] ?? $o['adresa'];
    $waze = !empty($o['gps'])
      ? 'https://waze.com/ul?ll=' . $o['gps'][0] . ',' . $o['gps'][1] . '&navigate=yes'
      : 'https://waze.com/ul?q=' . rawurlencode($kam) . '&navigate=yes';
    $gmaps = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination='
      . (!empty($o['gps']) ? $o['gps'][0] . ',' . $o['gps'][1] : urlencode($kam));
    $s .= '<div class="akce"><a class="nav waze" href="' . h($waze) . '">Navigovat ve Waze</a>'
      . '<a class="nav" href="' . h($gmaps) . '">Google Maps</a></div>';
  }
  if (!$zruseno && empty($o['doklad'])) $s .= $upravit($o);
  // Stornovaná objednávka: jen obnovit – žádné doručení, platba ani QR kód.
  $s .= '<div class="akce">' . ($zruseno ? $tlacitko($o, 'zruseno', 'Obnovit objednávku', false, '0')
    : ($hotovo ? $tlacitko($o, 'doruceno', 'Vrátit: nedoručeno', false, '0') : $doruceno($o))
      . ($hotovo && empty($o['doklad']) && empty($o['chce_doklad']) && PRODAVAJICI['ico'] !== '' ? $tlacitko($o, 'doklad', 'Vystavit účtenku') : '')
      . (!$zaplaceno($o) || !empty($o['zaplaceno_hotove']) ? $tlacitko($o, 'hotove', empty($o['zaplaceno_hotove']) ? 'Zaplaceno na místě' : 'Zrušit: zaplaceno na místě', false, empty($o['zaplaceno_hotove']) ? '1' : '0') : '')
      . $tlacitko($o, 'zruseno', 'Stornovat', false, '1', $potvrditStorno($o)))
    . '</div></div>';
  return $s;
};

$obsah = hlavicka('Objednávky', ['?uctenky=1' => 'Účtenky', '?skupiny=1' => 'Skupiny', 'nastaveni.php' => 'Nastavení']) . '<main>' . $hlaseniHtml;
if (!$dny) {
  $obsah .= '<p class="box">Zatím žádné objednávky z e-shopu.</p>';
} else {
  // Proužek dnů: od dneška nejvýš 7 dnů s objednávkami (a zvolený den); ostatní dny jsou ve výběru „Jiný den“.
  $prouzek = array_slice(array_values(array_filter($datovane, fn($d) => $d >= $dnes)), 0, 7);
  if ($vybrany !== 'bez-terminu' && !in_array($vybrany, $prouzek, true)) { $prouzek[] = $vybrany; sort($prouzek); }
  if (isset($dny['bez-terminu'])) $prouzek[] = 'bez-terminu';
  $obsah .= '<nav class="dny" aria-label="Dny">';
  foreach ($prouzek as $d) {
    $pozor = $minuly($d) && $dny[$d]['otevrene'] > 0;
    $obsah .= '<a href="?den=' . urlencode($d) . '"' . ($d === $vybrany ? ' class="akt" aria-current="page"' : ($pozor ? ' class="pozor"' : '')) . '>'
      . h($kratce($d)) . ' <small>' . $dny[$d]['pocet'] . '</small>' . ($pozor ? ' ⚠' : '') . '</a>';
  }
  // Zvolený den posunout do viditelné části proužku (jen vodorovně – stránka zůstane u karty po akci).
  $obsah .= '</nav><script>{const n=document.querySelector(".dny"),a=n&&n.querySelector("[aria-current]");if(a&&a.offsetLeft+a.offsetWidth>n.clientWidth)n.scrollLeft=a.offsetLeft-16}</script>';
  $ostatni = array_values(array_diff($datovane, $prouzek));
  if ($ostatni) {
    $moznost = fn(string $d): string => '<option value="' . h($d) . '">' . h($nazevDne($d)) . ' (' . $dny[$d]['pocet'] . ')'
      . ($minuly($d) && $dny[$d]['otevrene'] ? ' ⚠ nevyřízené: ' . $dny[$d]['otevrene'] : '') . '</option>';
    $pozdeji = array_filter($ostatni, fn($d) => $d > $dnes);
    $starsi = array_reverse(array_filter($ostatni, fn($d) => $d < $dnes));
    $obsah .= '<form method="get" class="jiny-den"><label for="jiny-den" class="muted">Jiný den:</label><select id="jiny-den" name="den" onchange="if(this.value)this.form.submit()"><option value="">vyberte…</option>'
      . ($pozdeji ? '<optgroup label="Později">' . implode('', array_map($moznost, $pozdeji)) . '</optgroup>' : '')
      . ($starsi ? '<optgroup label="Starší">' . implode('', array_map($moznost, $starsi)) . '</optgroup>' : '')
      . '</select><noscript><button class="btn">Zobrazit</button></noscript></form>';
  }
  // Minulé dny s nedoručenými / nezaplacenými objednávkami nebo s upozorněním k platbě – ať nezapadnou.
  $zpozdene = array_values(array_filter(array_reverse($datovane), fn($d) => $minuly($d) && $dny[$d]['otevrene'] > 0 && $d !== $vybrany));
  if ($zpozdene) {
    $obsah .= '<div class="box pozor nevyrizene"><b>⚠ Nevyřízené objednávky z minulých dnů</b><br><span class="muted">nedoručené, nezaplacené nebo s upozorněním k platbě</span><br>';
    foreach (array_slice($zpozdene, 0, 4) as $d) $obsah .= '<a class="btn" href="?den=' . urlencode($d) . '">' . h($kratce($d)) . ': ' . $dny[$d]['otevrene'] . '×</a>';
    $dalsi = count($zpozdene) - 4;
    if ($dalsi > 0) $obsah .= '<p class="muted" style="margin:8px 0 0">…a ' . ($dalsi === 1 ? 'další 1 den' : ($dalsi < 5 ? "další $dalsi dny" : "dalších $dalsi dnů")) . ' ve výběru „Jiný den“.</p>';
    $obsah .= '</div>';
  }
  $suma = array_sum(array_map(fn($o) => (int)(($o['celkem'] ?? 0) ?: $o['castka']), $aktivni));
  $nadpis = $nazevDne($vybrany);
  $obsah .= '<h2>' . h(mb_strtoupper(mb_substr($nadpis, 0, 1)) . mb_substr($nadpis, 1)) . ($vybrany === $dnes ? ' · dnes' : ($vybrany === $zitra ? ' · zítra' : '')) . '</h2>'
    . '<p class="muted">' . count($rozvoz) . '× rozvoz · ' . count($odber) . '× osobní odběr · celkem ' . h(kc($suma)) . '</p>';
  if ($minuly($vybrany) && $dny[$vybrany]['otevrene'] > 0) {
    $obsah .= '<p class="box pozor err">⚠ Tento den už minul a nevyřízené objednávky tu jsou pořád (' . $dny[$vybrany]['otevrene'] . '×). Označte je jako doručené a zaplacené, případně je stornujte.</p>';
  }

  $naRozvoz = $pripravit($rozvoz);
  $naOdber = $pripravit($odber);
  if ($naRozvoz || $naOdber) {
    $obsah .= '<div class="box"><b>Co připravit</b>'
      . ($naRozvoz ? '<h3>Na rozvoz (' . count($rozvoz) . '×)</h3>' . $tabulkaPripravit($naRozvoz) : '')
      . ($naOdber ? '<h3>Na osobní odběr (' . count($odber) . '×)</h3>' . $tabulkaPripravit($naOdber) : '')
      . '</div>';
  }

  if ($rozvoz) {
    $obsah .= '<h2>Rozvoz</h2>';
    $mapa = [];
    foreach ($zastavky as $z) if ($z['gps']) $mapa[] = [
      'n' => $z['n'], 'gps' => $z['gps'], 'adr' => ($z['obj'][0]['adresa'] ?? '') ?: $z['adresa'],
      'hotovo' => !array_filter($z['obj'], fn($o) => empty($o['doruceno'])),
      'obj' => array_map(fn($o) => [
        'z' => $o['znacka'], 'vs' => $o['vs'], 'jm' => $o['jmeno'], 'co' => $o['polozky'] ?? [], 'hotovo' => !empty($o['doruceno']),
        'vybrat' => $zaplaceno($o) ? 'zaplaceno' : ($prevodem($o) ? 'čeká na převod ' : 'vybrat ') . kc($cil($o) - (int)$o['zaplaceno']),
      ], $z['obj']),
    ];
    if ($mapa) $obsah .= '<div id="mapa"></div>' . ($trasa ? '<p class="muted">Nejkratší okruh ze statku a zpět: <b>' . h(str_replace('.', ',', (string)$trasa['km'])) . ' km</b>, cca <b>' . h(intdiv($trasa['min'], 60) ? intdiv($trasa['min'], 60) . ' h ' . ($trasa['min'] % 60) . ' min' : $trasa['min'] . ' min') . '</b> jízdy. Čísla zastávek odpovídají pořadí jízdy.</p>' : '<p class="muted">Trasu po silnicích se teď nepodařilo spočítat – pořadí je podle vzdušné vzdálenosti.</p>');
    if (count($zastavky) < count($rozvoz)) $obsah .= '<p class="muted">Objednávky na stejnou adresu (např. skupina) jsou jedna zastávka – na kartách s písmeny 3a, 3b…</p>';
    // Navigace jen přes nedoručené zastávky a od místa, kde telefon právě je (bez „origin“ začne Google Maps tam).
    $zbyvajici = array_values(array_filter($zastavky, fn($z) => (bool)array_filter($z['obj'], fn($o) => empty($o['doruceno']))));
    if (!$zbyvajici) {
      $obsah .= '<p class="box">✓ Všechny zastávky jsou doručené.</p>';
    } else {
      $adresy = array_map(fn($z) => str_replace('|', ' ', $z['adresa']), array_slice($zbyvajici, 0, 9));
      $posledni = array_pop($adresy);
      $navigace = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' . urlencode($posledni) . ($adresy ? '&waypoints=' . urlencode(implode('|', $adresy)) : '');
      $n = count($zbyvajici);
      $text = $n > 9 ? 'Navigovat dalších 9 zastávek' : ($n === count($zastavky) ? 'Navigovat celou trasu'
        : ($n === 1 ? 'Navigovat na poslední zastávku' : ($n < 5 ? "Navigovat zbývající $n zastávky" : "Navigovat zbývajících $n zastávek")));
      $obsah .= '<div class="akce"><a class="hl" href="' . h($navigace) . '">' . h($text) . ' (Google Maps)</a></div>'
        . '<p class="muted">Navigace začne tam, kde právě jste, a doručené zastávky vynechá.'
        . ($n > 9 ? ' Google Maps v telefonu zvládne najednou jen 9 zastávek – až je označíte jako doručené, tlačítko nabídne další.' : '') . '</p>';
    }
    $vybrat = array_sum(array_map(fn($o) => !empty($o['doruceno']) || $zaplaceno($o) || $prevodem($o) ? 0 : max(0, $cil($o) - (int)$o['zaplaceno']), $rozvoz));
    if ($vybrat > 0) $obsah .= '<p><b>Zbývá vybrat na místě: ' . h(kc($vybrat)) . '</b> <span class="muted">(hotově nebo QR kódem)</span></p>';
    foreach ($rozvoz as $o) $obsah .= $karta($o);
    if ($mapa) {
      // Leaflet z cdnjs s kontrolním součtem (SRI): pozměněný soubor prohlížeč nespustí (mapa pak jen chybí, přehled funguje dál).
      $obsah .= '<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js" integrity="' . LEAFLET_JS_SRI . '" crossorigin="anonymous" referrerpolicy="no-referrer"></script><script>'
        . 'if(window.L){const b=' . json_encode($mapa, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) . ',f=' . json_encode($farma) . ',t=' . json_encode($trasa['cara'] ?? null) . ';'
        . 'const m=L.map("mapa");L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,referrerPolicy:"strict-origin-when-cross-origin",attribution:"© OpenStreetMap"}).addTo(m);'
        . 'const e=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));'
        . 'const pts=[];if(f){L.circleMarker(f,{radius:8,color:"#17241a",fillOpacity:1}).addTo(m).bindPopup("Statek – start a cíl");pts.push(f)}'
        // Jedna značka na zastávku (šedá = vše doručeno); v okénku všechny objednávky na tomto místě s odkazem na kartu.
        . 'b.forEach(x=>{L.marker(x.gps,{icon:L.divIcon({className:"",html:`<span class="cislo${x.hotovo?" hotova":""}">${x.n}</span>`,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(m)'
        . '.bindPopup(`<b>${x.n}. ${e(x.adr)}</b>`+x.obj.map(o=>`<p><a href="#o${e(o.vs)}"><b>${e(o.z)} ${e(o.jm)}</b></a>${o.hotovo?" ✓ doručeno":""}<br>${o.co.map(e).join("<br>")}<br><b>${e(o.vybrat)}</b></p>`).join(""),{maxHeight:300});pts.push(x.gps)});'
        . 'if(t){L.polyline(t,{color:"#2f5a33",weight:5,opacity:.75}).addTo(m)}else{L.polyline(pts,{color:"#2f5a33",weight:3,opacity:.6,dashArray:"6 6"}).addTo(m)}'
        . 'm.fitBounds(t||pts,{padding:[30,30]})}</script>';
    }
  }
  if ($odber) {
    $obsah .= '<h2>Osobní odběr – Krtely</h2>';
    foreach ($odber as $o) $obsah .= $karta($o);
  }
  if ($zrusene) {
    $obsah .= '<h2>Stornované</h2>';
    foreach ($zrusene as $o) $obsah .= $karta($o);
  }
  if (!$aktivni && !$zrusene) $obsah .= '<p class="box">Na tento den nejsou objednávky.</p>';
}
if (PRODAVAJICI['ico'] === '') $obsah .= '<p class="box muted">Účtenky se začnou vystavovat automaticky po doplnění IČO do nastavení webu.</p>';
$obsah .= '<p class="muted" style="margin-top:28px">Objednávky z e-shopu. Platby převodem se označí samy podle upozornění z banky.</p>' . paticka() . '</main>';
stranka('Objednávky a rozvoz', $obsah, '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" integrity="' . LEAFLET_CSS_SRI . '" crossorigin="anonymous" referrerpolicy="no-referrer">');
