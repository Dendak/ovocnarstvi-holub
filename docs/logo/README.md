# Logo „H-jablko“

Ploché červené jablko, ve kterém stopková jamka a spodní drážka tvoří písmeno **H** (Holub). Vedle „Holub“
v Newsreader 600 (písmo nadpisů webu) a popisek OVOCNÁŘSTVÍ v Source Sans 3. Vybráno 18. 10. 2026.
Pravidla použití (ochranná zóna, minimální velikosti, barvy): [specifikace.png](specifikace.png).

## Soubory na webu (`img/logo/`, `react-verze/public/`)
| Soubor | Kdy |
|---|---|
| `img/logo/logo.svg` | světlé pozadí (vodorovné) |
| `img/logo/logo-svetle.svg` | tmavé pozadí – lišta, patička, e-shop, ceník |
| `img/logo/logo-na-vysku.svg` | na výšku (štítky od 25 mm) |
| `img/logo/logo-kompaktni.svg` | pod 36 px výšky (bez popisku) |
| `img/logo/logo-jednobarevne.svg`, `logo-svetle-jednobarevne.svg` | jednobarevný tisk (razítko, bedýnky) |
| `img/logo/znak.svg`, `znak-jednobarevny.svg` | samotné jablko |
| `react-verze/public/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` | ikony prohlížeče a telefonu |
| `react-verze/public/logo-512.png` | logo pro Google (JSON-LD) |

Návrh německého popisku (OBSTBAU) je v `logo-de-navrh.svg` – zatím neschválený, nepoužívá se.

## Úprava loga
```
cd docs/logo
npm install
node build.mjs --out vystup
```
Parametry tvarů jsou na začátku `build.mjs`. Výstup `vystup/` (primary → logo, reverse → logo-svetle, stacked →
logo-na-vysku, compact → logo-kompaktni, mono → logo-jednobarevne, reverse-mono → logo-svetle-jednobarevne,
symbol → znak, symbol-mono → znak-jednobarevny, mark → favicon) zkopírovat do `img/logo/` a `react-verze/public/`.
PNG (logo-512, apple-touch-icon, specifikace) vytvoří `export.mjs` (Microsoft Edge): zkopírovat do `vystup/` a spustit tam.
