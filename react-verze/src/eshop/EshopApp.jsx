import { useEffect, useMemo, useState } from 'react'
import { OBSAH } from '../data'
import { PRODUKTY, KATEGORIE, DORUCENI, formatKc } from './katalog'
import { KosikProvider, useKosik } from './kosik'
import ProduktKarta from './ProduktKarta'
import Pokladna from './Pokladna'
import Footer from '../components/Footer'

const BASE = import.meta.env.BASE_URL

function useHashView() {
  const read = () => (location.hash === '#pokladna' ? 'pokladna' : location.hash === '#hotovo' ? 'hotovo' : 'katalog')
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
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-[#133e13]/95 backdrop-blur-md shadow-lg">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <a href={`${BASE}index.html`} className="flex items-center gap-3 shrink-0">
          <img src={`${BASE}img/logo.png`} alt="Ovocnářství Holub" className="h-12 w-auto" width="88" height="48" />
          <span className="hidden sm:block text-white/90 font-serif text-lg">E-shop</span>
        </a>
        <div className="flex items-center gap-5">
          <a href={`${BASE}index.html`} className="hidden sm:block text-white/80 hover:text-white text-sm font-medium">← Hlavní stránka</a>
          <button onClick={onKosik} className="relative flex items-center gap-2 bg-white text-[#133e13] font-semibold text-sm px-4 py-2 rounded-full hover:bg-green-50 transition-colors cursor-pointer" aria-label={`Košík, ${pocetKusu} položek`}>
            <KosikIcon />
            <span>Košík</span>
            {pocetKusu > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{pocetKusu}</span>
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
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100">
          <h2 className="font-serif text-xl font-bold text-[#133e13]">Košík</h2>
          <button onClick={onClose} aria-label="Zavřít košík" className="text-gray-400 hover:text-gray-700 text-3xl leading-none cursor-pointer">&times;</button>
        </div>

        {kosik.polozky.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 text-gray-500">
            <KosikIcon className="w-12 h-12 text-gray-300 mb-3" />
            <p>Košík je zatím prázdný.</p>
            <button onClick={onClose} className="mt-4 text-green-700 font-medium hover:underline cursor-pointer">Vybrat ovoce →</button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 px-5">
              {kosik.polozky.map(p => (
                <li key={p.key} className="py-4 flex gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{p.produkt.nazev}</p>
                    <p className="text-xs text-gray-500">{p.produkt.druhNazev}{p.produkt.jednotka === 'kg' ? '' : ` · ${p.varianta.label}`}{p.varianta.cena != null && ` · ${formatKc(p.varianta.cena)} ${p.produkt.jednotka === 'kg' ? 'za kg' : 'za kus'}`}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-gray-200 rounded-lg">
                        <button onClick={() => kosik.nastavit(p.key, p.pocet - 1)} aria-label="Méně" className="w-8 h-8 text-gray-600 cursor-pointer">−</button>
                        <span className="min-w-7 px-1 text-center text-sm tabular-nums">{p.pocet}{p.produkt.jednotka === 'kg' ? ' kg' : ''}</span>
                        <button onClick={() => kosik.nastavit(p.key, p.pocet + 1)} aria-label="Více" className="w-8 h-8 text-gray-600 cursor-pointer">+</button>
                      </div>
                      <button onClick={() => kosik.nastavit(p.key, 0)} className="text-xs text-gray-400 hover:text-red-600 cursor-pointer">Odebrat</button>
                    </div>
                  </div>
                  <p className="font-semibold tabular-nums text-[#133e13] whitespace-nowrap">{p.cena == null ? 'na dotaz' : formatKc(p.cena)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100 p-5 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-gray-600">Celkem</span>
                <span className="font-bold text-2xl text-[#133e13] tabular-nums">{formatKc(kosik.soucet)}</span>
              </div>
              <button onClick={onPokladna} className="w-full bg-[#1a561a] hover:bg-[#133e13] text-white font-semibold py-3.5 rounded-xl transition-colors cursor-pointer">
                Pokračovat k objednávce →
              </button>
              <p className="text-xs text-gray-400 text-center">Platíte až při převzetí nebo po telefonickém potvrzení.</p>
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
      .filter(p => !q || `${p.nazev} ${p.druhNazev} ${p.chut || ''} ${p.hodiSe.join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.dostupne) - Number(a.dostupne))
  }, [kategorie, jenDostupne, hledat])

  const pocty = useMemo(() => Object.fromEntries(KATEGORIE.map(k => [k.id, PRODUKTY.filter(p => p.druh === k.id && p.dostupne).length])), [])

  return (
    <>
      <header className="bg-[#0d1f0d] text-white">
        <div className="max-w-6xl mx-auto px-6 py-14 sm:py-16">
          <p className="text-green-400 text-sm tracking-widest uppercase mb-3">E-shop · přímo ze sadu</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-tight mb-4">Objednejte si ovoce a mošty</h1>
          <p className="text-white/70 text-lg max-w-2xl mb-8">
            Naklikejte si, kolik kilo chcete. Ceny jsou včetně dovozu až domů – objednávku potvrdíme telefonicky a přivezeme ji.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            {['Dovoz až domů v ceně – Č. Budějovice, po, st, pá', DORUCENI.odber.label + ' v Krtelích', 'Libovolné množství od 1 kg', 'Platba při převzetí'].map(t => (
              <span key={t} className="bg-white/10 border border-white/15 rounded-full px-4 py-1.5">✓ {t}</span>
            ))}
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
          <div className="flex flex-wrap gap-2 flex-1">
            {[{ id: 'vse', nazev: 'Vše' }, ...KATEGORIE].map(k => (
              <button key={k.id} onClick={() => setKategorie(k.id)}
                className={`text-sm px-4 py-2 rounded-full border transition cursor-pointer ${
                  kategorie === k.id ? 'bg-[#133e13] border-[#133e13] text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-green-400'
                }`}>
                {k.nazev}
                {k.id !== 'vse' && <span className={`ml-1.5 text-xs ${kategorie === k.id ? 'text-green-200' : 'text-gray-400'}`}>{pocty[k.id]}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <input type="search" value={hledat} onChange={e => setHledat(e.target.value)} placeholder="Hledat odrůdu…"
              aria-label="Hledat odrůdu"
              className="border border-gray-200 rounded-full px-4 py-2 text-sm w-full lg:w-56 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
            <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={jenDostupne} onChange={e => setJenDostupne(e.target.checked)} className="accent-green-600" />
              Jen dostupné
            </label>
          </div>
        </div>

        {produkty.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="mb-3">Tady teď nic není{jenDostupne ? ' – mimo sezónu nebo vyprodáno' : ''}.</p>
            {jenDostupne && (
              <button onClick={() => setJenDostupne(false)} className="text-green-700 font-medium hover:underline cursor-pointer">Zobrazit i nedostupné</button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {produkty.map(p => <ProduktKarta key={p.id} produkt={p} />)}
          </div>
        )}
      </section>
    </>
  )
}

function Hotovo({ info, onZpet }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-3xl">✓</div>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#133e13] mb-3">Děkujeme za objednávku!</h1>
      {info?.cislo && <p className="text-gray-600 mb-2">Číslo objednávky: <strong>{info.cislo}</strong></p>}
      <p className="text-gray-600 mb-8">
        Brzy se vám ozveme a objednávku potvrdíme telefonicky.
        {info?.email && <> Shrnutí jsme poslali na <strong>{info.email}</strong>.</>}
        {' '}Kdybyste cokoli potřebovali, volejte {OBSAH.kontakt.tel1}.
      </p>
      <button onClick={onZpet} className="bg-[#1a561a] hover:bg-[#133e13] text-white font-semibold px-6 py-3 rounded-full cursor-pointer">Zpět do obchodu</button>
    </div>
  )
}

function Obchod() {
  const [view, go] = useHashView()
  const [kosikOpen, setKosikOpen] = useState(false)
  const [hotovo, setHotovo] = useState(null)
  const { polozky } = useKosik()

  // An empty cart can't go to checkout (e.g. after reload on #pokladna).
  const aktualni = view === 'pokladna' && polozky.length === 0 ? 'katalog' : view

  return (
    <div className="bg-[#f7f4ef] min-h-screen flex flex-col">
      <Hlavicka onKosik={() => setKosikOpen(true)} />
      <div className="h-16" />
      <main className="flex-1">
        {aktualni === 'katalog' && <Katalog />}
        {aktualni === 'pokladna' && <Pokladna onZpet={() => go('katalog')} onHotovo={info => { setHotovo(info); go('#hotovo') }} />}
        {aktualni === 'hotovo' && <Hotovo info={hotovo} onZpet={() => go('katalog')} />}
      </main>
      <Footer links={[[`${BASE}index.html#ovoce`, 'Ovoce'], [`${BASE}index.html#mosty`, 'Mošty'], [`${BASE}index.html#kontakt`, 'Kontakt']]} />
      <KosikPanel open={kosikOpen} onClose={() => setKosikOpen(false)} onPokladna={() => { setKosikOpen(false); go('#pokladna') }} />
    </div>
  )
}

export default function EshopApp() {
  return (
    <KosikProvider>
      <Obchod />
    </KosikProvider>
  )
}
