import { useState } from 'react'

const OBST_ITEMS = [
  { value: 'Weichsel / Sauerkirschen', season: 'Juli – August' },
  { value: 'Zwetschken', season: 'August – Oktober' },
  { value: 'Birnen', season: 'August – Januar' },
  { value: 'Äpfel', season: 'August – März' },
]

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
      const res = await fetch('https://formsubmit.co/ajax/holubdenis@seznam.cz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...form, zprava: fullMsg }),
      })
      setStatus(res.ok ? 'ok' : 'err')
    } catch { setStatus('err') }
  }

  const field = 'border border-gray-200 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition bg-white'
  const qtyField = 'border border-gray-200 rounded-lg px-3 py-2 text-sm w-24 text-center focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition bg-white'

  return (
    <section id="anfrage" className="bg-[#f7f4ef] py-20">
      <div className="max-w-2xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-green-700 text-xs tracking-widest uppercase mb-3">Unverbindliche Anfrage</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#133e13] mb-3">Anfrage stellen</h2>
          <p className="text-gray-500 text-sm">Teilen Sie uns Ihren Bedarf mit – wir melden uns mit Verfügbarkeit und Preis</p>
        </div>

        {status === 'ok' ? (
          <div className="bg-white rounded-2xl border border-green-200 p-8 text-center text-green-700 shadow-sm">
            <svg className="w-10 h-10 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <p className="font-semibold text-lg mb-1">Anfrage gesendet!</p>
            <p className="text-sm text-gray-500">Wir melden uns so bald wie möglich mit Verfügbarkeit und Preis.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Obstauswahl */}
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
              <h3 className="font-semibold text-[#133e13] text-lg mb-1">Welches Obst interessiert Sie?</h3>
              <p className="text-gray-400 text-xs mb-5">Wählen Sie Produkte und geschätzte Menge (min. 200 kg gesamt)</p>
              <div className="space-y-2">
                {OBST_ITEMS.map(o => {
                  const selected = o.value in obst
                  return (
                    <div key={o.value}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition cursor-pointer ${
                        selected ? 'border-green-300 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                      }`}
                      onClick={() => toggleObst(o.value)}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                        selected ? 'bg-green-600 border-green-600' : 'border-gray-300'
                      }`}>
                        {selected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800">{o.value}</span>
                        <span className="text-xs text-gray-400 ml-2">{o.season}</span>
                      </div>
                      {selected && (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <input type="number" min="200" placeholder="kg" value={obst[o.value] || ''}
                            onChange={e => setObstKg(o.value, e.target.value)}
                            className={qtyField} />
                          <span className="text-xs text-gray-400">kg</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Kontaktdaten */}
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-4">
              <h3 className="font-semibold text-[#133e13] text-lg mb-1">Kontaktdaten</h3>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Name / Betrieb</label>
                <input name="jmeno" value={form.jmeno} onChange={handleChange} onBlur={handleBlur}
                  placeholder="z.B. Brennerei Müller" className={field} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Telefon</label>
                  <input name="telefon" type="tel" value={form.telefon} onChange={handleChange} onBlur={handleBlur}
                    placeholder="+43 ..." className={field} />
                  {touched.telefon && errors.telefon && <p className="text-red-500 text-xs mt-1">{errors.telefon}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">E-Mail</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} onBlur={handleBlur}
                    placeholder="info@brennerei.at" className={field} />
                  {touched.email && errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>
              {(touched.telefon || touched.email) && errors.kontakt && (
                <p className="text-red-500 text-xs -mt-2">{errors.kontakt}</p>
              )}
              <p className="text-gray-400 text-xs -mt-2">Telefon oder E-Mail genügt.</p>
            </div>

            {/* Lieferadresse */}
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-4">
              <h3 className="font-semibold text-[#133e13] text-lg mb-1">Lieferadresse</h3>
              <input name="adresa" value={form.adresa} onChange={handleChange}
                placeholder="Straße, PLZ, Ort" className={field} />
              <p className="text-xs text-gray-400 -mt-2">Lieferung nach Oberösterreich und Salzburg.</p>
            </div>

            {/* Anmerkung */}
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Anmerkung</label>
              <textarea name="zprava" value={form.zprava} onChange={handleChange}
                rows={3} placeholder="Gewünschter Liefertermin, besondere Anforderungen..."
                className={field + ' resize-none'} />
            </div>

            {status === 'err' && (
              <p className="text-red-600 text-sm text-center">Fehler beim Senden. Bitte versuchen Sie es erneut.</p>
            )}
            <button type="submit" disabled={status === 'sending'}
              className="w-full bg-[#1a561a] hover:bg-[#133e13] text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-60 text-lg">
              {status === 'sending' ? 'Wird gesendet...' : 'Unverbindliche Anfrage senden →'}
            </button>
            <p className="text-gray-400 text-xs text-center">Ihre Anfrage ist unverbindlich. Wir melden uns telefonisch mit Verfügbarkeit und Preis.</p>
          </form>
        )}
      </div>
    </section>
  )
}
