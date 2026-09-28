import { OBSAH } from '../data'
import HeroBlock from './HeroBlock'

export default function Hero() {
  const k = OBSAH.kontakt
  return (
    <HeroBlock
      kicker="Rodinné ovocnářství Holub · Krtely u Netolic"
      title="Ovoce a mošty přímo z našeho sadu"
      text="Jablka, hrušky, švestky, třešně a další ovoce z vlastních třiceti hektarů. Objednáte online a v pondělí, středu nebo pátek vám ho přivezeme až domů do Českých Budějovic."
      actions={[
        { label: 'Objednat v e-shopu', href: `${import.meta.env.BASE_URL}eshop.html`, primary: true },
        { label: `Zavolat ${k.tel1.replace('+420 ', '')}`, href: `tel:${k.tel1.replace(/\s/g, '')}` },
      ]}
      facts={['30 ha vlastního sadu', 'přes 15 000 stromů', 'integrovaná produkce SISPO', 'dovoz po · st · pá']}
    />
  )
}
