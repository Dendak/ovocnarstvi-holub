import { useEffect, useState } from 'react'
import { sklonovat } from './katalog'

// Address field with suggestions from the Czech address register (api/adresa.php?naseptat=1).
// `mesto` narrows the search to one town. Picking a suggestion puts just the street line into the field;
// `onVyber(kandidat)` gets the whole record: { adresa, ulice, psc, mesto, gps | null }.
// Další vlastnosti (aria-invalid, aria-describedby, aria-required …) jdou přímo na pole.
export default function AdresaInput({ id, value, mesto = '', onChange, onVyber, onBlur, className, placeholder, ...rest }) {
  const [navrhy, setNavrhy] = useState([])
  const [otevreno, setOtevreno] = useState(false)
  const [aktivni, setAktivni] = useState(-1)
  const [hleda, setHleda] = useState(false)
  const [vybrane, setVybrane] = useState(value)
  const [proCo, setProCo] = useState('')

  useEffect(() => {
    const q = value.trim()
    if (q.length < 3 || q === vybrane) return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setHleda(true)
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/adresa.php?naseptat=1&q=${encodeURIComponent(q)}&mesto=${encodeURIComponent(mesto.trim())}`, { signal: ctrl.signal })
        const d = res.ok ? await res.json() : {}
        setNavrhy(d.kandidati || [])
        // Při výpadku registru nebo limitu nehlásíme „nenašli jsme“ – pole funguje dál jako obyčejný text.
        setProCo(d.nedostupne || d.limit ? '' : q)
        setAktivni(-1)
      } catch { /* aborted or offline – the field still works as plain text */ }
      setHleda(false)
    }, 300)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [value, vybrane, mesto])

  const vybrat = k => {
    setVybrane(k.ulice)
    setOtevreno(false)
    setNavrhy([])
    onChange(k.ulice)
    onVyber?.(k)
  }

  const klavesa = e => {
    if (!otevreno || !navrhy.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setAktivni(i => (i + 1) % navrhy.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAktivni(i => (i <= 0 ? navrhy.length - 1 : i - 1)) }
    else if (e.key === 'Enter' && aktivni >= 0) { e.preventDefault(); vybrat(navrhy[aktivni]) }
    else if (e.key === 'Escape') setOtevreno(false)
  }

  const q = value.trim()
  const zobrazit = otevreno && q.length >= 3 && q !== vybrane
  const seznam = zobrazit && navrhy.length > 0
  const nic = zobrazit && navrhy.length === 0 && !hleda && proCo === q
  return (
    <div className="relative">
      <input id={id} value={value} autoComplete="off" placeholder={placeholder} className={className} {...rest}
        role="combobox" aria-expanded={seznam} aria-controls={`${id}-navrhy`} aria-autocomplete="list"
        aria-activedescendant={seznam && aktivni >= 0 ? `${id}-navrh-${aktivni}` : undefined}
        onChange={e => { setVybrane(null); setOtevreno(true); onChange(e.target.value) }}
        onFocus={() => setOtevreno(true)}
        onBlur={e => { setOtevreno(false); onBlur?.(e) }}
        onKeyDown={klavesa} />
      <ul id={`${id}-navrhy`} role="listbox" aria-label="Návrhy adres" hidden={!seznam}
        className="absolute z-20 left-0 right-0 mt-1 bg-white border border-line rounded-md shadow-lg overflow-hidden text-base sm:text-sm">
        {seznam && navrhy.map((k, i) => (
          <li key={k.adresa} id={`${id}-navrh-${i}`} role="option" aria-selected={i === aktivni}
            onMouseDown={e => { e.preventDefault(); vybrat(k) }}
            className={`px-4 py-2.5 cursor-pointer ${i === aktivni ? 'bg-paper-2' : 'hover:bg-paper'}`}>
            {k.adresa}
          </li>
        ))}
      </ul>
      {nic && (
        <p className="absolute z-20 left-0 right-0 mt-1 bg-white border border-line rounded-md shadow-lg px-4 py-2.5 text-sm text-ink-soft">
          Žádnou takovou adresu jsme nenašli. Zkuste ulici a číslo domu, případně upravte město.
        </p>
      )}
      <p role="status" className="sr-only">
        {seznam ? `${sklonovat(navrhy.length, 'návrh adresy', 'návrhy adres', 'návrhů adres')}, vyberte šipkami.` : nic ? 'Žádnou takovou adresu jsme nenašli.' : ''}
      </p>
    </div>
  )
}
