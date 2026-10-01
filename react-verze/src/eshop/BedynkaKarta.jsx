import { useState } from 'react'
import { imgSrc, imgSrcSet, imgPos } from '../data'
import { formatKc, formatJednotkovaCena, klicBedynky } from './katalog'
import { useKosik } from './kosik'

// Box for a customer group: a fixed weight at a fixed price, made up of the varieties available now.
//   volba 'slozeni' – the customer sets kilos per variety (all kilos of one variety are fine too)
//   volba 'odruda'  – the whole box is one variety
//   mix             – optional "leave the choice to the farm" option
export default function BedynkaKarta({ produkt }) {
  const { pridat } = useKosik()
  const { kg, cena, slozky, volba, mix } = produkt.bedynka
  const poOdrudach = volba === 'odruda'
  const [slozeni, setSlozeni] = useState({})
  const [jeMix, setJeMix] = useState(!!mix)
  const [odruda, setOdruda] = useState(null)
  const [pridano, setPridano] = useState(false)
  const vybrano = Object.values(slozeni).reduce((s, n) => s + n, 0)
  const zbyva = kg - vybrano

  const klic = jeMix ? 'mix' : poOdrudach ? (odruda ? `${odruda}:${kg}` : null) : (zbyva === 0 ? klicBedynky(slozeni) : null)

  const zmenit = (id, d) => setSlozeni(prev => {
    if (d > 0 && zbyva <= 0) return prev
    const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) + d) }
    if (!next[id]) delete next[id]
    return next
  })

  // Složení zůstane vybrané (tlačítko se nevypne pod prstem a stejná bedýnka jde přidat znovu).
  const doKosiku = () => {
    pridat(produkt.id, klic, 1)
    setPridano(true)
    setTimeout(() => setPridano(false), 1600)
  }

  const radek = 'flex items-center gap-2.5 py-2 text-sm text-ink cursor-pointer'
  return (
    <article className="group bg-white rounded-lg border border-leaf/40 overflow-hidden flex flex-col">
      <div className="relative aspect-[16/9] sm:aspect-[4/3] overflow-hidden bg-paper-2">
        {produkt.foto && (
          <img src={imgSrc(produkt.foto)} srcSet={imgSrcSet(produkt.foto)} sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
            alt={produkt.nazev} loading="lazy" decoding="async"
            className="w-full h-full object-cover" style={{ objectPosition: imgPos(produkt.foto) }} />
        )}
        <span className="absolute top-3 left-3 bg-leaf text-white text-xs font-semibold px-2.5 py-1 rounded-md">Jen pro skupinu</span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-serif text-xl font-semibold text-ink leading-tight">{produkt.nazev}</h3>
          <p className="text-right shrink-0">
            <span className="font-semibold text-lg text-ink tabular-nums">{formatKc(cena)}</span>
            <span className="text-ink-soft text-xs block -mt-0.5">za {kg} kg vč. dovozu</span>
            <span className="text-ink-soft text-xs block tabular-nums">{formatJednotkovaCena(cena, kg, 'kg')}</span>
          </p>
        </div>
        <p className="text-ink-soft text-sm leading-relaxed mb-4">{produkt.popis}</p>

        <div className="border-y border-line divide-y divide-line mb-3">
          {mix && (
            <label className={radek}>
              <input type="radio" name={`volba-${produkt.id}`} checked={jeMix}
                onChange={() => { setJeMix(true); setOdruda(null) }} className="accent-leaf" />
              {mix}
            </label>
          )}
          {mix && !poOdrudach && (
            <label className={radek}>
              <input type="radio" name={`volba-${produkt.id}`} checked={!jeMix} onChange={() => setJeMix(false)} className="accent-leaf" />
              Vyberu si odrůdy sám
            </label>
          )}
          {poOdrudach && slozky.map(s => (
            <label key={s.id} className={radek}>
              <input type="radio" name={`volba-${produkt.id}`} checked={!jeMix && odruda === s.id}
                onChange={() => { setJeMix(false); setOdruda(s.id) }} className="accent-leaf" />
              Jen {s.nazev} <span className="text-muted">· {kg} kg</span>
            </label>
          ))}
          {!poOdrudach && !jeMix && slozky.map(s => (
            <div key={s.id} className={`flex items-center justify-between gap-3 py-2 ${mix ? 'pl-6' : ''}`}>
              <span className="text-sm text-ink">{s.nazev} <span className="text-muted">· {s.druhNazev}</span></span>
              <span className="flex items-center border border-line rounded-lg shrink-0">
                <button type="button" onClick={() => zmenit(s.id, -1)} disabled={!slozeni[s.id]} aria-label={`Méně – ${s.nazev}`}
                  className="w-10 h-10 text-lg text-ink-soft hover:text-leaf cursor-pointer disabled:opacity-30 disabled:cursor-default">−</button>
                <span className="min-w-10 text-center text-sm tabular-nums">{slozeni[s.id] || 0} kg</span>
                <button type="button" onClick={() => zmenit(s.id, 1)} disabled={zbyva <= 0} aria-label={`Více – ${s.nazev}`}
                  className="w-10 h-10 text-lg text-ink-soft hover:text-leaf cursor-pointer disabled:opacity-30 disabled:cursor-default">+</button>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-3">
          {!poOdrudach && !jeMix && (
            <p aria-live="polite" className={`text-sm ${zbyva ? 'text-ink-soft' : 'text-leaf font-medium'}`}>
              {zbyva ? `Vybráno ${vybrano} z ${kg} kg – přidejte ještě ${zbyva} kg.` : `✓ Bedýnka je plná (${kg} kg).`}
            </p>
          )}
          <button type="button" onClick={doKosiku} disabled={!klic}
            className={`w-full h-10 rounded-lg font-semibold text-sm transition-colors ${
              pridano ? 'bg-paper-2 text-leaf' : 'bg-leaf hover:bg-leaf-dark text-white cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:hover:bg-leaf'
            }`}>
            {pridano ? '✓ Přidáno' : `Do košíku · ${formatKc(cena)}`}
          </button>
        </div>
      </div>
    </article>
  )
}
