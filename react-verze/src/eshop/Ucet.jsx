import { useState } from 'react'
import { OBSAH } from '../data'
import { useAuth, prelozChybu } from './auth'
import { SSO_POSKYTOVATELE } from './supabaseConfig'

const field = 'border border-gray-200 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white'
const primary = 'w-full bg-[#1a561a] hover:bg-[#133e13] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 cursor-pointer'
const MIN_HESLO = 8

const SSO = {
  google: {
    label: 'Pokračovat přes Google',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
    ),
  },
}

function Pole({ id, label, chyba, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <input id={id} className={field} {...props} />
      {chyba && <p className="text-red-600 text-xs mt-1">{chyba}</p>}
    </div>
  )
}

function Zprava({ typ, children }) {
  if (!children) return null
  const cls = typ === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
  return <p role="status" className={`text-sm rounded-xl px-4 py-3 ${cls}`}>{children}</p>
}

function Prihlaseni() {
  const auth = useAuth()
  const [rezim, setRezim] = useState('prihlasit') // prihlasit | registrovat | zapomenute
  const [f, setF] = useState({ jmeno: '', email: '', heslo: '', souhlas: false })
  const [stav, setStav] = useState({ nacita: false, chyba: null, ok: null })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const prepnout = r => { setRezim(r); setStav({ nacita: false, chyba: null, ok: null }) }

  const odeslat = async e => {
    e.preventDefault()
    const email = f.email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStav({ chyba: 'Vyplňte platný e-mail.' })
    if (rezim !== 'zapomenute' && f.heslo.length < MIN_HESLO) return setStav({ chyba: `Heslo musí mít aspoň ${MIN_HESLO} znaků.` })
    if (rezim === 'registrovat' && !f.souhlas) return setStav({ chyba: 'Pro založení účtu potřebujeme váš souhlas se zpracováním údajů.' })
    setStav({ nacita: true })
    if (rezim === 'prihlasit') {
      const { error } = await auth.prihlasit(email, f.heslo)
      setStav(error ? { chyba: prelozChybu(error) } : { ok: null })
    } else if (rezim === 'registrovat') {
      const { data, error } = await auth.registrovat(email, f.heslo, f.jmeno.trim())
      if (error) return setStav({ chyba: prelozChybu(error) })
      setStav({ ok: data.session ? null : `Hotovo! Na ${email} jsme poslali odkaz pro potvrzení účtu. Po kliknutí na něj budete přihlášeni.` })
    } else {
      const { error } = await auth.zapomenuteHeslo(email)
      setStav(error ? { chyba: prelozChybu(error) } : { ok: `Pokud účet s adresou ${email} existuje, poslali jsme na ni odkaz pro nastavení nového hesla.` })
    }
  }

  const sso = async provider => {
    setStav({ nacita: true })
    const { error } = await auth.prihlasitPres(provider)
    if (error) setStav({ chyba: prelozChybu(error) })
  }

  const nadpis = { prihlasit: 'Přihlášení', registrovat: 'Založit účet', zapomenute: 'Zapomenuté heslo' }[rezim]
  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-[#133e13] mb-2">{nadpis}</h1>
      <p className="text-gray-500 text-sm mb-8">
        {rezim === 'zapomenute'
          ? 'Pošleme vám e-mail s odkazem pro nastavení nového hesla.'
          : 'S účtem uvidíte všechny své objednávky a jejich stav na jakémkoli zařízení a nemusíte pokaždé vyplňovat adresu.'}
      </p>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        {rezim !== 'zapomenute' && SSO_POSKYTOVATELE.filter(p => SSO[p]).map(p => (
          <button key={p} type="button" onClick={() => sso(p)} disabled={stav.nacita}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 hover:border-gray-400 rounded-xl py-3 text-sm font-medium text-gray-700 cursor-pointer disabled:opacity-60">
            {SSO[p].icon}{SSO[p].label}
          </button>
        ))}
        {rezim !== 'zapomenute' && SSO_POSKYTOVATELE.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-gray-400"><span className="flex-1 h-px bg-gray-200" />nebo e-mailem<span className="flex-1 h-px bg-gray-200" /></div>
        )}

        <form onSubmit={odeslat} noValidate className="space-y-4">
          {rezim === 'registrovat' && (
            <Pole id="u-jmeno" label="Jméno a příjmení" autoComplete="name" value={f.jmeno} onChange={e => set('jmeno', e.target.value)} />
          )}
          <Pole id="u-email" label="E-mail" type="email" autoComplete="email" value={f.email} onChange={e => set('email', e.target.value)} />
          {rezim !== 'zapomenute' && (
            <Pole id="u-heslo" label={rezim === 'registrovat' ? `Heslo (aspoň ${MIN_HESLO} znaků)` : 'Heslo'} type="password"
              autoComplete={rezim === 'registrovat' ? 'new-password' : 'current-password'}
              value={f.heslo} onChange={e => set('heslo', e.target.value)} />
          )}
          {rezim === 'registrovat' && (
            <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={f.souhlas} onChange={e => set('souhlas', e.target.checked)} className="mt-0.5 accent-green-600" />
              <span>Souhlasím se zpracováním osobních údajů pro vedení účtu podle{' '}
                <a href={`${import.meta.env.BASE_URL}gdpr.html`} target="_blank" rel="noreferrer" className="text-green-700 underline">zásad ochrany osobních údajů</a>.
              </span>
            </label>
          )}
          <Zprava typ="chyba">{stav.chyba}</Zprava>
          <Zprava typ="ok">{stav.ok}</Zprava>
          <button type="submit" disabled={stav.nacita} className={primary}>
            {stav.nacita ? 'Moment…' : { prihlasit: 'Přihlásit se', registrovat: 'Založit účet', zapomenute: 'Poslat odkaz' }[rezim]}
          </button>
        </form>

        <div className="text-sm text-center space-y-1 pt-1">
          {rezim === 'prihlasit' && <>
            <button onClick={() => prepnout('zapomenute')} className="block w-full text-green-700 hover:underline cursor-pointer">Zapomněli jste heslo?</button>
            <p className="text-gray-500">Nemáte účet? <button onClick={() => prepnout('registrovat')} className="text-green-700 font-medium hover:underline cursor-pointer">Založit účet</button></p>
          </>}
          {rezim !== 'prihlasit' && (
            <button onClick={() => prepnout('prihlasit')} className="text-green-700 hover:underline cursor-pointer">← Zpět na přihlášení</button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center mt-6">Nakoupit můžete i bez účtu.</p>
    </div>
  )
}

function NoveHeslo() {
  const auth = useAuth()
  const [heslo, setHeslo] = useState('')
  const [stav, setStav] = useState({})
  const odeslat = async e => {
    e.preventDefault()
    if (heslo.length < MIN_HESLO) return setStav({ chyba: `Heslo musí mít aspoň ${MIN_HESLO} znaků.` })
    setStav({ nacita: true })
    const { error } = await auth.noveHeslo(heslo)
    if (error) return setStav({ chyba: prelozChybu(error) })
    location.hash = '#ucet'
  }
  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-[#133e13] mb-6">Nové heslo</h1>
      <form onSubmit={odeslat} noValidate className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <Pole id="nove-heslo" label={`Nové heslo (aspoň ${MIN_HESLO} znaků)`} type="password" autoComplete="new-password" value={heslo} onChange={e => setHeslo(e.target.value)} />
        <Zprava typ="chyba">{stav.chyba}</Zprava>
        <button type="submit" disabled={stav.nacita} className={primary}>{stav.nacita ? 'Ukládám…' : 'Uložit heslo'}</button>
      </form>
    </div>
  )
}

function Profil() {
  const auth = useAuth()
  const u = auth.uzivatel
  const meta = u.user_metadata || {}
  const [f, setF] = useState({
    jmeno: meta.jmeno || meta.full_name || meta.name || '', telefon: meta.telefon || '', adresa: meta.adresa || '',
  })
  const [heslo, setHeslo] = useState('')
  const [stav, setStav] = useState({})
  const [stavHeslo, setStavHeslo] = useState({})
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const pouzeGoogle = u.app_metadata?.provider && u.app_metadata.provider !== 'email'

  const ulozit = async e => {
    e.preventDefault()
    setStav({ nacita: true })
    const { error } = await auth.ulozitProfil({ jmeno: f.jmeno.trim(), telefon: f.telefon.trim(), adresa: f.adresa.trim() })
    setStav(error ? { chyba: prelozChybu(error) } : { ok: 'Uloženo. Údaje se vám předvyplní při objednávce.' })
  }
  const zmenitHeslo = async e => {
    e.preventDefault()
    if (heslo.length < MIN_HESLO) return setStavHeslo({ chyba: `Heslo musí mít aspoň ${MIN_HESLO} znaků.` })
    setStavHeslo({ nacita: true })
    const { error } = await auth.noveHeslo(heslo)
    setStavHeslo(error ? { chyba: prelozChybu(error) } : { ok: 'Heslo je změněné.' })
    if (!error) setHeslo('')
  }
  const smazatUcet = `mailto:${OBSAH.kontakt.email}?subject=${encodeURIComponent('Žádost o smazání účtu')}&body=${encodeURIComponent(`Prosím o smazání mého účtu v e-shopu (${u.email}).`)}`

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#133e13]">Můj účet</h1>
          <p className="text-gray-500 text-sm mt-1">Přihlášeni jako <strong>{u.email}</strong></p>
        </div>
        <a href="#objednavky" className="bg-[#1a561a] hover:bg-[#133e13] text-white text-sm font-semibold px-5 py-2.5 rounded-full">Moje objednávky →</a>
      </div>

      <form onSubmit={ulozit} noValidate className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-lg text-[#133e13]">Doručovací údaje</h2>
        <Pole id="p-jmeno" label="Jméno a příjmení" autoComplete="name" value={f.jmeno} onChange={e => set('jmeno', e.target.value)} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Pole id="p-telefon" label="Telefon" type="tel" autoComplete="tel" value={f.telefon} onChange={e => set('telefon', e.target.value)} />
          <Pole id="p-adresa" label="Adresa v Českých Budějovicích" autoComplete="street-address" value={f.adresa} onChange={e => set('adresa', e.target.value)} />
        </div>
        <Zprava typ="chyba">{stav.chyba}</Zprava>
        <Zprava typ="ok">{stav.ok}</Zprava>
        <button type="submit" disabled={stav.nacita} className="bg-[#1a561a] hover:bg-[#133e13] text-white font-semibold px-6 py-2.5 rounded-xl disabled:opacity-60 cursor-pointer">
          {stav.nacita ? 'Ukládám…' : 'Uložit údaje'}
        </button>
      </form>

      <form onSubmit={zmenitHeslo} noValidate className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-lg text-[#133e13]">{pouzeGoogle ? 'Nastavit heslo' : 'Změna hesla'}</h2>
        {pouzeGoogle && <p className="text-sm text-gray-500">Přihlašujete se přes Google. Heslo si nastavit můžete, pokud se chcete přihlašovat i e-mailem.</p>}
        <Pole id="p-heslo" label={`Nové heslo (aspoň ${MIN_HESLO} znaků)`} type="password" autoComplete="new-password" value={heslo} onChange={e => setHeslo(e.target.value)} />
        <Zprava typ="chyba">{stavHeslo.chyba}</Zprava>
        <Zprava typ="ok">{stavHeslo.ok}</Zprava>
        <button type="submit" disabled={stavHeslo.nacita} className="border border-gray-300 hover:border-green-600 text-gray-700 font-semibold px-6 py-2.5 rounded-xl disabled:opacity-60 cursor-pointer">
          {stavHeslo.nacita ? 'Ukládám…' : 'Změnit heslo'}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <button onClick={() => auth.odhlasit()} className="text-gray-700 font-medium hover:underline cursor-pointer">Odhlásit se</button>
        <a href={smazatUcet} className="text-gray-400 hover:text-red-600">Požádat o smazání účtu</a>
      </div>
    </div>
  )
}

export default function Ucet() {
  const auth = useAuth()
  if (!auth.zapnuto) {
    return <div className="max-w-md mx-auto px-6 py-16 text-center text-gray-500">Zákaznické účty zatím nejsou zapnuté. Nakoupit můžete i bez účtu.</div>
  }
  if (auth.nacita) return <div className="py-24 text-center text-gray-400">Načítám…</div>
  if (auth.obnovaHesla || location.hash === '#nove-heslo') return auth.uzivatel ? <NoveHeslo /> : <Prihlaseni />
  return auth.uzivatel ? <Profil /> : <Prihlaseni />
}
