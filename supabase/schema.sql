-- ============================================================
--  Databáze pro zákaznické účty e-shopu Ovocnářství Holub
--  Spusťte jednou v Supabase: SQL Editor → New query → vložit → Run.
-- ============================================================

create table if not exists public.objednavky (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cislo       text not null,
  termin      text,
  celkem      text,
  radky       jsonb not null default '[]'::jsonb,
  polozky     jsonb not null default '[]'::jsonb,
  stav        text not null default 'přijatá'
              check (stav in ('přijatá', 'připravuje se', 'doručená', 'zrušená')),
  created_at  timestamptz not null default now()
);

create index if not exists objednavky_user_idx on public.objednavky (user_id, created_at desc);

-- Row Level Security: každý zákazník vidí a zakládá jen své objednávky.
-- Měnit stav může jen farma přes Supabase (Table Editor), zákazník ne.
alter table public.objednavky enable row level security;

drop policy if exists "zakaznik cte sve objednavky" on public.objednavky;
create policy "zakaznik cte sve objednavky" on public.objednavky
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "zakaznik zaklada sve objednavky" on public.objednavky;
create policy "zakaznik zaklada sve objednavky" on public.objednavky
  for insert to authenticated with check (auth.uid() = user_id and stav = 'přijatá');

-- ============================================================
--  Budík: bezplatný projekt Supabase se uspí, když týden nemá „dost uživatelské aktivity v databázi“
--  (Supabase neříká kolik, podle dokumentace „pár dotazů do databáze denně“). Varování přišlo 18. 11. 2026,
--  i když se denně ozýval /auth/v1/health (do databáze vůbec nesahá) a jeden anonymní dotaz (RLS → []).
--  .github/workflows/supabase-budik.yml proto 6× denně volá POST /rest/v1/rpc/budik_zazvonit s veřejným klíčem.
--  Funkce jen přepíše čas v jediném řádku (tabulka neroste, zapisuje nejvýš jednou za minutu, nic nepřijímá).
--  Tabulka sama přes API dostupná není (žádná práva pro anon/authenticated, pravidlo RLS vše zakazuje).
--  Security Advisor u funkce hlásí „security definer function executable by anon“ – je to záměr, NEOPRAVOVAT
--  (odebrání práva anon nebo přepnutí na security invoker by budík vypnulo, nebo otevřelo tabulku k zápisu).
-- ============================================================
create table if not exists public.budik (
  id        smallint primary key default 1 check (id = 1),
  posledni  timestamptz not null default now(),
  pocet     bigint not null default 0
);
alter table public.budik enable row level security;
revoke all on table public.budik from anon, authenticated;
insert into public.budik (id) values (1) on conflict (id) do nothing;
drop policy if exists "budik jen pres funkci" on public.budik;
create policy "budik jen pres funkci" on public.budik
  for all to anon, authenticated using (false) with check (false);

create or replace function public.budik_zazvonit()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  cas timestamptz;
begin
  update public.budik set posledni = now(), pocet = pocet + 1
    where id = 1 and posledni < now() - interval '1 minute';
  select posledni into cas from public.budik where id = 1;
  return cas;
end;
$$;

revoke all on function public.budik_zazvonit() from public, anon, authenticated;
grant execute on function public.budik_zazvonit() to anon;

notify pgrst, 'reload schema';
