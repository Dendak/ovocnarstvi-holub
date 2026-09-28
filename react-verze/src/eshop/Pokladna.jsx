import { useEffect, useState } from 'react'
import { OBSAH } from '../data'
import { DORUCENI, formatKc, formatMnozstvi } from './katalog'
import { useKosik } from './kosik'
import { nacistUdaje, ulozitObjednavku } from './mujUcet'
import { useAuth } from './auth'
import { ulozitDoUctu } from './objednavkyDb'
import QRCode from 'qrcode'
import { spd, variabilniSymbol } from './platba'

// ============================================================
//  PRAVIDLA OBJEDNÁVEK
//  Objednávka platí hned po odeslání, zákazník dostane automatické
//  potvrzení e-mailem. Farma se ozve jen když něco není k dispozici.
// ============================================================
const UZAVERKA_HODINA = 18          // objednat nejpozději den předem do 18:00
const DNY_ROZVOZU = [1, 3, 5]       // po, st, pá
const DNY_ODBERU = [1, 2, 3, 4, 5, 6] // po–so

const DNY = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota']

// Upcoming days on the given weekdays that can still be ordered for
// (order deadline is the previous day at UZAVERKA_HODINA).
function terminy(dny, pocet = 6, now = new Date()) {
  const out = []
  for (let i = 1; out.length < pocet && i < 60; i++) {
    const den = new Date(now)
    den.setHours(12, 0, 0, 0)
    den.setDate(den.getDate() + i)
    if (!dny.includes(den.getDay())) continue
    const uzaverka = new Date(den)
    uzaverka.setDate(den.getDate() - 1)
    uzaverka.setHours(UZAVERKA_HODINA, 0, 0, 0)
    if (now >= uzaverka) continue
    out.push(`${DNY[den.getDay()]} ${den.getDate()}. ${den.getMonth() + 1}.`)
  }
  return out
}

// Customer confirmation goes out from objednavky@ via a PHP script on the Wedos hosting
// (FormSubmit cannot auto-reply to AJAX submissions). Failure must not block the order.
async function poslatPotvrzeni({ email, jmeno, cislo, souhrn, castka, vs, detail }) {
  try {
    const qr = castka > 0
      ? await QRCode.toDataURL(spd({ castka, vs, zprava: `Objednavka ${cislo}` }), { margin: 1, width: 400, errorCorrectionLevel: 'M' })
      : ''
    await fetch(`${import.meta.env.BASE_URL}api/potvrzeni.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, jmeno, cislo, souhrn, castka, qr, ...detail }),
    })
  } catch { /* the order itself is already sent */ }
}

function cisloObjednavky() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `OH-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(100 + Math.random() * 900)}`
}

function Chyba({ text }) {
  return text ? <p className="text-berry text-xs mt-1">{text}</p> : null
}

function Volba({ name, value, current, onChange, label, detail }) {
  return (
    <label className={`flex items-start gap-3 rounded-md border-2 px-4 py-3 cursor-pointer transition ${
      current === value ? 'border-leaf bg-paper-2' : 'border-line hover:border-ink/40'
    }`}>
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => onChange(name, value)} className="mt-1 accent-leaf" />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {detail && <span className="block text-xs text-muted mt-0.5">{detail}</span>}
      </span>
    </label>
  )
}

export default function Pokladna({ onZpet, onHotovo }) {
  const kosik = useKosik()
  const [terminyRozvozu] = useState(() => terminy(DNY_ROZVOZU))
  const [terminyOdberu] = useState(() => terminy(DNY_ODBERU))
  const [f, setF] = useState(() => {
    const u = nacistUdaje()
    return {
      jmeno: u?.jmeno || '', telefon: u?.telefon || '', email: u?.email || '', adresa: u?.adresa || '',
      doruceni: u?.doruceni || 'rozvoz', termin: terminyRozvozu[0], terminOdberu: terminyOdberu[0],
      platba: 'prevzeti', poznamka: '', souhlas: false, zapamatovat: true,
    }
  })
  const [chyby, setChyby] = useState({})
  const [stav, setStav] = useState(null)
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  const auth = useAuth()
  const uzivatel = auth.uzivatel

  // Signed-in customers get their saved details filled in (empty fields only).
  useEffect(() => {
    if (!uzivatel) return
    const m = uzivatel.user_metadata || {}
    setF(prev => ({
      ...prev,
      email: prev.email || uzivatel.email || '',
      jmeno: prev.jmeno || m.jmeno || m.full_name || m.name || '',
      telefon: prev.telefon || m.telefon || '',
      adresa: prev.adresa || m.adresa || '',
    }))
  }, [uzivatel])

  const validovat = () => {
    const e = {}
    if (!f.jmeno.trim()) e.jmeno = 'Vyplňte jméno.'
    if (!/^[+\d\s\-()]{9,}$/.test(f.telefon.trim())) e.telefon = 'Vyplňte telefon – hodí se při předání objednávky.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Vyplňte e-mail – pošleme na něj potvrzení objednávky.'
    if (f.doruceni === 'rozvoz' && !f.adresa.trim()) e.adresa = 'Vyplňte adresu pro dovoz.'
    if (!f.souhlas) e.souhlas = 'Bez souhlasu nemůžeme objednávku zpracovat.'
    return e
  }

  const odeslat = async ev => {
    ev.preventDefault()
    const e = validovat()
    setChyby(e)
    if (Object.keys(e).length) return
    setStav('odesilam')

    const k = OBSAH.kontakt
    const cislo = cisloObjednavky()
    const radky = kosik.polozky.map(p =>
      `${formatMnozstvi(p.produkt, p.varianta, p.pocet)} ${p.produkt.nazev} (${p.produkt.druhNazev}) – ${p.cena == null ? 'cena na dotaz' : formatKc(p.cena)}`)
    const rozvoz = f.doruceni === 'rozvoz'
    const den = rozvoz ? f.termin : f.terminOdberu
    const prevzeti = rozvoz
      ? `Dovoz až domů: ${den} dopoledne, ${f.adresa.trim()}, České Budějovice`
      : `Osobní odběr: ${den}, ${k.adresa}, ${k.mesto}`
    const celkem = `${formatKc(kosik.soucet)}${kosik.bezCeny ? ' + položky s cenou na dotaz' : ''}`
    const prevodem = f.platba === 'prevod'
    const vs = variabilniSymbol(cislo)
    const souhrn = [
      ...radky, '',
      `Celkem: ${celkem}${rozvoz ? ' (doprava v ceně)' : ''}`,
      prevzeti,
      prevodem ? `Platba: převodem předem, VS ${vs}` : 'Platba: při převzetí',
      ...(f.poznamka.trim() ? [`Poznámka: ${f.poznamka.trim()}`] : []),
    ].join('\n')

    const payload = {
      // The subject starts with the day so the day's orders sort together in the inbox.
      _subject: `${rozvoz ? 'ROZVOZ' : 'ODBĚR'} ${den} | ${cislo} | ${f.jmeno.trim()} | ${celkem}`,
      _template: 'box',
      _replyto: f.email.trim(),
      objednavka: cislo,
      termin: `${rozvoz ? 'Rozvoz' : 'Osobní odběr'} – ${den}`,
      jmeno: f.jmeno.trim(),
      telefon: f.telefon.trim(),
      email: f.email.trim(),
      adresa: rozvoz ? f.adresa.trim() : '— (osobní odběr)',
      polozky: radky.join('\n'),
      celkem,
      platba: prevodem ? `PŘEVODEM PŘEDEM – VS ${vs} – zkontrolovat příchod platby` : 'při převzetí',
      poznamka: f.poznamka.trim() || '—',
    }

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${k.emailObjednavky}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      const zaznam = {
        cislo, datum: new Date().toISOString(), termin: `${rozvoz ? 'Dovoz' : 'Odběr'} ${den}`, celkem,
        ...(prevodem ? { prevod: kosik.soucet } : {}),
        radky, polozky: kosik.polozky.map(p => ({ key: p.key, pocet: p.pocet })),
      }
      if (uzivatel) {
        // The order e-mail already went out; the account copy is best-effort.
        await ulozitDoUctu(zaznam).catch(() => false)
        if (f.zapamatovat) await auth.ulozitProfil({ jmeno: f.jmeno.trim(), telefon: f.telefon.trim(), adresa: f.adresa.trim() }).catch(() => null)
      }
      ulozitObjednavku(
        zaznam,
        f.zapamatovat
          ? { jmeno: f.jmeno.trim(), telefon: f.telefon.trim(), email: f.email.trim(), adresa: f.adresa.trim(), doruceni: f.doruceni }
          : null,
      )
      await poslatPotvrzeni({
        email: f.email.trim(), jmeno: f.jmeno.trim(), cislo, souhrn,
        castka: prevodem ? kosik.soucet : 0, vs,
        // For the delivery overview page on the hosting (api/rozvoz.php).
        detail: {
          rozvoz, den, telefon: f.telefon.trim(), adresa: rozvoz ? f.adresa.trim() : '',
          polozky: radky, celkem: kosik.soucet, platba: prevodem ? 'prevod' : 'prevzeti',
          poznamka: f.poznamka.trim(),
        },
      })
      kosik.vyprazdnit()
      onHotovo({ cislo, souhrn, email: f.email.trim(), prevodem, castka: kosik.soucet })
    } catch {
      setStav('chyba')
    }
  }

  const field = 'border border-line rounded-md px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-leaf/20 focus:border-transparent bg-white'
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <button onClick={onZpet} className="text-leaf text-sm font-medium hover:underline mb-6 cursor-pointer">← Zpět do obchodu</button>
      <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink mb-8">Dokončení objednávky</h1>
      {auth.zapnuto && !uzivatel && !auth.nacita && (
        <p className="text-sm bg-paper-2 text-ink rounded-md px-4 py-3 mb-6 -mt-4">
          Máte účet? <a href="#ucet" className="font-semibold underline">Přihlaste se</a> a údaje se vyplní samy. Košík vám zůstane.
        </p>
      )}

      <form onSubmit={odeslat} noValidate className="grid lg:grid-cols-[1fr_22rem] gap-8 items-start">
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 space-y-4">
            <h2 className="font-semibold text-lg text-ink">Kontaktní údaje</h2>
            <div>
              <label htmlFor="jmeno" className="text-xs font-medium text-ink-soft mb-1 block">Jméno a příjmení *</label>
              <input id="jmeno" autoComplete="name" value={f.jmeno} onChange={e => set('jmeno', e.target.value)} className={field} />
              <Chyba text={chyby.jmeno} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="text-xs font-medium text-ink-soft mb-1 block">E-mail * (přijde na něj potvrzení)</label>
                <input id="email" type="email" autoComplete="email" value={f.email} onChange={e => set('email', e.target.value)} className={field} />
                <Chyba text={chyby.email} />
              </div>
              <div>
                <label htmlFor="telefon" className="text-xs font-medium text-ink-soft mb-1 block">Telefon *</label>
                <input id="telefon" type="tel" autoComplete="tel" value={f.telefon} onChange={e => set('telefon', e.target.value)} placeholder="+420 …" className={field} />
                <Chyba text={chyby.telefon} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 space-y-3">
            <h2 className="font-semibold text-lg text-ink">Převzetí</h2>
            <Volba name="doruceni" current={f.doruceni} onChange={set} value="rozvoz" label={DORUCENI.rozvoz.label} detail={DORUCENI.rozvoz.detail} />
            <Volba name="doruceni" current={f.doruceni} onChange={set} value="odber" label={DORUCENI.odber.label} detail={DORUCENI.odber.detail} />
            {f.doruceni === 'odber' ? (
              <div className="pt-2">
                <label htmlFor="terminOdberu" className="text-xs font-medium text-ink-soft mb-1 block">Den vyzvednutí</label>
                <select id="terminOdberu" value={f.terminOdberu} onChange={e => set('terminOdberu', e.target.value)} className={field}>
                  {terminyOdberu.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            ) : (
              <div className="pt-2 space-y-3">
                <div>
                  <label htmlFor="termin" className="text-xs font-medium text-ink-soft mb-1 block">Den dovozu (dopoledne)</label>
                  <select id="termin" value={f.termin} onChange={e => set('termin', e.target.value)} className={field}>
                    {terminyRozvozu.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="adresa" className="text-xs font-medium text-ink-soft mb-1 block">Adresa v Českých Budějovicích *</label>
                  <input id="adresa" autoComplete="street-address" value={f.adresa} onChange={e => set('adresa', e.target.value)} placeholder="Ulice a číslo" className={field} />
                  <Chyba text={chyby.adresa} />
                </div>
              </div>
            )}
            <p className="text-xs text-muted">Objednávky přijímáme nejpozději den předem do {UZAVERKA_HODINA}:00.</p>
          </div>

          <div className="bg-white rounded-lg p-6 space-y-3">
            <h2 className="font-semibold text-lg text-ink">Platba</h2>
            <Volba name="platba" current={f.platba} onChange={set} value="prevzeti" label="Při převzetí" detail="hotově řidiči nebo při vyzvednutí" />
            <Volba name="platba" current={f.platba} onChange={set} value="prevod" label="Převodem předem" detail="QR kód k platbě uvidíte hned po odeslání objednávky" />
          </div>

          <div className="bg-white rounded-lg p-6">
            <label htmlFor="poznamka" className="text-xs font-medium text-ink-soft mb-1 block">Poznámka k objednávce</label>
            <textarea id="poznamka" rows={3} value={f.poznamka} onChange={e => set('poznamka', e.target.value)}
              placeholder="Např. zvonit na Novákovi, 2. patro" className={field + ' resize-none'} />
          </div>
        </div>

        {/* Souhrn */}
        <aside className="bg-white rounded-lg p-6 lg:sticky lg:top-24">
          <h2 className="font-semibold text-lg text-ink mb-4">Souhrn</h2>
          <ul className="divide-y divide-line mb-4">
            {kosik.polozky.map(p => (
              <li key={p.key} className="py-2 flex justify-between gap-3 text-sm">
                <span className="text-ink-soft">{formatMnozstvi(p.produkt, p.varianta, p.pocet)} {p.produkt.nazev}</span>
                <span className="tabular-nums font-medium whitespace-nowrap">{p.cena == null ? 'na dotaz' : formatKc(p.cena)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between items-baseline border-t border-line pt-3 mb-1">
            <span className="font-semibold">Celkem</span>
            <span className="font-semibold text-xl text-ink tabular-nums">{formatKc(kosik.soucet)}</span>
          </div>
          <p className="text-xs text-muted mb-5">
            Doprava až domů je v ceně. {f.platba === 'prevod' ? 'Platíte převodem předem.' : 'Platíte až při převzetí.'}
          </p>

          <label className="flex items-start gap-2 text-xs text-ink-soft mb-1 cursor-pointer">
            <input type="checkbox" checked={f.souhlas} onChange={e => set('souhlas', e.target.checked)} className="mt-0.5 accent-leaf" />
            <span>Souhlasím se zpracováním osobních údajů pro vyřízení objednávky podle{' '}
              <a href={`${import.meta.env.BASE_URL}gdpr.html`} target="_blank" rel="noreferrer" className="text-leaf underline">zásad ochrany osobních údajů</a>.
            </span>
          </label>
          <Chyba text={chyby.souhlas} />
          <label className="flex items-start gap-2 text-xs text-ink-soft mt-2 cursor-pointer">
            <input type="checkbox" checked={f.zapamatovat} onChange={e => set('zapamatovat', e.target.checked)} className="mt-0.5 accent-leaf" />
            <span>Zapamatovat mé údaje na tomto zařízení pro příští objednávku</span>
          </label>

          {stav === 'chyba' && (
            <p className="text-berry text-sm mt-3">Objednávku se nepodařilo odeslat. Zkuste to prosím znovu, nebo zavolejte {OBSAH.kontakt.tel1}.</p>
          )}
          <button type="submit" disabled={stav === 'odesilam' || kosik.polozky.length === 0}
            className="w-full mt-4 bg-leaf hover:bg-leaf-dark text-white font-semibold py-3.5 rounded-md transition-colors disabled:opacity-60 cursor-pointer">
            {stav === 'odesilam' ? 'Odesílám…' : `Objednat za ${formatKc(kosik.soucet)}`}
          </button>
          <p className="text-xs text-muted mt-3 text-center">Potvrzení vám hned přijde e-mailem. Ozveme se jen tehdy, kdyby něco nebylo k dispozici.</p>
        </aside>
      </form>
    </div>
  )
}
