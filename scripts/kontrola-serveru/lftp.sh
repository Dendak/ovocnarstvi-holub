#!/usr/bin/env bash
# Spojení s FTP Wedosu přes lftp pro workflow kontrola-serveru.yml (nic na serveru nemění, kromě sondy PHP).
#
#   lftp.sh zjistit             vyzkouší FTPS (explicitní TLS) a teprve pak čisté FTP; režim uloží do $PRACOVNI/rezim.lftp
#   lftp.sh vypis SOUBOR        rekurzivní výpis celého serveru (find -l) do SOUBORU
#   lftp.sh stahnout SEZNAM CIL stáhne soubory ze SEZNAMU (cesty od kořene) do složky CIL
#   lftp.sh nahrat MISTNI CESTA nahraje jeden soubor (sonda PHP)
#   lftp.sh smazat CESTA        smaže jeden soubor a ověří, že zmizel
#   lftp.sh smazat-slozku CESTA smaže celou složku (jen pro uklid-serveru.yml) a ověří, že zmizela
#
# Heslo jde do lftp jen přes proměnnou LFTP_PASSWORD (open --env-password): není na příkazové řádce
# ani v žádném souboru. Jméno a server jsou jen v dočasném skriptu v $PRACOVNI (smaže se). Žádné set -x.
set -euo pipefail

: "${FTP_SERVER:?chybí secret FTP_SERVER}" "${FTP_USERNAME:?chybí secret FTP_USERNAME}" "${FTP_PASSWORD:?chybí secret FTP_PASSWORD}"
: "${PRACOVNI:?chybí PRACOVNI}"
export LFTP_PASSWORD="$FTP_PASSWORD"
export TZ=UTC
REZIM="$PRACOVNI/rezim.lftp"
mkdir -p "$PRACOVNI"
umask 077

# Server bez případného ftp:// a lomítka (FTP-Deploy-Action ho chce bez nich, ale jistota).
SERVER="${FTP_SERVER#ftp://}"; SERVER="${SERVER#ftps://}"; SERVER="${SERVER%%/*}"
case "$SERVER$FTP_USERNAME" in
  *[\"\\\;\ \'\`\$]*) echo "::error::FTP_SERVER nebo FTP_USERNAME obsahuje nepovolený znak"; exit 1 ;;
esac

# Společná nastavení: krátké časové limity (lftp jinak zkouší spojení dlouho znovu), chyba = konec skriptu.
ZAKLAD='set cmd:fail-exit yes
set cmd:interactive no
set net:timeout 20
set net:max-retries 2
set net:reconnect-interval-base 3
set net:reconnect-interval-max 10
set ftp:passive-mode yes
set ftp:list-options -a
set xfer:clobber yes'

FTPS='set ftp:ssl-allow yes
set ftp:ssl-force yes
set ftp:ssl-protect-data yes
set ftp:ssl-protect-list yes'

# Spustí příkazy ze stdin v daném režimu (nastavení navíc v $1). Výstup lftp jde na stdout/stderr.
spustit() {
  local nastaveni="$1" skript
  skript="$(mktemp "$PRACOVNI/lftp.XXXXXX")"
  {
    printf '%s\n%s\n' "$ZAKLAD" "$nastaveni"
    printf 'open -u "%s" --env-password "ftp://%s"\n' "$FTP_USERNAME" "$SERVER"
    cat
  } > "$skript"
  local kod=0
  timeout 600 lftp -f "$skript" || kod=$?
  rm -f "$skript"
  return "$kod"
}

rezim() {
  [ -s "$REZIM" ] || { echo "::error::Režim spojení není zjištěný (krok „Spojení“ neproběhl)."; exit 1; }
  cat "$REZIM"
}

case "${1:-}" in
  zjistit)
    # Pořadí: FTPS s ověřeným certifikátem → FTPS jen s TLS 1.2 (některé servery chtějí na datovém spojení
    # znovu použít TLS relaci řídicího spojení, s TLS 1.3 to v GnuTLS selhává) → FTPS bez ověření certifikátu
    # (šifruje, ale nechrání před podvrženým serverem – typicky certifikát na jiné jméno) → čisté FTP.
    # Zkouší se i datové spojení (výpis kořene), právě tam se problém s TLS relací projeví.
    TLS12='set ssl:priority "NORMAL:-VERS-TLS1.3"'
    BEZ_OVERENI='set ssl:verify-certificate no'
    S_OVERENIM='set ssl:verify-certificate yes'
    nazvy=("FTPS, certifikát ověřen" "FTPS (TLS 1.2), certifikát ověřen" "FTPS, certifikát NEOVĚŘEN" "FTPS (TLS 1.2), certifikát NEOVĚŘEN" "FTP BEZ ŠIFROVÁNÍ")
    rezimy=("$FTPS
$S_OVERENIM" "$FTPS
$S_OVERENIM
$TLS12" "$FTPS
$BEZ_OVERENI" "$FTPS
$BEZ_OVERENI
$TLS12" "set ftp:ssl-allow no")
    for i in "${!rezimy[@]}"; do
      echo "Zkouším: ${nazvy[$i]}"
      if echo 'cls -1 / > /dev/null' | spustit "${rezimy[$i]}" 2> "$PRACOVNI/chyba-spojeni.txt"; then
        printf '%s\n' "${rezimy[$i]}" > "$REZIM"
        printf '%s\n' "${nazvy[$i]}" > "$PRACOVNI/rezim-nazev.txt"
        echo "  → funguje"
        exit 0
      fi
      echo "  → nefunguje: $(head -c 300 "$PRACOVNI/chyba-spojeni.txt" | tr -d '\r' | tr '\n' ' ')"
    done
    echo "::error::Na FTP se nepodařilo připojit žádným způsobem."
    exit 1
    ;;
  vypis)
    vystup="$2"
    nastaveni="$(rezim)"
    # Výpis přes MLSD (přesné velikosti a časy). Když v něm chybí kořenový .htaccess, server skryté soubory
    # v MLSD neukazuje – pak znovu přes LIST -a.
    printf 'cd /\nfind -l . > "%s"\n' "$vystup" | spustit "$nastaveni"
    if ! grep -qE ' (\./|/)?\.htaccess$' "$vystup"; then
      echo "::warning::Ve výpisu MLSD chybí .htaccess – zkouším výpis přes LIST -a."
      printf 'set ftp:use-mlsd no\ncd /\nfind -l . > "%s"\n' "$vystup" | spustit "$nastaveni"
    fi
    echo "Výpis: $(wc -l < "$vystup") řádků."
    ;;
  stahnout)
    seznam="$2"; cil="$3"
    nastaveni="$(rezim)"
    mkdir -p "$cil"
    # Cesty v seznamu prošly v porovnat.mjs kontrolou BEZPECNA_CESTA – přesto znovu, skript lftp nesmí
    # dostat nic, co by bral jako příkaz.
    prikazy=""
    while IFS= read -r cesta; do
      [ -n "$cesta" ] || continue
      if ! [[ "$cesta" =~ ^[A-Za-z0-9._@+-]+(/[A-Za-z0-9._@+-]+)*$ ]] || [[ "/$cesta/" == */../* || "/$cesta/" == */./* || "/$cesta" == */-* ]]; then
        echo "  přeskočeno (neobvyklý název)"; continue
      fi
      mkdir -p "$cil/$(dirname "$cesta")"
      prikazy+="get \"/$cesta\" -o \"$cil/$cesta\""$'\n'
    done < "$seznam"
    [ -n "$prikazy" ] || { echo "Nic ke stažení."; exit 0; }
    # Chyba jednoho souboru nesmí zastavit ostatní – chybějící soubor pak porovnat.mjs ohlásí.
    printf 'set cmd:fail-exit no\n%s' "$prikazy" | spustit "$nastaveni" || true
    echo "Staženo: $(find "$cil" -type f | wc -l) souborů."
    ;;
  nahrat)
    nastaveni="$(rezim)"
    printf 'put "%s" -o "%s"\n' "$2" "$3" | spustit "$nastaveni"
    ;;
  smazat)
    nastaveni="$(rezim)"
    slozka="$(dirname "$2")"; jmeno="$(basename "$2")"
    printf 'set cmd:fail-exit no\nrm -f "%s"\n' "$2" | spustit "$nastaveni" || true
    printf 'cls -1 "%s/" > "%s"\n' "$slozka" "$PRACOVNI/kontrola-smazani.txt" | spustit "$nastaveni"
    if grep -qF "$jmeno" "$PRACOVNI/kontrola-smazani.txt"; then rm -f "$PRACOVNI/kontrola-smazani.txt"; exit 1; fi
    rm -f "$PRACOVNI/kontrola-smazani.txt"
    ;;
  smazat-slozku)
    nastaveni="$(rezim)"
    [[ "$2" =~ ^/[A-Za-z0-9._-]+$ ]] || { echo "::error::Neplatná složka"; exit 1; }
    printf "set cmd:fail-exit no
rm -r \"%s\"
" "$2" | spustit "$nastaveni" || true
    printf "cls -1a / > \"%s\"
" "$PRACOVNI/kontrola-smazani.txt" | spustit "$nastaveni"
    if grep -qxF "$(basename "$2")/" "$PRACOVNI/kontrola-smazani.txt" || grep -qxF "$(basename "$2")" "$PRACOVNI/kontrola-smazani.txt"; then rm -f "$PRACOVNI/kontrola-smazani.txt"; exit 1; fi
    rm -f "$PRACOVNI/kontrola-smazani.txt"
    ;;
  *)
    echo "použití: lftp.sh zjistit|vypis|stahnout|nahrat|smazat|smazat-slozku …" >&2; exit 2 ;;
esac
