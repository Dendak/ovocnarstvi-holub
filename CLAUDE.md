# Ovocnářství Holub — ovoce-holub.cz

Web a e-shop ovocnářství (CZ + DE stránka pro rakouské pálenice). Produkce běží na **Wedos** (DNS → 185.8.237.11).

## Práce napříč zařízeními
- Zdroj pravdy je GitHub (`Dendak/ovocnarstvi-holub`). Na začátku práce `git pull`, na konci commit + push.
- Rozdělaná práce, rozhodnutí a další kroky se zapisují do [docs/POZNAMKY.md](docs/POZNAMKY.md). Na konci session je aktualizuj.
- Repo **nedávat do OneDrive** (konflikty s `.git`). Lokálně: `C:\Users\holub\code\ovocnarstvi-holub`.
- **Push na `main` = okamžité nasazení do produkce.** Větší nebo riskantní změny dělej ve větvi a přes PR.

## Struktura
- `react-verze/` — **živý web**: React 19 + Vite 8 + Tailwind 4, plain JS/JSX, bez testů.
  - Stránky (multi-page, `vite.config.js` → `STRANKY`): `index.html` (CZ, `App.jsx`), `index-de.html` (DE, `AppDE.jsx`), `eshop.html` (`eshop/EshopApp.jsx`), statické `gdpr*.html`, `obchodni-podminky.html`.
  - Obsah webu: `src/data.js` (`OBSAH`: ovoce, sezóny, mošty, aktuální nabídka), `src/dataDE.js`.
  - E-shop: `src/eshop/`.
- `api/` — PHP 8 backend (jen na Wedos): objednávky, stav, skupiny, adresy, kontakt, párování plateb, stránka rozvozu pro farmu (`rozvoz.php`), doklady, nastavení.
  - `_*.php` jsou sdílené soubory, ne endpointy. Konstanty (e-maily, účet, SMTP/IMAP) jsou v `_spolecne.php`.
  - Data jen na serveru v `api/data/` (objednávky JSON, `nastaveni.php` s hesly). V repu je jen `.htaccess`.
  - `api/mapa/` — mapa rozvozu do Rakouska jen pro přihlášené (e-mail + heslo, heslo si každý nastaví odkazem z e-mailu).
    Kdo smí: `MAPA_UCTY` (sha256 e-mailu). Samotnou mapu a excely nahrává soukromé repo `Dendak/mapa-rozvozu-ovoce`
    přes FTP do `api/data/mapa/`; účty a odkazy jsou v `api/data/mapa-ucty.json`, `mapa-odkazy.json`.
- `img/` — fotky + povinné náhledy `_w480/`, `_w960/` (WebP). Surové fotky `img/Fotky*/` jsou gitignorované.
- `supabase/schema.sql` — tabulka `objednavky` + RLS (spouští se ručně v SQL editoru). Účty zákazníků + přihlášení přes Seznam.
- Root `robots.txt`, `sitemap.xml`, `CNAME` se kopírují do buildu ve workflow.

## Příkazy (z `react-verze/`)
- `npm ci`, `npm run dev`, `npm run build`, `npm run lint`
- Nové fotky: `node scripts/zmensit-fotky.mjs` (vyžaduje Chrome, env `CHROME`). Bez náhledů build **schválně spadne**.
- Build Wedos: `DEPLOY_TARGET=wedos npm run build` (base `/`). Bez proměnné je base `/ovocnarstvi-holub/` (zbytek po GitHub Pages).

## Ceny, termíny, skupiny — kde měnit
- Ceny a produkty **jen** v `react-verze/src/eshop/katalog.js` (`DRUHY_OVOCE`, mošty z `OBSAH.mosty`).
- Termíny rozvozu/odběru, svátky a dny zavřeno: `src/eshop/terminy.js`.
- `api/_cenik.php` se generuje při buildu z katalog.js + terminy.js. **Nikdy needitovat ručně.** Server přepočítá cenu objednávky podle něj.
- Zákaznické skupiny (ceny, slevy, adresy): `api/_skupiny.php` (kódy jako sha256) + klient `src/eshop/skupina.js`. Kódy skupin nikdy nepsat v čitelné podobě do repa (je veřejné).

## Tok objednávky
`Pokladna.jsx` → POST `api/potvrzeni.php` (server přepočítá cenu, uloží, pošle e-mail farmě a zákazníkovi s QR platbou) → záloha přes formsubmit.co, když server selže → přihlášenému se uloží kopie do Supabase. Platby se párují z notifikací ČS v e-mailu (`platby.php`, cron + při návštěvě e-shopu). Skutečný stav objednávky je v serverovém JSON (`stav.php`), ne v Supabase `stav`.

## Nasazení (.github/workflows)
- `deploy-wedos.yml` — **produkce**: build + kopie `img`, robots, sitemap, `.htaccess` → FTP na Wedos. Secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`.
- Běží při každém pushi na `main` (a ručně přes workflow_dispatch). GitHub Pages se už nenasazuje.

## Konvence
- Identifikátory a komentáře česky (`kosik`, `objednavka`, `skupina`, `terminy`). Commit zprávy krátce, anglicky nebo česky.
- Tajné údaje nikdy do repa. Runtime hesla se zadávají na serveru přes `api/nastaveni.php`. Supabase anon klíč a číslo účtu jsou veřejné záměrně.
- E-maily `info@` / `objednavky@ovoce-holub.cz` a povolené originy jsou natvrdo ve více PHP souborech. Při změně měnit všude.
- Wedos CDN cachuje ~10 min. API posílá `no-store`. Po nasazení může chvíli běžet stará verze.
