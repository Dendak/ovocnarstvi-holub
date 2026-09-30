import { SKUPINA, cekajiciKod } from './skupina'
import { useEffect, useMemo, useState } from 'react'
import { OBSAH } from '../data'
import { PRODUKTY, KATEGORIE, DORUCENI, formatKc, nazevPolozky } from './katalog'
import { KosikProvider, useKosik } from './kosik'
import ProduktKarta from './ProduktKarta'
import BedynkaKarta from './BedynkaKarta'
import Pokladna from './Pokladna'
import Footer from '../components/Footer'
import { nacistObjednavky, smazatVse } from './mujUcet'
import { AuthProvider, useAuth } from './auth'
import { nacistZUctu, STAVY } from './objednavkyDb'
import Ucet from './Ucet'
import PlatbaPrevodem from './PlatbaPrevodem'
import { odkazNaPlatbu } from './platba'

const BASE = import.meta.env.BASE_URL

function useHashView() {
  const read = () => ({ '#pokladna': 'pokladna', '#hotovo': 'hotovo', '#objednavky': 'objednavky', '#ucet': 'ucet', '#nove-heslo': 'ucet' }[location.hash] || 'katalog')
  const [view, setView] = useState(read)
  useEffect(() => {
    const onHash = () => { setView(read()); window.scrollTo({ top: 0, behavior: 'instant' }) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const go = v => { location.hash = v === 'katalog' ? '' : v }
  return [view, go]
}

function KosikIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>
  )
}

function Hlavicka({ onKosik }) {
  const { pocetKusu } = useKosik()
  const auth = useAuth()
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-forest">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <a href={`${BASE}index.html`} className="flex items-center gap-3 shrink-0">
          <img src={`${BASE}img/logo.png`} alt="Ovocnářství Holub" className="h-12 w-auto" width="88" height="48" />
          <span className="hidden sm:block text-white/90 font-serif text-lg">E-shop</span>
        </a>
        <div className="flex items-center gap-5">
          <a href={`${BASE}index.html`} className="hidden md:block text-white/80 hover:text-white text-sm font-medium">← Hlavní stránka</a>
          <a href="#objednavky" className="text-white/80 hover:text-white text-sm font-medium"><span className="hidden sm:inline">Moje </span>objednávky</a>
          {auth.zapnuto && (
            <a href="#ucet" className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-1.5" aria-label={auth.uzivatel ? 'Můj účet' : 'Přihlásit se'}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
              <span className={auth.uzivatel ? 'max-w-[9rem] truncate' : 'hidden sm:inline'}>{auth.uzivatel ? jmenoUzivatele(auth.uzivatel) : 'Přihlásit'}</span>
            </a>
          )}
          <button onClick={onKosik} className="relative btn-light !py-2 !px-4 !text-sm" aria-label={`Košík, ${pocetKusu} položek`}>
            <KosikIcon />
            <span>Košík</span>
            {pocetKusu > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-berry text-white text-xs font-semibold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{pocetKusu}</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}

function KosikPanel({ open, onClose, onPokladna }) {
  const kosik = useKosik()
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside role="dialog" aria-label="Košík"
        className={`absolute right-0 top-0 bottom-0 w-full sm:w-[26rem] bg-white shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-line">
          <h2 className="font-serif text-xl font-semibold text-ink">Košík</h2>
          <button onClick={onClose} aria-label="Zavřít košík" className="text-muted hover:text-ink text-3xl leading-none cursor-pointer">&times;</button>
        </div>

        {kosik.polozky.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 text-muted">
            <KosikIcon className="w-12 h-12 text-line mb-3" />
            <p>Košík je zatím prázdný.</p>
            <button onClick={onClose} className="mt-4 text-leaf font-medium hover:underline cursor-pointer">Vybrat ovoce →</button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y divide-line px-5">
              {kosik.polozky.map(p => (
                <li key={p.key} className="py-4 flex gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink">{nazevPolozky(p.produkt, p.varianta)}</p>
                    <p className="text-xs text-muted">{p.varianta.slozeni || p.produkt.druhNazev}{p.produkt.jednotka === 'kg' ? '' : ` · ${p.varianta.label}`}{p.varianta.cena != null && ` · ${formatKc(p.varianta.cena)} ${p.produkt.jednotka === 'kg' ? 'za kg' : 'za kus'}`}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-line rounded-lg">
                        <button onClick={() => kosik.nastavit(p.key, p.pocet - 1)} aria-label="Méně" className="w-8 h-8 text-ink-soft cursor-pointer">−</button>
                        <span className="min-w-7 px-1 text-center text-sm tabular-nums">{p.pocet}{p.produkt.jednotka === 'kg' ? ' kg' : ''}</span>
                        <button onClick={() => kosik.nastavit(p.key, p.pocet + 1)} aria-label="Více" className="w-8 h-8 text-ink-soft cursor-pointer">+</button>
                      </div>
                      <button onClick={() => kosik.nastavit(p.key, 0)} className="text-xs text-muted hover:text-berry cursor-pointer">Odebrat</button>
                    </div>
                  </div>
                  <p className="font-semibold tabular-nums text-ink whitespace-nowrap">{p.cena == null ? 'na dotaz' : formatKc(p.cena)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-5 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-ink-soft">Celkem</span>
                <span className="font-semibold text-2xl text-ink tabular-nums">{formatKc(kosik.soucet)}</span>
              </div>
              <button onClick={onPokladna} className="w-full bg-leaf hover:bg-leaf-dark text-white font-semibold py-3.5 rounded-md transition-colors cursor-pointer">
                Pokračovat k objednávce →
              </button>
              <p className="text-xs text-muted text-center">Platíte až při převzetí. Doprava je v ceně.</p>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

function Katalog() {
  const [kategorie, setKategorie] = useState('vse')
  const [jenDostupne, setJenDostupne] = useState(true)
  const [hledat, setHledat] = useState('')

  const produkty = useMemo(() => {
    const q = hledat.trim().toLowerCase()
    return PRODUKTY
      .filter(p => kategorie === 'vse' || p.druh === kategorie)
      .filter(p => !jenDostupne || p.dostupne)
      .filter(p => !q || `${p.nazev} ${p.druhNazev} ${p.chut || ''} ${p.hodiSe.join(' ')} ${(p.prichute || []).map(x => x.nazev).join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.dostupne) - Number(a.dostupne))
  }, [kategorie, jenDostupne, hledat])

  const pocty = useMemo(() => Object.fromEntries(KATEGORIE.map(k => [k.id, PRODUKTY.filter(p => p.druh === k.id && p.dostupne).length])), [])

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
            Skupina <strong>{SKUPINA.nazev}</strong>: vidíte zvýhodněné ceny{SKUPINA.adresa ? <>, dovážíme na <strong>{SKUPINA.adresa}</strong></> : null}.
          </p>
        </div>
      )}
      <header className="bg-forest text-white">
        <div className="container-page pt-14 pb-10 sm:pt-16">
          <p className="text-[0.95rem] font-medium text-white/70 mb-3">E-shop Ovocnářství Holub</p>
          <h1 className="font-serif font-medium leading-[1.08] mb-4" style={{ fontSize: 'clamp(2.3rem, 5vw, 3.6rem)' }}>
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

      <section className="container-page py-10 sm:py-12">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
          <div className="flex flex-wrap gap-2 flex-1">
            {[{ id: 'vse', nazev: 'Vše' }, ...KATEGORIE].map(k => (
              <button key={k.id} onClick={() => setKategorie(k.id)}
                className={`text-sm px-3.5 py-2 rounded-md border transition cursor-pointer ${
                  kategorie === k.id ? 'bg-leaf border-leaf text-white' : 'bg-white border-line text-ink-soft hover:border-leaf'
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
              <input type="checkbox" checked={jenDostupne} onChange={e => setJenDostupne(e.target.checked)} className="accent-leaf" />
              Jen dostupné
            </label>
          </div>
        </div>

        {produkty.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <p className="mb-3">Tady teď nic není{jenDostupne ? ' – mimo sezónu nebo vyprodáno' : ''}.</p>
            {jenDostupne && (
              <button onClick={() => setJenDostupne(false)} className="text-leaf font-medium hover:underline cursor-pointer">Zobrazit i nedostupné</button>
            )}
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

function Hotovo({ info, onZpet }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink mb-3">Objednávka je přijatá</h1>
      {info?.cislo && <p className="text-ink-soft mb-2">Číslo objednávky: <strong>{info.cislo}</strong></p>}
      <p className="text-ink-soft mb-6">
        {info?.email ? <>Potvrzení jsme poslali na <strong>{info.email}</strong>. </> : null}
        Nic dalšího potvrzovat nemusíte – ozveme se jen tehdy, kdyby něco nebylo k dispozici.
      </p>
      {info?.prevodem && info.castka > 0 && (
        <div className="mb-8"><PlatbaPrevodem cislo={info.cislo} castka={info.castka} /></div>
      )}
      {info?.souhrn && (
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
  const [mistni, setMistni] = useState(nacistObjednavky)
  const [zUctu, setZUctu] = useState(null)
  const [info, setInfo] = useState(null)
  const prihlasen = !!auth.uzivatel
  const objednavky = prihlasen ? (zUctu || []) : mistni

  useEffect(() => {
    if (!prihlasen) return
    nacistZUctu().then(setZUctu).catch(() => { setZUctu([]); setInfo('Objednávky z účtu se nepodařilo načíst. Zkuste obnovit stránku.') })
  }, [prihlasen])

  const znovu = o => {
    let pridano = 0
    for (const { key, pocet } of o.polozky || []) {
      const [produktId, variantaId] = key.split('|')
      const p = PRODUKTY.find(x => x.id === produktId)
      if (p?.dostupne && p.varianty.some(v => v.id === variantaId)) { pridat(produktId, variantaId, pocet); pridano++ }
    }
    if (pridano) onKosik()
    else setInfo('Z této objednávky teď nic není k dispozici (mimo sezónu nebo vyprodáno).')
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink mb-2">Moje objednávky</h1>
      <p className="text-muted text-sm mb-8">
        {prihlasen
          ? 'Všechny objednávky z vašeho účtu, i jejich aktuální stav.'
          : 'Objednávky odeslané z tohoto zařízení. Údaje jsou uložené jen ve vašem prohlížeči, na jiném zařízení je neuvidíte.'}
      </p>
      {auth.zapnuto && !prihlasen && (
        <p className="text-sm bg-paper-2 text-ink rounded-md px-4 py-3 mb-6">
          <a href="#ucet" className="font-semibold underline">Přihlaste se nebo si založte účet</a> – objednávky pak uvidíte na všech zařízeních i s jejich stavem.
        </p>
      )}
      {prihlasen && zUctu === null && <p className="text-muted py-10 text-center">Načítám…</p>}
      {info && <p className="text-sm text-ink-soft bg-paper-2 rounded-md px-4 py-3 mb-6">{info}</p>}
      {prihlasen && zUctu === null ? null : objednavky.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="mb-3">Zatím tu nejsou žádné objednávky.</p>
          <a href="#" className="text-leaf font-medium hover:underline">Vybrat ovoce →</a>
        </div>
      ) : (
        <ul className="space-y-4">
          {objednavky.map(o => (
            <li key={o.cislo} className="bg-white rounded-lg p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <p className="font-semibold text-ink flex items-center gap-2">
                  {o.cislo}
                  {o.stav && <span className={`text-xs font-medium px-2 py-0.5 rounded ${STAVY[o.stav] || STAVY['přijatá']}`}>{o.stav}</span>}
                </p>
                <p className="text-sm text-muted">
                  objednáno {new Date(o.datum).toLocaleDateString('cs-CZ')} · {o.termin}
                </p>
              </div>
              <ul className="text-sm text-ink-soft space-y-0.5 mb-3">
                {(o.radky || []).map(r => <li key={r}>{r}</li>)}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <p className="font-semibold text-ink">
                  Celkem {o.celkem}
                  {o.prevod > 0 && <a href={odkazNaPlatbu(o.cislo, o.prevod)} className="link text-sm font-normal ml-3">QR kód k platbě</a>}
                </p>
                <button onClick={() => znovu(o)}
                  className="btn !py-2 !px-4 !text-sm">
                  Objednat znovu
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!prihlasen && objednavky.length > 0 && (
        <button onClick={() => { smazatVse(); setMistni([]) }}
          className="mt-8 text-xs text-muted hover:text-berry cursor-pointer">
          Smazat historii a uložené údaje z tohoto zařízení
        </button>
      )}
    </div>
  )
}

function StrankaPlatby({ cislo, castka }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-2">Platba objednávky</h1>
      <p className="text-ink-soft mb-8">Objednávka <strong>{cislo}</strong></p>
      <PlatbaPrevodem cislo={cislo} castka={castka} />
      <a href="#" className="btn-outline mt-8">Zpět do obchodu</a>
    </div>
  )
}

// Short label for the header so it is obvious who is signed in.
function jmenoUzivatele(u) {
  const m = u.user_metadata || {}
  return m.jmeno || (m.full_name || m.name || '').split(' ')[0] || u.email.split('@')[0]
}

function Obchod() {
  const [view, go] = useHashView()
  const [platbaZOdkazu] = useState(() => {
    const q = new URLSearchParams(location.search)
    const cislo = q.get('platba'), castka = Number(q.get('castka'))
    return cislo && castka > 0 ? { cislo, castka } : null
  })
  const [kosikOpen, setKosikOpen] = useState(false)
  const [hotovo, setHotovo] = useState(null)
  const { polozky } = useKosik()

  // Visits also nudge the bank-payment matcher on the hosting (it throttles itself).
  useEffect(() => {
    if (import.meta.env.PROD) fetch(`${import.meta.env.BASE_URL}api/platby.php`).catch(() => {})
  }, [])

  // An empty cart can't go to checkout (e.g. after reload on #pokladna).
  const aktualni = view === 'pokladna' && polozky.length === 0 ? 'katalog' : view

  return (
    <div className="bg-paper min-h-screen flex flex-col">
      <Hlavicka onKosik={() => setKosikOpen(true)} />
      <div className="h-16" />
      <main className="flex-1">
        {platbaZOdkazu && aktualni === 'katalog' && <StrankaPlatby {...platbaZOdkazu} />}
        {!platbaZOdkazu && aktualni === 'katalog' && <Katalog />}
        {aktualni === 'pokladna' && <Pokladna onZpet={() => go('katalog')} onHotovo={info => { setHotovo(info); go('#hotovo') }} />}
        {aktualni === 'hotovo' && <Hotovo info={hotovo} onZpet={() => go('katalog')} />}
        {aktualni === 'objednavky' && <MojeObjednavky onKosik={() => setKosikOpen(true)} />}
        {aktualni === 'ucet' && <Ucet />}
      </main>
      <Footer links={[[`${BASE}index.html#ovoce`, 'Ovoce'], [`${BASE}index.html#mosty`, 'Mošty'], [`${BASE}index.html#kontakt`, 'Kontakt']]} />
      <KosikPanel open={kosikOpen} onClose={() => setKosikOpen(false)} onPokladna={() => { setKosikOpen(false); go('#pokladna') }} />
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
