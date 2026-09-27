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
