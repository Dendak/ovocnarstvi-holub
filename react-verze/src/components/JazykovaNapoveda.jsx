import { useState } from 'react'

const KLIC = 'ovocnarstvi-napoveda-jazyka'

function jazykProhlizece() {
  try { return (navigator.languages?.[0] || navigator.language || '').toLowerCase() } catch { return '' }
}

function skryto(lang) {
  try { return localStorage.getItem(`${KLIC}-${lang}`) === '1' } catch { return false }
}

/**
 * Malý odkaz na stránku v jiném jazyce pro návštěvníky, jejichž prohlížeč mluví tím jazykem.
 * Nahrazuje dřívější automatické přesměrování (česká stránka ≠ překlad německé, jde o jiné nabídky).
 * jazyky: předpony jazyka prohlížeče (např. ['de']), lang: jazyk textu odkazu.
 */
export default function JazykovaNapoveda({ jazyky, lang, href, text, zavritLabel }) {
  const [videt, setVidet] = useState(() => !skryto(lang) && jazyky.some(j => jazykProhlizece().startsWith(j)))
  if (!videt) return null

  const zavrit = () => {
    try { localStorage.setItem(`${KLIC}-${lang}`, '1') } catch { /* úložiště blokované */ }
    setVidet(false)
  }

  return (
    <div lang={lang} className="bg-paper-2 border-b border-line text-sm">
      <div className="container-page py-1.5 flex items-center justify-between gap-3">
        <a href={href} hrefLang={lang} className="link py-1.5">{text}</a>
        <button type="button" onClick={zavrit} aria-label={zavritLabel}
          className="shrink-0 w-9 h-9 -mr-2 flex items-center justify-center rounded text-ink-soft hover:text-ink cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  )
}
