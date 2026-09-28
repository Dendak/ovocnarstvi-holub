const SISPO_URL = 'https://www.sispo.cz/integrovana-produkce/'

const FAKTA = [
  ['30 ha', 'vlastního sadu v Krtelích u Netolic'],
  ['15 000+', 'ovocných stromů'],
  ['15+', 'odrůd jablek, od Topazu po Braeburn'],
  ['7', 'druhů ovoce od července do jara'],
]

export default function ONas() {
  return (
    <section className="bg-paper py-20 sm:py-24">
      <div className="container-page grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20">
        <div>
          <p className="kicker mb-3">O nás</p>
          <h2 className="section-title mb-6">Rodinný sad, kde ovoce sklízíme sami</h2>
          <div className="space-y-4 lead">
            <p>
              V Krtelích u Netolic pěstujeme ovoce na třiceti hektarech. Třešně, višně, meruňky, broskve,
              švestky, hrušky a hlavně jablka – od první sklizně v červenci až po zimní odrůdy, které
              skladujeme do jara.
            </p>
            <p>
              Prodáváme přímo, bez prostředníků. Z jablek z vlastního sadu lisujeme i mošty,
              bez přidaného cukru a konzervantů.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 mt-10 pt-8 border-t border-line">
            {FAKTA.map(([cislo, popis]) => (
              <div key={cislo}>
                <dt className="font-serif text-3xl text-ink">{cislo}</dt>
                <dd className="text-sm text-ink-soft mt-1">{popis}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="self-start panel p-7 sm:p-8">
          <div className="flex items-center gap-4 mb-5">
            <img src={`${import.meta.env.BASE_URL}img/sispo.gif`} alt="Logo SISPO" className="h-12 w-auto" />
            <div>
              <p className="font-semibold text-ink">Integrovaná produkce</p>
              <p className="text-sm text-muted">Certifikováno svazem SISPO</p>
            </div>
          </div>
          <p className="text-ink-soft leading-relaxed mb-4">
            Pěstujeme podle pravidel integrované produkce: ochrana rostlin přednostně přírodními
            metodami a chemické přípravky jen tam, kde je to nezbytné.
          </p>
          <p className="text-ink-soft leading-relaxed mb-6">
            Pro vás to znamená ovoce s nižším obsahem reziduí, pěstované s ohledem na přírodu kolem sadu.
          </p>
          <a href={SISPO_URL} target="_blank" rel="noopener noreferrer" className="link text-sm">
            Co je integrovaná produkce
          </a>
        </aside>
      </div>
    </section>
  )
}
