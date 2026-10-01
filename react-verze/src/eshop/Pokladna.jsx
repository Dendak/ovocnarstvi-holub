import { useEffect, useMemo, useRef, useState } from 'react'
import { OBSAH } from '../data'
import { DORUCENI, formatKc, formatMnozstvi, nazevPolozky, radekPolozky } from './katalog'
import { useKosik } from './kosik'
import AdresaInput from './AdresaInput'
import { SKUPINA } from './skupina'
import { rozdelitJmeno } from './mujUcet'
import { useAuth, poPrihlaseniZpet } from './auth'
import { ulozitDoUctu } from './objednavkyDb'
import { variabilniSymbol } from './platba'
import { UZAVERKA_HODINA, DNY_ROZVOZU, DNY_ODBERU, terminy } from './terminy'

// A customer group can have one fixed delivery address (no pickup, no address entry).
const PEVNA_ADRESA = SKUPINA?.adresa || null

const CHYBA_TERMINU = `Tento den už nestihneme – objednávky přijímáme nejpozději den předem do ${UZAVERKA_HODINA}:00. Vyberte prosím jiný.`

// The order goes to our own hosting (api/potvrzeni.php): it re-prices the cart from its own price list,
// stores the order, e-mails the farm and sends the customer confirmation (with the payment QR).
// Returns { status, d } – HTTP status (0 = no connection) and the JSON answer.
async function odeslatNaHosting(data, token) {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/potvrzeni.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data),
    })
    const d = await res.json().catch(() => null)
    return { status: res.status, d: d && typeof d === 'object' ? d : {} }
  } catch {
    return { status: 0, d: {} }
  }
}

// Odešle objednávku a na odpověď „číslo je obsazené“ (409 kolize) to zkusí s novým číslem (nejvýš 3×);
// při výpadku spojení nebo chybě serveru jednou znovu se stejným číslem (server ji podruhé neuloží).
// `cislo` = číslo z předchozího nedokončeného pokusu (odpověď nedorazila – objednávka už možná uložená je).
async function odeslatObjednavku(data, token, cislo = cisloObjednavky()) {
  let r
  for (let kolize = 0, vypadek = 0; ;) {
    r = await odeslatNaHosting({ ...data, cislo }, token)
    if (r.status === 409 && r.d.kolize && kolize < 3) { kolize++; cislo = cisloObjednavky(r.d.dnes); continue }
    if ((r.status === 0 || r.status >= 500) && vypadek < 1) { vypadek++; await new Promise(t => setTimeout(t, 1500)); continue }
    return { ...r, cislo }
  }
}

const VYCHOZI_MESTO = 'České Budějovice'

// Address check against the official Czech address register (api/adresa.php → RÚIAN).
// Returns { stav: 'ok' | 'vice' | 'nenalezeno' | 'chyba', kandidati }.
async function overitAdresu(adresa, mesto = '', zeme = 'CZ') {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/adresa.php?q=${encodeURIComponent(adresa)}&mesto=${encodeURIComponent(mesto)}${zeme === 'AT' ? '&zeme=at' : ''}`)
    if (!res.ok) throw new Error()
    const d = await res.json()
    // limit dotazů nebo výpadek registru: adresu nelze ověřit, ale není to „nenalezeno“
    if (d.limit || d.nedostupne) return { stav: 'chyba', kandidati: [] }
    const k = d.kandidati || []
    if (k.length === 1) return { stav: 'ok', kandidati: k, vybrana: k[0] }
    if (k.length > 1) return { stav: 'vice', kandidati: k }
    return { stav: 'nenalezeno', kandidati: [], chybiCislo: d.chybiCislo }
  } catch {
    return { stav: 'chyba', kandidati: [] }
  }
}

// Číslo objednávky OH-RRMMDD-NNNN; variabilní symbol jsou jeho číslice (10 číslic).
// `dnes` (RRMMDD) posílá server, když má telefon jiné datum než farma.
function cisloObjednavky(dnes) {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  const datum = /^\d{6}$/.test(dnes || '') ? dnes : `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}`
  return `OH-${datum}-${1000 + Math.floor(Math.random() * 9000)}`
}

// Chybová hláška pod polem; `id` ji propojí s polem (aria-describedby).
function Chyba({ id, text }) {
  return text ? <p id={id} className="text-berry text-sm mt-1">{text}</p> : null
}

function OvereniAdresy({ overeni, aktualni, vybrat }) {
  if (!overeni.stav || overeni.q !== aktualni || overeni.stav === 'chyba') return null
  if (overeni.stav === 'overuji') return <p className="text-sm text-ink-soft mt-1.5">Ověřuji adresu…</p>
  if (overeni.stav === 'ok') {
    // Obec zvýrazněná – ať je vidět, kdyby se adresa našla v jiném městě.
    const [ulice, ...zbytek] = overeni.vybrana.adresa.split(', ')
    return (
      <>
        <p className="text-sm text-leaf font-medium mt-1.5">✓ {ulice}{zbytek.length > 0 && <>, <strong className="font-bold text-ink">{zbytek.join(', ')}</strong></>}</p>
        {!overeni.vybrana.adresa.includes(VYCHOZI_MESTO) && (
          <p className="text-sm text-ink-soft mt-1">{overeni.vybrana.adresa.endsWith('Rakousko') ? 'Do Rakouska' : 'Mimo České Budějovice'} dovážíme po domluvě – po objednávce se vám ozveme s termínem.</p>
        )}
      </>
    )
  }
  if (overeni.stav === 'vice') return (
    <fieldset className="mt-2 space-y-1.5">
      <legend className="text-sm font-medium text-ink mb-1">Upřesněte prosím adresu:</legend>
      {overeni.kandidati.map(k => (
        <label key={k.adresa} className="flex gap-2 items-start text-sm cursor-pointer py-1">
          <input type="radio" name="adresaKandidat" checked={overeni.vybrana?.adresa === k.adresa} onChange={() => vybrat(k)} className="mt-0.5 w-4 h-4 accent-leaf" />
          {k.adresa}
        </label>
      ))}
    </fieldset>
  )
  return (
    <p className="text-sm text-berry mt-1.5">
      {overeni.chybiCislo ? 'Doplňte prosím číslo domu.' : 'Tuto adresu jsme nenašli v registru adres. Zkontrolujte ulici, číslo domu a město.'}
    </p>
  )
}

function Volba({ name, value, current, onChange, label, detail }) {
  return (
    <label className={`flex items-start gap-3 rounded-md border-2 px-4 py-3 cursor-pointer transition ${
      current === value ? 'border-leaf bg-paper-2' : 'border-line hover:border-ink/40'
    }`}>
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => onChange(name, value)} className="mt-1 w-4 h-4 accent-leaf" />
      <span>
        <span className="block font-medium text-ink">{label}</span>
        {detail && <span className="block text-sm text-ink-soft mt-0.5">{detail}</span>}
      </span>
    </label>
  )
}

export default function Pokladna({ onZpet, onHotovo: predatHotovo }) {
  const kosik = useKosik()
  // Nabídka dnů se průběžně přepočítává – stránka může zůstat otevřená přes uzávěrku v 18:00.
  const [ted, setTed] = useState(() => new Date())
  const terminyRozvozu = useMemo(() => terminy(DNY_ROZVOZU, 6, ted), [ted])
  const terminyOdberu = useMemo(() => terminy(DNY_ODBERU, 6, ted), [ted])
  const [f, setF] = useState(() => ({
    jmeno: '', prijmeni: '', firma: false, nazevFirmy: '', ico: '', telefon: '', email: '',
    adresa: PEVNA_ADRESA || '', psc: '', mesto: VYCHOZI_MESTO, zeme: 'CZ',
    doruceni: 'rozvoz', termin: terminy(DNY_ROZVOZU)[0] || '', terminOdberu: terminy(DNY_ODBERU)[0] || '',
    platba: 'prevzeti', poznamka: '',
  }))
  const [chyby, setChyby] = useState({})
  const [stav, setStav] = useState(null) // null | 'overuji' | 'odesilam' | 'chyba' | 'zmena' (nabídka se změnila)
  const [overeni, setOvereni] = useState({ q: '', stav: null, kandidati: [] })
  // Adresa (ulice|obec), u které zákazník po upozornění potvrdil, že je správně, i když ji registr nezná.
  const [neovereneOK, setNeovereneOK] = useState('')
  // Úprava pole smaže jeho chybovou hlášku; přepnutí firma / způsob převzetí všechny.
  const set = (k, v) => {
    setF(prev => ({ ...prev, [k]: v }))
    setChyby(c => (k === 'firma' || k === 'doruceni' ? {} : c[k] ? { ...c, [k]: undefined } : c))
  }
  const auth = useAuth()
  const uzivatel = auth.uzivatel
  const odesila = useRef(false) // pojistka proti dvojímu odeslání (dvojklik, netrpělivé klepnutí)
  // Číslo pokusu, na který server neodpověděl: další klepnutí na Objednat pošle objednávku pod stejným
  // číslem – když už ji server uložil, jen to potvrdí a druhá objednávka nevznikne.
  const cisloBezOdpovedi = useRef(undefined)
  const formRef = useRef(null)
  const [fokusChyby, setFokusChyby] = useState(0)
  const ukazatChyby = () => setFokusChyby(n => n + 1)
  // Pro stránku s potvrzením: dovoz mimo ČB (termín domlouváme) nebo s neověřenou adresou.
  const dovoz = useRef(null)
  const onHotovo = info => predatHotovo({ ...info, dovoz: dovoz.current })

  useEffect(() => {
    const obnovit = () => setTed(new Date())
    const t = setInterval(obnovit, 60 * 1000)
    document.addEventListener('visibilitychange', obnovit)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', obnovit) }
  }, [])

  // Nepovedené odeslání uvolní pojistku, zákazník to může zkusit znovu.
  useEffect(() => { if (stav === 'chyba' || stav === 'zmena') odesila.current = false }, [stav])

  // Po neúspěšném pokusu o odeslání: fokus na první chybné pole a posun k němu (i pod pevnou lištou).
  useEffect(() => {
    if (!fokusChyby) return
    const el = formRef.current?.querySelector('[aria-invalid="true"]')
    if (!el) return
    el.focus({ preventScroll: true })
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [fokusChyby])

  // Signed-in customers get the details saved with their account. The e-mail is always the
  // account's – it ties the order to it. Only once per account: Supabase re-sends the user after
  // switching apps, and what the customer has changed here must stay.
  const predvyplneno = useRef(null)
  useEffect(() => {
    if (!uzivatel || predvyplneno.current === uzivatel.id) return
    predvyplneno.current = uzivatel.id
    const m = uzivatel.user_metadata || {}
    const [jmeno, prijmeni] = m.prijmeni != null ? [m.jmeno || '', m.prijmeni] : rozdelitJmeno(m.jmeno || m.full_name || m.name)
    setF(prev => ({
      ...prev,
      email: uzivatel.email || prev.email,
      ...(jmeno || prijmeni ? { jmeno, prijmeni } : {}),
      telefon: m.telefon || prev.telefon,
      ...(PEVNA_ADRESA ? { adresa: PEVNA_ADRESA }
        : m.adresa ? { adresa: m.adresa, psc: m.psc || '', mesto: m.mesto || VYCHOZI_MESTO, zeme: m.zeme === 'AT' ? 'AT' : 'CZ' } : {}),
    }))
  }, [uzivatel])

  const validovat = () => {
    const e = {}
    if (f.firma) {
      if (!f.nazevFirmy.trim()) e.nazevFirmy = 'Vyplňte název firmy.'
      if (f.ico.trim() && !/^\d{8}$/.test(f.ico.trim())) e.ico = 'IČO má 8 číslic.'
    } else {
      if (!f.jmeno.trim()) e.jmeno = 'Vyplňte jméno.'
      if (!f.prijmeni.trim()) e.prijmeni = 'Vyplňte příjmení.'
    }
    if (!/^[+\d\s\-()]{9,}$/.test(f.telefon.trim())) e.telefon = 'Vyplňte telefon – hodí se při předání objednávky.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Vyplňte e-mail – pošleme na něj potvrzení objednávky.'
    if (f.doruceni === 'rozvoz' && !f.adresa.trim()) e.adresa = 'Vyplňte ulici a číslo domu.'
    if (f.doruceni === 'rozvoz' && !PEVNA_ADRESA && !f.mesto.trim()) e.mesto = 'Vyplňte město.'
    if (f.doruceni === 'rozvoz' && !PEVNA_ADRESA && f.zeme === 'AT' && !/^\d{4}$/.test(f.psc.trim())) e.psc = 'Rakouské PSČ má 4 číslice.'
    // Den se ověřuje podle aktuálního času (stránka mohla zůstat otevřená přes uzávěrku).
    const nyni = new Date()
    if (f.doruceni === 'rozvoz' && !terminy(DNY_ROZVOZU, 6, nyni).includes(f.termin)) e.termin = CHYBA_TERMINU
    if (f.doruceni === 'odber' && !terminy(DNY_ODBERU, 6, nyni).includes(f.terminOdberu)) e.terminOdberu = CHYBA_TERMINU
    return e
  }

  // The check is valid for one street + town pair.
  const klicAdresy = `${f.adresa.trim()}|${f.mesto.trim()}|${f.zeme}`

  const zkontrolovatAdresu = async () => {
    const q = klicAdresy
    if (f.doruceni !== 'rozvoz' || f.adresa.trim().length < 3) return overeni
    if (overeni.q === q && overeni.stav && overeni.stav !== 'overuji') return overeni
    setOvereni({ q, stav: 'overuji', kandidati: [] })
    const v = { q, ...(await overitAdresu(f.adresa.trim(), f.zeme === 'AT' ? `${f.psc.trim()} ${f.mesto.trim()}`.trim() : f.mesto.trim(), f.zeme)) }
    setOvereni(v)
    setNeovereneOK('')
    if (v.vybrana?.psc) set('psc', v.vybrana.psc)
    return v
  }

  // A suggestion picked from the address register is verified by definition; it also fills in the
  // postcode and town. Coordinates are fetched if the suggestion came without them.
  const vybratNavrh = async k => {
    setChyby(c => ({ ...c, adresa: undefined, mesto: undefined }))
    setNeovereneOK('')
    setF(prev => ({ ...prev, adresa: k.ulice, psc: k.psc || prev.psc, mesto: k.mesto || prev.mesto }))
    const q = `${k.ulice}|${k.mesto || f.mesto.trim()}|${f.zeme}`
    if (k.gps) { setOvereni({ q, stav: 'ok', kandidati: [k], vybrana: k }); return }
    setOvereni({ q, stav: 'overuji', kandidati: [] })
    const v = await overitAdresu(k.adresa)
    const presna = v.kandidati.find(x => x.adresa === k.adresa)
    setOvereni(presna ? { q, stav: 'ok', kandidati: [presna], vybrana: presna } : { q, ...v })
  }

  const odeslat = async ev => {
    ev.preventDefault()
    if (odesila.current) return
    setTed(new Date())
    const e = validovat()
    setChyby(e)
    if (Object.values(e).some(Boolean) || kosik.nedostupne > 0) { ukazatChyby(); return }
    odesila.current = true
    // Adresa se ověřuje ještě před odesláním; tlačítko je mezitím vypnuté a píše „Ověřuji adresu…“.
    const zpetKOprave = chyba => { setChyby(chyba); setStav(null); odesila.current = false; ukazatChyby() }

    let adr = null
    if (PEVNA_ADRESA) {
      adr = { stav: 'ok', vybrana: { adresa: PEVNA_ADRESA, gps: SKUPINA.gps || null } }
    } else if (f.doruceni === 'rozvoz') {
      setStav('overuji')
      adr = await zkontrolovatAdresu()
      if (adr.stav === 'vice' && !adr.vybrana) {
        zpetKOprave({ adresa: 'Vyberte prosím přesnou adresu ze seznamu.' })
        return
      }
      if (adr.stav === 'nenalezeno' && neovereneOK !== klicAdresy) {
        setNeovereneOK(klicAdresy)
        zpetKOprave({ adresa: 'Zkontrolujte prosím adresu. Pokud je správně, klikněte znovu na Objednat.' })
        return
      }
    }
    dovoz.current = f.doruceni !== 'rozvoz' || PEVNA_ADRESA ? null
      : !adr?.vybrana ? 'neovereno'
        : !adr.vybrana.adresa.includes(VYCHOZI_MESTO) ? 'mimo' : null
    setStav('odesilam')
    const adresaDovozu = adr?.vybrana ? adr.vybrana.adresa : `${f.adresa.trim()}, ${`${f.psc.trim()} ${f.mesto.trim()}`.trim()}${f.zeme === 'AT' ? ', Rakousko' : ''}`
    const celeJmeno = f.firma ? f.nazevFirmy.trim() : `${f.jmeno.trim()} ${f.prijmeni.trim()}`.trim()
    const ico = f.firma ? f.ico.trim() : ''

    const k = OBSAH.kontakt
    const rozvoz = f.doruceni === 'rozvoz'
    const den = rozvoz ? f.termin : f.terminOdberu
    const prevodem = f.platba === 'prevod'
    // Řádky s cenami podle prohlížeče – jen pro zálohu (FormSubmit, starý server bez ceníku).
    // Server ceny, součet i částku k platbě počítá sám podle svého ceníku z košíku (produkt, varianta, počet).
    const radkyKosiku = kosik.polozky.map(p =>
      `${radekPolozky(p)} – ${p.cena == null ? 'cena na dotaz' : formatKc(p.cena)}`)

    try {
      // Ceny a bedýnky skupiny platí jen pro ověřeného člena – server to zjistí z přihlášení.
      const token = SKUPINA ? await auth.token().catch(() => null) : null
      const r = await odeslatObjednavku({
        email: f.email.trim(), jmeno: celeJmeno, telefon: f.telefon.trim(), ico,
        rozvoz, den, adresa: rozvoz ? f.adresa.trim() : '', psc: rozvoz ? f.psc.trim() : '', mesto: rozvoz ? f.mesto.trim() : '', zeme: rozvoz ? f.zeme : 'CZ',
        adresaOverena: rozvoz && adr?.vybrana ? adr.vybrana.adresa : '',
        platba: prevodem ? 'prevod' : 'prevzeti',
        poznamka: f.poznamka.trim(),
        kosik: kosik.polozky.map(p => ({ produkt: p.produkt.id, varianta: p.varianta.id, pocet: p.pocet })),
        celkem: kosik.soucet,
        skupina: SKUPINA ? SKUPINA.id || SKUPINA.nazev : '',
        polozky: radkyKosiku,
      }, token, cisloBezOdpovedi.current)
      cisloBezOdpovedi.current = r.status === 0 || r.status >= 500 ? r.cislo : undefined
      const d = r.d
      // Den mezitím propadl (uzávěrka): nabídka dnů se obnoví a zákazník vybere jiný.
      if (d.chyba === 'termin') {
        setTed(new Date())
        zpetKOprave({ [rozvoz ? 'termin' : 'terminOdberu']: CHYBA_TERMINU })
        return
      }
      // Něco z košíku server nezná (nabídka se mezitím změnila) – pomůže obnovit stránku.
      if (d.chyba === 'cenik') { setStav('zmena'); return }
      // Číslo bylo opakovaně obsazené: záloha přes FormSubmit ne (platba by se připsala k cizí objednávce).
      if (!d.ulozeno && r.status === 409) throw new Error()

      const ulozeno = !!d.ulozeno
      const cislo = ulozeno && d.cislo ? d.cislo : r.cislo
      const vs = variabilniSymbol(cislo)
      // Uložená objednávka: platí řádky, součet a částka k platbě ze serveru.
      const radky = ulozeno && Array.isArray(d.polozky) ? d.polozky : radkyKosiku
      const soucet = ulozeno && Number.isInteger(d.celkem) ? d.celkem : kosik.soucet
      const castka = !prevodem ? 0 : ulozeno && Number.isInteger(d.castka) ? d.castka : kosik.soucet
      const celkem = `${formatKc(soucet)}${!ulozeno && kosik.bezCeny ? ' + položky s cenou na dotaz' : ''}`
      const souhrn = ulozeno && typeof d.souhrn === 'string' && d.souhrn ? d.souhrn : [
        ...radky, '',
        `Celkem: ${celkem}${rozvoz ? ' (doprava v ceně)' : ''}`,
        rozvoz ? `Dovoz až domů: ${den} dopoledne, ${adresaDovozu}` : `Osobní odběr: ${den}, ${k.adresa}, ${k.mesto}`,
        prevodem ? `Platba: převodem předem, VS ${vs}` : 'Platba: při převzetí',
        ...(SKUPINA ? [`Skupina: ${SKUPINA.nazev} (zvýhodněné ceny)`] : []),
        ...(f.poznamka.trim() ? [`Poznámka: ${f.poznamka.trim()}`] : []),
      ].join('\n')

      // Fallback through the external form service: required when the hosting did not store the order,
      // best-effort when it stored it but could not e-mail the farm.
      if (!ulozeno || !d.farma) {
        const res = await fetch(`https://formsubmit.co/ajax/${k.emailObjednavky}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            // The subject starts with the day so the day's orders sort together in the inbox.
            _subject: `${rozvoz ? 'ROZVOZ' : 'ODBĚR'} ${den} | ${cislo} | ${celeJmeno} | ${celkem}${SKUPINA ? ` | skupina ${SKUPINA.nazev}` : ''}`,
            _template: 'box',
            _replyto: f.email.trim(),
            objednavka: cislo + (ulozeno ? '' : ' (NENÍ v přehledu objednávek – zapsat ručně)'),
            termin: `${rozvoz ? 'Rozvoz' : 'Osobní odběr'} – ${den}`,
            jmeno: ico ? `${celeJmeno} (IČO ${ico})` : celeJmeno,
            telefon: f.telefon.trim(),
            email: f.email.trim(),
            adresa: rozvoz ? `${adresaDovozu}${PEVNA_ADRESA ? ' (pevná adresa skupiny)' : adr?.vybrana ? ' (ověřeno v registru adres)' : ' – NEOVĚŘENO, zkontrolovat'}` : '— (osobní odběr)',
            polozky: radky.join('\n'),
            celkem,
            platba: prevodem ? `PŘEVODEM PŘEDEM – VS ${vs} – zkontrolovat příchod platby` : 'při převzetí',
            poznamka: f.poznamka.trim() || '—',
          }),
        }).catch(() => null)
        if (!ulozeno && !res?.ok) throw new Error()
      }
      if (uzivatel) {
        // Kopie do účtu a údaje na příště – jen doplněk, na potvrzení objednávky se nečeká.
        Promise.allSettled([
          ulozitDoUctu({
            cislo, datum: new Date().toISOString(), termin: `${rozvoz ? 'Dovoz' : 'Odběr'} ${den}`, celkem,
            radky, polozky: kosik.polozky.map(p => ({ key: p.key, pocet: p.pocet })),
          }),
          // Delivery details are kept with the account for next time (company orders are one-off).
          f.firma ? null : auth.ulozitProfil({ jmeno: f.jmeno.trim(), prijmeni: f.prijmeni.trim(), telefon: f.telefon.trim(), ...(PEVNA_ADRESA || !rozvoz ? {} : { adresa: f.adresa.trim(), psc: f.psc.trim(), mesto: f.mesto.trim(), zeme: f.zeme }) }),
        ])
      }
      kosik.vyprazdnit()
      // potvrzeni: false = potvrzovací e-mail zákazníkovi nepůjde (záloha přes FormSubmit, limit e-mailů).
      // zmenaCeny: server účtoval jinak než košík ('skupina' neověřená, 'cenik' se mezitím změnil).
      onHotovo({ cislo, souhrn, email: f.email.trim(), prevodem, castka, potvrzeni: ulozeno && d.potvrzeni !== false,
        zmenaCeny: ulozeno && (d.zmena_ceny === 'skupina' || d.zmena_ceny === 'cenik') ? d.zmena_ceny : null })
    } catch {
      setStav('chyba')
    }
  }

  // text-base na mobilu: menší písmo v poli iPhone při psaní přiblíží
  const field = 'border border-line rounded-md px-4 py-3 text-base sm:text-sm w-full focus:outline-none focus:ring-2 focus:ring-leaf/20 focus:border-transparent aria-[invalid=true]:border-berry bg-white'
  const popisek = 'text-sm font-medium text-ink-soft mb-1 block'
  // Propojení pole s jeho chybovou hláškou (a případně s dalším popisem pod polem).
  const chybaPole = (k, text = chyby[k], popis) => ({
    'aria-invalid': text ? true : undefined,
    'aria-describedby': [text ? `${k}-chyba` : null, popis].filter(Boolean).join(' ') || undefined,
  })
  // Vybraný den mezitím propadl (uzávěrka) – ukáže se hned, ne až po odeslání.
  const chybaTerminu = chyby.termin || (terminyRozvozu.includes(f.termin) ? null : CHYBA_TERMINU)
  const chybaTerminuOdberu = chyby.terminOdberu || (terminyOdberu.includes(f.terminOdberu) ? null : CHYBA_TERMINU)
  const pocetChyb = Object.values(chyby).filter(Boolean).length
  const pracuje = stav === 'overuji' || stav === 'odesilam'
  const odkaz = 'text-leaf underline underline-offset-2'
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <button onClick={onZpet} className="text-leaf text-sm font-medium hover:underline mb-6 cursor-pointer">← Zpět do obchodu</button>
      <h1 tabIndex={-1} className="font-serif text-3xl sm:text-4xl font-semibold text-ink mb-2 focus:outline-none">Dokončení objednávky</h1>
      <p className="text-sm text-ink-soft mb-8">Údaje označené hvězdičkou (*) je potřeba vyplnit.</p>
      {auth.zapnuto && !uzivatel && !auth.nacita && (
        <p className="text-sm bg-paper-2 text-ink rounded-md px-4 py-3 mb-6 -mt-4">
          Máte účet? <a href="#ucet" onClick={() => poPrihlaseniZpet('#pokladna')} className="font-semibold underline">Přihlaste se</a> a údaje se vyplní samy. Košík vám zůstane.
        </p>
      )}

      <form ref={formRef} onSubmit={odeslat} noValidate className="grid lg:grid-cols-[1fr_22rem] gap-8 items-start">
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 space-y-4">
            <h2 className="font-semibold text-lg text-ink">Kontaktní údaje</h2>
            {f.firma ? (
              <div className="grid sm:grid-cols-[1fr_11rem] gap-4">
                <div>
                  <label htmlFor="nazevFirmy" className={popisek}>Název firmy *</label>
                  <input id="nazevFirmy" autoComplete="organization" aria-required="true" value={f.nazevFirmy} onChange={e => set('nazevFirmy', e.target.value)} className={field} {...chybaPole('nazevFirmy')} />
                  <Chyba id="nazevFirmy-chyba" text={chyby.nazevFirmy} />
                </div>
                <div>
                  <label htmlFor="ico" className={popisek}>IČO (nepovinné)</label>
                  <input id="ico" inputMode="numeric" autoComplete="off" value={f.ico} onChange={e => set('ico', e.target.value)} className={field} {...chybaPole('ico')} />
                  <Chyba id="ico-chyba" text={chyby.ico} />
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="jmeno" className={popisek}>Jméno *</label>
                  <input id="jmeno" autoComplete="given-name" aria-required="true" value={f.jmeno} onChange={e => set('jmeno', e.target.value)} className={field} {...chybaPole('jmeno')} />
                  <Chyba id="jmeno-chyba" text={chyby.jmeno} />
                </div>
                <div>
                  <label htmlFor="prijmeni" className={popisek}>Příjmení *</label>
                  <input id="prijmeni" autoComplete="family-name" aria-required="true" value={f.prijmeni} onChange={e => set('prijmeni', e.target.value)} className={field} {...chybaPole('prijmeni')} />
                  <Chyba id="prijmeni-chyba" text={chyby.prijmeni} />
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer py-1">
              <input type="checkbox" checked={f.firma} onChange={e => set('firma', e.target.checked)} className="w-4 h-4 accent-leaf" />
              Objednávám na firmu
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className={popisek}>{uzivatel ? 'E-mail vašeho účtu (přijde na něj potvrzení)' : 'E-mail * (přijde na něj potvrzení)'}</label>
                <input id="email" type="email" autoComplete="email" aria-required="true" value={f.email} onChange={e => set('email', e.target.value)}
                  readOnly={!!uzivatel?.email} className={uzivatel?.email ? field.replace('bg-white', 'bg-paper text-ink-soft cursor-default') : field}
                  {...chybaPole('email', chyby.email, uzivatel?.email ? 'email-popis' : null)} />
                {uzivatel?.email && <p id="email-popis" className="text-sm text-ink-soft mt-1">Objednávka se uloží k vašemu účtu. Pro jiný e-mail se odhlaste.</p>}
                <Chyba id="email-chyba" text={chyby.email} />
              </div>
              <div>
                <label htmlFor="telefon" className={popisek}>Telefon *</label>
                <input id="telefon" type="tel" autoComplete="tel" aria-required="true" value={f.telefon} onChange={e => set('telefon', e.target.value)} placeholder="+420 …" className={field} {...chybaPole('telefon')} />
                <Chyba id="telefon-chyba" text={chyby.telefon} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 space-y-3">
            <h2 className="font-semibold text-lg text-ink">Převzetí</h2>
            {PEVNA_ADRESA ? (
              <div className="rounded-md bg-paper-2 px-4 py-3 text-sm text-ink">
                <p className="font-medium">Dovoz pro skupinu {SKUPINA.nazev}</p>
                <p className="mt-0.5">{PEVNA_ADRESA}</p>
                {SKUPINA.popis && <p className="text-ink-soft text-sm mt-1">{SKUPINA.popis}</p>}
              </div>
            ) : <>
              <Volba name="doruceni" current={f.doruceni} onChange={set} value="rozvoz" label={DORUCENI.rozvoz.label} detail={DORUCENI.rozvoz.detail} />
              <Volba name="doruceni" current={f.doruceni} onChange={set} value="odber" label={DORUCENI.odber.label} detail={DORUCENI.odber.detail} />
            </>}
            {f.doruceni === 'odber' ? (
              <div className="pt-2">
                <label htmlFor="terminOdberu" className={popisek}>Den vyzvednutí</label>
                <select id="terminOdberu" value={f.terminOdberu} onChange={e => set('terminOdberu', e.target.value)} className={field} {...chybaPole('terminOdberu', chybaTerminuOdberu)}>
                  {!terminyOdberu.includes(f.terminOdberu) && <option value={f.terminOdberu} disabled>{f.terminOdberu || 'vyberte den'} – už nelze</option>}
                  {terminyOdberu.map(t => <option key={t}>{t}</option>)}
                </select>
                <Chyba id="terminOdberu-chyba" text={chybaTerminuOdberu} />
              </div>
            ) : (
              <div className="pt-2 space-y-3">
                <div>
                  <label htmlFor="termin" className={popisek}>Den dovozu (dopoledne)</label>
                  <select id="termin" value={f.termin} onChange={e => set('termin', e.target.value)} className={field} {...chybaPole('termin', chybaTerminu)}>
                    {!terminyRozvozu.includes(f.termin) && <option value={f.termin} disabled>{f.termin || 'vyberte den'} – už nelze</option>}
                    {terminyRozvozu.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <Chyba id="termin-chyba" text={chybaTerminu} />
                </div>
                {!PEVNA_ADRESA && <>
                  <div>
                    <label htmlFor="zeme" className={popisek}>Země</label>
                    <select id="zeme" autoComplete="country" value={f.zeme} className={field}
                      onChange={e => { const z = e.target.value; setF(p => ({ ...p, zeme: z, psc: '', mesto: z === 'AT' && p.mesto === VYCHOZI_MESTO ? '' : z === 'CZ' && !p.mesto ? VYCHOZI_MESTO : p.mesto })); setChyby(c => ({ ...c, psc: undefined, adresa: undefined })) }}>
                      <option value="CZ">Česko</option>
                      <option value="AT">Rakousko (po domluvě)</option>
                    </select>
                  </div>
                  {/* Obec napřed: podle ní se hledají návrhy ulic i ověřuje adresa. */}
                  <div className="grid grid-cols-[1fr_6.5rem] gap-4">
                    <div>
                      <label htmlFor="mesto" className={popisek}>Město / obec *</label>
                      <input id="mesto" autoComplete="address-level2" aria-required="true" value={f.mesto} onChange={e => set('mesto', e.target.value)} onBlur={zkontrolovatAdresu} className={field} {...chybaPole('mesto')} />
                      <Chyba id="mesto-chyba" text={chyby.mesto} />
                    </div>
                    <div>
                      <label htmlFor="psc" className={popisek}>PSČ</label>
                      <input id="psc" inputMode="numeric" autoComplete="postal-code" value={f.psc} onChange={e => set('psc', e.target.value)} onBlur={f.zeme === 'AT' ? zkontrolovatAdresu : undefined} className={field} {...chybaPole('psc')} />
                      <Chyba id="psc-chyba" text={chyby.psc} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="adresa" className={popisek}>Ulice a číslo domu *</label>
                    <AdresaInput id="adresa" value={f.adresa} mesto={f.mesto} zeme={f.zeme} onChange={v => set('adresa', v)} onVyber={vybratNavrh}
                      onBlur={zkontrolovatAdresu} placeholder={f.zeme === 'AT' ? 'např. Hauptstraße 12' : 'Začněte psát, např. Lannova 12'} className={field}
                      aria-required="true" {...chybaPole('adresa', chyby.adresa, 'adresa-obec adresa-overeni')} />
                    <p id="adresa-obec" className="text-sm text-ink-soft mt-1">{f.zeme === 'AT'
                      ? 'Rakouskou adresu ověříme, až vyplníte ulici s číslem, PSČ a obec. Do Rakouska dovážíme po domluvě.'
                      : <>Adresy hledáme v obci {f.mesto.trim() || '…'} (změníte ji v poli Město / obec).</>}</p>
                    <div id="adresa-overeni" aria-live="polite">
                      <OvereniAdresy overeni={overeni} aktualni={klicAdresy}
                        vybrat={k => { setOvereni(o => ({ ...o, vybrana: k })); setF(p => ({ ...p, psc: k.psc || p.psc })); setChyby(c => ({ ...c, adresa: undefined })) }} />
                    </div>
                    <Chyba id="adresa-chyba" text={chyby.adresa} />
                  </div>
                </>}
              </div>
            )}
            <p className="text-sm text-ink-soft">Objednávky přijímáme nejpozději den předem do {UZAVERKA_HODINA}:00.</p>
          </div>

          <div className="bg-white rounded-lg p-6 space-y-3">
            <h2 className="font-semibold text-lg text-ink">Platba</h2>
            <Volba name="platba" current={f.platba} onChange={set} value="prevzeti" label="Při převzetí" detail="hotově řidiči nebo při vyzvednutí" />
            <Volba name="platba" current={f.platba} onChange={set} value="prevod" label="Převodem předem" detail="QR kód k platbě uvidíte hned po odeslání objednávky" />
          </div>

          <div className="bg-white rounded-lg p-6">
            <label htmlFor="poznamka" className={popisek}>Poznámka k objednávce</label>
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
                {p.nedostupne ? (
                  <span>
                    <span className="text-ink-soft line-through">{nazevPolozky(p.produkt, p.varianta)}</span>
                    <span className="block text-berry font-medium">Momentálně nedostupné</span>
                  </span>
                ) : (
                  <span className="text-ink-soft">{formatMnozstvi(p.produkt, p.varianta, p.pocet)} {nazevPolozky(p.produkt, p.varianta)}{p.varianta.slozeni && <span className="block text-sm text-ink-soft/80">{p.varianta.slozeni}</span>}</span>
                )}
                <span className="tabular-nums font-medium whitespace-nowrap">{p.nedostupne ? '—' : p.cena == null ? 'na dotaz' : formatKc(p.cena)}</span>
              </li>
            ))}
          </ul>
          {kosik.nedostupne > 0 && (
            <div className="rounded-md bg-berry/10 px-4 py-3 text-sm text-berry mb-4">
              <p>Něco z košíku teď nemáme (vyprodáno nebo mimo sezónu). Objednat půjde, až to odeberete.</p>
              <button type="button" onClick={kosik.odebratNedostupne} className="mt-1 py-1 font-semibold underline cursor-pointer">Odebrat nedostupné</button>
            </div>
          )}
          <div className="flex justify-between items-baseline border-t border-line pt-3 mb-1">
            <span className="font-semibold">Celkem</span>
            <span className="font-semibold text-xl text-ink tabular-nums">{formatKc(kosik.soucet)}</span>
          </div>
          <p className="text-sm text-ink-soft mb-5">
            {f.doruceni === 'rozvoz' ? 'Doprava až domů je v ceně. ' : ''}{f.platba === 'prevod' ? 'Platíte převodem předem.' : 'Platíte až při převzetí.'}
          </p>

          <p className="text-sm text-ink-soft">
            Odesláním objednávky souhlasíte s{' '}
            <a href={`${import.meta.env.BASE_URL}obchodni-podminky.html`} target="_blank" rel="noreferrer" className={odkaz}>obchodními podmínkami</a>.
            Osobní údaje zpracujeme jen k vyřízení objednávky, podle{' '}
            <a href={`${import.meta.env.BASE_URL}gdpr.html`} target="_blank" rel="noreferrer" className={odkaz}>zásad ochrany osobních údajů</a>.
          </p>

          <div role="alert" className="text-berry text-sm">
            {pocetChyb > 0 && (
              <p className="mt-3">Objednávku jsme zatím neodeslali – {pocetChyb === 1 ? 'jeden údaj je' : pocetChyb <= 4 ? `${pocetChyb} údaje jsou` : `${pocetChyb} údajů je`} potřeba doplnit nebo opravit (červená poznámka u pole).</p>
            )}
            {stav === 'chyba' && (
              <p className="mt-3">Objednávku se nepodařilo odeslat. Zkuste to prosím znovu, nebo zavolejte {OBSAH.kontakt.tel1}.</p>
            )}
            {stav === 'zmena' && (
              <p className="mt-3">
                Nabídka v e-shopu se mezitím změnila, objednávku jsme proto neodeslali.{' '}
                <button type="button" onClick={() => location.reload()} className="font-semibold underline cursor-pointer">Obnovte prosím stránku</button>{' '}
                (košík vám zůstane) a zkontrolujte ho. Kdyby to nešlo, zavolejte {OBSAH.kontakt.tel1}.
              </p>
            )}
          </div>
          <button type="submit" disabled={pracuje || kosik.polozky.length === 0 || kosik.nedostupne > 0}
            className="w-full mt-4 bg-leaf hover:bg-leaf-dark text-white font-semibold py-3 px-4 rounded-md transition-colors disabled:opacity-60 disabled:cursor-default cursor-pointer">
            {stav === 'overuji' ? 'Ověřuji adresu…' : stav === 'odesilam' ? 'Odesílám…' : (
              <>
                <span className="block">Objednat s povinností platby</span>
                <span className="block text-sm font-normal text-white/90 tabular-nums">
                  {formatKc(kosik.soucet)}{kosik.bezCeny ? ' + položky na dotaz' : ''} · {f.platba === 'prevod' ? 'převodem předem' : 'zaplatíte při převzetí'}
                </span>
              </>
            )}
          </button>
          <p className="text-sm text-ink-soft mt-3 text-center">Potvrzení vám hned přijde e-mailem. Ozveme se jen tehdy, kdyby něco nebylo k dispozici.</p>
        </aside>
      </form>
    </div>
  )
}
