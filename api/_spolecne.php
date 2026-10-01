<?php
// Společné věci pro e-shop skripty: účet, odesílání e-mailů, úložiště objednávek, IMAP, přihlášení farmy.
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) { http_response_code(404); exit; }
// Chybové hlášky PHP do stránky nepatří (prozradily by cestu na hostingu) – zapisují se jen do logu serveru.
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');
// Wedos CDN jinak odpovědi skriptů cachuje na 10 minut.
header('Cache-Control: no-store, max-age=0');
// Bezpečnostní hlavičky pro všechny skripty (stránka může Referrer-Policy přepsat vlastní hodnotou).
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: frame-ancestors 'none'");
header('Referrer-Policy: strict-origin-when-cross-origin');

date_default_timezone_set('Europe/Prague');

const ODESILATEL = 'objednavky@ovoce-holub.cz';
const JMENO_ODESILATELE = 'Ovocnářství Holub';
const WEB = 'https://ovoce-holub.cz';
const UCET = ['cislo' => '662075319/0800', 'iban' => 'CZ3008000000000662075319', 'majitel' => 'Pavel Holub'];
const IMAP_SERVER = 'ssl://wes1-imap.wedos.net:993';
const SMTP_SERVERY = ['tcp://wes1-smtp.wedos.net:587', 'ssl://wes1-smtp.wedos.net:465'];
const DATA = __DIR__ . '/data';

// Údaje prodávajícího na účtenkách. Účtenky se vystavují, až je vyplněné IČO.
const PRODAVAJICI = [
  'jmeno' => 'Pavel Holub',
  'adresa' => 'Krtely 70, 384 11 Malovice',
  'ico' => '12320030',
  'dic' => 'CZ6803300394',
  'platce_dph' => true,
  'sazba_dph' => 12,        // snížená sazba – čerstvé ovoce (potraviny)
  'sazba_dph_napoje' => 21, // základní sazba – mošty (ovocné šťávy jsou od 1. 1. 2024 v 21 %)
  'telefon' => '+420 607 575 271',
  'zapis' => 'Podnikatel zapsaný v živnostenském rejstříku',
];

// Zkušební provoz účtenek (na přání majitele): true = smazaná účtenka uvolní své číslo a číslování pokračuje
// od nejvyššího zbývajícího. Po skončení zkoušek přepnout na false: vystavenou účtenku pak nejde smazat,
// farma ji může jen stornovat s poznámkou a čísla se už nikdy znovu nepoužijí.
const ZKUSEBNI_PROVOZ = true;
// Zjednodušený daňový doklad jen do této částky včetně DPH (§ 30 ZDPH); nad ní plný daňový doklad.
const LIMIT_ZJEDNODUSENY_DOKLAD = 10000;
// Upozornění na platby se přijímají jen od České spořitelny (doména a její poddomény).
const DOMENA_BANKY = 'csas.cz';
// Upozornění se připíše, když má platný podpis DKIM banky (ověří ho skript sám, klíčem banky z DNS).
// Záloha: náš poštovní server, který do zprávy píše hlavičku Authentication-Results – jeho jméno (první slovo
// hlavičky, např. 'wes1-mx.wedos.net') sem patří až po ověření na skutečném upozornění banky. Prázdné = hlavičce
// se nevěří (bez jistoty, že ji píše náš server, by ji mohl podvrhnout odesílatel).
const OVEROVACI_SERVER = '';
// Proxy (CDN Wedos) před hostingem: když server místo IP návštěvníka vidí adresu proxy (ukáže
// nastaveni.php?diagnostika), patří sem její rozsahy, např. '203.0.113.0/24'. IP návštěvníka se pak
// bere z hlavičky X-Forwarded-For – ale jen u požadavků, které opravdu přišly z těchto adres.
const DUVERYHODNE_PROXY = [];

function data_cesta(string $soubor): string {
  if (!is_dir(DATA . '/objednavky')) @mkdir(DATA . '/objednavky', 0700, true);
  return DATA . '/' . $soubor;
}

function nacist_json(string $soubor, $vychozi = null) {
  $s = @file_get_contents(data_cesta($soubor));
  $d = $s === false ? null : json_decode($s, true);
  return $d ?? $vychozi;
}

// Zápis souboru přes dočasný soubor: souběžný požadavek nikdy nenačte napůl zapsaný soubor a nezdařený zápis
// (plný disk, kvóta hostingu) nepřepíše dosavadní obsah. Vrací false, když se zápis nepovedl.
function zapsat_soubor(string $cesta, string $obsah): bool {
  $tmp = $cesta . '.' . bin2hex(random_bytes(4)) . '.tmp';
  if (@file_put_contents($tmp, $obsah, LOCK_EX) !== strlen($obsah) || !@rename($tmp, $cesta)) {
    @unlink($tmp);
    return false;
  }
  return true;
}

// $hezky = false u velkých pomocných souborů (trasy, adresy), které nikdo nečte očima.
// Vrací false, když se soubor nepodařilo uložit (původní obsah pak zůstává).
function ulozit_json(string $soubor, $data, bool $hezky = true): bool {
  $json = json_encode($data, JSON_UNESCAPED_UNICODE | ($hezky ? JSON_PRETTY_PRINT : 0));
  if ($json !== false && zapsat_soubor(data_cesta($soubor), $json)) return true;
  error_log("ovoce-holub: soubor data/$soubor se nepodařilo uložit");
  return false;
}

// Řetězec z $_GET / $_POST; pole (?t[]=…) a jiné typy → ''.
function retezec($v): string { return is_string($v) ? $v : ''; }

// Nastavení (heslo ke schránce, klíče) v data/nastaveni.php: první řádek PHP hned ukončí (soubor přes web
// nic neprozradí), za ním je JSON. Čte se jako text – ne přes include, které by PHP (opcache) mohlo
// pár sekund vracet ze staré mezipaměti, např. hned po „Odhlásit všechna zařízení“.
// Stejný obsah je i v data/nastaveni-zaloha.php: kdyby se hlavní soubor poškodil, klíče účtenek
// a přihlášení se nesmí potichu vytvořit znovu (odkazy na účtenky by navždy přestaly fungovat).
const NASTAVENI_ZACATEK = "<?php exit; ?>\n";

// Obsah souboru s nastavením: pole, null = soubor neexistuje, false = soubor je poškozený.
function precist_nastaveni(string $f) {
  $s = @file_get_contents($f);
  if ($s === false) return is_file($f) ? false : null;
  if (str_starts_with($s, NASTAVENI_ZACATEK)) {
    $n = json_decode(substr($s, strlen(NASTAVENI_ZACATEK)), true);
    return is_array($n) ? $n : false;
  }
  try {
    $n = include $f; // starší formát (var_export) – při prvním uložení se převede
  } catch (Throwable $e) {
    return false;
  }
  return is_array($n) ? $n : false;
}

// Vyhodí RuntimeException, když je nastavení poškozené a nejde obnovit ze zálohy – nic se pak nepřepíše.
function nastaveni(): array {
  $f = DATA . '/nastaveni.php';
  $zaloha = DATA . '/nastaveni-zaloha.php';
  $n = precist_nastaveni($f);
  if (is_array($n)) {
    // Záloha vznikne i u nastavení uloženého starší verzí (dřív se nezálohovalo).
    if (!is_file($zaloha) && $n) zapsat_soubor($zaloha, NASTAVENI_ZACATEK . json_encode($n, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
    return $n;
  }
  $z = precist_nastaveni($zaloha);
  if ($n === null && $z === null) return []; // úplně první nastavení
  if (is_array($z)) {
    error_log('ovoce-holub: data/nastaveni.php ' . ($n === null ? 'chybí' : 'je poškozené') . ' – použita záloha');
    return $z;
  }
  throw new RuntimeException('Soubor s nastavením je poškozený');
}

function ulozit_nastaveni(array $n): void {
  data_cesta('x');
  $f = DATA . '/nastaveni.php';
  $json = json_encode($n, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
  if ($json === false || !zapsat_soubor($f, NASTAVENI_ZACATEK . $json)) throw new RuntimeException('nastavení nejde uložit');
  zapsat_soubor(DATA . '/nastaveni-zaloha.php', NASTAVENI_ZACATEK . $json);
  if (function_exists('opcache_invalidate')) @opcache_invalidate($f, true);
}

// Změna nastavení pod zámkem – souběžné požadavky si heslo ani klíče nepřepíšou. $zmena dostane nastavení odkazem.
function zmenit_nastaveni(callable $zmena): array {
  $zamek = fopen(data_cesta('nastaveni.lock'), 'c');
  flock($zamek, LOCK_EX);
  try {
    $n = nastaveni();
    $zmena($n);
    ulozit_nastaveni($n);
    return $n;
  } finally {
    flock($zamek, LOCK_UN);
    fclose($zamek);
  }
}

// Tajný klíč z nastavení. Když chybí, vytvoří se a uloží – nikdy se nepodepisuje prázdným klíčem.
//   'klic'            – podpis odkazů na účtenky (odkazy, které už zákazníci mají, musí platit dál)
//   'klic_prihlaseni' – podpis přihlášení farmy; nový klíč = odhlášení všech zařízení
function klic(string $nazev): string {
  $platny = fn($k) => is_string($k) && strlen($k) >= 32;
  $k = nastaveni()[$nazev] ?? null;
  if ($platny($k)) return $k;
  return zmenit_nastaveni(function (array &$n) use ($nazev, $platny) {
    if ($platny($n[$nazev] ?? null)) return;
    // Přihlášení dřív podepisoval klíč účtenek – převezme se, ať se přihlášené telefony po nasazení neodhlásí.
    $n[$nazev] = $nazev === 'klic_prihlaseni' && $platny($n['klic'] ?? null) ? $n['klic'] : bin2hex(random_bytes(32));
  })[$nazev];
}

// ---------------------------------------------------------------------------
// Přihlášení farmy (rozvoz.php, nastaveni.php): podepsaná cookie, platí rok a při každé návštěvě se obnoví.
// ---------------------------------------------------------------------------
const COOKIE_FARMA = 'oh_rozvoz';
const PLATNOST_PRIHLASENI = 365 * 86400;

function podpis_prihlaseni(int $exp): string { return hash_hmac('sha256', "rozvoz|$exp", klic('klic_prihlaseni')); }

// Je toto zařízení přihlášené k přehledu objednávek?
function prihlasen(): bool {
  $c = $_COOKIE[COOKIE_FARMA] ?? '';
  if (!is_string($c)) return false;
  [$exp, $podpis] = array_pad(explode('.', $c, 2), 2, '');
  if (!ctype_digit($exp) || (int)$exp <= time() || $podpis === '') return false;
  return hash_equals(podpis_prihlaseni((int)$exp), $podpis);
}

function cookie_farmy(string $hodnota, int $exp): void {
  setcookie(COOKIE_FARMA, $hodnota, ['expires' => $exp, 'path' => '/api/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
}

function prihlasit_zarizeni(): void {
  $exp = time() + PLATNOST_PRIHLASENI;
  cookie_farmy($exp . '.' . podpis_prihlaseni($exp), $exp);
}

function odhlasit_zarizeni(): void { cookie_farmy('', 1); }

// „Odhlásit všechna zařízení“ (např. ztracený telefon): nový klíč zneplatní všechna vydaná přihlášení.
// Klíč odkazů na účtenky zůstává, takže zákazníkům účtenky dál fungují.
function odhlasit_vsechna_zarizeni(): void {
  zmenit_nastaveni(function (array &$n) {
    $n['klic_prihlaseni'] = bin2hex(random_bytes(32));
    $n['odhlaseno_vse'] = date('c');
  });
}

// Leží IP adresa v rozsahu ('203.0.113.0/24', '2001:db8::/32' nebo jedna adresa)?
function ip_v_rozsahu(string $ip, string $rozsah): bool {
  [$sit, $bity] = array_pad(explode('/', $rozsah, 2), 2, null);
  $a = @inet_pton($ip);
  $b = @inet_pton((string)$sit);
  if ($a === false || $b === false || strlen($a) !== strlen($b)) return false;
  $bity = $bity === null ? strlen($a) * 8 : max(0, min(strlen($a) * 8, (int)$bity));
  $cele = intdiv($bity, 8);
  if (strncmp($a, $b, $cele) !== 0) return false;
  $zbytek = $bity % 8;
  return $zbytek === 0 || ((ord($a[$cele]) ^ ord($b[$cele])) & (0xFF << (8 - $zbytek)) & 0xFF) === 0;
}

// IP adresa návštěvníka. Za proxy z DUVERYHODNE_PROXY poslední adresa v X-Forwarded-For, která není proxy;
// jinak REMOTE_ADDR (hlavičce od kohokoli jiného se nevěří – dala by se podvrhnout).
function ip_klienta(): string {
  $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
  $proxy = fn(string $a): bool => (bool)array_filter(DUVERYHODNE_PROXY, fn($r) => ip_v_rozsahu($a, $r));
  if (!DUVERYHODNE_PROXY || !$proxy($ip)) return $ip;
  $retez = array_map('trim', explode(',', retezec($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')));
  for ($i = count($retez) - 1; $i >= 0; $i--) {
    if (filter_var($retez[$i], FILTER_VALIDATE_IP) && !$proxy($retez[$i])) return $retez[$i];
  }
  return $ip;
}

// Limit počtu volání z jedné IP adresy.
// $celkove = true: limit pro všechny návštěvníky dohromady (ne pro jednu IP adresu).
function limit(string $nazev, int $max, int $sekund, bool $celkove = false): bool {
  $adresar = sys_get_temp_dir();
  $ip = hash('sha256', ($celkove ? 'vse' : ip_klienta()) . $nazev);
  $soubor = "$adresar/oh_{$nazev}_$ip";
  // Občas uklidit staré záznamy všech limitů (po dvou dnech už nic neomezují).
  if (random_int(1, 50) === 1) {
    foreach (glob("$adresar/oh_*") ?: [] as $f) {
      if (preg_match('/^oh_[A-Za-z0-9_-]+_[0-9a-f]{64}$/', basename($f)) && (int)@filemtime($f) < time() - 2 * 86400) @unlink($f);
    }
  }
  $casy = array_filter(array_map('intval', @file($soubor, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > time() - $sekund);
  if (count($casy) >= $max) return false;
  $casy[] = time();
  @file_put_contents($soubor, implode("\n", $casy));
  return true;
}

// Formulář farmy odeslaný z cizí stránky? Druhá pojistka vedle cookie se SameSite=Lax (starší prohlížeče):
// hlavičku Origin, pokud ji prohlížeč pošle, musí mít náš web.
function cizi_puvod(): bool {
  $o = retezec($_SERVER['HTTP_ORIGIN'] ?? '');
  if ($o === '') return false;
  $host = strtolower((string)parse_url($o, PHP_URL_HOST));
  $nas = strtolower(preg_replace('/:\d+$/', '', retezec($_SERVER['HTTP_HOST'] ?? '')));
  return $host === '' || ($host !== $nas && !in_array($host, ['ovoce-holub.cz', 'www.ovoce-holub.cz'], true));
}

// „středa 30. 9.“ → „2026-09-30“ (rok podle toho, aby termín ležel v nejbližší budoucnosti).
function datum_terminu(string $den): string {
  if (!preg_match('/(\d{1,2})\.\s*(\d{1,2})\./', $den, $m)) return '';
  $rok = (int)date('Y');
  $t = mktime(12, 0, 0, (int)$m[2], (int)$m[1], $rok);
  if ($t < strtotime('-60 days')) $t = mktime(12, 0, 0, (int)$m[2], (int)$m[1], $rok + 1);
  return date('Y-m-d', $t);
}

function kc(int $castka): string { return number_format($castka, 0, ',', ' ') . ' Kč'; }
function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

// Buňka CSV pro Excel: text začínající =, +, -, @, tabulátorem nebo CR by se spustil jako vzorec.
function csv_bunka($s): string {
  $s = (string)$s;
  return preg_match('/^[=+\-@\t\r]/', $s) ? "'" . $s : $s;
}

// HTML obálka e-mailu v barvách webu.
function email_html(string $nadpis, string $obsah): string {
  return '<!doctype html><html><body style="margin:0;background:#f8f5ef;font-family:Arial,Helvetica,sans-serif;color:#1d231c">'
    . '<div style="max-width:560px;margin:0 auto;padding:28px 20px">'
    . '<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#2f5a33;margin:0 0 6px">Ovocnářství Holub</p>'
    . '<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:26px;margin:0 0 18px">' . h($nadpis) . '</h1>'
    . $obsah
    . '<p style="font-size:13px;color:#6b6f66;margin:18px 0 0">Ovocnářství Holub · ' . h(PRODAVAJICI['adresa']) . ' · <a href="' . WEB . '" style="color:#2f5a33">ovoce-holub.cz</a></p>'
    . '</div></body></html>';
}

function poslat_email(string $komu, string $predmet, string $text, string $html, ?string $png = null, bool $kopie = true, ?string $odpovedNa = null): bool {
  $eol = "\r\n";
  $b1 = 'oh1_' . bin2hex(random_bytes(8));
  $b2 = 'oh2_' . bin2hex(random_bytes(8));
  $alt = "--$b2{$eol}Content-Type: text/plain; charset=UTF-8{$eol}Content-Transfer-Encoding: base64{$eol}{$eol}"
    . chunk_split(base64_encode($text)) . $eol
    . "--$b2{$eol}Content-Type: text/html; charset=UTF-8{$eol}Content-Transfer-Encoding: base64{$eol}{$eol}"
    . chunk_split(base64_encode($html)) . $eol . "--$b2--$eol";
  if ($png) {
    $typ = "multipart/related; boundary=\"$b1\"; type=\"multipart/alternative\"";
    $telo = "--$b1{$eol}Content-Type: multipart/alternative; boundary=\"$b2\"{$eol}{$eol}$alt{$eol}"
      . "--$b1{$eol}Content-Type: image/png; name=\"qr-platba.png\"{$eol}Content-Transfer-Encoding: base64{$eol}"
      . "Content-ID: <qrplatba>{$eol}Content-Disposition: inline; filename=\"qr-platba.png\"{$eol}{$eol}"
      . chunk_split(base64_encode($png)) . "--$b1--$eol";
  } else {
    $typ = "multipart/alternative; boundary=\"$b2\"";
    $telo = $alt;
  }
  $od = '=?UTF-8?B?' . base64_encode(JMENO_ODESILATELE) . '?= <' . ODESILATEL . '>';
  $predmetMime = '=?UTF-8?B?' . base64_encode($predmet) . '?=';
  $hlavicky = ['From: ' . $od, 'Reply-To: ' . ($odpovedNa ?: $od), 'MIME-Version: 1.0', 'Content-Type: ' . $typ];
  $prijemci = [$komu];
  if ($kopie && strcasecmp($komu, ODESILATEL) !== 0) $prijemci[] = ODESILATEL;
  // Do logu jen druh e-mailu, číslo objednávky a zkrácená adresa – žádná jména ani částky.
  $zaznam = predmet_do_logu($predmet) . ' → ' . maskovat_prijemce($komu);

  // Přes přihlášené SMTP Wedosu (e-maily jsou podepsané DKIM a nekončí ve spamu); mail() jen jako záloha.
  try { $heslo = (string)(nastaveni()['heslo'] ?? ''); } catch (RuntimeException $e) { $heslo = ''; }
  if ($heslo !== '') {
    try {
      smtp_odeslat($heslo, $prijemci, array_merge([
        'Date: ' . date('r'),
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@ovoce-holub.cz>',
        'To: ' . $komu,
        'Subject: ' . $predmetMime,
      ], $hlavicky), $telo);
      zapsat_log("odesláno (SMTP): $zaznam");
      return true;
    } catch (RuntimeException $e) {
      zapsat_log('SMTP selhalo (' . $e->getMessage() . '), zkouším mail()');
    }
  }

  if (count($prijemci) > 1) $hlavicky[] = 'Bcc: ' . ODESILATEL;
  $ok = function_exists('mail') && mail($komu, $predmetMime, $telo, implode($eol, $hlavicky), '-f' . ODESILATEL);
  zapsat_log(($ok ? 'odesláno (mail)' : 'CHYBA mail()') . ": $zaznam");
  return $ok;
}

function smtp_odeslat(string $heslo, array $prijemci, array $hlavicky, string $telo): void {
  // Z hostingu Wedos je otevřený jen port 587 (STARTTLS); 465 je záloha.
  $s = null; $starttls = false;
  foreach (SMTP_SERVERY as $server) {
    $s = @stream_socket_client($server, $errno, $errstr, 8);
    if ($s) { $starttls = str_starts_with($server, 'tcp://'); break; }
  }
  if (!$s) throw new RuntimeException('nelze se připojit (porty 587, 465)');
  stream_set_timeout($s, 30);
  $cti = function (string $ocekavam) use ($s): void {
    do {
      $r = fgets($s);
      if ($r === false) throw new RuntimeException('spojení přerušeno');
    } while (isset($r[3]) && $r[3] === '-');
    if (!str_starts_with($r, $ocekavam)) throw new RuntimeException(trim($r));
  };
  $posli = function (string $c, string $ocekavam) use ($s, $cti): void { fwrite($s, "$c\r\n"); $cti($ocekavam); };
  try {
    $cti('220');
    $posli('EHLO ovoce-holub.cz', '250');
    if ($starttls) {
      $posli('STARTTLS', '220');
      if (!stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) throw new RuntimeException('STARTTLS selhalo');
      $posli('EHLO ovoce-holub.cz', '250');
    }
    $posli('AUTH LOGIN', '334');
    $posli(base64_encode(ODESILATEL), '334');
    $posli(base64_encode($heslo), '235');
    $posli('MAIL FROM:<' . ODESILATEL . '>', '250');
    foreach ($prijemci as $p) $posli("RCPT TO:<$p>", '25');
    $posli('DATA', '354');
    $data = implode("\r\n", $hlavicky) . "\r\n\r\n" . $telo;
    $data = preg_replace('/^\./m', '..', str_replace(["\r\n", "\n"], ["\n", "\r\n"], $data));
    $posli(rtrim($data, "\r\n") . "\r\n.", '250');
    @fwrite($s, "QUIT\r\n");
  } finally {
    @fclose($s);
  }
}

// ---------------------------------------------------------------------------
// Log (data/log.txt): posledních 200 řádků, nejvýš 90 dní, bez jmen zákazníků.
// ---------------------------------------------------------------------------
// Předmět do logu: jen druh zprávy a číslo objednávky. Předměty se skládají jako
// „ROZVOZ den | OH-… | jméno | částka | skupina“ nebo „Potvrzení objednávky OH-… – Ovocnářství Holub“.
function predmet_do_logu(string $predmet): string {
  $druh = trim(preg_split('/\s\|\s|\s–\s|:\s/u', $predmet, 2)[0] ?? '');
  if (preg_match('/OH-\d{6}-\d{3,4}/', $predmet, $m) && !str_contains($druh, $m[0])) $druh .= ' ' . $m[0];
  return mb_substr($druh, 0, 80);
}

// jana.novakova@firma.cz → j…@f….cz (vlastní adresy @ovoce-holub.cz zůstávají celé)
function maskovat_prijemce(string $e): string {
  if (preg_match('/@ovoce-holub\.cz$/i', $e)) return $e;
  [$jmeno, $domena] = array_pad(explode('@', $e, 2), 2, '');
  $p = strrpos($domena, '.');
  return mb_substr($jmeno, 0, 1) . '…@' . mb_substr($domena, 0, 1) . '…' . ($p !== false ? substr($domena, $p) : '');
}

// Starší řádky logu obsahovaly celý předmět (i jméno zákazníka) – maskují se stejně.
function maskovat_radek_logu(string $r): string {
  return preg_replace_callback('/^(.*?(?:odesláno \((?:SMTP|mail)\)|CHYBA mail\(\)): )(.*) → (\S+)$/u',
    fn($m) => $m[1] . predmet_do_logu($m[2]) . ' → ' . maskovat_prijemce($m[3]), $r) ?? $r;
}

function zapsat_log(string $radek): void {
  $f = fopen(data_cesta('log.txt'), 'c+');
  if (!$f) return;
  flock($f, LOCK_EX);
  $od = date('Y-m-d', strtotime('-90 days'));
  $radky = array_filter(preg_split('/\r?\n/', (string)stream_get_contents($f)), fn($r) => $r !== '' && substr($r, 0, 10) >= $od);
  $radky = array_map('maskovat_radek_logu', array_slice(array_values($radky), -199));
  $radky[] = date('Y-m-d H:i:s') . ' ' . str_replace(["\r", "\n"], ' ', $radek);
  ftruncate($f, 0);
  rewind($f);
  fwrite($f, implode("\n", $radky) . "\n");
  fflush($f);
  flock($f, LOCK_UN);
  fclose($f);
}

// ---------------------------------------------------------------------------
// Minimální IMAP klient (PHP 8.4+ už nemá rozšíření imap).
// ---------------------------------------------------------------------------
final class Imap {
  private $s;
  private int $tag = 0;

  public function __construct(string $uzivatel, string $heslo) {
    $this->s = @stream_socket_client(IMAP_SERVER, $errno, $errstr, 20);
    if (!$this->s) throw new RuntimeException('Nelze se připojit k poštovnímu serveru');
    stream_set_timeout($this->s, 30);
    $this->radek();
    [$ok] = $this->prikaz('LOGIN ' . $this->q($uzivatel) . ' ' . $this->q($heslo));
    if (!$ok) throw new RuntimeException('Špatné heslo');
  }

  private function q(string $s): string { return '"' . addcslashes($s, "\"\\") . '"'; }

  private function radek(): string {
    $r = fgets($this->s);
    if ($r === false) throw new RuntimeException('Spojení se serverem přerušeno');
    return $r;
  }

  /** @return array{0: bool, 1: string[], 2: string[]} ok, řádky odpovědi, literály (obsahy zpráv) */
  public function prikaz(string $c): array {
    $t = 'A' . (++$this->tag);
    fwrite($this->s, "$t $c\r\n");
    $radky = []; $literaly = [];
    while (true) {
      $r = $this->radek();
      if (preg_match('/\{(\d+)\}\r\n$/', $r, $m)) {
        $n = (int)$m[1]; $buf = '';
        while (strlen($buf) < $n) {
          $kus = fread($this->s, $n - strlen($buf));
          if ($kus === false || $kus === '') throw new RuntimeException('Spojení se serverem přerušeno');
          $buf .= $kus;
        }
        $literaly[] = $buf;
        $radky[] = $r;
        continue;
      }
      if (str_starts_with($r, "$t ")) return [(bool)preg_match("/^$t OK/i", $r), $radky, $literaly];
      $radky[] = $r;
    }
  }

  public function konec(): void { @fwrite($this->s, "Z LOGOUT\r\n"); @fclose($this->s); }
}

// Z MIME zprávy vytáhne čitelný text (text/plain, jinak text/html bez značek).
// $vnorene = false: jen text samotné zprávy – bez přeposlaných zpráv (message/rfc822) a příloh.
function text_zpravy(string $raw, bool $vnorene = true): string {
  $casti = [];
  $projit = function (string $cast) use (&$projit, &$casti, $vnorene) {
    [$hl, $telo] = array_pad(preg_split("/\r?\n\r?\n/", $cast, 2), 2, '');
    $hl = preg_replace("/\r?\n[ \t]+/", ' ', $hl);
    $typ = preg_match('/^Content-Type:\s*([^;\s]+)/im', $hl, $m) ? strtolower($m[1]) : 'text/plain';
    if (str_starts_with($typ, 'multipart/') && preg_match('/boundary="?([^";\r\n]+)"?/i', $hl, $b)) {
      foreach (preg_split('/\r?\n--' . preg_quote($b[1], '/') . '(?:--)?[ \t]*\r?\n?/', "\n" . $telo) as $p) {
        if (trim($p) !== '') $projit($p);
      }
      return;
    }
    if ($typ === 'message/rfc822') { if ($vnorene) $projit($telo); return; }
    if (!str_starts_with($typ, 'text/')) return;
    if (!$vnorene && preg_match('/^Content-Disposition:\s*attachment/im', $hl)) return;
    $kod = preg_match('/^Content-Transfer-Encoding:\s*(\S+)/im', $hl, $m) ? strtolower($m[1]) : '';
    if ($kod === 'base64') $telo = base64_decode(preg_replace('/\s+/', '', $telo)) ?: '';
    elseif ($kod === 'quoted-printable') $telo = quoted_printable_decode($telo);
    $znaky = preg_match('/charset="?([^";\s]+)/i', $hl, $m) ? $m[1] : 'UTF-8';
    if (strcasecmp($znaky, 'UTF-8') !== 0) {
      // Znakovou sadu, kterou mbstring nezná (PHP 8 hází ValueError – např. windows-1250 z Outlooku), zkusí iconv;
      // jinak text zůstane, jak je. Jedna podivná zpráva nesmí zastavit párování.
      try {
        $telo = @mb_convert_encoding($telo, 'UTF-8', $znaky) ?: $telo;
      } catch (ValueError $e) {
        $prevod = function_exists('iconv') ? @iconv($znaky, 'UTF-8//IGNORE', $telo) : false;
        if (is_string($prevod) && $prevod !== '') $telo = $prevod;
      }
    }
    $casti[$typ][] = $telo;
  };
  $projit($raw);
  if (!empty($casti['text/plain'])) $t = implode("\n", $casti['text/plain']);
  elseif (!empty($casti['text/html'])) {
    $t = preg_replace('#<(style|script)\b.*?</\1>#is', '', implode("\n", $casti['text/html']));
    $t = preg_replace('#<(br|/p|/div|/tr|/li|/h\d)\b[^>]*>#i', "\n", $t);
    $t = html_entity_decode(strip_tags($t), ENT_QUOTES | ENT_HTML5, 'UTF-8');
  } else $t = '';
  $t = str_replace(["\u{00A0}", "\u{202F}"], ' ', $t);
  return preg_replace("/[ \t]+/", ' ', $t);
}

// Rozpozná upozornění České spořitelny na příchozí platbu (jen podle textu – odesílatele ověřuje overit_banku()).
function platba_z_upozorneni(string $text): ?array {
  if (!preg_match('/Směr platby:\s*p[řr][íi]choz/iu', $text)) return null;
  if (!preg_match('/Variabilní symbol:\s*(\d+)/u', $text, $vs)) $vs = [1 => ''];
  $castka = null;
  foreach (['Částka v měně účtu', 'Částka v měně transakce'] as $pole) {
    if (preg_match('/' . $pole . ':\s*([\d ]+(?:,\d{1,2})?)\s*Kč/u', $text, $m)) {
      $castka = (float)str_replace([' ', ','], ['', '.'], $m[1]);
      break;
    }
  }
  if ($castka === null) return null;
  preg_match('/Datum a čas platby:\s*([^\n]+)/u', $text, $d);
  preg_match('/Číslo účtu protistrany:\s*([^\n]+)/u', $text, $p);
  preg_match('/Zpráva pro příjemce:\s*([^\n]+)/u', $text, $z);
  return [
    'vs' => ltrim($vs[1], '0'),
    'castka' => $castka,
    'datum' => trim($d[1] ?? ''),
    'protiucet' => trim($p[1] ?? ''),
    'zprava' => trim($z[1] ?? ''),
  ];
}

// ---------------------------------------------------------------------------
// Ověření, že upozornění na platbu opravdu poslala banka
// ---------------------------------------------------------------------------
// Hlavičky nejvyšší úrovně zprávy: [název malými písmeny => [hodnoty shora dolů]].
function hlavicky_zpravy(string $raw): array {
  $hl = preg_replace("/\r?\n[ \t]+/", ' ', preg_split("/\r?\n\r?\n/", $raw, 2)[0]);
  $out = [];
  foreach (preg_split("/\r?\n/", $hl) as $r) {
    if (preg_match('/^([!-9;-~]+):[ \t]*(.*)$/', $r, $m)) $out[strtolower($m[1])][] = trim($m[2]);
  }
  return $out;
}

// Adresa z hlavičky From („Jméno <a@b.cz>“ nebo „a@b.cz“); víc adres nebo nejasný tvar → ''.
function adresa_odesilatele(string $from): string {
  if (preg_match_all('/<([^<>\s]*)>/', $from, $m)) return count($m[1]) === 1 && str_contains($m[1][0], '@') ? strtolower($m[1][0]) : '';
  return preg_match('/^([^\s<>,;"@]+@[^\s<>,;"@]+)$/', trim($from), $m) ? strtolower($m[1]) : '';
}

function domena_banky(string $domena): bool {
  return (bool)preg_match('/(?:^|\.)' . preg_quote(DOMENA_BANKY, '/') . '$/', strtolower(trim($domena, " \t\"'.")));
}

// Potvrdil náš poštovní server (Authentication-Results), že zprávu podepsala / poslala banka?
function overeno_serverem(string $ar): bool {
  // Komentáře v závorkách mohou obsahovat středník – pryč s nimi.
  do { $ar = preg_replace('/\([^()]*\)/', ' ', $ar, -1, $n); } while ($n);
  foreach (explode(';', strtolower($ar)) as $cast) {
    $cast = trim($cast);
    $domena = fn(string $vlastnost) => preg_match('/\b' . preg_quote($vlastnost, '/') . '\s*=\s*"?(?:[^@\s";]*@)?([a-z0-9.-]+)/', $cast, $m) ? $m[1] : '';
    if (preg_match('/^dkim\s*=\s*pass\b/', $cast) && (domena_banky($domena('header.d')) || domena_banky($domena('header.i')))) return true;
    if (preg_match('/^dmarc\s*=\s*pass\b/', $cast) && domena_banky($domena('header.from'))) return true;
    // SPF v souladu s odesílatelem (From je už ověřený jako banka) – totéž, co by uznal DMARC.
    if (preg_match('/^spf\s*=\s*pass\b/', $cast) && domena_banky($domena('smtp.mailfrom'))) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Podpis DKIM (RFC 6376) ověřený přímo tady – veřejným klíčem banky z DNS. Nezáleží tedy na tom, jestli
// a jak výsledek ověření do zprávy připsal poštovní server (hlavičku Authentication-Results může bez
// našeho serveru podvrhnout i odesílatel).
// ---------------------------------------------------------------------------
// Pole hlavičky v původním tvaru (i se zalomenými řádky), shora dolů: [[název malými písmeny, celé pole], …].
function pole_hlavicky(string $hlavicka): array {
  $out = [];
  foreach (preg_split("/\r\n(?![ \t])/", $hlavicka) as $p) {
    $i = strpos($p, ':');
    if ($i) $out[] = [strtolower(rtrim(substr($p, 0, $i))), $p];
  }
  return $out;
}

// „v=1; a=rsa-sha256; d=csas.cz; …“ → [značka => hodnota bez mezer a zalomení].
function dkim_znacky(string $s): array {
  $out = [];
  foreach (explode(';', $s) as $c) {
    if (preg_match('/^\s*([a-z][a-z0-9_]*)\s*=(.*)$/is', $c, $m)) $out[strtolower($m[1])] = preg_replace('/\s+/', '', $m[2]);
  }
  return $out;
}

// Kanonizace pole hlavičky (simple = beze změny, relaxed = malý název, rozvinuté řádky, jedna mezera).
function dkim_pole(string $pole, bool $relaxed): string {
  if (!$relaxed) return $pole;
  $i = strpos($pole, ':');
  return strtolower(rtrim(substr($pole, 0, $i))) . ':' . trim(preg_replace('/[ \t]+/', ' ', str_replace("\r\n", '', substr($pole, $i + 1))), ' ');
}

// Kanonizace těla: bez prázdných řádků na konci (relaxed navíc bez mezer na koncích řádků a s jednou mezerou).
function dkim_telo(string $telo, bool $relaxed): string {
  if ($relaxed) $telo = preg_replace(['/[ \t]+(?=\r\n|$)/', '/[ \t]+/'], ['', ' '], $telo);
  $telo = rtrim($telo, "\r\n");
  return $telo === '' ? ($relaxed ? '' : "\r\n") : $telo . "\r\n";
}

// Veřejný klíč z DNS ($selektor._domainkey.$domena), nebo null.
function klic_dkim(string $selektor, string $domena) {
  $zaznamy = @dns_get_record("$selektor._domainkey.$domena", DNS_TXT);
  foreach (is_array($zaznamy) ? $zaznamy : [] as $r) {
    $z = dkim_znacky(isset($r['entries']) && is_array($r['entries']) ? implode('', $r['entries']) : (string)($r['txt'] ?? ''));
    if (($z['v'] ?? 'DKIM1') !== 'DKIM1' || strtolower($z['k'] ?? 'rsa') !== 'rsa' || ($z['p'] ?? '') === '') continue;
    $klic = @openssl_pkey_get_public("-----BEGIN PUBLIC KEY-----\n" . chunk_split($z['p'], 64, "\n") . "-----END PUBLIC KEY-----\n");
    if ($klic) return $klic;
  }
  return null;
}

// Má zpráva platný podpis DKIM domény banky (csas.cz nebo její poddomény), který pokrývá odesílatele (From)
// i celé tělo zprávy? Jen rsa-sha256; podpis jen části těla (l=) se neuznává – za ním by šlo cokoli připsat.
function podpis_banky(string $raw): bool {
  $raw = preg_replace("/\r?\n/", "\r\n", $raw);
  $p = strpos($raw, "\r\n\r\n");
  $pole = pole_hlavicky($p === false ? rtrim($raw, "\r\n") : substr($raw, 0, $p));
  $telo = $p === false ? '' : substr($raw, $p + 4);
  $podpisu = 0;
  foreach ($pole as [$nazev, $podpis]) {
    if ($nazev !== 'dkim-signature' || ++$podpisu > 5) continue;
    $hodnota = substr($podpis, strpos($podpis, ':') + 1);
    $z = dkim_znacky($hodnota);
    $d = strtolower($z['d'] ?? '');
    $podepsane = array_map(fn($x) => strtolower(trim($x)), explode(':', $z['h'] ?? ''));
    [$ch, $cb] = array_pad(explode('/', strtolower($z['c'] ?? 'simple'), 2), 2, 'simple');
    if (($z['v'] ?? '') !== '1' || strtolower($z['a'] ?? '') !== 'rsa-sha256' || !domena_banky($d) || !in_array('from', $podepsane, true)
      || isset($z['l']) || !preg_match('/^[a-z0-9_][a-z0-9_.-]{0,62}$/i', $z['s'] ?? '') || ($z['b'] ?? '') === '' || ($z['bh'] ?? '') === ''
      || !in_array($ch, ['simple', 'relaxed'], true) || !in_array($cb, ['simple', 'relaxed'], true)) continue;
    if (isset($z['i'])) {
      $di = strtolower(substr(strrchr($z['i'], '@') ?: '@', 1));
      if ($di !== $d && !str_ends_with($di, ".$d")) continue;
    }
    if (!hash_equals(base64_encode(hash('sha256', dkim_telo($telo, $cb === 'relaxed'), true)), $z['bh'])) continue;
    // Podepsaná pole hlavičky: každý název ze značky h= bere další dosud nepoužitý výskyt odspodu.
    $data = '';
    $pouzite = [];
    foreach ($podepsane as $jmeno) {
      for ($k = count($pole) - 1; $k >= 0; $k--) {
        if ($pole[$k][0] !== $jmeno || isset($pouzite[$k])) continue;
        $pouzite[$k] = true;
        $data .= dkim_pole($pole[$k][1], $ch === 'relaxed') . "\r\n";
        break;
      }
    }
    // Nakonec samotný podpis s prázdnou hodnotou b= (bez konce řádku).
    $data .= dkim_pole(substr($podpis, 0, strlen($podpis) - strlen($hodnota)) . preg_replace('/((?:^|;)[ \t\r\n]*b[ \t\r\n]*=)[^;]*/', '$1', $hodnota), $ch === 'relaxed');
    $b = base64_decode($z['b'], true);
    $klic = $b !== false ? klic_dkim($z['s'], $d) : null;
    if ($klic && openssl_verify($data, $b, $klic, OPENSSL_ALGO_SHA256) === 1) return true;
  }
  return false;
}

// Jméno serveru, který napsal hlavičku Authentication-Results (první slovo), jen bezpečné znaky.
function server_overeni(string $ar): string {
  return preg_match('/^\s*([A-Za-z0-9._-]{1,80})\s*(?:;|$)/', $ar, $m) ? strtolower($m[1]) : '';
}

// Je zpráva upozornění přímo od České spořitelny? Vrací '' (ano), jinak důvod odmítnutí.
// Text upozornění může napsat kdokoli (odpověď na potvrzení, poznámka v objednávce, formulář) a adresu
// odesílatele si může napsat taky kdokoli – rozhoduje proto podpis DKIM banky, který se tu ověří proti klíči
// banky v DNS. Hlavičce Authentication-Results od poštovního serveru se věří jen tehdy, když je nejvýš
// a napsal ji náš server (OVEROVACI_SERVER); jinak ji mohl podvrhnout odesílatel. Přeposlané zprávy se nepřijímají.
function overit_banku(string $raw): string {
  $h = hlavicky_zpravy($raw);
  if (count($h['from'] ?? []) !== 1) return 'zpráva nemá jednoho odesílatele';
  $adresa = adresa_odesilatele($h['from'][0]);
  if (!domena_banky(substr(strrchr($adresa, '@') ?: '', 1))) return 'odesílatel ' . ($adresa !== '' ? maskovat_prijemce($adresa) : 'neznámý') . ' není Česká spořitelna';
  foreach (['resent-from', 'resent-sender', 'resent-to', 'resent-date', 'x-forwarded-to', 'x-forwarded-for', 'x-forwarded-message-id'] as $k) {
    if (isset($h[$k])) return 'přeposlaná zpráva';
  }
  $predmet = $h['subject'][0] ?? '';
  if (function_exists('mb_decode_mimeheader')) $predmet = mb_decode_mimeheader($predmet);
  if (preg_match('/^\s*(fwd?|fw|tr|wg|přeposlat|přeposláno)\s*:/iu', $predmet)) return 'přeposlaná zpráva';
  if (podpis_banky($raw)) return '';
  $ar = $h['authentication-results'][0] ?? null;
  $server = $ar !== null ? server_overeni($ar) : '';
  if (OVEROVACI_SERVER !== '' && $server === strtolower(OVEROVACI_SERVER) && overeno_serverem($ar)) return '';
  // Podrobnosti pro nastaveni.php: který server výsledek napsal a co tvrdí (podle toho jde OVEROVACI_SERVER nastavit).
  return 'chybí platný podpis DKIM banky' . ($server === '' ? ''
    : " – Authentication-Results od $server: " . (overeno_serverem($ar) ? 'podpis banky v pořádku' : 'podpis banky neověřen'));
}

// ---------------------------------------------------------------------------
// Objednávky a platby
// ---------------------------------------------------------------------------
// Změna uložené objednávky pod zámkem: dvojí ťuknutí ani souběžné párování plateb se nepřepíšou.
// $zmena dostane objednávku odkazem; vrací upravenou objednávku, nebo null, když neexistuje.
function zmenit_objednavku(string $vs, callable $zmena): ?array {
  if (!preg_match('/^\d{6,12}$/', $vs)) return null;
  $zamek = fopen(data_cesta('objednavky.lock'), 'c');
  flock($zamek, LOCK_EX);
  try {
    $o = nacist_json("objednavky/$vs.json");
    if (!is_array($o) || empty($o['cislo'])) return null;
    $puvodni = $o;
    $zmena($o);
    // Nepovedený zápis = změna neplatí (volající pak nic neposílá, jako by objednávka nebyla).
    if ($o !== $puvodni && !ulozit_json("objednavky/$vs.json", $o)) return null;
    return $o;
  } finally {
    flock($zamek, LOCK_UN);
    fclose($zamek);
  }
}

function existuje_objednavka(string $vs): bool {
  return preg_match('/^\d{6,12}$/', $vs) && is_file(data_cesta("objednavky/$vs.json"));
}

// Ke které objednávce platba patří: podle VS (9–10 číslic), jinak podle čísla objednávky nebo VS ve zprávě pro příjemce.
function objednavka_platby(array $p): ?string {
  if (preg_match('/^\d{9,10}$/', $p['vs']) && existuje_objednavka($p['vs'])) return $p['vs'];
  if (preg_match('/OH-?\s?(\d{6})-?\s?(\d{3,4})(?!\d)/i', $p['zprava'], $m) && existuje_objednavka($m[1] . $m[2])) return $m[1] . $m[2];
  if (preg_match('/(?<!\d)(\d{9,10})(?!\d)/', $p['zprava'], $m) && existuje_objednavka($m[1])) return $m[1];
  return null;
}

// Nezaplacené objednávky převodem (posledních 60 dní) s přesně touto částkou – pro platby bez VS.
function objednavky_s_castkou(float $castka): array {
  $od = date('c', strtotime('-60 days'));
  $out = [];
  foreach (glob(DATA . '/objednavky/*.json') ?: [] as $f) {
    $o = json_decode((string)file_get_contents($f), true);
    if (!is_array($o) || empty($o['cislo']) || !empty($o['zruseno']) || je_zaplaceno($o) || ($o['vytvoreno'] ?? '') < $od) continue;
    if ((($o['platba'] ?? '') === 'prevod' || !empty($o['castka'])) && abs(cil_platby($o) - (float)$o['zaplaceno'] - $castka) < 0.01) $out[] = $o['cislo'];
  }
  return $out;
}

// Zpracuje jednu zprávu ze schránky: ověřené upozornění ČS na příchozí platbu připíše k objednávce
// a pošle potvrzení; neověřené jen zapíše do logu a ohlásí farmě. $stav = stav párování (stav.json).
function zpracovat_zpravu_banky(string $raw, array &$stav, array &$vysledek): void {
  $text = text_zpravy($raw, false);
  $p = platba_z_upozorneni($text);
  $from = hlavicky_zpravy($raw)['from'][0] ?? '';
  $tvariSeJakoBanka = domena_banky(substr(strrchr(adresa_odesilatele($from), '@') ?: '', 1));
  if (!$p && !$tvariSeJakoBanka) return; // běžná pošta (objednávky, odpovědi zákazníků…)

  $duvod = overit_banku($raw);
  if ($duvod !== '') {
    zapsat_log("platby: zpráva nepřijata – $duvod");
    $stav['odmitnuto'] = ['cas' => date('c'), 'duvod' => $duvod];
    if (!$p) return;
    // Vypadá jako upozornění na platbu, ale nepřišlo přímo od banky: nic nepřipsat, jen dát farmě vědět (jednou).
    $klic = 'x' . sha1($p['datum'] . '|' . $p['vs'] . '|' . $p['castka'] . '|' . $p['zprava']);
    if (in_array($klic, $stav['zpracovane'] ?? [], true) || ($vysledek['neovereno'] ?? 0) >= 5) return;
    $stav['zpracovane'][] = $klic;
    $stav['zpracovane'] = array_slice($stav['zpracovane'], -500);
    $vysledek['neovereno'] = ($vysledek['neovereno'] ?? 0) + 1;
    $castka = kc((int)round($p['castka']));
    poslat_email(ODESILATEL, "NEOVĚŘENÉ upozornění na platbu $castka",
      "Do schránky přišla zpráva, která vypadá jako upozornění České spořitelny na platbu $castka (VS {$p['vs']}), ale nepřišla přímo od banky ($duvod).\n"
      . "Platba NEBYLA připsána k žádné objednávce. Zkontrolujte ji v internetovém bankovnictví.\n",
      email_html('Neověřené upozornění na platbu', '<p>Do schránky přišla zpráva, která vypadá jako upozornění České spořitelny na platbu <b>' . h($castka) . '</b> (VS ' . h($p['vs']) . '), ale nepřišla přímo od banky (' . h($duvod) . ').</p>'
        . '<p><b>Platba nebyla připsána k žádné objednávce.</b> Zkontrolujte ji v internetovém bankovnictví.</p>'), null, false);
    return;
  }
  $vysledek['z_banky'] = ($vysledek['z_banky'] ?? 0) + 1;
  if (!$p) return;

  // Stejné upozornění může dorazit dvakrát.
  $klic = sha1($p['datum'] . '|' . $p['vs'] . '|' . $p['castka'] . '|' . $p['protiucet']);
  if (in_array($klic, $stav['zpracovane'] ?? [], true)) return;
  $stav['zpracovane'][] = $klic;
  $stav['zpracovane'] = array_slice($stav['zpracovane'], -500);
  ulozit_json('stav.json', $stav);

  $castka = kc((int)round($p['castka']));
  $vs = objednavka_platby($p);
  if ($vs === null) {
    if (preg_match('/^\d{9,10}$/', $p['vs'])) {
      poslat_email(ODESILATEL, "NESPÁROVANÁ PLATBA $castka | VS {$p['vs']}",
        "Přišla platba $castka s VS {$p['vs']}, ale žádná objednávka s tímto VS není uložená.\n"
        . "Protiúčet: {$p['protiucet']}\nZpráva: {$p['zprava']}\nDatum: {$p['datum']}\n",
        email_html('Nespárovaná platba', '<p>Přišla platba <b>' . h($castka) . '</b> s VS <b>' . h($p['vs']) . '</b>, ale žádná objednávka s tímto VS není uložená.</p>'
          . '<p>Protiúčet: ' . h($p['protiucet']) . '<br>Zpráva: ' . h($p['zprava']) . '<br>Datum: ' . h($p['datum']) . '</p>'), null, false);
    } elseif ($p['vs'] === '' && count($kandidati = objednavky_s_castkou($p['castka'])) === 1) {
      // Platba bez VS, ale částka přesně sedí na jedinou nezaplacenou objednávku: nepřipsat, jen upozornit.
      poslat_email(ODESILATEL, "MOŽNÁ PLATBA ZA {$kandidati[0]} | $castka bez VS",
        "Přišla platba $castka bez variabilního symbolu. Částkou odpovídá nezaplacené objednávce {$kandidati[0]}.\n"
        . "Zkontrolujte ji prosím – automaticky připsaná není.\nProtiúčet: {$p['protiucet']}\nZpráva: {$p['zprava']}\nDatum: {$p['datum']}\n",
        email_html('Možná platba za ' . $kandidati[0], '<p>Přišla platba <b>' . h($castka) . '</b> bez variabilního symbolu. Částkou odpovídá nezaplacené objednávce <b>' . h($kandidati[0]) . '</b>.</p>'
          . '<p>Zkontrolujte ji prosím – automaticky připsaná není.<br>Protiúčet: ' . h($p['protiucet']) . '<br>Zpráva: ' . h($p['zprava']) . '<br>Datum: ' . h($p['datum']) . '</p>'), null, false);
    }
    return;
  }

  $bylo = 0.0; $upozorneni = [];
  $o = zmenit_objednavku($vs, function (array &$o) use ($p, $castka, &$bylo, &$upozorneni) {
    $bylo = (float)$o['zaplaceno'];
    // Objednávka „platba na místě“ zaplacená přes QR u auta: cílová částka je celková cena.
    $cil = cil_platby($o);
    $o['zaplaceno'] = $bylo + $p['castka'];
    $o['platby'][] = $p;
    if (!empty($o['zruseno'])) $upozorneni[] = "Platba $castka přišla na stornovanou objednávku – vrátit";
    elseif (!empty($o['zaplaceno_hotove'])) $upozorneni[] = "Zaplaceno na místě a přišel i převod $castka – zkontrolovat, případně vrátit";
    elseif ($cil > 0 && $bylo + 0.001 >= $cil) $upozorneni[] = "Dvojí platba – převod $castka navíc, vrátit";
    elseif ($cil > 0 && $o['zaplaceno'] > $cil + 0.5) $upozorneni[] = 'Přeplaceno o ' . kc((int)round($o['zaplaceno'] - $cil)) . ' – vrátit';
    if ($upozorneni) $o['upozorneni'] = array_values(array_merge($o['upozorneni'] ?? [], $upozorneni));
    $o = vystavit_doklad($o);
  });
  if (!$o) return;
  $vysledek['sparovano'] = ($vysledek['sparovano'] ?? 0) + 1;
  $cil = cil_platby($o);
  $celkem = kc((int)round($o['zaplaceno']));
  $ma = kc($cil);
  $uctenkaText = platny_doklad($o) ? "\nÚčtenka: " . odkaz_na_doklad($o) . "\n" : '';
  $uctenkaHtml = platny_doklad($o) ? '<p><a href="' . h(odkaz_na_doklad($o)) . '" style="color:#2f5a33">Zobrazit účtenku č. ' . h($o['doklad']['cislo']) . '</a></p>' : '';

  if ($upozorneni) {
    // Přeplatek, dvojí platba nebo platba za storno: o vrácení rozhodne farma, zákazníkovi se kvůli tomu nic neposílá.
    poslat_email(ODESILATEL, "POZOR PLATBA {$o['cislo']} | " . $upozorneni[0],
      "K objednávce {$o['cislo']} přišla platba $castka.\n" . implode("\n", $upozorneni) . "\n\n"
      . "Převodem celkem: $celkem, cena objednávky: $ma.\nZákazník: {$o['jmeno']}, {$o['email']}\nProtiúčet: {$p['protiucet']}\n",
      email_html('Platba k vyřízení', '<p>K objednávce <b>' . h($o['cislo']) . '</b> přišla platba <b>' . h($castka) . '</b>.</p>'
        . '<p style="color:#8c2f2b"><b>' . implode('<br>', array_map('h', $upozorneni)) . '</b></p>'
        . '<p>Převodem celkem: ' . h($celkem) . ', cena objednávky: ' . h($ma) . '<br>Zákazník: ' . h($o['jmeno']) . ', ' . h($o['email']) . '<br>Protiúčet: ' . h($p['protiucet']) . '</p>'), null, false);
  }
  $zaplacenoTed = $o['zaplaceno'] + 0.001 >= $cil && $bylo + 0.001 < $cil && empty($o['zruseno']) && empty($o['zaplaceno_hotove']);
  if ($zaplacenoTed) {
    poslat_email($o['email'], "Platba za objednávku {$o['cislo']} přijata – Ovocnářství Holub",
      "Dobrý den,\n\nplatba $celkem za objednávku {$o['cislo']} k nám dorazila. Děkujeme!\n\n{$o['souhrn']}\n$uctenkaText\nOvocnářství Holub\n" . WEB . "\n",
      email_html('Platba přijata, děkujeme', '<p style="line-height:1.5">Dobrý den,<br>platba <b>' . h($celkem) . '</b> za objednávku <b>' . h($o['cislo']) . '</b> k nám dorazila.</p>'
        . '<div style="background:#fff;border:1px solid #dfd7c9;border-radius:8px;padding:18px 20px;line-height:1.55;font-size:14px">' . nl2br(h($o['souhrn'])) . '</div>' . $uctenkaHtml),
      null, false);
    poslat_email(ODESILATEL, "ZAPLACENO {$o['cislo']} | $celkem | {$o['jmeno']}",
      "Objednávka {$o['cislo']} je zaplacená ($celkem z $ma).\nZákazník dostal potvrzení o přijetí platby.\n\n{$o['souhrn']}\n",
      email_html("Zaplaceno {$o['cislo']}", '<p>Objednávka je zaplacená: <b>' . h($celkem) . '</b> z ' . h($ma) . '. Zákazník dostal potvrzení.</p>'
        . '<div style="font-size:14px">' . nl2br(h($o['souhrn'])) . '</div>'), null, false);
  } elseif (!$upozorneni && $o['zaplaceno'] + 0.001 < $cil) {
    poslat_email(ODESILATEL, "NEÚPLNÁ PLATBA {$o['cislo']} | $celkem z $ma | {$o['jmeno']}",
      "K objednávce {$o['cislo']} zatím přišlo $celkem z $ma.\nZákazník: {$o['jmeno']}, {$o['email']}\n",
      email_html('Neúplná platba', '<p>K objednávce <b>' . h($o['cislo']) . '</b> zatím přišlo ' . h($celkem) . ' z ' . h($ma) . '.<br>Zákazník: ' . h($o['jmeno']) . ', ' . h($o['email']) . '</p>'), null, false);
  }
}

// ---------------------------------------------------------------------------
// Účtenky (doklady o prodeji)
// ---------------------------------------------------------------------------
function cil_platby(array $o): int { return (int)(($o['castka'] ?? 0) ?: ($o['celkem'] ?? 0)); }
function je_zaplaceno(array $o): bool {
  return !empty($o['zaplaceno_hotove']) || (cil_platby($o) > 0 && (float)($o['zaplaceno'] ?? 0) + 0.001 >= cil_platby($o));
}

// Vystavená a nestornovaná účtenka.
function platny_doklad(array $o): bool { return !empty($o['doklad']) && empty($o['doklad']['storno']); }

// Nad 10 000 Kč včetně DPH musí být plný daňový doklad (s údaji kupujícího), ne zjednodušený.
function plny_danovy_doklad(array $o): bool { return PRODAVAJICI['platce_dph'] && cil_platby($o) > LIMIT_ZJEDNODUSENY_DOKLAD; }

// Datum uskutečnění zdanitelného plnění (DUZP): den, kdy farma objednávku skutečně předala;
// u starších objednávek bez tohoto údaje plánovaný den. U vystavené účtenky platí datum uložené při vystavení.
function duzp(array $o): string {
  if (!empty($o['doklad']['duzp'])) return $o['doklad']['duzp'];
  foreach ([$o['doruceno_cas'] ?? '', $o['datum'] ?? '', $o['doklad']['vystaveno'] ?? ''] as $d) {
    if (is_string($d) && $d !== '' && ($t = strtotime($d)) !== false) return date('Y-m-d', $t);
  }
  return date('Y-m-d');
}

function odkaz_na_doklad(array $o): string {
  $k = substr(hash_hmac('sha256', 'doklad|' . $o['vs'], klic('klic')), 0, 24);
  return WEB . '/api/doklad.php?' . http_build_query(['vs' => $o['vs'], 'k' => $k]);
}

// Vystaví účtenku, když o ni farma při doručení stála (chce_doklad) a objednávka je doručená i zaplacená.
// Vrací upravenou objednávku. Číslo se bere pod zámkem a řada nikdy neklesá (mimo zkušební provoz).
function vystavit_doklad(array $o): array {
  if (!empty($o['doklad']) || empty($o['chce_doklad']) || PRODAVAJICI['ico'] === '' || empty($o['doruceno']) || !empty($o['zruseno']) || !je_zaplaceno($o)) return $o;
  $f = fopen(data_cesta('doklady.lock'), 'c');
  flock($f, LOCK_EX);
  $rada = nacist_json('doklady.json', []);
  $rok = date('Y');
  $rada[$rok] = ($rada[$rok] ?? 0) + 1;
  $ulozeno = ulozit_json('doklady.json', $rada);
  flock($f, LOCK_UN);
  fclose($f);
  if (!$ulozeno) return $o; // číslo by se mohlo použít dvakrát – účtenka se vystaví při další akci

  $o['doklad'] = [
    'cislo' => sprintf('%s%04d', $rok, $rada[$rok]),
    'vystaveno' => date('c'),
    'duzp' => duzp($o),
    'uhrada' => !empty($o['zaplaceno_hotove']) ? 'hotově / na místě' : 'bankovním převodem',
  ];
  return $o;
}

// Sazba DPH pro řádek objednávky: mošty (nápoje) 21 %, ovoce 12 %.
function sazba_radku(string $radek): int {
  return preg_match('/\(Mošty\)|mošt/iu', $radek) ? (int)PRODAVAJICI['sazba_dph_napoje'] : (int)PRODAVAJICI['sazba_dph'];
}

function cena_radku(string $radek): ?int {
  return preg_match('/–\s*([\d\s]+)\s*Kč\s*$/u', $radek, $m) ? (int)preg_replace('/\D/', '', $m[1]) : null;
}

// Rozpis DPH účtenky podle sazeb: [sazba => ['celkem' => …, 'zaklad' => …, 'dan' => …]].
// Ceny v e-shopu jsou konečné (s DPH); co se nepodaří přiřadit k řádku, jde do sazby pro ovoce.
function rozpis_dph(array $o): array {
  $poSazbach = [];
  $soucet = 0;
  foreach ($o['polozky'] ?? [] as $r) {
    $cena = cena_radku((string)$r);
    if ($cena === null) continue;
    $sazba = sazba_radku((string)$r);
    $poSazbach[$sazba] = ($poSazbach[$sazba] ?? 0) + $cena;
    $soucet += $cena;
  }
  $zbytek = cil_platby($o) - $soucet;
  if ($zbytek !== 0 || !$poSazbach) {
    $s0 = (int)PRODAVAJICI['sazba_dph'];
    $poSazbach[$s0] = ($poSazbach[$s0] ?? 0) + $zbytek;
  }
  ksort($poSazbach);
  $out = [];
  foreach ($poSazbach as $sazba => $celkem) {
    if ($celkem == 0) continue;
    $zaklad = PRODAVAJICI['platce_dph'] ? round($celkem / (1 + $sazba / 100), 2) : (float)$celkem;
    $out[$sazba] = ['celkem' => (float)$celkem, 'zaklad' => $zaklad, 'dan' => round($celkem - $zaklad, 2)];
  }
  return $out;
}
