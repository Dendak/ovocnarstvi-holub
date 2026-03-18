import { useState } from 'react'

const FOTKY = [
  { src: 'img/sad/504681257_4078182002327026_6055659733487249673_n.jpg',      alt: 'Jarní sad v květu',  tall: true },
  { src: 'img/tresne/tresne.jpg',                                              alt: 'Třešně' },
  { src: 'img/jablka/119992725_2437457233066186_4983175529147161289_n.jpg',   alt: 'Jablka na větvi' },
  { src: 'img/hrusky/119992199_2437457283066181_6907105438319047381_n.jpg',   alt: 'Hrušky v sadu' },
  { src: 'img/hrusky/hrusky.jpg',                                              alt: 'Hrušky v bedně' },
  { src: 'img/merunky/WhatsApp%20Image%202026-03-15%20at%2013.39.21.jpeg',   alt: 'Meruňky' },
  { src: 'img/svestky/WhatsApp%20Image%202026-03-15%20at%2013.42.01.jpeg',   alt: 'Švestky' },
  { src: 'img/broskve/WhatsApp%20Image%202026-03-15%20at%2013.38.50.jpeg',   alt: 'Broskve' },
  { src: 'img/visne/vi%C5%A1n%C4%9B.jpeg',                                    alt: 'Višně' },
]

export default function Galerie() {
  const [lightbox, setLightbox] = useState(null)
  const base = import.meta.env.BASE_URL

  return (
    <>
      <section id="galerie" className="bg-[#0d1f0d] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-green-400/60 text-xs tracking-widest uppercase mb-3">Nahlédněte k nám</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">Ze sadu</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 auto-rows-[180px] md:auto-rows-[220px] gap-2 sm:gap-3">
            {FOTKY.map((f, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-xl cursor-pointer group ${f.tall ? 'row-span-2' : ''}`}
                onClick={() => setLightbox(base + f.src)}
              >
                <img
                  src={base + f.src}
                  alt={f.alt}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                  <span className="text-white text-sm font-medium px-4 py-3 drop-shadow-lg">
                    {f.alt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-pointer backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-5 text-white/70 hover:text-white text-4xl leading-none transition-colors">&times;</button>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain shadow-2xl" />
        </div>
      )}
    </>
  )
}
