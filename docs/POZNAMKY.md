# Pracovní poznámky

Deník práce na webu, aby šlo navázat z jakéhokoli zařízení. Nejnovější nahoře.
Na konci každé session: co je hotové, co je rozdělané, co dál.

## Rozdělané / další kroky
- [ ] **Ceny moštů** – průzkum 10. 10. 2026: Holub je nejlevnější z nalezených farem (soused Lhenická ovocná šťáva
  5 l jablko 200, skořice/zázvor 230, rakytník 270; Pacov 190/130, Frydrych 190/120). Návrh (5 l / 3 l):
  jablko 180/125 · hruška-řepa-mrkev 195/135 · skořice…zázvor 205/140 · višeň-č. rybíz 215/150 · rakytník 260/185 ·
  Vánoční mošt podle receptury. Ovoce: jablka nechat (farma 28, e-shop 40), hrušky farma 32, e-shop 55.
  Předtím: ověřit telefonem Steinocher (5 l za 150 v 2025), ZEMCHEBA (jablka 24–25), spočítat receptury (višeň, rybíz,
  rakytník, limetka). Lisujeme v moštárně (ne sami) → marže je tenká, hlavně u 3 l. Zdražit s novou sezónou moštů,
  zákazníkům oznámit předem. Změna = `src/data.js` (`OBSAH.mosty`, `platnostOd`) + `katalog.js` (cenaKg), ceník se přepočítá sám.
- [ ] **Posílání ovoce balíkem** (zatím jen odběr a rozvoz ČB): vybraná krabice eobaly.cz 5VVL 400×300×200 (2 vrstvy, ~5 kg)
  + proložky. Nejdřív zkušební balík. Pro e-shop by bylo potřeba: doprava v `katalog.js` (DORUCENI), cena, obchodní podmínky.
- [ ] Na tištěném ceníku jsou i Meruňky a Broskve (ve starém PDF nebyly) – nechat, nebo vynechat? Nerozhodnuto.
- [ ] **Párování plateb z `pavel@` běží od 10. 10.** (heslo zadané, `platby.php` vrací `{"ok":true}`).
  První kontrola prošla jen posledních 7 dní (od ~3. 10.). Platby z 1.–2. 10. zkontrolovat a spárovat ručně.
  Na nastaveni.php ověřit, že není „Poslední nepřijaté upozornění … chybí platný podpis DKIM“.
- [ ] **Potvrzení o platbě zákazníkům je pozastavené** (`POTVRZENI_PLATBY_ZAKAZNIKOVI = false` v `api/_spolecne.php`,
  od 8. 10.). Farma dál dostává „ZAPLACENO …“. Zapnout, až majitel rozhodne.
- [ ] **Mapa rozvozu na Wedos** (`api/mapa/`): nasazeno 7. 10., bez přihlášení otestováno (401/403, CDN BYPASS).
  Zbývá: založit schránku `denis@ovoce-holub.cz`, první přihlášení Pavla i Denise (odkaz z e-mailu → heslo → mapa s daty).
  Kdyby po přihlášení stálo „Mapa ještě není nahraná“: hlavní FTP účet `w395099` (nahrává mapu) má jiný kořen než účet
  tohoto repa → upravit `server-dir` ve workflow mapy. Pak repo `mapa-rozvozu-ovoce` přepnout na soukromé a vypnout Pages.
- [ ] `/.ftp-deploy-sync-state.json` je přes web veřejně čitelný (seznam nasazených souborů). Repo je veřejné, takže nic
  nového neprozradí, ale šlo by ho zakázat v `.htaccess`, který generuje `deploy-wedos.yml`.
- [ ] **Kód skupiny Elektron je `elektron`** (stejný jako id, dřív i v komentářích ve veřejném repu, je v git historii). Kdokoli se může přidat a obsadit 10 míst. Změnit kód = nový sha256 v `api/_skupiny.php`, stávající členové musí zadat nový kód (klient ho denně ověřuje). Čeká na rozhodnutí.
- [ ] GitHub Pages je v nastavení repa pořád zapnuté (stará verze, CNAME ovoce-holub.cz). Případně vypnout v Settings → Pages.
- [ ] Větev `origin/eshop` — zjistit, jestli je ještě potřeba.
- [ ] `react-verze/README.md` je šablona Vite. Případně nahradit odkazem na CLAUDE.md.

## Historie
### 2026-10-10
- Nové zařízení (Windows) nastavené. Chybí Node.js 22 + npm, Chrome (zmenšování fotek), případně PHP. Lokální tajné soubory nejsou potřeba.
- `nastaveni.php` od 1. 10. odmítal každý formulář („Formulář odeslaný z cizí stránky“): `Referrer-Policy: no-referrer`
  → prohlížeč posílá `Origin: null` → `cizi_puvod()` = cizí. Změněno na `same-origin`. Heslo k `pavel@` proto nešlo zadat.
- Po opravě heslo k `pavel@` zadané, párování plateb zapnuté a ověřené (`platby.php` → `{"ok":true}`).
- Mošty podle nového ceníku: přidán Květ bezu, Černý rybíz vyprodaný, Mrkev jen 5 l (`vyprodano: ['3l']` – nové pole,
  e-shop vyprodanou velikost nenabídne). Vánoční mošt dostupný.
- Tištěný ceník místo LaTeXu: `ovoce-holub.cz/cenik.html` (A5, 2 strany, data z `data.js`, noindex). PR #3.
  Kontakt na ceníku z `OBSAH.kontakt` (info@, nové `telDE`). `holous25@seznam.cz` už nikde být nemá (na webu není).
  Adresa podle ARES: Krtely 70, 384 11 Malovice (PSČ pošty Netolice), na ceníku s „(u Netolic)“.
- Přehled objednávek (`rozvoz.php`): tlačítko „Zkontrolovat platby“ → `platby.php?ted=1` (jen farma, bez 3min. intervalu).
  Cron na Wedosu neběžel (umí max. 1× za hodinu). Místo něj `.github/workflows/platby.yml` volá `platby.php` každých 10 min
  (GitHub ho po 60 dnech bez commitu vypne – pak v Actions znovu zapnout).

### 2026-10-08
- Platby se nepárovaly: `platby.php` četl jen `objednavky@`, upozornění ČS ale chodí do `pavel@`.
  Párování teď čte `pavel@` (`SCHRANKA_PLATEB`, vlastní heslo `heslo_platby` v nastavení), jen zprávy od csas.cz.

### 2026-10-07
- Přidána `api/mapa/`: mapa rozvozu z repa `mapa-rozvozu-ovoce` za přihlášením e-mailem a heslem
  (pavel@ a denis@ovoce-holub.cz). Excely se vydávají jen přihlášeným, bez cache.
- Heslo hlavního FTP účtu `w395099` změněno (používá ho jen repo mapy). Toto repo nasazuje jiným účtem
  (secrets z 27. 3. fungují dál).

### 2026-10-06 (2)
- Smazán `deploy.yml` (GitHub Pages). Produkce jen Wedos.
- Smazán starý root `index-de.html`.
- Z komentářů odstraněn čitelný kód skupiny. Kód rodinné skupiny ověřen: není triviální slovo.

### 2026-10-06
- Repo naklonováno do `C:\Users\holub\code\ovocnarstvi-holub` (mimo OneDrive).
- Přidán `CLAUDE.md` (přehled projektu) a tento soubor pro práci napříč zařízeními.
- Stav při převzetí: poslední commit 2aa7f65 (2026-10-01): rakouské adresy doručení přes OSM, rodinná skupina s nulovými cenami.
