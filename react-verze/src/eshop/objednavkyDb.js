import { nactiSupabase } from './auth'

// Kopie objednávky u zákaznického účtu (Supabase, tabulka objednavky) – pro „Moje objednávky“ a „Objednat znovu“.
export async function ulozitDoUctu(objednavka) {
  const supabase = await nactiSupabase()
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
  const supabase = await nactiSupabase()
  const { data, error } = await supabase
    .from('objednavky')
    .select('cislo, termin, celkem, radky, polozky, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data.map(o => ({ ...o, datum: o.created_at }))
}

// Skutečný stav objednávek z hostingu (api/stav.php): přijatá / zaplacená / doručená nebo vyzvednutá / zrušená,
// kolik je zaplaceno a odkaz na účtenku. Jen objednávky s e-mailem přihlášeného účtu.
export const STAVY = {
  prijato: { text: 'Přijatá', trida: 'bg-paper-2 text-ink' },
  zaplaceno: { text: 'Zaplacená', trida: 'bg-leaf/10 text-leaf' },
  doruceno: { text: 'Doručená', trida: 'bg-leaf text-white' },
  predano: { text: 'Vyzvednutá', trida: 'bg-leaf text-white' },
  zruseno: { text: 'Zrušená', trida: 'bg-berry/10 text-berry' },
}

export async function nacistStav(token) {
  if (!token) throw new Error('nepřihlášen')
  const res = await fetch(`${import.meta.env.BASE_URL}api/stav.php`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const d = await res.json().catch(() => null)
  if (!res.ok || !d?.ok || !Array.isArray(d.objednavky)) throw new Error('stav')
  return d.objednavky
}
