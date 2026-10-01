<?php
// Zprávy z kontaktního formuláře (česká stránka) a poptávky pálenic (německá stránka).
// Pošle je e-mailem farmě; Reply-To je zákazník, takže farma odpoví rovnou z pošty.
// Příjemce je pevný (nejde zneužít k rozesílání pošty), předmět je stálý (do log.txt se nedostanou jména).
// Odpověď: {ok:true} nebo {ok:false, chyba:'…'} s kódem 4xx (5xx = nepodařilo se odeslat → web zkusí zálohu).
require __DIR__ . '/_spolecne.php';

const POVOLENE_ORIGINY = ['https://ovoce-holub.cz', 'https://www.ovoce-holub.cz'];
// Kam co chodí – stejně jako záložní cesta přes FormSubmit na webu.
const PRIJEMCI = ['kontakt' => 'info@ovoce-holub.cz', 'anfrage' => ODESILATEL];

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

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') konec(405, ['ok' => false, 'chyba' => 'metoda']);
// Prohlížeče posílají Origin u každého POST; bez něj nebo z cizího webu zprávu nebereme.
if (!in_array($origin, POVOLENE_ORIGINY, true)) konec(403, ['ok' => false, 'chyba' => 'origin']);

$d = json_decode((string)file_get_contents('php://input', false, null, 0, 20000), true);
if (!is_array($d)) konec(400, ['ok' => false, 'chyba' => 'neplatne']);

// Jednořádkový údaj bez řídicích znaků / víceřádkový text (zachová konce řádků).
$radek = fn(string $k, int $max): string => is_scalar($d[$k] ?? null)
  ? trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', mb_substr((string)$d[$k], 0, $max)) ?? '') : '';
$text = fn(string $k, int $max): string => is_scalar($d[$k] ?? null)
  ? trim(preg_replace('/[\x00-\x08\x0B-\x1F\x7F]/u', '', str_replace(["\r\n", "\r"], "\n", mb_substr((string)$d[$k], 0, $max))) ?? '') : '';

// Past na roboty: skryté pole „web“ vyplní jen spamovací skript.
if ($radek('web', 200) !== '') konec(400, ['ok' => false, 'chyba' => 'spam']);

$typ = $radek('typ', 20);
if (!isset(PRIJEMCI[$typ])) konec(400, ['ok' => false, 'chyba' => 'neplatne']);
$jazyk = $radek('jazyk', 5) === 'de' ? 'de' : 'cs';

$jmeno = $radek('jmeno', 100);
$email = $radek('email', 200);
$telefon = $radek('telefon', 40);
$zprava = $text('zprava', 5000);
$firma = $radek('firma', 150);
$zeme = $radek('zeme', 60);
$produkt = $radek('produkt', 500);
$mnozstvi = $radek('mnozstvi', 100);

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) konec(400, ['ok' => false, 'chyba' => 'email']);
if ($telefon !== '' && !preg_match('/^[+\d\s\-()\/.]{6,40}$/', $telefon)) konec(400, ['ok' => false, 'chyba' => 'telefon']);
if ($email === '' && $telefon === '') konec(400, ['ok' => false, 'chyba' => 'kontakt']);
if ($zprava === '') konec(400, ['ok' => false, 'chyba' => 'zprava']);

if (!limit('kontakt', 5, 3600)) konec(429, ['ok' => false, 'chyba' => 'limit']);

$nadpis = $typ === 'anfrage' ? 'Poptávka pálenice z německé stránky' : 'Dotaz z webu';
$udaje = array_filter([
  'Jméno' => $jmeno,
  'Firma' => $firma,
  'E-mail' => $email,
  'Telefon' => $telefon,
  'Země' => $zeme,
  'Ovoce' => $produkt,
  'Množství' => $mnozstvi,
  'Jazyk' => $jazyk === 'de' ? 'němčina' : 'čeština',
], fn($v) => $v !== '');
$pozn = $email !== '' ? 'Stačí odpovědět na tento e-mail – odpověď půjde přímo zákazníkovi.' : 'Zákazník nechal jen telefon – ozvěte se mu prosím telefonicky.';

$txt = "$nadpis (ovoce-holub.cz)\n\n";
foreach ($udaje as $k => $v) $txt .= "$k: $v\n";
$txt .= "\nZpráva:\n$zprava\n\n$pozn\n";

$radky = '';
foreach ($udaje as $k => $v) {
  $hodnota = match ($k) {
    'E-mail' => '<a href="mailto:' . h($v) . '" style="color:#2f5a33">' . h($v) . '</a>',
    'Telefon' => '<a href="tel:' . h(preg_replace('/[^+\d]/', '', $v)) . '" style="color:#2f5a33">' . h($v) . '</a>',
    default => h($v),
  };
  $radky .= '<tr><td style="padding:4px 12px 4px 0;color:#6b6f66;vertical-align:top">' . h($k) . '</td><td style="padding:4px 0">' . $hodnota . '</td></tr>';
}
$html = email_html($nadpis,
  '<table style="border-collapse:collapse;font-size:15px;margin:0 0 16px">' . $radky . '</table>'
  . '<div style="background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:14px 16px;font-size:15px;line-height:1.5">' . nl2br(h($zprava)) . '</div>'
  . '<p style="font-size:14px;color:#4b5448;margin:14px 0 0">' . h($pozn) . '</p>');

$ok = poslat_email(PRIJEMCI[$typ], $nadpis, $txt, $html, null, false, $email !== '' ? $email : null);
if (!$ok) konec(502, ['ok' => false, 'chyba' => 'odeslani']);
konec(200, ['ok' => true]);
