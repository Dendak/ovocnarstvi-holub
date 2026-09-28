import { useState } from 'react'
import { OBSAH } from '../data'

const MAP_URL = 'https://www.google.com/maps/place/Ovocn%C3%A1%C5%99stv%C3%AD+Holub/@49.0826258,14.1677963,17z/data=!4m6!3m5!1s0x4774ad0019e39f15:0xf1e2281c3b44a6c7!8m2!3d49.0826258!4d14.1703712!16s%2Fg%2F11xfhkf620'
const MAP_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent('Ovocnářství Holub')}&hl=cs&z=13&output=embed`

function NapisteNam() {
  const k = OBSAH.kontakt
  const [f, setF] = useState({ jmeno: '', kontakt: '', zprava: '' })
  const [chyby, setChyby] = useState({})
  const [stav, setStav] = useState(null)
  const set = (key, v) => setF(p => ({ ...p, [key]: v }))

  const odeslat = async e => {
    e.preventDefault()
    const c = {}
    const kontakt = f.kontakt.trim()
    const jeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kontakt)
    if (!jeEmail && !/^[+\d\s\-()]{9,}$/.test(kontakt)) c.kontakt = 'Vyplňte e-mail nebo telefon, ať vám můžeme odpovědět.'
    if (!f.zprava.trim()) c.zprava = 'Napište nám, s čím vám můžeme pomoci.'
    setChyby(c)
    if (Object.keys(c).length) return
    setStav('odesilam')
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${k.email}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Dotaz z webu – ${f.jmeno.trim() || kontakt}`,
          ...(jeEmail ? { _replyto: kontakt } : {}),
          jmeno: f.jmeno.trim() || '—',
          kontakt,
          zprava: f.zprava.trim(),
        }),
      })
      setStav(res.ok ? 'ok' : 'chyba')
    } catch {
      setStav('chyba')
    }
  }

  if (stav === 'ok') {
    return (
      <div className="panel p-8">
        <h3 className="font-serif text-2xl text-ink mb-2">Děkujeme, zpráva je odeslaná.</h3>
        <p className="text-ink-soft">Odpovíme vám obvykle do druhého dne.</p>
      </div>
    )
  }

  return (
    <form onSubmit={odeslat} noValidate className="panel p-6 sm:p-8 space-y-5">
      <div>
        <h3 className="font-serif text-2xl text-ink mb-1">Napište nám</h3>
        <p className="text-sm text-muted">Dotaz, větší odběr na mošt nebo pálenku, cokoli dalšího.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="k-jmeno" className="label">Jméno</label>
          <input id="k-jmeno" autoComplete="name" value={f.jmeno} onChange={e => set('jmeno', e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="k-kontakt" className="label">E-mail nebo telefon *</label>
          <input id="k-kontakt" autoComplete="email" value={f.kontakt} onChange={e => set('kontakt', e.target.value)} className="field" />
          {chyby.kontakt && <p className="text-berry text-sm mt-1">{chyby.kontakt}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="k-zprava" className="label">Zpráva *</label>
        <textarea id="k-zprava" rows={5} value={f.zprava} onChange={e => set('zprava', e.target.value)} className="field resize-y" />
        {chyby.zprava && <p className="text-berry text-sm mt-1">{chyby.zprava}</p>}
      </div>
      {stav === 'chyba' && <p className="text-berry text-sm">Zprávu se nepodařilo odeslat. Zkuste to prosím znovu nebo zavolejte {k.tel1}.</p>}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-muted max-w-xs">
          Údaje použijeme jen k odpovědi.{' '}
          <a href={`${import.meta.env.BASE_URL}gdpr.html`} className="underline">Ochrana osobních údajů</a>
        </p>
        <button type="submit" disabled={stav === 'odesilam'} className="btn">{stav === 'odesilam' ? 'Odesílám…' : 'Odeslat zprávu'}</button>
      </div>
    </form>
  )
}

export default function Kontakt({ cookiesAccepted }) {
  const k = OBSAH.kontakt
  const tel = t => t.replace(/\s/g, '')

  return (
    <section id="kontakt" className="bg-paper-2/60 border-t border-line py-20 sm:py-24">
      <div className="container-page">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-12 lg:gap-16 items-start">
          <div>
            <p className="kicker mb-3">Kontakt</p>
            <h2 className="section-title mb-8">Jsme tu pro vás</h2>
            <dl className="border-t border-ink/80">
              {[
                ['Adresa', <>{k.adresa}<br />{k.mesto}<br /><a href={MAP_URL} target="_blank" rel="noopener noreferrer" className="link text-sm">Otevřít v mapách</a></>],
                ['Telefon', <><a href={`tel:${tel(k.tel1)}`} className="hover:text-leaf">{k.tel1}</a><br /><a href={`tel:${tel(k.tel2)}`} className="hover:text-leaf">{k.tel2}</a></>],
                ['E-mail', <a href={`mailto:${k.email}`} className="hover:text-leaf">{k.email}</a>],
                ['Sociální sítě', <><a href={k.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-leaf">Facebook</a>, <a href={k.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-leaf">Instagram</a></>],
              ].map(([dt, dd]) => (
                <div key={dt} className="grid grid-cols-[8rem_1fr] gap-4 py-4 border-b border-line">
                  <dt className="text-sm text-muted pt-0.5">{dt}</dt>
                  <dd className="text-ink leading-relaxed">{dd}</dd>
                </div>
              ))}
            </dl>
          </div>
          <NapisteNam />
        </div>

        {cookiesAccepted && (
          <div className="mt-14 overflow-hidden rounded-lg border border-line">
            <iframe src={MAP_EMBED} className="w-full h-80 border-0 block" allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade" title="Mapa – Ovocnářství Holub" />
          </div>
        )}
      </div>
    </section>
  )
}
