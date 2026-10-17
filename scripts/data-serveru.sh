#!/usr/bin/env bash
# Data e-shopu na serveru (složka api/data na Wedosu) přes samostatný FTP účet omezený jen na tuto složku.
# Přihlašovací údaje jsou v .env v kořeni repa (je v .gitignore, vzor .env.example) a nikde se nevypisují.
# Přenosy dělá scripts/data-serveru.php (PHP s rozšířeními ftp a openssl): šifrované je přihlášení i data.
#
# Použití (z kořene repa):
#   bash scripts/data-serveru.sh nastavit           – zeptá se na server, login a heslo a uloží je do .env
#   bash scripts/data-serveru.sh seznam [složka/]   – výpis souborů (např. objednavky/)
#   bash scripts/data-serveru.sh zaloha             – stáhne celou api/data do zaloha-serveru/<datum-čas>/
#   bash scripts/data-serveru.sh stahni <soubor>    – stáhne jeden soubor do zaloha-serveru/aktualni/<soubor>
#   bash scripts/data-serveru.sh nahraj <soubor>    – nahraje zaloha-serveru/aktualni/<soubor> zpět na server
#   bash scripts/data-serveru.sh smaz <soubor>      – smaže soubor na serveru
# Před „nahraj“ a „smaz“ se serverová verze souboru vždy uloží do zaloha-serveru/pred-zmenou/<datum-čas>/.
# Stažená data obsahují osobní údaje zákazníků – po práci složku zaloha-serveru/ smazat.
set -euo pipefail
cd "$(dirname "$0")/.."

# „nastavit“: zeptá se na údaje a zapíše je do .env (heslo se při psaní nezobrazuje), pak zkusí spojení.
if [ "${1:-}" = nastavit ]; then
  stary() { [ -f .env ] && sed -n "s/^$1=//p" .env | tr -d '\r' | head -n 1 || true; }
  h=$(stary DATA_FTP_HOST); u=$(stary DATA_FTP_USER); t=$(stary DATA_FTP_TLS)
  IFS= read -rp "FTP server [${h}]: " x; h=${x:-$h}
  IFS= read -rp "Login [${u}]: " x; u=${x:-$u}
  IFS= read -rsp "Heslo (při psaní se nezobrazuje): " p; echo
  [ -n "$h" ] && [ -n "$u" ] && [ -n "$p" ] || { echo "Chybí server, login nebo heslo – nic jsem neuložil." >&2; exit 1; }
  umask 077
  printf '%s\n' '# Přístup k api/data na serveru (vzor a popis v .env.example).' \
    "DATA_FTP_HOST=$h" "DATA_FTP_USER=$u" "DATA_FTP_HESLO=$p" "DATA_FTP_TLS=${t:-1}" > .env
  echo "Uloženo do .env. Zkouším spojení (výpis souborů na serveru):"
  exec bash "$0" seznam
fi

case "${1:-}" in
  seznam|zaloha|stahni|nahraj|smaz) ;;
  *) sed -n '6,14p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac

# PHP: z PATH, jinak instalace přes winget (Windows). Rozšíření ftp a openssl se zapnou, pokud nejsou.
PHP=$(command -v php || true)
if [ -z "$PHP" ]; then
  for p in "${LOCALAPPDATA:-}"/Microsoft/WinGet/Packages/PHP.PHP.*/php.exe "/c/Users/${USERNAME:-$USER}/AppData/Local/Microsoft/WinGet/Packages"/PHP.PHP.*/php.exe; do
    [ -f "$p" ] && { PHP=$p; break; }
  done
fi
[ -n "$PHP" ] || { echo "Chybí PHP (např. winget install PHP.PHP.8.5)." >&2; exit 1; }
MODULY=$("$PHP" -m 2>/dev/null | tr -d '\r')
ARGS=()
grep -qx ftp <<<"$MODULY" || ARGS+=(-d "extension_dir=$(dirname "$PHP")/ext" -d extension=ftp)
grep -qx openssl <<<"$MODULY" || ARGS+=(-d "extension_dir=$(dirname "$PHP")/ext" -d extension=openssl)
exec "$PHP" "${ARGS[@]}" scripts/data-serveru.php "$@"
