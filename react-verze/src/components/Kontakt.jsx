import { useState } from 'react'
import { OBSAH } from '../data'
import { odeslatZpravu } from './odeslatZpravu'

const MAP_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent('Ovocnářství Holub')}&hl=cs&z=13&output=embed`

function NapisteNam() {
  const k = OBSAH.kontakt
  const [f, setF] = useState({ jmeno: '', kontakt: '', zprava: '', web: '' })
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
    const jmeno = f.jmeno.trim()
    const zprava = f.zprava.trim()
    const vysledek = await odeslatZpravu(
      { typ: 'kontakt', jazyk: 'cs', jmeno, ...(jeEmail ? { email: kontakt } : { telefon: kontakt }), zprava, web: f.web },
      {
        adresa: k.email,
        data: {
          _subject: `Dotaz z webu – ${jmeno || kontakt}`,
          ...(jeEmail ? { _replyto: kontakt } : {}),
          _honey: f.web,
          jmeno: jmeno || '—',
          kontakt,
          zprava,
        },
      },
    )
    setStav(vysledek.ok ? 'ok' : vysledek.chyba === 'limit' ? 'limit' : 'chyba')
  }

  if (stav === 'ok') {
    return (
      <div className="panel p-8" role="status">
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
          <input id="k-kontakt" autoComplete="email" value={f.kontakt} onChange={e => set('kontakt', e.target.value)} className="field"
            aria-invalid={!!chyby.kontakt} aria-describedby={chyby.kontakt ? 'k-kontakt-chyba' : undefined} />
          {chyby.kontakt && <p id="k-kontakt-chyba" className="text-berry text-sm mt-1">{chyby.kontakt}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="k-zprava" className="label">Zpráva *</label>
        <textarea id="k-zprava" rows={5} value={f.zprava} onChange={e => set('zprava', e.target.value)} className="field resize-y"
          aria-invalid={!!chyby.zprava} aria-describedby={chyby.zprava ? 'k-zprava-chyba' : undefined} />
        {chyby.zprava && <p id="k-zprava-chyba" className="text-berry text-sm mt-1">{chyby.zprava}</p>}
      </div>
      {/* Past na roboty: pole je lidem skryté, vyplní ho jen spamovací skript. */}
      <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
        <label htmlFor="k-web">Web (nevyplňujte)</label>
        <input id="k-web" name="web" tabIndex={-1} autoComplete="off" value={f.web} onChange={e => set('web', e.target.value)} />
      </div>
      {(stav === 'chyba' || stav === 'limit') && (
        <p className="text-berry text-sm" role="alert">
          {stav === 'limit' ? 'Odeslali jste v krátké době hodně zpráv. Zkuste to prosím později' : 'Zprávu se nepodařilo odeslat. Zkuste to prosím znovu'}
          {', '}zavolejte na <a href={`tel:${k.tel1.replace(/\s/g, '')}`} className="underline whitespace-nowrap">{k.tel1}</a>
          {' '}nebo napište na <a href={`mailto:${k.email}`} className="underline">{k.email}</a>.
        </p>
      )}
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

export default function Kontakt({ cookiesAccepted, onAcceptCookies }) {
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
                ['Adresa', <>{k.adresa}<br />{k.mesto}<br /><span className="text-sm text-ink-soft">(Krtely u Netolic)</span><br /><a href={k.mapa} target="_blank" rel="noopener noreferrer" className="link text-sm">Otevřít v mapách</a></>],
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

        {cookiesAccepted ? (
          <div className="mt-14 overflow-hidden rounded-lg border border-line">
            <iframe src={MAP_EMBED} className="w-full h-80 border-0 block" allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade" title="Mapa – Ovocnářství Holub" />
          </div>
        ) : (
          <div className="mt-14 rounded-lg border border-line bg-white/60 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-ink-soft max-w-xl">
              Mapa od Googlu se zobrazí, až povolíte cookies třetích stran. Cestu k nám najdete i přímo v Google Mapách.
            </p>
            <div className="flex flex-wrap gap-3 shrink-0">
              {onAcceptCookies && <button type="button" onClick={onAcceptCookies} className="btn-outline">Zobrazit mapu</button>}
              <a href={k.mapa} target="_blank" rel="noopener noreferrer" className="btn-outline">Otevřít Google Mapy</a>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
