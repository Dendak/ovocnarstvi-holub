# Pracovní poznámky

Deník práce na webu, aby šlo navázat z jakéhokoli zařízení. Nejnovější nahoře.
Na konci každé session: co je hotové, co je rozdělané, co dál.

## Rozdělané / další kroky
- [ ] **EET 2.0 od 1. 1. 2027** (pilot leden, ostrý provoz 1. 2.). Rozhodnuto 27. 10.: výjimka pro prvovýrobu není, EET OFF ne (plátce DPH), Rakousko se neeviduje. Evidují se platby na místě: **ze dvora** a **při rozvozu** (hotově, QR u auta). Stánek zatím ne. Eviduje táta, později musí jít přidat další (Lukáš, Denis) – vlastní přihlášení, u každé evidence kdo. Plán: 1. 11. certifikát EET v MOJE daně → test na Playground (SOAP v4.1, eet.gov.cz Vývojáři) → v přehledu objednávek „Zaplaceno na místě“ + nový „Prodej ze dvora“ (částka, DPH ovoce 12 % / mošty 21 %) s FIK na elektronické účtence; záloha aplikace MOJE EET (od 1. 12.).
- [ ] **Upozornění na telefonu:** na tátově iPhonu (aplikace z plochy) přihlásit heslem, Nastavení → Zapnout upozornění → Poslat zkušební. Ověřit, že dorazí.
**Další krok:** další zdražení moštů (návrh níže) čeká na rozhodnutí táty a Lukáše – 17. 10.: „zatím jak chtěl Lukáš“.
Nic rozpracovaného v kódu není, main = produkce je čistá.

- [ ] **Ceny moštů** – platí od 17. 10. 2026 podle Lukáše: jablko 160/110 · hruška-řepa-mrkev 170/120 · skořice-bez-
  limetka(vyprodaná)-zázvor 180/125 · višeň-červený rybíz 190/130 · Vánoční mošt 240/170 · rakytník 250/175; černý rybíz
  letos nebude (smazán). Můj návrh dalšího zdražení: 180/125 · 195/135 · 205/140 · 215/150 · Vánoční 240/170 · rakytník 260/185.
  Průzkum 10. 10. 2026 (workflow s kritikem): Holub je nejlevnější z nalezených farem.
  Konkurence 5 l / 3 l: Lhenická ovocná šťáva (soused, ovocnastava.cz) jablko 200 / 110 za 2,5 l, skořice a zázvor 230,
  rakytník 270, višeň 200 · Moštárna Pacov 190 / 130 · Frydrych 190 / 120, ochucené 3 l 150 · Sady Nebílovy 199 / 145,
  směsi 239 · Úherce 210 / 150 · Zelený košík (ČB, BIO) 3 l 210. Levné: Steinocher 150 (2025, neověřeno), Katovice 135,
  akce řetězců 139–150. Ovoce: jablka nechat (farma 28, e-shop 40),
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
- [ ] **Nové logo – zbývá:** německý popisek „OBSTBAU“ (`docs/logo/logo-de-navrh.svg`) čeká na rozhodnutí, DE stránka
  zatím má české logo. Před tiskem štítků / bedýnek nátisk a CMYK s tiskárnou (pravidla v `docs/logo/specifikace.png`).
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
- [ ] **Přihlášení přes Microsoft** (`api/microsoft.php`) funguje (ověřeno 22. 10.). Tajný klíč Entra aplikace „Ovocnářství Holub – objednávky (farma)“
  vyprší **v říjnu 2028** – pak v Entra vytvořit nový a vložit v nastaveni.php.
- [ ] Tátovi nastavit „Heslo k objednávkám“ a ikonu přehledu na plochu telefonu i PC (návod v chatu 22. 10.).

## Historie
### 2026-10-31
- Aktuální nabídka: jablka Gala, Golden Delicious, Jonaprince, Idared (Bohemia ven), hrušky Novembra (v popisu i názvy Nojabrskaja, Xenia).

### 2026-10-30
- Jablka: sklizeň začíná 15. 8. (v datech bylo 1. 9.), web ani tištěný ceník už neukazují „ze skladu“ před začátkem sklizně.

### 2026-10-29
- Vánoční mošt 250 / 175 (dřív 240 / 170), ceník platí od 29. 10. 2026.

### 2026-10-26
- Smazány testovací objednávky (OH-261001-9249, OH-261025-6960, účtenka E20260001) ručním workflow `smazat-objednavky.yml` (podle sha256 e-mailu, nejdřív „vypis“, pak „smazat“). Řada účtenek přepočítána – první ostrá bude zase E20260001.

### 2026-10-25 (2)
- Nové ceny moštů od 25. 10. 2026 (5 l / 3 l): jablko 180/125 · hruška-řepa-mrkev 195/135 · skořice-bez-limetka-zázvor 205/140 · višeň-červený rybíz 215/150 · Vánoční 240/170 · rakytník 260/185. Web, e-shop, `_cenik.php` i tištěný ceník z `data.js`.

### 2026-10-25
- Upozornění na telefon (Web Push) pro farmu: nová objednávka, platby (zaplaceno / neúplná / k vyřízení / nespárovaná / neověřená), večer po 18:05 přehled na zítra (`upozorneni.php`, volá `platby.yml`). Bez knihoven: `api/_push.php` (RFC 8291 + VAPID, ověřeno testovacím vektorem RFC a Node), `push.php`, `sw.js`, `manifest.json`. Zapíná se v Nastavení → „Upozornění na telefonu“, na iPhonu jen v aplikaci z plochy (přihlásit heslem). „Odhlásit všechna zařízení“ smaže i odběry. Odběry v `api/data/push.json`, klíč VAPID v nastavení.

### 2026-10-22
- Telefon i počítač (audit screenshoty 390 / 1366 px): stránky farmy mají stejné záhlaví (Objednávky, Účtenky, Skupiny,
  Nastavení – `hlavicka_farmy()` v `_spolecne.php`, zarovnané s obsahem přes `--sirka`). Na počítači je přehled objednávek
  přes celou šířku (nejvýš 2400 px): mapa rozvozu 40 % a na výšku okna, karty v tolika sloupcích, kolik se vejde (min. 380 px);
  lišta dnů + kontrola plateb v jednom řádku, „Co připravit“ ve dvou sloupcích, nastavení ve dvou sloupcích (log dole).
  Telefon: u skupin už nepřetéká „Odebrat“, tlačítka mapy nepřekrývají záhlaví, účtenka nedělí data a čísla. E-shop: stín zavřeného košíku
  už neprosvítá u pravého okraje, s „Jen dostupné“ jen druhy, které jsou (filtry na telefonu v jednom řádku).
- Mošt Jablko + Limetka zase dostupný (`data.js`: `dostupne: true`) – web, e-shop i tištěný ceník.
- Přihlášení farmy přes Microsoft: Entra adresář účtu `info@ovoce-holub.cz` (tenant f691f4a4-…), nová aplikace
  „Ovocnářství Holub – objednávky (farma)“ (client 79bf5af5-…, jen moje organizace, redirect `/api/microsoft.php`).
  Stará aplikace „Ovocnářství Holub“ (30. 9.) je Microsoft přihlášení zákazníků e-shopu přes Supabase – nesahat.
  Pustí jen `MICROSOFT_UCTY` (sha256 e-mailu) v `_spolecne.php`; heslo a odkaz z e-mailu zůstávají.

### 2026-10-17 až 21
- Náhled účtenky (bez uložení, číslo jako by účtenku dostala každá objednávka), účtenky s předponou E (E20260001),
  zkušební účtenka 20260001 smazána, řada prázdná. Nemocnice (po, st, pá) jako pravidelná zastávka N v mapě rozvozu.
- Přístup k datům na serveru: FTP účet `w395099_data` (kořen `/www/api/data`), `scripts/data-serveru.sh`
  (přenosy PHP/FTPS), údaje v lokálním `.env`. Statistika 2.–16. 10.: 14 objednávek, 13 705 Kč, 326 kg ovoce, 45 l moštů.
- Ceny moštů podle Lukáše (17. 10.), PDF ceníku vygenerované přes Edge (headless). Od 15. 10. do 21. 10. žádná objednávka.

### 2026-10-21
- PHP2Shell (CVE-2026-109618/109619): server běží na PHP 8.5.12 fpm-fcgi = záplatováno (ověřeno sondou). npm aktualizace (audit 0), verze PHP v `nastaveni.php?diagnostika`, nový ruční workflow `kontrola-serveru.yml` (FTPS funguje, obsah 50 souborů shodný, žádné webshelly, api/data čisté). Smazáno veřejné `/info.php` a stará složka `/www/` (workflow `uklid-serveru.yml`); druhá kontrola celá OK. Wedos e-mailem potvrdil záplatu na všech serverech.

### 2026-10-21
- Tištěný ceník (`cenik.html`): mošty zase po jednom na řádek („Jablko + Hruška …… 170,– 120,–“). Důvod: zákaznice
  četla „Hruška · Červená řepa · Mrkev“ jako jeden míchaný mošt; bratr: minulý ceník byl přehlednější.
  Vybráno ze 4 konceptů (porota zákazník / grafik / provoz, 3 dopracované varianty, uživatel zvolil „Řádky s tečkami“).
  Zelené štítky 5 l / 3 l s podbarvenými sloupci, větší písmo (17/18,5 pt), vyprodaná velikost „vyprodáno“ ve sloupci,
  dlouhé názvy se zmenší místo zalomení (`vejitNazvy`), datum platnosti z `OBSAH.mosty.platnostOd`.
  Strana 2 (kalendář) jen sladěná písmem a podbarvením. A5 i A4 = 2 strany bez zmenšení.
- Kotrouš (OH-261006-1097): upozornění „dvojí platba 1 650 Kč vrátit“ je planý poplach – první platbu 1 300 Kč
  uživatel vrátil sám, systém vrácení neeviduje (na stránce rozvozu kliknout „Vyřízeno“). Případně přidat
  tlačítko „Vráceno X Kč“ do `rozvoz.php`.

### 2026-10-18
- Nové logo „H-jablko“ (červené jablko, drážky tvoří H, vedle „OVOCNÁŘSTVÍ / Holub“ v Newsreader). Vybrané z 5 konceptů
  (porota 3 pohledů, 3 finalisté). Vektor v `img/logo/` (světlé, tmavé, na výšku, kompaktní, jednobarevné, znak),
  favicony a `logo-512.png` (JSON-LD) v `react-verze/public/`. Lišta, patička, e-shop a ceník mají `logo-svetle.svg`.
  Staré `img/logo.png` / `logo.svg` smazané. Zdroj a návod na úpravu: `docs/logo/` (README, `build.mjs`).

### 2026-10-13
- E-shop: u osobního odběru zákazník povinně vyplní přibližný čas příjezdu (PR #4). Čas je v e-mailu farmě,
  v předmětu, v potvrzení zákazníkovi a na kartě v `rozvoz.php` (odběry seřazené podle času).
- Přehled objednávek na týden pro tátu (WhatsApp) sestaven z `rozvoz.php`. Kotrouš (OH-261006-1097, termín 7. 10.,
  zaplaceno) se posílá poštou 13. 10. – po odeslání označit v přehledu „Doručeno“, jinak svítí jako nevyřízená.

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
