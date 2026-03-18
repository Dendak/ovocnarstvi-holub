import { OBSAH } from '../data'

export default function Aktuality() {
  const { skladem } = OBSAH.aktuality
  const k = OBSAH.kontakt
  const igHandle = k.instagram.split('/').pop()

  return (
    <section id="aktuality" className="bg-white border-t border-green-100 py-16">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#133e13] text-center mb-10">
          Aktuality
        </h2>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Skladem */}
          <div>
            {skladem.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-green-700 mb-3">
                  ✅ Aktuálně máme skladem
                </p>
                <div className="flex flex-wrap gap-2">
                  {skladem.map(s => (
                    <span key={s} className="bg-white border border-green-200 text-green-800 text-sm px-3 py-1.5 rounded-full font-medium shadow-sm">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Facebook */}
            <iframe
              src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(k.facebook)}&tabs=timeline&width=400&height=500&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`}
              className="w-full rounded-2xl border border-green-100 overflow-hidden"
              height="500"
              style={{ border: 'none', overflow: 'hidden' }}
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            />
          </div>

          {/* Instagram */}
          <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <p className="font-semibold text-gray-800 mb-0.5">@{igHandle}</p>
            <p className="text-gray-500 text-sm mb-5">Sledujte nás na Instagramu</p>
            <a
              href={k.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity"
            >
              Sledovat na Instagramu
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
