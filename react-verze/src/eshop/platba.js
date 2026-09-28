// ============================================================
//  PLATBA PŘEVODEM – účet, na který zákazníci posílají peníze
// ============================================================
export const UCET = {
  cislo: '662075319/0800',
  iban: 'CZ3008000000000662075319',
  bic: 'GIBACZPX',
  majitel: 'Pavel Holub',
}

const bezDiakritiky = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

// Variabilní symbol z čísla objednávky: OH-260927-169 → 260927169
export function variabilniSymbol(cislo) {
  return cislo.replace(/\D/g, '').slice(-10)
}

// Řetězec pro QR Platbu (Short Payment Descriptor, standard ČBA).
export function spd({ castka, vs, zprava }) {
  const casti = [
    'SPD*1.0',
    `ACC:${UCET.iban}+${UCET.bic}`,
    `AM:${castka.toFixed(2)}`,
    'CC:CZK',
    `X-VS:${vs}`,
    `RN:${bezDiakritiky(UCET.majitel).toUpperCase()}`,
  ]
  if (zprava) casti.push(`MSG:${bezDiakritiky(zprava).replace(/\*/g, '').slice(0, 60)}`)
  return casti.join('*')
}

// Odkaz na stránku s QR kódem (do potvrzovacího e-mailu).
export function odkazNaPlatbu(cislo, castka) {
  const url = new URL(location.origin + location.pathname)
  url.searchParams.set('platba', cislo)
  url.searchParams.set('castka', String(castka))
  return url.toString()
}
