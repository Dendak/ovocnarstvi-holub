import NavDE from './components/NavDE'
import HeroBlock from './components/HeroBlock'
import GalerieDE from './components/GalerieDE'
import AnfrageForm from './components/AnfrageForm'
import OvoceKarta from './components/OvoceKarta'
import Footer from './components/Footer'
import WhatsAppButton from './components/WhatsAppButton'
import { OBSAH, sortBySeason } from './data'
import { OBST_DE, LABELS_DE } from './dataDE'

const TEL_AT = { label: '+43 678 791 64 33', href: 'tel:+436787916433' }
const TEL_CZ = { label: '+420 775 047 010', href: 'tel:+420775047010' }
const WHATSAPP = '+420 775 047 010'
const MAP_URL = 'https://maps.google.com/?q=Krtely+70,+Netolice,+384+11'

const KONDITIONEN = [
  ['Mindestabnahme', '200 kg pro Bestellung, gerne auch gemischt aus mehreren Obstsorten.'],
  ['Liefergebiet', 'Oberösterreich und Salzburg, direkt zu Ihrer Brennerei.'],
  ['Qualität', 'Kontrollierter Anbau nach den Regeln der integrierten Produktion (SISPO), 30 ha eigener Obstgarten.'],
  ['Ablauf', 'Sie senden uns eine Anfrage, wir melden uns mit Verfügbarkeit, Preis und Liefertermin.'],
]

export default function AppDE() {
  const [featured, ...rest] = sortBySeason(OBST_DE)
  const k = OBSAH.kontakt

  return (
    <>
      <NavDE />
      <div className="h-16" />

      <HeroBlock
        kicker="Familien-Obstbauernhof Holub · Südböhmen"
        title="Verarbeitungsobst für Ihre Edelbrände"
        text="Weichsel, Zwetschken, Birnen und Äpfel aus unserem 30 Hektar großen Obstgarten. Wir liefern ab 200 kg direkt zu Brennereien in Oberösterreich und Salzburg."
        actions={[
          { label: 'Anfrage stellen', href: '#anfrage', primary: true },
          { label: 'Unser Sortiment', href: '#obst' },
        ]}
        facts={['30 ha eigener Obstgarten', 'ab 200 kg', 'integrierte Produktion SISPO', 'Lieferung OÖ & Salzburg']}
      />

      {/* SORTIMENT */}
      <section id="obst" className="bg-paper-2/60 border-b border-line py-20 sm:py-24">
        <div className="container-page">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="kicker mb-3">Unser Sortiment</p>
              <h2 className="section-title">Obst für die Verarbeitung</h2>
            </div>
            <p className="text-ink-soft max-w-sm md:text-right">
              Reif geerntet und sortenrein – ideal für Edelbrände, Destillate und Säfte.
            </p>
          </div>

          <div className="mb-14">
            <OvoceKarta item={featured} featured labels={LABELS_DE}
              cta={{ href: '#anfrage', label: 'Anfrage stellen' }}
              note="Lieferung nach Oberösterreich und Salzburg, Mindestabnahme 200 kg." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {rest.map((item, i) => (
              <OvoceKarta key={item.nazev} item={item} index={i + 1} labels={LABELS_DE} />
            ))}
          </div>
        </div>
      </section>

      {/* LIEFERUNG */}
      <section id="lieferung" className="bg-paper py-20 sm:py-24">
        <div className="container-page grid lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-16">
          <div>
            <p className="kicker mb-3">Lieferung & Konditionen</p>
            <h2 className="section-title mb-6">So arbeiten wir mit Brennereien</h2>
            <p className="lead">
              Wir sind ein Familienbetrieb aus Krtely bei Netolice in Südböhmen. Das Obst ernten wir
              selbst und bringen es Ihnen direkt.
            </p>
          </div>
          <dl className="border-t border-ink/80">
            {KONDITIONEN.map(([dt, dd]) => (
              <div key={dt} className="grid sm:grid-cols-[11rem_1fr] gap-1 sm:gap-6 py-5 border-b border-line">
                <dt className="font-serif text-xl text-ink">{dt}</dt>
                <dd className="text-ink-soft leading-relaxed">{dd}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <GalerieDE />

      <AnfrageForm />

      {/* KONTAKT */}
      <section id="kontakt" className="bg-paper py-20 sm:py-24 border-t border-line">
        <div className="container-page grid lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-16">
          <div>
            <p className="kicker mb-3">Kontakt</p>
            <h2 className="section-title mb-6">So erreichen Sie uns</h2>
            <p className="lead">Am schnellsten per Telefon oder WhatsApp.</p>
          </div>
          <dl className="border-t border-ink/80">
            {[
              ['Adresse', <>{k.adresa}, {k.mesto}, Tschechien<br /><a href={MAP_URL} target="_blank" rel="noopener noreferrer" className="link text-sm">Auf der Karte anzeigen</a></>],
              ['Telefon', <><a href={TEL_AT.href} className="hover:text-leaf">{TEL_AT.label}</a> (Österreich)<br /><a href={TEL_CZ.href} className="hover:text-leaf">{TEL_CZ.label}</a> (Tschechien)</>],
              ['WhatsApp', <a href={`https://wa.me/${WHATSAPP.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-leaf">{WHATSAPP}</a>],
              ['E-Mail', <a href={`mailto:${k.email}`} className="hover:text-leaf">{k.email}</a>],
            ].map(([dt, dd]) => (
              <div key={dt} className="grid grid-cols-[7rem_1fr] sm:grid-cols-[11rem_1fr] gap-4 sm:gap-6 py-4 border-b border-line">
                <dt className="text-sm text-muted pt-0.5">{dt}</dt>
                <dd className="text-ink leading-relaxed">{dd}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Footer
        name="Obstbauernhof Holub"
        tagline="Familien-Obstbauernhof in Krtely bei Netolice, Südböhmen."
        labels={{ kontakt: 'Kontakt', odkazy: 'Links' }}
        gdprLabel="Datenschutzerklärung"
        links={[['#obst', 'Sortiment'], ['#lieferung', 'Lieferung'], ['#galerie', 'Fotos'], ['#anfrage', 'Anfrage'], ['#kontakt', 'Kontakt']]}
      />

      <WhatsAppButton phone={WHATSAPP} />
    </>
  )
}
