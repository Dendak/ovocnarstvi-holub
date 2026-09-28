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
// Google, Microsoft (azure) a Apple se zobrazí samy, jakmile jsou v Supabase zapnuté.
export const SSO_POSKYTOVATELE = []

// Vlastní poskytovatelé (Supabase → Custom Providers) se v nastavení Supabase nehlásí,
// proto se zapínají tady – až když jsou v Supabase opravdu nastavení.
// 'custom:seznam' = Přihlášení přes Seznam (údaje o uživateli převádí api/seznam-userinfo.php).
export const VLASTNI_POSKYTOVATELE = ['custom:seznam']
