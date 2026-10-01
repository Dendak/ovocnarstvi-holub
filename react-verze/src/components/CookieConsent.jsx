import { useEffect, useRef, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'ovocnarstvi-cookies'

// Souhlas s cookies je sdílený pro celou stránku (lišta, mapa, Facebook, tlačítko v patičce).
// Když prohlížeč úložiště blokuje, volba platí aspoň do zavření stránky.
let stav = { volba: cist(), otevreno: false }
const posluchaci = new Set()
let navrat = null // prvek, na který se po volbě vrátí fokus (tlačítko v patičce)

function cist() {
  try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
}

function zmenit(novy) {
  stav = { ...stav, ...novy }
  posluchaci.forEach(fn => fn())
}

function zvolit(volba) {
  try { localStorage.setItem(STORAGE_KEY, volba) } catch { /* úložiště blokované */ }
  zmenit({ volba, otevreno: false })
  navrat?.focus?.()
  navrat = null
}

const odebirat = fn => { posluchaci.add(fn); return () => posluchaci.delete(fn) }
const snimek = () => stav

// eslint-disable-next-line react-refresh/only-export-components
export const povolitCookies = () => zvolit('accepted')
// eslint-disable-next-line react-refresh/only-export-components
export const odmitnoutCookies = () => zvolit('rejected')
// Znovu otevře lištu, aby šla volba změnit nebo odvolat (tlačítko „Nastavení cookies“).
// eslint-disable-next-line react-refresh/only-export-components
export const otevritNastaveniCookies = () => {
  navrat = document.activeElement
  zmenit({ otevreno: true })
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCookieConsent() {
  const { volba, otevreno } = useSyncExternalStore(odebirat, snimek, snimek)
  return {
    consent: volba, otevreno,
    accept: povolitCookies, reject: odmitnoutCookies, reset: otevritNastaveniCookies,
    accepted: volba === 'accepted',
  }
}

/**
 * Lišta se souhlasem. `automaticky` = ukáže se sama, dokud návštěvník nevybral;
 * jinak jen po kliknutí na „Nastavení cookies“.
 */
export default function CookieConsent({ automaticky = true }) {
  const { consent, otevreno } = useCookieConsent()
  const panel = useRef(null)
  const zobrazit = otevreno || (automaticky && consent === null)

  // Prvky posunuté do pohledu klávesnicí nesmí skončit schované pod lištou.
  useEffect(() => {
    if (!zobrazit || !panel.current) return
    const html = document.documentElement
    const nastavit = () => { html.style.scrollPaddingBottom = `${panel.current.offsetHeight + 16}px` }
    nastavit()
    window.addEventListener('resize', nastavit)
    return () => { window.removeEventListener('resize', nastavit); html.style.scrollPaddingBottom = '' }
  }, [zobrazit])

  // Po otevření z patičky přesune fokus do lišty.
  useEffect(() => {
    if (otevreno) panel.current?.querySelector('button')?.focus()
  }, [otevreno])

  if (!zobrazit) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-5 pointer-events-none" role="region" aria-label="Souhlas s cookies">
      <div ref={panel} className="pointer-events-auto max-w-3xl mx-auto bg-white border border-line rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-5 sm:flex sm:items-center sm:gap-6">
        <p className="text-sm text-ink-soft leading-relaxed mb-4 sm:mb-0 flex-1">
          Pro zobrazení mapy a příspěvků z Facebooku používáme cookies třetích stran. Marketingové ani
          analytické cookies nepoužíváme.{' '}
          {consent && <>Nyní máte {consent === 'accepted' ? 'povoleno vše' : 'jen nezbytné'}. </>}
          <a href={`${import.meta.env.BASE_URL}gdpr.html`} className="underline">Více informací</a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button onClick={odmitnoutCookies} className="btn-outline !py-2 !px-4 !text-sm">Jen nezbytné</button>
          <button onClick={povolitCookies} className="btn !py-2 !px-4 !text-sm">Povolit vše</button>
        </div>
      </div>
    </div>
  )
}
