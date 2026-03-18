import { OBSAH } from '../data'

export default function Footer() {
  const k = OBSAH.kontakt
  return (
    <footer className="bg-[#133e13] text-green-300 text-center py-8 text-sm">
      <p className="font-serif text-white text-lg mb-0.5">{k.jmeno}</p>
      <p className="text-green-400 text-xs mb-2">Pavel Holub</p>
      <p className="text-green-300/70 text-xs">
        {k.adresa}, {k.mesto} &nbsp;·&nbsp; {k.tel1} &nbsp;·&nbsp; {k.email}
      </p>
      <p className="mt-3 text-green-500 text-xs">
        © {new Date().getFullYear()} Ovocnářství Holub &nbsp;·&nbsp;{' '}
        <a href="/gdpr.html" className="hover:text-green-300 underline">Zásady ochrany osobních údajů</a>
      </p>
    </footer>
  )
}
