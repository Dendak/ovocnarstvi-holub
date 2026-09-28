<?php
// Potvrzení objednávky zákazníkovi – posílá se z objednavky@ovoce-holub.cz přes PHP mail() na Wedos.
// Kopie (Bcc) jde vždy na objednavky@, takže je vidět každý odeslaný e-mail.

const ODESILATEL = 'objednavky@ovoce-holub.cz';
const JMENO_ODESILATELE = 'Ovocnářství Holub';
const POVOLENE_ORIGINY = ['https://ovoce-holub.cz', 'https://www.ovoce-holub.cz'];
const LIMIT_ZA_HODINU = 6;
const UCET = ['cislo' => '1577877143/0800', 'iban' => 'CZ5208000000001577877143', 'majitel' => 'Pavel Holub'];

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

// Jednoduchý limit na IP adresu, aby se skript nedal zneužít k rozesílání.
$ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'oh');
$limitSoubor = sys_get_temp_dir() . '/oh_potvrzeni_' . $ip;
$casy = array_filter(
  array_map('intval', @file($limitSoubor, FILE_IGNORE_NEW_LINES) ?: []),
  fn($t) => $t > time() - 3600
);
if (count($casy) >= LIMIT_ZA_HODINU) konec(429, ['ok' => false]);
$casy[] = time();
@file_put_contents($limitSoubor, implode("\n", $casy));

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
$castkaText = number_format($castka, 0, ',', ' ') . ' Kč';
$odkazPlatby = 'https://ovoce-holub.cz/eshop.html?' . http_build_query(['platba' => $cislo, 'castka' => $castka]);

$qrPng = null;
if ($castka > 0 && preg_match('#^data:image/png;base64,([A-Za-z0-9+/=]+)$#', $qr, $m)) {
  $bin = base64_decode($m[1], true);
  if ($bin !== false && strlen($bin) < 100000 && substr($bin, 0, 8) === "\x89PNG\r\n\x1a\n") $qrPng = $bin;
}

$h = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

// ---------- text ----------
$text = "Dobrý den" . ($jmeno !== '' ? ", $jmeno" : '') . ",\n\n"
  . "děkujeme – vaše objednávka $cislo je přijatá a platí. Nic dalšího potvrzovat nemusíte.\n\n"
  . "$souhrn\n\n";
if ($castka > 0) {
  $text .= "PLATBA PŘEVODEM\nČástka: $castkaText\nČíslo účtu: " . UCET['cislo'] . "\nVariabilní symbol: $vs\n"
    . "IBAN: " . UCET['iban'] . "\nQR kód k platbě: $odkazPlatby\n"
    . "Zaplaťte prosím nejpozději den před termínem.\n\n";
}
$text .= "Pokud by něco z objednávky nebylo k dispozici, ozveme se vám. "
  . "Změnu nebo zrušení nám prosím napište nejpozději den před termínem do 18:00 odpovědí na tento e-mail.\n\n"
  . "Ovocnářství Holub, Krtely 70, Netolice\nhttps://ovoce-holub.cz\n";

// ---------- HTML ----------
$radek = fn($k, $v) => '<tr><td style="padding:6px 16px 6px 0;color:#6b6f66">' . $h($k) . '</td><td style="padding:6px 0;font-weight:600">' . $h($v) . '</td></tr>';
$html = '<!doctype html><html><body style="margin:0;background:#f8f5ef;font-family:Arial,Helvetica,sans-serif;color:#1d231c">'
  . '<div style="max-width:560px;margin:0 auto;padding:28px 20px">'
  . '<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#2f5a33;margin:0 0 6px">Ovocnářství Holub</p>'
  . '<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:26px;margin:0 0 18px">Objednávka ' . $h($cislo) . ' je přijatá</h1>'
  . '<p style="margin:0 0 18px;line-height:1.5">Dobrý den' . ($jmeno !== '' ? ', ' . $h($jmeno) : '') . ',<br>děkujeme – objednávka platí, nic dalšího potvrzovat nemusíte.</p>'
  . '<div style="background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:18px 20px;margin:0 0 18px;white-space:pre-line;line-height:1.55;font-size:14px">' . $h($souhrn) . '</div>';
if ($castka > 0) {
  $html .= '<div style="background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:18px 20px;margin:0 0 18px">'
    . '<h2 style="font-family:Georgia,serif;font-weight:normal;font-size:20px;margin:0 0 12px">Platba převodem</h2>'
    . ($qrPng ? '<img src="cid:qrplatba" width="200" height="200" alt="QR Platba" style="display:block;border:1px solid #dfd7c9;margin:0 0 12px">' : '')
    . '<table style="font-size:14px;border-collapse:collapse">'
    . $radek('Částka', $castkaText) . $radek('Číslo účtu', UCET['cislo']) . $radek('Variabilní symbol', $vs)
    . $radek('IBAN', UCET['iban']) . $radek('Příjemce', UCET['majitel'])
    . '</table>'
    . '<p style="font-size:13px;color:#6b6f66;margin:12px 0 0">Naskenujte QR kód v aplikaci banky. Zaplaťte prosím nejpozději den před termínem. '
    . '<a href="' . $h($odkazPlatby) . '" style="color:#2f5a33">Otevřít platbu na webu</a></p></div>';
}
$html .= '<p style="font-size:13px;color:#6b6f66;line-height:1.5;margin:0">Pokud by něco nebylo k dispozici, ozveme se vám. '
  . 'Změnu nebo zrušení nám napište nejpozději den před termínem do 18:00 – stačí odpovědět na tento e-mail.</p>'
  . '<p style="font-size:13px;color:#6b6f66;margin:18px 0 0">Ovocnářství Holub · Krtely 70, Netolice · <a href="https://ovoce-holub.cz" style="color:#2f5a33">ovoce-holub.cz</a></p>'
  . '</div></body></html>';

// ---------- MIME ----------
$eol = "\r\n";
$b1 = 'oh1_' . bin2hex(random_bytes(8));
$b2 = 'oh2_' . bin2hex(random_bytes(8));
$alt = "--$b2{$eol}Content-Type: text/plain; charset=UTF-8{$eol}Content-Transfer-Encoding: base64{$eol}{$eol}"
  . chunk_split(base64_encode($text)) . $eol
  . "--$b2{$eol}Content-Type: text/html; charset=UTF-8{$eol}Content-Transfer-Encoding: base64{$eol}{$eol}"
  . chunk_split(base64_encode($html)) . $eol . "--$b2--$eol";

if ($qrPng) {
  $contentType = "multipart/related; boundary=\"$b1\"; type=\"multipart/alternative\"";
  $body = "--$b1{$eol}Content-Type: multipart/alternative; boundary=\"$b2\"{$eol}{$eol}$alt{$eol}"
    . "--$b1{$eol}Content-Type: image/png; name=\"qr-platba.png\"{$eol}Content-Transfer-Encoding: base64{$eol}"
    . "Content-ID: <qrplatba>{$eol}Content-Disposition: inline; filename=\"qr-platba.png\"{$eol}{$eol}"
    . chunk_split(base64_encode($qrPng)) . "--$b1--$eol";
} else {
  $contentType = "multipart/alternative; boundary=\"$b2\"";
  $body = $alt;
}

$od = '=?UTF-8?B?' . base64_encode(JMENO_ODESILATELE) . '?= <' . ODESILATEL . '>';
$hlavicky = implode($eol, [
  'From: ' . $od,
  'Reply-To: ' . $od,
  'Bcc: ' . ODESILATEL,
  'MIME-Version: 1.0',
  'Content-Type: ' . $contentType,
]);
$predmet = '=?UTF-8?B?' . base64_encode("Potvrzení objednávky $cislo – Ovocnářství Holub") . '?=';

$ok = mail($email, $predmet, $body, $hlavicky, '-f' . ODESILATEL);
konec($ok ? 200 : 500, ['ok' => $ok]);
