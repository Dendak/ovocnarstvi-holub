<?php
// Účtenka (doklad o prodeji) k objednávce. Otevírá se odkazem s podpisem z e-mailu nebo z přehledu rozvozu.
require __DIR__ . '/_spolecne.php';
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Referrer-Policy: no-referrer');

$vs = preg_replace('/\D/', '', (string)($_GET['vs'] ?? ''));
$o = $vs !== '' ? nacist_json("objednavky/$vs.json") : null;
if (!$o || empty($o['doklad']) || !hash_equals(odkaz_na_doklad($o), WEB . '/api/doklad.php?' . http_build_query(['vs' => $vs, 'k' => (string)($_GET['k'] ?? '')]))) {
  http_response_code(404);
  exit('<!doctype html><meta charset="utf-8"><p style="font-family:Arial;padding:40px">Účtenka nenalezena.</p>');
}

$d = $o['doklad'];
$p = PRODAVAJICI;
$radky = '';
foreach ($o['polozky'] ?? [] as $r) {
  $cena = cena_radku($r);
  $popis = preg_replace('/\s*–\s*[\d\s]+\s*Kč\s*$/u', '', $r);
  $radky .= '<tr><td>' . h($popis) . ($p['platce_dph'] ? ' <span class="muted">· DPH ' . sazba_radku($r) . ' %</span>' : '') . '</td><td class="r">' . ($cena !== null ? h(kc($cena)) : '') . '</td></tr>';
}
if ($radky === '') $radky = '<tr><td colspan="2" style="white-space:pre-line">' . h($o['souhrn']) . '</td></tr>';
$celkem = cil_platby($o);
// Ceny v e-shopu jsou konečné (včetně DPH) – základ a daň se dopočítají.
$rozpis = rozpis_dph($o);
$kc2 = fn(float $x) => number_format($x, 2, ',', ' ') . ' Kč';
$datum = date('j. n. Y', strtotime($d['vystaveno']));
?><!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><title>Účtenka <?= h($d['cislo']) ?> – Ovocnářství Holub</title>
<style>
body{margin:0;background:#f8f5ef;color:#1d231c;font:15px/1.45 Arial,Helvetica,sans-serif}
.list{max-width:640px;margin:24px auto;background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:28px}
h1{font:normal 26px Georgia,serif;margin:0 0 4px}.muted{color:#6b6f66;font-size:13px}
.strany{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0}.strany b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6b6f66;margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin-top:12px}td{padding:8px 0;border-bottom:1px solid #dfd7c9;vertical-align:top}td.r{text-align:right;white-space:nowrap}
.celkem td{font-weight:bold;font-size:17px;border-bottom:0;padding-top:12px}
.tisk{display:block;margin:0 auto 24px;font:inherit;padding:10px 16px;border-radius:8px;border:1px solid #2f5a33;background:#2f5a33;color:#fff;cursor:pointer}
@media print{body{background:#fff}.list{border:0;margin:0;max-width:none}.tisk{display:none}}
@media (max-width:520px){.strany{grid-template-columns:1fr}.list{margin:0;border-radius:0}}
</style></head><body>
<div class="list">
  <p class="muted" style="margin:0">Ovocnářství Holub</p>
  <h1>Účtenka č. <?= h($d['cislo']) ?></h1>
  <p class="muted"><?= $p['platce_dph'] ? 'Zjednodušený daňový doklad' : 'Doklad o prodeji' ?> · objednávka <?= h($o['cislo']) ?></p>
  <div class="strany">
    <div><b>Prodávající</b><?= h($p['jmeno']) ?><br><?= h($p['adresa']) ?><br>IČO: <?= h($p['ico']) ?><?= $p['dic'] ? '<br>DIČ: ' . h($p['dic']) : '' ?><?= !empty($p['telefon']) ? '<br>Tel.: ' . h($p['telefon']) : '' ?>
      <?= $p['zapis'] ? '<br><span class="muted">' . h($p['zapis']) . '</span>' : '' ?></div>
    <div><b>Kupující</b><?= h($o['jmeno']) ?><?= !empty($o['adresa']) ? '<br>' . h($o['adresa']) . ', České Budějovice' : '' ?></div>
  </div>
  <p>Datum vystavení: <?= h($datum) ?><br><?= $p['platce_dph'] ? 'Datum uskutečnění zdanitelného plnění' : 'Datum prodeje' ?>: <?= h(!empty($o['datum']) ? date('j. n. Y', strtotime($o['datum'])) : $datum) ?><br>
    Úhrada: <?= h($d['uhrada']) ?> – uhrazeno</p>
  <table>
    <?= $radky ?>
    <?php if (!empty($o['rozvoz'])): ?><tr><td>Doprava až domů</td><td class="r">v ceně</td></tr><?php endif ?>
    <tr class="celkem"><td>Celkem<?= $p['platce_dph'] ? ' včetně DPH' : '' ?></td><td class="r"><?= h(kc($celkem)) ?></td></tr>
  </table>
  <?php if ($p['platce_dph']): ?>
  <table style="margin-top:4px;font-size:14px">
    <tr><td class="muted">Sazba DPH</td><td class="r muted">Základ daně</td><td class="r muted">DPH</td><td class="r muted">Celkem</td></tr>
    <?php foreach ($rozpis as $sazba => $x): ?>
    <tr><td><?= (int)$sazba ?> %</td><td class="r"><?= h($kc2($x['zaklad'])) ?></td><td class="r"><?= h($kc2($x['dan'])) ?></td><td class="r"><?= h($kc2($x['celkem'])) ?></td></tr>
    <?php endforeach ?>
  </table>
  <p class="muted">Ceny jsou uvedeny včetně DPH.</p>
  <?php else: ?>
  <p class="muted">Prodávající není plátcem DPH.</p>
  <?php endif ?>
</div>
<button class="tisk" onclick="print()">Vytisknout / uložit jako PDF</button>
</body></html>
