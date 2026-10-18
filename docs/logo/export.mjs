// Ovocnářství Holub – logo „H-jablko“: rastrové exporty a list se specifikací (spouštět po build.mjs).
//   node export.mjs  → logo-512.png (znak na průhledném pozadí, JSON-LD), apple-touch-icon.png (180 px), specifikace.png
// Potřebuje Microsoft Edge (headless).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const EDGE = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const rd = n => fs.readFileSync(path.join(DIR, n), 'utf8')
const inl = (n, attrs) => rd(n).replace(/ width="[^"]+" height="[^"]+"/, ' ' + attrs)
const vb = n => rd(n).match(/viewBox="([^"]+)"/)[1].split(' ').map(Number)

function shot(html, out, w, h, transparent = false) {
  const tmp = path.join(os.tmpdir(), `logo-export-${process.pid}.html`), prof = path.join(os.tmpdir(), `logo-export-edge-${process.pid}`)
  fs.writeFileSync(tmp, html)
  execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--user-data-dir=${prof}`,
    ...(transparent ? ['--default-background-color=00000000'] : []), `--screenshot=${path.join(DIR, out)}`, `--window-size=${w},${h}`, pathToFileURL(tmp).href],
  { stdio: 'ignore', timeout: 60000 })
  fs.rmSync(tmp, { force: true }); fs.rmSync(prof, { recursive: true, force: true })
  console.log(fs.existsSync(path.join(DIR, out)) ? 'OK ' + out : 'CHYBA ' + out)
}
const page = (body, bg = 'transparent') => `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:${bg}}</style>${body}`

// 1) logo-512.png – znak, 8 % okraj, průhledné pozadí
shot(page(`<div style="width:512px;height:512px;display:flex;align-items:center;justify-content:center">${inl('symbol.svg', 'style="width:430px;height:430px"')}</div>`), 'logo-512.png', 512, 512, true)
// 2) apple-touch-icon.png – 180 px, plný čtverec (iOS si rohy zaobluje samo)
shot(page(inl('mark.svg', 'width="180" height="180" style="display:block"'), '#f8f5ef'), 'apple-touch-icon.png', 180, 180)

// 3) specifikace.png – ochranná zóna, minimální velikosti, barvy, optické velikosti
const [, , pw, ph] = vb('primary.svg'), m = 3, H = ph - 2 * m, x = H / 4 // x = ¼ výšky loga
const S = 2.6 // měřítko náhledu
const zone = `<svg width="${(pw - 2 * m + 2 * x) * S + 2}" height="${(H + 2 * x) * S + 2}" viewBox="${m - x - 0.4} ${m - x - 0.4} ${pw - 2 * m + 2 * x + 0.8} ${H + 2 * x + 0.8}">
<rect x="${m - x}" y="${m - x}" width="${pw - 2 * m + 2 * x}" height="${H + 2 * x}" fill="none" stroke="#8c2f2b" stroke-width=".35" stroke-dasharray="1.6 1.2"/>
<rect x="${m}" y="${m}" width="${pw - 2 * m}" height="${H}" fill="none" stroke="#b9b1a3" stroke-width=".25"/>
${rd('primary.svg').replace(/^<svg[^>]*>/, '').replace('</svg>', '')}
<g fill="#8c2f2b" font-family="Segoe UI, sans-serif" font-size="5"><text x="${m - x / 2}" y="${m + H / 2 + 1.7}" text-anchor="middle">x</text><text x="${pw - m + x / 2}" y="${m + H / 2 + 1.7}" text-anchor="middle">x</text><text x="${pw / 2}" y="${m - x / 2 + 1.7}" text-anchor="middle">x</text><text x="${pw / 2}" y="${m + H + x / 2 + 1.7}" text-anchor="middle">x</text></g></svg>`
const sw = (hex, name, rgb, use, dark) => `<div class="sw"><div class="chip" style="background:${hex};${dark ? '' : 'border:1px solid #dfd7c9'}"></div><b>${name}</b><span>${hex.toUpperCase()} · RGB ${rgb}</span><span>${use}</span></div>`
const html = page(`<style>
body{width:1400px;background:#fff;font:15px/1.45 "Segoe UI",Arial,sans-serif;color:#1d231c}
h1{margin:0;padding:18px 28px;background:#1d231c;color:#fff;font-size:20px}
.sec{padding:24px 28px;border-bottom:1px solid #dfd7c9;display:flex;gap:40px;align-items:center}
.lab{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#636b5f;margin-bottom:8px}
.col{display:flex;flex-direction:column;gap:6px}.row{display:flex;gap:28px;align-items:flex-end}
.sw{display:flex;flex-direction:column;width:200px;font-size:13px}.sw b{font-size:15px;margin-top:6px}.chip{height:64px;border-radius:6px}
small{color:#636b5f}
</style><h1>H-jablko · specifikace</h1>
<div class="sec paper" style="background:#f8f5ef">${zone}<div class="col" style="max-width:420px"><div class="lab">Ochranná zóna</div>
Kolem loga nechte volné místo aspoň <b>x = ¼ výšky loga</b> (v liště 44 px tedy 11 px). Do zóny nesmí zasahovat text, okraj stránky ani jiné grafické prvky.
<small>Logo nedeformujte, neotáčejte, nepřebarvujte mimo uvedené varianty a nepřidávejte stíny ani obrysy.</small></div></div>
<div class="sec"><div class="col"><div class="lab">Minimální velikosti</div><div class="row">
<div class="col">${inl('primary.svg', 'height="36"')}<small>Logo s popiskem: od 36 px / 10 mm výšky</small></div>
<div class="col">${inl('compact.svg', 'height="24"')}<small>Kompaktní (bez popisku): od 24 px / 7 mm</small></div>
<div class="col">${inl('mark.svg', 'width="16" height="16"')}<small>Znak: od 16 px / 5 mm</small></div>
<div class="col">${inl('stacked.svg', 'height="72"')}<small>Na výšku: od 25 mm výšky</small></div></div></div>
<div class="col" style="max-width:560px"><div class="lab">Kdy kterou verzi</div><div><b>primary / reverse</b> – lišta a patička webu, e-shop, ceník, dokumenty<br><b>stacked</b> – štítky moštů, bedýnky, plakát<br><b>compact</b> – výška pod 36 px (jen znak + Holub)<br><b>mono / reverse-mono</b> – jednobarevný tisk: razítko, flexotisk na kraft, tmavé bedýnky<br><b>primary-de</b> – stránka pro rakouské pálenice (popisek OBSTBAU – schválí majitel)<br><b>mark / apple-touch-icon / mark-maskable</b> – favicon, ikona na plochu, PWA</div></div></div>
<div class="sec" style="align-items:flex-start"><div class="col"><div class="lab">Barvy (z palety webu)</div><div class="row" style="align-items:flex-start">
${sw('#8c2f2b', 'Berry', '140 47 43', 'jablko', 1)}${sw('#2f5a33', 'Leaf', '47 90 51', 'lístek, písmo', 1)}${sw('#f8f5ef', 'Paper', '248 245 239', 'podklad, inverze')}${sw('#1d231c', 'Ink', '29 35 28', 'jednobarevná verze', 1)}${sw('#a3bf8c', 'Tón lístku', '163 191 140', 'jen lístek v inverzi', 1)}</div>
<small style="margin-top:8px">CMYK a Pantone určí tiskárna podle nátisku na konkrétní papír (natíraný / kraft); hodnoty HEX jsou závazné pro web.</small></div></div>
<div class="sec"><div class="col"><div class="lab">Dvě optické velikosti znaku</div><div class="row">
<div class="col">${inl('symbol.svg', 'height="150"')}<small>symbol.svg – hlavní kresba (logo, tisk, ≥ 48 px)</small></div>
<div class="col">${inl('mark.svg', 'width="150" height="150"')}<small>mark.svg – favicon a ikona (16–180 px)</small></div>
<div class="col">${inl('mark.svg', 'width="32" height="32"')} ${inl('mark.svg', 'width="16" height="16"')}</div></div></div>
<div class="col" style="max-width:520px">mark.svg je kresba upravená pro pixelovou mřížku: drážky i příčka H mají při 16 px přesně 2 px a hrany leží na celých pixelech, stopka je silnější a do jamky zasahuje méně, lístek je o 9 % větší. Příčka je v obou kresbách ve stejné výšce. Pro velké použití vždy symbol.svg.</div></div>
<div class="sec" style="border:0"><div class="col"><div class="lab">Konstrukce</div>Obrys jablka je jeden hladký spline (plynulá křivost, bez skoků mezi oblouky). Drážky jsou rovné a rovnoběžné, jejich šířka = dřík H. Spodní hrana příčky jablka lícuje ve vodorovném logu se spodní hranou příčky H ve slově Holub; spodek jablka sedí na účaří (s optickým přesahem 0,6 %), vrch lístku na vrchu diakritiky. Písmo: Newsreader 600 (Holub, ručně dokernováno, zkrácené dotahy l a b, kratší ostruha b), Source Sans 3 600 (popisky). Vše je v křivkách; zdroj: build.mjs.</div></div>`, '#fff')
shot(html, 'specifikace.png', 1400, 1345)
