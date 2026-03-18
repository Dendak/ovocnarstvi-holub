import { OBSAH } from '../data'

export default function Kontakt() {
  const k = OBSAH.kontakt
  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(k.adresa + ', ' + k.mesto)}`
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent('Ovocnářství Holub')}&hl=cs&z=14&output=embed`

  return (
    <section id="kontakt" className="bg-green-50 border-t border-green-100 py-16">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#133e13] text-center mb-10">
          Kontakt
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Adresa */}
          <div className="bg-white rounded-2xl border border-green-100 p-5">
            <div className="text-2xl mb-2">📍</div>
            <h3 className="font-semibold text-gray-800 mb-1">Adresa</h3>
            <p className="text-gray-600 text-sm">{k.adresa}<br />{k.mesto}</p>
            <a href={mapUrl} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-2 text-green-700 text-xs hover:underline">
              Zobrazit na mapě →
            </a>
          </div>

          {/* Telefon */}
          <div className="bg-white rounded-2xl border border-green-100 p-5">
            <div className="text-2xl mb-2">📞</div>
            <h3 className="font-semibold text-gray-800 mb-1">Telefon</h3>
            <a href={`tel:${k.tel1.replace(/\s/g, '')}`} className="block text-green-700 font-semibold text-sm hover:underline">{k.tel1}</a>
            <a href={`tel:${k.tel2.replace(/\s/g, '')}`} className="block text-green-700 font-semibold text-sm hover:underline">{k.tel2}</a>
            <p className="text-gray-400 text-xs mt-1">Prodej po telefonické domluvě</p>
          </div>

          {/* Email */}
          <div className="bg-white rounded-2xl border border-green-100 p-5">
            <div className="text-2xl mb-2">✉️</div>
            <h3 className="font-semibold text-gray-800 mb-1">E-mail</h3>
            <a href={`mailto:${k.email}`} className="text-green-700 text-sm font-semibold hover:underline break-all">
              {k.email}
            </a>
          </div>

          {/* Sociální sítě */}
          <div className="bg-white rounded-2xl border border-green-100 p-5">
            <div className="text-2xl mb-2">🌐</div>
            <h3 className="font-semibold text-gray-800 mb-2">Sledujte nás</h3>
            <a href={k.facebook} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 hover:text-green-700 text-sm mb-1 transition-colors">
              <span className="font-medium">Facebook</span>
              <span className="text-gray-400">OvoceHolub</span>
            </a>
            <a href={k.instagram} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 hover:text-green-700 text-sm transition-colors">
              <span className="font-medium">Instagram</span>
              <span className="text-gray-400">{k.instagram.split('/').pop()}</span>
            </a>
          </div>
        </div>

        {/* Mapa */}
        <div className="rounded-2xl overflow-hidden border border-green-100 shadow-sm">
          <div className="bg-green-50 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800 text-sm">{k.jmeno}</p>
              <p className="text-gray-500 text-xs">{k.adresa}, {k.mesto}</p>
            </div>
            <a href={mapUrl} target="_blank" rel="noopener noreferrer"
              className="bg-[#1a561a] text-white text-sm px-4 py-2 rounded-xl hover:bg-[#133e13] transition-colors">
              Otevřít v mapách →
            </a>
          </div>
          <iframe
            src={mapEmbed}
            className="w-full h-80 border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa – Ovocnářství Holub"
          />
        </div>
      </div>
    </section>
  )
}
