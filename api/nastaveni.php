<?php
// Nastavení párování plateb: sem se zadá heslo ke schránce objednavky@.
// Heslo se uloží jen tehdy, když se s ním skutečně podaří přihlásit – nikdo cizí ho tedy nezmění.
// Jakmile je heslo uložené, je stránka (log, diagnostika, odhlášení zařízení) jen pro přihlášenou farmu.
// Formulář na heslo zůstává i bez přihlášení: když se změní heslo ke schránce, nechodí ani e-maily s odkazem
// pro přihlášení – správné heslo ke schránce pak telefon rovnou přihlásí (kdo ho zná, přečte si i ten e-mail).
require __DIR__ . '/_spolecne.php';
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Referrer-Policy: no-referrer');

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
  if ($akce === 'odhlasit-vse' && $prihlasen) {
    odhlasit_vsechna_zarizeni();
    prihlasit_zarizeni(); // tento telefon / počítač zůstane přihlášený
    $zprava = 'Hotovo – všechna ostatní zařízení jsou odhlášená. Tady zůstáváte přihlášení. Odkazy na účtenky u zákazníků fungují dál.';
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
          $zprava = 'Hotovo – přihlášení do schránky funguje a párování plateb je zapnuté.'
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
?><!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><title>Nastavení e-shopu</title>
<style>
body{margin:0;background:#f8f5ef;color:#1d231c;font:16px/1.5 Arial,Helvetica,sans-serif}
main{max-width:520px;margin:0 auto;padding:40px 16px}
h1{font:normal 30px Georgia,serif;margin:0 0 8px}h2{font:normal 21px Georgia,serif;margin:0 0 8px}
.box{background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:20px;margin:20px 0}
label{display:block;font-size:14px;margin-bottom:6px}
input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #dfd7c9;border-radius:6px;font-size:16px}
button{margin-top:12px;background:#2f5a33;color:#fff;border:0;border-radius:6px;padding:12px 18px;font-size:16px;cursor:pointer}
button.cervene{background:#8c2f2b}
.ok{color:#2f5a33;font-weight:bold}.err{color:#8c2f2b;font-weight:bold}.muted{color:#6b6f66;font-size:14px}
a{color:#2f5a33}
</style></head><body><main>
<?php if ($prihlasen): ?><p class="muted"><a href="rozvoz.php">← Zpět na objednávky</a></p><?php endif ?>
<h1>Nastavení</h1>
<?php if ($poskozeno): ?>
<p class="box err">Soubor s nastavením na hostingu je poškozený a nepodařilo se ho obnovit ze zálohy. Nic tu teď neměňte
  (klíče odkazů na účtenky by se ztratily) a ozvěte se prosím správci webu.</p>
<?php elseif (!$plna): ?>
<p>Přehled objednávek se přihlašuje odkazem z e-mailu (<a href="rozvoz.php">rozvoz.php</a>).
  Když e-mail s odkazem nepřichází – třeba proto, že se změnilo heslo ke schránce <?= h(ODESILATEL) ?> –,
  zadejte tady heslo k této schránce. Pokud se s ním podaří do schránky přihlásit, uloží se a tento telefon se rovnou přihlásí.</p>
<?php else: ?>
<p class="muted">Platby převodem se párují podle upozornění České spořitelny, která chodí do schránky <?= h(ODESILATEL) ?>.
  Připíšou se jen upozornění, která opravdu poslala banka (s jejím platným elektronickým podpisem).</p>
<?php endif ?>
<?php if ($zprava): ?><p class="<?= $chyba ? 'err' : 'ok' ?>" role="<?= $chyba ? 'alert' : 'status' ?>"><?= h($zprava) ?></p><?php endif ?>
<?php if ($plna): ?>
<div class="box">
  <p>Párování plateb: <?= empty($n['heslo']) ? '<span class="err">nenastaveno</span>' : '<span class="ok">zapnuto</span>' ?></p>
  <?php if (!empty($stav['kontrola'])): ?><p class="muted">Poslední kontrola schránky: <?= h(date('j. n. Y H:i', (int)$stav['kontrola'])) ?></p><?php endif ?>
  <?php if (!empty($stav['chyba'])): ?><p class="err">Poslední chyba: <?= h((string)$stav['chyba']) ?></p><?php endif ?>
  <?php if ($prihlasen && !empty($stav['odmitnuto']['cas'])): ?><p class="muted">Poslední nepřijaté upozornění na platbu (<?= h(date('j. n. Y H:i', strtotime($stav['odmitnuto']['cas']))) ?>): <?= h((string)($stav['odmitnuto']['duvod'] ?? '')) ?></p><?php endif ?>
  <?php if (!$ochrana): ?><p class="err">Chybí ochrana složky s daty (.htaccess) – nezadávejte heslo a ozvěte se správci webu.</p><?php endif ?>
</div>
<?php endif ?>
<?php if ($plna && isset($_GET['diagnostika'])): ?>
<div class="box"><p><b>Diagnostika spojení z hostingu</b></p><pre class="muted" style="margin:0;white-space:pre-wrap"><?php
  foreach (array_merge([IMAP_SERVER], SMTP_SERVERY) as $srv) {
    $t = microtime(true); $c = @stream_socket_client($srv, $en, $es, 6);
    echo h($srv) . ': ' . ($c ? 'OK' : 'NELZE (' . h((string)$es) . ')') . ' ' . round((microtime(true) - $t) * 1000) . " ms
";
    if ($c) fclose($c);
  }
  echo "\n" . h(diagnostika_ip());
?></pre></div>
<?php endif ?>
<?php
// Log je jen pro přihlášené: druh e-mailu, číslo objednávky a zkrácená adresa (starší řádky se maskují při zobrazení).
$log = $prihlasen ? array_slice(@file(DATA . '/log.txt', FILE_IGNORE_NEW_LINES) ?: [], -15) : [];
if ($log): ?>
<div class="box"><p><b>Poslední odeslané e-maily</b></p>
<pre class="muted" style="white-space:pre-wrap;margin:0"><?= h(implode("\n", array_map('maskovat_radek_logu', array_reverse($log)))) ?></pre></div>
<?php endif ?>
<?php if ($ochrana && !$poskozeno): ?>
<form method="post" class="box" autocomplete="off">
  <input type="hidden" name="akce" value="heslo">
  <label for="heslo">Heslo ke schránce <?= h(ODESILATEL) ?></label>
  <input id="heslo" name="heslo" type="password" required>
  <button type="submit"><?= empty($n['heslo']) ? 'Zapnout párování' : ($plna ? 'Změnit heslo' : 'Uložit heslo a přihlásit') ?></button>
  <p class="muted">Heslo se uloží jen pokud se s ním podaří přihlásit. Uloží se na hostingu do chráněné složky, nikam se neposílá.
    Odkazy na účtenky ani přihlášené telefony se změnou hesla nerozbijí.</p>
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
</main></body></html>
