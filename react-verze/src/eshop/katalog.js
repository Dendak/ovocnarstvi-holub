import { OBSAH, isInSeason, vNabidce } from '../data'
import { FOTO_ODRUD } from './fotoOdrud'
import { cenaSkupiny } from './skupina'

// ============================================================
//  KATALOG E-SHOPU – sem se píšou ceny, dostupnost a popisy
//
//  cenaKg:   cena za 1 kg v Kč u druhu (platí pro všechny odrůdy);
//            odrůda může mít vlastní cenaKg. Bez ceny = „cena na dotaz“
//  dostupne: false = odrůda se v e-shopu ukáže jako vyprodaná
//  Co je právě teď k mání, určuje seznam `aktuality.nabidka` v src/data.js.
//  Zákazník si volí libovolný počet kg (min. 1 kg); doprava je v ceně.
// ============================================================

// Fotky a sezóna se berou ze stejných dat jako hlavní web.
const ovoce = nazev => OBSAH.ovoce.find(o => o.nazev === nazev)

const DRUHY_OVOCE = [
  {
    id: 'jablka', nazev: 'Jablka', zdroj: ovoce('Jablka'), cenaKg: 40,
    sklizen: 'září – říjen, ze skladu do března',
    odrudy: [
      { id: 'bohemia', nazev: 'Bohemia', chut: 'sladkonavinulá', popis: 'Česká odrůda s velkými, sytě červenými plody a šťavnatou dužinou.', hodiSe: ['přímá konzumace', 'mošt'] },
      { id: 'rubinola', nazev: 'Rubinola', chut: 'sladká, aromatická', popis: 'Česká odrůda odolná strupovitosti. Jemná sladká chuť s výrazným aroma, velmi šťavnatá.', hodiSe: ['přímá konzumace', 'pro děti'] },
      { id: 'topaz', nazev: 'Topaz', chut: 'výrazně sladkokyselá', popis: 'Česká rezistentní odrůda. Osvěžující chuť, pevná křupavá dužina a výborná skladovatelnost.', hodiSe: ['přímá konzumace', 'skladování', 'pečení'] },
      { id: 'golden', nazev: 'Golden Delicious', chut: 'sladká, jemná', popis: 'Klasická žlutá odrůda s jemnou, sladkou a aromatickou dužinou.', hodiSe: ['přímá konzumace', 'pečení', 'pro děti'] },
      { id: 'gala', nazev: 'Gala', chut: 'sladká, málo kyselá', popis: 'Červeně žíhaná, křupavá a šťavnatá jablka. Oblíbená hlavně u dětí.', hodiSe: ['přímá konzumace', 'pro děti'] },
      { id: 'rozela', nazev: 'Rozela', chut: 'navinulá', popis: 'Česká rezistentní odrůda s červenými, křupavými plody.', hodiSe: ['přímá konzumace', 'pečení'] },
      { id: 'idared', nazev: 'Idared', chut: 'lehce navinulá', popis: 'Pevná červená jablka, která vydrží dlouho do jara. Skvělá na štrúdl a pečená jablka.', hodiSe: ['pečení', 'skladování'] },
      { id: 'sirius', nazev: 'Sirius', chut: 'sladká, aromatická', popis: 'Česká rezistentní odrůda se žlutými plody. Chutí připomíná Golden Delicious.', hodiSe: ['přímá konzumace', 'pečení'] },
      { id: 'lucy', nazev: 'Lucy', chut: null, popis: 'Česká odrůda. Podrobný popis připravujeme – rádi vám chuť popíšeme po telefonu.', hodiSe: ['přímá konzumace'] },
      { id: 'jonagold', nazev: 'Jonagold', chut: 'sladkokyselá, aromatická', popis: 'Velká žlutočervená jablka s velmi šťavnatou dužinou.', hodiSe: ['přímá konzumace', 'mošt', 'pečení'] },
      { id: 'jonaprince', nazev: 'Jonaprince', chut: 'sladkokyselá, aromatická', popis: 'Sytě červená mutace Jonagoldu se stejně výbornou chutí.', hodiSe: ['přímá konzumace', 'mošt'] },
      { id: 'fuji', nazev: 'Fuji', chut: 'velmi sladká', popis: 'Pevná, křupavá a šťavnatá jablka, která dlouho vydrží.', hodiSe: ['přímá konzumace', 'skladování'] },
      { id: 'braeburn', nazev: 'Braeburn', chut: 'sladkokyselá, osvěžující', popis: 'Pevná a křupavá jablka s osvěžující chutí, dobře skladovatelná.', hodiSe: ['přímá konzumace', 'skladování'] },
    ],
  },
  {
    id: 'hrusky', nazev: 'Hrušky', zdroj: ovoce('Hrušky'), cenaKg: 50,
    sklizen: 'srpen – říjen, ze skladu do ledna',
    odrudy: [
      { id: 'konference', nazev: 'Konference', chut: 'sladká, máslová', popis: 'Protáhlé plody s rezavou slupkou a sladkou, máslově jemnou dužinou. Dobře skladovatelná.', hodiSe: ['přímá konzumace', 'skladování'] },
      { id: 'williams', nazev: 'Williams', chut: 'sladká, velmi aromatická', popis: 'Williamsova čáslavka – nejaromatičtější hruška, šťavnatá a sladká.', hodiSe: ['přímá konzumace', 'kompoty', 'pálenka'] },
      { id: 'novembra', nazev: 'Novembra', chut: 'sladkokyselá, šťavnatá', popis: 'Pozdní zimní odrůda s velkými plody a šťavnatou dužinou. Dobře se skladuje.', hodiSe: ['přímá konzumace', 'skladování'] },
      { id: 'lucasova', nazev: 'Lucasova', chut: 'sladká, šťavnatá', popis: 'Alexander Lucas – velké zimní hrušky se šťavnatou dužinou.', hodiSe: ['přímá konzumace', 'skladování'] },
      { id: 'bohemica', nazev: 'Bohemica', chut: 'sladká, šťavnatá', popis: 'Česká odrůda se sladkými a šťavnatými plody.', hodiSe: ['přímá konzumace'] },
      { id: 'packhams', nazev: 'Packhams', chut: 'sladká s jemnou kyselinkou', popis: 'Packham’s Triumph – zelenožluté zimní hrušky, šťavnaté a dobře skladovatelné.', hodiSe: ['přímá konzumace', 'skladování'] },
    ],
  },
  {
    id: 'svestky', nazev: 'Švestky', zdroj: ovoce('Švestky'), cenaKg: 50,
    sklizen: 'srpen – polovina října',
    odrudy: [
      // Švestky se neprodávají po odrůdách – zákazník dostane tu, která se právě sklízí.
      { id: 'svestky', nazev: 'Švestky', chut: 'sladká, šťavnatá', popis: 'Dovezeme aktuální čerstvě sklizenou odrůdu – podle termínu Čačanská, Stanley, Haganta, Top King nebo Topend Plus.', hodiSe: ['přímá konzumace', 'knedlíky a koláče', 'zavařování', 'sušení'] },
    ],
  },
  {
    id: 'tresne', nazev: 'Třešně', zdroj: ovoce('Třešně'), cenaKg: 150,
    sklizen: 'červenec',
    odrudy: [
      { id: 'kordia', nazev: 'Kordia', chut: 'sladká', popis: 'Tmavě červená pevná chrupka, méně náchylná k praskání.', hodiSe: ['přímá konzumace'] },
      { id: 'regina', nazev: 'Regina', chut: 'sladká', popis: 'Pozdní odrůda s velmi pevnými, sladkými plody.', hodiSe: ['přímá konzumace'] },
      { id: 'tamara', nazev: 'Tamara', chut: 'sladká', popis: 'Česká odrůda s velkými tmavými a pevnými plody.', hodiSe: ['přímá konzumace'] },
    ],
  },
  {
    id: 'visne', nazev: 'Višně', zdroj: ovoce('Višně'), cenaKg: 80,
    sklizen: 'polovina července – začátek srpna',
    odrudy: [
      { id: 'visne', nazev: 'Višně', chut: 'kyselkavá, aromatická', popis: 'Aromatické višně přímo ze sadu.', hodiSe: ['džem a kompoty', 'koláče', 'pálenka'] },
    ],
  },
  {
    id: 'merunky', nazev: 'Meruňky', zdroj: ovoce('Meruňky'), cenaKg: 80,
    sklizen: 'červenec – srpen',
    odrudy: [
      { id: 'merunky', nazev: 'Meruňky', chut: 'sladká, voňavá', popis: 'Voňavé a šťavnaté meruňky ze sadu.', hodiSe: ['přímá konzumace', 'zavařování', 'knedlíky'] },
    ],
  },
  {
    id: 'broskve', nazev: 'Broskve', zdroj: ovoce('Broskve'), cenaKg: 70,
    sklizen: 'srpen – září',
    odrudy: [
      { id: 'broskve', nazev: 'Broskve', chut: 'sladká, šťavnatá', popis: 'Šťavnaté broskve na vrcholu léta.', hodiSe: ['přímá konzumace', 'zavařování'] },
    ],
  },
]

// Varieties without their own photo rotate through the farm's photos of
// that fruit (shown as illustrative).
function fotoFor(fotky, i) {
  return fotky.length ? fotky[i % fotky.length] : null
}

const produktyOvoce = DRUHY_OVOCE.flatMap(d => {
  const fotky = d.zdroj?.fotky || []
  const vSezone = d.zdroj ? isInSeason(d.zdroj) : true
  return d.odrudy.map((o, i) => {
    const cenaBezna = o.cenaKg ?? d.cenaKg ?? null
    const cenaKg = cenaSkupiny(d.id, cenaBezna)
    const vlastni = FOTO_ODRUD[o.id]
    return {
    id: `${d.id}-${o.id}`,
    druh: d.id,
    druhNazev: d.nazev,
    nazev: o.nazev,
    chut: o.chut,
    popis: o.popis,
    hodiSe: o.hodiSe,
    sklizen: d.sklizen,
    foto: vlastni?.foto || fotoFor(fotky, i),
    fotoIlustracni: !vlastni,
    fotoInfo: vlastni || null,
    vSezone,
    dostupne: vSezone && o.dostupne !== false && vNabidce(d.nazev, o.nazev),
    jednotka: 'kg',
    varianty: [{ id: 'kg', label: '1 kg', cena: cenaKg }],
    cenaZaJednotku: cenaKg,
    cenaBezna: cenaBezna !== cenaKg ? cenaBezna : null,
  }})
})

// Mošty: ceny a příchutě bere e-shop přímo z ceníku hlavního webu.
const MOSTY_FOTO = {
  foto: 'mosty/most-sklenice.jpg', fit: 'cover',
  autor: 'Flunse (Patrick Geltinger)', licence: 'CC BY-SA 3.0',
  zdroj: 'https://commons.wikimedia.org/wiki/File:Apple_juice_with_3apples.jpg',
}
const produktyMosty = OBSAH.mosty.skupiny.flatMap(sk => sk.polozky.map(p => ({
  id: `most-${p.nazev.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}`,
  druh: 'mosty',
  druhNazev: 'Mošty',
  nazev: (n => /mošt/i.test(n) ? n : `Mošt ${n}`)(p.nazev.replace(/^\p{Extended_Pictographic}\s*/u, '')),
  chut: null,
  popis: 'Domácí mošt z jablek z vlastního sadu, bez přidaných cukrů a konzervantů. Balení bag-in-box vydrží po otevření několik týdnů.',
  hodiSe: [],
  sklizen: 'celoročně',
  foto: MOSTY_FOTO.foto,
  fotoIlustracni: false,
  fotoInfo: MOSTY_FOTO,
  vSezone: true,
  dostupne: p.dostupne !== false,
  jednotka: 'ks',
  varianty: [
    { id: '3l', label: '3 l', cena: cenaSkupiny('mosty', sk.cena3l) },
    { id: '5l', label: '5 l', cena: cenaSkupiny('mosty', sk.cena5l) },
  ],
  cenaZaJednotku: null,
})))

export const PRODUKTY = [...produktyOvoce, ...produktyMosty]

export const KATEGORIE = [
  ...DRUHY_OVOCE.map(d => ({ id: d.id, nazev: d.nazev })),
  { id: 'mosty', nazev: 'Mošty' },
]

export const DORUCENI = {
  odber: { label: 'Osobní odběr', detail: 'Krtely 70, Netolice – ve zvolený den' },
  rozvoz: { label: 'Dovoz až domů', detail: 'České Budějovice a okolí · doprava v ceně · pondělí, středa, pátek dopoledne' },
}


// „5 kg“ u ovoce na váhu, „2× 5 l“ u moštů.
export function formatMnozstvi(produkt, varianta, pocet) {
  return produkt.jednotka === 'kg' ? `${pocet} kg` : `${pocet}× ${varianta.label}`
}

export function formatKc(n) {
  return n == null ? null : `${n.toLocaleString('cs-CZ')} Kč`
}
