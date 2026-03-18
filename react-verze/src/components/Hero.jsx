import { OBSAH } from '../data'

export default function Hero() {
  const k = OBSAH.kontakt

  return (
    <>
      <header
        className="relative h-screen flex flex-col justify-end text-white"
        style={{
          backgroundImage: `url('${import.meta.env.BASE_URL}img/sad/504681257_4078182002327026_6055659733487249673_n.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      >
        {/* Dark gradient — heavier at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 pb-32 w-full">
          <p className="text-green-300 text-xs font-medium tracking-[0.25em] uppercase mb-5">
            Rodinné ovocnářství · Krtely u Netolic
          </p>
          <h1 className="font-serif font-bold leading-none mb-6"
              style={{ fontSize: 'clamp(3.5rem, 10vw, 8rem)' }}>
            Ovoce<br />
            <em className="not-italic text-green-300">přímo</em><br />
            ze sadu.
          </h1>
          <p className="text-white/70 text-base sm:text-lg font-light max-w-md mb-10 leading-relaxed">
            Třešně, višně, meruňky, hrušky, švestky, jablka<br className="hidden sm:block" /> a domácí mošty. Přímý prodej z Krtel u Netolic.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`tel:${k.tel1.replace(/\s/g, '')}`}
              className="inline-flex items-center justify-center gap-2 bg-white text-[#133e13] font-semibold px-8 py-4 rounded-full hover:bg-green-50 transition-colors text-sm shadow-xl"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
              </svg>
              {k.tel1}
            </a>
            <a
              href="#ovoce"
              className="inline-flex items-center justify-center gap-2 border border-white/40 bg-white/10 backdrop-blur-sm text-white font-medium px-8 py-4 rounded-full hover:bg-white/20 transition-colors text-sm"
            >
              Aktuální nabídka →
            </a>
          </div>
        </div>

        {/* Stats strip — glassmorphism */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md border-t border-white/10">
          <div className="max-w-6xl mx-auto px-8 py-5 flex flex-wrap gap-8 items-center">
            <div>
              <span className="font-serif text-2xl font-bold text-white">30 ha</span>
              <span className="text-white/50 text-xs ml-2">vlastního sadu</span>
            </div>
            <div className="w-px h-5 bg-white/20" />
            <div>
              <span className="font-serif text-2xl font-bold text-white">8 000+</span>
              <span className="text-white/50 text-xs ml-2">ovocných stromů</span>
            </div>
            <div className="w-px h-5 bg-white/20" />
            <div className="flex items-center gap-2">
              <img src={`${import.meta.env.BASE_URL}img/sispo.gif`} alt="SISPO" className="h-6 opacity-80" />
              <span className="text-white/50 text-xs">integrovaná produkce</span>
            </div>
            <div className="ml-auto hidden md:flex items-center gap-2 text-white/50 text-xs">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
              Rozvoz CB po–st–pá
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
