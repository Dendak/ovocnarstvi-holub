import { useState, useEffect, useRef } from 'react'
import { imgSrc } from '../data'

const BADGE = {
  red:    'bg-red-400/90 text-white',
  orange: 'bg-amber-400/90 text-white',
  yellow: 'bg-yellow-400/90 text-gray-900',
  purple: 'bg-purple-400/90 text-white',
  green:  'bg-green-500/90 text-white',
}

function Slideshow({ fotky, nazev }) {
  const [idxA, setIdxA] = useState(0)
  const [idxB, setIdxB] = useState(1 % fotky.length)
  const [aOnTop, setAOnTop] = useState(true)
  const timerRef = useRef(null)

  useEffect(() => {
    fotky.forEach(f => { const i = new Image(); i.src = imgSrc(f) })
  }, [fotky])

  useEffect(() => {
    if (fotky.length < 2) return
    timerRef.current = setInterval(() => {
      setAOnTop(prev => {
        const next = prev ? idxB : idxA
        const nextIdx = (next + 1) % fotky.length
        if (prev) setIdxA(nextIdx)
        else setIdxB(nextIdx)
        return !prev
      })
    }, 6000)
    return () => clearInterval(timerRef.current)
  }, [fotky.length, idxA, idxB])

  return (
    <>
      <img src={imgSrc(fotky[idxA])} alt={nazev}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{ opacity: aOnTop ? 1 : 0 }} />
      <img src={imgSrc(fotky[idxB])} alt={nazev}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{ opacity: aOnTop ? 0 : 1 }} />
    </>
  )
}

export default function OvoceKarta({ item, featured = false }) {
  const badgeCls = BADGE[item.barva] || BADGE.green
  const fotky = item.fotky || (item.foto ? [item.foto] : [])
  const imgH = featured ? 'h-80 sm:h-96' : 'h-64'

  return (
    <div className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 bg-black">
      {/* Photo */}
      <div className={`relative ${imgH} overflow-hidden`}>
        {fotky.length > 1
          ? <Slideshow fotky={fotky} nazev={item.nazev} />
          : fotky.length === 1
            ? <img src={imgSrc(fotky[0])} alt={item.nazev} className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 bg-green-900 flex items-center justify-center text-6xl">🍎</div>
        }
        {/* Zoom on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />

        {/* Season badge — top right */}
        <span className={`absolute top-3 right-3 text-xs font-semibold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5 ${badgeCls}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
          {item.sezona}
        </span>
      </div>

      {/* Text on bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 pt-12">
        <h3 className="font-serif text-xl font-bold text-white mb-1">{item.nazev}</h3>
        <p className="text-white/50 text-xs mb-1.5 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
          Sezóna: {item.sezona}
        </p>
        <p className="text-white/70 text-sm leading-relaxed">{item.popis}</p>
        {item.odrudy?.length > 0 && (
          <p className="text-white/40 text-xs mt-2">{item.odrudy.join(' · ')}</p>
        )}
      </div>
    </div>
  )
}
