import SiteNav from './SiteNav'

const LINKS = [
  { label: 'Sortiment', href: '#obst' },
  { label: 'Lieferung', href: '#lieferung' },
  { label: 'Fotos',     href: '#galerie' },
  { label: 'Kontakt',   href: '#kontakt' },
]

export default function NavDE() {
  return (
    <SiteNav links={LINKS} lang="de" logoAlt="Obstbauernhof Holub" skipLabel="Zum Inhalt springen" menuLabel="Menü"
      cta={{ label: 'Anfrage stellen', href: '#anfrage' }} />
  )
}
