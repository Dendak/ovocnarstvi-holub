<?php
// Zákaznické skupiny s kódem (např. „elektron“): vlastní ceny a pevná doručovací adresa.
// Kód se ověřuje tady na serveru (klíčem je jeho otisk sha256), web ho sám nezná.
require __DIR__ . '/_spolecne.php';
header('Content-Type: application/json; charset=utf-8');

// ============================================================
//  SKUPINY – úpravy cen a adres dělejte tady
//  ceny:   cena za 1 kg v Kč podle druhu (jablka, hrusky, svestky, tresne, visne, merunky, broskve);
//          druh, který tu není, má běžnou cenu z e-shopu
//  sleva:  sleva v % na vše ostatní (včetně moštů), 0 = bez slevy
//  adresa: pevná doručovací adresa skupiny (zákazník ji nemůže změnit)
//  Nový kód: klíčem je sha256 kódu psaného malými písmeny.
// ============================================================
function skupiny(): array {
  return [
    '487dc591135f2d67ef68f07e299401d3ead416060a71866ad704084cbee45316' => [
      'id' => 'elektron',
      'nazev' => 'Elektron',
      'ceny' => [],
      'sleva' => 0,
      'adresa' => 'Branišovská 1160/31, 370 05 České Budějovice',
      'gps' => [48.978241, 14.446492],
      'popis' => 'Dovoz na Branišovskou 1160/31 společně s ostatními objednávkami skupiny.',
    ],
  ];
}

$kod = mb_strtolower(trim(mb_substr((string)($_GET['kod'] ?? ''), 0, 40)));
if ($kod === '') { echo json_encode(['ok' => false]); exit; }
if (!limit('skupina', 20, 3600)) { http_response_code(429); echo json_encode(['ok' => false, 'limit' => true]); exit; }

$s = skupiny()[hash('sha256', $kod)] ?? null;
echo json_encode($s ? ['ok' => true, 'skupina' => $s] : ['ok' => false], JSON_UNESCAPED_UNICODE);
