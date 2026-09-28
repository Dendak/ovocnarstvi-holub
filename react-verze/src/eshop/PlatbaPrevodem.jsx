import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { UCET, spd, variabilniSymbol } from './platba'
import { formatKc } from './katalog'

function Radek({ label, hodnota }) {
  const [zkopirovano, setZkopirovano] = useState(false)
  const kopirovat = async () => {
    try { await navigator.clipboard.writeText(hodnota); setZkopirovano(true); setTimeout(() => setZkopirovano(false), 1500) } catch { /* clipboard blocked */ }
  }
  return (
    <div className="grid grid-cols-[7.5rem_1fr_auto] gap-3 items-baseline py-2.5 border-b border-line">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium text-ink tabular-nums break-words">{hodnota}</dd>
      <button type="button" onClick={kopirovat} className="text-xs font-semibold text-leaf hover:underline cursor-pointer">
        {zkopirovano ? 'Zkopírováno' : 'Kopírovat'}
      </button>
    </div>
  )
}

/** Bank details + QR Platba for one order. */
export default function PlatbaPrevodem({ cislo, castka }) {
  const [qr, setQr] = useState(null)
  const vs = variabilniSymbol(cislo)

  useEffect(() => {
    QRCode.toDataURL(spd({ castka, vs, zprava: `Objednavka ${cislo}` }), { margin: 1, width: 440, errorCorrectionLevel: 'M' })
      .then(setQr).catch(() => setQr(null))
  }, [cislo, castka, vs])

  return (
    <div className="panel p-6 sm:p-8 text-left">
      <h2 className="font-serif text-2xl text-ink mb-1">Platba převodem</h2>
      <p className="text-sm text-muted mb-6">Naskenujte QR kód v aplikaci své banky, nebo zadejte údaje ručně. Zaplaťte prosím nejpozději den před dovozem.</p>
      <div className="grid sm:grid-cols-[13rem_1fr] gap-6 items-start">
        <div className="mx-auto sm:mx-0">
          {qr
            ? <img src={qr} alt={`QR Platba ${formatKc(castka)}`} width="208" height="208" className="w-52 h-52 border border-line rounded-md bg-white" />
            : <div className="w-52 h-52 border border-line rounded-md bg-paper" />}
          <p className="text-xs text-muted text-center mt-2">QR Platba</p>
        </div>
        <dl>
          <Radek label="Částka" hodnota={formatKc(castka)} />
          <Radek label="Číslo účtu" hodnota={UCET.cislo} />
          <Radek label="Variabilní symbol" hodnota={vs} />
          <Radek label="IBAN" hodnota={UCET.iban.replace(/(.{4})/g, '$1 ').trim()} />
          <Radek label="Příjemce" hodnota={UCET.majitel} />
        </dl>
      </div>
    </div>
  )
}
