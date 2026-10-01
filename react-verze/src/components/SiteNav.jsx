import { useState, useEffect, useRef } from 'react'

const BASE = import.meta.env.BASE_URL

function Jazyky({ lang }) {
  // Dost velké plochy pro palec (hned vedle je tlačítko menu).
  const item = (code, href, label, nazev) => (
    <a href={`${BASE}${href}`} lang={code} hrefLang={code} title={nazev}
      aria-current={lang === code ? 'true' : undefined}
      className={`inline-flex items-center justify-center min-w-10 min-h-11 px-2 rounded ${lang === code ? 'text-white' : 'text-white/65 hover:text-white'}`}>
      {label}
    </a>
  )
  return (
    <div role="group" className="flex items-center text-sm font-semibold tracking-wide" aria-label="Jazyk / Sprache">
      {item('cs', '', 'CZ', 'Česky')}
      <span className="text-white/40" aria-hidden="true">·</span>
      {item('de', 'index-de.html', 'DE', 'Deutsch')}
    </div>
  )
}

/**
 * Site header shared by the Czech and German pages.
 * links: [{ label, href }], cta: { label, href } | null
 */
export default function SiteNav({ links, cta, lang, logoAlt, skipLabel = 'Přeskočit na obsah', menuLabel = 'Menu' }) {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  const skipUntil = useRef(0)

  const handleNavClick = () => {
    setOpen(false)
    skipUntil.current = Date.now() + 800
  }

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (Date.now() < skipUntil.current) { lastY.current = y; return }
      setHidden(y > lastY.current && y > 80)
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header>
      <a href="#obsah" className="btn-light fixed top-2 left-2 z-[60] -translate-y-[200%] focus:translate-y-0">{skipLabel}</a>
      <nav aria-label={menuLabel} onFocus={() => setHidden(false)}
        className={`fixed top-0 left-0 right-0 z-50 bg-forest text-white transition-transform duration-300 ${hidden && !open ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="container-page h-16 flex items-center justify-between gap-6">
          <a href="#" className="shrink-0">
            <picture>
              <source srcSet={`${BASE}img/_w480/logo.webp`} type="image/webp" />
              <img src={`${BASE}img/logo.png`} alt={logoAlt} className="h-11 w-auto" width="81" height="44" />
            </picture>
          </a>

          <div className="hidden md:flex items-center gap-7">
            {links.map(l => (
              <a key={l.href} href={l.href} onClick={handleNavClick}
                className="text-[0.95rem] font-medium text-white/75 hover:text-white transition-colors">
                {l.label}
              </a>
            ))}
            {cta && <a href={cta.href} className="btn-light !py-2 !px-4 !text-sm">{cta.label}</a>}
            <Jazyky lang={lang} />
          </div>

          <div className="flex md:hidden items-center gap-3">
            <Jazyky lang={lang} />
            <button onClick={() => setOpen(o => !o)} className="p-2.5 -mr-2.5 cursor-pointer" aria-label={menuLabel} aria-expanded={open} aria-controls="menu-mobil">
              {open
                ? <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
                : <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" /></svg>}
            </button>
          </div>
        </div>

        {open && (
          <div id="menu-mobil" className="md:hidden border-t border-white/10 container-page py-3 flex flex-col">
            {links.map(l => (
              <a key={l.href} href={l.href} onClick={handleNavClick}
                className="py-3 text-base font-medium text-white/85 border-b border-white/10 last:border-0">
                {l.label}
              </a>
            ))}
            {cta && <a href={cta.href} className="btn-light mt-3 mb-2">{cta.label}</a>}
          </div>
        )}
      </nav>
    </header>
  )
}
