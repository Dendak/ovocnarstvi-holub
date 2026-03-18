import { OBSAH } from '../data'
import OvoceKarta from './OvoceKarta'

export default function OvoceSection() {
  const [featured, ...rest] = OBSAH.ovoce

  return (
    <section id="ovoce" className="bg-[#0d1f0d] py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-green-400 text-sm tracking-widest uppercase mb-2">Sezónní nabídka 2026</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white leading-tight">
              Naše ovoce
            </h2>
          </div>
          <p className="text-white/40 text-base max-w-xs text-right">
            Přesné termíny dostupnosti závisí na počasí a ročníku
          </p>
        </div>

        {/* Featured card */}
        <div className="mb-5">
          <OvoceKarta item={featured} featured />
        </div>

        {/* Grid of remaining */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rest.map(item => (
            <OvoceKarta key={item.nazev} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
