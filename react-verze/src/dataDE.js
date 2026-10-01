import { OBSAH } from './data'

// German fruit list. Photos and season ranges come from the Czech data so both
// languages stay in sync; only the texts are German.
const cz = nazev => OBSAH.ovoce.find(o => o.nazev === nazev) || {}
const from = nazev => {
  const o = cz(nazev)
  return { fotky: o.fotky || [], sezonaOd: o.sezonaOd, sezonaDo: o.sezonaDo, sklizenOd: o.sklizenOd, sklizenDo: o.sklizenDo, vzdy: o.vzdy }
}

export const OBST_DE = [
  { nazev: 'Weichsel / Sauerkirschen', ...from('Višně'), sezona: 'Juli – August', barva: 'red', popis: 'Aromatische Sauerkirschen – perfekte Grundlage für hochwertige Kirschbrände.' },
  { nazev: 'Zwetschken', ...from('Švestky'), sezona: 'August – Oktober', barva: 'purple', popis: 'Ideale Brennfrüchte mit hohem Zuckergehalt.', odrudy: ['Haganta', 'Top King', 'Topend Plus', 'Čačanská', 'Stanley'] },
  { nazev: 'Birnen', ...from('Hrušky'), sezona: 'August – Januar', barva: 'yellow', popis: 'Hervorragend für Birnenbrand und Williams.', odrudy: ['Williams', 'Alex Lucas', 'Conference'] },
  { nazev: 'Äpfel', ...from('Jablka'), sezona: 'August – März', barva: 'green', popis: 'Über 15 Sorten – für Apfelbrand und Cider.', odrudy: ['Bohemia', 'Topaz', 'Golden', 'Gala', 'Idared'] },
]

export const LABELS_DE = {
  inSeason: 'Jetzt in Saison', stored: 'Aus dem Lager', odrudy: 'Sorten',
  pauza: 'Fotowechsel anhalten',
}
