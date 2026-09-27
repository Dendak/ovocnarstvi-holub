import { useState, useEffect, useRef } from 'react'
import { imgSrc, imgPos, isInSeason } from '../data'

const BADGE = {
  red:    'bg-red-400/90 text-white',
  orange: 'bg-amber-400/90 text-white',
  yellow: 'bg-yellow-400/90 text-gray-900',
  purple: 'bg-purple-400/90 text-white',
  green:  'bg-green-500/90 text-white',
}

const CalendarIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
)

const imgCls = 'absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-700 group-hover:scale-105'

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
  return <div className="absolute inset-0 flex items-center justify-center text-6xl">🍎</div>
}

function SeasonBadges({ item, labels }) {
  const badgeCls = BADGE[item.barva] || BADGE.green
  const natural = isInSeason({ ...item, vzdy: false })
  const status = natural ? labels.inSeason : item.vzdy ? labels.stored : null
  return (
    <>
      {status && (
        <span className="absolute top-3 left-3 text-xs font-semibold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5 bg-white/90 text-[#133e13] backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {status}
        </span>
      )}
      <span className={`absolute top-3 right-3 text-xs font-semibold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5 ${badgeCls}`}>
        <CalendarIcon />
        {item.sezona}
      </span>
    </>
  )
}

const DEFAULT_LABELS = { inSeason: 'Právě v sezóně', stored: 'Ze skladu' }

export default function OvoceKarta({ item, featured = false, index = 0, labels = DEFAULT_LABELS, cta, note }) {
  const fotky = item.fotky || (item.foto ? [item.foto] : [])
  // Stagger the carousels so the cards don't all change at the same moment.
  const delay = (index * 1300) % 6000

  if (featured) {
    return (
      <div className="group grid lg:grid-cols-[3fr_2fr] overflow-hidden rounded-2xl shadow-md bg-[#132a13] border border-white/5">
        <div className="relative aspect-[4/5] sm:aspect-[4/3] lg:aspect-[5/4] overflow-hidden bg-[#1a2e1a]">
          <Photo fotky={fotky} nazev={item.nazev} delay={delay} />
          <SeasonBadges item={item} labels={labels} />
        </div>
        <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          <p className="text-green-400 text-sm font-medium flex items-center gap-2 mb-3">
            <CalendarIcon />
            {item.sezona}
          </p>
          <h3 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-3">{item.nazev}</h3>
          <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-6">{item.popis}</p>
          {note && (
            <p className="text-white/50 text-sm leading-relaxed border-l-2 border-green-500/40 pl-4 mb-8">{note}</p>
          )}
          {item.odrudy?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {item.odrudy.map(o => (
                <span key={o} className="text-sm text-green-200 bg-white/5 border border-white/10 rounded-full px-3 py-1">{o}</span>
              ))}
            </div>
          )}
          {cta && (
            <a href={cta.href}
              className="self-start inline-flex items-center gap-2 bg-white text-[#133e13] font-semibold px-6 py-3 rounded-full hover:bg-green-50 transition-colors text-sm">
              {cta.label}
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 bg-[#1a2e1a] aspect-[4/5]">
      <Photo fotky={fotky} nazev={item.nazev} delay={delay} />
      <SeasonBadges item={item} labels={labels} />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-5 pt-16">
        <h3 className="font-serif text-2xl font-bold text-white mb-1.5">{item.nazev}</h3>
        <p className="text-white/75 text-sm leading-relaxed">{item.popis}</p>
        {item.odrudy?.length > 0 && (
          <p className="text-white/50 text-xs mt-2">{item.odrudy.join(' · ')}</p>
        )}
      </div>
    </div>
  )
}
