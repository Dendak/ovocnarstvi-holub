import { supabase } from './auth'

// Stavy, které Pavel nastavuje v Supabase (tabulka objednavky, sloupec stav).
export const STAVY = {
  'přijatá': 'bg-blue-50 text-blue-800',
  'připravuje se': 'bg-amber-50 text-amber-800',
  'doručená': 'bg-green-50 text-green-800',
  'zrušená': 'bg-gray-100 text-gray-500',
}

export async function ulozitDoUctu(objednavka) {
  const { error } = await supabase.from('objednavky').insert({
    cislo: objednavka.cislo,
    termin: objednavka.termin,
    celkem: objednavka.celkem,
    radky: objednavka.radky,
    polozky: objednavka.polozky,
  })
  return !error
}

export async function nacistZUctu() {
  const { data, error } = await supabase
    .from('objednavky')
    .select('cislo, termin, celkem, radky, polozky, stav, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data.map(o => ({ ...o, datum: o.created_at }))
}
