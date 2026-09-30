// Zákaznická skupina s kódem (např. zaměstnanci ústavu): vlastní ceny a pevná doručovací adresa.
// Kód se ověřuje na hostingu (api/skupina.php); výsledek si prohlížeč pamatuje, aby se ceny
// v katalogu spočítaly hned při načtení stránky. Po změně skupiny se stránka načte znovu.
const KLIC = 'oh_skupina3'
const DEN = 24 * 3600 * 1000

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

// Členství se na serveru ověřuje znovu nejvýš jednou denně (skupina má omezený počet účtů).
export const skupinaJeCerstva = () => !!SKUPINA && Date.now() - (SKUPINA.overeno || 0) < DEN

// Ověří kód na serveru. S přístupovým tokenem přihlášeného zákazníka ho zároveň zapíše mezi členy skupiny.
// Vrací { skupina } | { skupina: null, plno } (skupina má plno) | { skupina: null, chyba } (spojení).
export async function overitKod(kod, token) {
  kod = kod.trim().toLowerCase()
  if (!kod) return { skupina: null }
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/skupina.php?kod=${encodeURIComponent(kod)}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
    const d = await res.json().catch(() => null)
    if (!d || d.limit || d.prihlaseni) return { skupina: null, chyba: true }
    if (!d.ok) return { skupina: null, plno: !!d.plno }
    return { skupina: { ...d.skupina, kod, overeno: Date.now() }, neprihlasen: !!d.neprihlasen }
  } catch {
    return { skupina: null, chyba: true }
  }
}

// Uvolní místo ve skupině (zákazník kód zrušil).
export async function opustitSkupinu(kod, token) {
  try {
    await fetch(`${import.meta.env.BASE_URL}api/skupina.php?odebrat=1&kod=${encodeURIComponent(kod)}`, { headers: { Authorization: `Bearer ${token}` } })
  } catch { /* the slot stays taken until the admin frees it */ }
}

// Uloží / zruší skupinu v prohlížeči. Vrací true, pokud se něco změnilo (pak je potřeba stránku načíst znovu).
export function nastavitSkupinu(skupina) {
  const pred = localStorage.getItem(KLIC)
  if (skupina) localStorage.setItem(KLIC, JSON.stringify(skupina))
  else localStorage.removeItem(KLIC)
  return pred !== localStorage.getItem(KLIC)
}

// Pozvánka odkazem: eshop.html?kod=elektron. Kód si prohlížeč zapamatuje, dokud se zákazník
// nezaregistruje nebo nepřihlásí – pak se uplatní sám. Z adresy se hned odstraní.
const KLIC_POZVANKY = 'oh_kod_pozvanka'
try {
  const url = new URL(location.href)
  const kod = (url.searchParams.get('kod') || '').trim().toLowerCase()
  if (/^[a-z0-9-]{2,40}$/.test(kod)) {
    localStorage.setItem(KLIC_POZVANKY, kod)
    url.searchParams.delete('kod')
    history.replaceState(null, '', url.pathname + url.search + url.hash)
  }
} catch { /* no storage – the code can still be typed in by hand */ }

export function cekajiciKod() {
  try { return localStorage.getItem(KLIC_POZVANKY) || '' } catch { return '' }
}
export function smazatCekajiciKod() {
  try { localStorage.removeItem(KLIC_POZVANKY) } catch { /* ignore */ }
}
