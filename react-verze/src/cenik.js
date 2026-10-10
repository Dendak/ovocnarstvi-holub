// Ceník k tisku (cenik.html): mošty a dostupnost ovoce na dvě strany A5, s kontaktem na každé straně.
// Vše se bere z data.js, takže tištěný ceník odpovídá webu a e-shopu.
import { OBSAH } from './data.js'

const k = OBSAH.kontakt
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const dnes = new Date().toLocaleDateString('cs-CZ')
const bezEmoji = s => s.replace(/\p{Extended_Pictographic}️?\s*/gu, '').trim()
// „Čisté jablko“ → „Jablko“, „Hruška“ → „Jablko + Hruška“, „Vánoční mošt“ zůstane.
const nazevMostu = nazev => {
  const n = bezEmoji(nazev)
  if (/^čisté jablko$/i.test(n)) return 'Jablko'
  return /mošt/i.test(n) ? n : `Jablko + ${n}`
}
const bezPredvolby = tel => tel.replace(/^\+420\s*/, '')

const VELIKOSTI = [['5l', 'cena5l'], ['3l', 'cena3l']]
const mosty = OBSAH.mosty.skupiny.map(sk => `<tbody>${sk.polozky.map(p => {
  const vyprodane = p.dostupne === false
  const ceny = VELIKOSTI.map(([v, klic]) => {
    const pryc = vyprodane || p.vyprodano?.includes(v)
    return `<td class="cena${pryc ? ' pryc' : ''}">${sk[klic]},-</td>`
  }).join('')
  return `<tr><td${vyprodane ? ' class="pryc"' : ''}>${esc(nazevMostu(p.nazev))}</td>${ceny}</tr>`
}).join('')}</tbody>`).join('')

const ovoce = OBSAH.ovoce.map(o => `<tr><td>${esc(o.nazev)}</td><td>${esc(o.sezona)}</td></tr>`).join('')

const instagram = new URL(k.instagram).pathname.replaceAll('/', '')
const kontakt = `
  <dl class="kontakt">
    <dt>Adresa</dt><dd>${esc(k.adresa)}, ${esc(k.mesto)}</dd>
    <dt>Telefon</dt><dd><b>${esc(bezPredvolby(k.tel1))}</b>, ${esc(bezPredvolby(k.tel2))}</dd>
    <dt>Deutsch · English</dt><dd>${esc(k.telDE)}</dd>
    <dt>E-mail</dt><dd>${esc(k.email)}</dd>
    <dt>Web</dt><dd>ovoce-holub.cz</dd>
    <dt>Facebook</dt><dd>${esc(k.facebook.replace(/^https?:\/\/(www\.)?/, ''))}</dd>
    <dt>Instagram</dt><dd>${esc(instagram)}</dd>
  </dl>`

document.getElementById('cenik').innerHTML = `
  <section class="strana">
    <h1>${esc(k.jmeno)}</h1>
    <table>
      <thead><tr><th>Mošty – ${dnes}</th><th class="cena">5 l</th><th class="cena">3 l</th></tr></thead>
      ${mosty}
    </table>
    <p class="pozn">Ceny v Kč za balení bag-in-box včetně obalu a DPH.</p>
    ${kontakt}
  </section>
  <section class="strana">
    <h1>${esc(k.jmeno)}</h1>
    <table>
      <thead><tr><th>Ovoce – ${dnes}</th><th>Dostupnost</th></tr></thead>
      <tbody>${ovoce}<tr><td>Mošty</td><td>celoročně</td></tr></tbody>
    </table>
    ${kontakt}
  </section>`
