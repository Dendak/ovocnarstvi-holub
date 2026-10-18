// Ovocnářství Holub – logo „H-jablko“, finální verze.
//
// Znak: ploché jablko, jehož horní drážka (stopková jamka) a dolní drážka vytvoří v jablku písmeno H (Holub).
// Obrys je jeden hladký uzavřený kubický spline (C2 = plynulá křivost, žádné skoky mezi oblouky), drážky jsou rovné
// a rovnoběžné, příčka H má rovné hrany. Ze stopkové jamky roste stopka a na ní lístek (lístek už nevisí ve vzduchu).
// Příčka jablka lícuje spodní hranou s příčkou H ve slově Holub. Písmo: „Holub“ Newsreader 600 (stejná rodina jako
// nadpisy webu; ručně dokernované, zkrácené dotahy l a b, ostruha b nepřečnívá pod účaří), popisky Source Sans 3 600
// (písmo textů webu). Vše převedeno na křivky, žádné <text>.
//
// Spuštění:  node build.mjs   → primary, reverse, mono, stacked, mark
//            + doplňky: compact (bez popisku), primary-de (OBSTBAU), reverse-mono, mark-green, mark-maskable, symbol, symbol-mono
//            node export.mjs  → logo-512.png, apple-touch-icon.png, specifikace.png
//            volitelně --out složka, --cfg '{"apple":{…},"stem":{…},"leaf":{…}}' pro rychlé porovnání variant
// text2path.mjs leží vedle (jiná cesta: proměnná TEXT2PATH); písma a opentype.js nainstaluje `npm install` v této složce.
// Hotové soubory webu jsou v img/logo/ (přejmenované, viz README.md).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DIR0 = path.dirname(fileURLToPath(import.meta.url))
const T2P = process.env.TEXT2PATH || path.join(DIR0, 'text2path.mjs')
const { textPath } = await import(pathToFileURL(T2P).href)
const ARG = Object.fromEntries(process.argv.slice(2).map((v, i, a) => v.startsWith('--') ? [v.slice(2), a[i + 1]] : null).filter(Boolean))
const DIR = ARG.out ? path.resolve(DIR0, ARG.out) : DIR0
fs.mkdirSync(DIR, { recursive: true })

// ======================= nastavení =======================
// Paleta: berry (jablko), jedna zelená (lístek + písmo), papír. Světlý tón zelené jen pro lístek v inverzi.
const C = { berry: '#8c2f2b', green: '#2f5a33', paper: '#f8f5ef', ink: '#1d231c', forest: '#17241a', tint: '#a3bf8c' }

// Jablko v jednotkách (polovina největší šířky ≈ 41). Pravá polovina obrysu od osy nahoře (dno stopkové jamky,
// skryté v drážce) přes rameno a bok k ose dole. Celý obrys je zrcadlený a prochází body hladkým splinem.
const APPLE = {
  pts: [[0, -28], [7.5, -34.5], [17, -39.6], [29, -38.2], [38.4, -30], [42.8, -17.5], [42.4, -4], [38.8, 9.5], [32.2, 21.6], [23.4, 30.4], [12.4, 35], [0, 36.1]],
  slot: 6.2,          // polovina šířky drážek (stejná nahoře i dole = dříky H)
  bar: [0.1, 12.1],   // příčka H: horní a dolní hrana (12 j. ≈ 16 % výšky jablka, dřív 10 %)
  barH: 12,           // výška příčky; poloha se dopočítá tak, aby spodní hrana příčky lícovala se spodní hranou příčky H ve slově Holub
  barAlign: true,
  rc: 1.6,            // zaoblení vnitřních rohů drážek u příčky
}
// Stopka: vyrůstá ze stopkové jamky (spodek zanořený pod úroveň horních rohů drážky), mírně nakloněná doprava.
const STEM = { w: 5.2, depth: 4.5, rise: 11, bend: 12, cap: 'round' } // šířka, zanoření do jamky, výška nad jamkou, ohyb°, vršek
// Lístek vyrůstá z boku stopky (báze uvnitř stopky), mezi lístkem a ramenem jablka zůstává mezera.
const LEAF = { at: 0.55, len: 22, angle: -28, k1: 0.37, k2: 0.25 } // báze na stopce (0–1), délka, úhel osy, prohnutí horní/dolní hrany

const WORD = { font: 'newsreader', weight: 600, text: 'Holub', tracking: 0,
  kern: { Ho: -0.035, ol: 0.004, lu: -0.006, ub: 0.0 } } // ruční doladění prokladu (em, k výchozímu kerningu písma)
const DESC = { font: 'source-sans-3', weight: 600, text: 'OVOCNÁŘSTVÍ', tracking: 0.12, kern: { TV: -0.03, VÍ: -0.02, OV: -0.01, VO: -0.01 } }
const DESC_DE = { ...DESC, text: 'OBSTBAU', kern: {} }
const PLACE = { font: 'source-sans-3', weight: 600, text: 'KRTELY U NETOLIC', tracking: 0.14, kern: { TE: -0.01, LY: -0.02, TO: -0.01 } }
const LAYOUT = { gap: 0.2, descGap: 0.09, margin: 3, overshoot: 0.006 } // mezera znak–text (× výška), popisek–Holub (× výška), okraj viewBoxu
if (ARG.cfg) { const c = JSON.parse(ARG.cfg); for (const [k, o] of Object.entries({ apple: APPLE, stem: STEM, leaf: LEAF, word: WORD, desc: DESC, layout: LAYOUT })) Object.assign(o, c[k] || {}) }

// ======================= pomocné =======================
const f = n => { const v = Math.round(n * 100) / 100; return (Object.is(v, -0) ? 0 : v).toString() }
const rad = d => d * Math.PI / 180
const V = (x, y) => ({ x, y })
const add = (a, b, k = 1) => V(a.x + b.x * k, a.y + b.y * k)
const lerp = (a, b, t) => V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)

// Uzavřený interpolační kubický spline (parametrizace délkou tětiv) → kubické Bézierovy segmenty. Spojitá 2. derivace.
function closedSpline(P) {
  const n = P.length
  const h = P.map((p, i) => Math.hypot(P[(i + 1) % n].x - p.x, P[(i + 1) % n].y - p.y))
  const solve = key => {
    const A = Array.from({ length: n }, () => new Array(n).fill(0)), b = new Array(n).fill(0)
    for (let i = 0; i < n; i++) {
      const im = (i - 1 + n) % n, ip = (i + 1) % n
      A[i][im] += h[im]; A[i][i] += 2 * (h[im] + h[i]); A[i][ip] += h[i]
      b[i] = 6 * ((P[ip][key] - P[i][key]) / h[i] - (P[i][key] - P[im][key]) / h[im])
    }
    for (let c = 0; c < n; c++) { // Gauss s výběrem pivota
      let pr = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[pr][c])) pr = r
      ;[A[c], A[pr]] = [A[pr], A[c]];[b[c], b[pr]] = [b[pr], b[c]]
      for (let r = c + 1; r < n; r++) { const k = A[r][c] / A[c][c]; for (let j = c; j < n; j++) A[r][j] -= k * A[c][j]; b[r] -= k * b[c] }
    }
    const M = new Array(n).fill(0)
    for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let j = r + 1; j < n; j++) s -= A[r][j] * M[j]; M[r] = s / A[r][r] }
    return M
  }
  const Mx = solve('x'), My = solve('y')
  const segs = []
  for (let i = 0; i < n; i++) {
    const ip = (i + 1) % n, hi = h[i]
    const d0 = V((P[ip].x - P[i].x) / hi - hi * (2 * Mx[i] + Mx[ip]) / 6, (P[ip].y - P[i].y) / hi - hi * (2 * My[i] + My[ip]) / 6)
    const d1 = V((P[ip].x - P[i].x) / hi + hi * (Mx[i] + 2 * Mx[ip]) / 6, (P[ip].y - P[i].y) / hi + hi * (My[i] + 2 * My[ip]) / 6)
    segs.push([P[i], add(P[i], d0, hi / 3), add(P[ip], d1, -hi / 3), P[ip]])
  }
  return segs
}
const bez = (s, t) => { const a = lerp(s[0], s[1], t), b = lerp(s[1], s[2], t), c = lerp(s[2], s[3], t), d = lerp(a, b, t), e = lerp(b, c, t); return { p: lerp(d, e, t), L: [s[0], a, d, lerp(d, e, t)], R: [lerp(d, e, t), e, c, s[3]] } }
// parametr t, kde segment protne svislici x = X (bisekce; segment je v x monotónní)
function crossX(s, X) {
  let lo = 0, hi = 1; const up = s[3].x > s[0].x
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if ((bez(s, m).p.x < X) === up) lo = m; else hi = m }
  return (lo + hi) / 2
}

// ======================= znak =======================
// Vrací cesty jablka a stopky+lístku v souřadnicích znaku (střed jablka 0,0) a jejich hranice.
function appleH(o = {}) {
  const A = { ...APPLE, ...o.apple }, S = { ...STEM, ...o.stem }, L = { ...LEAF, ...o.leaf }
  const right = A.pts.map(([x, y]) => V(x, y))
  const left = right.slice(1, -1).reverse().map(p => V(-p.x, p.y))
  const segs = closedSpline([...right, ...left])
  const half = segs.slice(0, right.length - 1) // pravá polovina shora dolů
  const h = A.slot
  // oříznutí drážkami: první a poslední segment pravé poloviny přetnout svislicí x = h
  let k0 = half.findIndex(s => s[3].x >= h), k1 = half.findLastIndex(s => s[0].x >= h)
  const sTop = bez(half[k0], crossX(half[k0], h)).R, sBot = bez(half[k1], crossX(half[k1], h)).L
  const R = [sTop, ...half.slice(k0 + 1, k1), sBot]
  const mir = s => [V(-s[3].x, s[3].y), V(-s[2].x, s[2].y), V(-s[1].x, s[1].y), V(-s[0].x, s[0].y)]
  const Lft = R.slice().reverse().map(mir)
  const P = p => `${f(p.x)} ${f(p.y)}`
  const curve = segs => segs.map(s => `C${P(s[1])} ${P(s[2])} ${P(s[3])}`).join('')
  const [ct, cb] = A.bar, rc = A.rc
  const yT = sTop[0].y, yB = sBot[3].y
  const arc = (x, y) => `A${f(rc)} ${f(rc)} 0 0 0 ${f(x)} ${f(y)}`
  const body = `M${P(sTop[0])}${curve(R)}L${f(h)} ${f(cb + rc)}${arc(h - rc, cb)}L${f(-h + rc)} ${f(cb)}${arc(-h, cb + rc)}L${f(-h)} ${f(yB)}` +
    `${curve(Lft)}L${f(-h)} ${f(ct - rc)}${arc(-h + rc, ct)}L${f(h - rc)} ${f(ct)}${arc(h, ct - rc)}Z`
  // Stopka a lístek jsou jeden tvar: stopka je pásek stálé šíře, jehož osa je kruhový oblouk (začíná svisle v ose
  // drážky a ohýbá se doprava o bend°), spodek je zaoblený a zanořený do jamky. Na vršku stopky plynule (G1) navazují
  // obě hrany lístku: levá hrana stopky přechází v horní hranu lístku, pravá v dolní.
  const r = S.w / 2, len = S.depth + S.rise, phi = rad(S.bend)
  const s0 = V(0, yT + S.depth)
  const rot = (q, c, al) => V(c.x + (q.x - c.x) * Math.cos(al) - (q.y - c.y) * Math.sin(al), c.y + (q.x - c.x) * Math.sin(al) + (q.y - c.y) * Math.cos(al))
  const Rc = len / phi, cc = V(s0.x + Rc, s0.y)            // střed křivosti vpravo od svislé osy
  const at = t => rot(s0, cc, phi * t)                      // bod na ose stopky (t = 0…1)
  const off = (t, k) => { const q = at(t); const n = V(q.x - cc.x, q.y - cc.y), l = Math.hypot(n.x, n.y); return V(q.x + n.x / l * k, q.y + n.y / l * k) }
  const s1 = at(1), d1 = V(Math.sin(phi), -Math.cos(phi))   // vršek stopky a směr stopky v něm
  const u = V(Math.cos(rad(L.angle)), Math.sin(rad(L.angle))), w = V(-u.y, u.x) // osa lístku, w = kolmo „dolů“
  const Q = (a, b) => add(add(s1, u, a * L.len), w, b * L.len)
  const tip = Q(1, 0), Ao = off(1, r), Bi = off(1, -r)
  const upper = [Ao, add(Ao, d1, L.ta * L.len), Q(0.7, -L.k1), tip]
  const lower = [tip, Q(0.6, L.k2), add(Bi, d1, L.tb * L.len), Bi]
  const C3 = c => `C${P(c[1])} ${P(c[2])} ${P(c[3])}`
  let sprig, curves
  if (L.at == null) {
    sprig = `M${P(off(0, r))}A${f(Rc + r)} ${f(Rc + r)} 0 0 1 ${P(Ao)}${C3(upper)}${C3(lower)}A${f(Rc - r)} ${f(Rc - r)} 0 0 0 ${P(off(0, -r))}A${f(r)} ${f(r)} 0 0 1 ${P(off(0, r))}Z`
    curves = [upper, lower]
  } else {
    // lístek ze strany stopky: báze na ose stopky v místě at, vršek stopky zaoblený (cap = 'round') nebo seříznutý
    const b0 = at(L.at), Qs = (a2, b2) => add(add(b0, u, a2 * L.len), w, b2 * L.len), t2 = Qs(1, 0)
    const up2 = [b0, Qs(0.3, -L.k1), Qs(0.78, -L.k1 * 0.72), t2], lo2 = [t2, Qs(0.72, L.k2 * 0.7), Qs(0.28, L.k2), b0]
    const capTop = S.cap === 'round' ? `A${f(r)} ${f(r)} 0 0 1 ${P(Bi)}` : `L${P(Bi)}`
    sprig = `M${P(off(0, r))}A${f(Rc + r)} ${f(Rc + r)} 0 0 1 ${P(Ao)}${capTop}A${f(Rc - r)} ${f(Rc - r)} 0 0 0 ${P(off(0, -r))}A${f(r)} ${f(r)} 0 0 1 ${P(off(0, r))}Z` +
      `M${P(b0)}${C3(up2)}${C3(lo2)}Z`
    curves = [up2, lo2]
  }
  // hranice
  let top = Infinity, xr = -Infinity
  for (let i = 0; i <= 40; i++) for (const c of curves) { const q = bez(c, i / 40).p; top = Math.min(top, q.y); xr = Math.max(xr, q.x) }
  for (let i = 0; i <= 20; i++) top = Math.min(top, off(i / 20, r).y, off(i / 20, -r).y)
  const bodyTop = Math.min(...A.pts.map(p => p[1]))
  const ext = segs.flatMap(s => Array.from({ length: 21 }, (_, i) => bez(s, i / 20).p))
  return {
    body, sprig, top, bodyTop: Math.min(...ext.map(p => p.y)), bottom: Math.max(...ext.map(p => p.y)),
    left: Math.min(...ext.map(p => p.x)), right: Math.max(...ext.map(p => p.x), xr), bodyRight: Math.max(...ext.map(p => p.x)),
    bar: A.bar, mouth: yT, _bodyTopPts: bodyTop,
  }
}

// posun a měřítko path dat (jen absolutní M L C A Z, jak je generujeme my i text2path)
function tf(d, s, dx, dy) {
  const tok = d.match(/[MLCQAZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g); let out = '', i = 0, cmd = ''
  while (i < tok.length) {
    if (/[A-Z]/.test(tok[i])) { cmd = tok[i++]; out += cmd; if (cmd === 'Z') continue }
    if (cmd === 'A') { const a = tok.slice(i, i + 7).map(Number); i += 7; out += `${f(a[0] * s)} ${f(a[1] * s)} ${a[2]} ${a[3]} ${a[4]} ${f(a[5] * s + dx)} ${f(a[6] * s + dy)} `; continue }
    out += `${f(+tok[i] * s + dx)} ${f(+tok[i + 1] * s + dy)} `; i += 2
  }
  return out
}

// ======================= text =======================
// Sazba po jednotlivých znacích: vlastní kerning (font + ruční korekce) a úpravy tvaru písmen v jednotkách em/1000.
const G = new Map()
async function glyph(o, ch) {
  const key = `${o.font}|${o.weight}|${ch}`
  if (!G.has(key)) G.set(key, await textPath({ font: o.font, weight: o.weight, italic: false, text: ch, size: 1000, x: 0, y: 0 }))
  return G.get(key)
}
async function pairKern(o, a, b) {
  const t = await textPath({ font: o.font, weight: o.weight, italic: false, text: a + b, size: 1000, x: 0, y: 0 })
  return t.width - (await glyph(o, a)).width - (await glyph(o, b)).width
}
// úpravy písmen „Holub“ (Newsreader 600, souřadnice em/1000, y nahoru záporné):
//  – dotahy l a b zkrácené z 717 na 700, aby horní linie slova byla klidnější a blíž verzálce H (676)
//  – b: ostruha vlevo dole zkrácená, nepřečnívá pod účaří ani vlevo za dřík (čisté účaří, které sdílí se spodkem jablka)
function editGlyph(o, ch, d) {
  if (o.font !== 'newsreader' || !d) return d
  const tok = d.match(/[MLCQAZ]|-?(?:\d+\.?\d*|\.\d+)/g)
  const pts = []; let out = [], i = 0, cmd = ''
  while (i < tok.length) {
    if (/[A-Z]/.test(tok[i])) { cmd = tok[i++]; out.push(cmd); continue }
    const p = [+tok[i], +tok[i + 1]]; i += 2; pts.push(p); out.push(p)
  }
  if (ch === 'l' || ch === 'b') {
    // body nad 650 posunout dolů lineárně tak, aby vrchol 717 → 700 (patka zůstane stejně tvarovaná, jen nižší)
    for (const p of pts) if (p[1] < -600) p[1] = -600 + (p[1] + 600) * (100 / 117)
  }
  if (ch === 'b') {
    // ostruha b: body (148,-28) (88,9) (53,2) (70,-109.5) → (148,-28) (88,-2) (70,-2) (70,-109.5)
    for (const p of pts) {
      if (p[0] < 160 && p[1] > -120) {
        if (p[1] > 0) { p[1] = -2 }          // spodní hrot ostruhy výš
        if (p[0] < 70) p[0] = 70             // hrot nepřečnívá vlevo za dřík
      }
    }
  }
  return out.map(v => Array.isArray(v) ? `${v[0]} ${v[1]}` : v).join(' ')
}
// body ležící skutečně na obrysu (křivky navzorkované) – přesné hranice písmen pro zarovnání
function outlinePoints(d) {
  const tok = d.match(/[MLCQZ]|-?(?:\d+\.?\d*|\.\d+)/g), pts = []; let i = 0, cmd = '', cur = V(0, 0)
  const n = () => +tok[i++]
  while (i < tok.length) {
    if (/[A-Z]/.test(tok[i])) { cmd = tok[i++]; if (cmd === 'Z') continue }
    if (cmd === 'M' || cmd === 'L') { cur = V(n(), n()); pts.push(cur) }
    else if (cmd === 'Q') { const c = V(n(), n()), e = V(n(), n()); for (let k = 1; k <= 16; k++) { const t = k / 16; pts.push(lerp(lerp(cur, c, t), lerp(c, e, t), t)) } cur = e }
    else if (cmd === 'C') { const c1 = V(n(), n()), c2 = V(n(), n()), e = V(n(), n()); for (let k = 1; k <= 16; k++) pts.push(bez([cur, c1, c2, e], k / 16).p); cur = e }
  }
  return pts
}
async function word(o, size, x, base) {
  const s = size / 1000
  let cx = 0, d = '', x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity
  const chars = [...o.text]
  for (let k = 0; k < chars.length; k++) {
    const ch = chars[k], g = await glyph(o, ch)
    if (k) cx += (await pairKern(o, chars[k - 1], ch)) + ((o.kern || {})[chars[k - 1] + ch] || 0) * 1000 + (o.tracking || 0) * 1000
    const gd = editGlyph(o, ch, g.d)
    if (!gd.trim()) { cx += g.width; continue }
    d += tf(gd, s, x + cx * s, base)
    for (const q of outlinePoints(gd)) { x1 = Math.min(x1, x + (cx + q.x) * s); x2 = Math.max(x2, x + (cx + q.x) * s); y1 = Math.min(y1, base + q.y * s); y2 = Math.max(y2, base + q.y * s) }
    cx += g.width
  }
  return { d, x1, x2, y1, y2, width: x2 - x1 }
}
// rozměry slova při velikosti 1000 a výchozí poloze
const metrics = async o => word(o, 1000, 0, 0)

// Optické zarovnání okrajů: oblé O popisku přečnívá vlevo kousek před patku H, oblé bříško b přečnívá vpravo za dřík Í.
const OPT = { l: 0.012, r: 0.008 } // v em popisku / em slova Holub
// Blok „popisek / Holub“: celková výška H (od vrchu diakritiky popisku po účaří Holub), šířka popisku = šířka Holub.
async function textBlock(x, yTop, H, desc = DESC, anchor = 'start', matchWidth = true, descScale = null) {
  const w1 = await metrics(WORD), d1 = await metrics(desc)
  const asc = -w1.y1 / 1000, dH = (d1.y2 - d1.y1) / 1000
  let s
  if (descScale) s = descScale
  else {
    let lo = 0.1, hi = H
    for (let i = 0; i < 50; i++) {
      s = (lo + hi) / 2
      const size = (H - s * dH - LAYOUT.descGap * H) / asc
      if (d1.width / 1000 * s > w1.width / 1000 * size - OPT.r * size + OPT.l * s) hi = s; else lo = s
    }
  }
  const size = (H - s * dH - LAYOUT.descGap * H) / asc
  const ww = w1.width / 1000 * size
  let wx = x - w1.x1 / 1000 * size, dx = x - d1.x1 / 1000 * s - OPT.l * s
  if (anchor === 'middle') { wx -= ww / 2; dx -= (matchWidth ? ww : d1.width / 1000 * s) / 2 }
  const wBase = yTop + H
  const wd = await word(WORD, size, wx, wBase)
  const ds = await word(desc, s, dx, yTop - d1.y1 / 1000 * s)
  return { d: wd.d + ds.d, wordD: wd.d, descD: ds.d, width: ww, x1: Math.min(wd.x1, ds.x1), x2: Math.max(wd.x2, ds.x2), size, descSize: s, wBase,
    capTop: wBase - (await glyph(WORD, 'H')).capHeight * size / 1000, descCap: (await glyph(desc, 'O')).capHeight * s / 1000 }
}

// ======================= SVG =======================
const svg = (w, h, body, x0 = 0, y0 = 0) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x0)} ${f(y0)} ${f(w)} ${f(h)}" width="${f(w)}" height="${f(h)}">${body}</svg>\n`
const p = (fill, d) => `<path fill="${fill}" d="${minify(d)}"/>`
// více tvarů: sousední tvary stejné barvy se sloučí do jedné cesty (nepřekrývají se, takže na pořadí nezáleží)
const ps = (...l) => l.reduce((o, [c, d]) => (o.length && o[o.length - 1][0] === c ? o[o.length - 1][1] += d : o.push([c, d]), o), []).map(([c, d]) => p(c, d)).join('')
// absolutní příkazy → relativní, zaokrouhlení na 2 desetinná místa bez sčítání chyby
function minify(d) {
  const tok = d.match(/[MLCQAZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g)
  const r2 = n => Math.round(n * 100) / 100
  const num = n => { let v = r2(n); if (Object.is(v, -0)) v = 0; return v.toString().replace(/^(-?)0\./, '$1.') }
  const join = arr => arr.reduce((o, v, i) => o + (i && !v.startsWith('-') && !(v.startsWith('.') && /\.\d*$/.test(arr[i - 1])) ? ' ' : '') + v, '')
  let out = '', i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = ''
  const n = () => +tok[i++]
  const rel = (x, y) => { const X = r2(x), Y = r2(y); const s = [num(X - cx), num(Y - cy)]; cx = X; cy = Y; return s }
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++]
    if (cmd === 'Z') { out += 'z'; cx = sx; cy = sy; continue }
    if (cmd === 'M') { const s = rel(n(), n()); sx = cx; sy = cy; out += 'm' + join(s); cmd = 'L'; continue }
    if (cmd === 'L') {
      const [dx, dy] = rel(n(), n())
      out += dx === '0' && dy === '0' ? '' : dx === '0' ? 'v' + dy : dy === '0' ? 'h' + dx : 'l' + join([dx, dy])
      continue
    }
    if (cmd === 'C') { const a = [n(), n(), n(), n(), n(), n()]; const ox = cx, oy = cy
      const s = [num(r2(a[0]) - ox), num(r2(a[1]) - oy), num(r2(a[2]) - ox), num(r2(a[3]) - oy)]; out += 'c' + join([...s, ...rel(a[4], a[5])]); continue }
    if (cmd === 'Q') { const a = [n(), n(), n(), n()]; const ox = cx, oy = cy
      const s = [num(r2(a[0]) - ox), num(r2(a[1]) - oy)]; out += 'q' + join([...s, ...rel(a[2], a[3])]); continue }
    if (cmd === 'A') { const a = [n(), n(), n(), n(), n(), n(), n()]; out += 'a' + join([num(a[0]), num(a[1])]) + ' ' + a[2] + ' ' + a[3] + ' ' + a[4] + ' ' + join(rel(a[5], a[6])); continue }
    throw new Error('Nepodporovaný příkaz ' + cmd)
  }
  return out
}

// ======================= sestavy =======================
// Vodorovná: znak vlevo, vpravo popisek nad „Holub“. Spodek jablka na účaří, horní hrana lístku = horní hrana diakritiky.
async function horizontal(col, desc = DESC, noDesc = false) {
  const m = LAYOUT.margin
  const a = appleH()
  const H = a.bottom - a.top
  const ov = LAYOUT.overshoot * H                 // oblý spodek jablka opticky kousek pod účaří
  const Ht0 = H - ov                              // výška textového bloku (vrch diakritiky = vrch lístku → účaří)
  const ox = m - a.left, oy = m - a.top           // posun znaku
  const tx = ox + a.right + LAYOUT.gap * H
  let tb
  if (noDesc) {
    // kompaktní: jen „Holub“, dotahy l/b ve výšce ramen jablka
    const w1 = await metrics(WORD)
    const size = (a.bottom - ov - a.bodyTop) / (-w1.y1 / 1000)
    const wd = await word(WORD, size, tx - w1.x1 / 1000 * size, oy + a.bottom - ov)
    tb = { d: wd.d, x2: wd.x2 }
  } else if (desc !== DESC) {
    const cz = await textBlock(tx, oy + a.top, Ht0)
    tb = await textBlock(tx, oy + a.top, Ht0, desc, 'start', false, cz.descSize)
  } else tb = await textBlock(tx, oy + a.top, Ht0)
  const W = tb.x2 + m, Ht = H + 2 * m
  return { svg: svg(W, Ht, ps([col.apple, tf(a.body, 1, ox, oy)], [col.leaf, tf(a.sprig, 1, ox, oy)], [col.text, tb.d])), tb, H }
}

// Na výšku: větší znak, pod ním popisek, Holub a KRTELY U NETOLIC – vše na šířku slova Holub.
async function stacked(col) {
  const m = LAYOUT.margin
  const a = appleH()
  const Hm = a.bottom - a.top
  const Htext = 0.58 * Hm
  const tb0 = await textBlock(0, 0, Htext)
  const W = Math.max(tb0.x2 - tb0.x1, a.right - a.left) + 2 * m
  const cx = W / 2
  const oy = m - a.top
  const tb = await textBlock(cx, oy + a.bottom + 0.16 * Hm, Htext, DESC, 'middle')
  const pl0 = await metrics(PLACE)
  const plS = tb.width / (pl0.width / 1000)
  const pl = await word(PLACE, plS, cx - tb.width / 2 - pl0.x1 / 1000 * plS, tb.wBase + 0.1 * Hm + (-pl0.y1 / 1000) * plS)
  const Ht = pl.y2 + m
  return svg(W, Ht, ps([col.apple, tf(a.body, 1, cx, oy)], [col.leaf, tf(a.sprig, 1, cx, oy)], [col.text, tb.d + pl.d]))
}

// Samotný znak bez podkladu, viewBox těsně kolem tvaru (hlavní kresba pro tisk a velké použití).
function symbol(col) {
  const m = LAYOUT.margin, a = appleH()
  const W = a.right - a.left + 2 * m, H = a.bottom - a.top + 2 * m
  return svg(W, H, ps([col.apple, tf(a.body, 1, m - a.left, m - a.top)], [col.leaf, tf(a.sprig, 1, m - a.left, m - a.top)]))
}

// Znak na čtvercovém podkladu (favicon, ikona aplikace) = samostatná optická velikost pro 16–180 px:
// drážky a příčka H přesně 2 px při 16 px (hrany na pixelové mřížce), příčka zůstává ve stejné výšce jako v logu,
// stopka silnější a zanořená jen málo (v 16 px by se v drážce slila), lístek o kousek větší.
function mark({ bg, apple, leaf, rx = 0.22, pad = 0.11, optical = true, round = false }) {
  const S = 100, px = S / 16
  const o = optical ? { stem: { depth: 1.2, w: 5.8, rise: 11.5 }, leaf: { len: 24, k1: 0.38, k2: 0.26 } } : {}
  const probe = appleH(o)
  const s = S * (1 - 2 * pad) / Math.max(probe.bottom - probe.top, probe.right - probe.left)
  // drážka 2 px a příčka 2 px při 16 px
  if (optical) {
    const cy = S / 2 - (probe.top + probe.bottom) / 2 * s
    const barTop = Math.round((cy + APPLE.bar[0] * s) / px) * px
    o.apple = { slot: px / s, bar: [(barTop - cy) / s, (barTop + 2 * px - cy) / s], rc: 0.9 }
  }
  const cy = S / 2 - (probe.top + probe.bottom) / 2 * s
  const a = appleH(o)
  const tile = round ? `<circle cx="50" cy="50" r="50" fill="${bg}"/>` : `<rect width="${S}" height="${S}" rx="${f(S * rx)}" fill="${bg}"/>`
  return svg(S, S, (bg ? tile : '') + ps([apple, tf(a.body, s, S / 2, cy)], [leaf, tf(a.sprig, s, S / 2, cy)]))
}

// Příčka jablka: spodní hrana na stejné výšce jako spodní hrana příčky písmene H ve vodorovném logu (Newsreader 600: 625/2000 em).
if (APPLE.barAlign) {
  const t = (await horizontal({ apple: '#000', leaf: '#000', text: '#000' })).tb, a = appleH(), H = a.bottom - a.top
  const yb = a.bottom - LAYOUT.overshoot * H - 0.3125 * t.size
  APPLE.bar = [yb - APPLE.barH, yb]
}
const prim = await horizontal({ apple: C.berry, leaf: C.green, text: C.green })
const out = {
  'primary.svg': prim.svg,
  'reverse.svg': (await horizontal({ apple: C.paper, leaf: C.tint, text: C.paper })).svg,
  'mono.svg': (await horizontal({ apple: C.ink, leaf: C.ink, text: C.ink })).svg,
  'stacked.svg': await stacked({ apple: C.berry, leaf: C.green, text: C.green }),
  'mark.svg': mark({ bg: C.paper, apple: C.berry, leaf: C.green }),
  // doplňky
  'reverse-mono.svg': (await horizontal({ apple: C.paper, leaf: C.paper, text: C.paper })).svg,
  'compact.svg': (await horizontal({ apple: C.berry, leaf: C.green, text: C.green }, DESC, true)).svg,
  'primary-de.svg': (await horizontal({ apple: C.berry, leaf: C.green, text: C.green }, DESC_DE)).svg,
  'mark-green.svg': mark({ bg: C.green, apple: C.paper, leaf: C.paper }),
  'mark-maskable.svg': mark({ bg: C.paper, apple: C.berry, leaf: C.green, rx: 0, pad: 0.2 }), // PWA: obsah v kruhu 80 %
  'symbol.svg': symbol({ apple: C.berry, leaf: C.green }),
  'symbol-mono.svg': symbol({ apple: C.ink, leaf: C.ink }),
}
for (const [name, s] of Object.entries(out)) {
  fs.writeFileSync(path.join(DIR, name), s)
  console.log(name.padEnd(18), (Buffer.byteLength(s) / 1024).toFixed(1) + ' kB')
}
const tb = prim.tb
console.log(`příčka jablka ${f(APPLE.bar[0])}…${f(APPLE.bar[1])}; v liště 44 px: Holub verzálka ${(tb.size * 0.67 * 44 / (prim.H + 2 * LAYOUT.margin)).toFixed(1)} px, popisek verzálka ${(tb.descCap * 44 / (prim.H + 2 * LAYOUT.margin)).toFixed(1)} px`)
