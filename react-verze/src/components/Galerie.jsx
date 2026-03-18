import { useState } from 'react'

const FOTKY = [
  { src: 'img/sad/504681257_4078182002327026_6055659733487249673_n.jpg',      alt: 'Jarní sad v květu',  wide: true },
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
      <section id="galerie" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#133e13] text-center mb-2">Ze sadu</h2>
        <p className="text-center text-gray-500 mb-10 text-sm">Záběry z naší každodenní práce</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FOTKY.map((f, i) => (
            <div
              key={i}
              className={`overflow-hidden rounded-xl cursor-pointer group ${f.wide ? 'col-span-2 md:col-span-1' : ''}`}
              onClick={() => setLightbox(base + f.src)}
            >
              <img
                src={base + f.src}
                alt={f.alt}
                className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-5 text-white text-4xl leading-none">&times;</button>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain" />
        </div>
      )}
    </>
  )
}
