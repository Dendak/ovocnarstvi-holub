// Porovnání souborů na serveru (výpis lftp `find -l`) s očekávaným stavem (sestavené react-verze/dist).
// Spouští workflow .github/workflows/kontrola-serveru.yml, lokálně ho zkouší test.sh.
//
//   node porovnat.mjs plan       --dist D --vypis V --povolene P --seznam S
//       → do S zapíše cesty souborů (mimo api/data), které se mají stáhnout ke kontrole obsahu
//   node porovnat.mjs vyhodnotit --dist D --vypis V --povolene P --stazeno T --vysledky R
//       → porovná, vypíše podrobnosti do logu a do R připíše řádky „STAV<tab>bod<tab>popis“
//
// Zásady: obsah souborů se nikdy nevypisuje, jen jména a stav. Ve složce api/data (osobní údaje zákazníků)
// se nic nestahuje a běžná jména souborů se nevypisují – jen počty a podezřelé položky.
// Jména ze serveru jsou cizí vstup: do logu jdou očištěná a vždy s předponou (řádek nikdy nezačne „::“,
// takže z něj GitHub Actions neudělá příkaz), do seznamu ke stažení jen „bezpečná“ jména (žádné uvozovky,
// mezery, středníky – lftp by je jinak mohl brát jako příkazy).
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MB = 1024 * 1024
const LIMIT_VELIKOSTI = 20 * MB
const DATA = 'api/data/'

// Soubory, jejichž obsah se porovnává otiskem SHA-256 (a prohledává na stopy webshellu).
const KONTROLOVAT_OBSAH = /\.(php\d?|phtml|phar|phps|pht|inc|html?|shtml|xhtml|js|mjs|cjs|svg|ini|cgi|pl|py|sh)$/i
const KONTROLOVAT_JMENA = new Set(['.htaccess', '.user.ini', '.htpasswd', 'php.ini'])
// Soubor navíc s touto příponou (spustitelný na serveru nebo v prohlížeči) je podezřelý, ostatní (obrázky…) jen upozornění.
const AKTIVNI = /\.(php\d?|phtml|phar|phps|pht|inc|cgi|pl|py|sh|so|asp|aspx|jsp|html?|shtml|xhtml|js|mjs|cjs|svg|ini|htaccess|htpasswd)$/i
// V api/data nemá co dělat nic spustitelného ani konfigurace serveru.
const PODEZRELE_V_DATECH = /\.(php\d?|phtml|phar|phps|pht|cgi|pl|py|sh|so|htaccess|user\.ini)$/i
// Co v api/data legitimně vzniká (viz api/_spolecne.php: nastaveni(), ulozit_nastaveni(), zapsat_soubor();
// api/data/mapa/ plní workflow repa mapa-rozvozu-ovoce přes FTP-Deploy-Action – ta si tam ukládá stavový soubor).
const OCEKAVANE_V_DATECH = new Set(['api/data/.htaccess', 'api/data/nastaveni.php', 'api/data/nastaveni-zaloha.php'])
const SKRYTE_V_DATECH = new Set(['api/data/.htaccess', 'api/data/mapa/.ftp-deploy-sync-state.json'])
// Dočasný soubor zapsat_soubor() (přejmenuje se během milisekund, může ale zůstat po pádu PHP).
const DOCASNE_V_DATECH = /^api\/data\/(nastaveni|nastaveni-zaloha)\.php\.[0-9a-f]{8}\.tmp$/
// Jména, která smí do skriptu lftp (stahování): jen písmena, číslice a . _ - + @, segmenty nezačínají „-“.
const BEZPECNA_CESTA = /^(?!-|\.\.?(\/|$))[A-Za-z0-9._@+-]+(\/(?!-|\.\.?(\/|$))[A-Za-z0-9._@+-]+)*$/

// Stopy webshellů a vložených skriptů. Hlásí se jen nové výskyty (více než ve stejném souboru v dist).
const VZORY = [
  ['eval(', /\beval\s*\(/gi],
  ['assert(', /\bassert\s*\(/gi],
  ['base64_decode(', /\bbase64_decode\s*\(/gi],
  ['gzinflate(', /\bgzinflate\s*\(/gi],
  ['gzuncompress(', /\bgzuncompress\s*\(/gi],
  ['gzdecode(', /\bgzdecode\s*\(/gi],
  ['str_rot13(', /\bstr_rot13\s*\(/gi],
  ['system(', /\bsystem\s*\(/gi],
  ['exec(', /\bexec\s*\(/gi],
  ['shell_exec(', /\bshell_exec\s*\(/gi],
  ['passthru(', /\bpassthru\s*\(/gi],
  ['popen(', /\bpopen\s*\(/gi],
  ['proc_open(', /\bproc_open\s*\(/gi],
  ['pcntl_exec(', /\bpcntl_exec\s*\(/gi],
  ['create_function(', /\bcreate_function\s*\(/gi],
  ['preg_replace /e', /\bpreg_replace\s*\(\s*(['"])([^\w\s\\])(?:(?!\2).)*\2[a-z]*e[a-z]*\1/gi],
  ['zpětný apostrof (shell)', /`\s*\$_(GET|POST|REQUEST|COOKIE)/gi],
  ['volání z $_GET/$_POST', /\$_(GET|POST|REQUEST|COOKIE|SERVER)\s*\[[^\]]*\]\s*\(/gi],
  ['$f($_POST…)', /\$\w+\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)/gi],
  ['move_uploaded_file(', /\bmove_uploaded_file\s*\(/gi],
  ['fsockopen(', /\bfsockopen\s*\(/gi],
  ['chr().chr()', /\bchr\s*\(\s*\d+\s*\)\s*\.\s*chr\s*\(/gi],
  ['\\x.. řetězce', /(\\x[0-9a-f]{2}){4,}/gi],
  ['jméno známého shellu', /\b(FilesMan|b374k|weevely|IndoXploit|c99shell|r57shell|WSO\s*\d|alfa\s*shell|0byte)\b/gi],
  ['auto_prepend/append_file', /\bauto_(prepend|append)_file\b/gi],
  ['AddHandler/SetHandler/AddType', /\b(AddHandler|SetHandler|AddType|ForceType)\b/gi],
  ['php_value/php_flag', /\bphp_(value|flag|admin_value)\b/gi],
  ['<?php mimo .php', /<\?(php|=)/gi], // jen u souborů, které nejsou .php (viz hledat())
  ['document.write(unescape', /document\.write\s*\(\s*unescape/gi],
  ['<iframe', /<iframe\b/gi],
  ['skript z cizí domény', /<script[^>]+src\s*=\s*["']?(https?:)?\/\//gi],
]

// ---------------------------------------------------------------------------------------------- pomocné funkce

function argumenty(pole) {
  const a = {}
  for (let i = 0; i < pole.length; i++) if (pole[i].startsWith('--')) a[pole[i].slice(2)] = pole[++i]
  return a
}

// Jméno ze serveru do logu: jen tisknutelné znaky, bez zpětných apostrofů a svislítek (souhrn je v Markdownu).
const cisty = s => String(s).replace(/[^\x20-\x7E\u00A0-\u024F]/g, '?').replace(/[`|]/g, '?').slice(0, 300)
const radek = s => console.log(`    - ${s}`)

const kontrolovatObsah = cesta => {
  const jmeno = cesta.split('/').pop()
  return KONTROLOVAT_JMENA.has(jmeno) || KONTROLOVAT_OBSAH.test(jmeno) || /\.php\d?\./i.test(jmeno)
}
const skryty = cesta => cesta.split('/').some(c => c.startsWith('.'))
const aktivni = cesta => {
  const jmeno = cesta.split('/').pop()
  return AKTIVNI.test(jmeno) || /\.php\d?\./i.test(jmeno) || KONTROLOVAT_JMENA.has(jmeno)
}

// Vzory ze souboru povolene.txt (glob: * = cokoli bez „/“, ** = cokoli) → regulární výrazy.
function nacistPovolene(soubor) {
  if (!soubor || !existsSync(soubor)) return []
  return readFileSync(soubor, 'utf8').split(/\r?\n/).map(r => r.trim()).filter(r => r && !r.startsWith('#'))
    .map(vzor => new RegExp('^' + vzor.split('**').map(cast => cast.split('*')
      .map(x => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*') + '$'))
}

// Výpis lftp `find -l` (FileInfo::MakeLongName):
//   -rw-r--r--  uzivatel/skupina        1234 2026-10-21 12:00:00 ./api/x.php
//   drwxr-xr-x  uzivatel/skupina           - 2026-10-21 12:00:00 ./api/
//   lrwxrwxrwx  uzivatel/skupina          12 2026-10-21 12:00:00 ./odkaz -> cil
// Uživatel/skupina může chybět, velikost i datum mohou být „-“. Čas je v TZ běhu (workflow nastaví UTC).
const RADEK_VYPISU = /^([-dlLbcps])[-rwxsStT?]{9}\s+(.*?)\s*(\d+|-)\s+(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d|-)\s(.+)$/
function nacistVypis(soubor) {
  const polozky = []
  let necitelne = 0
  for (const r of readFileSync(soubor, 'utf8').split(/\r?\n/)) {
    if (!r.trim()) continue
    const m = RADEK_VYPISU.exec(r)
    if (!m) { necitelne++; continue }
    let [, typ, , velikost, cas, cesta] = m
    let cil = null
    if (typ === 'l' && cesta.includes(' -> ')) [cesta, cil] = cesta.split(' -> ', 2)
    cesta = cesta.replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+$/, '')
    if (cesta === '' || cesta === '.') continue
    polozky.push({ cesta, typ: typ === '-' ? 'f' : typ, velikost: velikost === '-' ? null : Number(velikost), cas, cil })
  }
  return { polozky, necitelne }
}

// Očekávané soubory: celé dist/ kromě toho, co FTP-Deploy-Action v4 nenahrává (výchozí exclude
// "**/.git*", "**/.git*/**", "**/node_modules/**" – např. api/.gitignore se na server nedostane).
function nacistDist(slozka, predpona = '', vysledek = new Map()) {
  for (const e of readdirSync(slozka, { withFileTypes: true })) {
    const cesta = predpona + e.name
    if (e.name.startsWith('.git') || e.name === 'node_modules') continue
    if (e.isDirectory()) nacistDist(join(slozka, e.name), cesta + '/', vysledek)
    else vysledek.set(cesta, { velikost: lstatSync(join(slozka, e.name)).size, soubor: join(slozka, e.name) })
  }
  return vysledek
}

// api/_cenik.php vzniká při každém sestavení znovu s časem „vytvoreno“ – ten se z porovnání vynechá.
function obsahKPorovnani(cesta, data) {
  if (cesta === 'api/_cenik.php') return Buffer.from(data.toString('latin1').replace(/"vytvoreno":"[^"]*"/, '"vytvoreno":""'), 'latin1')
  return data
}
const sha256 = data => createHash('sha256').update(data).digest('hex')

function hledat(cesta, data) {
  const text = data.toString('latin1')
  const nalezy = new Map()
  for (const [nazev, vzor] of VZORY) {
    if (nazev === '<?php mimo .php' && /\.(php\d?|phtml|phar|pht|inc)$/i.test(cesta)) continue
    const pocet = (text.match(vzor) || []).length
    if (pocet) nalezy.set(nazev, pocet)
  }
  return nalezy
}

// Rozdělení výpisu: mimo api/data / v api/data.
function rozdelit(polozky) {
  const mimo = [], data = []
  for (const p of polozky) (p.cesta === 'api/data' || p.cesta.startsWith(DATA) ? data : mimo).push(p)
  return { mimo, data }
}

function keStazeni(mimo) {
  return mimo.filter(p => p.typ === 'f' && kontrolovatObsah(p.cesta) && BEZPECNA_CESTA.test(p.cesta)
    && (p.velikost === null || p.velikost <= LIMIT_VELIKOSTI))
}

// ---------------------------------------------------------------------------------------------- plan

function plan(a) {
  const { polozky } = nacistVypis(a.vypis)
  const { mimo } = rozdelit(polozky)
  const seznam = keStazeni(mimo).map(p => p.cesta)
  writeFileSync(a.seznam, seznam.join('\n') + (seznam.length ? '\n' : ''))
  console.log(`Ke kontrole obsahu se stáhne ${seznam.length} souborů (mimo api/data).`)
}

// ---------------------------------------------------------------------------------------------- vyhodnotit

function vyhodnotit(a) {
  const vysledky = []
  const vysledek = (stav, bod, popis) => {
    vysledky.push([stav, bod, popis.replace(/[\t\n]/g, ' ')])
    console.log(`==> [${stav}] ${bod}: ${popis}`)
  }
  const dist = nacistDist(a.dist)
  const povolene = nacistPovolene(a.povolene)
  const povoleno = cesta => povolene.some(r => r.test(cesta))
  const { polozky, necitelne } = nacistVypis(a.vypis)
  const { mimo, data } = rozdelit(polozky)
  const naServeru = new Map(mimo.filter(p => p.typ !== 'd').map(p => [p.cesta, p]))
  const dataSoubory = data.filter(p => p.typ !== 'd')

  // --- Výpis serveru
  console.log(`\nVýpis serveru: ${polozky.length} položek (${naServeru.size} souborů mimo api/data, ${dataSoubory.length} v api/data). Očekáváno z dist: ${dist.size} souborů.`)
  if (!polozky.length) vysledek('CHYBA', 'Výpis serveru', 'výpis je prázdný')
  else if (necitelne) vysledek('CHYBA', 'Výpis serveru', `${necitelne} řádků výpisu nešlo přečíst – kontrola by mohla něco přehlédnout`)
  else if (!naServeru.has('.htaccess')) vysledek('CHYBA', 'Výpis serveru', 've výpisu chybí kořenový .htaccess – server asi neukazuje skryté soubory, kontrola by je přehlédla')
  else vysledek('OK', 'Výpis serveru', `${polozky.length} položek, skryté soubory jsou vidět`)

  // Nejnovější změny mimo api/data (pomůže odhadnout, kdy se co stalo).
  const nejnovejsi = [...naServeru.values()].filter(p => p.cas !== '-').sort((x, y) => y.cas.localeCompare(x.cas)).slice(0, 10)
  console.log('\nNaposledy změněné soubory mimo api/data (čas UTC):')
  for (const p of nejnovejsi) radek(`${p.cas}  ${cisty(p.cesta)}`)

  // --- Soubory navíc / chybějící / jiná velikost
  console.log('\nSoubory navíc na serveru (mimo api/data):')
  const navicPodezrele = [], navicOstatni = [], odkazy = []
  for (const p of naServeru.values()) {
    if (p.typ !== 'f') { odkazy.push(p); continue }
    if (dist.has(p.cesta) || povoleno(p.cesta)) continue
    ;(aktivni(p.cesta) || skryty(p.cesta) ? navicPodezrele : navicOstatni).push(p)
  }
  for (const p of navicPodezrele) radek(`PODEZŘELÉ  ${cisty(p.cesta)}  (${p.velikost ?? '?'} B, ${p.cas})`)
  for (const p of navicOstatni) radek(`navíc      ${cisty(p.cesta)}  (${p.velikost ?? '?'} B, ${p.cas})`)
  for (const p of odkazy) radek(`PODEZŘELÉ  ${cisty(p.cesta)}  (typ „${p.typ}“ – symbolický odkaz nebo zvláštní soubor${p.cil ? ', cíl ' + cisty(p.cil) : ''})`)
  if (!navicPodezrele.length && !navicOstatni.length && !odkazy.length) radek('žádné')
  if (navicPodezrele.length || odkazy.length) {
    vysledek('PODEZŘELÉ', 'Soubory navíc', `${navicPodezrele.length + odkazy.length} spustitelných/skrytých souborů nebo odkazů navíc, dalších ${navicOstatni.length} souborů navíc`)
  } else if (navicOstatni.length) {
    vysledek('UPOZORNĚNÍ', 'Soubory navíc', `${navicOstatni.length} neškodných souborů navíc (obrázky apod., nejspíš pozůstatky starších verzí)`)
  } else vysledek('OK', 'Soubory navíc', 'žádné')

  console.log('\nSoubory, které na serveru chybějí nebo mají jinou velikost:')
  const chybi = [], jinaVelikost = []
  for (const [cesta, d] of dist) {
    const p = cesta.startsWith(DATA) ? dataSoubory.find(x => x.cesta === cesta) : naServeru.get(cesta)
    if (!p) chybi.push(cesta)
    else if (p.velikost !== null && p.velikost !== d.velikost) jinaVelikost.push(cesta)
  }
  for (const c of chybi) radek(`chybí          ${cisty(c)}`)
  for (const c of jinaVelikost) radek(`jiná velikost  ${cisty(c)}  (server ${naServeru.get(c)?.velikost ?? dataSoubory.find(x => x.cesta === c)?.velikost} B, dist ${dist.get(c).velikost} B)`)
  if (!chybi.length && !jinaVelikost.length) radek('žádné')
  const ochrana = c => KONTROLOVAT_JMENA.has(c.split('/').pop())
  if (chybi.some(ochrana) || jinaVelikost.some(c => c.startsWith(DATA))) {
    vysledek('PODEZŘELÉ', 'Chybějící soubory', `chybí nebo je změněný ochranný soubor (.htaccess/.user.ini): ${[...chybi, ...jinaVelikost].filter(c => ochrana(c)).map(cisty).join(', ')}`)
  } else if (chybi.length || jinaVelikost.length) {
    vysledek('UPOZORNĚNÍ', 'Chybějící soubory', `${chybi.length} chybí, ${jinaVelikost.length} s jinou velikostí – server asi nemá poslední nasazení (proběhl deploy-wedos úspěšně?)`)
  } else vysledek('OK', 'Chybějící soubory', 'všechny soubory z dist jsou na serveru')

  // --- Otisky SHA-256 a stopy webshellu
  console.log('\nObsah (SHA-256) souborů .php/.htaccess/.html/.js/… mimo api/data:')
  const ocekavaneStazeni = new Set(keStazeni(mimo).map(p => p.cesta))
  const nestazitelne = mimo.filter(p => p.typ === 'f' && kontrolovatObsah(p.cesta) && !ocekavaneStazeni.has(p.cesta))
  let shoda = 0
  const zmenene = [], nestazene = [], nalezy = []
  for (const cesta of ocekavaneStazeni) {
    const soubor = join(a.stazeno, ...cesta.split('/'))
    if (!existsSync(soubor)) { nestazene.push(cesta); continue }
    const server = readFileSync(soubor)
    const d = dist.get(cesta)
    const vDist = d ? readFileSync(d.soubor) : null
    if (d) {
      if (sha256(obsahKPorovnani(cesta, server)) === sha256(obsahKPorovnani(cesta, vDist))) shoda++
      else zmenene.push(cesta)
    }
    const naDist = vDist ? hledat(cesta, vDist) : new Map()
    for (const [vzor, pocet] of hledat(cesta, server)) {
      if (pocet > (naDist.get(vzor) || 0)) nalezy.push(`${cisty(cesta)}: ${vzor} (server ${pocet}×, dist ${naDist.get(vzor) || 0}×)`)
    }
  }
  for (const c of zmenene) radek(`JINÝ OBSAH  ${cisty(c)}`)
  for (const c of nestazene) radek(`nestaženo   ${cisty(c)}`)
  for (const p of nestazitelne) radek(`nestaženo   ${cisty(p.cesta)}  (${p.velikost > LIMIT_VELIKOSTI ? 'větší než 20 MB' : 'neobvyklé znaky v názvu'})`)
  radek(`shodných: ${shoda}`)
  if (zmenene.length) vysledek('PODEZŘELÉ', 'Obsah souborů (SHA-256)', `${zmenene.length} souborů má jiný obsah než dist: ${zmenene.slice(0, 5).map(cisty).join(', ')}${zmenene.length > 5 ? ' …' : ''}`)
  else if (nestazene.length || nestazitelne.length) vysledek('PODEZŘELÉ', 'Obsah souborů (SHA-256)', `${nestazene.length + nestazitelne.length} souborů nešlo zkontrolovat (viz log)`)
  else if (!ocekavaneStazeni.size) vysledek('CHYBA', 'Obsah souborů (SHA-256)', 'nic ke kontrole – výpis je asi neúplný')
  else vysledek('OK', 'Obsah souborů (SHA-256)', `${shoda} souborů shodných s dist`)

  console.log('\nNové stopy webshellu (nejsou ve stejném souboru v dist):')
  for (const n of nalezy) radek(n)
  if (!nalezy.length) radek('žádné')
  if (nalezy.length) vysledek('PODEZŘELÉ', 'Stopy webshellu', `${nalezy.length} nových nálezů: ${nalezy.slice(0, 3).join('; ')}${nalezy.length > 3 ? ' …' : ''}`)
  else vysledek('OK', 'Stopy webshellu', `prohledáno ${ocekavaneStazeni.size - nestazene.length} souborů, nic nového`)

  // --- api/data: jen počty a podezřelé položky
  console.log('\nSložka api/data (jen počty, běžná jména se nevypisují):')
  const pocty = new Map()
  const podezrele = []
  for (const p of dataSoubory) {
    const slozka = p.cesta.includes('/', DATA.length) ? p.cesta.slice(0, p.cesta.lastIndexOf('/') + 1) : DATA
    pocty.set(slozka, (pocty.get(slozka) || 0) + 1)
    const jmeno = p.cesta.split('/').pop()
    const duvody = []
    if (p.typ !== 'f') duvody.push(`typ „${p.typ}“ (odkaz / zvláštní soubor)`)
    if (PODEZRELE_V_DATECH.test(jmeno) && !OCEKAVANE_V_DATECH.has(p.cesta)) duvody.push('spustitelná přípona nebo konfigurace serveru')
    if (/\.php\d?\./i.test(jmeno) && !DOCASNE_V_DATECH.test(p.cesta)) duvody.push('dvojitá přípona .php.')
    if (skryty(p.cesta.slice(DATA.length)) && !SKRYTE_V_DATECH.has(p.cesta)) duvody.push('skrytý soubor')
    if (p.velikost !== null && p.velikost > LIMIT_VELIKOSTI) duvody.push(`velikost ${(p.velikost / MB).toFixed(1)} MB`)
    if (duvody.length) podezrele.push(`${cisty(p.cesta)}  (${duvody.join(', ')}; ${p.velikost ?? '?'} B, ${p.cas})`)
  }
  for (const p of data.filter(p => p.typ === 'd')) if (!pocty.has(p.cesta + '/')) pocty.set(p.cesta + '/', 0)
  pocty.delete('api/data/')
  radek(`api/data/: ${dataSoubory.filter(p => !p.cesta.includes('/', DATA.length)).length} souborů`)
  for (const [slozka, n] of [...pocty].sort()) radek(`${cisty(slozka)}: ${n} souborů`)
  for (const p of podezrele) radek(`PODEZŘELÉ  ${p}`)
  if (!data.length) vysledek('CHYBA', 'api/data', 'složka api/data ve výpisu chybí')
  else if (podezrele.length) vysledek('PODEZŘELÉ', 'api/data', `${podezrele.length} podezřelých položek (viz log)`)
  else if (!dataSoubory.some(p => p.cesta === 'api/data/.htaccess')) vysledek('PODEZŘELÉ', 'api/data', 'chybí api/data/.htaccess – data by mohla být vidět z webu')
  else vysledek('OK', 'api/data', `${dataSoubory.length} souborů, nic podezřelého`)

  appendFileSync(a.vysledky, vysledky.map(r => r.join('\t')).join('\n') + '\n')
}

// ----------------------------------------------------------------------------------------------

const [prikaz, ...zbytek] = process.argv.slice(2)
const a = argumenty(zbytek)
if (prikaz === 'plan') plan(a)
else if (prikaz === 'vyhodnotit') vyhodnotit(a)
else { console.error('použití: node porovnat.mjs plan|vyhodnotit --dist … --vypis …'); process.exit(2) }
