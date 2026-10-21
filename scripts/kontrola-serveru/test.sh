#!/usr/bin/env bash
# Samotest porovnání (porovnat.mjs, verze-php.mjs) na umělém „serveru“: složka zkopírovaná z dist,
# jednou čistá (nesmí nic hlásit) a jednou s vloženým webshellem, změněným HTML, podezřelými soubory
# v api/data atd. (vše musí najít). Server se neosloví.
#   bash scripts/kontrola-serveru/test.sh [DIST]
# Bez DIST si vytvoří malé umělé dist. Je-li k dispozici lftp (v CI), výpis udělá skutečné lftp `find -l`
# nad místní složkou – ověří se tím i čtení formátu výpisu. Jinak se formát lftp napodobí.
#
# Umělý webshell se skládá z kousků až za běhu (EV, B64, …): se souvislými řetězci by antivir
# (Windows Defender) tenhle skript považoval za škodlivý a zablokoval ho.
set -euo pipefail
ZDE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export TZ=UTC
chyby=0
EV="ev""al"; B64="base64""_""decode"; SYS="sys""tem"; PH='<?''php'
ocekavat() { # ocekavat VYSLEDKY BOD STAV
  local skutecny
  skutecny="$(awk -F'\t' -v b="$2" '$2 == b {s=$1} END {print s}' "$1")"
  if [ "$skutecny" = "$3" ]; then echo "  ok: $2 = $3"; else echo "  CHYBA TESTU: $2 = '$skutecny', čekáno '$3'"; chyby=1; fi
}

# --- dist
if [ -n "${1:-}" ]; then
  DIST="$1"
else
  DIST="$TMP/dist"
  mkdir -p "$DIST/api/data" "$DIST/api/mapa" "$DIST/assets" "$DIST/img/tresne/_w480"
  printf '<!doctype html><script type="module" src="/assets/index-abc.js"></script>\n' > "$DIST/index.html"
  printf 'const r=/x/;r.exec("x");%s("1")\n' "$EV" > "$DIST/assets/index-abc.js"
  printf 'DirectoryIndex index.html\n' > "$DIST/.htaccess"
  printf 'Header set X-Frame-Options "DENY"\n' > "$DIST/api/.htaccess"
  printf 'Require all denied\n' > "$DIST/api/data/.htaccess"
  printf '%s echo 1;\n' "$PH" > "$DIST/api/stav.php"
  printf '%s exit; ?>\n' "$PH" > "$DIST/api/mapa/index.php"
  printf 'RewriteEngine On\n' > "$DIST/api/mapa/.htaccess"
  printf "%s\nreturn json_decode('{\"vytvoreno\":\"2026-10-21T10:00:00.000Z\",\"produkty\":{}}', true);\n" "$PH" > "$DIST/api/_cenik.php"
  printf 'data/*\n' > "$DIST/api/.gitignore"
  head -c 5000 /dev/urandom > "$DIST/img/tresne/_w480/tresne v bedne.webp"
fi

# --- čistý server: jako po nasazení FTP-Deploy-Action (bez .git*), plus běžná data
cisty_server() {
  local s="$1"
  rm -rf "$s"; mkdir -p "$s"
  cp -r "$DIST/." "$s/"
  find "$s" -name '.git*' -exec rm -rf {} +
  echo '{"version":"1.0.0"}' > "$s/.ftp-deploy-sync-state.json"
  # _cenik.php z jiného sestavení: liší se jen čas „vytvoreno“
  [ -f "$s/api/_cenik.php" ] && sed -i 's/"vytvoreno":"[^"]*"/"vytvoreno":"2020-01-01T00:00:00.000Z"/' "$s/api/_cenik.php"
  mkdir -p "$s/api/data/objednavky" "$s/api/data/mapa"
  echo '{"jmeno":"Jan Novák"}' > "$s/api/data/objednavky/2026100001.json"
  echo '{"jmeno":"Eva Nová"}' > "$s/api/data/objednavky/2026100002.json"
  printf '%s exit; ?>\n{}' "$PH" > "$s/api/data/nastaveni.php"
  printf '%s exit; ?>\n{}' "$PH" > "$s/api/data/nastaveni-zaloha.php"
  printf '%s exit; ?>\n{}' "$PH" > "$s/api/data/nastaveni.php.0a1b2c3d.tmp"
  echo 'log' > "$s/api/data/log.txt"
  : > "$s/api/data/objednavky.lock"
  echo '<html>' > "$s/api/data/mapa/index.html"
  echo '{}' > "$s/api/data/mapa/.ftp-deploy-sync-state.json"
}

vypis() { # vypis SLOZKA SOUBOR
  # Stejně jako lftp.sh: přejít do kořene a `find -l .` – cesty jsou pak „./api/…“ jako u FTP.
  if command -v lftp > /dev/null && (cd "$1" && lftp -c "set cmd:fail-exit yes; open file:; cd \"$1\"; find -l . > \"$2\"") 2> "$TMP/lftp.err" \
    && grep -qE ' (\./|/)?\.htaccess$' "$2"; then
    echo "  (výpis skutečným lftp)"
    return
  fi
  if command -v lftp > /dev/null; then echo "  ::warning::lftp nad místní složkou neudělal použitelný výpis ($(head -c 200 "$TMP/lftp.err" | tr '\n' ' ')) – formát se napodobí"; fi
  # Napodobení FileInfo::MakeLongName z lftp (uživatel/skupina, velikost zarovnaná do 20 znaků, ISO čas).
  node -e '
    const fs = require("fs"), path = require("path")
    const [koren, vystup] = process.argv.slice(1), radky = []
    const cas = d => d.toISOString().slice(0, 19).replace("T", " ")
    const projit = rel => {
      for (const e of fs.readdirSync(path.join(koren, rel), { withFileTypes: true })) {
        const r = rel ? rel + "/" + e.name : e.name, st = fs.lstatSync(path.join(koren, r)), ug = "w1/w1"
        const vel = e.isDirectory() ? "-" : String(st.size)
        radky.push((e.isDirectory() ? "drwxr-xr-x" : "-rw-r--r--") + "  " + ug + " " + vel.padStart(20 - ug.length) + " " + cas(st.mtime) + " ./" + r + (e.isDirectory() ? "/" : ""))
        if (e.isDirectory()) projit(r)
      }
    }
    radky.push("drwxr-xr-x  w1/w1" + " ".repeat(15) + "- 2026-10-21 10:00:00 ./")
    projit("")
    fs.writeFileSync(vystup, radky.join("\n") + "\n")
  ' "$1" "$2"
}

spustit() { # spustit SERVER JMENO → $TMP/JMENO.tsv, $TMP/JMENO.log
  local s="$1" j="$2"
  vypis "$s" "$TMP/$j.vypis"
  node "$ZDE/porovnat.mjs" plan --dist "$DIST" --vypis "$TMP/$j.vypis" --povolene "$ZDE/povolene.txt" --seznam "$TMP/$j.seznam"
  # „stažení“: kopie souborů ze seznamu
  rm -rf "$TMP/$j.stazeno"; mkdir -p "$TMP/$j.stazeno"
  while IFS= read -r c; do mkdir -p "$TMP/$j.stazeno/$(dirname "$c")"; cp "$s/$c" "$TMP/$j.stazeno/$c"; done < "$TMP/$j.seznam"
  if grep -q '^api/data' "$TMP/$j.seznam"; then echo "  CHYBA TESTU: seznam ke stažení obsahuje api/data"; chyby=1; fi
  : > "$TMP/$j.tsv"
  node "$ZDE/porovnat.mjs" vyhodnotit --dist "$DIST" --vypis "$TMP/$j.vypis" --povolene "$ZDE/povolene.txt" \
    --stazeno "$TMP/$j.stazeno" --vysledky "$TMP/$j.tsv" > "$TMP/$j.log"
  # Do logu se nesmí dostat jména běžných souborů z api/data ani obsah dat.
  if grep -qE '2026100001|2026100002|Novák|log\.txt|nastaveni\.php\.0a1b|objednavky\.lock' "$TMP/$j.log"; then
    echo "  CHYBA TESTU: log obsahuje jména/obsah z api/data"; chyby=1
  fi
}

echo "== Čistý server"
cisty_server "$TMP/server"
spustit "$TMP/server" cisty
for b in "Výpis serveru" "Soubory navíc" "Chybějící soubory" "Obsah souborů (SHA-256)" "Stopy webshellu" "api/data"; do ocekavat "$TMP/cisty.tsv" "$b" OK; done

echo "== Napadený server"
S="$TMP/server"
printf '%s\n$a = %s("aGFsbG8=");\n%s("return 1;");\n' "$PH" "$B64" "$EV" > "$S/api/kontrola-shell.php"
printf '%s %s("id");\n' "$PH" "$SYS" > "$S/img/obrazek.php.jpg"
sed -i 's#</script>#</script><script src="https://zla-domena.example/x.js"></script>#' "$S/index.html"
printf 'AddHandler application/x-httpd-php .jpg\n' >> "$S/api/.htaccess"
echo 'stará fotka' > "$S/img/stara-fotka.jpg"
rm -f "$S/api/mapa/.htaccess"
printf '%s %s("id");\n' "$PH" "$SYS" > "$S/api/data/objednavky/2026100003.php"
printf 'auto_prepend_file=x\n' > "$S/api/data/.user.ini"
echo x > "$S/api/data/objednavky/.skryty"
truncate -s 21M "$S/api/data/objednavky/velky.json"
printf '%s %s("1;");\n' "$PH" "$EV" > "$S/api/a b;!ls.php"
spustit "$S" napadeny
if [ "${ZOBRAZIT_LOG:-}" = 1 ]; then sed 's/^/  | /' "$TMP/napadeny.log"; fi
ocekavat "$TMP/napadeny.tsv" "Výpis serveru" OK
for b in "Soubory navíc" "Chybějící soubory" "Obsah souborů (SHA-256)" "Stopy webshellu" "api/data"; do ocekavat "$TMP/napadeny.tsv" "$b" PODEZŘELÉ; done
for hledat in 'api/kontrola-shell.php' 'img/obrazek.php.jpg' 'JINÝ OBSAH  index.html' 'JINÝ OBSAH  api/.htaccess' 'chybí          api/mapa/.htaccess' \
  'api/data/objednavky/2026100003.php' 'api/data/.user.ini' 'api/data/objednavky/.skryty' 'velikost 21.0 MB' 'api/a b;!ls.php' \
  'navíc      img/stara-fotka.jpg' "api/kontrola-shell.php: $EV(" "api/kontrola-shell.php: $B64(" 'index.html: skript z cizí domény' 'api/.htaccess: AddHandler'; do
  if grep -qF -- "$hledat" "$TMP/napadeny.log"; then echo "  ok: nalezeno „$hledat“"; else echo "  CHYBA TESTU: nenalezeno „$hledat“"; chyby=1; fi
done

echo "== Verze PHP"
for pripad in "8.5.12|fpm-fcgi|OK" "8.5.11|fpm-fcgi|PODEZŘELÉ" "8.4.27|cgi-fcgi|OK" "8.4.26|cgi-fcgi|PODEZŘELÉ" "8.3.36|litespeed|OK" \
  "8.3.35|apache2handler|PODEZŘELÉ" "8.2.35|fpm-fcgi|OK" "8.2.34|fpm-fcgi|PODEZŘELÉ" "8.1.99|fpm-fcgi|PODEZŘELÉ" "7.4.33|cgi-fcgi|PODEZŘELÉ" \
  "8.6.0|fpm-fcgi|OK" "8.5.12RC1|fpm-fcgi|PODEZŘELÉ" "8.4.30-1+deb12|fpm-fcgi|OK" "<html>chyba|x|CHYBA"; do
  IFS='|' read -r v sapi stav <<< "$pripad"
  printf '%s\n%s\n' "$v" "$sapi" > "$TMP/odpoved"
  : > "$TMP/php.tsv"
  node "$ZDE/verze-php.mjs" "$TMP/odpoved" 200 "$TMP/php.tsv" > /dev/null
  ocekavat "$TMP/php.tsv" "Verze PHP" "$stav"
done
printf '8.5.12\nfpm-fcgi\n' > "$TMP/odpoved"; : > "$TMP/php.tsv"
node "$ZDE/verze-php.mjs" "$TMP/odpoved" 404 "$TMP/php.tsv" > /dev/null; ocekavat "$TMP/php.tsv" "Verze PHP" CHYBA

if [ "$chyby" = 0 ]; then echo "Samotest: vše v pořádku."; else echo "::error::Samotest porovnání selhal."; exit 1; fi
