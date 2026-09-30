<?php
// Potvrzení objednávky zákazníkovi – posílá se z objednavky@ovoce-holub.cz přes PHP mail() na Wedos.
// Objednávky placené převodem se uloží, aby se k nim daly spárovat příchozí platby (platby.php).
require __DIR__ . '/_spolecne.php';

const POVOLENE_ORIGINY = ['https://ovoce-holub.cz', 'https://www.ovoce-holub.cz'];

header('Content-Type: application/json; charset=utf-8');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, POVOLENE_ORIGINY, true)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
}

function konec(int $kod, array $data): void {
  http_response_code($kod);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') konec(200, ['ok' => true, 'mail' => function_exists('mail')]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') konec(405, ['ok' => false]);
if ($origin !== '' && !in_array($origin, POVOLENE_ORIGINY, true)) konec(403, ['ok' => false]);
if (!limit('potvrzeni', 6, 3600)) konec(429, ['ok' => false]);

$d = json_decode(file_get_contents('php://input', false, null, 0, 200000), true);
if (!is_array($d)) konec(400, ['ok' => false]);

$email = trim((string)($d['email'] ?? ''));
$jmeno = trim(mb_substr((string)($d['jmeno'] ?? ''), 0, 100));
$cislo = (string)($d['cislo'] ?? '');
$souhrn = trim(mb_substr((string)($d['souhrn'] ?? ''), 0, 4000));
$castka = (int)($d['castka'] ?? 0);
$qr = (string)($d['qr'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) konec(400, ['ok' => false]);
if (!preg_match('/^OH-\d{6}-\d{3}$/', $cislo)) konec(400, ['ok' => false]);
if ($souhrn === '' || $castka < 0 || $castka > 200000) konec(400, ['ok' => false]);

$vs = preg_replace('/\D/', '', $cislo);
$odkazPlatby = WEB . '/eshop.html?' . http_build_query(['platba' => $cislo, 'castka' => $castka]);

// Uloží se každá objednávka – pro přehled rozvozu (rozvoz.php) a párování plateb (platby.php).
$txt = fn($k, $max) => trim(mb_substr((string)($d[$k] ?? ''), 0, $max));
if (!is_file(data_cesta("objednavky/$vs.json"))) {
  ulozit_json("objednavky/$vs.json", [
    'cislo' => $cislo, 'vs' => $vs, 'castka' => $castka, 'email' => $email, 'jmeno' => $jmeno,
    'souhrn' => $souhrn, 'vytvoreno' => date('c'), 'zaplaceno' => 0, 'platby' => [],
    'rozvoz' => !empty($d['rozvoz']),
    'den' => $txt('den', 40),
    'datum' => datum_terminu($txt('den', 40)),
    'telefon' => $txt('telefon', 40),
    'adresa' => $txt('adresa', 200),
    'adresa_overena' => $txt('adresaOverena', 200),
    'gps_overena' => (is_array($d['gps'] ?? null) && count($d['gps']) === 2 && abs((float)$d['gps'][0] - 49) < 2 && abs((float)$d['gps'][1] - 15) < 4)
      ? [(float)$d['gps'][0], (float)$d['gps'][1]] : null,
    'polozky' => array_map(fn($r) => mb_substr((string)$r, 0, 200), array_slice((array)($d['polozky'] ?? []), 0, 60)),
    'celkem' => (int)($d['celkem'] ?? 0),
    'platba' => ($d['platba'] ?? '') === 'prevod' ? 'prevod' : 'prevzeti',
    'poznamka' => $txt('poznamka', 1000),
    'skupina' => $txt('skupina', 40),
    'doruceno' => false,
  ]);
}

$qrPng = null;
if ($castka > 0 && preg_match('#^data:image/png;base64,([A-Za-z0-9+/=]+)$#', $qr, $m)) {
  $bin = base64_decode($m[1], true);
  if ($bin !== false && strlen($bin) < 100000 && substr($bin, 0, 8) === "\x89PNG\r\n\x1a\n") $qrPng = $bin;
}

$text = "Dobrý den" . ($jmeno !== '' ? ", $jmeno" : '') . ",\n\n"
  . "děkujeme – vaše objednávka $cislo je přijatá a platí. Nic dalšího potvrzovat nemusíte.\n\n"
  . "$souhrn\n\n";
if ($castka > 0) {
  $text .= "PLATBA PŘEVODEM\nČástka: " . kc($castka) . "\nČíslo účtu: " . UCET['cislo'] . "\nVariabilní symbol: $vs\n"
    . "IBAN: " . UCET['iban'] . "\nQR kód k platbě: $odkazPlatby\n"
    . "Zaplaťte prosím nejpozději den před termínem. Jakmile platba dorazí, pošleme vám potvrzení.\n\n";
}
$text .= "Pokud by něco z objednávky nebylo k dispozici, ozveme se vám. "
  . "Změnu nebo zrušení nám prosím napište nejpozději den před termínem do 18:00 odpovědí na tento e-mail.\n\n"
  . "Ovocnářství Holub, Krtely 70, Netolice\n" . WEB . "\n";

$radek = fn($k, $v) => '<tr><td style="padding:6px 16px 6px 0;color:#6b6f66">' . h($k) . '</td><td style="padding:6px 0;font-weight:600">' . h($v) . '</td></tr>';
$obsah = '<p style="margin:0 0 18px;line-height:1.5">Dobrý den' . ($jmeno !== '' ? ', ' . h($jmeno) : '') . ',<br>děkujeme – objednávka platí, nic dalšího potvrzovat nemusíte.</p>'
  . '<div style="background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:18px 20px;margin:0 0 18px;line-height:1.55;font-size:14px">' . nl2br(h($souhrn)) . '</div>';
if ($castka > 0) {
  $obsah .= '<div style="background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:18px 20px;margin:0 0 18px">'
    . '<h2 style="font-family:Georgia,serif;font-weight:normal;font-size:20px;margin:0 0 12px">Platba převodem</h2>'
    . ($qrPng ? '<img src="cid:qrplatba" width="200" height="200" alt="QR Platba" style="display:block;border:1px solid #dfd7c9;margin:0 0 12px">' : '')
    . '<table style="font-size:14px;border-collapse:collapse">'
    . $radek('Částka', kc($castka)) . $radek('Číslo účtu', UCET['cislo']) . $radek('Variabilní symbol', $vs)
    . $radek('IBAN', UCET['iban']) . $radek('Příjemce', UCET['majitel'])
    . '</table>'
    . '<p style="font-size:13px;color:#6b6f66;margin:12px 0 0">Naskenujte QR kód v aplikaci banky. Zaplaťte prosím nejpozději den před termínem – jakmile platba dorazí, pošleme vám potvrzení. '
    . '<a href="' . h($odkazPlatby) . '" style="color:#2f5a33">Otevřít platbu na webu</a></p></div>';
}
$obsah .= '<p style="font-size:13px;color:#6b6f66;line-height:1.5;margin:0">Pokud by něco nebylo k dispozici, ozveme se vám. '
  . 'Změnu nebo zrušení nám napište nejpozději den před termínem do 18:00 – stačí odpovědět na tento e-mail.</p>';

$ok = poslat_email($email, "Potvrzení objednávky $cislo – Ovocnářství Holub", $text, email_html("Objednávka $cislo je přijatá", $obsah), $qrPng);
konec($ok ? 200 : 500, ['ok' => $ok]);
