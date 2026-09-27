import { useState } from 'react'
import { imgSrc, imgPos } from '../data'
import { formatKc } from './katalog'
import { useKosik } from './kosik'

export default function ProduktKarta({ produkt }) {
  const { pridat } = useKosik()
  const [variantaId, setVariantaId] = useState(produkt.varianty[0].id)
  const [pocetText, setPocetText] = useState('1')
  const [pridano, setPridano] = useState(false)
  const varianta = produkt.varianty.find(v => v.id === variantaId)
  const info = produkt.fotoInfo
  const naKg = produkt.jednotka === 'kg'
  const max = naKg ? 500 : 99
  // The field may be empty while typing; anything invalid counts as the minimum 1.
  const pocet = Math.min(max, Math.max(1, parseInt(pocetText, 10) || 1))
  const zmenit = d => setPocetText(String(Math.min(max, Math.max(1, pocet + d))))

  const doKosiku = () => {
    pridat(produkt.id, variantaId, pocet)
    setPocetText(String(pocet))
    setPridano(true)
    setTimeout(() => setPridano(false), 1600)
  }

  return (
    <article className="group bg-white rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className="relative aspect-[16/9] sm:aspect-[4/3] overflow-hidden bg-green-50"
        style={info?.bg ? { backgroundColor: info.bg } : undefined}>
        {produkt.foto && (
          <img src={imgSrc(produkt.foto)} alt={produkt.nazev} loading="lazy" decoding="async"
            className={`w-full h-full transition-transform duration-700 group-hover:scale-105 ${info?.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
            style={{ objectPosition: imgPos(produkt.foto) }} />
        )}
        <span className="absolute top-3 left-3 text-xs font-semibold px-3 py-1 rounded-full bg-white/90 text-[#133e13] backdrop-blur-sm">
          {produkt.druhNazev}
        </span>
        {!produkt.dostupne && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <span className="bg-white text-gray-700 text-sm font-semibold px-4 py-2 rounded-full">
              {produkt.vSezone ? 'Momentálně vyprodáno' : 'Mimo sezónu'}
            </span>
          </div>
        )}
        {produkt.fotoIlustracni && (
          <span className="absolute bottom-2 right-3 text-[10px] text-white/80 drop-shadow">ilustrační foto</span>
        )}
        {info && (
          <a href={info.zdroj} target="_blank" rel="noopener noreferrer"
            className="absolute bottom-1.5 right-2 text-[10px] leading-tight text-white bg-black/45 hover:bg-black/65 rounded px-1.5 py-0.5 max-w-[85%] truncate">
            Foto: {info.autor}, {info.licence}
          </a>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-serif text-xl font-bold text-[#133e13] leading-tight">{produkt.nazev}</h3>
          {produkt.cenaZaJednotku != null && (
            <p className="text-right shrink-0">
              <span className="font-bold text-lg text-[#133e13] tabular-nums">{formatKc(produkt.cenaZaJednotku)}</span>
              <span className="text-gray-400 text-xs block -mt-0.5">{naKg ? 'za 1 kg vč. dovozu' : `za 1 ${produkt.jednotka}`}</span>
            </p>
          )}
        </div>
        {produkt.chut && <p className="text-green-700 text-sm font-medium mb-2">Chuť: {produkt.chut}</p>}
        <p className="text-gray-600 text-sm leading-relaxed mb-3">{produkt.popis}</p>
        {produkt.hodiSe.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {produkt.hodiSe.map(h => (
              <span key={h} className="text-xs bg-green-50 text-green-800 border border-green-100 rounded-full px-2.5 py-0.5">{h}</span>
            ))}
          </div>
        )}
        <p className="text-gray-400 text-xs mb-4">Sklizeň: {produkt.sklizen}</p>

        {produkt.dostupne ? (
          <div className="mt-auto space-y-3">
            {!naKg && (
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Balení">
                {produkt.varianty.map(v => (
                  <button key={v.id} type="button" role="radio" aria-checked={v.id === variantaId}
                    onClick={() => setVariantaId(v.id)}
                    className={`text-sm px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                      v.id === variantaId ? 'border-green-600 bg-green-600 text-white' : 'border-gray-200 text-gray-700 hover:border-green-400'
                    }`}>
                    {v.label}
                    {v.cena != null && <span className={`ml-1.5 ${v.id === variantaId ? 'text-green-100' : 'text-gray-400'}`}>{formatKc(v.cena)}</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button type="button" onClick={() => zmenit(-1)} aria-label="Méně"
                  className="w-9 h-10 text-gray-600 hover:text-green-700 cursor-pointer">−</button>
                <input type="number" inputMode="numeric" min="1" max={max} value={pocetText}
                  onChange={e => setPocetText(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  onBlur={() => setPocetText(String(pocet))}
                  aria-label={naKg ? 'Množství v kg' : 'Počet kusů'}
                  className="w-10 h-10 text-center tabular-nums font-medium focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                {naKg && <span className="text-sm text-gray-500 pr-1">kg</span>}
                <button type="button" onClick={() => zmenit(1)} aria-label="Více"
                  className="w-9 h-10 text-gray-600 hover:text-green-700 cursor-pointer">+</button>
              </div>
              <button type="button" onClick={doKosiku}
                className={`flex-1 h-10 rounded-lg font-semibold text-sm transition-colors cursor-pointer ${
                  pridano ? 'bg-green-100 text-green-800' : 'bg-[#1a561a] hover:bg-[#133e13] text-white'
                }`}>
                {pridano ? '✓ Přidáno' : `Do košíku${varianta.cena != null ? ` · ${formatKc(varianta.cena * pocet)}` : ''}`}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-auto text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            {produkt.vSezone ? 'Brzy znovu naskladníme.' : `Objednávky přijímáme v sezóně (${produkt.sklizen}).`}
          </p>
        )}
      </div>
    </article>
  )
}
