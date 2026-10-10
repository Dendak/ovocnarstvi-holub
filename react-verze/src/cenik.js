// Ceník k tisku (cenik.html): mošty a kalendář sezón ovoce na dvě strany A5, s kontaktem a QR kódem na e-shop.
// Vše se bere z data.js, takže tištěný ceník odpovídá webu a e-shopu.
import { OBSAH } from './data.js'

const k = OBSAH.kontakt
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const ted = new Date()
const dnes = ted.toLocaleDateString('cs-CZ')
const bezEmoji = s => s.replace(/\p{Extended_Pictographic}️?\s*/gu, '').trim()
const bezPredvolby = tel => tel.replace(/^\+420\s*/, '')
const ESHOP = 'https://ovoce-holub.cz/eshop/'

const zahlavi = (nadpis, podnadpis) => `
  <header class="zahlavi">
    <img src="img/logo.png" alt="${esc(k.jmeno)}" class="logo">
    <h1>${esc(nadpis)}</h1>
    <p class="podnadpis">${esc(podnadpis)}</p>
  </header>`

// ---------- strana 1: mošty ----------
// Skupiny se stejnou cenou oddělené linkou; „Čisté jablko“ je samo, ochucené pod nadpisem „Jablko +“.
const VELIKOSTI = [['5l', 'cena5l', '5 l'], ['3l', 'cena3l', '3 l']]
const radekMostu = (p, sk) => {
  const vyprodano = p.dostupne === false
  const nazev = bezEmoji(p.nazev).replace(/^čisté jablko$/i, 'Jablko')
  const ceny = VELIKOSTI.map(([v, klic]) =>
    `<span class="cena${vyprodano || p.vyprodano?.includes(v) ? ' pryc' : ''}">${sk[klic]}</span>`).join('')
  return `<div class="radek${vyprodano ? ' vyprodano' : ''}"><span class="nazev">${esc(nazev)}</span><span class="tecky"></span>${ceny}</div>`
}
const [ciste, ...ochucene] = OBSAH.mosty.skupiny
const mosty = `
  <div class="radek hlava"><span></span><span></span>${VELIKOSTI.map(([, , l]) => `<span class="cena">${l}</span>`).join('')}</div>
  <div class="skupina">${ciste.polozky.map(p => radekMostu(p, ciste)).join('')}</div>
  <p class="stitek">Jablko +</p>
  ${ochucene.map(sk => `<div class="skupina">${sk.polozky.map(p => radekMostu(p, sk)).join('')}</div>`).join('')}`

// ---------- strana 2: kalendář sezón ----------
const MESICE = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro']
const BARVY = { red: '#a8433a', orange: '#d38b35', purple: '#6c4a80', yellow: '#c9a227', green: '#4f7d3a' }
const dnuVMesici = m => new Date(2025, m, 0).getDate()
// [měsíc, den] → poloha v roce 0–1 (začátek dne; konec = true → konec dne)
const poloha = ([m, d], konec = false) => (m - 1 + (d - (konec ? 0 : 1)) / dnuVMesici(m)) / 12
const useky = o => {
  if (!o.sezonaOd || !o.sezonaDo) return [[0, 1]]
  const od = poloha(o.sezonaOd), doo = poloha(o.sezonaDo, true)
  return od <= doo ? [[od, doo]] : [[od, 1], [0, doo]] // přes Nový rok
}
const pas = (seznam, barva) => seznam.map(([a, b]) =>
  `<span class="pas" style="left:${(a * 100).toFixed(2)}%;width:${((b - a) * 100).toFixed(2)}%;background:${barva}"></span>`).join('')
const mrizka = MESICE.map(() => '<span></span>').join('')
const dnesX = (poloha([ted.getMonth() + 1, ted.getDate()]) * 100).toFixed(2)
const radekSezony = (nazev, kdy, useky, barva) => `
  <div class="sezona"><div><span class="nazev">${esc(nazev)}</span><span class="kdy">${esc(kdy)}</span></div>
    <div class="draha"><div class="mrizka">${mrizka}</div>${pas(useky, barva)}<span class="dnes" style="left:${dnesX}%"></span></div></div>`
const kalendar = `
  <div class="sezona hlava"><div></div><div class="draha"><div class="mesice">${MESICE.map(m => `<span>${m}</span>`).join('')}</div>
    <span class="dnes-popis" style="left:${dnesX}%">dnes</span></div></div>
  ${OBSAH.ovoce.map(o => radekSezony(o.nazev, o.sezona, useky(o), BARVY[o.barva] || '#2f5a33')).join('')}
  ${radekSezony('Mošty', 'celoročně', [[0, 1]], '#2f5a33')}`
const nabidka = Object.entries(OBSAH.aktuality.nabidka || {})
  .map(([druh, odrudy]) => `<b>${esc(druh)}</b> ${esc(odrudy.join(', ') || 'všechny odrůdy')}`).join(' · ')

// ---------- kontakt + QR kód na e-shop (na obou stranách) ----------
// Odkazy fungují na obrazovce a v PDF (Tisk → Uložit jako PDF); na papíře vypadají jako text.
const odkaz = (href, text) => `<a href="${esc(href)}">${text}</a>`
const tel = (cislo, text = esc(cislo)) => odkaz(`tel:${cislo.replace(/\s/g, '')}`, text)
const instagram = new URL(k.instagram).pathname.replaceAll('/', '')
const kontakt = `
  <footer class="kontakt">
    <dl>
      <dt>Adresa</dt><dd>${odkaz(k.mapa, `${esc(k.adresa)}, ${esc(k.mesto)} (u Netolic)`)}</dd>
      <dt>Telefon</dt><dd>${tel(k.tel1, `<b>${esc(bezPredvolby(k.tel1))}</b>`)} · ${tel(k.tel2, esc(bezPredvolby(k.tel2)))}</dd>
      <dt>DE · EN</dt><dd>${tel(k.telDE)}</dd>
      <dt>E-mail</dt><dd>${odkaz(`mailto:${k.email}`, esc(k.email))}</dd>
      <dt>Sledujte</dt><dd>${odkaz(k.facebook, esc(k.facebook.replace(/^https?:\/\/(www\.)?/, '')))} · ${odkaz(k.instagram, `ig @${esc(instagram)}`)}</dd>
    </dl>
    <a class="qr" href="${ESHOP}"><span class="qr-kod"></span><span class="popis">E-shop s rozvozem<br><b>ovoce-holub.cz</b></span></a>
  </footer>`

document.getElementById('cenik').innerHTML = `
  <section class="strana">
    ${zahlavi('Domácí mošty', 'Z jablek z našeho sadu, bez přidaného cukru a konzervantů')}
    <div class="mosty">${mosty}</div>
    <p class="pozn">Ceny v Kč za balení bag-in-box včetně obalu a DPH · ceník ze dne ${dnes}</p>
    ${kontakt}
  </section>
  <section class="strana">
    ${zahlavi('Kdy máme ovoce', 'Sezóna se může podle počasí o pár dní posunout')}
    <div class="kalendar">${kalendar}</div>
    ${nabidka ? `<p class="nabidka"><span class="stitek">Právě teď · ${dnes}</span>${nabidka}</p>` : ''}
    ${kontakt}
  </section>`

// QR kód se načte až v prohlížeči (stejná knihovna jako QR platba v e-shopu); bez něj zůstane jen popisek.
import('qrcode')
  .then(({ default: QRCode }) => QRCode.toString(ESHOP, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1d231c', light: '#0000' } }))
  .then(svg => document.querySelectorAll('.qr-kod').forEach(el => { el.innerHTML = svg }))
  .catch(() => document.querySelectorAll('.qr').forEach(el => el.classList.add('bez-kodu')))
