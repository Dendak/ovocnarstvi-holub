import SiteNav from './SiteNav'

const LINKS = [
  { label: 'Ovoce',     href: '#ovoce' },
  { label: 'Mošty',     href: '#mosty' },
  { label: 'Aktuality', href: '#aktuality' },
  { label: 'Fotky',     href: '#galerie' },
  { label: 'Kontakt',   href: '#kontakt' },
]

export default function Nav() {
  return (
    <SiteNav links={LINKS} lang="cs" logoAlt="Ovocnářství Holub"
      cta={{ label: 'E-shop', href: `${import.meta.env.BASE_URL}eshop.html` }} />
  )
}
