const HERO_FOTO = 'img/sad/504681257_4078182002327026_6055659733487249673_n.jpg'

/**
 * Full-bleed photo intro shared by the Czech and German pages.
 * actions: [{ label, href, primary? }], facts: [string]
 */
export default function HeroBlock({ kicker, title, text, actions, facts }) {
  return (
    <header className="relative min-h-[calc(92svh-4rem)] flex flex-col text-white bg-forest overflow-hidden">
      <img src={`${import.meta.env.BASE_URL}${HERO_FOTO}`} alt="" fetchPriority="high" decoding="async"
        className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center 40%' }} />
      <div className="absolute inset-0 bg-gradient-to-r from-forest/85 via-forest/55 to-forest/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-forest/75 via-forest/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-forest/80 to-transparent" />

      <div className="relative flex-1 flex flex-col justify-start container-page pt-14 sm:pt-20 pb-12">
        <p className="text-[0.95rem] font-medium text-white/80 mb-4">{kicker}</p>
        <h1 className="font-serif font-medium leading-[1.05] max-w-3xl mb-6"
          style={{ fontSize: 'clamp(2.6rem, min(6.4vw, 9svh), 5rem)' }}>
          {title}
        </h1>
        <p className="text-lg sm:text-xl leading-relaxed text-white/85 max-w-xl mb-9">{text}</p>
        <div className="flex flex-col sm:flex-row sm:self-start gap-3">
          {actions.map(a => (
            <a key={a.label} href={a.href}
              className={a.primary ? 'btn-light' : 'btn-outline !text-white !border-white/45 hover:!border-white hover:!bg-white/10'}>
              {a.label}
            </a>
          ))}
        </div>
      </div>

      {facts?.length > 0 && (
        <div className="relative border-t border-white/15">
          <ul className="container-page py-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/75">
            {facts.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}
    </header>
  )
}
