// Text → SVG path (outlined glyphs), so logo SVGs never depend on installed fonts.
// CLI:  node text2path.mjs '{"font":"fraunces","weight":600,"text":"HOLUB","size":96,"x":0,"y":100,"tracking":0.02,"anchor":"start"}'
//   font: newsreader | source-sans-3 | fraunces | cormorant-garamond | young-serif | instrument-serif |
//         dm-serif-display | inter | manrope | outfit | bricolage-grotesque | figtree
//   weight: number (available weights: files in node_modules/@fontsource/<font>/files), italic: true/false, size: px (font size), x/y: baseline origin,
//   tracking: extra letter spacing in em (0.1 = 10 % of size), anchor: start | middle | end
// Prints JSON {d, width, capHeight, xHeight, ascender, descender, bbox:{x1,y1,x2,y2}}.
// Czech diacritics: glyphs missing in the latin subset (Ř, ě, š, č, ů …) come from latin-ext automatically.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import opentype from 'opentype.js'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const cache = new Map()

async function loadSubset(font, subset, weight, italic) {
  const file = path.join(ROOT, 'node_modules', '@fontsource', font, 'files', `${font}-${subset}-${weight}-${italic ? 'italic' : 'normal'}.woff`)
  if (cache.has(file)) return cache.get(file)
  if (!fs.existsSync(file)) { cache.set(file, null); return null }
  const buf = fs.readFileSync(file)
  const f = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  cache.set(file, f)
  return f
}

export async function textPath({ font = 'newsreader', weight = 400, italic = false, text, size = 64, x = 0, y = 0, tracking = 0, anchor = 'start' }) {
  const fonts = (await Promise.all(['latin', 'latin-ext'].map(s => loadSubset(font, s, weight, italic)))).filter(Boolean)
  if (!fonts.length) throw new Error(`Font not found: ${font} ${weight}${italic ? ' italic' : ''}`)
  const main = fonts[0]
  const scale = size / main.unitsPerEm
  // Lay out glyphs: pick the first subset that has the character.
  const items = []
  let cx = 0
  let prev = null
  for (const ch of [...text]) {
    const f = fonts.find(ff => ff.charToGlyphIndex(ch) > 0) || main
    const g = f.charToGlyph(ch)
    if (prev && prev.f === f) cx += f.getKerningValue(prev.g, g) * (size / f.unitsPerEm)
    items.push({ f, g, x: cx })
    cx += g.advanceWidth * (size / f.unitsPerEm) + tracking * size
    prev = { f, g }
  }
  const width = items.length ? cx - tracking * size : 0
  const ox = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x
  let d = ''
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (const it of items) {
    const p = it.g.getPath(ox + it.x, y, size)
    d += p.toPathData(2)
    const b = p.getBoundingBox()
    if (b.x1 < b.x2) { x1 = Math.min(x1, b.x1); y1 = Math.min(y1, b.y1); x2 = Math.max(x2, b.x2); y2 = Math.max(y2, b.y2) }
  }
  const os2 = main.tables.os2 || {}
  return {
    d, width,
    capHeight: (os2.sCapHeight || 0) * scale,
    xHeight: (os2.sxHeight || 0) * scale,
    ascender: main.ascender * scale,
    descender: main.descender * scale,
    bbox: { x1, y1, x2, y2 },
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const arg = JSON.parse(process.argv[2] || '{}')
  textPath(arg).then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e.message); process.exit(1) })
}
