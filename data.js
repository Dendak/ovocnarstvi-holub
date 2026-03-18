// ============================================================
//  OBSAH WEBU – sem piš změny
//  Po uložení souboru stačí obnovit stránku v prohlížeči (F5)
// ============================================================

const OBSAH = {

  // --- KONTAKTNÍ ÚDAJE ---
  kontakt: {
    jmeno:     "Ovocnářství Holub",
    adresa:    "Krtely 70",
    mesto:     "Netolice, 384 11",
    tel1:      "+420 607 575 271",
    tel2:      "+420 722 949 299",
    email:     "holous25@seznam.cz",
    facebook:  "https://www.facebook.com/OvoceHolub",
    instagram: "https://www.instagram.com/ovocnarstviholub",
  },

  // --- OVOCE ---
  // foto: název souboru z složky img/ (nebo "" když fotka není)
  // sezona: text zobrazený na štítku
  // popis: krátký text pod názvem
  ovoce: [
    {
      nazev:  "Třešně",
      fotky:  ["tresne/tresne.jpg", "tresne/tresne v bedne.jpeg", "tresne/484803473_1088135826450156_1603854554852976317_n.jpg"],
      sezona: "1. 7. – 25. 7.",
      barva:  "red",
      popis:  "Sladké letní třešně přímo ze stromu.",
      odrudy: ["Kordia", "Regina", "Tamara"],
    },
    {
      nazev:  "Višně",
      foto:   "visne/višně.jpeg",
      sezona: "15. 7. – 8. 8.",
      barva:  "red",
      popis:  "Ideální na džem, kompot nebo koláče.",
    },
    {
      nazev:  "Meruňky",
      foto:   "merunky/WhatsApp Image 2026-03-15 at 13.39.21.jpeg",
      sezona: "červenec – srpen",
      barva:  "orange",
      popis:  "Voňavé a šťavnaté, skvělé čerstvé i na zavařování.",
    },
    {
      nazev:  "Broskve",
      foto:   "broskve/WhatsApp Image 2026-03-15 at 13.38.50.jpeg",
      sezona: "srpen – září",
      barva:  "orange",
      popis:  "Šťavnaté broskve na vrcholu léta.",
    },
    {
      nazev:  "Švestky",
      foto:   "svestky/WhatsApp Image 2026-03-15 at 13.42.01.jpeg",
      sezona: "1. 8. – 15. 10.",
      barva:  "purple",
      popis:  "Švestky přímo ze sadu – skvělé na zavařování i do koláče.",
      odrudy: ["Haganta", "Top King", "Topend Plus", "Čačanská", "Stanley"],
    },
    {
      nazev:  "Hrušky",
      fotky:  ["hrusky/119992199_2437457283066181_6907105438319047381_n.jpg", "hrusky/542007542_1218005136796557_6760772214935127534_n.jpg", "hrusky/hrusky.jpg"],
      sezona: "1. 8. – 31. 1.",
      barva:  "yellow",
      popis:  "Šťavnaté hrušky různých odrůd.",
      odrudy: ["Konference", "Williams", "Lucasova", "Bohemica", "Packahams"],
    },
    {
      nazev:  "Jablka",
      foto:   "jablka/119992725_2437457233066186_4983175529147161289_n.jpg",
      sezona: "15. 8. – 31. 3.",
      barva:  "green",
      popis:  "Více než 15 odrůd, sklizené z vlastního sadu a skladované pro vás.",
      odrudy: ["Bohemia", "Rubinola", "Topaz", "Golden", "Gala", "Rozela", "Idared", "Sirius", "Lucy", "Jonagold", "Jonaprince", "Fuji", "Braeburn"],
      wide:   true, // tato karta zabere celou šířku
    },
  ],

  // --- AKTUÁLNĚ SKLADEM ---
  // Sem piš co je zrovna k dostání – zobrazí se jako tagy v sekci Aktuálně
  // Pokud je seznam prázdný, blok se nezobrazí
  aktuality: {
    skladem: [
      "Jablka – Fuji, Jonagold, Braeburn",
      "Domácí mošty – dostupné celoročně",
    ],
  },

  // --- CENÍK MOŠTU ---
  // Cena se píše jako číslo (bez Kč)
  // dostupne: true = normálně, false = zobrazí se jako nedostupné
  mosty: {
    platnostOd: "15. 3. 2026",
    skupiny: [
      {
        polozky: [
          { nazev: "Čisté jablko", dostupne: true },
        ],
        cena5l:  160,
        cena3l:  110,
      },
      {
        polozky: [
          { nazev: "Hruška",       dostupne: true },
          { nazev: "Červená řepa", dostupne: true },
          { nazev: "Mrkev",        dostupne: true },
        ],
        cena5l:  170,
        cena3l:  120,
      },
      {
        polozky: [
          { nazev: "Skořice",       dostupne: true },
          { nazev: "Červený rybíz", dostupne: true },
          { nazev: "Limetka",       dostupne: true },
          { nazev: "Zázvor",        dostupne: true },
        ],
        cena5l:  180,
        cena3l:  125,
      },
      {
        polozky: [
          { nazev: "Višeň",        dostupne: true },
          { nazev: "Černý rybíz",  dostupne: true },
        ],
        cena5l:  190,
        cena3l:  130,
      },
      {
        polozky: [
          { nazev: "Rakytník",        dostupne: true },
          { nazev: "🎄 Vánoční mošt", dostupne: true },
        ],
        cena5l:  240,
        cena3l:  170,
        special: true,
      },
    ],
  },

  // --- DODÁVKY DO RAKOUSKA ---
  // Zobrazí se jako banner pod mošty
  // aktivni: true = zobrazit, false = skrýt
  rakusko: {
    aktivni: true,
    region:  "Oberösterreich & Salzkammergut",
    vlastnosti: [
      { cs: "Čerstvé",    de: "Frisch"        },
      { cs: "Bez plísně", de: "Ohne Schimmel" },
      { cs: "Bez větví",  de: "Ohne Äste"     },
      { cs: "Čisté",      de: "Sauber"        },
    ],
  },

};
