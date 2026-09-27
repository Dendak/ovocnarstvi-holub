import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { PRODUKTY } from './katalog'

const STORAGE_KEY = 'ovoce-holub-kosik'
const KosikContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'pridat': {
      const key = `${action.produktId}|${action.variantaId}`
      const qty = (state[key] || 0) + action.pocet
      return { ...state, [key]: Math.min(qty, 99) }
    }
    case 'nastavit': {
      const next = { ...state }
      if (action.pocet <= 0) delete next[action.key]
      else next[action.key] = Math.min(action.pocet, 99)
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
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

export function KosikProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, nacist)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* private mode */ }
  }, [state])

  const value = useMemo(() => {
    // Drop entries whose product or variant no longer exists in the catalog.
    const polozky = Object.entries(state).flatMap(([key, pocet]) => {
      const [produktId, variantaId] = key.split('|')
      const produkt = PRODUKTY.find(p => p.id === produktId)
      const varianta = produkt?.varianty.find(v => v.id === variantaId)
      if (!produkt || !varianta) return []
      return [{ key, produkt, varianta, pocet, cena: varianta.cena == null ? null : varianta.cena * pocet }]
    })
    const soucet = polozky.reduce((s, p) => s + (p.cena || 0), 0)
    const bezCeny = polozky.some(p => p.cena == null)
    const pocetKusu = polozky.reduce((s, p) => s + p.pocet, 0)
    return {
      polozky, soucet, bezCeny, pocetKusu,
      pridat: (produktId, variantaId, pocet = 1) => dispatch({ type: 'pridat', produktId, variantaId, pocet }),
      nastavit: (key, pocet) => dispatch({ type: 'nastavit', key, pocet }),
      vyprazdnit: () => dispatch({ type: 'vyprazdnit' }),
    }
  }, [state])

  return <KosikContext.Provider value={value}>{children}</KosikContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKosik() {
  return useContext(KosikContext)
}
