import FotoGalerie from './FotoGalerie'

// 11 Fotos (das erste hoch und im Hochformat) = volles Raster auf Handy und Desktop.
const FOTOS = [
  { path: 'visne/dacb8750-5c6f-45a4-94fa-8fd3c49b7291.jpg',              alt: 'Weichseln verladen zur Lieferung', tall: true },
  { path: 'visne/IMG_0674.JPG',                                           alt: 'Weichselernte im Obstgarten' },
  { path: 'visne/visne-prepravky.jpg',                                    alt: 'Frisch geerntete Weichseln' },
  { path: 'visne/d4d50225-3bb2-4f6c-b1a4-295dc2b85896.jpg',              alt: 'Weichseln im Detail' },
  { path: 'visne/IMG_0242.JPEG',                                          alt: 'Weichseln in Kisten' },
  { path: 'visne/visne-sud.jpg',                                          alt: 'Weichseln nach der Ernte' },
  { path: 'visne/IMG_2367.JPEG',                                          alt: 'Weichseln im Großbehälter' },
  { path: 'sad/504681257_4078182002327026_6055659733487249673_n.jpg',    alt: 'Obstgarten in Blüte' },
  { path: 'svestky/WhatsApp Image 2026-03-15 at 13.42.01.jpeg',          alt: 'Zwetschken' },
  { path: 'hrusky/542007542_1218005136796557_6760772214935127534_n.jpg', alt: 'Birnenernte' },
  { path: 'jablka/IMG_2867.JPEG',                                         alt: 'Apfelernte' },
]

export default function GalerieDE() {
  return <FotoGalerie fotky={FOTOS} eyebrow="Fotos" title="Aus unserem Obstgarten" zoomLabel="Foto vergrößern"
    lightboxLabels={{ zavrit: 'Schließen', predchozi: 'Zurück', dalsi: 'Weiter' }} />
}
