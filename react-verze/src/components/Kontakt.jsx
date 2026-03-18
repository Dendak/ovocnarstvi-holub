import { OBSAH } from '../data'

const IconPin = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
  </svg>
)
const IconPhone = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
  </svg>
)
const IconMail = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
  </svg>
)
const IconShare = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
  </svg>
)

export default function Kontakt() {
  const k = OBSAH.kontakt
  const mapUrl = 'https://www.google.com/maps/place/Ovocn%C3%A1%C5%99stv%C3%AD+Holub/@49.0826258,14.1677963,17z/data=!4m6!3m5!1s0x4774ad0019e39f15:0xf1e2281c3b44a6c7!8m2!3d49.0826258!4d14.1703712!16s%2Fg%2F11xfhkf620'
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent('Ovocnářství Holub')}&hl=cs&z=14&output=embed`

  const cards = [
    {
      icon: <IconPin />,
      title: 'Adresa',
      content: (
        <>
          <p className="text-gray-600 text-sm">{k.adresa}<br />{k.mesto}</p>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer"
            className="inline-block mt-2 text-green-700 text-xs hover:underline font-medium">
            Zobrazit na mapě →
          </a>
        </>
      ),
    },
    {
      icon: <IconPhone />,
      title: 'Telefon',
      content: (
        <>
          <a href={`tel:${k.tel1.replace(/\s/g, '')}`} className="block text-green-700 font-semibold text-sm hover:underline">{k.tel1}</a>
          <a href={`tel:${k.tel2.replace(/\s/g, '')}`} className="block text-green-700 font-semibold text-sm hover:underline">{k.tel2}</a>
          <p className="text-gray-400 text-xs mt-1">Prodej po telefonické domluvě</p>
        </>
      ),
    },
    {
      icon: <IconMail />,
      title: 'E-mail',
      content: (
        <a href={`mailto:${k.email}`} className="text-green-700 text-sm font-semibold hover:underline break-all">
          {k.email}
        </a>
      ),
    },
    {
      icon: <IconShare />,
      title: 'Sledujte nás',
      content: (
        <>
          <a href={k.facebook} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-600 hover:text-green-700 text-sm mb-1.5 transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span className="font-medium">Facebook</span>
          </a>
          <a href={k.instagram} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-600 hover:text-green-700 text-sm transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            <span className="font-medium">Instagram</span>
          </a>
        </>
      ),
    },
  ]

  return (
    <section id="kontakt" className="bg-green-50 border-t border-green-100 py-16">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#133e13] text-center mb-10">
          Kontakt
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map(c => (
            <div key={c.title} className="bg-white rounded-2xl border border-green-100 p-5 hover:shadow-md transition-shadow">
              <div className="text-green-700 mb-3">{c.icon}</div>
              <h3 className="font-semibold text-gray-800 mb-1.5">{c.title}</h3>
              {c.content}
            </div>
          ))}
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
