#!/usr/bin/env bash
# Souhrn kontroly serveru: z řádků „STAV<tab>bod<tab>popis“ (soubor $1) udělá tabulku do $GITHUB_STEP_SUMMARY
# (lokálně na stdout) a skončí chybou, když je něco PODEZŘELÉ, CHYBA, nebo některý bod vůbec neproběhl.
#   souhrn.sh VYSLEDKY [REZIM_FTP]
set -uo pipefail
vysledky="$1"; rezim="${2:-}"
cil="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
[ -f "$vysledky" ] || : > "$vysledky"

BODY=("Spojení FTP" "Výpis serveru" "Soubory navíc" "Chybějící soubory" "Obsah souborů (SHA-256)" "Stopy webshellu" "api/data" "Ochrana api/data z webu" "Verze PHP" "Úklid sondy")
spatne=0
{
  echo "## Kontrola serveru ovoce-holub.cz"
  echo
  [ -n "$rezim" ] && echo "Spojení: **$rezim**" && echo
  echo "| Stav | Bod | Popis |"
  echo "|---|---|---|"
  for bod in "${BODY[@]}"; do
    radek="$(awk -F'\t' -v b="$bod" '$2 == b' "$vysledky" | tail -n 1)"
    if [ -z "$radek" ]; then stav="NEPROVEDENO"; popis="krok neproběhl (viz log)"
    else stav="$(cut -f1 <<< "$radek")"; popis="$(cut -f3- <<< "$radek" | tr '|`' '??')"; fi
    case "$stav" in
      OK) ikona="OK" ;;
      UPOZORNĚNÍ) ikona="UPOZORNĚNÍ" ;;
      *) ikona="**$stav**"; spatne=1 ;;
    esac
    echo "| $ikona | $bod | $popis |"
  done
  echo
  if [ "$spatne" = 1 ]; then
    echo "**Výsledek: PODEZŘELÉ nebo neúplné** – podrobnosti v logu kroků. Obsah souborů ani data zákazníků se do logu nevypisují."
  else
    echo "**Výsledek: OK** – nic podezřelého nenalezeno."
  fi
} >> "$cil"
exit "$spatne"
