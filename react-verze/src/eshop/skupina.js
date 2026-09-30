// Zákaznická skupina s kódem (např. zaměstnanci ústavu): vlastní ceny a pevná doručovací adresa.
// Kód se ověřuje na hostingu (api/skupina.php); výsledek si prohlížeč pamatuje, aby se ceny
// v katalogu spočítaly hned při načtení stránky. Po změně skupiny se stránka načte znovu.
const KLIC = 'oh_skupina'

function nacist() {
  try {
    const s = JSON.parse(localStorage.getItem(KLIC))
    return s && typeof s.nazev === 'string' && typeof s.kod === 'string' ? s : null
  } catch { return null }
}

export const SKUPINA = nacist()

// Cena pro skupinu: pevná cena za kg podle druhu, jinak procentní sleva.
export function cenaSkupiny(druhId, cena) {
  if (!SKUPINA || cena == null) return cena
  const pevna = SKUPINA.ceny?.[druhId]
  if (typeof pevna === 'number') return pevna
  return SKUPINA.sleva > 0 ? Math.round(cena * (100 - SKUPINA.sleva) / 100) : cena
}

// Ověří kód na serveru. Vrací skupinu, nebo null (neplatný kód / chyba spojení → `chyba: true`).
export async function overitKod(kod) {
  kod = kod.trim().toLowerCase()
  if (!kod) return { skupina: null }
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/skupina.php?kod=${encodeURIComponent(kod)}`)
    if (!res.ok) return { skupina: null, chyba: true }
    const d = await res.json()
    return { skupina: d.ok ? { ...d.skupina, kod } : null }
  } catch {
    return { skupina: null, chyba: true }
  }
}

// Uloží / zruší skupinu v prohlížeči. Vrací true, pokud se něco změnilo (pak je potřeba stránku načíst znovu).
export function nastavitSkupinu(skupina) {
  const pred = localStorage.getItem(KLIC)
  if (skupina) localStorage.setItem(KLIC, JSON.stringify(skupina))
  else localStorage.removeItem(KLIC)
  return pred !== localStorage.getItem(KLIC)
}
