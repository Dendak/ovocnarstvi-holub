import { useState } from 'react'
import { OBSAH } from '../data'

export default function KontaktForm() {
  const k = OBSAH.kontakt
  const [form, setForm]       = useState({ jmeno: '', telefon: '', email: '', zprava: '' })
  const [errors, setErrors]   = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus]   = useState(null) // null | 'sending' | 'ok' | 'err'

  const validate = (f = form) => {
    const e = {}
    if (f.telefon && !/^[+\d\s\-()]{7,}$/.test(f.telefon)) e.telefon = 'Neplatný formát čísla.'
    if (f.email    && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))  e.email    = 'Neplatný formát e-mailu.'
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

  const handleSubmit = async e => {
    e.preventDefault()
    setTouched({ jmeno: true, telefon: true, email: true, zprava: true })
    const e2 = validate()
    setErrors(e2)
    if (Object.keys(e2).length) return
    setStatus('sending')
    try {
      const res = await fetch('https://formsubmit.co/ajax/holubdenis@seznam.cz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      })
      setStatus(res.ok ? 'ok' : 'err')
    } catch {
      setStatus('err')
    }
  }

  const field = 'border border-gray-200 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition bg-white'

  return (
    <section id="napiste" className="bg-[#f7f4ef] py-20">
      <div className="max-w-xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-green-700 text-xs tracking-widest uppercase mb-3">Ozvěte se nám</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#133e13] mb-3">
            Napište nám
          </h2>
          <p className="text-gray-500 text-sm">
            Objednávka, dotaz nebo zájem o rozvoz do Budějovic
          </p>
          <p className="text-sm mt-1">
            nebo přímo na{' '}
            <a href={`mailto:${k.email}`} className="text-green-700 hover:underline font-medium">{k.email}</a>
          </p>
        </div>

        {status === 'ok' ? (
          <div className="bg-white rounded-2xl border border-green-200 p-8 text-center text-green-700 shadow-sm">
            <svg className="w-10 h-10 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <p className="font-semibold text-lg mb-1">Zpráva odeslána!</p>
            <p className="text-sm text-gray-500">Ozveme se co nejdříve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-4" noValidate>
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
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Zpráva</label>
              <textarea name="zprava" value={form.zprava} onChange={handleChange} onBlur={handleBlur}
                rows={4} placeholder="Co vás zajímá? Co si chcete objednat?"
                className={field + ' resize-none'} />
            </div>
            {status === 'err' && (
              <p className="text-red-600 text-sm text-center">❌ Nepodařilo se odeslat. Zkuste to prosím znovu.</p>
            )}
            <button type="submit" disabled={status === 'sending'}
              className="w-full bg-[#1a561a] hover:bg-[#133e13] text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60">
              {status === 'sending' ? 'Odesílám…' : 'Odeslat poptávku →'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
