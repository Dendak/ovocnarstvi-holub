// „Moje objednávky“ bez registrace: údaje a historie se ukládají jen
// v prohlížeči zákazníka (localStorage), nikam se neodesílají.
const KEY = 'ovoce-holub-ucet'

function nacist() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { udaje: d.udaje || null, objednavky: Array.isArray(d.objednavky) ? d.objednavky : [] }
  } catch {
    return { udaje: null, objednavky: [] }
  }
}

function ulozit(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* private mode – nothing to do */ }
}

export function nacistUdaje() {
  return nacist().udaje
}

export function nacistObjednavky() {
  return nacist().objednavky
}

// udaje = null → uložené údaje smazat (zákazník si nepřál je pamatovat)
export function ulozitObjednavku(objednavka, udaje) {
  const d = nacist()
  ulozit({ udaje, objednavky: [objednavka, ...d.objednavky].slice(0, 30) })
}

export function smazatVse() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
