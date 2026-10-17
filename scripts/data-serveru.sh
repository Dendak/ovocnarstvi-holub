#!/usr/bin/env bash
# Data e-shopu na serveru (složka api/data na Wedosu) přes samostatný FTP účet omezený jen na tuto složku.
# Přihlašovací údaje jsou v .env v kořeni repa (je v .gitignore, vzor .env.example). Skript je nikam nevypisuje
# a curl je dostává přes stdin (-K -), ne v příkazové řádce.
#
# Použití (z kořene repa):
#   bash scripts/data-serveru.sh seznam [složka/]   – výpis souborů (např. objednavky/)
#   bash scripts/data-serveru.sh zaloha             – stáhne celou api/data do zaloha-serveru/<datum-čas>/
#   bash scripts/data-serveru.sh stahni <soubor>    – stáhne jeden soubor do zaloha-serveru/aktualni/<soubor>
#   bash scripts/data-serveru.sh nahraj <soubor>    – nahraje zaloha-serveru/aktualni/<soubor> zpět na server
#   bash scripts/data-serveru.sh smaz <soubor>      – smaže soubor na serveru
# Před „nahraj“ a „smaz“ se serverová verze souboru vždy uloží do zaloha-serveru/pred-zmenou/<datum-čas>/.
# Stažená data obsahují osobní údaje zákazníků – po práci složku zaloha-serveru/ smazat.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Chybí .env (vzor je v .env.example)." >&2; exit 1; }
# .env se čte doslova (KLÍČ=hodnota do konce řádku), ne přes shell – heslo může obsahovat uvozovky, $ i mezery.
while IFS= read -r radek || [ -n "$radek" ]; do
  radek=${radek%$'\r'}
  case "$radek" in ''|'#'*) continue ;; esac
  klic=${radek%%=*}; hodnota=${radek#*=}
  if [ ${#hodnota} -ge 2 ] && { [[ $hodnota == \"*\" ]] || [[ $hodnota == \'*\' ]]; }; then hodnota=${hodnota:1:${#hodnota}-2}; fi
  case "$klic" in DATA_FTP_HOST|DATA_FTP_USER|DATA_FTP_HESLO|DATA_FTP_TLS) printf -v "$klic" '%s' "$hodnota" ;; esac
done < .env
: "${DATA_FTP_HOST:?Chybí DATA_FTP_HOST v .env}" "${DATA_FTP_USER:?Chybí DATA_FTP_USER v .env}" "${DATA_FTP_HESLO:?Chybí DATA_FTP_HESLO v .env}"

URL="ftp://$DATA_FTP_HOST/"
TLS=(--ssl-reqd)
[ "${DATA_FTP_TLS:-1}" = 0 ] && TLS=()
CAS=$(date +%Y-%m-%d_%H%M%S)

# Jméno a heslo pro curl přes stdin; uvozovky a zpětná lomítka v hesle se escapují podle pravidel konfigurace curlu.
ftp() {
  local u=${DATA_FTP_USER//\\/\\\\} p=${DATA_FTP_HESLO//\\/\\\\}
  u=${u//\"/\\\"}; p=${p//\"/\\\"}
  printf 'user = "%s:%s"\n' "$u" "$p" | curl -sS --ftp-pasv "${TLS[@]}" -K - "$@"
}

# Cesta k souboru na serveru: relativní, bez „..“ (FTP účet stejně nevidí nic mimo api/data).
cesta() {
  local f=${1:-}
  [ -n "$f" ] || { echo "Chybí název souboru (např. objednavky/12345678.json)." >&2; exit 1; }
  case "$f" in /*|*..*) echo "Neplatná cesta: $f" >&2; exit 1 ;; esac
  printf '%s' "$f"
}

# Uloží serverovou verzi souboru do zaloha-serveru/pred-zmenou/<čas>/ (když na serveru je).
zalohovat() {
  local f=$1 cil="zaloha-serveru/pred-zmenou/$CAS/$1"
  mkdir -p "$(dirname "$cil")"
  if ftp -o "$cil" "$URL$f" 2>/dev/null; then echo "Záloha: $cil"; else rm -f "$cil"; fi
}

# Rekurzivně stáhne složku (výpis LIST: první znak „d“ = složka, poslední sloupec = název).
stahni_slozku() {
  local slozka=$1 cil=$2
  mkdir -p "$cil/$slozka"
  ftp "$URL$slozka" | tr -d '\r' | while read -r radek; do
    [ -n "$radek" ] || continue
    local nazev=${radek##* } typ=${radek:0:1}
    [ "$nazev" = . ] || [ "$nazev" = .. ] && continue
    if [ "$typ" = d ]; then stahni_slozku "$slozka$nazev/" "$cil"
    else ftp -o "$cil/$slozka$nazev" "$URL$slozka$nazev"; fi
  done
}

prikaz=${1:-}
case "$prikaz" in
  seznam)
    ftp --list-only "$URL${2:-}" | tr -d '\r' ;;
  zaloha)
    cil="zaloha-serveru/$CAS"
    stahni_slozku "" "$cil"
    echo "Staženo do $cil ($(find "$cil" -type f | wc -l | tr -d ' ') souborů)." ;;
  stahni)
    f=$(cesta "${2:-}"); cil="zaloha-serveru/aktualni/$f"
    mkdir -p "$(dirname "$cil")"
    ftp -o "$cil" "$URL$f" && echo "Staženo: $cil" ;;
  nahraj)
    f=$(cesta "${2:-}"); zdroj="zaloha-serveru/aktualni/$f"
    [ -f "$zdroj" ] || { echo "Chybí $zdroj (nejdřív: stahni $f)." >&2; exit 1; }
    zalohovat "$f"
    ftp --ftp-create-dirs -T "$zdroj" "$URL$f" && echo "Nahráno: $f" ;;
  smaz)
    f=$(cesta "${2:-}")
    zalohovat "$f"
    ftp -Q "DELE $f" -o /dev/null "$URL" && echo "Smazáno na serveru: $f" ;;
  *)
    sed -n '6,13p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
