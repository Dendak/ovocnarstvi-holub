# Pracovní poznámky

Deník práce na webu, aby šlo navázat z jakéhokoli zařízení. Nejnovější nahoře.
Na konci každé session: co je hotové, co je rozdělané, co dál.

## Rozdělané / další kroky
**Další krok:** dokončit návrh cen moštů – čeká se na odpovědi uživatele (níže „Ceny moštů → chybí“). Pak nové ceny
v `src/data.js` + `katalog.js`, nasadit s novou sezónou moštů. Nic rozpracovaného v kódu není, main = produkce je čistá.

- [ ] **Ceny moštů** – průzkum 10. 10. 2026 (workflow s kritikem): Holub je nejlevnější z nalezených farem.
  Konkurence 5 l / 3 l: Lhenická ovocná šťáva (soused, ovocnastava.cz) jablko 200 / 110 za 2,5 l, skořice a zázvor 230,
  rakytník 270, višeň 200 · Moštárna Pacov 190 / 130 · Frydrych 190 / 120, ochucené 3 l 150 · Sady Nebílovy 199 / 145,
  směsi 239 · Úherce 210 / 150 · Zelený košík (ČB, BIO) 3 l 210. Levné: Steinocher 150 (2025, neověřeno), Katovice 135,
  akce řetězců 139–150. Návrh (5 l / 3 l): jablko 180/125 · hruška-řepa-mrkev 195/135 · skořice…zázvor 205/140 ·
  višeň-č. rybíz 215/150 · rakytník 260/185 · Vánoční mošt podle receptury. Ovoce: jablka nechat (farma 28, e-shop 40),
  hrušky farma 32, e-shop 55. Lisujeme v moštárně, jsme plátci DPH (mošt 21 %, ovoce 12 %).
  Moštárna: 5 l za 75–78 Kč vč. obalu → marže 5 l při 160 Kč ≈ 54 Kč (132 bez DPH − 78), při 180 Kč ≈ 71 Kč, z toho
  jablka, dovoz, práce. Mošt se vyplatí jen z jablek II. jakosti / padaných (≈ 6–8 Kč/kg). Obaly BIB (Packshop):
  5 l sáček 12,80 + krabice 15 Kč, 3 l 10,70 + 8,85 Kč bez DPH.
  **Chybí od uživatele:** název moštárny, cena 3 l, cena ochucených (a zda příchuť přidává moštárna, nebo vlastní
  suroviny), zda je 75–78 Kč s DPH. Před zdražením ověřit telefonem Steinocher a ZEMCHEBA, spočítat receptury
  (višeň, rybíz, rakytník, limetka), zákazníkům oznámit předem. Změna = `src/data.js` (`OBSAH.mosty`, `platnostOd`)
  + `katalog.js` (cenaKg); web, e-shop, `_cenik.php` i tištěný ceník se přepočítají samy.
- [ ] **Posílání ovoce/moštu balíkem** (e-shop zatím jen odběr a rozvoz ČB). Krabice: eobaly.cz „Kartonová krabice
  5VVL standardní“ – 400×300×200 (≈ 5 kg ovoce ve 2 vrstvách, 22,24 Kč bez DPH, min. 15 ks), 600×400×400 pro velký
  balík (KKB 5 17, 45,98 Kč); proložky eobaly.cz/prolozky nebo balimespolu.cz; tvarované podnosy na jablka v ČR
  e-shopově nejsou (Westpak UK, Moosmann DE). Dopravci: TOPTRANS 1 balík 39 kg 60×40×40 Hluboká → Příbramsko
  801 Kč s DPH (11. 10.); PPL do 31,5 kg na soukromou adresu 481 Kč bez DPH + příplatky; Zásilkovna max. 15 kg/balík.
  Mošt je těžký (5 l ≈ 5,4 kg) → dopravu účtovat zákazníkovi. Návrh: doprava v e-shopu s cenou podle váhy
  (`katalog.js` DORUCENI, obchodní podmínky). Rozhodne uživatel.
- [ ] **Meruňky a Broskve**: data na webu (1. 7.–31. 8., 1. 8.–30. 9.) jsou obecný odhad, uživatel neví. Zeptat se Pavla
  na skutečné termíny, nebo je z tištěného ceníku vynechat (ve starém PDF nebyly).
- [ ] **Tištěný ceník A3**: logo `img/logo.png` má jen 264×144 px, na A3 je rozmazané. Případně dodat větší logo.
- [ ] **Jonaprince** je v nabídce (zpráva farmy ho uváděla „na uskladnění“ i mezi zmrzlými) – potvrdit u Pavla.
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
### 2026-10-11 až 13
- Tištěný ceník přepracovaný: záhlaví v barvě loga, mošty po cenových hladinách s kreslenými bag-in-boxy 5 l / 3 l,
  štítek „jen 5 l“, kalendář sezón (sklizeň plně / ze skladu světleji, čára „dnes“), „Právě nabízíme“, kontakt
  a QR kód na e-shop (`import('qrcode')`), odkazy klikací v PDF. Výběr papíru A5 / A4 / A3 (`?format=a4`),
  obsah se při přetečení sám zmenší. Soubory `react-verze/cenik.html`, `src/cenik.js`, `src/cenik.css`.
- Aktuální nabídka (10. 10.): jablka Bohemia, Gala, Jonaprince, Idared; hrušky Novembra; švestky pryč. Ceny e-shopu beze změny.
- Přehled objednávek a nastavení mají rozvržení pro počítač (≥ 1100 / 1000 px): mapa vlevo sticky, karty vpravo,
  odběr ve 2 sloupcích; nastavení ve 2 sloupcích. Telefon beze změny. PHP zkontrolované dvěma nezávislými recenzenty.
- Průzkum cen moštů a ovoce + nákladů moštárny (viz „Ceny moštů“), průzkum obalů a dopravců (viz „Posílání balíkem“).
- Na tomto zařízení (Windows, druhý PC) není Node.js, Chrome ani PHP – build a lint jen přes GitHub Actions při nasazení.

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
