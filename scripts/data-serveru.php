<?php
// Přenosy pro scripts/data-serveru.sh: data e-shopu na serveru (api/data na Wedosu) přes samostatný FTP účet.
// Šifrovaně (FTPS) i pro data – Wedos (vsFTPd) vyžaduje u datového spojení obnovení TLS relace, což curl
// ve Windows (Schannel) neumí, PHP s OpenSSL ano. Údaje se čtou z .env (heslo se nikde nevypisuje).
// Spouští se přes data-serveru.sh (najde PHP a zapne rozšíření ftp a openssl).
error_reporting(E_ALL & ~E_WARNING);
chdir(dirname(__DIR__));

function konec(string $zprava, int $kod = 1): void { fwrite(STDERR, $zprava . "\n"); exit($kod); }

if (!is_file('.env')) konec('Chybí .env (vzor je v .env.example, nebo: bash scripts/data-serveru.sh nastavit).');
// .env doslova: KLÍČ=hodnota do konce řádku (heslo může obsahovat uvozovky, $ i mezery); uvozovky kolem se odeberou.
$env = [];
foreach (file('.env', FILE_IGNORE_NEW_LINES) as $r) {
  $r = rtrim($r, "\r");
  if ($r === '' || $r[0] === '#' || !str_contains($r, '=')) continue;
  [$k, $v] = explode('=', $r, 2);
  if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && substr($v, -1) === $v[0]) $v = substr($v, 1, -1);
  $env[$k] = $v;
}
foreach (['DATA_FTP_HOST', 'DATA_FTP_USER', 'DATA_FTP_HESLO'] as $k) if (($env[$k] ?? '') === '') konec("Chybí $k v .env.");

[$host, $port] = array_pad(explode(':', $env['DATA_FTP_HOST'], 2), 2, 21);
$tls = ($env['DATA_FTP_TLS'] ?? '1') !== '0';
$ftp = $tls ? ftp_ssl_connect($host, (int)$port, 30) : ftp_connect($host, (int)$port, 30);
if (!$ftp) konec("Nelze se připojit k $host.");
if (!ftp_login($ftp, $env['DATA_FTP_USER'], $env['DATA_FTP_HESLO'])) konec('Přihlášení selhalo (login nebo heslo v .env).');
ftp_pasv($ftp, true);
register_shutdown_function(fn() => @ftp_close($ftp));

$cas = date('Y-m-d_His');
// Cesta na serveru: relativní, bez „..“ (FTP účet stejně nevidí nic mimo api/data).
function cesta(?string $f): string {
  if ($f === null || $f === '') konec('Chybí název souboru (např. objednavky/12345678.json).');
  if ($f[0] === '/' || str_contains($f, '..')) konec("Neplatná cesta: $f");
  return $f;
}
function slozka_pro(string $soubor): void { if (!is_dir(dirname($soubor))) mkdir(dirname($soubor), 0700, true); }
// Serverová verze souboru do zaloha-serveru/pred-zmenou/<čas>/ (když na serveru je).
function zalohovat($ftp, string $f, string $cas): void {
  $cil = "zaloha-serveru/pred-zmenou/$cas/$f";
  slozka_pro($cil);
  if (ftp_get($ftp, $cil, $f, FTP_BINARY)) echo "Záloha: $cil\n"; else @unlink($cil);
}
// Položky složky z výpisu LIST: [název, je složka].
function polozky($ftp, string $slozka): array {
  $out = [];
  foreach (ftp_rawlist($ftp, $slozka === '' ? '.' : $slozka) ?: [] as $r) {
    $c = preg_split('/\s+/', trim($r), 9);
    if (count($c) < 9 || $c[8] === '.' || $c[8] === '..') continue;
    $out[] = [$c[8], $r[0] === 'd'];
  }
  return $out;
}
function stahni_slozku($ftp, string $slozka, string $cil, int &$pocet): void {
  foreach (polozky($ftp, $slozka) as [$nazev, $jeSlozka]) {
    $cesta = $slozka . $nazev;
    if ($jeSlozka) { stahni_slozku($ftp, "$cesta/", $cil, $pocet); continue; }
    slozka_pro("$cil/$cesta");
    if (!ftp_get($ftp, "$cil/$cesta", $cesta, FTP_BINARY)) konec("Stažení selhalo: $cesta");
    $pocet++;
  }
}

$prikaz = $argv[1] ?? '';
switch ($prikaz) {
  case 'seznam':
    foreach (polozky($ftp, $argv[2] ?? '') as [$nazev, $jeSlozka]) echo $nazev . ($jeSlozka ? '/' : '') . "\n";
    break;
  case 'zaloha':
    $pocet = 0;
    stahni_slozku($ftp, '', "zaloha-serveru/$cas", $pocet);
    echo "Staženo do zaloha-serveru/$cas ($pocet souborů).\n";
    break;
  case 'stahni':
    $f = cesta($argv[2] ?? null); $cil = "zaloha-serveru/aktualni/$f";
    slozka_pro($cil);
    if (!ftp_get($ftp, $cil, $f, FTP_BINARY)) konec("Stažení selhalo: $f");
    echo "Staženo: $cil\n";
    break;
  case 'nahraj':
    $f = cesta($argv[2] ?? null); $zdroj = "zaloha-serveru/aktualni/$f";
    if (!is_file($zdroj)) konec("Chybí $zdroj (nejdřív: stahni $f).");
    zalohovat($ftp, $f, $cas);
    if (!ftp_put($ftp, $f, $zdroj, FTP_BINARY)) konec("Nahrání selhalo: $f");
    echo "Nahráno: $f\n";
    break;
  case 'smaz':
    $f = cesta($argv[2] ?? null);
    zalohovat($ftp, $f, $cas);
    if (!ftp_delete($ftp, $f)) konec("Smazání selhalo: $f");
    echo "Smazáno na serveru: $f\n";
    break;
  default:
    konec('Neznámý příkaz. Použití: bash scripts/data-serveru.sh (bez parametrů vypíše nápovědu).');
}
