import { OBSAH, isInSeason, vNabidce } from '../data'
import { FOTO_ODRUD } from './fotoOdrud'
import { cenaSkupiny, SKUPINA } from './skupina'

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
    // Pro kontrolu na serveru (cenikProServer): sezóna se tam počítá ke dni objednávky, ne ke dni sestavení webu.
    sezonaOdDo: d.zdroj && !d.zdroj.vzdy && d.zdroj.sezonaOd && d.zdroj.sezonaDo ? [d.zdroj.sezonaOd, d.zdroj.sezonaDo] : null,
    nabizeno: o.dostupne !== false && vNabidce(d.nazev, o.nazev),
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
// Jedna položka „Domácí mošt“: zákazník volí příchuť a velikost balení (místo karty pro každou příchuť).
const VELIKOSTI = [{ id: '3l', label: '3 l', litry: 3, klic: 'cena3l' }, { id: '5l', label: '5 l', litry: 5, klic: 'cena5l' }]
const prichute = OBSAH.mosty.skupiny.flatMap(sk => sk.polozky.map(p => {
  const nazev = p.nazev.replace(/^\p{Extended_Pictographic}\s*/u, '')
  return {
    id: nazev.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase(),
    nazev,
    // název na objednávce a účtence: „Mošt hruška“, „Vánoční mošt“
    nazevPolozky: /mošt/i.test(nazev) ? nazev : `Mošt ${nazev.toLowerCase()}`,
    dostupne: p.dostupne !== false,
    ceny: Object.fromEntries(VELIKOSTI.map(v => [v.id, cenaSkupiny('mosty', sk[v.klic])])),
  }
}))
const produktyMosty = [{
  id: 'most',
  druh: 'mosty',
  druhNazev: 'Mošty',
  nazev: 'Domácí mošt',
  chut: null,
  popis: 'Mošt z jablek z vlastního sadu, bez přidaných cukrů a konzervantů. Vyberte si příchuť a velikost balení bag-in-box – po otevření vydrží několik týdnů.',
  hodiSe: [],
  sklizen: 'celoročně',
  foto: MOSTY_FOTO.foto,
  fotoIlustracni: false,
  fotoInfo: MOSTY_FOTO,
  vSezone: true,
  dostupne: prichute.some(p => p.dostupne),
  jednotka: 'ks',
  prichute,
  velikosti: VELIKOSTI.map(({ id, label, litry }) => ({ id, label, litry })),
  varianty: prichute.filter(p => p.dostupne).flatMap(p => VELIKOSTI.map(v => ({
    id: `${p.id}-${v.id}`, label: v.label, nazev: p.nazevPolozky, cena: p.ceny[v.id], litry: v.litry,
  }))),
  cenaZaJednotku: null,
  cenaOd: Math.min(...prichute.filter(p => p.dostupne).flatMap(p => Object.values(p.ceny))),
  // nejnižší cena za litr (jednotková cena u balení)
  cenaOdLitr: Math.min(...prichute.filter(p => p.dostupne).flatMap(p => VELIKOSTI.map(v => p.ceny[v.id] / v.litry))),
}]

// Bedýnky jen pro zákaznickou skupinu: pevná váha za pevnou cenu, složená z odrůd, které jsou
// právě k dispozici. Složení (nebo „mix“) je zakódované ve „variantě“ položky košíku.
// Ilustrace bedýnek (img/bedynky); jiná bedýnka dostane fotku první odrůdy.
const FOTO_BEDYNEK = { mix3: 'bedynky/bedynka-3kg.svg', hrusky5: 'bedynky/bedynka-hrusky-5kg.svg', jablka5: 'bedynky/bedynka-jablka-5kg.svg' }

const produktyBedynka = (SKUPINA?.bedynky || []).flatMap(b => {
  const slozky = produktyOvoce.filter(p => b.druhy.includes(p.druh) && p.dostupne)
  if (!slozky.length) return []
  return [{
    id: `bedynka-${b.id}`,
    druh: 'bedynky',
    druhNazev: 'Bedýnky',
    nazev: b.nazev,
    chut: null,
    popis: b.popis || '',
    hodiSe: [],
    sklizen: 'podle aktuální nabídky',
    foto: b.foto || FOTO_BEDYNEK[b.id] || slozky[0].foto,
    fotoIlustracni: false,
    fotoInfo: null,
    vSezone: true,
    dostupne: true,
    jednotka: 'ks',
    bedynka: {
      kg: b.kg, cena: b.cena, volba: b.volba, mix: b.mix || null,
      slozky: slozky.map(p => ({ id: p.id, nazev: p.nazev, druhNazev: p.druhNazev })),
    },
    varianty: [],
    cenaZaJednotku: b.cena,
  }]
})

// „jablka-bohemia:2,hrusky-novembra:1“ – stabilní klíč složení (stejné složení = stejná položka košíku)
export function klicBedynky(slozeni) {
  return Object.entries(slozeni).filter(([, n]) => n > 0).sort(([a], [b]) => a.localeCompare(b)).map(([id, n]) => `${id}:${n}`).join(',')
}

// Z klíče složení (nebo „mix“) udělá „variantu“ pro košík; null, pokud neodpovídá aktuální nabídce.
export function variantaBedynky(produkt, klic) {
  const { kg, cena, slozky, mix } = produkt.bedynka
  const zaklad = { id: klic, label: `${kg} kg`, cena, nazev: produkt.nazev }
  if (klic === 'mix') return mix ? { ...zaklad, slozeni: mix } : null
  const casti = String(klic).split(',').map(c => c.split(':')).map(([id, n]) => ({ slozka: slozky.find(s => s.id === id), n: Number(n) }))
  if (casti.some(c => !c.slozka || !Number.isInteger(c.n) || c.n < 1) || casti.reduce((s, c) => s + c.n, 0) !== kg) return null
  return { ...zaklad, slozeni: casti.map(c => `${c.n} kg ${c.slozka.nazev} (${c.slozka.druhNazev})`).join(' + ') }
}

export const PRODUKTY = [...produktyBedynka, ...produktyOvoce, ...produktyMosty]

// Ceník pro server (api/_cenik.php – vytváří ho vite.config.js při sestavení webu): api/potvrzeni.php podle něj
// přepočítá každou objednávku, ceny v prohlížeči jsou jen pro zobrazení. Klíče jsou stejné jako v košíku
// („produkt|varianta“), ceny základní – ceny a bedýnky skupin server počítá sám podle api/_skupiny.php.
// sezona ([[měsíc, den], [měsíc, den]] nebo null = celoročně) a nabizeno (false = mimo aktuální nabídku)
// server nepoužívá k odmítnutí – objednávku mimo nabídku jen označí farmě k ověření.
export function cenikProServer() {
  if (SKUPINA) throw new Error('Ceník pro server se počítá bez zákaznické skupiny.')
  return Object.fromEntries(PRODUKTY.filter(p => !p.bedynka).map(p => [p.id, {
    druh: p.druh, druhNazev: p.druhNazev, nazev: p.nazev, jednotka: p.jednotka,
    sezona: p.sezonaOdDo ?? null, nabizeno: p.nabizeno ?? true,
    varianty: Object.fromEntries(p.varianty.map(v => [v.id, { label: v.label, nazev: nazevPolozky(p, v), cena: v.cena ?? null }])),
  }]))
}

// Nabídka jen pro zákaznickou skupinu: bedýnky a vše se zvýhodněnou cenou.
export const jeProSkupinu = p => !!p.bedynka || p.cenaBezna != null

export const KATEGORIE = [
  ...(SKUPINA && PRODUKTY.some(jeProSkupinu) ? [{ id: 'skupina', nazev: `Jen pro ${SKUPINA.nazev}`, skupina: true }] : []),
  ...DRUHY_OVOCE.map(d => ({ id: d.id, nazev: d.nazev })),
  { id: 'mosty', nazev: 'Mošty' },
]

export const DORUCENI = {
  odber: { label: 'Osobní odběr', detail: `${OBSAH.kontakt.adresa}, ${OBSAH.kontakt.mesto} – ve zvolený den` },
  rozvoz: { label: 'Dovoz až domů', detail: 'České Budějovice a okolí · doprava v ceně · pondělí, středa, pátek dopoledne' },
}


// „5 kg“ u ovoce na váhu, „2× 5 l“ u moštů.
// Název položky v košíku a na objednávce (u moštu podle zvolené příchuti).
export function nazevPolozky(produkt, varianta) {
  return varianta?.nazev || produkt.nazev
}

export function formatMnozstvi(produkt, varianta, pocet) {
  if (produkt.bedynka) return `${pocet}×`
  return produkt.jednotka === 'kg' ? `${pocet} kg` : `${pocet}× ${varianta.label}`
}

// Řádek objednávky pro e-mail, přehled rozvozu a účtenku (bez ceny).
export function radekPolozky(p) {
  const mnozstvi = formatMnozstvi(p.produkt, p.varianta, p.pocet)
  if (p.produkt.bedynka) return `${mnozstvi} ${p.varianta.nazev}: ${p.varianta.slozeni}`
  return `${mnozstvi} ${nazevPolozky(p.produkt, p.varianta)} (${p.produkt.druhNazev})`
}

export function formatKc(n) {
  return n == null ? null : `${n.toLocaleString('cs-CZ')} Kč`
}

// Jednotková cena u balení (zákon o cenách): „36,67 Kč/l“, „30 Kč/kg“.
export function formatJednotkovaCena(cena, mnozstvi, jednotka) {
  if (cena == null || !mnozstvi) return null
  const n = cena / mnozstvi
  const text = n.toLocaleString('cs-CZ', Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${text} Kč/${jednotka}`
}

// České tvary: 1 položka, 2–4 položky, 5 a víc položek.
export function sklonovat(n, jedna, dveAzCtyri, pet) {
  return `${n} ${n === 1 ? jedna : n >= 2 && n <= 4 ? dveAzCtyri : pet}`
}

// Hledání bez ohledu na diakritiku a velikost písmen.
export const bezDiakritiky = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
