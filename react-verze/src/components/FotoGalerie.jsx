import { useState } from 'react'
import Lightbox from './Lightbox'
import { imgSrc, imgPos } from '../data'

/**
 * Photo grid + lightbox. fotky: [{ path, alt, tall? }], path relative to img/.
 * The grid is 2 columns on mobile and 3 on desktop; with one tall tile, 11 photos
 * fill both layouts completely (12 cells), so keep that count when editing.
 */
export default function FotoGalerie({ fotky, eyebrow, title, zoomLabel }) {
  const [lightbox, setLightbox] = useState(null)
  const fotos = fotky.map(f => ({ ...f, src: imgSrc(f.path) }))

  return (
    <>
      <section id="galerie" className="bg-[#0d1f0d] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-green-400/70 text-xs tracking-widest uppercase mb-3">{eyebrow}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">{title}</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 grid-flow-row-dense auto-rows-[180px] md:auto-rows-[220px] gap-2 sm:gap-3">
            {fotos.map((f, i) => (
              <button
                key={f.path}
                type="button"
                className={`relative overflow-hidden rounded-xl cursor-pointer group bg-[#1a2e1a] ${f.tall ? 'row-span-2' : ''}`}
                onClick={() => setLightbox(i)}
                aria-label={`${zoomLabel}: ${f.alt}`}
              >
                <img
                  src={f.src}
                  alt={f.alt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  style={{ objectPosition: imgPos(f.path) }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                  <span className="text-white text-sm font-medium px-4 py-3 drop-shadow-lg">
                    {f.alt}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {lightbox !== null && (
        <Lightbox fotos={fotos} index={lightbox} onClose={() => setLightbox(null)} onNavigate={setLightbox} />
      )}
    </>
  )
}
