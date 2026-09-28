<?php
// Jednorázové nastavení párování plateb: sem se zadá heslo ke schránce objednavky@.
// Heslo se uloží jen tehdy, když se s ním skutečně podaří přihlásit – nikdo cizí ho tedy nezmění.
require __DIR__ . '/_spolecne.php';
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Referrer-Policy: no-referrer');

$zprava = '';
$chyba = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $heslo = (string)($_POST['heslo'] ?? '');
  if (!limit('nastaveni', 5, 3600)) {
    $zprava = 'Příliš mnoho pokusů. Zkuste to za hodinu.'; $chyba = true;
  } elseif ($heslo === '') {
    $zprava = 'Zadejte heslo.'; $chyba = true;
  } else {
    try {
      (new Imap(ODESILATEL, $heslo))->konec();
      ulozit_nastaveni(['heslo' => $heslo, 'ulozeno' => date('c')]);
      $zprava = 'Hotovo – přihlášení do schránky funguje a párování plateb je zapnuté.';
    } catch (RuntimeException $e) {
      $zprava = 'Nepodařilo se přihlásit: ' . $e->getMessage() . '. Heslo nebylo uloženo.'; $chyba = true;
    }
  }
}

$n = nastaveni();
$stav = nacist_json('stav.json', []);
$ochrana = @file_get_contents(DATA . '/.htaccess') !== false;
?><!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Párování plateb</title>
<style>
body{margin:0;background:#f8f5ef;color:#1d231c;font:16px/1.5 Arial,Helvetica,sans-serif}
main{max-width:520px;margin:0 auto;padding:40px 16px}
h1{font:normal 30px Georgia,serif;margin:0 0 8px}
.box{background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:20px;margin:20px 0}
label{display:block;font-size:14px;margin-bottom:6px}
input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #dfd7c9;border-radius:6px;font-size:16px}
button{margin-top:12px;background:#2f5a33;color:#fff;border:0;border-radius:6px;padding:12px 18px;font-size:16px;cursor:pointer}
.ok{color:#2f5a33;font-weight:bold}.err{color:#8c2f2b;font-weight:bold}.muted{color:#6b6f66;font-size:14px}
</style></head><body><main>
<h1>Párování plateb</h1>
<p class="muted">Platby převodem se párují podle upozornění České spořitelny, která chodí do schránky <?= h(ODESILATEL) ?>.</p>
<?php if ($zprava): ?><p class="<?= $chyba ? 'err' : 'ok' ?>"><?= h($zprava) ?></p><?php endif ?>
<div class="box">
  <p>Stav: <?= empty($n['heslo']) ? '<span class="err">nenastaveno</span>' : '<span class="ok">zapnuto</span>' ?></p>
  <?php if (!empty($stav['kontrola'])): ?><p class="muted">Poslední kontrola schránky: <?= h(date('j. n. Y H:i', $stav['kontrola'])) ?></p><?php endif ?>
  <?php if (!empty($stav['chyba'])): ?><p class="err">Poslední chyba: <?= h($stav['chyba']) ?></p><?php endif ?>
  <?php if (!$ochrana): ?><p class="err">Chybí ochrana složky s daty (.htaccess) – nezadávejte heslo a ozvěte se správci webu.</p><?php endif ?>
</div>
<?php $log = array_slice(@file(DATA . '/log.txt', FILE_IGNORE_NEW_LINES) ?: [], -15); if ($log): ?>
<div class="box"><p><b>Poslední odeslané e-maily</b></p>
<pre class="muted" style="white-space:pre-wrap;margin:0"><?= h(implode("\n", array_reverse($log))) ?></pre></div>
<?php endif ?>
<?php if ($ochrana): ?>
<form method="post" class="box" autocomplete="off">
  <label for="heslo">Heslo ke schránce <?= h(ODESILATEL) ?></label>
  <input id="heslo" name="heslo" type="password" required>
  <button type="submit"><?= empty($n['heslo']) ? 'Zapnout párování' : 'Změnit heslo' ?></button>
  <p class="muted">Heslo se uloží jen pokud se s ním podaří přihlásit. Uloží se na hostingu do chráněné složky, nikam se neposílá.</p>
</form>
<?php endif ?>
</main></body></html>
