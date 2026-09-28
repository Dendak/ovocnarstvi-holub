<?php
// Párování plateb: přečte ve schránce objednavky@ nová upozornění České spořitelny na příchozí platbu,
// podle variabilního symbolu je spáruje s objednávkami a pošle potvrzení zákazníkovi i farmě.
// Spouští se cronem na Wedos a při návštěvě e-shopu (nejvýš jednou za pár minut).
require __DIR__ . '/_spolecne.php';

const INTERVAL = 180;

header('Content-Type: application/json; charset=utf-8');
function konec(array $d): void { echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }

$n = nastaveni();
if (empty($n['heslo'])) konec(['ok' => false, 'duvod' => 'nenastaveno']);

$zamek = fopen(data_cesta('platby.lock'), 'c');
if (!flock($zamek, LOCK_EX | LOCK_NB)) konec(['ok' => true, 'duvod' => 'bezi']);
$stav = nacist_json('stav.json', []);
if (time() - ($stav['kontrola'] ?? 0) < INTERVAL) konec(['ok' => true, 'duvod' => 'nedavno']);
$stav['kontrola'] = time();
ulozit_json('stav.json', $stav);

try {
  $imap = new Imap(ODESILATEL, $n['heslo']);
} catch (RuntimeException $e) {
  $stav['chyba'] = $e->getMessage();
  ulozit_json('stav.json', $stav);
  konec(['ok' => false, 'duvod' => 'prihlaseni']);
}

[$ok, $radky] = $imap->prikaz('SELECT INBOX');
$uidValidity = preg_match('/UIDVALIDITY (\d+)/', implode('', $radky), $m) ? $m[1] : '';
if (($stav['uidvalidity'] ?? '') !== $uidValidity || isset($_GET['znovu'])) {
  $stav = ['kontrola' => $stav['kontrola'], 'uidvalidity' => $uidValidity, 'posledni' => 0, 'zpracovane' => $stav['zpracovane'] ?? []];
  $hledat = 'UID SEARCH SINCE ' . date('j-M-Y', strtotime('-7 days'));
} else {
  $hledat = 'UID SEARCH UID ' . (($stav['posledni'] ?? 0) + 1) . ':*';
}
[, $radky] = $imap->prikaz($hledat);
$uids = [];
foreach ($radky as $r) if (preg_match('/^\* SEARCH ([\d ]+)/', $r, $m)) $uids = array_map('intval', preg_split('/\s+/', trim($m[1])));
$uids = array_values(array_filter($uids, fn($u) => $u > ($stav['posledni'] ?? 0)));
sort($uids);

$vysledek = ['ok' => true, 'zprav' => count($uids), 'z_banky' => 0, 'platby' => [], 'sparovano' => 0];
register_shutdown_function(function () use (&$stav) { ulozit_json('stav.json', $stav); });
foreach ($uids as $uid) {
  [, , $literaly] = $imap->prikaz("UID FETCH $uid BODY.PEEK[]");
  $stav['posledni'] = $uid;
  if (!$literaly) continue;
  $text = text_zpravy($literaly[0]);
  if (!str_contains($text, 'Česká spořitelna') && !str_contains($literaly[0], 'csas.cz')) continue;
  $vysledek['z_banky']++;
  $p = platba_z_upozorneni($text);
  if (!$p) continue;
  $vysledek['platby'][] = ['vs' => $p['vs'], 'castka' => $p['castka']];

  // Stejné upozornění může dorazit dvakrát (přeposlání + kopie).
  $klic = sha1($p['datum'] . '|' . $p['vs'] . '|' . $p['castka'] . '|' . $p['protiucet']);
  if (in_array($klic, $stav['zpracovane'] ?? [], true)) continue;
  $stav['zpracovane'][] = $klic;
  $stav['zpracovane'] = array_slice($stav['zpracovane'], -500);
  ulozit_json('stav.json', $stav);

  // Jen variabilní symboly ve tvaru čísla objednávky (RRMMDDNNN); ostatní platby na účet nás nezajímají.
  if (!preg_match('/^\d{9}$/', $p['vs'])) continue;
  $o = nacist_json("objednavky/{$p['vs']}.json");
  $castka = kc((int)round($p['castka']));

  if (!$o) {
    poslat_email(ODESILATEL, "NESPÁROVANÁ PLATBA $castka | VS {$p['vs']}",
      "Přišla platba $castka s VS {$p['vs']}, ale žádná objednávka s tímto VS není uložená.\n"
      . "Protiúčet: {$p['protiucet']}\nZpráva: {$p['zprava']}\nDatum: {$p['datum']}\n",
      email_html('Nespárovaná platba', '<p>Přišla platba <b>' . h($castka) . '</b> s VS <b>' . h($p['vs']) . '</b>, ale žádná objednávka s tímto VS není uložená.</p>'
        . '<p>Protiúčet: ' . h($p['protiucet']) . '<br>Zpráva: ' . h($p['zprava']) . '<br>Datum: ' . h($p['datum']) . '</p>'), null, false);
    continue;
  }

  $bylo = (float)$o['zaplaceno'];
  // Objednávka „platba na místě“ zaplacená přes QR u auta: cílová částka je celková cena.
  $cil = (int)($o['castka'] ?: ($o['celkem'] ?? 0));
  $o['zaplaceno'] = $bylo + $p['castka'];
  $o['platby'][] = $p;
  $o = vystavit_doklad($o);
  ulozit_json("objednavky/{$p['vs']}.json", $o);
  $uctenkaText = !empty($o['doklad']) ? "
Účtenka: " . odkaz_na_doklad($o) . "
" : '';
  $uctenkaHtml = !empty($o['doklad']) ? '<p><a href="' . h(odkaz_na_doklad($o)) . '" style="color:#2f5a33">Zobrazit účtenku č. ' . h($o['doklad']['cislo']) . '</a></p>' : '';
  $vysledek['sparovano']++;
  $celkem = kc((int)round($o['zaplaceno']));
  $ma = kc($cil);

  if ($o['zaplaceno'] + 0.001 >= $cil && $bylo + 0.001 < $cil) {
    poslat_email($o['email'], "Platba za objednávku {$o['cislo']} přijata – Ovocnářství Holub",
      "Dobrý den,\n\nplatba $celkem za objednávku {$o['cislo']} k nám dorazila. Děkujeme!\n\n{$o['souhrn']}\n$uctenkaText\nOvocnářství Holub\n" . WEB . "\n",
      email_html('Platba přijata, děkujeme', '<p style="line-height:1.5">Dobrý den,<br>platba <b>' . h($celkem) . '</b> za objednávku <b>' . h($o['cislo']) . '</b> k nám dorazila.</p>'
        . '<div style="background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:18px 20px;line-height:1.55;font-size:14px">' . nl2br(h($o['souhrn'])) . '</div>' . $uctenkaHtml),
      null, false);
    poslat_email(ODESILATEL, "ZAPLACENO {$o['cislo']} | $celkem | {$o['jmeno']}",
      "Objednávka {$o['cislo']} je zaplacená ($celkem z $ma).\nZákazník dostal potvrzení o přijetí platby.\n\n{$o['souhrn']}\n",
      email_html("Zaplaceno {$o['cislo']}", '<p>Objednávka je zaplacená: <b>' . h($celkem) . '</b> z ' . h($ma) . '. Zákazník dostal potvrzení.</p>'
        . '<div style="font-size:14px">' . nl2br(h($o['souhrn'])) . '</div>'), null, false);
  } elseif ($o['zaplaceno'] + 0.001 < $cil) {
    poslat_email(ODESILATEL, "NEÚPLNÁ PLATBA {$o['cislo']} | $celkem z $ma | {$o['jmeno']}",
      "K objednávce {$o['cislo']} zatím přišlo $celkem z $ma.\nZákazník: {$o['jmeno']}, {$o['email']}\n",
      email_html('Neúplná platba', '<p>K objednávce <b>' . h($o['cislo']) . '</b> zatím přišlo ' . h($celkem) . ' z ' . h($ma) . '.<br>Zákazník: ' . h($o['jmeno']) . ', ' . h($o['email']) . '</p>'), null, false);
  }
}
$imap->konec();
unset($stav['chyba']);
$stav['vysledek'] = $vysledek + ['cas' => date('c')];
ulozit_json('stav.json', $stav);
konec($vysledek);
