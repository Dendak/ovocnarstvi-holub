// ============================================================
//  ZÁKAZNICKÉ ÚČTY (Supabase)
//  Obě hodnoty najdete v Supabase: Project Settings → API.
//  „anon public“ klíč je veřejný a patří do webu. NIKDY sem nedávejte
//  klíč „service_role“ – ten musí zůstat tajný.
//  Dokud jsou hodnoty prázdné, účty jsou vypnuté a e-shop funguje bez nich.
// ============================================================
export const SUPABASE_URL = ''
export const SUPABASE_ANON_KEY = ''

// Přihlášení přes další služby (musí být zapnuté i v Supabase → Authentication → Providers).
export const SSO_POSKYTOVATELE = ['google']
