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
  { num: '30 ha', label: 'vlastního sadu',     text: 'Přes 8 000 stromů – ovoce sklízíme sami' },
  { num: '6+',    label: 'druhů ovoce',         text: 'Třešně, višně, meruňky, hrušky, švestky, jablka' },
  { num: '15+',   label: 'odrůd jablek',        text: 'Bohemia, Topaz, Golden, Gala a další' },
  { num: '100%',  label: 'přímý prodej',        text: 'Žádný prostředník – vy víte, odkud jídlo pochází' },
]

export default function App() {
  const k = OBSAH.kontakt
  const waUrl = `https://wa.me/${k.tel1.replace(/\D/g, '')}?text=${encodeURIComponent('Dobrý den, mám zájem o ovoce/mošty.')}`

  return (
    <>
      <Nav />
      <div className="h-14" />
      <Hero />

      {/* Numbers strip */}
      <section className="bg-[#1a561a] py-16">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-green-300 text-xs tracking-widest uppercase mb-10 text-center">Proč nakoupit u nás</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {DUVODY.map(d => (
              <div key={d.num} className="text-center">
                <p className="font-serif text-5xl font-bold text-white mb-1">{d.num}</p>
                <p className="text-green-300 text-sm font-medium mb-2">{d.label}</p>
                <p className="text-green-400/60 text-xs leading-relaxed">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SISPO trust bar */}
      <div className="bg-green-950 border-y border-green-900 py-5">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 text-green-400 text-sm">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}img/sispo.gif`} alt="SISPO" className="h-8 opacity-80" />
            <span>SISPO certifikace – integrovaná produkce</span>
          </div>
          <span className="hidden md:inline text-green-700">·</span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
            Rozvoz do Českých Budějovic po–st–pá
          </span>
          <span className="hidden md:inline text-green-700">·</span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
            Prodej po telefonické domluvě
          </span>
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
