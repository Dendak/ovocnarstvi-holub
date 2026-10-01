import { SKUPINA, cekajiciKod } from './skupina'
import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PRODUKTY, KATEGORIE, DORUCENI, formatKc, nazevPolozky, jeProSkupinu, variantaBedynky, sklonovat, bezDiakritiky } from './katalog'
import { KosikProvider, useKosik } from './kosik'
import ProduktKarta from './ProduktKarta'
import BedynkaKarta from './BedynkaKarta'
import Footer from '../components/Footer'
import { AuthProvider, useAuth, zrusitCilPoPrihlaseni } from './auth'
import { nacistZUctu, nacistStav, STAVY } from './objednavkyDb'
import Ucet from './Ucet'
import PlatbaPrevodem from './PlatbaPrevodem'
import { odkazNaPlatbu } from './platba'
import { OBSAH } from '../data'

const BASE = import.meta.env.BASE_URL

// Pokladna (a s ní generátor QR kódu) se stahuje až cestou k objednávce.
const nacistPokladnu = () => import('./Pokladna')
const Pokladna = lazy(() => nacistPokladnu().catch(obnovitPoNasazeni))

// Po nasazení nové verze už staré části stránky na serveru nejsou – stránka se jednou načte znovu
// (košík zůstává v prohlížeči).
function obnovitPoNasazeni(e) {
  try {
    if (Date.now() - Number(sessionStorage.getItem('oh_obnova') || 0) > 30000) {
      sessionStorage.setItem('oh_obnova', String(Date.now()))
      location.reload()
      return new Promise(() => {})
    }
  } catch { /* no storage */ }
  throw e
}

class ChybaNacteni extends Component {
  state = { chyba: false }
  static getDerivedStateFromError() { return { chyba: true } }
  render() {
    if (!this.state.chyba) return this.props.children
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <h1 tabIndex={-1} className="font-serif text-3xl font-semibold text-ink mb-3 focus:outline-none">Stránku se nepodařilo načíst</h1>
        <p className="text-ink-soft mb-6">Zkontrolujte prosím připojení k internetu. Košík vám zůstal.</p>
        <button onClick={() => location.reload()} className="btn">Zkusit znovu</button>
      </div>
    )
  }
}

const Nacitani = () => <div className="py-24 text-center text-ink-soft">Načítám…</div>

const VIEWS = { '#pokladna': 'pokladna', '#hotovo': 'hotovo', '#objednavky': 'objednavky', '#ucet': 'ucet', '#nove-heslo': 'ucet' }
const cist = () => VIEWS[location.hash] || 'katalog'

function useHashView() {
  const [view, setView] = useState(cist)
  useEffect(() => {
    const onHash = () => {
      const v = cist()
      // Návrat k objednávce po přihlášení platí, jen dokud je zákazník v účtu.
      if (v !== 'ucet') zrusitCilPoPrihlaseni()
      setView(v)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const go = useCallback(v => { location.hash = v === 'katalog' ? '' : v }, [])
  // Bez nového záznamu v historii (Zpět pak nevede do už odeslané pokladny).
  const nahradit = useCallback(hash => {
    history.replaceState(null, '', location.pathname + location.search + hash)
    setView(cist())
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  return [view, go, nahradit]
}

// Po přepnutí stránky dostane fokus její nadpis, aby čtečka obrazovky ohlásila, kde zákazník je.
// Pokladna se může ještě načítat – na nadpis se chvíli počká.
function zaostritNadpis(pokusy = 40) {
  requestAnimationFrame(() => {
    const h = document.querySelector('main h1')
    if (h) h.focus({ preventScroll: true })
    else if (pokusy > 0) setTimeout(() => zaostritNadpis(pokusy - 1), 50)
  })
}

function KosikIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>
  )
}

const popisKosiku = n => `Košík, ${n ? sklonovat(n, 'položka', 'položky', 'položek') : 'prázdný'}`

// Přihlášený zákazník vidí v záhlaví své jméno (na telefonu křestní, zkrácené), ať je jasné, kdo je přihlášený.
// Místo na telefonu šetří košík jen s ikonou a počtem; „Moje objednávky“ jsou na telefonu v účtu a po objednání.
function Hlavicka({ onKosik, kosikRef, inert }) {
  const { pocetPolozek } = useKosik()
  const auth = useAuth()
  const jmeno = auth.uzivatel ? jmenoUzivatele(auth.uzivatel) : null
  const krestni = jmeno ? jmeno.split(/\s+/)[0] : null
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-forest" aria-label="E-shop" inert={inert}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <a href={`${BASE}index.html`} className="flex items-center gap-3 shrink-0">
          <img src={`${BASE}img/logo.png`} alt="Ovocnářství Holub" className="h-12 w-auto" width="88" height="48" />
          <span className="hidden sm:block text-white/90 font-serif text-lg">E-shop</span>
        </a>
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <a href={`${BASE}index.html`} className="hidden md:block text-white/80 hover:text-white text-sm font-medium">← Hlavní stránka</a>
          <a href="#objednavky" className="hidden sm:inline text-white/80 hover:text-white text-sm font-medium">Moje objednávky</a>
          {auth.zapnuto && (
            <a href="#ucet" className="text-white/80 hover:text-white text-sm font-medium flex items-center justify-center gap-1.5 min-h-10 min-w-10 sm:min-w-0"
              aria-label={jmeno ? `${jmeno} – můj účet` : 'Přihlásit se'}>
              {/* plná ikona = přihlášený zákazník */}
              <svg className="w-6 h-6 shrink-0" aria-hidden="true" fill={jmeno ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
              {krestni && <span className="sm:hidden min-w-0 max-w-[5.5rem] truncate">{krestni}</span>}
              <span className="hidden sm:inline max-w-[16rem] truncate">{jmeno || 'Přihlásit'}</span>
            </a>
          )}
          <button ref={kosikRef} onClick={onKosik} className="relative shrink-0 btn-light !py-2 !px-3 sm:!px-4 !text-sm" aria-label={popisKosiku(pocetPolozek)}>
            <KosikIcon />
            <span className="max-sm:sr-only">Košík</span>
            {pocetPolozek > 0 && (
              <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 bg-berry text-white text-xs font-semibold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{pocetPolozek}</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}

// Košík jako modální okno: fokus jde dovnitř, Tab zůstává v okně, Escape zavírá
// a fokus se vrátí tam, odkud se košík otevřel.
function KosikPanel({ open, onClose, onPokladna, kosikRef }) {
  const kosik = useKosik()
  const panel = useRef(null)
  const zavritRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const vratitFokus = useRef(true)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!open) return
    nacistPokladnu().catch(() => {})
    const spoustec = document.activeElement
    vratitFokus.current = true
    zavritRef.current?.focus({ preventScroll: true })
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); return }
      if (e.key !== 'Tab' || !panel.current) return
      const prvky = [...panel.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea')]
      if (!prvky.length) return
      const prvni = prvky[0], posledni = prvky[prvky.length - 1]
      if (!panel.current.contains(document.activeElement)) { e.preventDefault(); prvni.focus() }
      else if (e.shiftKey && document.activeElement === prvni) { e.preventDefault(); posledni.focus() }
      else if (!e.shiftKey && document.activeElement === posledni) { e.preventDefault(); prvni.focus() }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const tlacitkoKosiku = kosikRef.current
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (!vratitFokus.current) return
      const cil = spoustec && spoustec !== document.body && spoustec.isConnected ? spoustec : tlacitkoKosiku
      cil?.focus({ preventScroll: true })
    }
  }, [open, kosikRef])

  const kPokladne = () => { vratitFokus.current = false; onPokladna() }

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} inert={!open}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside ref={panel} role="dialog" aria-modal="true" aria-labelledby="kosik-nadpis"
        className={`absolute right-0 top-0 bottom-0 w-full sm:w-[26rem] bg-white shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between pl-5 pr-2 h-16 border-b border-line">
          <h2 id="kosik-nadpis" className="font-serif text-xl font-semibold text-ink">Košík</h2>
          <button ref={zavritRef} onClick={onClose} aria-label="Zavřít košík" className="w-11 h-11 text-muted hover:text-ink text-3xl leading-none cursor-pointer">&times;</button>
        </div>

        {kosik.polozky.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 text-ink-soft">
            <KosikIcon className="w-12 h-12 text-line mb-3" />
            <p>Košík je zatím prázdný.</p>
            <button onClick={onClose} className="mt-4 text-leaf font-medium hover:underline cursor-pointer">Vybrat ovoce →</button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y divide-line px-5">
              {kosik.polozky.map(p => {
                const nazev = nazevPolozky(p.produkt, p.varianta)
                return (
                  <li key={p.key} className="py-4 flex gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${p.nedostupne ? 'text-ink-soft line-through' : 'text-ink'}`}>{nazev}</p>
                      {p.nedostupne
                        ? <p className="text-sm font-medium text-berry">Momentálně nedostupné – odeberte prosím</p>
                        : <p className="text-sm text-muted">{p.varianta.slozeni || p.produkt.druhNazev}{p.produkt.jednotka === 'kg' ? '' : ` · ${p.varianta.label}`}{p.varianta.cena != null && ` · ${formatKc(p.varianta.cena)} ${p.produkt.jednotka === 'kg' ? 'za kg' : 'za kus'}`}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        {!p.nedostupne && (
                          <div className="flex items-center border border-line rounded-lg">
                            <button onClick={() => kosik.nastavit(p.key, p.pocet - 1)} aria-label={`Méně – ${nazev}`} className="w-10 h-10 text-lg text-ink-soft cursor-pointer">−</button>
                            <span aria-live="polite" aria-atomic="true" className="min-w-8 px-1 text-center text-sm tabular-nums">{p.pocet}{p.produkt.jednotka === 'kg' ? ' kg' : ''}</span>
                            <button onClick={() => kosik.nastavit(p.key, p.pocet + 1)} aria-label={`Více – ${nazev}`} className="w-10 h-10 text-lg text-ink-soft cursor-pointer">+</button>
                          </div>
                        )}
                        <button onClick={() => kosik.nastavit(p.key, 0)} aria-label={`Odebrat – ${nazev}`} className="text-sm text-ink-soft underline decoration-line underline-offset-4 hover:text-berry px-2 py-2 cursor-pointer">Odebrat</button>
                      </div>
                    </div>
                    <p className="font-semibold tabular-nums text-ink whitespace-nowrap">{p.nedostupne ? '—' : p.cena == null ? 'na dotaz' : formatKc(p.cena)}</p>
                  </li>
                )
              })}
            </ul>
            <div className="border-t border-line p-5 space-y-3">
              {kosik.nedostupne > 0 && (
                <div className="rounded-md bg-berry/10 px-4 py-3 text-sm text-berry">
                  <p>Něco z košíku teď nemáme (vyprodáno nebo mimo sezónu). Objednat půjde, až to odeberete.</p>
                  <button onClick={kosik.odebratNedostupne} className="mt-1 font-semibold underline cursor-pointer">Odebrat nedostupné</button>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-ink-soft">Celkem</span>
                <span className="font-semibold text-2xl text-ink tabular-nums">{formatKc(kosik.soucet)}</span>
              </div>
              <button onClick={kPokladne} className="w-full bg-leaf hover:bg-leaf-dark text-white font-semibold py-3.5 rounded-md transition-colors cursor-pointer">
                Pokračovat k objednávce →
              </button>
              <p className="text-sm text-ink-soft text-center">Platíte až při převzetí, nebo předem převodem. Dovoz je v ceně.</p>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

// Krátká bublina po přidání do košíku (hlavně na telefonu, kde košík není vidět).
function Oznameni({ onKosik, skryt }) {
  const { oznameni, zavritOznameni } = useKosik()
  const zavrit = useRef(zavritOznameni)
  useEffect(() => { zavrit.current = zavritOznameni })
  useEffect(() => {
    if (!oznameni) return
    const t = setTimeout(() => zavrit.current(), 6000)
    return () => clearTimeout(t)
  }, [oznameni])
  if (!oznameni || skryt) return null
  return (
    <div className="fixed z-30 bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 bg-forest text-white rounded-lg shadow-xl pl-4 pr-3 py-3 flex items-center gap-3">
      <p className="flex-1 min-w-0 text-sm leading-snug">
        <span className="font-semibold">✓ Přidáno do košíku</span>
        <span className="block text-white/80 truncate">{oznameni.text}</span>
      </p>
      <button onClick={onKosik} className="btn-light !py-2 !px-3 !text-sm shrink-0">Zobrazit košík</button>
    </div>
  )
}

function Katalog() {
  const [kategorie, setKategorie] = useState('vse')
  const [jenDostupne, setJenDostupne] = useState(true)
  const [hledat, setHledat] = useState('')
  const dotaz = hledat.trim()

  const produkty = useMemo(() => {
    // Bez diakritiky a stačí začátek slova (4 písmena): „hrusky“, „jablko“, „svestka“, „most“.
    const slova = bezDiakritiky(dotaz).split(/\s+/).filter(Boolean).map(w => w.slice(0, 4))
    const text = p => bezDiakritiky(`${p.nazev} ${p.druhNazev} ${p.chut || ''} ${p.hodiSe.join(' ')} ${(p.prichute || []).map(x => x.nazev).join(' ')}`)
    return PRODUKTY
      .filter(p => kategorie === 'vse' || (kategorie === 'skupina' ? jeProSkupinu(p) : p.druh === kategorie))
      .filter(p => !jenDostupne || p.dostupne)
      .filter(p => !slova.length || (t => slova.every(w => t.includes(w)))(text(p)))
      .sort((a, b) => Number(b.dostupne) - Number(a.dostupne))
  }, [kategorie, jenDostupne, dotaz])

  const pocty = useMemo(() => Object.fromEntries(KATEGORIE.map(k => [k.id, PRODUKTY.filter(p => (k.skupina ? jeProSkupinu(p) : p.druh === k.id) && p.dostupne).length])), [])

  return (
    <>
      {!SKUPINA && cekajiciKod() && (
        <div className="bg-leaf text-white text-sm">
          <p className="container-page py-2.5">
            Máte pozvánku do skupiny se zvýhodněnými cenami.{' '}
            <a href="#ucet" className="underline font-semibold">Založte si účet nebo se přihlaste</a> – ceny se pak zapnou samy.
          </p>
        </div>
      )}
      {SKUPINA && (
        <div className="bg-leaf text-white text-sm">
          <p className="container-page py-2.5">
            Skupina <strong>{SKUPINA.nazev}</strong>: vidíte zvýhodněné ceny{SKUPINA.adresa ? <>, dovážíme na <strong>{SKUPINA.adresa}</strong></> : null}.{' '}
            {KATEGORIE.some(k => k.skupina) && (
              <button onClick={() => { setKategorie('skupina'); document.getElementById('nabidka')?.scrollIntoView({ behavior: 'smooth' }) }} className="underline font-semibold cursor-pointer">Zobrazit jen nabídku pro skupinu</button>
            )}
          </p>
        </div>
      )}
      <header className="bg-forest text-white">
        <div className="container-page pt-14 pb-10 sm:pt-16">
          <p className="text-[0.95rem] font-medium text-white/70 mb-3">E-shop Ovocnářství Holub</p>
          <h1 tabIndex={-1} className="font-serif font-medium leading-[1.08] mb-4 focus:outline-none" style={{ fontSize: 'clamp(2.3rem, 5vw, 3.6rem)' }}>
            Objednejte si ovoce a mošty
          </h1>
          <p className="text-white/75 text-lg leading-relaxed max-w-2xl">
            Naklikejte si, kolik kilo chcete. Ceny jsou včetně dovozu až domů, potvrzení vám hned přijde
            e-mailem a platíte až při převzetí.
          </p>
        </div>
        <div className="border-t border-white/15">
          <ul className="container-page py-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/70">
            {['Dovoz v ceně – Č. Budějovice, po · st · pá', `${DORUCENI.odber.label} v Krtelích`, 'Libovolné množství od 1 kg', 'Platba při převzetí'].map(t => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </header>

      <section id="nabidka" className="container-page py-10 sm:py-12 scroll-mt-16" aria-label="Nabídka">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
          <div className="flex flex-wrap gap-2 flex-1" role="group" aria-label="Druh">
            {[{ id: 'vse', nazev: 'Vše' }, ...KATEGORIE].map(k => (
              <button key={k.id} onClick={() => setKategorie(k.id)} aria-pressed={kategorie === k.id}
                className={`text-sm px-3.5 py-2 rounded-md border transition cursor-pointer ${
                  kategorie === k.id ? 'bg-leaf border-leaf text-white' : k.skupina ? 'bg-leaf/10 border-leaf text-leaf font-semibold hover:bg-leaf/20' : 'bg-white border-line text-ink-soft hover:border-leaf'
                }`}>
                {k.nazev}
                {k.id !== 'vse' && <span className={`ml-1.5 text-xs ${kategorie === k.id ? 'text-white/70' : 'text-muted'}`}>{pocty[k.id]}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <input type="search" value={hledat} onChange={e => setHledat(e.target.value)} placeholder="Hledat odrůdu…"
              aria-label="Hledat odrůdu"
              className="field !py-2 lg:!w-56" />
            <label className="flex items-center gap-2 text-sm text-ink-soft whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={jenDostupne} onChange={e => setJenDostupne(e.target.checked)} className="accent-leaf w-4 h-4" />
              Jen dostupné
            </label>
          </div>
        </div>

        <p role="status" className="sr-only">{`Zobrazeno ${sklonovat(produkty.length, 'produkt', 'produkty', 'produktů')}`}</p>
        {produkty.length === 0 ? (
          <div className="text-center py-16 text-ink-soft">
            <p className="mb-3">
              {dotaz
                ? <>Pro „{dotaz}“ jsme {jenDostupne ? 'mezi dostupným zbožím ' : ''}nic nenašli.</>
                : `Tady teď nic není${jenDostupne ? ' – mimo sezónu nebo vyprodáno' : ''}.`}
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {dotaz && <button onClick={() => setHledat('')} className="text-leaf font-medium hover:underline cursor-pointer">Zrušit hledání</button>}
              {dotaz && kategorie !== 'vse' && <button onClick={() => setKategorie('vse')} className="text-leaf font-medium hover:underline cursor-pointer">Hledat ve všem</button>}
              {jenDostupne && <button onClick={() => setJenDostupne(false)} className="text-leaf font-medium hover:underline cursor-pointer">Zobrazit i nedostupné</button>}
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {produkty.map(p => (p.bedynka ? <BedynkaKarta key={p.id} produkt={p} /> : <ProduktKarta key={p.id} produkt={p} />))}
          </div>
        )}
      </section>
    </>
  )
}

// Potvrzení objednávky přežije obnovení stránky (telefon ji často obnoví po návratu z bankovní
// aplikace). Jen v této záložce prohlížeče – po jejím zavření zmizí.
const KLIC_HOTOVO = 'oh_hotovo'
function nacistHotovo() {
  try { return JSON.parse(sessionStorage.getItem(KLIC_HOTOVO)) } catch { return null }
}

function Hotovo({ info, onZpet }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <h1 tabIndex={-1} className="font-serif text-3xl sm:text-4xl font-semibold text-ink mb-3 focus:outline-none">Objednávka je přijatá</h1>
      {info.cislo && <p className="text-ink-soft mb-2">Číslo objednávky: <strong>{info.cislo}</strong></p>}
      <p className="text-ink-soft mb-6">
        {!info.email ? null : info.potvrzeni === false
          ? <>Objednávka k nám dorazila, potvrzení e-mailem vám ale tentokrát nepřijde – číslo objednávky si prosím poznamenejte. </>
          : <>Potvrzení jsme poslali na <strong>{info.email}</strong>. </>}
        {info.dovoz === 'mimo'
          ? 'Mimo České Budějovice dovážíme po domluvě – termín dovozu vám ještě potvrdíme telefonem.'
          : info.dovoz === 'neovereno'
            ? 'Adresu se nepodařilo ověřit v registru adres – kdyby s ní byl problém, zavoláme vám.'
            : 'Nic dalšího potvrzovat nemusíte – ozveme se jen tehdy, kdyby něco nebylo k dispozici.'}
      </p>
      {info.zmenaCeny && (
        <p className="text-sm text-ink bg-paper-2 rounded-md px-4 py-3 mb-6 text-left">
          {info.zmenaCeny === 'skupina'
            ? 'Zvýhodněné ceny vaší skupiny se nepodařilo ověřit (nejste přihlášení jako člen skupiny), objednávka je proto spočítaná za běžné ceny.'
            : 'Ceny v e-shopu se mezitím změnily – objednávka je spočítaná podle aktuálního ceníku.'}
          {' '}Platí částka v souhrnu níže. Kdyby to byl omyl, zavolejte nám prosím na {OBSAH.kontakt.tel1}.
        </p>
      )}
      {info.prevodem && info.castka > 0 && (
        <div className="mb-8"><PlatbaPrevodem cislo={info.cislo} castka={info.castka} /></div>
      )}
      {info.souhrn && (
        <pre className="text-left whitespace-pre-wrap font-sans text-sm text-ink-soft bg-white rounded-lg p-5 mb-8">{info.souhrn}</pre>
      )}
      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={onZpet} className="btn">Zpět do obchodu</button>
        <a href="#objednavky" className="btn-outline">Moje objednávky</a>
      </div>
    </div>
  )
}

function MojeObjednavky({ onKosik }) {
  const { pridat } = useKosik()
  const auth = useAuth()
  // Kopie objednávek u účtu (Supabase) a stav z hostingu (api/stav.php): undefined = načítá se, null = nepodařilo se.
  const [zUctu, setZUctu] = useState()
  const [zeServeru, setZeServeru] = useState()
  const [info, setInfo] = useState(null)
  const prihlasen = !!auth.uzivatel
  const token = auth.token

  // Každý zdroj se ukáže, jakmile dorazí – pomalé nebo nedostupné Supabase nezdrží stav z hostingu.
  useEffect(() => {
    if (!prihlasen) return
    let zruseno = false
    nacistZUctu().catch(() => null).then(v => { if (!zruseno) setZUctu(v) })
    token().then(nacistStav).catch(() => null).then(v => { if (!zruseno) setZeServeru(v) })
    return () => { zruseno = true }
  }, [prihlasen, token])
  // Seznam se ukáže, jakmile odpoví hosting (ten zná skutečný stav), nebo až doběhnou oba zdroje.
  const nacteno = !!zeServeru || (zUctu !== undefined && zeServeru !== undefined)
  const chybaNacteni = !nacteno || zeServeru ? null
    : zUctu ? 'Aktuální stav objednávek se teď nepodařilo zjistit. Zkuste to prosím později.'
      : 'Objednávky se nepodařilo načíst. Zkuste obnovit stránku.'

  // Objednávky uložené u účtu doplněné o stav z hostingu; na hostingu mohou být i objednávky
  // odeslané bez přihlášení (se stejným e-mailem).
  const objednavky = useMemo(() => {
    const server = new Map((zeServeru || []).map(s => [s.cislo, s]))
    const vse = (zUctu || []).map(o => ({ ...o, server: server.get(o.cislo) || null }))
    const zname = new Set(vse.map(o => o.cislo))
    for (const s of server.values()) {
      if (zname.has(s.cislo)) continue
      vse.push({
        cislo: s.cislo, datum: s.vytvoreno, termin: `${s.rozvoz ? 'Dovoz' : 'Odběr'} ${s.den}`.trim(),
        celkem: formatKc(s.celkem), radky: s.polozky,
        polozky: (s.kosik || []).map(k => ({ key: `${k.produkt}|${k.varianta}`, pocet: k.pocet })),
        server: s,
      })
    }
    return vse.sort((a, b) => (Date.parse(b.datum) || 0) - (Date.parse(a.datum) || 0))
  }, [zUctu, zeServeru])

  const znovu = o => {
    let pridano = 0, chybi = 0
    for (const { key, pocet } of o.polozky || []) {
      const [produktId, variantaId] = String(key).split('|')
      const p = PRODUKTY.find(x => x.id === produktId)
      const ok = p?.dostupne && (p.bedynka ? !!variantaBedynky(p, variantaId) : p.varianty.some(v => v.id === variantaId))
      if (ok && Number.isInteger(pocet) && pocet > 0) { pridat(produktId, variantaId, pocet, { tichy: true }); pridano++ } else chybi++
    }
    if (!pridano) { setInfo('Z této objednávky teď nic není k dispozici (mimo sezónu nebo vyprodáno).'); return }
    setInfo(chybi
      ? `Do košíku jsme přidali ${sklonovat(pridano, 'položku', 'položky', 'položek')}. ${sklonovat(chybi, 'položka', 'položky', 'položek')} z této objednávky teď ${chybi >= 2 && chybi <= 4 ? 'nejsou' : 'není'} k dispozici.`
      : null)
    onKosik()
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 tabIndex={-1} className="font-serif text-3xl sm:text-4xl font-semibold text-ink mb-2 focus:outline-none">Moje objednávky</h1>
      <p className="text-ink-soft text-sm mb-8">
        {prihlasen
          ? 'Objednávky na e-mail vašeho účtu a jejich aktuální stav.'
          : 'Přehled objednávek je součástí zákaznického účtu.'}
      </p>
      {auth.zapnuto && !prihlasen && (
        <p className="text-sm bg-paper-2 text-ink rounded-md px-4 py-3 mb-6">
          <a href="#ucet" className="font-semibold underline">Přihlaste se nebo si založte účet</a> – uvidíte tu všechny své objednávky i jejich stav. Potvrzení každé objednávky vám přijde také e-mailem.
        </p>
      )}
      {prihlasen && !nacteno && <p className="text-ink-soft py-10 text-center">Načítám…</p>}
      <div role="status">{(info || chybaNacteni) && <p className="text-sm text-ink-soft bg-paper-2 rounded-md px-4 py-3 mb-6">{info || chybaNacteni}</p>}</div>
      {!prihlasen || !nacteno ? null : objednavky.length === 0 ? (
        <div className="text-center py-16 text-ink-soft">
          <p className="mb-3">Zatím tu nejsou žádné objednávky.</p>
          <a href="#" className="text-leaf font-medium hover:underline">Vybrat ovoce →</a>
        </div>
      ) : (
        <ul className="space-y-4">
          {objednavky.map(o => {
            const s = o.server
            const stav = s && STAVY[s.stav]
            const radky = s?.polozky?.length ? s.polozky : o.radky || []
            // Nezaplacená objednávka převodem: odkaz na QR platbu se zbývající částkou.
            const zaplatit = s && s.platba === 'prevod' && s.zbyva > 0 ? s.zbyva : 0
            const platba = !s || s.stav === 'zruseno' ? null
              : zaplatit > 0 ? (s.zaplaceno > 0 ? `Zaplaceno ${formatKc(s.zaplaceno)}, zbývá doplatit ${formatKc(zaplatit)}.` : `Čeká na platbu převodem (${formatKc(zaplatit)}).`)
                : s.zaplaceno > 0 ? 'Zaplaceno, děkujeme.'
                  : s.stav === 'prijato' ? 'Platíte při převzetí.' : null
            return (
              <li key={o.cislo} className="bg-white rounded-lg p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <p className="font-semibold text-ink flex items-center gap-2">
                    {o.cislo}
                    {stav && <span className={`text-xs font-medium px-2 py-0.5 rounded ${stav.trida}`}>{stav.text}</span>}
                  </p>
                  <p className="text-sm text-muted">
                    objednáno {new Date(o.datum).toLocaleDateString('cs-CZ')} · {o.termin}
                  </p>
                </div>
                <ul className="text-sm text-ink-soft space-y-0.5 mb-3">
                  {radky.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <div>
                    <p className="font-semibold text-ink">Celkem {s ? formatKc(s.celkem) : o.celkem}</p>
                    {platba && <p className="text-sm text-ink-soft">{platba}</p>}
                    {(zaplatit > 0 || s?.doklad) && (
                      <p className="flex flex-wrap gap-x-4 text-sm mt-1">
                        {zaplatit > 0 && <a href={odkazNaPlatbu(o.cislo, zaplatit)} className="link">Zaplatit – QR kód a údaje k platbě</a>}
                        {s?.doklad && <a href={s.doklad} target="_blank" rel="noreferrer" className="link">Účtenka</a>}
                      </p>
                    )}
                  </div>
                  {o.polozky?.length > 0 && (
                    <button onClick={() => znovu(o)} aria-label={`Objednat znovu – ${o.cislo}`}
                      className="btn !py-2 !px-4 !text-sm">
                      Objednat znovu
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function StrankaPlatby({ cislo, castka, onZpet }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <h1 tabIndex={-1} className="font-serif text-3xl sm:text-4xl text-ink mb-2 focus:outline-none">Platba objednávky</h1>
      <p className="text-ink-soft mb-8">Objednávka <strong>{cislo}</strong></p>
      <PlatbaPrevodem cislo={cislo} castka={castka} />
      <a href={location.pathname} onClick={e => { e.preventDefault(); onZpet() }} className="btn-outline mt-8">Zpět do obchodu</a>
    </div>
  )
}

// Full name in the header so it is obvious who is signed in.
function jmenoUzivatele(u) {
  const m = u.user_metadata || {}
  const cele = [m.jmeno, m.prijmeni].filter(Boolean).join(' ').trim()
  return cele || (m.full_name || m.name || '').trim() || (u.email || '').split('@')[0] || 'Můj účet'
}

function Obchod() {
  const [view, go, nahradit] = useHashView()
  // Odkaz na platbu z potvrzovacího e-mailu: jen číslo objednávky ve správném tvaru a rozumná částka v korunách
  // (podvržený odkaz nesmí ukázat QR kód s libovolným textem nebo nesmyslnou částkou).
  const [platbaZOdkazu, setPlatbaZOdkazu] = useState(() => {
    const q = new URLSearchParams(location.search)
    const cislo = q.get('platba') || '', castka = Number(q.get('castka'))
    return /^OH-\d{6}-\d{3,4}$/.test(cislo) && Number.isInteger(castka) && castka > 0 && castka <= 200000 ? { cislo, castka } : null
  })
  const [kosikOpen, setKosikOpen] = useState(false)
  const [hotovo, setHotovo] = useState(nacistHotovo)
  const { polozky, oznameni } = useKosik()
  const kosikRef = useRef(null)
  const otevritKosik = useCallback(() => setKosikOpen(true), [])
  const zavritKosik = useCallback(() => setKosikOpen(false), [])

  // Visits also nudge the bank-payment matcher on the hosting (it throttles itself).
  useEffect(() => {
    if (import.meta.env.PROD) fetch(`${import.meta.env.BASE_URL}api/platby.php`).catch(() => {})
  }, [])

  // Prázdný košík do pokladny nepatří (obnovení stránky na #pokladna, Zpět po objednávce)
  // a potvrzení bez objednávky taky ne – obojí vede zpět do katalogu.
  const prazdnaPokladna = view === 'pokladna' && polozky.length === 0
  const hotovoBezObjednavky = view === 'hotovo' && !hotovo
  useEffect(() => {
    if (prazdnaPokladna || hotovoBezObjednavky) nahradit('')
  }, [prazdnaPokladna, hotovoBezObjednavky, nahradit])
  const aktualni = prazdnaPokladna || hotovoBezObjednavky ? 'katalog' : view

  // Po přepnutí stránky fokus na její nadpis (ne při prvním načtení).
  const predchozi = useRef(aktualni)
  useEffect(() => {
    if (predchozi.current === aktualni) return
    predchozi.current = aktualni
    zaostritNadpis()
  }, [aktualni])

  const dokonceno = useCallback(info => {
    try { sessionStorage.setItem(KLIC_HOTOVO, JSON.stringify(info)) } catch { /* private mode */ }
    setHotovo(info)
    nahradit('#hotovo')
  }, [nahradit])

  // Po odchodu ze stránky „Objednávka je přijatá“ se její údaje (e-mail, adresa, poznámka) smažou –
  // na sdíleném rodinném telefonu nemají zůstat. Obnovení #hotovo po návratu z banky dál funguje.
  useEffect(() => {
    if (aktualni === 'hotovo') return
    try { sessionStorage.removeItem(KLIC_HOTOVO) } catch { /* private mode */ }
  }, [aktualni])

  const zpetZPlatby = () => {
    history.replaceState(null, '', location.pathname)
    setPlatbaZOdkazu(null)
    window.scrollTo({ top: 0, behavior: 'instant' })
    zaostritNadpis()
  }

  return (
    <div className="bg-paper min-h-screen flex flex-col">
      <Hlavicka onKosik={otevritKosik} kosikRef={kosikRef} inert={kosikOpen} />
      <div className="h-16" />
      <main className="flex-1" inert={kosikOpen}>
        {platbaZOdkazu && aktualni === 'katalog' && <StrankaPlatby {...platbaZOdkazu} onZpet={zpetZPlatby} />}
        {!platbaZOdkazu && aktualni === 'katalog' && <Katalog />}
        {aktualni === 'pokladna' && (
          <ChybaNacteni>
            <Suspense fallback={<Nacitani />}>
              <Pokladna onZpet={() => go('katalog')} onHotovo={dokonceno} />
            </Suspense>
          </ChybaNacteni>
        )}
        {aktualni === 'hotovo' && <Hotovo info={hotovo} onZpet={() => go('katalog')} />}
        {aktualni === 'objednavky' && <MojeObjednavky onKosik={otevritKosik} />}
        {aktualni === 'ucet' && <Ucet />}
      </main>
      <div inert={kosikOpen}>
        <Footer links={[[`${BASE}index.html#ovoce`, 'Ovoce'], [`${BASE}index.html#mosty`, 'Mošty'], [`${BASE}index.html#kontakt`, 'Kontakt']]} />
      </div>
      {/* Hlášení pro čtečky obrazovky (mimo části stránky, které se při otevřeném košíku vypínají). */}
      <p role="status" className="sr-only">{oznameni ? `Přidáno do košíku: ${oznameni.text}${oznameni.n % 2 ? '' : ' '}` : ''}</p>
      <Oznameni onKosik={otevritKosik} skryt={kosikOpen || aktualni !== 'katalog'} />
      <KosikPanel open={kosikOpen} onClose={zavritKosik} kosikRef={kosikRef} onPokladna={() => { setKosikOpen(false); go('#pokladna') }} />
    </div>
  )
}

export default function EshopApp() {
  return (
    <AuthProvider>
      <KosikProvider>
        <Obchod />
      </KosikProvider>
    </AuthProvider>
  )
}
