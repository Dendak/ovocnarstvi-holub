import { OBSAH, imgSrc, imgSrcSet, podilJablka, rozpis } from '../data'

const FOTO = 'mosty/most-sklenice.jpg'

const bezEmoji = s => s.replace(/\p{Extended_Pictographic}️?\s*/gu, '').trim()
// „ (jen 5 l)“, když je u příchuti vyprodaná jedna velikost (data.js: vyprodano: ['3l']).
const jenVelikost = p => {
  const zbyva = ['3', '5'].filter(v => !p.vyprodano?.includes(`${v}l`))
  return p.dostupne !== false && zbyva.length === 1 ? <> (jen&nbsp;{zbyva[0]}&nbsp;l)</> : ''
}

export default function Mosty() {
  const { platnostOd, skupiny } = OBSAH.mosty
  const vyluhy = skupiny.flatMap(sk => sk.polozky).filter(p => p.vyluh)

  return (
    <section id="mosty" className="bg-paper py-20 sm:py-24">
      <div className="container-page grid lg:grid-cols-[1fr_1.35fr] gap-12 lg:gap-16 items-start">
        <div>
          <p className="kicker mb-3">Z vlastních jablek</p>
          <h2 className="section-title mb-6">Domácí mošty</h2>
          <p className="lead mb-8">
            Základem každého moštu je čerstvě lisovaná šťáva z jablek z našeho sadu. Nepřidáváme cukr
            ani konzervanty. Balíme do bag-in-boxů po 3 a 5 litrech, které po otevření vydrží několik týdnů.
          </p>
          <div className="overflow-hidden rounded-lg aspect-[4/3] bg-paper-2 mb-6">
            <img src={imgSrc(FOTO)} srcSet={imgSrcSet(FOTO)} sizes="(min-width: 1152px) 460px, (min-width: 1024px) 40vw, 100vw"
              alt="Jablečný mošt ve sklenici" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          </div>
          <p className="text-xs text-muted">
            Foto: <a href="https://commons.wikimedia.org/wiki/File:Apple_juice_with_3apples.jpg" target="_blank" rel="noopener noreferrer" className="underline">Flunse (Patrick Geltinger)</a>, CC BY-SA 3.0
          </p>
        </div>

        <div className="panel p-6 sm:p-8">
          <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-ink/80">
            <h3 className="font-serif text-2xl text-ink">Ceník</h3>
            <p className="text-sm text-muted">platí od {platnostOd}</p>
          </div>

          <div className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-x-3 sm:gap-x-4 pt-4 pb-2 text-sm text-muted">
            <span>Příchuť</span>
            <span className="text-right">3 l</span>
            <span className="text-right">5 l</span>
          </div>

          <ul>
            {skupiny.map((sk, i) => (
              <li key={i} className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-x-3 sm:gap-x-4 py-3.5 border-t border-line items-baseline">
                <span className="text-ink leading-snug">
                  {sk.polozky.map((p, j) => (
                    <span key={p.nazev}>
                      {/* inline-block: příchuť s procenty se zalomí celá, když se vejde na řádek. align-top drží ceny na prvním řádku. */}
                      <span className="inline-block align-top">
                        <span className={p.dostupne === false ? 'text-muted line-through' : ''}>
                          {bezEmoji(p.nazev)}
                          {p.podil > 0 && <span className="text-sm text-muted"> {p.podil}&nbsp;%</span>}
                          {p.rozpis && <span className="text-sm text-muted"> {rozpis(p).map(([s, x]) => `${s.toLowerCase()}\u00A0${x}\u00A0%`).join(', ')}</span>}
                          {jenVelikost(p)}
                        </span>
                        {j < sk.polozky.length - 1 ? ',' : ''}
                      </span>
                      {j < sk.polozky.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </span>
                <span className="text-right tabular-nums text-ink-soft">{sk.cena3l} Kč</span>
                <span className="text-right tabular-nums font-semibold text-ink">{sk.cena5l} Kč</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-6 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-muted">
              Ceny za balení bag-in-box včetně obalu a DPH. Procenta jsou podíl příchuti, zbytek je jablečná šťáva.
              {vyluhy.length > 0 && <> Příchutě {vyluhy.map(p => bezEmoji(p.nazev).toLowerCase()).join(' a ')} se jen vyluhují, jablečné šťávy je {podilJablka(vyluhy[0])}&nbsp;%.</>}
            </p>
            <a href={`${import.meta.env.BASE_URL}eshop.html`} className="btn shrink-0">Objednat mošt</a>
          </div>
        </div>
      </div>
    </section>
  )
}
