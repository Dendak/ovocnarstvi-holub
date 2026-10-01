// Odeslání zprávy z kontaktního formuláře (česká stránka) a z poptávky pálenic (německá stránka).
// Napřed na vlastní hosting (api/kontakt.php), který ji pošle e-mailem farmě. Přes FormSubmit
// (zaloha: { adresa, data }) jen tehdy, když hosting neodpoví – chyba sítě, 5xx nebo odpověď,
// která není od nás. Když hosting zprávu odmítne (4xx: neplatné údaje, limit), záloha se nepoužije.
// Vrací { ok: true } nebo { ok: false, chyba }.
export async function odeslatZpravu(data, zaloha) {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/kontakt.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    })
    const d = await res.json().catch(() => null)
    if (res.status < 500 && typeof d?.ok === 'boolean') return d.ok ? { ok: true } : { ok: false, chyba: d.chyba || 'chyba' }
  } catch { /* síť – zkusí se záloha */ }

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${zaloha.adresa}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(zaloha.data),
    })
    // FormSubmit hlásí výsledek v těle ({"success":"true"}), stav 200 sám nic neznamená.
    const d = await res.json().catch(() => null)
    return res.ok && String(d?.success) === 'true' ? { ok: true } : { ok: false, chyba: 'odeslani' }
  } catch {
    return { ok: false, chyba: 'odeslani' }
  }
}
