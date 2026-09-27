import { useState } from 'react'
import { OBSAH } from '../data'
import { DORUCENI, PLATBA, formatKc, formatMnozstvi } from './katalog'
import { useKosik } from './kosik'

const DNY = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota']

// Next delivery days (Mon / Wed / Fri). Tomorrow is skipped so there is time
// to confirm the order by phone.
function terminyRozvozu(pocet = 6, od = new Date()) {
  const out = []
  const d = new Date(od)
  d.setDate(d.getDate() + 1)
  while (out.length < pocet) {
    d.setDate(d.getDate() + 1)
    if ([1, 3, 5].includes(d.getDay())) {
      out.push(`${DNY[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`)
    }
  }
  return out
}

function cisloObjednavky() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `OH-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(100 + Math.random() * 900)}`
}

function Chyba({ text }) {
  return text ? <p className="text-red-600 text-xs mt-1">{text}</p> : null
}

function Volba({ name, value, current, onChange, label, detail }) {
  return (
    <label className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition ${
      current === value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => onChange(name, value)} className="mt-1 accent-green-600" />
      <span>
        <span className="block text-sm font-medium text-gray-800">{label}</span>
        {detail && <span className="block text-xs text-gray-500 mt-0.5">{detail}</span>}
      </span>
    </label>
  )
}

export default function Pokladna({ onZpet, onHotovo }) {
  const kosik = useKosik()
  const terminy = terminyRozvozu()
  const [f, setF] = useState({
    jmeno: '', telefon: '', email: '', doruceni: 'rozvoz', adresa: '', termin: terminy[0], datumOdberu: '',
    platba: 'prevzeti', poznamka: '', souhlas: false,
  })
  const [chyby, setChyby] = useState({})
  const [stav, setStav] = useState(null)
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const validovat = () => {
    const e = {}
    if (!f.jmeno.trim()) e.jmeno = 'Vyplňte jméno.'
    if (!/^[+\d\s\-()]{9,}$/.test(f.telefon.trim())) e.telefon = 'Vyplňte telefon, ať vám můžeme objednávku potvrdit.'
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Neplatný formát e-mailu.'
    if (f.doruceni === 'rozvoz' && !f.adresa.trim()) e.adresa = 'Vyplňte adresu pro rozvoz.'
    if (!f.souhlas) e.souhlas = 'Bez souhlasu nemůžeme objednávku zpracovat.'
    return e
  }

  const odeslat = async ev => {
    ev.preventDefault()
    const e = validovat()
    setChyby(e)
    if (Object.keys(e).length) return
    setStav('odesilam')

    const cislo = cisloObjednavky()
    const radky = kosik.polozky.map(p =>
      `${formatMnozstvi(p.produkt, p.varianta, p.pocet)} ${p.produkt.nazev} (${p.produkt.druhNazev}) – ${p.cena == null ? 'cena na dotaz' : formatKc(p.cena)}`)
    const doruceni = f.doruceni === 'rozvoz'
      ? `${DORUCENI.rozvoz.label}, termín: ${f.termin}, adresa: ${f.adresa}`
      : `${DORUCENI.odber.label}${f.datumOdberu ? `, preferovaný den: ${f.datumOdberu}` : ''}`
    const celkem = `${formatKc(kosik.soucet)}${kosik.bezCeny ? ' + položky s cenou na dotaz' : ''}`
    const souhrn = [
      `Objednávka ${cislo}`, '', ...radky, '', `Celkem: ${celkem}`,
      `Převzetí: ${doruceni}`, `Platba: ${PLATBA[f.platba]}`,
      f.poznamka && `Poznámka: ${f.poznamka}`,
    ].filter(x => x !== false && x !== '' || x === '').join('\n')

    const payload = {
      _subject: `Nová objednávka ${cislo} – e-shop (${celkem})`,
      _template: 'box',
      objednavka: cislo,
      jmeno: f.jmeno,
      telefon: f.telefon,
      email: f.email || '(nevyplněn)',
      polozky: radky.join('\n'),
      celkem,
      prevzeti: doruceni,
      platba: PLATBA[f.platba],
      poznamka: f.poznamka || '—',
    }
    if (f.email) {
      payload._replyto = f.email
      payload._autoresponse =
        `Děkujeme za objednávku ${cislo}!\n\n${souhrn}\n\nObjednávku vám brzy potvrdíme telefonicky. ` +
        `V případě dotazů volejte ${OBSAH.kontakt.tel1}.\n\nOvocnářství Holub, Krtely 70, Netolice`
    }

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${OBSAH.kontakt.email}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      kosik.vyprazdnit()
      onHotovo({ cislo, souhrn, email: f.email })
    } catch {
      setStav('chyba')
    }
  }

  const field = 'border border-gray-200 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white'
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <button onClick={onZpet} className="text-green-700 text-sm font-medium hover:underline mb-6 cursor-pointer">← Zpět do obchodu</button>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#133e13] mb-8">Dokončení objednávky</h1>

      <form onSubmit={odeslat} noValidate className="grid lg:grid-cols-[1fr_22rem] gap-8 items-start">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-lg text-[#133e13]">Kontaktní údaje</h2>
            <div>
              <label htmlFor="jmeno" className="text-xs font-medium text-gray-600 mb-1 block">Jméno a příjmení *</label>
              <input id="jmeno" autoComplete="name" value={f.jmeno} onChange={e => set('jmeno', e.target.value)} className={field} />
              <Chyba text={chyby.jmeno} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="telefon" className="text-xs font-medium text-gray-600 mb-1 block">Telefon *</label>
                <input id="telefon" type="tel" autoComplete="tel" value={f.telefon} onChange={e => set('telefon', e.target.value)} placeholder="+420 …" className={field} />
                <Chyba text={chyby.telefon} />
              </div>
              <div>
                <label htmlFor="email" className="text-xs font-medium text-gray-600 mb-1 block">E-mail (pošleme potvrzení)</label>
                <input id="email" type="email" autoComplete="email" value={f.email} onChange={e => set('email', e.target.value)} className={field} />
                <Chyba text={chyby.email} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
            <h2 className="font-semibold text-lg text-[#133e13]">Převzetí</h2>
            <Volba name="doruceni" current={f.doruceni} onChange={set} value="rozvoz" label={DORUCENI.rozvoz.label} detail={DORUCENI.rozvoz.detail} />
            <Volba name="doruceni" current={f.doruceni} onChange={set} value="odber" label={DORUCENI.odber.label} detail={DORUCENI.odber.detail} />
            {f.doruceni === 'odber' ? (
              <div className="pt-2">
                <label htmlFor="datumOdberu" className="text-xs font-medium text-gray-600 mb-1 block">Kdy byste chtěli přijet? (nepovinné)</label>
                <input id="datumOdberu" value={f.datumOdberu} onChange={e => set('datumOdberu', e.target.value)} placeholder="např. sobota dopoledne" className={field} />
              </div>
            ) : (
              <div className="pt-2 space-y-3">
                <div>
                  <label htmlFor="termin" className="text-xs font-medium text-gray-600 mb-1 block">Termín rozvozu</label>
                  <select id="termin" value={f.termin} onChange={e => set('termin', e.target.value)} className={field}>
                    {terminy.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="adresa" className="text-xs font-medium text-gray-600 mb-1 block">Adresa v Českých Budějovicích *</label>
                  <input id="adresa" autoComplete="street-address" value={f.adresa} onChange={e => set('adresa', e.target.value)} placeholder="Ulice a číslo" className={field} />
                  <Chyba text={chyby.adresa} />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
            <h2 className="font-semibold text-lg text-[#133e13]">Platba</h2>
            <Volba name="platba" current={f.platba} onChange={set} value="prevzeti" label={PLATBA.prevzeti} />
            <Volba name="platba" current={f.platba} onChange={set} value="prevod" label={PLATBA.prevod} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label htmlFor="poznamka" className="text-xs font-medium text-gray-600 mb-1 block">Poznámka k objednávce</label>
            <textarea id="poznamka" rows={3} value={f.poznamka} onChange={e => set('poznamka', e.target.value)} className={field + ' resize-none'} />
          </div>
        </div>

        {/* Souhrn */}
        <aside className="bg-white rounded-2xl shadow-sm p-6 lg:sticky lg:top-24">
          <h2 className="font-semibold text-lg text-[#133e13] mb-4">Souhrn</h2>
          <ul className="divide-y divide-gray-100 mb-4">
            {kosik.polozky.map(p => (
              <li key={p.key} className="py-2 flex justify-between gap-3 text-sm">
                <span className="text-gray-700">{formatMnozstvi(p.produkt, p.varianta, p.pocet)} {p.produkt.nazev}</span>
                <span className="tabular-nums font-medium whitespace-nowrap">{p.cena == null ? 'na dotaz' : formatKc(p.cena)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between items-baseline border-t border-gray-200 pt-3 mb-1">
            <span className="font-semibold">Celkem</span>
            <span className="font-bold text-xl text-[#133e13] tabular-nums">{formatKc(kosik.soucet)}</span>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Doprava až domů je v ceně. U ovoce se konečná cena může mírně lišit podle skutečné váhy.
          </p>

          <label className="flex items-start gap-2 text-xs text-gray-600 mb-1 cursor-pointer">
            <input type="checkbox" checked={f.souhlas} onChange={e => set('souhlas', e.target.checked)} className="mt-0.5 accent-green-600" />
            <span>Souhlasím se zpracováním osobních údajů pro vyřízení objednávky podle{' '}
              <a href={`${import.meta.env.BASE_URL}gdpr.html`} target="_blank" rel="noreferrer" className="text-green-700 underline">zásad ochrany osobních údajů</a>.
            </span>
          </label>
          <Chyba text={chyby.souhlas} />

          {stav === 'chyba' && (
            <p className="text-red-600 text-sm mt-3">Objednávku se nepodařilo odeslat. Zkuste to prosím znovu, nebo zavolejte {OBSAH.kontakt.tel1}.</p>
          )}
          <button type="submit" disabled={stav === 'odesilam' || kosik.polozky.length === 0}
            className="w-full mt-4 bg-[#1a561a] hover:bg-[#133e13] text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 cursor-pointer">
            {stav === 'odesilam' ? 'Odesílám…' : 'Odeslat objednávku'}
          </button>
          <p className="text-xs text-gray-400 mt-3 text-center">Objednávku vám potvrdíme telefonicky. Platíte až při převzetí nebo po potvrzení.</p>
        </aside>
      </form>
    </div>
  )
}
