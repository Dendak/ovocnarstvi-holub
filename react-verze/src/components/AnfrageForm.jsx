import { useState } from 'react'
import { isInSeason } from '../data'
import { OBST_DE } from '../dataDE'

const inSeason = OBST_DE.filter(o => isInSeason(o))
const OBST_ITEMS = (inSeason.length ? inSeason : OBST_DE).map(o => ({ value: o.nazev, season: o.sezona }))

export default function AnfrageForm() {
  const [form, setForm] = useState({ jmeno: '', telefon: '', email: '', adresa: '', zprava: '' })
  const [obst, setObst] = useState({})
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState(null)

  const validate = (f = form) => {
    const e = {}
    if (f.telefon && !/^[+\d\s\-()]{7,}$/.test(f.telefon)) e.telefon = 'Ungültiges Nummernformat.'
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Ungültiges E-Mail-Format.'
    if (!f.telefon && !f.email) e.kontakt = 'Bitte Telefon oder E-Mail angeben.'
    return e
  }

  const handleChange = e => {
    const next = { ...form, [e.target.name]: e.target.value }
    setForm(next)
    if (touched[e.target.name]) setErrors(validate(next))
  }

  const handleBlur = e => {
    setTouched(t => ({ ...t, [e.target.name]: true }))
    setErrors(validate())
  }

  const toggleObst = (name) => {
    setObst(prev => {
      if (name in prev) { const next = { ...prev }; delete next[name]; return next }
      return { ...prev, [name]: '' }
    })
  }

  const setObstKg = (name, val) => setObst(prev => ({ ...prev, [name]: val }))

  const handleSubmit = async e => {
    e.preventDefault()
    setTouched({ jmeno: true, telefon: true, email: true })
    const e2 = validate()
    setErrors(e2)
    if (Object.keys(e2).length) return
    setStatus('sending')

    const lines = []
    for (const [name, kg] of Object.entries(obst)) {
      lines.push(kg ? `${name}: ${kg} kg` : name)
    }
    if (form.adresa) lines.push(`Lieferadresse: ${form.adresa}`)
    const orderText = lines.length ? 'Anfrage (AT):\n' + lines.map(l => '- ' + l).join('\n') : 'Allgemeine Anfrage (AT)'
    const fullMsg = [orderText, form.zprava].filter(Boolean).join('\n\n')

    try {
      const res = await fetch('https://formsubmit.co/ajax/info@ovoce-holub.cz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ _subject: `Anfrage Brennerei – ${form.jmeno || form.email || form.telefon}`, ...form, zprava: fullMsg }),
      })
      setStatus(res.ok ? 'ok' : 'err')
    } catch { setStatus('err') }
  }

  const qtyField = 'field !w-20 !py-1.5 text-center'

  return (
    <section id="anfrage" className="bg-paper-2/60 border-t border-line py-20 sm:py-24">
      <div className="container-page grid lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-16 items-start">
        <div>
          <p className="kicker mb-3">Unverbindliche Anfrage</p>
          <h2 className="section-title mb-6">Anfrage stellen</h2>
          <p className="lead">
            Teilen Sie uns mit, welches Obst Sie brauchen und in welcher Menge. Wir melden uns mit
            Verfügbarkeit, Preis und einem Liefertermin.
          </p>
        </div>

        {status === 'ok' ? (
          <div className="panel p-8">
            <h3 className="font-serif text-2xl text-ink mb-2">Vielen Dank für Ihre Anfrage.</h3>
            <p className="text-ink-soft">Wir melden uns so bald wie möglich mit Verfügbarkeit und Preis.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="panel p-6 sm:p-8 space-y-7">
            <fieldset>
              <legend className="font-serif text-xl text-ink mb-1">Obst</legend>
              <p className="text-sm text-muted mb-3">Menge in kg, insgesamt mindestens 200 kg.</p>
              <div className="border-t border-line">
                {OBST_ITEMS.map(o => {
                  const selected = o.value in obst
                  return (
                    <div key={o.value} className="flex items-center gap-3 py-3 border-b border-line">
                      <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                        <input type="checkbox" checked={selected} onChange={() => toggleObst(o.value)} className="w-4 h-4 accent-leaf" />
                        <span className="text-ink">{o.value}</span>
                        <span className="text-sm text-muted hidden sm:inline">{o.season}</span>
                      </label>
                      {selected && (
                        <label className="flex items-center gap-2 text-sm text-muted">
                          <input type="number" min="1" inputMode="numeric" value={obst[o.value] || ''}
                            onChange={e => setObstKg(o.value, e.target.value)} className={qtyField} aria-label={`${o.value} in kg`} />
                          kg
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="font-serif text-xl text-ink mb-1">Kontaktdaten</legend>
              <div>
                <label htmlFor="a-jmeno" className="label">Name / Betrieb</label>
                <input id="a-jmeno" name="jmeno" value={form.jmeno} onChange={handleChange} onBlur={handleBlur} className="field" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="a-telefon" className="label">Telefon</label>
                  <input id="a-telefon" name="telefon" type="tel" value={form.telefon} onChange={handleChange} onBlur={handleBlur} className="field" />
                  {touched.telefon && errors.telefon && <p className="text-berry text-sm mt-1">{errors.telefon}</p>}
                </div>
                <div>
                  <label htmlFor="a-email" className="label">E-Mail</label>
                  <input id="a-email" name="email" type="email" value={form.email} onChange={handleChange} onBlur={handleBlur} className="field" />
                  {touched.email && errors.email && <p className="text-berry text-sm mt-1">{errors.email}</p>}
                </div>
              </div>
              {(touched.telefon || touched.email) && errors.kontakt
                ? <p className="text-berry text-sm">{errors.kontakt}</p>
                : <p className="text-sm text-muted">Telefon oder E-Mail genügt.</p>}
              <div>
                <label htmlFor="a-adresa" className="label">Lieferadresse</label>
                <input id="a-adresa" name="adresa" value={form.adresa} onChange={handleChange} placeholder="Straße, PLZ, Ort" className="field" />
              </div>
              <div>
                <label htmlFor="a-zprava" className="label">Anmerkung</label>
                <textarea id="a-zprava" name="zprava" value={form.zprava} onChange={handleChange} rows={3}
                  placeholder="Gewünschter Liefertermin, besondere Anforderungen …" className="field resize-y" />
              </div>
            </fieldset>

            {status === 'err' && <p className="text-berry text-sm">Fehler beim Senden. Bitte versuchen Sie es erneut.</p>}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <p className="text-sm text-muted">Unverbindlich – wir melden uns mit Preis und Termin.</p>
              <button type="submit" disabled={status === 'sending'} className="btn">
                {status === 'sending' ? 'Wird gesendet …' : 'Anfrage senden'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
