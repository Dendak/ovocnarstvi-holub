import { OBSAH, sortBySeason } from '../data'
import OvoceKarta from './OvoceKarta'

export default function OvoceSection() {
  const [featured, ...rest] = sortBySeason(OBSAH.ovoce)

  return (
    <section id="ovoce" className="bg-[#0d1f0d] py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-green-400 text-sm tracking-widest uppercase mb-2">Sezónní nabídka {new Date().getFullYear()}</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white leading-tight">
              Naše ovoce
            </h2>
          </div>
          <p className="text-white/50 text-base max-w-xs sm:text-right">
            Přesné termíny dostupnosti závisí na počasí a ročníku
          </p>
        </div>

        <div className="mb-5">
          <OvoceKarta item={featured} featured
            cta={{ href: `${import.meta.env.BASE_URL}eshop.html`, label: 'Objednat v e-shopu →' }}
            note="Osobní odběr v Krtelích u Netolic nebo rozvoz do Českých Budějovic v pondělí, středu a pátek." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rest.map((item, i) => (
            <OvoceKarta key={item.nazev} item={item} index={i + 1} />
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <p className="text-white/70">Všechny odrůdy s popisy a cenami najdete v e-shopu.</p>
          <a href={`${import.meta.env.BASE_URL}eshop.html`}
            className="inline-flex items-center gap-2 bg-white text-[#133e13] font-semibold px-6 py-3 rounded-full hover:bg-green-50 transition-colors text-sm">
            Otevřít e-shop →
          </a>
        </div>
      </div>
    </section>
  )
}
