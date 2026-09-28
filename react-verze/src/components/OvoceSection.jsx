import { OBSAH, sortBySeason } from '../data'
import OvoceKarta from './OvoceKarta'

const ESHOP = `${import.meta.env.BASE_URL}eshop.html`

export default function OvoceSection() {
  const [featured, ...rest] = sortBySeason(OBSAH.ovoce)

  return (
    <section id="ovoce" className="bg-paper-2/60 border-y border-line py-20 sm:py-24">
      <div className="container-page">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="kicker mb-3">Sezóna {new Date().getFullYear()}</p>
            <h2 className="section-title">Naše ovoce</h2>
          </div>
          <p className="text-ink-soft max-w-sm md:text-right">
            Termíny sklizně se každý rok trochu liší podle počasí. Co je právě k mání, vidíte nahoře.
          </p>
        </div>

        <div className="mb-14">
          <OvoceKarta item={featured} featured
            cta={{ href: ESHOP, label: 'Objednat v e-shopu' }}
            note="Dovezeme až domů do Českých Budějovic v pondělí, středu a pátek. Doprava je v ceně." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {rest.map((item, i) => (
            <OvoceKarta key={item.nazev} item={item} index={i + 1} />
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-ink-soft">Všechny odrůdy s popisem, chutí a cenou najdete v e-shopu.</p>
          <a href={ESHOP} className="btn-outline">Otevřít e-shop</a>
        </div>
      </div>
    </section>
  )
}
