import { useState } from 'react'

const STORAGE_KEY = 'ovocnarstvi-cookies'

// eslint-disable-next-line react-refresh/only-export-components
export function useCookieConsent() {
  const [consent, setConsent] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
  })

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setConsent('accepted')
  }

  const reject = () => {
    localStorage.setItem(STORAGE_KEY, 'rejected')
    setConsent('rejected')
  }

  return { consent, accept, reject, accepted: consent === 'accepted' }
}

export default function CookieConsent({ onAccept, onReject }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-5" role="dialog" aria-label="Cookies">
      <div className="max-w-3xl mx-auto bg-white border border-line rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-5 sm:flex sm:items-center sm:gap-6">
        <p className="text-sm text-ink-soft leading-relaxed mb-4 sm:mb-0 flex-1">
          Pro zobrazení mapy a příspěvků z Facebooku používáme cookies třetích stran. Marketingové ani
          analytické cookies nepoužíváme.{' '}
          <a href={`${import.meta.env.BASE_URL}gdpr.html`} className="underline">Více informací</a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button onClick={onReject} className="btn-outline !py-2 !px-4 !text-sm">Jen nezbytné</button>
          <button onClick={onAccept} className="btn !py-2 !px-4 !text-sm">Povolit vše</button>
        </div>
      </div>
    </div>
  )
}
