<?php
// Večerní přehled na zítra do telefonů farmy (Web Push). Volá ho .github/workflows/platby.yml každých 10 minut;
// pošle se jednou denně mezi 18:05 a 22:00 (po uzávěrce objednávek). Veřejně vrací jen {ok}.
require __DIR__ . '/_spolecne.php';
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
try {
  $vysledek = push_vecerni_prehled();
} catch (Throwable $e) {
  zapsat_log('push: přehled – ' . $e->getMessage());
  $vysledek = 'chyba';
}
echo json_encode(prihlasen() ? ['ok' => true, 'vysledek' => $vysledek] : ['ok' => true], JSON_UNESCAPED_UNICODE);
