<?php
// Nastavení e-shopu: heslo ke schránce objednavky@ (odesílání e-mailů, záložní přihlášení farmy)
// a ke schránce SCHRANKA_PLATEB (pavel@, upozornění banky pro párování plateb).
// Heslo se uloží jen tehdy, když se s ním skutečně podaří přihlásit – nikdo cizí ho tedy nezmění.
// Jakmile je heslo uložené, je stránka (log, diagnostika, odhlášení zařízení) jen pro přihlášenou farmu.
// Formulář na heslo zůstává i bez přihlášení: když se změní heslo ke schránce, nechodí ani e-maily s odkazem
// pro přihlášení – správné heslo ke schránce pak telefon rovnou přihlásí (kdo ho zná, přečte si i ten e-mail).
require __DIR__ . '/_spolecne.php';
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');
// same-origin, ne no-referrer: s no-referrer posílá prohlížeč u formuláře „Origin: null“ a cizi_puvod() by ho odmítla.
header('Referrer-Policy: same-origin');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && cizi_puvod()) { http_response_code(403); exit('Formulář odeslaný z cizí stránky.'); }

// Poškozený soubor s nastavením: nic neukládat (klíče účtenek a přihlášení by se ztratily), jen ohlásit.
try {
  $n = nastaveni();
  $poskozeno = false;
} catch (RuntimeException $e) {
  $n = [];
  $poskozeno = true;
}
$prihlasen = !$poskozeno && prihlasen();
$prvni = !$poskozeno && empty($n['heslo']); // úplně první nastavení – stránka je ještě celá veřejná
$plna = $prihlasen || $prvni;

$zprava = '';
$chyba = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$poskozeno) {
  $akce = retezec($_POST['akce'] ?? 'heslo');
  if ($akce === 'microsoft-tajny' && $prihlasen) {
    // Tajný klíč aplikace v Microsoft Entra pro tlačítko „Přihlásit přes Microsoft“ (api/microsoft.php).
    $tajny = trim(retezec($_POST['tajny'] ?? ''));
    if (strlen($tajny) < 20) { $zprava = 'Tohle nevypadá jako tajný klíč – vložte „Hodnotu“ (Value), ne „ID tajného kódu“.'; $chyba = true; }
    else {
      zmenit_nastaveni(function (array &$n) use ($tajny) { $n['microsoft_tajny'] = $tajny; $n['microsoft_tajny_ulozeno'] = date('c'); });
      $n = nastaveni();
      $zprava = 'Hotovo – na přihlašovací stránce přehledu objednávek je teď tlačítko „Přihlásit přes Microsoft“.';
    }
  }
  if ($akce === 'heslo-farmy' && $prihlasen) {
    // Heslo pro přihlášení k přehledu objednávek (místo odkazu z e-mailu). Ukládá se jen jeho otisk.
    $nove = retezec($_POST['nove'] ?? ''); $znovu = retezec($_POST['znovu'] ?? '');
    if (mb_strlen($nove) < 8) { $zprava = 'Heslo musí mít aspoň 8 znaků.'; $chyba = true; }
    elseif ($nove !== $znovu) { $zprava = 'Hesla se neshodují.'; $chyba = true; }
    else {
      zmenit_nastaveni(function (array &$n) use ($nove) { $n['heslo_farmy'] = password_hash($nove, PASSWORD_DEFAULT); $n['heslo_farmy_zmeneno'] = date('c'); });
      $n = nastaveni();
      $zprava = 'Hotovo – k přehledu objednávek se teď přihlásíte tímto heslem. Odkaz z e-mailu zůstává jako záloha, kdybyste heslo zapomněli.';
    }
  } elseif ($akce === 'odhlasit-vse' && $prihlasen) {
    odhlasit_vsechna_zarizeni();
    prihlasit_zarizeni(); // tento telefon / počítač zůstane přihlášený
    $zprava = 'Hotovo – všechna ostatní zařízení jsou odhlášená. Tady zůstáváte přihlášení. Odkazy na účtenky u zákazníků fungují dál.';
  } elseif ($akce === 'heslo-platby' && $prihlasen) {
    // Heslo ke schránce s upozorněními banky – jen pro přihlášenou farmu.
    $heslo = retezec($_POST['heslo'] ?? '');
    if (!limit('nastaveni', 5, 3600)) {
      $zprava = 'Příliš mnoho pokusů. Zkuste to za hodinu.'; $chyba = true;
    } elseif ($heslo === '') {
      $zprava = 'Zadejte heslo.'; $chyba = true;
    } else {
      try {
        (new Imap(SCHRANKA_PLATEB, $heslo))->konec();
        zmenit_nastaveni(function (array &$n) use ($heslo) { $n['heslo_platby'] = $heslo; $n['heslo_platby_ulozeno'] = date('c'); });
        $n = nastaveni();
        $zprava = 'Hotovo – přihlášení do schránky ' . SCHRANKA_PLATEB . ' funguje a párování plateb je zapnuté. Upozornění z banky se projdou při příští kontrole (do pár minut).';
      } catch (RuntimeException $e) {
        $zprava = 'Nepodařilo se přihlásit: ' . $e->getMessage() . '. Heslo nebylo uloženo.'; $chyba = true;
      }
    }
  } elseif ($akce === 'heslo') {
    $heslo = retezec($_POST['heslo'] ?? '');
    if (!limit('nastaveni', 5, 3600)) {
      $zprava = 'Příliš mnoho pokusů. Zkuste to za hodinu.'; $chyba = true;
    } elseif ($heslo === '') {
      $zprava = 'Zadejte heslo.'; $chyba = true;
    } else {
      try {
        (new Imap(ODESILATEL, $heslo))->konec();
        // Ostatní nastavení (klíče účtenek a přihlášení) zůstává – odkazy na účtenky ani přihlášení se nerozbijí.
        zmenit_nastaveni(function (array &$n) use ($heslo) { $n['heslo'] = $heslo; $n['ulozeno'] = date('c'); });
        if (!$prihlasen && !$prvni) {
          // Heslo ke schránce prokázalo, že jde o farmu: tento telefon se rovnou přihlásí k přehledu objednávek.
          prihlasit_zarizeni();
          $prihlasen = $plna = true;
          $zprava = 'Hotovo – heslo ke schránce je uložené a tento telefon je přihlášený k přehledu objednávek.';
        } else {
          $zprava = 'Hotovo – přihlášení do schránky funguje.'
            . ($prihlasen ? '' : ' Teď se přihlaste k přehledu objednávek (rozvoz.php) – nastavení pak bude jen pro přihlášené.');
        }
        $n = nastaveni();
      } catch (RuntimeException $e) {
        $zprava = 'Nepodařilo se přihlásit: ' . $e->getMessage() . '. Heslo nebylo uloženo.'; $chyba = true;
      }
    }
  }
}

$stav = nacist_json('stav.json', []);
$ochrana = @file_get_contents(DATA . '/.htaccess') !== false;

// Vidí server skutečné IP adresy návštěvníků, nebo jen adresu CDN před hostingem? (Na tom stojí limity proti zneužití.)
function diagnostika_ip(): string {
  $ra = (string)($_SERVER['REMOTE_ADDR'] ?? '');
  $xff = array_values(array_filter(array_map('trim', explode(',', retezec($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')))));
  $xri = trim(retezec($_SERVER['HTTP_X_REAL_IP'] ?? ''));
  $s = "REMOTE_ADDR: $ra\nX-Forwarded-For: " . ($xff ? implode(', ', $xff) : '–') . "\nX-Real-IP: " . ($xri !== '' ? $xri : '–')
    . "\nIP pro limity: " . ip_klienta() . "\n";
  if (!$xff && $xri === '') return $s . 'Požadavek nešel přes CDN (nebo CDN adresu návštěvníka nepředává) – limity počítají podle REMOTE_ADDR.';
  if (ip_klienta() === ($xff[0] ?? $xri) || ip_klienta() === $xri) return $s . 'V pořádku: server vidí skutečnou IP návštěvníka – limity platí pro každého zvlášť.';
  return $s . 'POZOR: server vidí místo návštěvníka adresu CDN (' . $ra . '). Limity proti zneužití pak platí pro všechny návštěvníky dohromady.'
    . ' Rozsah adres CDN patří do DUVERYHODNE_PROXY v api/_spolecne.php – dejte vědět správci webu.';
}

// PHP2Shell (CVE-2026-109618, CVE-2026-109619): chyba v samotném PHP, opravená 21. 10. 2026 v těchto verzích.
// Opravit ji může jen hosting (Wedos aktualizuje PHP, větev se volí v administraci webhostingu); kód webu ne.
// Starší větve (8.1 a dřív) opravu nedostaly. Verze PHP se ukazuje jen přihlášené farmě – veřejně nikdy.
const PHP2SHELL_OPRAVENO = ['8.5' => '8.5.12', '8.4' => '8.4.27', '8.3' => '8.3.36', '8.2' => '8.2.35'];

function stav_php2shell(): string {
  $vetev = PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;
  $oprava = PHP2SHELL_OPRAVENO[$vetev] ?? null;
  if ($oprava !== null) {
    return version_compare(PHP_VERSION, $oprava, '>=') ? "opraveno (oprava je od $oprava)"
      : "NEOPRAVENO – potřeba aspoň PHP $oprava; dokud ji Wedos nenasadí, dejte vědět správci webu";
  }
  if (version_compare($vetev, '8.2', '<')) {
    return "NEOPRAVENO – větev $vetev opravu nedostala; v administraci Wedosu přepněte na PHP 8.4 nebo 8.5";
  }
  return "nelze určit (větev $vetev v seznamu opravených není) – ověřte u Wedosu";
}
?><!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><title>Nastavení e-shopu</title>
<style><?= CSS_HLAVICKY_FARMY ?>
:root{--sirka:552px}body{margin:0;background:#f8f5ef;color:#1d231c;font:16px/1.5 Arial,Helvetica,sans-serif}
main{box-sizing:border-box;max-width:552px;margin:0 auto;padding:24px 16px 40px}
h2{font:normal 21px Georgia,serif;margin:0 0 8px}
.box{background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:20px;margin:20px 0}.box>p:first-child{margin-top:0}.box>:last-child{margin-bottom:0}
.formulare{margin-top:20px}.formulare>.box{margin:0 0 20px}
label{display:block;font-size:14px;margin-bottom:6px}
input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #dfd7c9;border-radius:6px;font-size:16px}
button{margin-top:12px;background:#2f5a33;color:#fff;border:0;border-radius:6px;padding:12px 18px;font-size:16px;cursor:pointer}
button.cervene{background:#8c2f2b}
.ok{color:#2f5a33;font-weight:bold}.err{color:#8c2f2b;font-weight:bold}.muted{color:#6b6f66;font-size:14px}
a{color:#2f5a33}
/* Na počítači (přihlášená farma): stav nahoře, formuláře ve dvou sloupcích, log odeslaných e-mailů dole. */
@media (min-width:1000px){main.siroka{max-width:1072px}:root:has(main.siroka){--sirka:1072px}.siroka .formulare{columns:2;column-gap:24px}.formulare>.box{break-inside:avoid}}
</style></head><body>
<?= hlavicka_farmy('Nastavení', $prihlasen) ?>
<main<?= $prihlasen ? ' class="siroka"' : '' ?>>
<?php if ($poskozeno): ?>
<p class="box err">Soubor s nastavením na hostingu je poškozený a nepodařilo se ho obnovit ze zálohy. Nic tu teď neměňte
  (klíče odkazů na účtenky by se ztratily) a ozvěte se prosím správci webu.</p>
<?php elseif (!$plna): ?>
<p>Přehled objednávek se přihlašuje odkazem z e-mailu (<a href="rozvoz.php">rozvoz.php</a>).
  Když e-mail s odkazem nepřichází – třeba proto, že se změnilo heslo ke schránce <?= h(ODESILATEL) ?> –,
  zadejte tady heslo k této schránce. Pokud se s ním podaří do schránky přihlásit, uloží se a tento telefon se rovnou přihlásí.</p>
<?php else: ?>
<p class="muted">Platby převodem se párují podle upozornění České spořitelny, která chodí do schránky <?= h(SCHRANKA_PLATEB) ?>.
  Připíšou se jen upozornění, která opravdu poslala banka (s jejím platným elektronickým podpisem).</p>
<?php endif ?>
<?php if ($zprava): ?><p class="<?= $chyba ? 'err' : 'ok' ?>" role="<?= $chyba ? 'alert' : 'status' ?>"><?= h($zprava) ?></p><?php endif ?>
<?php if ($plna): ?>
<div class="box">
  <p>Párování plateb: <?= empty($n['heslo_platby']) ? '<span class="err">nenastaveno</span> – chybí heslo ke schránce ' . h(SCHRANKA_PLATEB) : '<span class="ok">zapnuto</span> (' . h(SCHRANKA_PLATEB) . ')' ?></p>
  <?php if (!empty($stav['kontrola'])): ?><p class="muted">Poslední kontrola schránky: <?= h(date('j. n. Y H:i', (int)$stav['kontrola'])) ?></p><?php endif ?>
  <?php if (!empty($stav['chyba'])): ?><p class="err">Poslední chyba: <?= h((string)$stav['chyba']) ?></p><?php endif ?>
  <?php if ($prihlasen && !empty($stav['odmitnuto']['cas'])): ?><p class="muted">Poslední nepřijaté upozornění na platbu (<?= h(date('j. n. Y H:i', strtotime($stav['odmitnuto']['cas']))) ?>): <?= h((string)($stav['odmitnuto']['duvod'] ?? '')) ?></p><?php endif ?>
  <?php if (!$ochrana): ?><p class="err">Chybí ochrana složky s daty (.htaccess) – nezadávejte heslo a ozvěte se správci webu.</p><?php endif ?>
</div>
<?php endif ?>
<?php if ($plna && isset($_GET['diagnostika'])): ?>
<div class="box"><p><b>Diagnostika spojení z hostingu</b></p><pre class="muted" style="margin:0;white-space:pre-wrap"><?php
  // Verze PHP jen pro přihlášenou farmu (při úplně prvním nastavení je stránka veřejná).
  if ($prihlasen) echo h('PHP ' . PHP_VERSION . ' (' . php_sapi_name() . ') – PHP2Shell (CVE-2026-109618/109619): ' . stav_php2shell()) . "\n\n";
  foreach (array_merge([IMAP_SERVER], SMTP_SERVERY) as $srv) {
    $t = microtime(true); $c = @stream_socket_client($srv, $en, $es, 6);
    echo h($srv) . ': ' . ($c ? 'OK' : 'NELZE (' . h((string)$es) . ')') . ' ' . round((microtime(true) - $t) * 1000) . " ms
";
    if ($c) fclose($c);
  }
  echo "\n" . h(diagnostika_ip());
?></pre></div>
<?php endif ?>
<div class="formulare">
<?php if ($ochrana && $prihlasen && !$poskozeno): ?>
<form method="post" class="box" autocomplete="off">
  <input type="hidden" name="akce" value="heslo-platby">
  <h2>Párování plateb</h2>
  <p class="muted">Upozornění České spořitelny na příchozí platby chodí do schránky <?= h(SCHRANKA_PLATEB) ?>. Web z ní čte jen zprávy od banky.</p>
  <label for="heslo-platby">Heslo ke schránce <?= h(SCHRANKA_PLATEB) ?></label>
  <input id="heslo-platby" name="heslo" type="password" required>
  <button type="submit"><?= empty($n['heslo_platby']) ? 'Zapnout párování' : 'Změnit heslo' ?></button>
  <p class="muted">Heslo se uloží jen pokud se s ním podaří přihlásit. Uloží se na hostingu do chráněné složky, nikam se neposílá.</p>
</form>
<?php endif ?>
<?php if ($ochrana && !$poskozeno): ?>
<form method="post" class="box" autocomplete="off">
  <input type="hidden" name="akce" value="heslo">
  <?php if ($plna): ?><h2>Odesílání e-mailů</h2>
  <p class="muted">Z této schránky chodí e-maily zákazníkům (potvrzení objednávek, účtenky) i odkazy pro přihlášení.</p><?php endif ?>
  <label for="heslo">Heslo ke schránce <?= h(ODESILATEL) ?></label>
  <input id="heslo" name="heslo" type="password" required>
  <button type="submit"><?= empty($n['heslo']) ? 'Uložit heslo' : ($plna ? 'Změnit heslo' : 'Uložit heslo a přihlásit') ?></button>
  <p class="muted">Heslo se uloží jen pokud se s ním podaří přihlásit. Uloží se na hostingu do chráněné složky, nikam se neposílá.
    Odkazy na účtenky ani přihlášené telefony se změnou hesla nerozbijí.</p>
</form>
<?php endif ?>
<?php if ($prihlasen && !$poskozeno): ?>
<form method="post" class="box" autocomplete="off">
  <input type="hidden" name="akce" value="heslo-farmy">
  <h2>Heslo k objednávkám</h2>
  <p class="muted"><?= empty($n['heslo_farmy']) ? 'Zatím se k přehledu objednávek přihlašuje odkazem z e-mailu. Nastavte heslo a příště stačí zadat jen to.'
    : 'Heslo je nastavené (' . h(date('j. n. Y', strtotime($n['heslo_farmy_zmeneno'] ?? 'now'))) . '). Tady ho můžete změnit.' ?></p>
  <label for="nove">Nové heslo (aspoň 8 znaků)</label>
  <input id="nove" name="nove" type="password" autocomplete="new-password" minlength="8" required>
  <label for="znovu">Heslo znovu</label>
  <input id="znovu" name="znovu" type="password" autocomplete="new-password" minlength="8" required>
  <button type="submit"><?= empty($n['heslo_farmy']) ? 'Nastavit heslo' : 'Změnit heslo' ?></button>
</form>
<form method="post" class="box" autocomplete="off">
  <input type="hidden" name="akce" value="microsoft-tajny">
  <h2>Přihlášení přes Microsoft</h2>
  <p class="muted"><?= empty($n['microsoft_tajny'])
    ? 'Vypnuto. Zapne se vložením tajného klíče aplikace „Ovocnářství Holub – objednávky (farma)“ z Microsoft Entra (Certifikáty a tajné kódy → Hodnota).'
    : 'Zapnuto (klíč uložen ' . h(date('j. n. Y', strtotime($n['microsoft_tajny_ulozeno'] ?? 'now'))) . '). Klíč má omezenou platnost – po vypršení vytvořte v Entra nový a vložte ho sem.' ?></p>
  <label for="tajny">Tajný klíč (Value)</label>
  <input id="tajny" name="tajny" type="password" autocomplete="off" required>
  <button type="submit"><?= empty($n['microsoft_tajny']) ? 'Zapnout' : 'Změnit klíč' ?></button>
</form>
<?php endif ?>
<?php if ($prihlasen): ?>
<form method="post" class="box" onsubmit="return confirm('Odhlásit všechny ostatní telefony a počítače? Tady zůstanete přihlášení.')">
  <input type="hidden" name="akce" value="odhlasit-vse">
  <h2>Ztracený telefon?</h2>
  <p class="muted">Tlačítko odhlásí z přehledu objednávek všechna ostatní zařízení. Na nich se pak dá znovu přihlásit jen odkazem z e-mailu @ovoce-holub.cz (nebo heslem ke schránce na této stránce).
    Odkazy na účtenky u zákazníků fungují dál.</p>
  <button type="submit" class="cervene">Odhlásit všechna zařízení</button>
</form>
<?php endif ?>
</div>
<?php
// Log je jen pro přihlášené: druh e-mailu, číslo objednávky a zkrácená adresa (starší řádky se maskují při zobrazení).
$log = $prihlasen ? array_slice(@file(DATA . '/log.txt', FILE_IGNORE_NEW_LINES) ?: [], -15) : [];
if ($log): ?>
<div class="box"><p><b>Poslední odeslané e-maily</b></p>
<pre class="muted" style="white-space:pre-wrap;margin:0"><?= h(implode("\n", array_map('maskovat_radek_logu', array_reverse($log)))) ?></pre></div>
<?php endif ?>
</main></body></html>
