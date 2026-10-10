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

// Záhlaví v barvě loga: logo jako znak, vedle nadpis strany.
const zahlavi = (nadpis, podnadpis) => `
  <header class="pruh">
    <img src="img/logo.png" alt="${esc(k.jmeno)}" class="logo">
    <div><h1>${esc(nadpis)}</h1><p>${esc(podnadpis)}</p></div>
  </header>`

// ---------- strana 1: mošty ----------
// Ceny jsou po hladinách (data.js: skupiny) – každá cena je jednou a vedle ní příchutě, které ji mají.
const VELIKOSTI = [['5l', 'cena5l', '5 l', 20], ['3l', 'cena3l', '3 l', 13]]
// Bag-in-box: krabice zpředu a trochu shora, s úchytem a kohoutkem; přední stěna 5 l je vyšší než 3 l.
const krabice = (popis, h) => {
  const y = 6, dno = y + h
  return `<span class="krabice"><svg viewBox="0 0 30 ${dno + 3}" aria-hidden="true">
  <path d="M2 ${y}l6-5h20l-6 5z" class="vrch"/><path d="M22 ${y}l6-5v${h}l-6 5z" class="bok"/>
  <rect x="2" y="${y}" width="20" height="${h}" class="cela"/>
  <rect x="8" y="${y + 2}" width="8" height="2" rx="1" class="uchyt"/>
  <circle cx="12" cy="${dno - 3.2}" r="1.9" class="kohout"/><rect x="11.2" y="${dno - 2}" width="1.6" height="4" class="kohout"/>
</svg>${popis}</span>`
}
const nazevPrichute = p => bezEmoji(p.nazev).replace(/^čisté jablko$/i, 'Jablko')
// „Mrkev (jen 5 l)“, když je vyprodaná jedna velikost; vyprodaná příchuť přeškrtnutá.
const prichut = p => {
  if (p.dostupne === false) return `<s>${esc(nazevPrichute(p))}</s>`
  const zbyva = VELIKOSTI.filter(([v]) => !p.vyprodano?.includes(v))
  return `<span>${esc(nazevPrichute(p))}${zbyva.length === 1 ? ` <small>jen ${zbyva[0][2]}</small>` : ''}</span>`
}
// Cena hladiny je přeškrtnutá, jen když danou velikost nemá žádná příchuť.
const ceny = sk => VELIKOSTI.map(([v, klic]) => {
  const nikdo = sk.polozky.every(p => p.dostupne === false || p.vyprodano?.includes(v))
  return `<span class="cena${nikdo ? ' pryc' : ''}">${sk[klic]}</span>`
}).join('')
const hladina = (sk, trida = '') => `
  <div class="hladina${trida}"><p class="prichute">${sk.polozky.map(prichut).join('<i> · </i>')}</p>${ceny(sk)}</div>`
const [ciste, ...ochucene] = OBSAH.mosty.skupiny
const mosty = `
  <div class="hladina hlava"><p></p>${VELIKOSTI.map(([, , popis, v]) => krabice(popis, v)).join('')}</div>
  ${hladina(ciste, ' ciste')}
  <p class="stitek">Jablko + příchuť</p>
  ${ochucene.map(sk => hladina(sk)).join('')}`

// ---------- strana 2: kalendář sezón ----------
// Plná barva = čerstvá sklizeň (sklizenOd/sklizenDo), světlejší = prodej ze skladu (zbytek sezóny).
const MESICE = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro']
const BARVY = { red: '#a8433a', orange: '#d38b35', purple: '#6c4a80', yellow: '#c9a227', green: '#4f7d3a' }
const dnuVMesici = m => new Date(2025, m, 0).getDate()
// [měsíc, den] → poloha v roce 0–1 (začátek dne; konec = true → konec dne)
const poloha = ([m, d], konec = false) => (m - 1 + (d - (konec ? 0 : 1)) / dnuVMesici(m)) / 12
const useky = (od, doo) => {
  if (!od || !doo) return [[0, 1]]
  const a = poloha(od), b = poloha(doo, true)
  return a <= b ? [[a, b]] : [[a, 1], [0, b]] // přes Nový rok
}
const pas = (seznam, barva, trida) => seznam.map(([a, b]) =>
  `<span class="pas ${trida}" style="left:${(a * 100).toFixed(2)}%;width:${((b - a) * 100).toFixed(2)}%;--barva:${barva}"></span>`).join('')
const mrizka = MESICE.map(() => '<span></span>').join('')
const dnesX = (poloha([ted.getMonth() + 1, ted.getDate()]) * 100).toFixed(2)
const radekSezony = (nazev, kdy, prodej, sklizen, barva) => `
  <div class="sezona"><div><span class="nazev">${esc(nazev)}</span><span class="kdy">${esc(kdy)}</span></div>
    <div class="draha"><div class="mrizka">${mrizka}</div>${pas(prodej, barva, 'sklad')}${pas(sklizen, barva, 'sklizen')}<span class="dnes" style="left:${dnesX}%"></span></div></div>`
const kalendar = `
  <div class="legenda"><span><i class="sklizen"></i>čerstvá sklizeň</span><span><i class="sklad"></i>ze skladu</span><span><i class="dnes"></i>dnes ${dnes}</span></div>
  <div class="sezona hlava"><div></div><div class="draha"><div class="mesice">${MESICE.map(m => `<span>${m}</span>`).join('')}</div></div></div>
  ${OBSAH.ovoce.map(o => radekSezony(o.nazev, o.sezona, useky(o.sezonaOd, o.sezonaDo),
    o.sklizenOd ? useky(o.sklizenOd, o.sklizenDo) : useky(o.sezonaOd, o.sezonaDo), BARVY[o.barva] || '#2f5a33')).join('')}
  ${radekSezony('Mošty', 'celoročně', [[0, 1]], [[0, 1]], '#2f5a33')}`
const nabidka = Object.entries(OBSAH.aktuality.nabidka || {})
  .map(([druh, odrudy]) => `<b>${esc(druh)}</b> ${esc(odrudy.join(', ') || 'všechny odrůdy')}`).join('<i> · </i>')

// ---------- kontakt + QR kód na e-shop (na obou stranách) ----------
// Odkazy fungují na obrazovce a v PDF (Tisk → Uložit jako PDF); na papíře vypadají jako text.
const odkaz = (href, text) => `<a href="${esc(href)}">${text}</a>`
const tel = (cislo, text = esc(cislo)) => odkaz(`tel:${cislo.replace(/\s/g, '')}`, text)
const ucet = url => new URL(url).pathname.replaceAll('/', '') // „OvoceHolub“, „ovocnarstviholub“
const kontakt = `
  <footer class="kontakt">
    <dl>
      <dt>Adresa</dt><dd>${odkaz(k.mapa, `${esc(k.adresa)}, ${esc(k.mesto)} (u Netolic)`)}</dd>
      <dt>Telefon</dt><dd>${tel(k.tel1, `<b>${esc(bezPredvolby(k.tel1))}</b>`)} · ${tel(k.tel2, esc(bezPredvolby(k.tel2)))}</dd>
      <dt>DE · EN</dt><dd>${tel(k.telDE)}</dd>
      <dt>E-mail</dt><dd>${odkaz(`mailto:${k.email}`, esc(k.email))}</dd>
      <dt>Sledujte</dt><dd>${odkaz(k.facebook, `<span class="sit">Facebook</span> ${esc(ucet(k.facebook))}`)} · ${odkaz(k.instagram, `<span class="sit">Instagram</span> @${esc(ucet(k.instagram))}`)}</dd>
    </dl>
    <a class="qr" href="${ESHOP}"><span class="qr-kod"></span><span class="popis">Objednat online<br><b>ovoce-holub.cz</b></span></a>
  </footer>`

document.getElementById('cenik').innerHTML = `
  <section class="strana">
    ${zahlavi('Domácí mošty', 'Z jablek z našeho sadu, bez přidaného cukru a konzervantů')}
    <div class="obsah">
      <div class="mosty">${mosty}</div>
      <p class="pozn">Ceny v Kč za balení bag-in-box včetně obalu a DPH · ceník ze dne ${dnes}</p>
    </div>
    ${kontakt}
  </section>
  <section class="strana">
    ${zahlavi('Kdy máme ovoce', 'Sezóna se podle počasí může o pár dní posunout')}
    <div class="obsah">
      <div class="kalendar">${kalendar}</div>
      ${nabidka ? `<p class="nabidka"><span class="stitek">Právě nabízíme</span>${nabidka}</p>` : ''}
    </div>
    ${kontakt}
  </section>`

// Velikost papíru: strany jsou navržené pro A5, A4 a A3 jsou jen zvětšené (řada A má stejný poměr stran).
// Volba se pamatuje v prohlížeči; jde ji dát i do adresy (cenik.html?format=a4).
const FORMATY = { A5: 1, A4: Math.SQRT2, A3: 2 }
const stylStrany = document.head.appendChild(document.createElement('style'))
const nastavitFormat = f => {
  if (!FORMATY[f]) f = 'A5'
  document.documentElement.style.setProperty('--mira', FORMATY[f])
  stylStrany.textContent = `@page { size: ${f} portrait; margin: 0; }`
  document.getElementById('papir').textContent = f
  document.querySelector(`input[name="format"][value="${f}"]`).checked = true
  try { localStorage.setItem('cenik-format', f) } catch { /* soukromý režim */ }
}
document.querySelectorAll('input[name="format"]').forEach(i => i.addEventListener('change', () => nastavitFormat(i.value)))
let ulozeny = null
try { ulozeny = localStorage.getItem('cenik-format') } catch { /* soukromý režim */ }
nastavitFormat(new URLSearchParams(location.search).get('format')?.toUpperCase() || ulozeny || 'A5')

// Kdyby přibyly příchutě nebo ovoce a strana přetekla, obsah se mírně zmenší (nejvýš na 80 %).
document.fonts.ready.then(() => document.querySelectorAll('.strana').forEach(s => {
  const obsah = s.querySelector('.obsah')
  for (let z = 1; s.scrollHeight > s.clientHeight && z > 0.8;) obsah.style.zoom = (z -= 0.02).toFixed(2)
}))

// QR kód se načte až v prohlížeči (stejná knihovna jako QR platba v e-shopu); bez něj zůstane jen popisek.
import('qrcode')
  .then(({ default: QRCode }) => QRCode.toString(ESHOP, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1d231c', light: '#0000' } }))
  .then(svg => document.querySelectorAll('.qr-kod').forEach(el => { el.innerHTML = svg }))
  .catch(() => document.querySelectorAll('.qr').forEach(el => el.classList.add('bez-kodu')))
