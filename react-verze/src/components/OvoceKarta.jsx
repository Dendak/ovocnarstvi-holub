import { useState, useEffect, useRef } from 'react'
import { imgSrc, imgPos, isInSeason } from '../data'

const imgCls = 'absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-700 group-hover:scale-[1.03]'

// Two stacked layers cross-fade. The hidden layer only gets its next photo
// after the fade has finished, so a photo is never swapped while visible.
function Slideshow({ fotky, nazev, delay }) {
  const [layers, setLayers] = useState([0, 1 % fotky.length])
  const [top, setTop] = useState(0)
  const topRef = useRef(0)

  useEffect(() => {
    if (fotky.length < 2) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let interval, refill
    const start = setTimeout(() => {
      interval = setInterval(() => {
        const hidden = topRef.current
        const shown = 1 - hidden
        topRef.current = shown
        setTop(shown)
        refill = setTimeout(() => {
          setLayers(l => {
            const n = [...l]
            n[hidden] = (l[shown] + 1) % fotky.length
            return n
          })
        }, 900)
      }, 6000)
    }, delay)
    return () => { clearTimeout(start); clearInterval(interval); clearTimeout(refill) }
  }, [fotky.length, delay])

  return layers.map((idx, layer) => (
    <img key={layer} src={imgSrc(fotky[idx])} alt={layer === top ? nazev : ''} loading="lazy" decoding="async"
      className={imgCls}
      style={{ opacity: layer === top ? 1 : 0, objectPosition: imgPos(fotky[idx]) }} />
  ))
}

function Photo({ fotky, nazev, delay }) {
  if (fotky.length > 1) return <Slideshow fotky={fotky} nazev={nazev} delay={delay} />
  if (fotky.length === 1) {
    return <img src={imgSrc(fotky[0])} alt={nazev} loading="lazy" decoding="async"
      className={imgCls} style={{ objectPosition: imgPos(fotky[0]) }} />
  }
  return null
}

// Season line shown above the name: highlighted while the fruit is being picked.
function Sezona({ item, labels, className = '' }) {
  const natural = isInSeason({ ...item, vzdy: false })
  const status = natural ? labels.inSeason : item.vzdy ? labels.stored : null
  return (
    <p className={`text-sm ${className}`}>
      {status && <span className="font-semibold text-leaf">{status}</span>}
      {status && <span className="text-muted"> · </span>}
      <span className="text-muted">{item.sezona}</span>
    </p>
  )
}

const DEFAULT_LABELS = { inSeason: 'Sklízíme právě teď', stored: 'Ze skladu' }

export default function OvoceKarta({ item, featured = false, index = 0, labels = DEFAULT_LABELS, cta, note }) {
  const fotky = item.fotky || (item.foto ? [item.foto] : [])
  // Stagger the carousels so the cards don't all change at the same moment.
  const delay = (index * 1300) % 6000

  if (featured) {
    return (
      <article className="group grid lg:grid-cols-[1.3fr_1fr] bg-white border border-line rounded-lg overflow-hidden">
        <div className="relative aspect-[4/5] sm:aspect-[4/3] lg:aspect-auto lg:min-h-[30rem] overflow-hidden bg-paper-2">
          <Photo fotky={fotky} nazev={item.nazev} delay={delay} />
        </div>
        <div className="p-7 sm:p-10 flex flex-col justify-center">
          <Sezona item={item} labels={labels} className="mb-3" />
          <h3 className="font-serif text-4xl text-ink mb-4">{item.nazev}</h3>
          <p className="lead mb-6">{item.popis}</p>
          {item.odrudy?.length > 0 && (
            <p className="text-sm text-ink-soft mb-6"><span className="text-muted">Odrůdy: </span>{item.odrudy.join(', ')}</p>
          )}
          {note && <p className="text-sm text-muted leading-relaxed border-t border-line pt-5 mb-7">{note}</p>}
          {cta && <a href={cta.href} className="btn self-start">{cta.label}</a>}
        </div>
      </article>
    )
  }

  return (
    <article className="group">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-paper-2 mb-4">
        <Photo fotky={fotky} nazev={item.nazev} delay={delay} />
      </div>
      <Sezona item={item} labels={labels} className="mb-1" />
      <h3 className="font-serif text-2xl text-ink mb-2">{item.nazev}</h3>
      <p className="text-ink-soft leading-relaxed">{item.popis}</p>
      {item.odrudy?.length > 0 && (
        <p className="text-sm text-muted mt-2">{item.odrudy.join(', ')}</p>
      )}
    </article>
  )
}
