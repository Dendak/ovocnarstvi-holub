import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { PRODUKTY, variantaBedynky, formatMnozstvi, nazevPolozky } from './katalog'

const STORAGE_KEY = 'ovoce-holub-kosik'
const MAX = 500
const KosikContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'pridat': {
      const key = `${action.produktId}|${action.variantaId}`
      const qty = (state[key] || 0) + action.pocet
      return { ...state, [key]: Math.min(qty, MAX) }
    }
    case 'nastavit': {
      const next = { ...state }
      if (action.pocet <= 0) delete next[action.key]
      else next[action.key] = Math.min(action.pocet, MAX)
      return next
    }
    case 'odebrat': {
      const next = { ...state }
      for (const key of action.keys) delete next[key]
      return next
    }
    case 'vyprazdnit':
      return {}
    default:
      return state
  }
}

function nacist() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (!raw || typeof raw !== 'object') return {}
    // Jen rozumné počty – poškozený záznam nesmí rozbít součet.
    return Object.fromEntries(Object.entries(raw).filter(([, n]) => Number.isInteger(n) && n > 0).map(([k, n]) => [k, Math.min(n, MAX)]))
  } catch {
    return {}
  }
}

// Položka košíku podle klíče „produkt|varianta“. Co už v nabídce není (vyprodáno, mimo sezónu,
// příchuť došla, bedýnka pro skupinu skončila), zůstane v košíku jako `nedostupne`: zákazník to
// uvidí a odebere, do součtu se to nepočítá a objednat to nejde.
function najit(key) {
  const [produktId, variantaId = ''] = key.split('|')
  const produkt = PRODUKTY.find(p => p.id === produktId)
  if (!produkt) {
    return {
      produkt: { id: produktId, nazev: 'Položka, která už není v nabídce', druhNazev: '', jednotka: 'ks' },
      varianta: { id: variantaId, label: '', cena: null }, nedostupne: true,
    }
  }
  if (produkt.bedynka) {
    const varianta = variantaBedynky(produkt, variantaId)
    return varianta
      ? { produkt, varianta, nedostupne: false }
      : { produkt, varianta: { id: variantaId, label: `${produkt.bedynka.kg} kg`, nazev: produkt.nazev, cena: produkt.bedynka.cena }, nedostupne: true }
  }
  const varianta = produkt.varianty.find(v => v.id === variantaId)
  if (varianta) return { produkt, varianta, nedostupne: !produkt.dostupne }
  // Mošt s příchutí, která došla: název a velikost se dohledají podle příchuti.
  const prichut = produkt.prichute?.find(p => variantaId.startsWith(`${p.id}-`))
  const velikost = prichut && produkt.velikosti?.find(v => variantaId === `${prichut.id}-${v.id}`)
  return {
    produkt,
    varianta: { id: variantaId, label: velikost?.label || '', nazev: prichut?.nazevPolozky || produkt.nazev, cena: velikost ? prichut.ceny[velikost.id] : null },
    nedostupne: true,
  }
}

export function KosikProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, nacist)
  // Poslední přidání do košíku – hlášení pro čtečky obrazovky a krátká bublina na stránce.
  const [oznameni, setOznameni] = useState(null)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* private mode */ }
  }, [state])

  const value = useMemo(() => {
    const polozky = Object.entries(state).map(([key, pocet]) => {
      const { produkt, varianta, nedostupne } = najit(key)
      return { key, produkt, varianta, pocet, nedostupne, cena: nedostupne || varianta.cena == null ? null : varianta.cena * pocet }
    })
    const dostupne = polozky.filter(p => !p.nedostupne)
    const soucet = dostupne.reduce((s, p) => s + (p.cena || 0), 0)
    const bezCeny = dostupne.some(p => p.cena == null)
    return {
      polozky, soucet, bezCeny,
      // počet řádků košíku (kila a kusy se nesčítají)
      pocetPolozek: polozky.length,
      nedostupne: polozky.length - dostupne.length,
      oznameni,
      pridat: (produktId, variantaId, pocet = 1, { tichy = false } = {}) => {
        dispatch({ type: 'pridat', produktId, variantaId, pocet })
        if (tichy) return
        const { produkt, varianta } = najit(`${produktId}|${variantaId}`)
        // n se mění s každým přidáním, aby čtečka ohlásila i stejnou položku podruhé
        setOznameni(pred => ({ text: `${formatMnozstvi(produkt, varianta, pocet)} ${nazevPolozky(produkt, varianta)}`, n: (pred?.n || 0) + 1 }))
      },
      nastavit: (key, pocet) => dispatch({ type: 'nastavit', key, pocet }),
      odebratNedostupne: () => dispatch({ type: 'odebrat', keys: polozky.filter(p => p.nedostupne).map(p => p.key) }),
      vyprazdnit: () => dispatch({ type: 'vyprazdnit' }),
      zavritOznameni: () => setOznameni(null),
    }
  }, [state, oznameni])

  return <KosikContext.Provider value={value}>{children}</KosikContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKosik() {
  return useContext(KosikContext)
}
