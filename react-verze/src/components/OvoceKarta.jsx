import { useState, useEffect, useRef } from 'react'
import { imgSrc, imgSrcSet, imgPos, stavSezony } from '../data'

const imgCls = 'absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-700 group-hover:scale-[1.03]'
const SIZES_VELKA = '(min-width: 1024px) 640px, 100vw'
const SIZES_MALA = '(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw'
const INTERVAL = 6000
const PROLNUTI = 900

// Bez IntersectionObserveru (starý prohlížeč) se karta bere jako viditelná.
const maIO = typeof IntersectionObserver !== 'undefined'
const omezitPohyb = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Two stacked layers cross-fade. The hidden layer only gets its next photo after the fade has
// finished, so a photo is never swapped while visible. Photos rotate (and the next one is
// downloaded) only while the card is on screen, the tab is visible and nobody hovers, focuses
// or pauses it; with reduced motion they don't rotate at all.
function Slideshow({ fotky, nazev, delay, sizes, labels }) {
  const obal = useRef(null)
  const [krok, setKrok] = useState(0)
  const [prolnuto, setProlnuto] = useState(true)
  const [naObrazovce, setNaObrazovce] = useState(!maIO)
  const [nactiDalsi, setNactiDalsi] = useState(!maIO)
  const [stranaViditelna, setStranaViditelna] = useState(true)
  const [najeto, setNajeto] = useState(false)
  const [fokus, setFokus] = useState(false)
  const [pauza, setPauza] = useState(false)
  const [bezPohybu] = useState(omezitPohyb)
  const n = fotky.length

  useEffect(() => {
    const el = obal.current
    if (!el || !maIO) return
    const io = new IntersectionObserver(([e]) => {
      setNaObrazovce(e.isIntersecting)
      if (e.isIntersecting) setNactiDalsi(true)
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const zmena = () => setStranaViditelna(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', zmena)
    return () => document.removeEventListener('visibilitychange', zmena)
  }, [])

  const bezi = !bezPohybu && !pauza && !najeto && !fokus && naObrazovce && stranaViditelna

  useEffect(() => {
    if (!bezi) return
    let interval
    const dalsi = () => { setKrok(k => k + 1); setProlnuto(false) }
    const start = setTimeout(() => { dalsi(); interval = setInterval(dalsi, INTERVAL) }, INTERVAL - 2000 + delay % 3000)
    return () => { clearTimeout(start); clearInterval(interval) }
  }, [bezi, delay])

  useEffect(() => {
    if (prolnuto) return
    const t = setTimeout(() => setProlnuto(true), PROLNUTI)
    return () => clearTimeout(t)
  }, [prolnuto, krok])

  const top = krok % 2
  const aktualni = krok % n
  // The other layer keeps the photo that is fading out, then gets the next one.
  const druha = prolnuto ? (krok + 1) % n : (krok - 1 + n) % n
  const vrstvy = top === 0 ? [aktualni, druha] : [druha, aktualni]

  return (
    <div ref={obal} className="absolute inset-0" onMouseEnter={() => setNajeto(true)} onMouseLeave={() => setNajeto(false)}
      onFocus={() => setFokus(true)} onBlur={() => setFokus(false)}>
      {vrstvy.map((idx, layer) => (layer === top || nactiDalsi) && (
        <img key={layer} src={imgSrc(fotky[idx])} srcSet={imgSrcSet(fotky[idx])} sizes={sizes}
          alt={layer === top ? nazev : ''} loading="lazy" decoding="async"
          className={imgCls}
          style={{ opacity: layer === top ? 1 : 0, objectPosition: imgPos(fotky[idx]) }} />
      ))}
      {!bezPohybu && (
        <button type="button" onClick={() => setPauza(p => !p)} aria-pressed={pauza} aria-label={labels.pauza}
          title={labels.pauza}
          className="absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full bg-black/55 text-white flex items-center justify-center cursor-pointer hover:bg-black/70 focus-visible:!outline-white focus-visible:!outline-offset-0">
          {pauza
            ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
            : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>}
        </button>
      )}
    </div>
  )
}

function Photo({ fotky, nazev, delay, sizes, labels }) {
  if (fotky.length > 1) return <Slideshow fotky={fotky} nazev={nazev} delay={delay} sizes={sizes} labels={labels} />
  if (fotky.length === 1) {
    return <img src={imgSrc(fotky[0])} srcSet={imgSrcSet(fotky[0])} sizes={sizes} alt={nazev} loading="lazy" decoding="async"
      className={imgCls} style={{ objectPosition: imgPos(fotky[0]) }} />
  }
  return null
}

// Season line shown above the name: highlighted while the fruit is being picked.
// Fruit that is not on offer right now (dostupne = false) gets no status, only its season.
function Sezona({ item, labels, dostupne, className = '' }) {
  const stav = dostupne ? stavSezony(item) : null
  const status = stav === 'sklizen' ? labels.inSeason : stav === 'sklad' ? labels.stored : null
  return (
    <p className={`text-sm ${className}`}>
      {status && <span className="font-semibold text-leaf">{status}</span>}
      {status && <span className="text-muted"> · </span>}
      <span className="text-muted">{item.sezona}</span>
    </p>
  )
}

const DEFAULT_LABELS = { inSeason: 'Sklízíme právě teď', stored: 'Ze skladu', odrudy: 'Odrůdy', pauza: 'Zastavit střídání fotek' }

export default function OvoceKarta({ item, featured = false, index = 0, labels = DEFAULT_LABELS, dostupne = true, cta, note }) {
  const fotky = item.fotky || (item.foto ? [item.foto] : [])
  // Stagger the carousels so the cards don't all change at the same moment.
  const delay = (index * 1300) % 6000

  if (featured) {
    return (
      <article className="group grid lg:grid-cols-[1.3fr_1fr] bg-white border border-line rounded-lg overflow-hidden">
        <div className="relative aspect-[4/5] sm:aspect-[4/3] lg:aspect-auto lg:min-h-[30rem] overflow-hidden bg-paper-2">
          <Photo fotky={fotky} nazev={item.nazev} delay={delay} sizes={SIZES_VELKA} labels={labels} />
        </div>
        <div className="p-7 sm:p-10 flex flex-col justify-center">
          <Sezona item={item} labels={labels} dostupne={dostupne} className="mb-3" />
          <h3 className="font-serif text-4xl text-ink mb-4">{item.nazev}</h3>
          <p className="lead mb-6">{item.popis}</p>
          {item.odrudy?.length > 0 && (
            <p className="text-sm text-ink-soft mb-6"><span className="text-muted">{labels.odrudy}: </span>{item.odrudy.join(', ')}</p>
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
        <Photo fotky={fotky} nazev={item.nazev} delay={delay} sizes={SIZES_MALA} labels={labels} />
      </div>
      <Sezona item={item} labels={labels} dostupne={dostupne} className="mb-1" />
      <h3 className="font-serif text-2xl text-ink mb-2">{item.nazev}</h3>
      <p className="text-ink-soft leading-relaxed">{item.popis}</p>
      {item.odrudy?.length > 0 && (
        <p className="text-sm text-muted mt-2">{item.odrudy.join(', ')}</p>
      )}
    </article>
  )
}
