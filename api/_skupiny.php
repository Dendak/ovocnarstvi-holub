<?php
// Zákaznické skupiny s kódem: vlastní ceny, pevná doručovací adresa a omezený počet účtů.
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) { http_response_code(404); exit; }

const SUPABASE_URL = 'https://vautiqafcwlxuyzlfkac.supabase.co';
const SUPABASE_KLIC = 'sb_publishable_CBcBegREJoaGr_o0BYnyuw_Vp0xkCHB'; // veřejný klíč, stejný jako ve webu

// ============================================================
//  SKUPINY – úpravy cen, adres a limitů dělejte tady
//  ceny:   cena za 1 kg v Kč podle druhu (jablka, hrusky, svestky, tresne, visne, merunky, broskve);
//          druh, který tu není, má běžnou cenu z e-shopu
//  sleva:  sleva v % na vše ostatní (včetně moštů), 0 = bez slevy
//  adresa: pevná doručovací adresa skupiny (zákazník ji nemůže změnit)
//  max:    nejvyšší počet zákaznických účtů, které mohou kód používat (0 = bez omezení)
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
      'max' => 10,
    ],
  ];
}

// Členové skupin (účty, které kód uplatnily): data/skupiny.json = [id skupiny => [[uid, email, cas], …]]
function clenove_vse(): array { return nacist_json('skupiny.json', []); }

// Provede změnu seznamu členů pod zámkem, aby se dva současné požadavky nepřepsaly.
function clenove_zmena(callable $zmena) {
  $zamek = fopen(data_cesta('skupiny.lock'), 'c');
  flock($zamek, LOCK_EX);
  $vse = clenove_vse();
  $vysledek = $zmena($vse);
  ulozit_json('skupiny.json', $vse);
  flock($zamek, LOCK_UN);
  return $vysledek;
}

// Přihlášený zákazník podle přístupového tokenu Supabase (null = token neplatí).
function supabase_uzivatel(string $token): ?array {
  if (!preg_match('/^[A-Za-z0-9._~+\/=-]{20,4096}$/', $token)) return null;
  $ctx = stream_context_create(['http' => [
    'timeout' => 8, 'ignore_errors' => true,
    'header' => "apikey: " . SUPABASE_KLIC . "\r\nAuthorization: Bearer $token\r\n",
  ]]);
  $u = json_decode((string)@file_get_contents(SUPABASE_URL . '/auth/v1/user', false, $ctx), true);
  return !empty($u['id']) ? ['uid' => (string)$u['id'], 'email' => (string)($u['email'] ?? '')] : null;
}
