import NavDE from './components/NavDE'
import GalerieDE from './components/GalerieDE'
import AnfrageForm from './components/AnfrageForm'
import OvoceKarta from './components/OvoceKarta'
import Footer from './components/Footer'
import { OBSAH } from './data'

// German fruit cards reuse the Czech OvoceKarta (rotating slideshow),
// so the photo lists come straight from the shared data.
const fotkyOf = nazev => OBSAH.ovoce.find(o => o.nazev === nazev)?.fotky || []

const OBST = [
  { nazev: 'Weichsel / Sauerkirschen', fotky: fotkyOf('Višně'), sezona: 'Juli – August', barva: 'red', popis: 'Aromatische Sauerkirschen – perfekte Grundlage für hochwertige Kirschbrände.' },
  { nazev: 'Zwetschken', fotky: fotkyOf('Švestky'), sezona: 'August – Oktober', barva: 'purple', popis: 'Ideale Brennfrüchte mit hohem Zuckergehalt.', odrudy: ['Haganta', 'Top King', 'Topend Plus', 'Čačanská', 'Stanley'] },
  { nazev: 'Birnen', fotky: fotkyOf('Hrušky'), sezona: 'August – Januar', barva: 'yellow', popis: 'Hervorragend für Birnenbrand und Williams.', odrudy: ['Williams', 'Alex Lucas', 'Conference'] },
  { nazev: 'Äpfel', fotky: fotkyOf('Jablka'), sezona: 'August – März', barva: 'green', popis: 'Über 15 Sorten – für Apfelbrand und Cider.', odrudy: ['Bohemia', 'Topaz', 'Golden', 'Gala', 'Idared'] },
]

const GRUENDE = [
  { num: '30 ha', label: 'eigener Obstgarten', text: 'Über 15 000 Bäume – wir ernten selbst' },
  { num: '200 kg', label: 'Mindestabnahme', text: 'Flexibel für kleine und große Brennereien' },
  { num: '4', label: 'Obstsorten', text: 'Weichsel, Zwetschken, Birnen, Äpfel' },
  { num: '100%', label: 'Direktlieferung', text: 'Vom Obstgarten direkt zu Ihrer Brennerei' },
]

export default function AppDE() {
  const waUrl = 'https://wa.me/420775047010'
  const base = import.meta.env.BASE_URL

  return (
    <>
      <NavDE />
      <div className="h-16" />

      {/* HERO */}
      <header className="relative h-screen flex flex-col justify-end text-white overflow-hidden">
        <img
          src={`${base}img/sad/504681257_4078182002327026_6055659733487249673_n.jpg`}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 pb-32 w-full">
          <p className="text-green-300 text-sm font-medium tracking-[0.25em] uppercase mb-5">
            Familien-Obstbauernhof · Südböhmen
          </p>
          <h1 className="font-serif font-bold leading-none mb-6"
              style={{ fontSize: 'clamp(3rem, 9vw, 7rem)' }}>
            Obst<br />
            <em className="not-italic text-green-300">direkt</em><br />
            vom Bauern.
          </h1>
          <p className="text-white/70 text-lg sm:text-xl font-light max-w-md mb-10 leading-relaxed">
            Weichsel, Zwetschken, Birnen und Äpfel<br className="hidden sm:block" /> für Edelbrände. Lieferung nach Oberösterreich und Salzburg.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="#anfrage"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#133e13] font-semibold px-8 py-4 rounded-full hover:bg-green-50 transition-colors text-sm shadow-xl">
              Anfrage stellen →
            </a>
            <a href="#obst"
              className="inline-flex items-center justify-center gap-2 border border-white/40 bg-white/10 backdrop-blur-sm text-white font-medium px-8 py-4 rounded-full hover:bg-white/20 transition-colors text-sm">
              Unser Sortiment
            </a>
          </div>
        </div>

        {/* Stats strip — glassmorphism */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md border-t border-white/10">
          <div className="max-w-6xl mx-auto px-8 py-5 flex flex-wrap gap-8 items-center">
            <div>
              <span className="font-serif text-2xl font-bold text-white">30 ha</span>
              <span className="text-white/50 text-xs ml-2">eigener Obstgarten</span>
            </div>
            <div className="w-px h-5 bg-white/20" />
            <div>
              <span className="font-serif text-2xl font-bold text-white">200 kg</span>
              <span className="text-white/50 text-xs ml-2">Mindestabnahme</span>
            </div>
            <div className="w-px h-5 bg-white/20 hidden md:block" />
            <div className="ml-auto flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/15">
              <svg className="w-5 h-5 text-green-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
              <span className="text-white text-sm font-medium">Lieferung nach Oberösterreich &amp; Salzburg</span>
            </div>
          </div>
        </div>
      </header>

      {/* Numbers strip */}
      <section className="bg-[#1a561a] py-16">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-green-300 text-sm tracking-widest uppercase mb-10 text-center">Warum bei uns kaufen</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {GRUENDE.map(d => (
              <div key={d.num} className="text-center">
                <p className="font-serif text-5xl font-bold text-white mb-1">{d.num}</p>
                <p className="text-green-300 text-base font-medium mb-2">{d.label}</p>
                <p className="text-green-400/60 text-sm leading-relaxed">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SISPO Zertifizierung */}
      <div className="bg-green-950 border-y border-green-900 py-6">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <a href="https://www.sispo.cz/integrovana-produkce/" target="_blank" rel="noopener noreferrer" className="shrink-0">
              <img src={`${base}img/sispo.gif`} alt="SISPO" className="h-14 hover:opacity-100 opacity-90 transition-opacity" />
            </a>
            <div className="text-center sm:text-left flex-1">
              <p className="text-green-300 font-semibold text-base">
                SISPO-Zertifizierung – Integrierte Produktion
              </p>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap justify-center sm:justify-start">
                <span className="text-green-400/70 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  Kontrollierter Anbau
                </span>
                <span className="text-green-400/70 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  Schonend zur Natur
                </span>
                <a href="https://www.sispo.cz/integrovana-produkce/" target="_blank" rel="noopener noreferrer"
                  className="text-green-500 text-sm hover:text-green-300 transition-colors">
                  Mehr auf sispo.cz →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SORTIMENT */}
      <section id="obst" className="bg-[#0d1f0d] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <p className="text-green-400 text-sm tracking-widest uppercase mb-2">Unser Sortiment</p>
              <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white leading-tight">
                Obst für die Verarbeitung
              </h2>
            </div>
            <p className="text-white/40 text-base max-w-xs sm:text-right">
              Ideal für Edelbrände, Destillate und andere Verarbeitungszwecke
            </p>
          </div>

          {/* Featured card — Weichsel */}
          <div className="mb-5">
            <OvoceKarta item={OBST[0]} featured />
          </div>

          {/* Grid of remaining */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {OBST.slice(1).map(item => (
              <OvoceKarta key={item.nazev} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* LIEFERUNG */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-serif text-3xl font-bold text-[#133e13] text-center mb-10">Lieferung & Konditionen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-[#f7f4ef] rounded-2xl p-6 text-center border border-green-100">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75" /></svg>
              </div>
              <h3 className="font-semibold text-[#133e13] mb-2">Mindestabnahme</h3>
              <p className="text-3xl font-bold text-green-700 mb-1">200 kg</p>
              <p className="text-gray-500 text-sm">pro Bestellung</p>
            </div>
            <div className="bg-[#f7f4ef] rounded-2xl p-6 text-center border border-green-100">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H21M3.375 14.25h.008M21 12.75V6.375c0-.621-.504-1.125-1.125-1.125H5.25c-.621 0-1.125.504-1.125 1.125v7.875m16.875 0h-2.25m-13.5-4.5h13.5" /></svg>
              </div>
              <h3 className="font-semibold text-[#133e13] mb-2">Liefergebiet</h3>
              <p className="text-green-700 font-semibold mb-1">Oberösterreich<br/>Salzburg</p>
              <p className="text-gray-500 text-sm">Lieferung direkt zu Ihnen</p>
            </div>
            <div className="bg-[#f7f4ef] rounded-2xl p-6 text-center border border-green-100">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>
              </div>
              <h3 className="font-semibold text-[#133e13] mb-2">Qualität</h3>
              <p className="text-green-700 font-semibold mb-1">Kontrollierter Anbau</p>
              <p className="text-gray-500 text-sm">30 ha eigener Obstgarten</p>
            </div>
          </div>
        </div>
      </section>

      {/* GALERIE */}
      <GalerieDE />

      {/* ANFRAGE */}
      <AnfrageForm />

      {/* KONTAKT */}
      <section id="kontakt" className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-serif text-3xl font-bold text-[#133e13] text-center mb-12">Kontakt</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: 'pin', title: 'Adresse', content: <><p>Krtely 70</p><p>Netolice, 384 11</p><p>Tschechien</p></> },
              { icon: 'phone', title: 'Telefon', content: <><a href="tel:+436787916433" className="block hover:text-green-700">0043 678 791 64 33</a><a href="tel:+420775047010" className="block hover:text-green-700 mt-1">+420 775 047 010</a></> },
              { icon: 'wa', title: 'WhatsApp', content: <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">Nachricht senden</a> },
              { icon: 'mail', title: 'E-Mail', content: <a href="mailto:holous25@seznam.cz" className="hover:text-green-700">holous25@seznam.cz</a> },
            ].map(c => (
              <div key={c.title} className="bg-[#f7f4ef] rounded-2xl p-6 border border-green-100 text-center text-sm text-gray-600">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  {c.icon === 'pin' && <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>}
                  {c.icon === 'phone' && <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg>}
                  {c.icon === 'wa' && <svg className="w-5 h-5 text-green-700" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.67-1.227A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.591-.826-6.326-2.209l-.352-.29-3.053.803.818-2.987-.318-.505A9.955 9.955 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>}
                  {c.icon === 'mail' && <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>}
                </div>
                <h3 className="font-semibold text-green-700 text-sm mb-1">{c.title}</h3>
                {c.content}
              </div>
            ))}
          </div>
          <div className="mt-8 bg-[#f7f4ef] rounded-2xl border border-green-100 p-5 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-semibold text-[#133e13]">Obstbauernhof Holub</p>
              <p className="text-gray-500 text-sm">Krtely 70, Netolice, 384 11</p>
            </div>
            <a href="https://maps.google.com/?q=Krtely+70,+Netolice,+384+11" target="_blank" rel="noopener noreferrer"
              className="bg-[#1a561a] hover:bg-[#133e13] text-white px-6 py-2.5 rounded-xl font-medium text-sm transition">
              Auf der Karte anzeigen →
            </a>
          </div>
        </div>
      </section>

      <Footer
        name="Obstbauernhof Holub"
        gdprLabel="Datenschutzerklärung"
        links={[['#obst', 'Sortiment'], ['#galerie', 'Fotos'], ['#anfrage', 'Anfrage'], ['#kontakt', 'Kontakt']]}
      />

      {/* WhatsApp FAB */}
      <a href={waUrl} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-5 z-40 bg-[#25d366] rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="WhatsApp"
        style={{ width: 52, height: 52 }}>
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </>
  )
}
