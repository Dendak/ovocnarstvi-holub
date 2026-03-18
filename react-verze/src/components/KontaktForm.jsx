import { useState } from 'react'
import { OBSAH } from '../data'

function getAllMosty() {
  const items = []
  for (const sk of OBSAH.mosty.skupiny) {
    for (const p of sk.polozky) {
      items.push({ nazev: p.nazev, dostupne: p.dostupne, cena5l: sk.cena5l, cena3l: sk.cena3l })
    }
  }
  return items
}

function isInSeason(o) {
  if (o.vzdy) return true
  if (!o.sezonaOd || !o.sezonaDo) return true
  const now = new Date()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const [fromM, fromD] = o.sezonaOd
  const [toM, toD] = o.sezonaDo
  const cur = m * 100 + d
  const from = fromM * 100 + fromD
  const to = toM * 100 + toD
  if (from <= to) return cur >= from && cur <= to
  return cur >= from || cur <= to  // přes přelom roku (hrušky, jablka)
}

export default function KontaktForm() {
  const k = OBSAH.kontakt
  const mostyList = getAllMosty()
  const dostupneOvoce = OBSAH.ovoce.filter(isInSeason)

  const [form, setForm] = useState({ jmeno: '', telefon: '', email: '', zprava: '' })
  const [ovoce, setOvoce] = useState({})
  const [mosty5l, setMosty5l] = useState({})
  const [mosty3l, setMosty3l] = useState({})
  const [showMosty, setShowMosty] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState(null)

  const validate = (f = form) => {
    const e = {}
    if (f.telefon && !/^[+\d\s\-()]{7,}$/.test(f.telefon)) e.telefon = 'Neplatný formát čísla.'
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Neplatný formát e-mailu.'
    if (!f.telefon && !f.email) e.kontakt = 'Vyplňte alespoň telefon nebo e-mail.'
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

  const toggleOvoce = (nazev) => {
    setOvoce(prev => {
      if (nazev in prev) {
        const next = { ...prev }
        delete next[nazev]
        return next
      }
      return { ...prev, [nazev]: '' }
    })
  }

  const setOvoceKg = (nazev, val) => {
    setOvoce(prev => ({ ...prev, [nazev]: val }))
  }

  const setMostQty = (setter, nazev, val) => {
    setter(prev => {
      if (val === '' || val === '0') {
        const next = { ...prev }
        delete next[nazev]
        return next
      }
      return { ...prev, [nazev]: val }
    })
  }

  const buildOrderText = () => {
    const lines = []
    for (const [nazev, kg] of Object.entries(ovoce)) {
      if (kg) lines.push(`${nazev}: ${kg} kg`)
    }
    for (const [nazev, qty] of Object.entries(mosty5l)) {
      const m = mostyList.find(x => x.nazev === nazev)
      lines.push(`Mošt ${nazev} 5L: ${qty}x (${qty * (m?.cena5l || 0)} Kč)`)
    }
    for (const [nazev, qty] of Object.entries(mosty3l)) {
      const m = mostyList.find(x => x.nazev === nazev)
      lines.push(`Mošt ${nazev} 3L: ${qty}x (${qty * (m?.cena3l || 0)} Kč)`)
    }
    return lines.length ? 'Nezávazná poptávka:\n' + lines.map(l => '- ' + l).join('\n') : ''
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setTouched({ jmeno: true, telefon: true, email: true, zprava: true })
    const e2 = validate()
    setErrors(e2)
    if (Object.keys(e2).length) return
    setStatus('sending')
    const orderText = buildOrderText()
    const fullZprava = [orderText, form.zprava].filter(Boolean).join('\n\n')
    try {
      const res = await fetch('https://formsubmit.co/ajax/holubdenis@seznam.cz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...form, zprava: fullZprava }),
      })
      setStatus(res.ok ? 'ok' : 'err')
    } catch {
      setStatus('err')
    }
  }

  const hasOrder = Object.keys(ovoce).length > 0 || Object.keys(mosty5l).length > 0 || Object.keys(mosty3l).length > 0
  const hasMostySelected = Object.keys(mosty5l).length > 0 || Object.keys(mosty3l).length > 0

  const field = 'border border-gray-200 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition bg-white'
  const qtyField = 'border border-gray-200 rounded-lg px-3 py-2 text-sm w-20 text-center focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition bg-white'

  return (
    <section id="napiste" className="bg-[#f7f4ef] py-20">
      <div className="max-w-2xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-green-700 text-xs tracking-widest uppercase mb-3">Nezávazná poptávka</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#133e13] mb-3">
            Poptat ovoce nebo mošty
          </h2>
          <p className="text-gray-500 text-sm">
            Vyberte co vás zajímá a my se ozveme s dostupností a cenou
          </p>
          <p className="text-sm mt-1">
            nebo přímo na{' '}
            <a href={`mailto:${k.email}`} className="text-green-700 hover:underline font-medium">{k.email}</a>
          </p>
        </div>

        {status === 'ok' ? (
          <div className="bg-white rounded-2xl border border-green-200 p-8 text-center text-green-700 shadow-sm">
            <svg className="w-10 h-10 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <p className="font-semibold text-lg mb-1">Poptávka odeslána!</p>
            <p className="text-sm text-gray-500">Ozveme se co nejdříve s dostupností a cenou.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>

            {/* --- 1. VÝBĚR PRODUKTŮ --- */}
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
              <h3 className="font-semibold text-[#133e13] text-lg mb-1">Co vás zajímá?</h3>
              <p className="text-gray-400 text-xs mb-5">Vyberte produkty – nezávazně. Cenu a dostupnost potvrdíme telefonicky.</p>

              {/* Ovoce */}
              {dostupneOvoce.length > 0 && (
                <>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Čerstvé ovoce</p>
                  <div className="space-y-2 mb-6">
                    {dostupneOvoce.map(o => {
                      const selected = o.nazev in ovoce
                      return (
                        <div key={o.nazev}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition cursor-pointer ${
                            selected ? 'border-green-300 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                          }`}
                          onClick={() => toggleOvoce(o.nazev)}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                            selected ? 'bg-green-600 border-green-600' : 'border-gray-300'
                          }`}>
                            {selected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-800">{o.nazev}</span>
                            <span className="text-xs text-gray-400 ml-2">{o.sezona}</span>
                          </div>
                          {selected && (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <input
                                type="number"
                                min="1"
                                placeholder="kg"
                                value={ovoce[o.nazev] || ''}
                                onChange={e => setOvoceKg(o.nazev, e.target.value)}
                                className={qtyField}
                              />
                              <span className="text-xs text-gray-400">kg</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Mošty - rozklikávací */}
              <button
                type="button"
                onClick={() => setShowMosty(prev => !prev)}
                className="flex items-center justify-between w-full text-left"
              >
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domácí mošty
                  {hasMostySelected && <span className="text-green-600 normal-case ml-2">({Object.keys(mosty5l).length + Object.keys(mosty3l).length} vybráno)</span>}
                </p>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showMosty ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showMosty && (
                <div className="space-y-2 mt-3">
                  {mostyList.map(m => {
                    const has5 = m.nazev in mosty5l
                    const has3 = m.nazev in mosty3l
                    const active = has5 || has3
                    return (
                      <div key={m.nazev}
                        className={`rounded-xl border px-4 py-3 transition ${
                          !m.dostupne ? 'opacity-40 pointer-events-none' : ''
                        } ${active ? 'border-green-300 bg-green-50' : 'border-gray-100'}`}
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{m.nazev}</span>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-400">5L</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={mosty5l[m.nazev] || ''}
                                onChange={e => setMostQty(setMosty5l, m.nazev, e.target.value)}
                                className={qtyField + ' !w-16'}
                              />
                              <span className="text-xs text-gray-400">{m.cena5l} Kč</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-400">3L</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={mosty3l[m.nazev] || ''}
                                onChange={e => setMostQty(setMosty3l, m.nazev, e.target.value)}
                                className={qtyField + ' !w-16'}
                              />
                              <span className="text-xs text-gray-400">{m.cena3l} Kč</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* --- 2. KONTAKTNÍ ÚDAJE --- */}
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-4">
              <h3 className="font-semibold text-[#133e13] text-lg mb-1">Kontaktní údaje</h3>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Jméno</label>
                <input name="jmeno" value={form.jmeno} onChange={handleChange} onBlur={handleBlur}
                  placeholder="Jan Novák" className={field} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Telefon</label>
                  <input name="telefon" type="tel" value={form.telefon} onChange={handleChange} onBlur={handleBlur}
                    placeholder="+420 777 123 456" className={field} />
                  {touched.telefon && errors.telefon && <p className="text-red-500 text-xs mt-1">{errors.telefon}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">E-mail</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} onBlur={handleBlur}
                    placeholder="jan@email.cz" className={field} />
                  {touched.email && errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>
              {(touched.telefon || touched.email) && errors.kontakt && (
                <p className="text-red-500 text-xs -mt-2">{errors.kontakt}</p>
              )}
              <p className="text-gray-400 text-xs -mt-2">Stačí vyplnit telefon nebo e-mail.</p>
            </div>

            {/* --- 3. POZNÁMKA --- */}
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Poznámka</label>
                <textarea name="zprava" value={form.zprava} onChange={handleChange} onBlur={handleBlur}
                  rows={3} placeholder="Preferované datum rozvozu, speciální požadavky..."
                  className={field + ' resize-none'} />
              </div>
            </div>

            {/* --- ODESLAT --- */}
            {status === 'err' && (
              <p className="text-red-600 text-sm text-center">Nepodařilo se odeslat. Zkuste to prosím znovu.</p>
            )}
            <button type="submit" disabled={status === 'sending'}
              className="w-full bg-[#1a561a] hover:bg-[#133e13] text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-60 text-lg">
              {status === 'sending' ? 'Odesílám…' : 'Odeslat nezávaznou poptávku →'}
            </button>
            <p className="text-gray-400 text-xs text-center">Poptávka je nezávazná. Dostupnost a konečnou cenu potvrdíme telefonicky.</p>
          </form>
        )}
      </div>
    </section>
  )
}
