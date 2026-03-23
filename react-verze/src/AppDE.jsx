import NavDE from './components/NavDE'
import AnfrageForm from './components/AnfrageForm'
import Footer from './components/Footer'

const OBST = [
  { name: 'Weichsel / Sauerkirschen', season: 'Juli – August', img: 'visne/višně.jpeg', desc: 'Aromatische Sauerkirschen – perfekte Grundlage für hochwertige Kirschbrände.' },
  { name: 'Zwetschken', season: 'August – Oktober', img: 'svestky/IMG_2471.JPEG', desc: 'Haganta, Top King, Topend Plus, Čačanská, Stanley. Ideale Brennfrüchte mit hohem Zuckergehalt.', varieties: ['Haganta', 'Top King', 'Topend Plus', 'Čačanská', 'Stanley'] },
  { name: 'Birnen', season: 'August – Januar', img: 'hrusky/hrusky.jpg', desc: 'Williams, Alex Lucas, Conference und weitere Sorten. Hervorragend für Birnenbrand und Williams.', varieties: ['Williams', 'Alex Lucas', 'Conference'] },
  { name: 'Äpfel', season: 'August – März', img: 'jablka/IMG_2866.JPEG', desc: 'Über 15 Sorten: Bohemia, Topaz, Golden, Gala, Idared und viele mehr. Für Apfelbrand und Cider.' },
]

export default function AppDE() {
  const waUrl = 'https://wa.me/436787916433'
  const base = import.meta.env.BASE_URL

  return (
    <>
      <NavDE />
      <div className="h-16" />

      {/* HERO */}
      <header
        className="relative min-h-[85vh] flex flex-col justify-center text-white"
        style={{
          backgroundImage: `url('${base}img/sad/504681257_4078182002327026_6055659733487249673_n.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
        <div className="relative z-10 max-w-4xl mx-auto px-8 text-center py-20">
          <p className="text-green-300 text-xs tracking-[0.25em] uppercase mb-5">
            Familien-Obstgut · Südböhmen
          </p>
          <h1 className="font-serif font-bold leading-tight mb-6"
              style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>
            Verarbeitungsobst<br />
            <em className="not-italic text-green-300">für Edelbrände</em>
          </h1>
          <p className="text-white/70 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Erstklassiges Obst aus eigenem 30-ha-Obstgarten für Brennereien in Oberösterreich und Salzburg.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="#anfrage"
              className="inline-flex items-center gap-2 bg-white text-[#133e13] font-semibold px-8 py-4 rounded-full hover:bg-green-50 transition-colors text-base shadow-xl">
              Anfrage stellen →
            </a>
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25d366] hover:bg-[#20bd5a] text-white font-semibold px-8 py-4 rounded-full transition-colors text-base shadow-xl">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.67-1.227A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.591-.826-6.326-2.209l-.352-.29-3.053.803.818-2.987-.318-.505A9.955 9.955 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
              WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-[#133e13] text-white">
        <div className="max-w-4xl mx-auto px-6 py-5 flex flex-wrap justify-center gap-8 sm:gap-14 text-center text-sm">
          <div>
            <span className="font-serif text-2xl font-bold">30 ha</span>
            <span className="text-green-400/60 text-xs ml-2">eigener Obstgarten</span>
          </div>
          <div className="w-px h-8 bg-white/20 hidden sm:block" />
          <div>
            <span className="font-serif text-2xl font-bold">200 kg</span>
            <span className="text-green-400/60 text-xs ml-2">Mindestabnahme</span>
          </div>
          <div className="w-px h-8 bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-3">
            <img src={`${base}img/sispo.gif`} alt="SISPO" className="h-10" />
            <span className="text-green-400/60 text-xs">Integrierte Produktion</span>
          </div>
        </div>
      </div>

      {/* SORTIMENT */}
      <section id="obst" className="bg-[#f7f4ef] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-green-700 text-xs tracking-widest uppercase mb-3">Unser Sortiment</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#133e13] mb-3">
              Obst für die Verarbeitung
            </h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              Erstklassiges Obst aus kontrolliertem Anbau – ideal für Edelbrände, Destillate und andere Verarbeitungszwecke.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {OBST.map(o => (
              <div key={o.name} className="bg-white rounded-2xl border border-green-100 overflow-hidden shadow-sm hover:shadow-md transition">
                <img src={`${base}img/${o.img}`} alt={o.name} className="w-full h-48 object-cover" />
                <div className="p-6">
                  <h3 className="font-serif text-xl font-bold text-[#133e13] mb-1">{o.name}</h3>
                  <p className="text-gray-400 text-sm mb-3">{o.season}</p>
                  <p className="text-gray-600 text-sm">{o.desc}</p>
                </div>
              </div>
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
              <p className="font-semibold text-[#133e13]">Obstgut Holub</p>
              <p className="text-gray-500 text-sm">Krtely 70, Netolice, 384 11</p>
            </div>
            <a href="https://maps.google.com/?q=Krtely+70,+Netolice,+384+11" target="_blank" rel="noopener noreferrer"
              className="bg-[#1a561a] hover:bg-[#133e13] text-white px-6 py-2.5 rounded-xl font-medium text-sm transition">
              Auf der Karte anzeigen →
            </a>
          </div>
        </div>
      </section>

      <Footer />

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
