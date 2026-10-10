/* global __dirname, process -- konfiguraci spouští Node (Vite doplní __dirname) */
import { basename, dirname, join, relative, resolve } from 'path'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { defineConfig, runnerImport } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

// Stránky webu (všechny musí existovat – patička a e-shop na ně odkazují, viz zkontrolovatSoubory()).
const STRANKY = {
  main: 'index.html',
  de: 'index-de.html',
  gdpr: 'gdpr.html',
  gdprDe: 'gdpr-de.html',
  podminky: 'obchodni-podminky.html',
  eshop: 'eshop.html',
  cenik: 'cenik.html',
}

// api/_cenik.php: ceník a pravidla termínů pro kontrolu objednávek na serveru (api/potvrzeni.php).
// Počítá se ze stejných souborů jako e-shop (src/eshop/katalog.js, src/eshop/terminy.js), takže ceny
// na serveru vždy odpovídají tomu, co zákazník viděl. Když to nejde, sestavení skončí chybou.
async function cenikPhp() {
  const nacist = soubor => runnerImport(resolve(__dirname, soubor), { configFile: false, root: __dirname, logLevel: 'error' }).then(r => r.module)
  const [katalog, terminy] = await Promise.all([nacist('src/eshop/katalog.js'), nacist('src/eshop/terminy.js')])
  const produkty = katalog.cenikProServer()
  if (!Object.keys(produkty).length) throw new Error('prázdný ceník')
  const json = JSON.stringify({ vytvoreno: new Date().toISOString(), produkty, terminy: terminy.PRAVIDLA_TERMINU })
  return '<?php\n'
    + '// Ceník e-shopu pro kontrolu objednávek (api/potvrzeni.php). VYTVOŘENO PŘI SESTAVENÍ WEBU z\n'
    + '// react-verze/src/eshop/katalog.js a terminy.js (viz react-verze/vite.config.js) – neupravovat ručně.\n'
    + "if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) { http_response_code(404); exit; }\n"
    + "return json_decode('" + json.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "', true);\n"
}

// Všechny soubory ve složce (rekurzivně); `vstoupit(jméno složky)` = false složku přeskočí.
function soubory(slozka, vstoupit = () => true) {
  return readdirSync(slozka, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? (vstoupit(e.name) ? soubory(join(slozka, e.name), vstoupit) : [])
    : [join(slozka, e.name)])
}

// Kontrola před nasazením: soubory, bez kterých by na živém webu něco nefungovalo – typicky nový soubor,
// který se zapomněl přidat do commitu (CI sestavuje web jen z commitu). Chybí-li něco, sestavení skončí chybou
// a na webu zůstane předchozí funkční verze.
function zkontrolovatSoubory() {
  const chyby = []
  const api = resolve(__dirname, '../api')
  const kratce = f => relative(resolve(__dirname, '..'), f).replaceAll('\\', '/')
  // PHP: každý require/include __DIR__ . '/x.php' (bez _cenik.php, ten vzniká při sestavení).
  for (const f of readdirSync(api).filter(f => f.endsWith('.php'))) {
    for (const [, x] of readFileSync(resolve(api, f), 'utf8').matchAll(/(?:require|include)(?:_once)?\s*\(?\s*__DIR__\s*\.\s*'\/([\w.-]+\.php)'/g)) {
      if (x !== '_cenik.php' && !existsSync(resolve(api, x))) chyby.push(`api/${f} potřebuje api/${x}`)
    }
  }
  // Skripty api/*.php, které volají stránky webu.
  const zdroje = [...soubory(resolve(__dirname, 'src')), ...Object.values(STRANKY).map(s => resolve(__dirname, s)).filter(existsSync)]
  for (const f of zdroje.filter(f => /\.(jsx?|html)$/.test(f))) {
    for (const [, x] of readFileSync(f, 'utf8').matchAll(/api\/([\w-]+\.php)/g)) {
      if (!x.startsWith('_') && !existsSync(resolve(api, x))) chyby.push(`${kratce(f)} volá api/${x}`)
    }
  }
  // Stránky webu (odkazuje na ně patička a e-shop) a ikony / obrázek pro sdílení z hlaviček stránek.
  for (const s of Object.values(STRANKY)) if (!existsSync(resolve(__dirname, s))) chyby.push(`chybí stránka react-verze/${s}`)
  for (const s of ['public/favicon.svg', 'public/favicon-32.png', 'public/apple-touch-icon.png', '../img/og-ovoce-holub.jpg']) {
    if (!existsSync(resolve(__dirname, s))) chyby.push(`chybí ${kratce(resolve(__dirname, s))}`)
  }
  // Fotky: ke každé jpg/jpeg/png v img/ patří zmenšeniny _w480/<jméno>.webp a _w960/<jméno>.webp (srcset).
  // Bez nich prohlížeč místo fotky ukáže rozbitý obrázek (na původní soubor se nevrátí).
  const bezZmensenin = soubory(resolve(__dirname, '../img'), d => !/^_w\d+$/.test(d))
    .filter(f => /\.(jpe?g|png)$/i.test(f))
    .filter(f => [480, 960].some(w => !existsSync(join(dirname(f), `_w${w}`, basename(f).replace(/\.[^.]+$/, '') + '.webp'))))
  if (bezZmensenin.length) {
    chyby.push(`fotky bez zmenšenin WebP (vytvoří je „node scripts/zmensit-fotky.mjs“ ve složce react-verze): ${bezZmensenin.map(kratce).join(', ')}`)
  }
  if (chyby.length) throw new Error(`Web nejde nasadit – chybí soubory:\n  - ${chyby.join('\n  - ')}`)
}

// /eshop a /e-shop (adresy, které lidé píšou ručně) → eshop.html. Statické stránky, .htaccess se nemění.
function presmerovani(base) {
  const cil = `${base}eshop.html`
  return '<!doctype html>\n<html lang="cs"><head><meta charset="utf-8"><title>E-shop – Ovocnářství Holub</title>\n'
    + '<link rel="canonical" href="https://ovoce-holub.cz/eshop.html">\n'
    + `<meta http-equiv="refresh" content="0;url=${cil}">\n`
    + `<script>location.replace(${JSON.stringify(cil)} + location.search + location.hash)</script>\n`
    + `</head><body><p><a href="${cil}">Pokračovat do e-shopu</a></p></body></html>\n`
}

function phpApi() {
  let outDir, base
  return {
    // PHP endpoints (orders, payments, delivery overview) live in ../api and run on the Wedos hosting.
    name: 'copy-php-api',
    apply: 'build',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); base = config.base },
    buildStart() { zkontrolovatSoubory() },
    async closeBundle() {
      for (const slozka of ['eshop', 'e-shop']) {
        mkdirSync(resolve(outDir, slozka), { recursive: true })
        writeFileSync(resolve(outDir, slozka, 'index.html'), presmerovani(base))
      }
      const api = resolve(outDir, 'api')
      cpSync(resolve(__dirname, '../api'), api, { recursive: true })
      try {
        writeFileSync(resolve(api, '_cenik.php'), await cenikPhp())
      } catch (e) {
        throw new Error(`Ceník pro server (api/_cenik.php) se nepodařilo vytvořit: ${e.message}`, { cause: e })
      }
      // Ikony z public/ (při sestavení se public/ nekopíruje, CI přidává jen favicon.svg).
      for (const f of ['favicon-32.png', 'apple-touch-icon.png']) {
        if (existsSync(resolve(__dirname, 'public', f))) cpSync(resolve(__dirname, 'public', f), resolve(outDir, f))
      }
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react(), phpApi()],
  base: process.env.DEPLOY_TARGET === 'wedos' ? '/' : '/ovocnarstvi-holub/',
  // In dev, serve parent dir so /img/... works. In build, images are copied by CI.
  publicDir: command === 'build' ? false : '../',
  build: {
    rollupOptions: {
      input: Object.fromEntries(Object.entries(STRANKY)
        .filter(([, soubor]) => existsSync(resolve(__dirname, soubor)))
        .map(([nazev, soubor]) => [nazev, resolve(__dirname, soubor)])),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
}))
