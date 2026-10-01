/* global process -- spouští se v Node */
// Zmenšeniny fotek pro web: ke každé img/<složka>/<jméno>.jpg|jpeg|png vytvoří
//   img/<složka>/_w480/<jméno>.webp a img/<složka>/_w960/<jméno>.webp  (šířka nejvýš 480 / 960 px, WebP).
// Web je používá v srcset (src/data.js imgSrcSet) a sestavení webu bez nich skončí chybou (vite.config.js).
//
// Použití (ve složce react-verze):  node scripts/zmensit-fotky.mjs          – vytvoří chybějící nebo zastaralé
//                                    node scripts/zmensit-fotky.mjs --vse    – vytvoří všechny znovu
//                                    node scripts/zmensit-fotky.mjs --kontrola – jen vypíše, co chybí
// Bez dalších balíčků: fotky zmenší Google Chrome (bez okna). Jiná cesta k Chrome: proměnná CHROME.
import { spawn, execSync } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const IMG = path.join(KOREN, 'img')
const SIRKY = [480, 960]
const KVALITA = 0.78
const FOTKA = /\.(jpe?g|png)$/i
const TYPY = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(p => fs.existsSync(p))
const pockat = ms => new Promise(r => setTimeout(r, ms))

function fotky(slozka, out = []) {
  for (const e of fs.readdirSync(slozka, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!/^_w\d+$/.test(e.name)) fotky(path.join(slozka, e.name), out) }
    else if (FOTKA.test(e.name)) out.push(path.join(slozka, e.name))
  }
  return out
}
const zmensenina = (f, w) => path.join(path.dirname(f), `_w${w}`, path.basename(f).replace(/\.[^.]+$/, '') + '.webp')
const adresa = f => '/' + path.relative(KOREN, f).split(path.sep).map(encodeURIComponent).join('/')
const zastarale = f => SIRKY.some(w => !fs.existsSync(zmensenina(f, w)) || fs.statSync(zmensenina(f, w)).mtimeMs < fs.statSync(f).mtimeMs)

// Fotky z repozitáře pro Chrome (jen čtení, jen 127.0.0.1).
function server() {
  return new Promise(hotovo => {
    const s = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x')
      if (u.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<!doctype html><title>fotky</title>'); return }
      const f = path.normalize(path.join(KOREN, decodeURIComponent(u.pathname)))
      if (!f.startsWith(IMG + path.sep) || !TYPY[path.extname(f).toLowerCase()]) { res.writeHead(404); res.end(); return }
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return }
        res.writeHead(200, { 'Content-Type': TYPY[path.extname(f).toLowerCase()], 'Cache-Control': 'no-store' })
        res.end(data)
      })
    })
    s.listen(0, '127.0.0.1', () => hotovo(s))
  })
}

async function chrome() {
  const port = 9800 + Math.floor(Math.random() * 150)
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'zmensit-fotky-'))
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${profil}`, 'about:blank'], { stdio: 'ignore' })
  let ws
  for (let i = 0; i < 60 && !ws; i++) {
    await pockat(250)
    try { ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page')?.webSocketDebuggerUrl } catch { /* ještě startuje */ }
  }
  if (!ws) { proc.kill(); throw new Error('Chrome se nespustil') }
  const sock = new WebSocket(ws)
  await new Promise(r => sock.addEventListener('open', r))
  let id = 0
  const cekajici = new Map()
  sock.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && cekajici.has(m.id)) { cekajici.get(m.id)(m); cekajici.delete(m.id) } })
  const poslat = (method, params = {}) => new Promise(r => { const i = ++id; cekajici.set(i, r); sock.send(JSON.stringify({ id: i, method, params })) })
  const spustit = async kod => {
    const r = await poslat('Runtime.evaluate', { expression: kod, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'chyba v Chrome')
    return r.result?.result?.value
  }
  const zavrit = async () => {
    try { await Promise.race([poslat('Browser.close'), pockat(3000)]) } catch { /* už zavřený */ }
    try { sock.close() } catch { /* už zavřený */ }
    await pockat(500)
    if (proc.exitCode === null) { try { execSync(process.platform === 'win32' ? `taskkill /PID ${proc.pid} /T /F` : `kill -9 ${proc.pid}`, { stdio: 'ignore' }) } catch { /* už skončil */ } }
    try { fs.rmSync(profil, { recursive: true, force: true }) } catch { /* nevadí */ }
  }
  return { poslat, spustit, zavrit }
}

// V prohlížeči: fotka (otočená podle EXIF) zmenšená na šířky SIRKY a uložená jako WebP (base64).
const ZMENSIT = `window.__zmensit = async (url, sirky, q) => {
  const blob = await (await fetch(url, { cache: 'no-store' })).blob();
  const cela = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const out = [];
  for (const sirka of sirky) {
    const w = Math.min(sirka, cela.width), h = Math.max(1, Math.round(cela.height * w / cela.width));
    const bmp = w === cela.width ? cela : await createImageBitmap(blob, { imageOrientation: 'from-image', resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
    const c = new OffscreenCanvas(w, h);
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const webp = await c.convertToBlob({ type: 'image/webp', quality: q });
    if (webp.type !== 'image/webp') throw new Error('Chrome neumí WebP');
    const data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(webp) });
    out.push({ w, h, data });
  }
  return out;
}; 1`

const vse = fotky(IMG)
const chybi = vse.filter(f => SIRKY.some(w => !fs.existsSync(zmensenina(f, w))))
if (process.argv.includes('--kontrola')) {
  console.log(chybi.length ? `Bez zmenšenin (${chybi.length}):\n` + chybi.map(f => '  ' + path.relative(KOREN, f)).join('\n') : `Všech ${vse.length} fotek má zmenšeniny.`)
  process.exit(chybi.length ? 1 : 0)
}
const udelat = process.argv.includes('--vse') ? vse : vse.filter(zastarale)
if (!udelat.length) { console.log(`Všech ${vse.length} fotek má aktuální zmenšeniny.`); process.exit(0) }
if (!CHROME) { console.error('Nenašel jsem Google Chrome – cestu k němu zadejte v proměnné CHROME.'); process.exit(1) }

const srv = await server()
const prohlizec = await chrome()
try {
  await prohlizec.poslat('Page.enable')
  await prohlizec.poslat('Page.navigate', { url: `http://127.0.0.1:${srv.address().port}/` })
  await pockat(800)
  await prohlizec.spustit(ZMENSIT)
  for (const f of udelat) {
    const out = await prohlizec.spustit(`__zmensit(${JSON.stringify(adresa(f))}, ${JSON.stringify(SIRKY)}, ${KVALITA})`)
    out.forEach((o, i) => {
      const cil = zmensenina(f, SIRKY[i])
      fs.mkdirSync(path.dirname(cil), { recursive: true })
      fs.writeFileSync(cil, Buffer.from(o.data, 'base64'))
    })
    console.log(`${path.relative(KOREN, f)} → ${out.map(o => `${o.w}×${o.h}`).join(', ')}`)
  }
  const n = udelat.length
  console.log(`Hotovo: ${n} ${n === 1 ? 'fotka' : n < 5 ? 'fotky' : 'fotek'}. Nové soubory v img/**/_w480 a _w960 přidejte do commitu.`)
} finally {
  await prohlizec.zavrit()
  srv.close()
}
process.exit(0)
