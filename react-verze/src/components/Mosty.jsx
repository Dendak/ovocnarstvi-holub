import { OBSAH } from '../data'

const BENEFITY = [
  { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/></svg>, text: 'Bag-in-box 3 l a 5 l' },
  { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"/></svg>, text: 'Bez cukrů a konzervantů' },
  { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>, text: 'Dostupné celoročně' },
]

export default function Mosty() {
  const { platnostOd, skupiny } = OBSAH.mosty

  return (
    <section id="mosty" className="bg-[#f7f4ef] py-20">
      <div className="max-w-5xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-green-700 text-xs tracking-widest uppercase mb-3">100% přírodní · bez přidaných cukrů</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-[#133e13] mb-4">
            Domácí mošty
          </h2>
          <p className="text-gray-500 text-sm">
            Základem je čerstvá jablečná šťáva z vlastního sadu &nbsp;·&nbsp;
            <span className="text-green-700 font-medium">Ceník od {platnostOd}</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_2fr] gap-10 items-start">

          {/* Left: benefits */}
          <div className="space-y-3">
            {BENEFITY.map(b => (
              <div key={b.text} className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 shadow-sm">
                <span className="text-green-700 shrink-0">{b.icon}</span>
                <span className="text-sm font-medium text-gray-700">{b.text}</span>
              </div>
            ))}
            <div className="bg-[#133e13] text-white rounded-2xl px-5 py-5 mt-2">
              <p className="font-serif text-lg font-semibold mb-1">Objednávky</p>
              <p className="text-green-300 text-xs leading-relaxed">
                Zavolejte nebo napište – domluvíme předání přímo nebo rozvoz do Budějovic.
              </p>
            </div>
          </div>

          {/* Right: price list */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 px-6 py-3 bg-[#133e13] text-white text-xs font-semibold uppercase tracking-widest">
              <span>Příchuť</span>
              <span className="text-right w-20">5 l</span>
              <span className="text-right w-16">3 l</span>
            </div>

            {skupiny.map((sk, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_auto] gap-x-6 items-center px-6 py-4 border-b border-gray-100 last:border-0 transition-colors hover:bg-green-50"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {sk.polozky.map(p => (
                      p.dostupne === false
                        ? <span key={p.nazev} className="inline-flex items-center gap-1 bg-gray-100 text-gray-400 text-xs px-3 py-1 rounded-full line-through">{p.nazev}</span>
                        : <span key={p.nazev} className="inline-flex items-center text-xs font-medium px-3 py-1 rounded-full bg-green-100 text-green-800">{p.nazev}</span>
                    ))}
                  </div>

                  <div className="text-right w-20">
                    <span className="font-bold text-lg tabular-nums text-[#133e13]">{sk.cena5l} Kč</span>
                  </div>

                  <div className="text-right w-16">
                    <span className="font-semibold text-sm tabular-nums text-green-600">{sk.cena3l} Kč</span>
                  </div>
                </div>
            ))}
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">
          Ceny jsou za bag-in-box balení včetně obalu. Minimální objednávka 1 kus.
        </p>
      </div>
    </section>
  )
}
