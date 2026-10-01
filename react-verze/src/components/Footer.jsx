import { OBSAH } from '../data'
import CookieConsent, { otevritNastaveniCookies } from './CookieConsent'

const BASE = import.meta.env.BASE_URL
const k = OBSAH.kontakt
const LINKS_CS = [['#ovoce', 'Ovoce'], ['#mosty', 'Mošty'], ['#galerie', 'Fotky'], ['#aktuality', 'Aktuality'], ['#kontakt', 'Kontakt'], [`${BASE}eshop.html`, 'E-shop']]
const PRAVNI_CS = [[`${BASE}obchodni-podminky.html`, 'Obchodní podmínky'], [`${BASE}gdpr.html`, 'Ochrana osobních údajů']]
// Identifikace prodávajícího (§ 435 občanského zákoníku).
const IDENTIFIKACE_CS = `${k.provozovatel} · ${k.adresa}, ${k.mesto} · IČO ${k.ico} · DIČ ${k.dic} (plátce DPH)`

/**
 * Patička sdílená hlavní stránkou, e-shopem a německou stránkou.
 * cookies: zobrazit tlačítko „Nastavení cookies“; cookieLista: patička si lištu vykreslí sama
 * (na stránkách, kde se lišta jinak automaticky neukazuje – e-shop).
 */
export default function Footer({
  links = LINKS_CS, name, tagline = 'Rodinné ovocnářství v Krtelích u Netolic.',
  labels = { kontakt: 'Kontakt', odkazy: 'Odkazy', cookies: 'Nastavení cookies' },
  phone = k.tel1, pravni = PRAVNI_CS, identifikace = IDENTIFIKACE_CS,
  cookies = true, cookieLista = true,
}) {
  const jmeno = name || k.jmeno
  const tel = t => t.replace(/\s/g, '')
  return (
    <>
      <footer className="bg-forest text-white/75">
        <div className="container-page py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <picture>
              <source srcSet={`${BASE}img/_w480/logo.webp`} type="image/webp" />
              <img src={`${BASE}img/logo.png`} alt={jmeno} className="h-12 w-auto mb-4" width="88" height="48" loading="lazy" />
            </picture>
            <p className="max-w-xs leading-relaxed">{tagline}</p>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">{labels.kontakt}</p>
            <p className="leading-relaxed">
              {k.adresa}, {k.mesto}<br />
              <a href={`tel:${tel(phone)}`} className="hover:text-white">{phone}</a><br />
              <a href={`mailto:${k.email}`} className="hover:text-white">{k.email}</a>
            </p>
          </div>
          <nav aria-label={labels.odkazy}>
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
          {/* Dole místo navíc, ať řádek nezakrývá plovoucí tlačítko WhatsApp. */}
          <div className="container-page pt-5 pb-24 lg:pb-5 lg:pr-24 flex flex-col lg:flex-row lg:items-start justify-between gap-3 text-sm text-white/65">
            <p>© {new Date().getFullYear()} {jmeno} · {identifikace}</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 shrink-0">
              {pravni.map(([href, label]) => (
                <li key={href}><a href={href} className="inline-block py-1 hover:text-white underline-offset-4 hover:underline">{label}</a></li>
              ))}
              {cookies && (
                <li>
                  <button type="button" onClick={otevritNastaveniCookies} className="inline-block py-1 cursor-pointer hover:text-white underline-offset-4 hover:underline">
                    {labels.cookies}
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </footer>
      {/* Mimo tmavou patičku (jinak by zdědila bílý obrys fokusu). */}
      {cookies && cookieLista && <CookieConsent automaticky={false} />}
    </>
  )
}
