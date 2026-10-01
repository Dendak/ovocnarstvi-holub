// ============================================================
//  TERMÍNY DOVOZU A ODBĚRU
//  Objednávka platí hned po odeslání, zákazník dostane automatické
//  potvrzení e-mailem. Farma se ozve jen když něco není k dispozici.
//  Stejná pravidla kontroluje i server: při sestavení webu se zapíší
//  do api/_cenik.php (viz vite.config.js) a api/potvrzeni.php podle nich
//  odmítne den, který už objednat nejde.
// ============================================================
export const UZAVERKA_HODINA = 18            // objednat nejpozději den předem do 18:00
export const DNY_ROZVOZU = [1, 3, 5]         // po, st, pá
export const DNY_ODBERU = [1, 2, 3, 4, 5, 6] // po–so
export const POCET_TERMINU = 6               // kolik nejbližších dnů se nabízí

// Svátky, kdy nerozvážíme ani nevydáváme (státní a ostatní svátky, ve tvaru „den.měsíc.“).
// Velký pátek a Velikonoční pondělí se počítají samy.
export const SVATKY = ['1.1.', '1.5.', '8.5.', '5.7.', '6.7.', '28.9.', '28.10.', '17.11.', '24.12.', '25.12.', '26.12.']
// Další dny, kdy je zavřeno (dovolená apod.), ve tvaru 'RRRR-MM-DD', např. '2026-11-02'.
export const ZAVRENO = []

// Pro server (api/_cenik.php).
export const PRAVIDLA_TERMINU = {
  uzaverka: UZAVERKA_HODINA, rozvoz: DNY_ROZVOZU, odber: DNY_ODBERU, pocet: POCET_TERMINU, svatky: SVATKY, zavreno: ZAVRENO,
}

const DNY = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota']

// Velikonoční neděle v daném roce (gregoriánský kalendář).
function velikonoce(rok) {
  const a = rok % 19, b = Math.floor(rok / 100), c = rok % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const n = h + l - 7 * m + 114
  return new Date(rok, Math.floor(n / 31) - 1, (n % 31) + 1, 12)
}

function jeZavreno(den) {
  if (SVATKY.includes(`${den.getDate()}.${den.getMonth() + 1}.`)) return true
  const p = x => String(x).padStart(2, '0')
  if (ZAVRENO.includes(`${den.getFullYear()}-${p(den.getMonth() + 1)}-${p(den.getDate())}`)) return true
  const odVelikonoc = Math.round((den - velikonoce(den.getFullYear())) / 86400000)
  return odVelikonoc === -2 || odVelikonoc === 1
}

// Český čas (uzávěrka platí podle hodin na farmě, i když má telefon jiné časové pásmo – stejně jako na serveru).
function vCesku(d) {
  try {
    const c = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Prague', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
    }).formatToParts(d).map(x => [x.type, Number(x.value)]))
    const t = new Date(c.year, c.month - 1, c.day, c.hour, c.minute, c.second)
    return Number.isNaN(t.getTime()) ? new Date(d) : t
  } catch {
    return new Date(d)
  }
}

// Upcoming days on the given weekdays that can still be ordered for
// (order deadline is the previous day at UZAVERKA_HODINA; holidays are skipped).
export function terminy(dny, pocet = POCET_TERMINU, now = new Date()) {
  const ted = vCesku(now)
  const out = []
  for (let i = 1; out.length < pocet && i < 60; i++) {
    const den = new Date(ted)
    den.setHours(12, 0, 0, 0)
    den.setDate(den.getDate() + i)
    if (!dny.includes(den.getDay()) || jeZavreno(den)) continue
    const uzaverka = new Date(den)
    uzaverka.setDate(den.getDate() - 1)
    uzaverka.setHours(UZAVERKA_HODINA, 0, 0, 0)
    if (ted >= uzaverka) continue
    out.push(`${DNY[den.getDay()]} ${den.getDate()}. ${den.getMonth() + 1}.`)
  }
  return out
}
