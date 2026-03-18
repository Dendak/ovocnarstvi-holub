import { useState } from 'react'
import { OBSAH } from './data'
import Nav          from './components/Nav'
import Hero         from './components/Hero'
import OvoceSection from './components/OvoceSection'
import Mosty        from './components/Mosty'
import Galerie      from './components/Galerie'
import Aktuality    from './components/Aktuality'
import KontaktForm  from './components/KontaktForm'
import Kontakt      from './components/Kontakt'
import Footer       from './components/Footer'

const DUVODY = [
  { num: '30 ha', label: 'vlastního sadu',     text: 'Přes 15 000 stromů – ovoce sklízíme sami' },
  { num: '6+',    label: 'druhů ovoce',         text: 'Třešně, višně, meruňky, hrušky, švestky, jablka' },
  { num: '15+',   label: 'odrůd jablek',        text: 'Bohemia, Topaz, Golden, Gala a další' },
  { num: '100%',  label: 'přímý prodej',        text: 'Žádný prostředník – vy víte, odkud jídlo pochází' },
]

export default function App() {
  const [sispoOpen, setSispoOpen] = useState(false)
  const k = OBSAH.kontakt
  const waUrl = `https://wa.me/${k.tel1.replace(/\D/g, '')}?text=${encodeURIComponent('Dobrý den, rád/a bych se zeptal/a na dostupnost ovoce nebo moštů.')}`

  return (
    <>
      <Nav />
      <div className="h-16" />
      <Hero />

      {/* Numbers strip */}
      <section className="bg-[#1a561a] py-16">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-green-300 text-sm tracking-widest uppercase mb-10 text-center">Proč nakoupit u nás</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {DUVODY.map(d => (
              <div key={d.num} className="text-center">
                <p className="font-serif text-5xl font-bold text-white mb-1">{d.num}</p>
                <p className="text-green-300 text-base font-medium mb-2">{d.label}</p>
                <p className="text-green-400/60 text-sm leading-relaxed">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SISPO certifikace */}
      <div className="bg-green-950 border-y border-green-900 py-6">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <a href="https://www.sispo.cz/integrovana-produkce/" target="_blank" rel="noopener noreferrer" className="shrink-0">
              <img src={`${import.meta.env.BASE_URL}img/sispo.gif`} alt="SISPO" className="h-14 hover:opacity-100 opacity-90 transition-opacity" />
            </a>
            <div className="text-center sm:text-left flex-1">
              <a href="https://www.sispo.cz/integrovana-produkce/" target="_blank" rel="noopener noreferrer"
                className="text-green-300 font-semibold text-base hover:text-green-200 transition-colors">
                Certifikace SISPO – Integrovaná produkce
              </a>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap justify-center sm:justify-start">
                <span className="text-green-400/70 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  Kontrolované pěstování
                </span>
                <span className="text-green-400/70 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  Šetrné k přírodě
                </span>
                <button
                  onClick={() => setSispoOpen(o => !o)}
                  className="text-green-500 text-sm hover:text-green-300 transition-colors cursor-pointer flex items-center gap-1"
                >
                  {sispoOpen ? 'Skrýt' : 'Více info'}
                  <svg className={`w-3.5 h-3.5 transition-transform ${sispoOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                </button>
              </div>
            </div>
          </div>
          {sispoOpen && (
            <div className="mt-5 bg-green-900/40 rounded-xl p-5 text-green-300/90 text-sm leading-relaxed max-w-3xl mx-auto sm:ml-[calc(3.5rem+1.25rem)]">
              <p>
                Integrovaná produkce je systém pěstování, který kombinuje moderní zemědělské postupy s ohledem na přírodu.
                Ovoce je pěstováno s minimálním použitím chemických přípravků – přednost mají přírodní metody ochrany rostlin.
              </p>
              <p className="mt-2">
                Pro vás to znamená ovoce s nižším obsahem reziduí pesticidů a vyšší nutriční hodnotou – čerstvé, bezpečné a kvalitní.
              </p>
              <a href="https://www.sispo.cz/integrovana-produkce/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-green-400 hover:text-green-200 font-medium mt-3 transition-colors">
                Více na sispo.cz →
              </a>
            </div>
          )}
        </div>
      </div>

      <OvoceSection />
      <Mosty />
      <Galerie />
      <Aktuality />
      <KontaktForm />
      <Kontakt />
      <Footer />

      {/* WhatsApp FAB */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-5 z-40 bg-[#25d366] rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="WhatsApp"
        style={{ width: 52, height: 52 }}
      >
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </>
  )
}
