// ============================================================
//  ZÁKAZNICKÉ ÚČTY (Supabase)
//  Adresa projektu a „publishable“ klíč jsou veřejné a patří do webu.
//  NIKDY sem nedávejte klíč „secret“ / „service_role“ – ten musí zůstat tajný.
// ============================================================
export const SUPABASE_URL = 'https://vautiqafcwlxuyzlfkac.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_CBcBegREJoaGr_o0BYnyuw_Vp0xkCHB'

// Vyžaduje SMTP v Supabase (Authentication → Emails → SMTP, odesílá objednavky@),
// jinak zákazníkům nedorazí e-mail pro potvrzení registrace a obnovu hesla.
export const UCTY_ZAPNUTE = true

// Přihlášení přes další služby – musí být zapnuté i v Supabase → Authentication → Providers.
// Google zatím nastavený není, proto je seznam prázdný.
export const SSO_POSKYTOVATELE = []
