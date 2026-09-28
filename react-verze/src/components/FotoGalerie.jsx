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
      <section id="galerie" className="bg-paper-2/60 border-y border-line py-20 sm:py-24">
        <div className="container-page">
          <div className="mb-10">
            <p className="kicker mb-3">{eyebrow}</p>
            <h2 className="section-title">{title}</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 grid-flow-row-dense auto-rows-[170px] md:auto-rows-[230px] gap-2 sm:gap-3">
            {fotos.map((f, i) => (
              <button
                key={f.path}
                type="button"
                className={`relative overflow-hidden rounded-md cursor-zoom-in group bg-paper-2 ${f.tall ? 'row-span-2' : ''}`}
                onClick={() => setLightbox(i)}
                aria-label={`${zoomLabel}: ${f.alt}`}
              >
                <img
                  src={f.src}
                  alt={f.alt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  style={{ objectPosition: imgPos(f.path) }}
                />
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
