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
import CookieConsent, { useCookieConsent } from './components/CookieConsent'

export default function App() {
  const { consent, accept, reject, accepted } = useCookieConsent()
  const k = OBSAH.kontakt

  return (
    <>
      <Nav />
      <div className="h-16" />
      <Hero />
      <ONas />
      <OvoceSection />
      <Mosty />
      <Galerie />
      <Aktuality cookiesAccepted={accepted} />
      <Kontakt cookiesAccepted={accepted} />
      <Footer />

      {consent === null && <CookieConsent onAccept={accept} onReject={reject} />}
      <WhatsAppButton phone={k.tel1} text="Dobrý den, rád/a bych se zeptal/a na dostupnost ovoce nebo moštů." />
    </>
  )
}
