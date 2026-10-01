import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SKUPINA, skupinaJeCerstva, overitKod, opustitSkupinu, nastavitSkupinu, cekajiciKod, smazatCekajiciKod } from './skupina'
import { SUPABASE_URL, SUPABASE_ANON_KEY, UCTY_ZAPNUTE } from './supabaseConfig'

const ZAPNUTO = !!(UCTY_ZAPNUTE && SUPABASE_URL && SUPABASE_ANON_KEY)

// Knihovna Supabase je velká, a tak se stahuje, až když je potřeba (viz HNED a otevření účtu).
// PKCE keeps the auth callback in the query string (?code=…), so it doesn't
// clash with the e-shop's hash navigation (#pokladna, #ucet …).
let klientPromise = null
// eslint-disable-next-line react-refresh/only-export-components
export function nactiSupabase() {
  if (!ZAPNUTO) return Promise.resolve(null)
  klientPromise ??= import('@supabase/supabase-js')
    .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } }))
    .catch(e => { klientPromise = null; throw e })
  return klientPromise
}

// Uložená relace (i rozpracované přihlášení) = klíče „sb-<projekt>-auth-token…“ v localStorage.
function moznaRelace() {
  try {
    const klic = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
    for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith(klic)) return true
  } catch { /* no storage */ }
  return false
}

// Návrat z přihlášení přes Google/Seznam/Microsoft nebo z odkazu v e-mailu (?code=… nebo chyba v adrese).
let navrat = /[?&#](code|error|error_code|error_description|access_token)=/.test(location.search + location.hash)

// Knihovnu je potřeba hned: zákazník může být přihlášený, vrací se z přihlášení, nebo má uloženou
// skupinu (ta se ověřuje u účtu a bez přihlášení se zruší).
const HNED = ZAPNUTO && (navrat || moznaRelace() || !!SKUPINA)

const AuthContext = createContext({ zapnuto: false, uzivatel: null, nacita: false })

const zpet = () => `${location.origin}${location.pathname}`

// Kam po přihlášení: pokladna si to poznačí (odkaz „Přihlaste se“), jinak účet.
const KLIC_CIL = 'poPrihlaseni'
function vzitCil() {
  try { const c = sessionStorage.getItem(KLIC_CIL); sessionStorage.removeItem(KLIC_CIL); return c } catch { return null }
}

// Přepne zobrazení e-shopu (hash) bez nového záznamu v historii.
function prejit(hash) {
  history.replaceState(null, '', location.pathname + location.search + hash)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

// Z adresy zmizí ?code=… a chybové parametry z odkazu v e-mailu.
function vycistitAdresu() {
  const url = new URL(location.href)
  for (const k of ['code', 'error', 'error_code', 'error_description', 'sb']) url.searchParams.delete(k)
  const hash = /(^#|&)(error|error_code|error_description|access_token)=/.test(url.hash) ? '' : url.hash
  history.replaceState(null, '', url.pathname + url.search + hash)
}

// Stejný uživatel (Supabase ho po přepnutí aplikace posílá znovu jako nový objekt) = stejný objekt,
// aby se nepřepisovalo, co zákazník právě vyplňuje.
const stejny = (pred, u) => (pred && u && pred.id === u.id && pred.updated_at === u.updated_at ? pred : u)

// Supabase error messages are English; show the common ones in Czech.
// eslint-disable-next-line react-refresh/only-export-components
export function prelozChybu(err) {
  const m = (err?.message || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'Nesprávný e-mail nebo heslo.'
  if (m.includes('email not confirmed')) return 'E-mail ještě není potvrzený – klikněte na odkaz, který jsme vám poslali.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'Účet s tímto e-mailem už existuje. Zkuste se přihlásit nebo obnovit heslo.'
  if (m.includes('password should be at least') || m.includes('weak password')) return 'Heslo je příliš slabé – použijte aspoň 8 znaků.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Příliš mnoho pokusů. Zkuste to prosím za chvíli.'
  if (m.includes('same password')) return 'Nové heslo musí být jiné než to současné.'
  if (m.includes('network') || m.includes('fetch')) return 'Nepodařilo se spojit se serverem. Zkontrolujte připojení.'
  return 'Něco se nepovedlo. Zkuste to prosím znovu.'
}

export function AuthProvider({ children }) {
  const [klient, setKlient] = useState(null)
  const [uzivatel, setUzivatel] = useState(null)
  const [nacita, setNacita] = useState(HNED)
  const [obnovaHesla, setObnovaHesla] = useState(false)
  const [odkazNeplatny, setOdkazNeplatny] = useState(false)

  // Knihovna se načte hned (viz HNED), jinak až při otevření účtu nebo objednávek.
  useEffect(() => {
    if (!ZAPNUTO) return
    let zruseno = false
    const pripojit = () => nactiSupabase()
      .then(k => { if (!zruseno) setKlient(k) })
      .catch(() => { if (!zruseno) setNacita(false) })
    const potreba = () => /^#(ucet|nove-heslo|objednavky)$/.test(location.hash)
    if (HNED || potreba()) pripojit()
    const onHash = () => { if (potreba()) pripojit() }
    window.addEventListener('hashchange', onHash)
    return () => { zruseno = true; window.removeEventListener('hashchange', onHash) }
  }, [])

  useEffect(() => {
    if (!klient) return
    let zruseno = false
    // Po návratu z přihlášení nebo z odkazu v e-mailu: úklid adresy a přechod na správné místo.
    // Když se relace nepodařila (odkaz vypršel, nebo byl otevřený v jiném prohlížeči), řekneme to.
    const dokoncitNavrat = session => {
      if (!navrat) return
      navrat = false
      vycistitAdresu()
      if (!session) { setOdkazNeplatny(true); prejit('#ucet'); return }
      prejit(vzitCil() || (location.hash.length > 1 ? location.hash : '#ucet'))
    }
    klient.auth.getSession().then(({ data }) => {
      if (zruseno) return
      setUzivatel(pred => stejny(pred, data.session?.user ?? null))
      setNacita(false)
      dokoncitNavrat(data.session)
    })
    const { data: sub } = klient.auth.onAuthStateChange((event, session) => {
      setUzivatel(pred => stejny(pred, session?.user ?? null))
      if (event === 'PASSWORD_RECOVERY') { navrat = false; vycistitAdresu(); setObnovaHesla(true); location.hash = '#nove-heslo' }
      if (event === 'SIGNED_IN') {
        if (navrat) dokoncitNavrat(session)
        else { const cil = vzitCil(); if (cil) prejit(cil) }
      }
    })
    return () => { zruseno = true; sub.subscription.unsubscribe() }
  }, [klient])

  // Group prices belong to the signed-in account: the account's code is claimed on the server
  // (groups have a limited number of accounts), re-checked daily and dropped on sign-out.
  // A change reloads the page once, because catalogue prices are computed at load.
  useEffect(() => {
    if (!klient || nacita) return
    const kod = uzivatel?.user_metadata?.kod || ''
    if (kod === (SKUPINA?.kod || '') && (!kod || skupinaJeCerstva())) return
    let zruseno = false
    ;(async () => {
      const token = uzivatel ? (await klient.auth.getSession()).data.session?.access_token : null
      if (uzivatel && !kod && SKUPINA?.kod && token) await opustitSkupinu(SKUPINA.kod, token)
      const { skupina, chyba } = kod && token ? await overitKod(kod, token) : { skupina: null }
      if (zruseno || chyba) return
      if (nastavitSkupinu(skupina)) location.reload()
    })()
    return () => { zruseno = true }
  }, [klient, uzivatel, nacita])

  // An invitation link (eshop.html?kod=…) is applied to the account at the first sign-in.
  // Saving the code to the account triggers the effect above, which claims it and reloads.
  useEffect(() => {
    if (!klient || nacita || !uzivatel) return
    const kod = cekajiciKod()
    if (!kod) return
    smazatCekajiciKod()
    if (uzivatel.user_metadata?.kod) return
    klient.auth.updateUser({ data: { kod } })
  }, [klient, uzivatel, nacita])

  const value = useMemo(() => {
    // Každá akce si knihovnu případně dotáhne; bez spojení vrátí chybu jako Supabase.
    const s = fn => async (...args) => {
      let k
      try { k = await nactiSupabase() } catch { return { data: {}, error: { message: 'network' } } }
      setKlient(k)
      return fn(k, ...args)
    }
    return {
      zapnuto: ZAPNUTO,
      uzivatel,
      nacita,
      obnovaHesla,
      odkazNeplatny,
      prihlasit: s((k, email, heslo) => k.auth.signInWithPassword({ email, password: heslo })),
      registrovat: s((k, email, heslo, udaje) => k.auth.signUp({
        email, password: heslo, options: { data: udaje, emailRedirectTo: zpet() },
      })),
      prihlasitPres: s((k, provider) => k.auth.signInWithOAuth({
        provider,
        // Microsoft vrací e-mail jen s tímto scope.
        options: { redirectTo: zpet(), ...(provider === 'azure' ? { scopes: 'email' } : {}) },
      })),
      zapomenuteHeslo: s((k, email) => k.auth.resetPasswordForEmail(email, { redirectTo: zpet() })),
      noveHeslo: s(async (k, heslo) => { const r = await k.auth.updateUser({ password: heslo }); if (!r.error) setObnovaHesla(false); return r }),
      ulozitProfil: s((k, udaje) => k.auth.updateUser({ data: udaje })),
      odhlasit: s(k => k.auth.signOut()),
      token: async () => {
        const k = await nactiSupabase().catch(() => null)
        return k ? (await k.auth.getSession()).data.session?.access_token || null : null
      },
    }
  }, [uzivatel, nacita, obnovaHesla, odkazNeplatny])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}

// Pokladna si poznačí, že se má zákazník po přihlášení vrátit k objednávce.
// eslint-disable-next-line react-refresh/only-export-components
export function poPrihlaseniZpet(hash) {
  try { sessionStorage.setItem(KLIC_CIL, hash) } catch { /* private mode */ }
}
// eslint-disable-next-line react-refresh/only-export-components
export function zrusitCilPoPrihlaseni() {
  try { sessionStorage.removeItem(KLIC_CIL) } catch { /* private mode */ }
}
