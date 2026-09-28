import FotoGalerie from './FotoGalerie'

// 11 fotek (první vysoká a na výšku) = plná mřížka na mobilu i desktopu.
const FOTKY = [
  { path: 'sad/504681257_4078182002327026_6055659733487249673_n.jpg',    alt: 'Jarní sad v květu', tall: true },
  { path: 'tresne/tresne.jpg',                                            alt: 'Třešně' },
  { path: 'jablka/119992725_2437457233066186_4983175529147161289_n.jpg', alt: 'Jablka na větvi' },
  { path: 'hrusky/119992199_2437457283066181_6907105438319047381_n.jpg', alt: 'Hrušky v sadu' },
  { path: 'merunky/WhatsApp Image 2026-03-15 at 13.39.21.jpeg',          alt: 'Meruňky' },
  { path: 'svestky/WhatsApp Image 2026-03-15 at 13.42.01.jpeg',          alt: 'Švestky' },
  { path: 'broskve/IMG_8553.JPEG',                                        alt: 'Broskve' },
  { path: 'visne/višně.jpeg',                                             alt: 'Višně' },
  { path: 'hrusky/hrusky.jpg',                                            alt: 'Hrušky v bedně' },
  { path: 'tresne/tresne-strom-1.jpeg',                                   alt: 'Třešně na stromě' },
  { path: 'jablka/IMG_2867.JPEG',                                         alt: 'Sklizeň jablek' },
]

export default function Galerie() {
  return <FotoGalerie fotky={FOTKY} eyebrow="Fotogalerie" title="Ze sadu" zoomLabel="Zvětšit fotku" />
}
