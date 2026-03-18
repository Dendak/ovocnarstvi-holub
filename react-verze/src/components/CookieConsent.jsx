import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ovocnarstvi-cookies'

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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 text-green-700 mt-0.5">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 mb-1">Soukromí a cookies</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Tento web používá cookies třetích stran (Google Fonts, Google Maps) pro správné zobrazení
              a mapy. Žádné marketingové ani analytické cookies nepoužíváme.{' '}
              <a href={`${import.meta.env.BASE_URL}gdpr.html`} className="text-green-700 hover:underline font-medium">
                Zásady ochrany osobních údajů
              </a>
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onAccept}
                className="bg-[#1a561a] text-white font-medium px-6 py-2.5 rounded-xl hover:bg-[#133e13] transition-colors text-sm cursor-pointer"
              >
                Přijmout vše
              </button>
              <button
                onClick={onReject}
                className="bg-gray-100 text-gray-600 font-medium px-6 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm cursor-pointer"
              >
                Pouze nezbytné
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
