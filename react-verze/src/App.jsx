import { OBSAH } from './data'
import Nav          from './components/Nav'
import Hero         from './components/Hero'
import ONas         from './components/ONas'
import OvoceSection from './components/OvoceSection'
import Mosty        from './components/Mosty'
import Galerie      from './components/Galerie'
import Aktuality    from './components/Aktuality'
import Kontakt      from './components/Kontakt'
import Footer       from './components/Footer'
import WhatsAppButton from './components/WhatsAppButton'
import JazykovaNapoveda from './components/JazykovaNapoveda'
import CookieConsent, { useCookieConsent } from './components/CookieConsent'

export default function App() {
  const { accept, accepted } = useCookieConsent()
  const k = OBSAH.kontakt

  return (
    <>
      {/* Lišta se souhlasem je v pořadí Tabu hned na začátku (vizuálně dole). */}
      <CookieConsent />
      <Nav />
      <div className="h-16" />
      <JazykovaNapoveda jazyky={['de']} lang="de" href={`${import.meta.env.BASE_URL}index-de.html`}
        text="Für Brennereien in Österreich: Verarbeitungsobst ab 200 kg – Seite auf Deutsch →" zavritLabel="Schließen" />
      <main id="obsah" tabIndex={-1} className="outline-none">
        <Hero />
        <ONas />
        <OvoceSection />
        <Mosty />
        <Galerie />
        <Aktuality cookiesAccepted={accepted} />
        <Kontakt cookiesAccepted={accepted} onAcceptCookies={accept} />
      </main>
      <Footer cookieLista={false} />

      <WhatsAppButton phone={k.tel1} text="Dobrý den, rád/a bych se zeptal/a na dostupnost ovoce nebo moštů." />
    </>
  )
}
