import { useEffect, useState } from 'react'
import { UCET, spd, variabilniSymbol } from './platba'
import { formatKc } from './katalog'

// Do schránky; starší prohlížeče bez Clipboard API přes skryté textové pole.
async function doSchranky(text) {
  try { await navigator.clipboard.writeText(text); return true } catch { /* fallback below */ }
  const pole = document.createElement('textarea')
  pole.value = text
  pole.setAttribute('readonly', '')
  pole.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
  document.body.appendChild(pole)
  pole.select()
  let ok = false
  try { ok = document.execCommand('copy') } catch { /* clipboard blocked */ }
  pole.remove()
  return ok
}

// `kopie` = co se zkopíruje, když se liší od zobrazeného (částka jen číslem, IBAN bez mezer).
function Radek({ label, hodnota, kopie = hodnota }) {
  const [zkopirovano, setZkopirovano] = useState(false)
  const kopirovat = async () => {
    if (await doSchranky(kopie)) { setZkopirovano(true); setTimeout(() => setZkopirovano(false), 2000) }
  }
  return (
    // Na telefonu popisek nad hodnotou (vedle sebe by se hodnota s tlačítkem nevešla na šířku obrazovky).
    <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-baseline py-2.5 border-b border-line">
      <dt className="col-span-2 sm:col-span-1 text-sm text-ink-soft">{label}</dt>
      <dd className="min-w-0 font-medium text-ink tabular-nums [overflow-wrap:anywhere]">{hodnota}</dd>
      <dd>
        <button type="button" onClick={kopirovat} aria-label={`Kopírovat – ${label}`} className="text-sm font-semibold text-leaf hover:underline cursor-pointer py-1">
          {zkopirovano ? 'Zkopírováno' : 'Kopírovat'}
        </button>
        <span role="status" className="sr-only">{zkopirovano ? `${label} zkopírováno` : ''}</span>
      </dd>
    </div>
  )
}

/** Bank details + QR Platba for one order. */
export default function PlatbaPrevodem({ cislo, castka }) {
  const [qr, setQr] = useState(null)
  const vs = variabilniSymbol(cislo)

  // Generátor QR kódu se stahuje, až je potřeba.
  useEffect(() => {
    let zruseno = false
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(spd({ castka, vs, zprava: `Objednavka ${cislo}` }), { margin: 1, width: 440, errorCorrectionLevel: 'M' }))
      .then(url => { if (!zruseno) setQr(url) })
      .catch(() => { if (!zruseno) setQr(null) })
    return () => { zruseno = true }
  }, [cislo, castka, vs])

  return (
    <div className="panel p-6 sm:p-8 text-left">
      <h2 className="font-serif text-2xl text-ink mb-1">Platba převodem</h2>
      <p className="text-sm text-ink-soft mb-6">Naskenujte QR kód v aplikaci své banky, nebo zadejte údaje ručně. Zaplaťte prosím nejpozději den před termínem dovozu nebo vyzvednutí.</p>
      <div className="grid sm:grid-cols-[13rem_1fr] gap-6 items-start">
        <div className="mx-auto sm:mx-0">
          {qr
            ? <img src={qr} alt={`QR Platba ${formatKc(castka)}, variabilní symbol ${vs}`} width="208" height="208" className="w-52 h-52 border border-line rounded-md bg-white" />
            : <div className="w-52 h-52 border border-line rounded-md bg-paper" />}
          <p className="text-sm text-ink-soft text-center mt-2">QR Platba</p>
          {qr && <a href={qr} download={`QR-platba-${cislo}.png`} className="link text-sm block text-center mt-1">Uložit QR kód</a>}
        </div>
        <dl>
          <Radek label="Částka" hodnota={formatKc(castka)} kopie={String(castka)} />
          <Radek label="Číslo účtu" hodnota={UCET.cislo} />
          <Radek label="Variabilní symbol" hodnota={vs} />
          <Radek label="IBAN" hodnota={UCET.iban.replace(/(.{4})/g, '$1 ').trim()} kopie={UCET.iban} />
          <Radek label="Příjemce" hodnota={UCET.majitel} />
        </dl>
      </div>
      <p className="text-sm text-ink-soft mt-6 bg-paper-2 rounded-md px-4 py-3">
        Platíte ze stejného telefonu? Podržte prst na QR kódu a zvolte Uložit obrázek (nebo klepněte na Uložit QR kód).
        V aplikaci banky pak zvolte QR platbu a načtěte ji z obrázku v galerii.
      </p>
    </div>
  )
}
