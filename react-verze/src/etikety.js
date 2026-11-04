// Etikety moštů k tisku (etikety.html) na arch Avery 3475: A4, 3 × 8 etiket 70 × 36 mm bez mezer.
// Příchutě, podíly a adresa jsou z data.js. Názvy, složení a barvy jsou tady v PRICHUTE; příchuť bez záznamu se ukáže, ale nevytiskne.
import QRCode from 'qrcode'
import { OBSAH, podilJablka, rozpis } from './data.js'

const k = OBSAH.kontakt
const NA_ARCH = 24
const ESHOP = 'https://ovoce-holub.cz/eshop.html'
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const bezEmoji = s => s.replace(/\p{Extended_Pictographic}️?\s*/gu, '').trim()
const NBSP = '\u00A0'

// velky: největší řádek. Obě složky jsou stejně velké, ať to nevypadá, že je příchuti víc než jablka.
// nazev: zákonný název, co položka, to řádek. Podle vyhlášky č. 248/2018 Sb. je „mošt“ jen přímo lisovaná ovocná šťáva: řepa a mrkev
// nejsou ovoce a skořice, květ a zázvor do šťávy nepatří. Názvy platí, až moštárna písemně potvrdí šťávy bez vody, cukru a aromat.
// U šťávy ze dvou druhů ovoce je ve druhém řádku jejich výčet se slovem šťáva (směrnice 2001/112/ES, čl. 3 bod 3). „Pasterovaná“ povinné
// není (nařízení 1169/2011, příloha VI část A bod 1) a u šťáv se vedle výčtu nevejde, zůstalo jen u nápojů, kde má vlastní řádek.
// Řádek údajů nesmí začínat velkým Š, Č ani Ř, háček by sahal do linky. Řádek delší než sloupec stránka pozná a tisk zablokuje.
// slozka: co je v krabici kromě jablečné šťávy. U koření a květu rozhoduje skutečná receptura moštárny.
// U příchuti z více šťáv (rozpis v data.js) je to název každé z nich pro Složení. Procenta jsou jen v data.js, ať ceník a web ukazují totéž.
// receptura: složení je zatím odhad, panel na to upozorní. Po odpovědi moštárny upravit slozka a příznak smazat.
// navic: složka bez procent za příchutí, do součtu 100 se nepočítá. Koření jen pro chuť procento mít nemusí.
// barva: příchuť, linka a znak, ať se krabice s různými příchutěmi rozliší na první pohled. Kontrast s bílou aspoň 4,5:1,
// na etiketě je o 20 % tmavší (aspoň 6,7:1). Sousední odstíny od sebe aspoň ΔE 15.
const PRICHUTE = {
  'Čisté jablko': { velky: 'Jablko', nazev: ['Jablečný mošt', '100% jablečná šťáva'], slozka: null, barva: '#2f5a33' },
  'Hruška': { velky: 'Jablko + hruška', nazev: ['Jablečno-hruškový mošt', 'šťáva z jablek a hrušek'], slozka: 'hrušková šťáva', barva: '#626e18' },
  'Červená řepa': { velky: 'Jablko + červená řepa', nazev: ['Ovocno-zeleninová šťáva', 'z jablek a červené řepy'], slozka: 'šťáva z červené řepy', barva: '#7d1f4e' },
  'Mrkev': { velky: 'Jablko + mrkev', nazev: ['Ovocno-zeleninová šťáva', 'z jablek a mrkve'], slozka: 'mrkvová šťáva', barva: '#c44e14' },
  'Skořice': { velky: 'Jablko + skořice', nazev: ['Jablečný nápoj se skořicí', 'pasterovaný'], slozka: 'skořice', receptura: true, barva: '#7a4a24' },
  'Květ bezu': { velky: 'Jablko + květ bezu', nazev: ['Jablečný nápoj s květem bezu', 'pasterovaný'], slozka: 'květ černého bezu', receptura: true, barva: '#2f6b73' },
  'Limetka': { velky: 'Jablko + limetka', nazev: ['Jablečno-limetkový mošt', 'šťáva z jablek a limetek'], slozka: 'limetková šťáva', receptura: true, barva: '#457c1b' },
  'Zázvor': { velky: 'Jablko + zázvor', nazev: ['Jablečný nápoj se zázvorem', 'pasterovaný'], slozka: 'zázvor', barva: '#86641a' },
  'Višeň': { velky: 'Jablko + višeň', nazev: ['Jablečno-višňový mošt', 'šťáva z jablek a višní'], slozka: 'višňová šťáva', barva: '#7c1d2b' },
  'Červený rybíz': { velky: 'Jablko + červený rybíz', nazev: ['Jablečno-rybízový mošt', 'šťáva z jablek a rybízu'], slozka: 'šťáva z červeného rybízu', barva: '#b3242f' },
  // „Ovocný“, protože jsou v něm tři druhy ovoce (vyhláška č. 248/2018 Sb., § 4 odst. 2 a § 5 odst. 3). „Vánoční punč“ je jen obchodní
  // název, zákonný nenahradí. Název má jeden řádek a složení tři, ať je údajů šest řádků jako u ostatních.
  'Vánoční mošt': { velky: 'Vánoční punč', nazev: ['Ovocný nápoj s kořením'], slozka: { Višeň: 'višňová šťáva', Třešeň: 'třešňová šťáva' }, navic: 'koření', receptura: true, barva: '#17241a' },
  'Rakytník': { velky: 'Jablko + rakytník', nazev: ['Jablečno-rakytníkový mošt', 'šťáva z jablek a rakytníku'], slozka: 'rakytníková šťáva', barva: '#aa6100' },
}

const MOSTY = OBSAH.mosty.skupiny.flatMap(sk => sk.polozky).map(p => {
  const id = bezEmoji(p.nazev)
  // Šťáva z rozpisu bez názvu pro Složení se počítá jako chybějící záznam: tisk počká.
  const zaznam = PRICHUTE[id] && rozpis(p).every(([s]) => PRICHUTE[id].slozka?.[s]) ? PRICHUTE[id] : null
  return { id, podil: p.podil, vyluh: p.vyluh, rozpis: p.rozpis, bezZaznamu: !zaznam, ...(zaznam || { velky: `Jablko + ${id.toLowerCase()}`, nazev: [id], slozka: id.toLowerCase(), barva: '#2f5a33' }) }
})

// Od každé příchuti dva kusy: první pohled na celý arch se všemi příchutěmi.
const stav = Object.fromEntries(MOSTY.map(m => [m.id, { '5 l': 2, '3 l': 0, datum: '' }]))
const pole = id => document.getElementById(id)
const cislo = (x, min, max) => Math.min(max, Math.max(min, parseInt(x, 10) || 0))

// Nedoplněný údaj se vytiskne jako prázdné místo, ať je na etiketě vidět, že chybí.
// Složení má aspoň dva řádky a každá šťáva s procentem svůj: na jednom by se rozestupy etikety rozdělily na půl pixelu a na každém
// řádku archu by vyšly jinak. Zalamuje se jen mezi složkami, nikdy uprostřed „višňová / šťáva“.
function slozeni(m) {
  const c = x => (x ?? '__') + NBSP + '%'
  const prichut = m.vyluh ? [m.slozka]
    : m.rozpis ? rozpis(m).map(([s, x]) => `${m.slozka[s] ?? s.toLowerCase()} ${c(x)}`)
    : [`${m.slozka} ${c(m.podil)}`]
  if (m.navic && !m.vyluh) prichut.push(`${prichut.pop()}, ${m.navic}`)
  return [`jablečná šťáva ${c(podilJablka(m))}`, ...prichut].map(r => `<span>${esc(r)}</span>`).join(',<br>')
}

// „30.4.2027“ i „30. 4. 2027“ se tiskne jednotně; neexistující datum (31. 2.) se bere jako nevyplněné.
function datumZ(text) {
  const d = String(text).trim().match(/^(\d{1,2})\. ?(\d{1,2})\. ?(\d{4})$/)
  if (!d) return null
  const den = new Date(Number(d[3]), Number(d[2]) - 1, Number(d[1]))
  return den.getDate() === Number(d[1]) && den.getMonth() === Number(d[2]) - 1 ? den : null
}
const datumCesky = text => {
  const d = datumZ(text)
  return d ? `${d.getDate()}.${NBSP}${d.getMonth() + 1}.${NBSP}${d.getFullYear()}` : ''
}

// QR kód jako vektor v čisté černé: 29 × 29 modulů, na 13 mm vychází modul 0,45 mm.
const { modules: moduly } = QRCode.create(ESHOP, { errorCorrectionLevel: 'M' })
const qr = (() => {
  const n = moduly.size
  let d = ''
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!moduly.get(y, x)) continue
      let delka = 1
      while (x + delka < n && moduly.get(y, x + delka)) delka++
      d += `M${x} ${y}h${delka}v1h-${delka}z`
      x += delka
    }
  }
  return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" aria-hidden="true"><path d="${d}"/></svg>`
})()

// Znak z loga jako SVG přímo ve stránce: vektorový a v barvě textu.
let znak = ''

const etiketa = (m, objem, s, razitko) => `
  <article class="etiketa" data-most="${esc(m.id)}" style="--barva:${m.barva}">
    <div class="obsah">
      <h2 class="velky"><span>${esc(m.velky)}</span></h2>
      <span class="znak">${znak}</span>
      <hr class="linka">
      <div class="udaje">
        <p class="nazev">${m.nazev.map(r => `<span>${esc(r)}</span>`).join(' ')}</p>
        ${m.slozka ? `<p class="slozeni">Složení: ${slozeni(m)}</p>` : ''}
        <p class="trvanlivost">Minimální trvanlivost do: <b>${esc(objem === 5 ? `viz razítko ${razitko}` : datumCesky(s.datum) || `__.${NBSP}__.${NBSP}____`)}</b></p>
      </div>
      <span class="qr">${qr}</span>
      <p class="objem"><b>${objem}</b> ${objem === 5 ? 'litrů' : 'litry'}</p>
      <p class="adresa">${esc(k.provozovatel)}, ${esc(k.adresa)}, <span>${esc(k.mesto)}</span></p>
    </div>
  </article>`

// Názvy měříme podle skutečného tvaru písmen: první písmeno sedí přesně na levé ose a co by přesáhlo, se zmenší na dostupnou šířku.
const mereni = document.createElement('canvas').getContext('2d')
function nazvy() {
  for (const p of document.querySelectorAll('.velky span')) {
    p.style.fontSize = ''
    const css = getComputedStyle(p)
    // Měří se ve 240 px: rozměry tvaru jsou zaokrouhlené na celé pixely a nad 256 px dokonce na 1/64 velikosti písma.
    const v = 240 / parseFloat(css.fontSize)
    mereni.font = `${css.fontWeight} 240px ${css.fontFamily}`
    mereni.letterSpacing = `${parseFloat(css.letterSpacing) * v}px`
    const tvar = mereni.measureText(p.textContent)
    const dotah = tvar.actualBoundingBoxDescent / v > 1
    const zmenseni = Math.min(dotah ? 0.933 : 1, v * p.parentElement.clientWidth / (tvar.actualBoundingBoxLeft + tvar.actualBoundingBoxRight))
    if (zmenseni < 1) p.style.fontSize = `${parseFloat(css.fontSize) * zmenseni}px`
    p.parentElement.style.textIndent = `${tvar.actualBoundingBoxLeft * zmenseni / v}px`
    // Ocásek p a y by vjel do linky, proto se názvy s dotahem zvednou o 2 px a kvůli hornímu okraji mají nejvýš 19 pt.
    p.parentElement.style.top = dotah ? '6px' : ''
  }
}

// Řádek delší než sloupec by vjel do volného okraje QR kódu, adresa přes kraj etikety. Měří se pravý kraj textu, ne prvku:
// řádek názvu je blok široký jako sloupec, i když je text kratší.
function preteka(el) {
  const text = document.createRange()
  text.selectNodeContents(el)
  return Math.max(...[...text.getClientRects()].map(r => r.right)) > el.closest('.udaje, .obsah').getBoundingClientRect().right + 0.5
}

function vykreslit() {
  const razitko = pole('razitko').value.trim() || 'na krabici'
  const preskocit = cislo(pole('preskocit').value, 0, NA_ARCH - 1)
  const posun = ['posunX', 'posunY'].map(id => Number(pole(id).value) || 0)
  const seznam = MOSTY.flatMap(m => ['5 l', '3 l'].flatMap(v =>
    Array.from({ length: stav[m.id][v] }, () => etiketa(m, parseInt(v, 10), stav[m.id], razitko))))
  const pozice = [...Array(preskocit).fill('<div class="etiketa prazdna"></div>'), ...seznam]
  const archy = []
  for (let i = 0; i < Math.max(pozice.length, 1); i += NA_ARCH) archy.push(pozice.slice(i, i + NA_ARCH))
  pole('archy').innerHTML = archy.map(a => `<section class="arch">${a.join('')}</section>`).join('')
  pole('archy').classList.toggle('cernobile', pole('cernobile').checked)
  nazvy()
  const n = seznam.length
  pole('soucet').textContent = n ? `${n} ${n === 1 ? 'etiketa' : n < 5 ? 'etikety' : 'etiket'} · ${archy.length} ${archy.length === 1 ? 'arch' : archy.length < 5 ? 'archy' : 'archů'}` : 'Zadejte počet etiket'
  const tiskne = m => stav[m.id]['5 l'] + stav[m.id]['3 l'] > 0
  const vypis = s => s.map(m => m.id).join(', ')
  const bezZaznamu = MOSTY.filter(m => m.bezZaznamu && tiskne(m))
  const bezPodilu = MOSTY.filter(m => m.slozka && podilJablka(m) === null && tiskne(m))
  const bezReceptury = MOSTY.filter(m => m.receptura && tiskne(m))
  const bezData = MOSTY.filter(m => stav[m.id]['3 l'] > 0 && !datumZ(stav[m.id].datum))
  const dnes = new Date().setHours(0, 0, 0, 0)
  const prosle = MOSTY.filter(m => stav[m.id]['3 l'] > 0 && datumZ(stav[m.id].datum) && datumZ(stav[m.id].datum) < dnes)
  const dlouheRazitko = [...document.querySelectorAll('.trvanlivost')].some(preteka)
  const dlouhe = [...new Set([...document.querySelectorAll('.etiketa[data-most]')]
    .filter(e => [...e.querySelectorAll('.nazev, .slozeni')].some(preteka)).map(e => e.dataset.most))]
  const dlouhaAdresa = [...document.querySelectorAll('.adresa')].some(preteka)
  // Záložní písmo je širší a jinak vysoké, rozměry etiket platí jen pro Source Sans 3.
  const bezPisma = !document.fonts.check('500 9.5pt "Source Sans 3"', 'aČ')
  pole('upozorneni').innerHTML = [
    bezZaznamu.length && `Tisk čeká na zákonný název a složení: ${vypis(bezZaznamu)}. Příchuť chybí v PRICHUTE v src/etikety.js. Doplňte ji tam, nebo jí dejte 0 kusů.`,
    bezData.length && `Tisk čeká na platné datum u 3 l: ${vypis(bezData)}. Krabice 3 l datum nemá. Pište ho takhle: 30. 4. 2027.`,
    dlouheRazitko && 'Tisk čeká na kratší text razítka, takhle by vjel do QR kódu.',
    dlouhe.length && `Tisk čeká na kratší řádek: ${dlouhe.join(', ')}. Takhle by vjel do QR kódu, zkraťte ho v PRICHUTE v src/etikety.js.`,
    dlouhaAdresa && 'Tisk čeká na kratší adresu, na jeden řádek etikety se nevejde (kontakt v src/data.js).',
    bezPisma && 'Tisk čeká na písmo etiket. Když se do chvíle nenačte, obnovte stránku.',
    prosle.length && `Datum už minulo: ${vypis(prosle)}.`,
    bezPodilu.length && `Bez podílu: ${vypis(bezPodilu)}. Odhad moštárny chybí, na etiketě bude __${NBSP}%.`,
    bezReceptury.length && `Složení je zatím odhad: ${vypis(bezReceptury)}. Tiskněte až podle úplné receptury od moštárny.`,
    razitko === 'na krabici' && MOSTY.some(m => stav[m.id]['5 l'] > 0) && 'U 5 l doplňte, na které stěně krabice je razítko, a ověřte, že má den, měsíc i rok.',
    posun.some(p => Math.abs(p) > 1.5) && 'Posun tisku přes 1,5 mm ořízne etikety.',
  ].filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('')
  // Tlačítko hlídá jen klik, Ctrl+P hlídá třída: v tisku se archy skryjí.
  const blokovano = bezZaznamu.length + bezData.length + dlouhe.length > 0 || dlouheRazitko || dlouhaAdresa || bezPisma
  pole('tisk').disabled = blokovano
  document.body.classList.toggle('blokovano', blokovano)
  document.documentElement.style.setProperty('--posun-x', `${posun[0]}mm`)
  document.documentElement.style.setProperty('--posun-y', `${posun[1]}mm`)
}

pole('prichute').innerHTML = MOSTY.map(m => `
  <tr>
    <th scope="row"><i style="background:${m.barva}"></i>${esc(m.id)}</th>
    <td><input type="number" min="0" max="999" inputmode="numeric" data-most="${esc(m.id)}" data-pole="5 l" value="${stav[m.id]['5 l']}" aria-label="${esc(m.id)}, 5 l, počet etiket"></td>
    <td><input type="number" min="0" max="999" inputmode="numeric" data-most="${esc(m.id)}" data-pole="3 l" value="${stav[m.id]['3 l']}" aria-label="${esc(m.id)}, 3 l, počet etiket"></td>
    <td><input class="datum" type="text" placeholder="30. 4. 2027" maxlength="12" autocomplete="off" data-most="${esc(m.id)}" data-pole="datum" aria-label="${esc(m.id)}, 3 l, minimální trvanlivost do"></td>
  </tr>`).join('')

// Razítko a nastavení tiskárny se pamatují v prohlížeči. Počty a data patří k jednomu tisku.
function ulozit() {
  try {
    localStorage.setItem('etikety', JSON.stringify({
      ...Object.fromEntries(['razitko', 'posunX', 'posunY'].map(id => [id, pole(id).value])),
      cernobile: pole('cernobile').checked,
    }))
  } catch { /* soukromé okno */ }
}

document.querySelector('.ovladani').addEventListener('input', e => {
  const { most, pole: co } = e.target.dataset
  if (most) stav[most][co] = co === 'datum' ? e.target.value : cislo(e.target.value, 0, 999)
  ulozit()
  vykreslit()
})
pole('tisk').addEventListener('click', () => window.print())

try {
  const ulozene = JSON.parse(localStorage.getItem('etikety')) || {}
  for (const id of ['razitko', 'posunX', 'posunY']) if (ulozene[id]) pole(id).value = ulozene[id]
  pole('cernobile').checked = !!ulozene.cernobile
} catch { /* nic uloženého */ }

vykreslit()
// Po načtení písma znovu všechno: do té doby tisk čeká a záložní písmo by falešně hlásilo dlouhé řádky.
document.fonts.load('700 20.5pt "Source Sans 3"', 'Červený').then(vykreslit)
fetch('img/logo/znak-jednobarevny.svg').then(r => (r.ok ? r.text() : '')).then(svg => {
  znak = svg.replace(/\s(width|height)="[^"]*"/g, '').replace(/fill="[^"]*"/g, 'fill="currentColor"')
  vykreslit()
}).catch(() => {})
