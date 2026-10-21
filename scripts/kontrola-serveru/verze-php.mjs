// Vyhodnocení verze PHP ze sondy (scripts/kontrola-serveru/sonda.php).
//   node verze-php.mjs ODPOVED HTTP_KOD VYSLEDKY
// ODPOVED = soubor s tělem odpovědi (2 řádky: PHP_VERSION, php_sapi_name()). Tělo se vypíše jen tehdy,
// když přesně odpovídá očekávanému tvaru – chybovou stránku serveru do logu nedáváme.
//
// PHP2Shell (CVE-2026-109618, CVE-2026-109619): opraveno v 8.5.12, 8.4.27, 8.3.36, 8.2.35 (21. 10. 2026).
// Starší větve (8.1 a níž) opravu nedostaly → nezáplatované.
import { appendFileSync, readFileSync } from 'node:fs'

export const OPRAVENO = { '8.5': 12, '8.4': 27, '8.3': 36, '8.2': 35 }
const NEJNOVEJSI_VETEV = [8, 5]

// → { stav: 'OK' | 'PODEZŘELÉ' | 'CHYBA', popis }
export function posoudit(text, kod) {
  const radky = String(text).replace(/\r/g, '').trim().split('\n')
  if (kod !== '200' || radky.length !== 2) return { stav: 'CHYBA', popis: `sonda neodpověděla očekávaně (HTTP ${kod})` }
  const [verze, sapi] = radky
  const m = /^(\d+)\.(\d+)\.(\d+)([-+~.\w]*)$/.exec(verze)
  if (!m || !/^[\w-]{1,40}$/.test(sapi)) return { stav: 'CHYBA', popis: `odpověď sondy nemá očekávaný tvar (HTTP ${kod})` }
  const [, hlavni, vedlejsi, oprava, pripona] = m
  const vetev = `${hlavni}.${vedlejsi}`
  const info = `PHP ${verze}, SAPI ${sapi}`
  if (/(alpha|beta|rc|dev)/i.test(pripona)) return { stav: 'PODEZŘELÉ', popis: `${info} – testovací verze, oprava nejistá` }
  if (vetev in OPRAVENO) {
    return Number(oprava) >= OPRAVENO[vetev]
      ? { stav: 'OK', popis: `${info} – záplatováno (≥ ${vetev}.${OPRAVENO[vetev]})` }
      : { stav: 'PODEZŘELÉ', popis: `${info} – NEZÁPLATOVÁNO proti PHP2Shell (potřeba ≥ ${vetev}.${OPRAVENO[vetev]}), požádat Wedos / přepnout verzi PHP v administraci` }
  }
  const novejsi = Number(hlavni) > NEJNOVEJSI_VETEV[0] || (Number(hlavni) === NEJNOVEJSI_VETEV[0] && Number(vedlejsi) > NEJNOVEJSI_VETEV[1])
  return novejsi
    ? { stav: 'OK', popis: `${info} – novější větev než opravené (ověřit v oznámení PHP)` }
    : { stav: 'PODEZŘELÉ', popis: `${info} – větev ${vetev} už opravy nedostává, NEZÁPLATOVÁNO` }
}

if (process.argv[1]?.endsWith('verze-php.mjs')) {
  const [soubor, kod, vysledky] = process.argv.slice(2)
  if (soubor) {
    let text = ''
    try { text = readFileSync(soubor, 'utf8').slice(0, 1000) } catch { /* žádná odpověď */ }
    const { stav, popis } = posoudit(text, kod)
    console.log(`==> [${stav}] Verze PHP: ${popis}`)
    appendFileSync(vysledky, `${stav}\tVerze PHP\t${popis}\n`)
  }
}
