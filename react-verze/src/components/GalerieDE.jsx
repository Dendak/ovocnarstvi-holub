import { useState } from 'react'
import Lightbox from './Lightbox'

const FOTOS = [
  { src: 'img/visne/IMG_0674.JPG',                                             alt: 'Weichselernte im Obstgarten', tall: true },
  { src: 'img/visne/visne-prepravky.jpg',                                      alt: 'Frisch geerntete Weichseln' },
  { src: 'img/visne/dacb8750-5c6f-45a4-94fa-8fd3c49b7291.jpg',                alt: 'Weichseln verladen zur Lieferung' },
  { src: 'img/visne/d4d50225-3bb2-4f6c-b1a4-295dc2b85896.jpg',                alt: 'Weichseln im Detail' },
  { src: 'img/visne/IMG_0242.JPEG',                                            alt: 'Weichseln in Kisten' },
  { src: 'img/visne/visne-sud.jpg',                                            alt: 'Weichseln nach der Ernte' },
  { src: 'img/sad/504681257_4078182002327026_6055659733487249673_n.jpg',      alt: 'Obstgarten in Blüte' },
  { src: 'img/svestky/WhatsApp%20Image%202026-03-15%20at%2013.42.01.jpeg',   alt: 'Zwetschken' },
  { src: 'img/hrusky/542007542_1218005136796557_6760772214935127534_n.jpg',   alt: 'Birnenernte' },
]

export default function GalerieDE() {
  const [lightbox, setLightbox] = useState(null)
  const base = import.meta.env.BASE_URL
  const fotos = FOTOS.map(f => ({ ...f, src: base + f.src }))

  return (
    <>
      <section id="galerie" className="bg-[#0d1f0d] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-green-400/60 text-xs tracking-widest uppercase mb-3">Einblicke in unsere Arbeit</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">Aus unserem Obstgarten</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 auto-rows-[180px] md:auto-rows-[220px] gap-2 sm:gap-3">
            {fotos.map((f, i) => (
              <button
                key={i}
                type="button"
                className={`relative overflow-hidden rounded-xl cursor-pointer group ${f.tall ? 'row-span-2' : ''}`}
                onClick={() => setLightbox(i)}
                aria-label={`Foto vergrößern: ${f.alt}`}
              >
                <img
                  src={f.src}
                  alt={f.alt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
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
