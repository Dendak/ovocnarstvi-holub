// Údaje zákazníka ani historie objednávek se do zařízení neukládají – objednávky a doručovací
// údaje patří k zákaznickému účtu. (V prohlížeči zůstává jen košík a nezbytné přihlášení.)

// Úklid po starší verzi, která si údaje a historii pamatovala v prohlížeči.
try { localStorage.removeItem('ovoce-holub-ucet') } catch { /* private mode – nothing to clean */ }

// Účty přes Google/Seznam a starší účty mají celé jméno v jednom poli.
export function rozdelitJmeno(cele = '') {
  const c = cele.trim().split(/\s+/)
  return c.length > 1 ? [c.slice(0, -1).join(' '), c[c.length - 1]] : [c[0] || '', '']
}
