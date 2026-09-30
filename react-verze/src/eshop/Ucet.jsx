import { useState } from 'react'
import { OBSAH } from '../data'
import { useAuth, prelozChybu } from './auth'

const field = 'border border-line rounded-md px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-leaf/20 focus:border-transparent bg-white'
const primary = 'w-full bg-leaf hover:bg-leaf-dark text-white font-semibold py-3 rounded-md transition-colors disabled:opacity-60 cursor-pointer'
const MIN_HESLO = 8

const SSO = {
  // Oficiální „esko“ a varianta tlačítka podle manuálu Seznamu (vyvojari.seznam.cz/oauth/doc):
  // červená #CC0000 na bílé, text přesně „Přihlásit přes Seznam“, esko min. 18 px, bez úprav tvaru.
  'custom:seznam': {
    label: 'Přihlásit přes Seznam',
    className: 'text-[#CC0000] font-bold',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 32 32" aria-hidden="true">
        <path fill="#CC0000" d="M22.012.034c.167-.053.365-.068.529.135.36.448.73.89 1.064 1.36.243.346.48.693.709 1.046.636.985 1.078 2.247.689 3.414-.272.801-1.204 1.26-1.93 1.548-.846.337-1.76.494-2.647.703-.334.078-.667.151-1.002.222-1.136.245-2.287.441-3.414.732a8.95 8.95 0 0 0-1.099.342c-.383.156-.852.324-.988.758-.194.607.505 1.054.932 1.314.348.207.7.4 1.061.576.306.15.62.292.935.424.745.317 1.51.592 2.282.846 1.363.447 2.74.865 4.096 1.332a25.081 25.081 0 0 1 2.626 1.052c.288.133.573.272.851.418.988.517 1.913 1.128 2.737 1.883.442.408.866.85 1.176 1.367a4.61 4.61 0 0 1 .608 1.79c.077.68-.042 1.39-.292 2.025-.734 1.785-2.142 2.535-4.403 3.53-.59.26-3.091 1.118-4.649 1.604a36.7 36.7 0 0 1-1.106.327c-.563.155-1.126.3-1.693.434a85.469 85.469 0 0 1-5.988 1.191c-1.614.265-3.23.496-4.84.764-4.445.599-6.524.781-7.303.825-.56.033.195-.143.396-.19.226-.05.452-.111.679-.161.778-.171 1.557-.34 2.336-.512l2.049-.445c.326-.072.646-.141.973-.207.543-.114 1.092-.23 1.638-.347a86.73 86.73 0 0 0 2.852-.664c.952-.24 1.912-.5 2.854-.747a94.05 94.05 0 0 0 2.803-.794 44.95 44.95 0 0 0 4.81-1.726c1.05-.448 2.138-1.12 2.764-2.104.24-.38.369-.817.354-1.266a2.714 2.714 0 0 0-.4-1.326 3.53 3.53 0 0 0-.955-1.032c-.571-.423-1.242-.717-1.89-1.01-.621-.285-1.286-.497-1.908-.724-1.001-.365-2.03-.676-3.04-1.014l-.963-.319a42.926 42.926 0 0 1-3.293-1.225 92.455 92.455 0 0 1-3.386-1.542 22.843 22.843 0 0 1-3.134-1.803c-.33-.23-.657-.47-.963-.731-.932-.799-1.742-1.874-1.735-3.159.004-.437.143-.888.344-1.269.216-.402.438-.78.706-1.147.38-.513.831-.957 1.315-1.366a9.562 9.562 0 0 1 2.66-1.573c.493-.191.99-.357 1.495-.517.521-.167 1.068-.287 1.6-.423.577-.146 1.16-.263 1.745-.388.884-.192 1.77-.36 2.664-.505C21.181.826 21.79.11 22.012.034z" />
      </svg>
    ),
  },
  azure: {
    label: 'Pokračovat přes Microsoft',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022" /><rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00" />
        <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF" /><rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
      </svg>
    ),
  },
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
      <label htmlFor={id} className="text-xs font-medium text-ink-soft mb-1 block">{label}</label>
      <input id={id} className={field} {...props} />
      {chyba && <p className="text-berry text-xs mt-1">{chyba}</p>}
    </div>
  )
}

function Zprava({ typ, children }) {
  if (!children) return null
  const cls = typ === 'ok' ? 'bg-paper-2 text-leaf' : 'bg-berry/10 text-berry'
  return <p role="status" className={`text-sm rounded-md px-4 py-3 ${cls}`}>{children}</p>
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
      <h1 className="font-serif text-3xl font-semibold text-ink mb-2">{nadpis}</h1>
      <p className="text-muted text-sm mb-8">
        {rezim === 'zapomenute'
          ? 'Pošleme vám e-mail s odkazem pro nastavení nového hesla.'
          : 'S účtem uvidíte všechny své objednávky a jejich stav na jakémkoli zařízení a nemusíte pokaždé vyplňovat adresu.'}
      </p>

      <div className="bg-white rounded-lg p-6 space-y-4">
        {rezim !== 'zapomenute' && auth.poskytovatele.filter(p => SSO[p]).map(p => (
          <button key={p} type="button" onClick={() => sso(p)} disabled={stav.nacita}
            className={`w-full flex items-center justify-center gap-3 border border-line hover:border-ink/40 rounded-md py-3 text-sm cursor-pointer disabled:opacity-60 ${SSO[p].className || 'font-medium text-ink-soft'}`}>
            {SSO[p].icon}{SSO[p].label}
          </button>
        ))}
        {rezim !== 'zapomenute' && auth.poskytovatele.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted"><span className="flex-1 h-px bg-line" />nebo e-mailem<span className="flex-1 h-px bg-line" /></div>
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
            <label className="flex items-start gap-2 text-xs text-ink-soft cursor-pointer">
              <input type="checkbox" checked={f.souhlas} onChange={e => set('souhlas', e.target.checked)} className="mt-0.5 accent-leaf" />
              <span>Souhlasím se zpracováním osobních údajů pro vedení účtu podle{' '}
                <a href={`${import.meta.env.BASE_URL}gdpr.html`} target="_blank" rel="noreferrer" className="text-leaf underline">zásad ochrany osobních údajů</a>.
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
            <button onClick={() => prepnout('zapomenute')} className="block w-full text-leaf hover:underline cursor-pointer">Zapomněli jste heslo?</button>
            <p className="text-muted">Nemáte účet? <button onClick={() => prepnout('registrovat')} className="text-leaf font-medium hover:underline cursor-pointer">Založit účet</button></p>
          </>}
          {rezim !== 'prihlasit' && (
            <button onClick={() => prepnout('prihlasit')} className="text-leaf hover:underline cursor-pointer">← Zpět na přihlášení</button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted text-center mt-6">Nakoupit můžete i bez účtu.</p>
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
      <h1 className="font-serif text-3xl font-semibold text-ink mb-6">Nové heslo</h1>
      <form onSubmit={odeslat} noValidate className="bg-white rounded-lg p-6 space-y-4">
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
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink">Můj účet</h1>
          <p className="text-muted text-sm mt-1">Přihlášeni jako <strong>{u.email}</strong></p>
        </div>
        <a href="#objednavky" className="btn">Moje objednávky</a>
      </div>

      <form onSubmit={ulozit} noValidate className="bg-white rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-lg text-ink">Doručovací údaje</h2>
        <Pole id="p-jmeno" label="Jméno a příjmení" autoComplete="name" value={f.jmeno} onChange={e => set('jmeno', e.target.value)} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Pole id="p-telefon" label="Telefon" type="tel" autoComplete="tel" value={f.telefon} onChange={e => set('telefon', e.target.value)} />
          <Pole id="p-adresa" label="Adresa v Českých Budějovicích" autoComplete="street-address" value={f.adresa} onChange={e => set('adresa', e.target.value)} />
        </div>
        <Zprava typ="chyba">{stav.chyba}</Zprava>
        <Zprava typ="ok">{stav.ok}</Zprava>
        <button type="submit" disabled={stav.nacita} className="bg-leaf hover:bg-leaf-dark text-white font-semibold px-6 py-2.5 rounded-md disabled:opacity-60 cursor-pointer">
          {stav.nacita ? 'Ukládám…' : 'Uložit údaje'}
        </button>
      </form>

      <form onSubmit={zmenitHeslo} noValidate className="bg-white rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-lg text-ink">{pouzeGoogle ? 'Nastavit heslo' : 'Změna hesla'}</h2>
        {pouzeGoogle && <p className="text-sm text-muted">Přihlašujete se přes Google. Heslo si nastavit můžete, pokud se chcete přihlašovat i e-mailem.</p>}
        <Pole id="p-heslo" label={`Nové heslo (aspoň ${MIN_HESLO} znaků)`} type="password" autoComplete="new-password" value={heslo} onChange={e => setHeslo(e.target.value)} />
        <Zprava typ="chyba">{stavHeslo.chyba}</Zprava>
        <Zprava typ="ok">{stavHeslo.ok}</Zprava>
        <button type="submit" disabled={stavHeslo.nacita} className="border border-line hover:border-leaf text-ink-soft font-semibold px-6 py-2.5 rounded-md disabled:opacity-60 cursor-pointer">
          {stavHeslo.nacita ? 'Ukládám…' : 'Změnit heslo'}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <button onClick={() => auth.odhlasit()} className="text-ink-soft font-medium hover:underline cursor-pointer">Odhlásit se</button>
        <a href={smazatUcet} className="text-muted hover:text-berry">Požádat o smazání účtu</a>
      </div>
    </div>
  )
}

export default function Ucet() {
  const auth = useAuth()
  if (!auth.zapnuto) {
    return <div className="max-w-md mx-auto px-6 py-16 text-center text-muted">Zákaznické účty zatím nejsou zapnuté. Nakoupit můžete i bez účtu.</div>
  }
  if (auth.nacita) return <div className="py-24 text-center text-muted">Načítám…</div>
  if (auth.obnovaHesla || location.hash === '#nove-heslo') return auth.uzivatel ? <NoveHeslo /> : <Prihlaseni />
  return auth.uzivatel ? <Profil /> : <Prihlaseni />
}
