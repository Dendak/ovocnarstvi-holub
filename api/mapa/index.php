<?php
// Mapa rozvozu do Rakouska – jen pro přihlášené (e-mail + heslo).
// Stránku a excely nahrává workflow soukromého repa Dendak/mapa-rozvozu-ovoce přes FTP do api/data/mapa/
// (přes web nepřístupné), tenhle skript je vydá jen přihlášenému. Heslo si každý nastaví sám odkazem
// z e-mailu, na serveru je jen jeho otisk (data/mapa-ucty.json).
require __DIR__ . '/../_spolecne.php';
header('X-Robots-Tag: noindex');

// Kdo smí mapu vidět: sha256 e-mailové adresy malými písmeny. Repo je veřejné, adresy se sem nepíšou čitelně.
// Přidat člověka: printf '%s' 'jmeno@ovoce-holub.cz' | sha256sum
const MAPA_UCTY = [
  'bb667bea656c42676ca7e39038899cd2d66af45607e0bc224ded238772ad74ce',
  '881da21f9b086c1653f3000820a1d3860a6ac4f4dc1f9d235b015a7aa6b7bfad',
];
const MAPA_DATA = DATA . '/mapa';
const MAPA_SOUBORY = ['Obst.xlsx', 'Obst-Vorjahre.xlsx'];
const COOKIE_MAPA = 'oh_mapa';

function mapa_ucet(string $email): string { return hash('sha256', strtolower(trim($email))); }

// Otisk hesla účtu ('' = účet ještě nemá heslo, nebo mapu vidět nesmí).
function mapa_otisk(string $ucet): string {
  if (!in_array($ucet, MAPA_UCTY, true)) return '';
  $o = nacist_json('mapa-ucty.json', [])[$ucet]['heslo'] ?? '';
  return is_string($o) ? $o : '';
}

// Podpis cookie obsahuje i otisk hesla: změna hesla odhlásí ostatní zařízení toho účtu.
function mapa_podpis(string $ucet, int $exp, string $otisk): string {
  return hash_hmac('sha256', "mapa|$ucet|$exp|$otisk", klic('klic_mapa'));
}

// Přihlášený účet z cookie, nebo ''.
function mapa_prihlaseny(): string {
  $c = $_COOKIE[COOKIE_MAPA] ?? '';
  if (!is_string($c)) return '';
  [$ucet, $exp, $podpis] = array_pad(explode('.', $c, 3), 3, '');
  if (!ctype_digit($exp) || (int)$exp <= time() || $podpis === '') return '';
  $otisk = mapa_otisk($ucet);
  return $otisk !== '' && hash_equals(mapa_podpis($ucet, (int)$exp, $otisk), $podpis) ? $ucet : '';
}

function mapa_cookie(string $hodnota, int $exp): void {
  setcookie(COOKIE_MAPA, $hodnota, ['expires' => $exp, 'path' => '/api/mapa/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
}

// Přihlášení platí rok (jako u farmy) a při každém otevření mapy se prodlouží.
function mapa_prihlasit(string $ucet): void {
  $exp = time() + PLATNOST_PRIHLASENI;
  mapa_cookie("$ucet.$exp." . mapa_podpis($ucet, $exp, mapa_otisk($ucet)), $exp);
}

function mapa_stranka(string $titulek, string $obsah): void {
  header('Content-Type: text/html; charset=utf-8');
  echo '<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    . '<meta name="robots" content="noindex"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><title>' . h($titulek) . '</title><style>
:root{--paper:#f8f5ef;--line:#dfd7c9;--ink:#1d231c;--muted:#6b6f66;--leaf:#2f5a33;--berry:#8c2f2b}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.45 Arial,Helvetica,sans-serif}
main{max-width:420px;margin:0 auto;padding:48px 16px}h1{font:normal 24px Georgia,serif;margin:0 0 16px}h2{font:normal 19px Georgia,serif;margin:36px 0 6px}
label{display:block;margin:12px 0 4px;font-size:15px}input{width:100%;padding:12px;border:1px solid var(--line);border-radius:8px;font-size:16px}
button{margin-top:16px;font:inherit;padding:12px 18px;border-radius:8px;border:1px solid var(--leaf);background:var(--leaf);color:#fff;cursor:pointer}
button.vedl{background:#fff;color:var(--ink);border-color:var(--line)}.muted{color:var(--muted);font-size:14px}.err{color:var(--berry);font-weight:bold}.ok{color:var(--leaf);font-weight:bold}
</style></head><body><main>' . $obsah . '</main></body></html>';
  exit;
}

try {
  klic('klic_mapa');
} catch (RuntimeException $e) {
  http_response_code(500);
  mapa_stranka('Mapa rozvozu', '<p>Nastavení webu na hostingu je poškozené. Nic neměňte a ozvěte se prosím správci webu.</p>');
}
$prihlaseny = mapa_prihlaseny();

// Excely, které mapa načítá (fetch("Obst.xlsx")); .htaccess je sem přesměruje jako ?soubor=…
$soubor = retezec($_GET['soubor'] ?? '');
if ($soubor !== '') {
  if ($prihlaseny === '') { http_response_code(401); exit; }
  $cesta = MAPA_DATA . '/' . $soubor;
  if (!in_array($soubor, MAPA_SOUBORY, true) || !is_file($cesta)) { http_response_code(404); exit; }
  header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  header('Content-Length: ' . filesize($cesta));
  // Podle Last-Modified mapa pozná, že se soubor nezměnil, a nepřepočítává ho.
  header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($cesta)) . ' GMT');
  readfile($cesta);
  exit;
}

$chyba = ''; $info = '';
$nastavit = null; // token z e-mailu, pro který se ukáže formulář nového hesla
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  // Formulář odeslaný z cizí stránky se nezpracuje (k cookie se SameSite=Lax druhá pojistka).
  if (cizi_puvod()) { http_response_code(403); exit('Formulář odeslaný z cizí stránky.'); }
  $akce = retezec($_POST['akce'] ?? '');
  $email = strtolower(trim(retezec($_POST['email'] ?? '')));
  if ($akce === 'prihlasit') {
    $heslo = retezec($_POST['heslo'] ?? '');
    $otisk = mapa_otisk(mapa_ucet($email));
    // Omezení pokusů: na jednu adresu i celkově (hádání hesla z více adres).
    if (!limit('mapa-heslo', 10, 3600) || !limit('mapa-heslo-vse', 40, 3600, true)) $chyba = 'Příliš mnoho pokusů, zkuste to za hodinu.';
    elseif ($otisk !== '' && $heslo !== '' && password_verify($heslo, $otisk)) {
      mapa_prihlasit(mapa_ucet($email));
      header('Location: ./', true, 303); exit;
    } else $chyba = 'Špatný e-mail nebo heslo.';
  } elseif ($akce === 'poslat-odkaz') {
    if (!limit('mapa-odkaz', 6, 3600)) $chyba = 'Příliš mnoho pokusů, zkuste to za hodinu.';
    else {
      $ucet = mapa_ucet($email);
      if (in_array($ucet, MAPA_UCTY, true)) {
        $token = bin2hex(random_bytes(24));
        $odkazy = array_filter(nacist_json('mapa-odkazy.json', []), fn($o) => is_array($o) && ($o['exp'] ?? 0) > time());
        $odkazy[hash('sha256', $token)] = ['ucet' => $ucet, 'exp' => time() + 3600];
        ulozit_json('mapa-odkazy.json', $odkazy);
        $odkaz = WEB . '/api/mapa/?t=' . $token;
        poslat_email($email, 'Heslo k mapě rozvozu – Ovocnářství Holub',
          "Pro nastavení hesla k mapě rozvozu otevřete tento odkaz (platí 1 hodinu):
$odkaz

Pokud jste o to nežádali, e-mail ignorujte.
",
          email_html('Heslo k mapě rozvozu', '<p style="line-height:1.5">Pro nastavení hesla k mapě rozvozu klikněte na tlačítko. Odkaz platí 1 hodinu.</p>'
            . '<p><a href="' . h($odkaz) . '" style="display:inline-block;background:#2f5a33;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Nastavit heslo</a></p>'
            . '<p style="font-size:13px;color:#6b6f66">Pokud jste o to nežádali, e-mail ignorujte.</p>'), null, false);
      }
      // Stejná odpověď pro každou adresu – stránka neprozradí, kdo mapu vidět smí.
      $info = 'Pokud adresa smí mapu vidět, přišel na ni e-mail s odkazem pro nastavení hesla (platí 1 hodinu).';
    }
  } elseif ($akce === 'nastavit-heslo') {
    $token = retezec($_POST['t'] ?? '');
    $nove = retezec($_POST['nove'] ?? ''); $znovu = retezec($_POST['znovu'] ?? '');
    $odkazy = nacist_json('mapa-odkazy.json', []);
    $h = hash('sha256', $token);
    $o = $odkazy[$h] ?? null;
    if (!is_array($o) || ($o['exp'] ?? 0) <= time() || !in_array($o['ucet'] ?? '', MAPA_UCTY, true)) $chyba = 'Odkaz už neplatí. Nechte si poslat nový.';
    elseif (mb_strlen($nove) < 8) { $chyba = 'Heslo musí mít aspoň 8 znaků.'; $nastavit = $token; }
    elseif ($nove !== $znovu) { $chyba = 'Hesla se neshodují.'; $nastavit = $token; }
    else {
      $ucty = nacist_json('mapa-ucty.json', []);
      $ucty[$o['ucet']] = ['heslo' => password_hash($nove, PASSWORD_DEFAULT), 'zmeneno' => date('c')];
      unset($odkazy[$h]);
      if (ulozit_json('mapa-ucty.json', $ucty) && ulozit_json('mapa-odkazy.json', $odkazy)) {
        mapa_prihlasit($o['ucet']);
        header('Location: ./', true, 303); exit;
      }
      $chyba = 'Heslo se nepodařilo uložit. Zkuste to prosím znovu.';
      $nastavit = $token;
    }
  } elseif ($akce === 'odhlasit') {
    mapa_cookie('', 1);
    header('Location: ./', true, 303); exit;
  }
} elseif (isset($_GET['t'])) {
  // Odkaz z e-mailu: heslo se nastaví až tlačítkem (e-mailové filtry odkazy předem otevírají).
  $token = retezec($_GET['t']);
  $o = nacist_json('mapa-odkazy.json', [])[hash('sha256', $token)] ?? null;
  if (is_array($o) && ($o['exp'] ?? 0) > time()) $nastavit = $token;
  else $chyba = 'Odkaz už neplatí. Nechte si poslat nový.';
}

$hlaseni = ($chyba !== '' ? '<p class="err">' . h($chyba) . '</p>' : '') . ($info !== '' ? '<p class="ok">' . h($info) . '</p>' : '');

if ($nastavit !== null) {
  mapa_stranka('Heslo k mapě rozvozu', '<h1>Nové heslo k mapě</h1>' . $hlaseni
    . '<form method="post"><input type="hidden" name="akce" value="nastavit-heslo"><input type="hidden" name="t" value="' . h($nastavit) . '">'
    . '<label for="nove">Nové heslo (aspoň 8 znaků)</label><input id="nove" type="password" name="nove" autocomplete="new-password" minlength="8" required>'
    . '<label for="znovu">Heslo znovu</label><input id="znovu" type="password" name="znovu" autocomplete="new-password" minlength="8" required>'
    . '<button>Uložit heslo a přihlásit</button></form>');
}

if ($prihlaseny !== '') {
  if (isset($_GET['odhlasit'])) {
    mapa_stranka('Mapa rozvozu – odhlášení', '<h1>Odhlásit</h1><p>Odhlásit mapu rozvozu na tomto zařízení?</p>'
      . '<form method="post"><input type="hidden" name="akce" value="odhlasit"><button>Odhlásit</button></form>');
  }
  $cesta = MAPA_DATA . '/index.html';
  if (!is_file($cesta)) mapa_stranka('Mapa rozvozu', '<h1>Mapa rozvozu</h1><p>Mapa ještě není nahraná na server.</p>');
  mapa_prihlasit($prihlaseny);
  header('Content-Type: text/html; charset=utf-8');
  readfile($cesta);
  exit;
}

mapa_stranka('Mapa rozvozu – přihlášení', '<h1>Mapa rozvozu</h1>' . $hlaseni
  . '<form method="post"><input type="hidden" name="akce" value="prihlasit">'
  . '<label for="email">E-mail</label><input id="email" type="email" name="email" autocomplete="username" required>'
  . '<label for="heslo">Heslo</label><input id="heslo" type="password" name="heslo" autocomplete="current-password" required>'
  . '<button>Přihlásit</button></form>'
  . '<h2>Poprvé, nebo zapomenuté heslo?</h2><p class="muted">Pošleme vám e-mail s odkazem, přes který si heslo nastavíte.</p>'
  . '<form method="post"><input type="hidden" name="akce" value="poslat-odkaz">'
  . '<label for="email2">E-mail</label><input id="email2" type="email" name="email" autocomplete="username" required>'
  . '<button class="vedl">Poslat odkaz</button></form>');
