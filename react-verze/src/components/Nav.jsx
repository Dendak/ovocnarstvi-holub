import { useState, useEffect, useRef } from 'react'

const LINKS = [
  { label: 'Ovoce',     href: '#ovoce'    },
  { label: 'Mošty',     href: '#mosty'    },
  { label: 'Aktuality', href: '#aktuality'},
  { label: 'Fotky',     href: '#galerie'  },
  { label: 'Kontakt',   href: '#kontakt'  },
]

export default function Nav() {
  const [open, setOpen]     = useState(false)
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
      if (Date.now() < skipUntil.current) {
        lastY.current = y
        return
      }
      setHidden(y > lastY.current && y > 80)
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-[#133e13]/95 backdrop-blur-md shadow-lg transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 shrink-0">
          <img src={`${import.meta.env.BASE_URL}img/logo.png`} alt="Ovocnářství Holub" className="h-12 w-auto" />
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {LINKS.map(l => (
            <a key={l.href} href={l.href} onClick={handleNavClick}
              className="text-white/80 hover:text-white text-base font-medium transition-colors">
              {l.label}
            </a>
          ))}
          <div className="flex gap-1 ml-2">
            <a href={`${import.meta.env.BASE_URL}index.html`}><img src={`${import.meta.env.BASE_URL}img/flag-cz.png`} alt="CZ" className="h-5 rounded-sm opacity-80 hover:opacity-100" /></a>
            <a href={`${import.meta.env.BASE_URL}index-de.html`}><img src={`${import.meta.env.BASE_URL}img/flag-at.png`} alt="AT" className="h-5 rounded-sm opacity-60 hover:opacity-100" /></a>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(o => !o)} className="md:hidden text-white p-1" aria-label="Menu">
          {open
            ? <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            : <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
          }
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#1a561a] border-t border-white/10 px-4 py-3 flex flex-col gap-3">
          {LINKS.map(l => (
            <a key={l.href} href={l.href} onClick={handleNavClick}
              className="text-white/90 hover:text-white text-sm font-medium py-1 transition-colors">
              {l.label}
            </a>
          ))}
          <div className="flex gap-2 pt-1">
            <a href={`${import.meta.env.BASE_URL}index.html`}><img src={`${import.meta.env.BASE_URL}img/flag-cz.png`} alt="CZ" className="h-5 rounded-sm" /></a>
            <a href={`${import.meta.env.BASE_URL}index-de.html`}><img src={`${import.meta.env.BASE_URL}img/flag-at.png`} alt="AT" className="h-5 rounded-sm opacity-60" /></a>
          </div>
        </div>
      )}
    </nav>
  )
}
