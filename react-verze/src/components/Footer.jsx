import { OBSAH } from '../data'

const BASE = import.meta.env.BASE_URL
const LINKS_CS = [['#ovoce', 'Ovoce'], ['#mosty', 'Mošty'], ['#galerie', 'Fotky'], ['#aktuality', 'Aktuality'], ['#kontakt', 'Kontakt'], [`${BASE}eshop.html`, 'E-shop']]

export default function Footer({
  links = LINKS_CS, gdprLabel = 'Zásady ochrany osobních údajů', name,
  tagline = 'Rodinné ovocnářství v Krtelích u Netolic.', labels = { kontakt: 'Kontakt', odkazy: 'Odkazy' },
}) {
  const k = OBSAH.kontakt
  const jmeno = name || k.jmeno
  const tel = t => t.replace(/\s/g, '')
  return (
    <footer className="bg-forest text-white/70">
      <div className="container-page py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <img src={`${BASE}img/logo.png`} alt={jmeno} className="h-12 w-auto mb-4" width="88" height="48" loading="lazy" />
          <p className="max-w-xs leading-relaxed">{tagline}</p>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">{labels.kontakt}</p>
          <p className="leading-relaxed">
            {k.adresa}, {k.mesto}<br />
            <a href={`tel:${tel(k.tel1)}`} className="hover:text-white">{k.tel1}</a><br />
            <a href={`mailto:${k.email}`} className="hover:text-white">{k.email}</a>
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="text-white font-semibold mb-3">{labels.odkazy}</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {links.map(([href, label]) => (
              <li key={href}><a href={href} className="hover:text-white">{label}</a></li>
            ))}
            <li><a href={k.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white">Facebook</a></li>
            <li><a href={k.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white">Instagram</a></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page py-5 flex flex-col sm:flex-row justify-between gap-2 text-sm text-white/50">
          <p>© {new Date().getFullYear()} {jmeno} · Pavel Holub</p>
          <a href={`${BASE}gdpr.html`} className="hover:text-white">{gdprLabel}</a>
        </div>
      </div>
    </footer>
  )
}
