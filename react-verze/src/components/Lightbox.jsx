import { useEffect, useCallback } from 'react'

/**
 * Fullscreen photo lightbox with keyboard and arrow navigation.
 * fotos: [{ src, alt }] with src already resolved to a full URL.
 */
export default function Lightbox({ fotos, index, onClose, onNavigate }) {
  const prev = useCallback(() => onNavigate((index - 1 + fotos.length) % fotos.length), [index, fotos.length, onNavigate])
  const next = useCallback(() => onNavigate((index + 1) % fotos.length), [index, fotos.length, onNavigate])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, prev, next])

  const f = fotos[index]
  const btn = 'absolute top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-white/5 hover:bg-white/15 backdrop-blur-sm rounded-full w-11 h-11 flex items-center justify-center transition-colors cursor-pointer'

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={f.alt}
    >
      <button
        onClick={onClose}
        aria-label="Zavřít"
        className="absolute top-4 right-5 text-white/70 hover:text-white text-4xl leading-none transition-colors cursor-pointer"
      >&times;</button>

      {fotos.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); prev() }} aria-label="Předchozí" className={`${btn} left-3 sm:left-6`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
          <button onClick={e => { e.stopPropagation(); next() }} aria-label="Další" className={`${btn} right-3 sm:right-6`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>
        </>
      )}

      <figure className="max-w-[92vw] max-h-[88vh] flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
        <img src={f.src} alt={f.alt} className="max-w-full max-h-[80vh] rounded-lg object-contain shadow-2xl" />
        <figcaption className="text-white/60 text-sm flex items-center gap-3">
          <span>{f.alt}</span>
          {fotos.length > 1 && <span className="text-white/35 tabular-nums">{index + 1} / {fotos.length}</span>}
        </figcaption>
      </figure>
    </div>
  )
}
