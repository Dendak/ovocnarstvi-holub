import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { SKUPINA, skupinaJeCerstva, overitKod, opustitSkupinu, nastavitSkupinu } from './skupina'
import { SUPABASE_URL, SUPABASE_ANON_KEY, UCTY_ZAPNUTE, SSO_POSKYTOVATELE, VLASTNI_POSKYTOVATELE } from './supabaseConfig'

// PKCE keeps the auth callback in the query string (?code=…), so it doesn't
// clash with the e-shop's hash navigation (#pokladna, #ucet …).
// eslint-disable-next-line react-refresh/only-export-components
export const supabase = UCTY_ZAPNUTE && SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } })
  : null

const AuthContext = createContext({ zapnuto: false, uzivatel: null, nacita: false })

const zpet = () => `${location.origin}${location.pathname}`

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
  const [uzivatel, setUzivatel] = useState(null)
  const [nacita, setNacita] = useState(!!supabase)
  const [obnovaHesla, setObnovaHesla] = useState(false)
  const [poskytovatele, setPoskytovatele] = useState([...SSO_POSKYTOVATELE, ...VLASTNI_POSKYTOVATELE])

  // Show SSO buttons for whatever is switched on in Supabase (Authentication → Providers),
  // so enabling Google there needs no redeploy.
  useEffect(() => {
    if (!supabase) return
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.external) setPoskytovatele([...['google', 'azure', 'apple'].filter(p => d.external[p]), ...VLASTNI_POSKYTOVATELE]) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setUzivatel(data.session?.user ?? null); setNacita(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUzivatel(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') { setObnovaHesla(true); location.hash = '#nove-heslo' }
      // Drop ?code=… from the address bar after a sign-in redirect.
      if (event === 'SIGNED_IN' && location.search.includes('code=')) {
        history.replaceState(null, '', location.pathname + (location.hash || '#ucet'))
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Group prices belong to the signed-in account: the account's code is claimed on the server
  // (groups have a limited number of accounts), re-checked daily and dropped on sign-out.
  // A change reloads the page once, because catalogue prices are computed at load.
  useEffect(() => {
    if (!supabase || nacita) return
    const kod = uzivatel?.user_metadata?.kod || ''
    if (kod === (SKUPINA?.kod || '') && (!kod || skupinaJeCerstva())) return
    let zruseno = false
    ;(async () => {
      const token = uzivatel ? (await supabase.auth.getSession()).data.session?.access_token : null
      if (uzivatel && !kod && SKUPINA?.kod && token) await opustitSkupinu(SKUPINA.kod, token)
      const { skupina, chyba } = kod && token ? await overitKod(kod, token) : { skupina: null }
      if (zruseno || chyba) return
      if (nastavitSkupinu(skupina)) location.reload()
    })()
    return () => { zruseno = true }
  }, [uzivatel, nacita])

  const value = useMemo(() => ({
    zapnuto: !!supabase,
    uzivatel,
    nacita,
    obnovaHesla,
    poskytovatele,
    prihlasit: (email, heslo) => supabase.auth.signInWithPassword({ email, password: heslo }),
    registrovat: (email, heslo, udaje) => supabase.auth.signUp({
      email, password: heslo, options: { data: udaje, emailRedirectTo: zpet() },
    }),
    prihlasitPres: provider => supabase.auth.signInWithOAuth({
      provider,
      // Microsoft vrací e-mail jen s tímto scope.
      options: { redirectTo: zpet(), ...(provider === 'azure' ? { scopes: 'email' } : {}) },
    }),
    zapomenuteHeslo: email => supabase.auth.resetPasswordForEmail(email, { redirectTo: zpet() }),
    noveHeslo: async heslo => { const r = await supabase.auth.updateUser({ password: heslo }); if (!r.error) setObnovaHesla(false); return r },
    ulozitProfil: udaje => supabase.auth.updateUser({ data: udaje }),
    odhlasit: () => supabase.auth.signOut(),
    token: async () => (await supabase.auth.getSession()).data.session?.access_token || null,
  }), [uzivatel, nacita, obnovaHesla, poskytovatele])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
