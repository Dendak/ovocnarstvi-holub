export const OBSAH = {
  kontakt: {
    jmeno:     'Ovocnářství Holub',
    adresa:    'Krtely 70',
    mesto:     'Netolice, 384 11',
    tel1:      '+420 607 575 271',
    tel2:      '+420 722 949 299',
    email:     'holous25@seznam.cz',
    facebook:  'https://www.facebook.com/OvoceHolub',
    instagram: 'https://www.instagram.com/ovocnarstviholub',
  },
  ovoce: [
    { nazev: 'Třešně',  fotky: ['tresne/tresne.jpg', 'tresne/tresne v bedne.jpeg', 'tresne/484803473_1088135826450156_1603854554852976317_n.jpg', 'tresne/tresne-strom-1.jpeg', 'tresne/tresne-strom-2.jpeg', 'tresne/IMG_2788.JPG', 'tresne/IMG_4972.JPEG', 'tresne/IMG_4973.JPEG', 'tresne/IMG_4976.JPEG', 'tresne/IMG_5066.JPEG', 'tresne/IMG_7631.JPEG', 'tresne/IMG_7820.JPEG'], sezona: '1. 7. – 25. 7.', sezonaOd: [7, 1], sezonaDo: [7, 25], barva: 'red', popis: 'Sladké letní třešně přímo ze stromu.', odrudy: ['Kordia', 'Regina', 'Tamara'] },
    { nazev: 'Višně',   fotky: ['visne/višně.jpeg', 'visne/IMG_0242.JPEG', 'visne/IMG_0674.JPG', 'visne/IMG_2367.JPEG', 'visne/d4d50225-3bb2-4f6c-b1a4-295dc2b85896.jpg', 'visne/dacb8750-5c6f-45a4-94fa-8fd3c49b7291.jpg'], sezona: '15. 7. – 8. 8.', sezonaOd: [7, 15], sezonaDo: [8, 8], barva: 'red', popis: 'Ideální na džem, kompot nebo koláče.' },
    { nazev: 'Meruňky', fotky: ['merunky/WhatsApp Image 2026-03-15 at 13.39.21.jpeg', 'merunky/IMG_2376.JPEG'], sezona: 'červenec – srpen', sezonaOd: [7, 1], sezonaDo: [8, 31], barva: 'orange', popis: 'Voňavé a šťavnaté, skvělé čerstvé i na zavařování.' },
    { nazev: 'Broskve', fotky: ['broskve/WhatsApp Image 2026-03-15 at 13.38.50.jpeg', 'broskve/IMG_8553.JPEG'], sezona: 'srpen – září', sezonaOd: [8, 1], sezonaDo: [9, 30], barva: 'orange', popis: 'Šťavnaté broskve na vrcholu léta.' },
    { nazev: 'Švestky', fotky: ['svestky/WhatsApp Image 2026-03-15 at 13.42.01.jpeg', 'svestky/IMG_2471.JPEG', 'svestky/IMG_2476.JPEG', 'svestky/IMG_2713.JPEG', 'svestky/IMG_2863.JPEG', 'svestky/c5b58f3a-5ae9-4fff-95eb-e7e45471e0d6.jpg'], sezona: '1. 8. – 15. 10.', sezonaOd: [8, 1], sezonaDo: [10, 15], barva: 'purple', popis: 'Švestky přímo ze sadu – skvělé na zavařování i do koláče.', odrudy: ['Haganta', 'Top King', 'Topend Plus', 'Čačanská', 'Stanley'] },
    { nazev: 'Hrušky',  fotky: ['hrusky/119992199_2437457283066181_6907105438319047381_n.jpg', 'hrusky/542007542_1218005136796557_6760772214935127534_n.jpg', 'hrusky/hrusky.jpg', 'hrusky/5a349822-0f8a-429d-90d5-3bbaaafeb442.jpg', 'hrusky/94ae6d72-e62e-4f8b-bfdc-778ca23dbc24.jpg', 'hrusky/IMG_0622.jpeg', 'hrusky/IMG_0868.jpeg', 'hrusky/IMG_1134.JPEG', 'hrusky/IMG_1416.JPEG', 'hrusky/IMG_2480.JPEG', 'hrusky/IMG_2787.JPEG', 'hrusky/c993f4e2-fc75-4b5f-b42f-2ba935d8a624.jpg'], sezona: '1. 8. – 31. 1.', sezonaOd: [8, 1], sezonaDo: [1, 31], barva: 'yellow', popis: 'Šťavnaté hrušky různých odrůd.', odrudy: ['Konference', 'Williams', 'Lucasova', 'Bohemica', 'Packahams'] },
    { nazev: 'Jablka',  fotky: ['jablka/119992725_2437457233066186_4983175529147161289_n.jpg', 'jablka/IMG_0889.jpeg', 'jablka/IMG_2820.JPEG', 'jablka/IMG_2866.JPEG', 'jablka/IMG_2867.JPEG', 'jablka/IMG_3016.JPG', 'jablka/f098b13b-3109-46ab-8de9-d94a79317db4.jpg'], sezona: '15. 8. – 31. 3.', sezonaOd: [8, 15], sezonaDo: [3, 31], barva: 'green', popis: 'Více než 15 odrůd, sklizené z vlastního sadu a skladované pro vás.', odrudy: ['Bohemia', 'Rubinola', 'Topaz', 'Golden', 'Gala', 'Rozela', 'Idared', 'Sirius', 'Lucy', 'Jonagold', 'Jonaprince', 'Fuji', 'Braeburn'], wide: true, vzdy: true },
  ],
  aktuality: {
    skladem: ['Jablka – Fuji, Jonagold, Braeburn', 'Domácí mošty – dostupné celoročně'],
  },
  mosty: {
    platnostOd: '15. 3. 2026',
    skupiny: [
      { polozky: [{ nazev: 'Čisté jablko',    dostupne: true }],                                                                                                cena5l: 160, cena3l: 110 },
      { polozky: [{ nazev: 'Hruška',           dostupne: true }, { nazev: 'Červená řepa', dostupne: true }, { nazev: 'Mrkev',   dostupne: true }],              cena5l: 170, cena3l: 120 },
      { polozky: [{ nazev: 'Skořice',          dostupne: true }, { nazev: 'Červený rybíz', dostupne: true }, { nazev: 'Limetka', dostupne: true }, { nazev: 'Zázvor', dostupne: true }], cena5l: 180, cena3l: 125 },
      { polozky: [{ nazev: 'Višeň',            dostupne: true }, { nazev: 'Černý rybíz',  dostupne: true }],                                                    cena5l: 190, cena3l: 130 },
      { polozky: [{ nazev: 'Rakytník',         dostupne: true }, { nazev: '🎄 Vánoční mošt', dostupne: true }],                                                 cena5l: 240, cena3l: 170 },
    ],
  },
}

export function imgSrc(path) {
  return import.meta.env.BASE_URL + 'img/' + path.split('/').map(encodeURIComponent).join('/')
}
