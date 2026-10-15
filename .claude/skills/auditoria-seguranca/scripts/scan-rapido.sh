#!/usr/bin/env bash
# Scanner heurístico de higiene de segurança do PRÓPRIO repositório.
# Só aponta onde olhar: todo resultado precisa ser confirmado lendo o código.
# Segredos aparecem truncados (nunca o valor completo).
set -u
ROOT="${1:-.}"
EXC=(--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build --exclude-dir=.next --exclude-dir=.claude)

sec() { printf '\n=== %s ===\n' "$1"; }
mask() { sed -E -e 's/(eyJ[A-Za-z0-9_-]{2})[A-Za-z0-9_.-]+/\1…[mascarado]/g' \
  -e 's/(sk_(live|test)_[A-Za-z0-9]{2})[A-Za-z0-9]+/\1…[mascarado]/g' \
  -e 's#(://[^:/ ]+:)[^@ ]+@#\1…[mascarado]@#g'; }

sec "Possíveis segredos hardcoded (A3)"
grep -rnIE "${EXC[@]}" \
  -e 'sk_(live|test)_[A-Za-z0-9]{10,}' \
  -e 'service_role' \
  -e 'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}' \
  -e '(api[_-]?key|secret|token|password)["'\'' ]*[:=][ ]*["'\''][^"'\'' ]{12,}' \
  -e 'postgres(ql)?://[^ "]+:[^ "]+@' \
  -e '-----BEGIN [A-Z ]*PRIVATE KEY-----' \
  "$ROOT" 2>/dev/null | mask | head -50

sec "Variáveis públicas no bundle (Lei 11): conferir se alguma é secreta"
grep -rhoIE "${EXC[@]}" '(VITE|NEXT_PUBLIC|EXPO_PUBLIC)_[A-Z0-9_]+' "$ROOT" 2>/dev/null | sort | uniq -c | sort -rn

sec "Arquivos .env versionados"
git -C "$ROOT" ls-files 2>/dev/null | grep -E '(^|/)\.env' | grep -vE '\.example$|\.sample$' || echo "(nenhum)"

sec "RLS desligado ou policies permissivas (A4)"
grep -rnIiE "${EXC[@]}" --include='*.sql' \
  -e 'disable row level security' -e 'using \(true\)' -e 'with check \(true\)' -e 'to anon' -e 'grant all' \
  "$ROOT" 2>/dev/null | head -50

sec "Tabelas criadas x RLS habilitado (contagem nos .sql)"
printf 'create table: %s | enable row level security: %s\n' \
  "$(grep -rIiE "${EXC[@]}" --include='*.sql' 'create table' "$ROOT" 2>/dev/null | wc -l)" \
  "$(grep -rIiE "${EXC[@]}" --include='*.sql' 'enable row level security' "$ROOT" 2>/dev/null | wc -l)"

sec "SECURITY DEFINER (conferir search_path e checagem de auth.uid())"
grep -rnIiE "${EXC[@]}" --include='*.sql' 'security definer' "$ROOT" 2>/dev/null | head -30

sec "Funções com verify_jwt = false (A2/A12): exigem outra proteção"
grep -rnIE "${EXC[@]}" -B1 'verify_jwt *= *false' "$ROOT" 2>/dev/null

sec "Identidade vinda do input (Lei 5)"
grep -rnIE "${EXC[@]}" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.py' \
  -e '(body|params|query|payload|req\.json\(\))[^;]{0,40}\b(user_?id|userId|role|is_?admin|tenant_?id|account_?id)\b' \
  "$ROOT" 2>/dev/null | head -40

sec "Sinks de XSS / execução dinâmica (Lei 10)"
grep -rnIE "${EXC[@]}" -e 'dangerouslySetInnerHTML' -e '\.innerHTML *=' -e 'v-html' -e '\beval\(' -e 'new Function\(' \
  "$ROOT" 2>/dev/null | head -30

sec "Erros engolidos (A6)"
grep -rnIE "${EXC[@]}" --include='*.ts' --include='*.tsx' --include='*.js' 'catch *(\([^)]*\))? *\{ *\}' "$ROOT" 2>/dev/null | head -30

sec "CORS aberto"
grep -rnIE "${EXC[@]}" "Access-Control-Allow-Origin['\"]?[:,] *['\"]\*" "$ROOT" 2>/dev/null | head -20

sec "select('*') / listagens sem limite (A10): conferir paginação"
grep -rnIE "${EXC[@]}" --include='*.ts' --include='*.tsx' "\.select\(['\"]\*['\"]\)" "$ROOT" 2>/dev/null | wc -l | xargs printf 'ocorrências: %s\n'

sec "Rate limiting presente?"
grep -rlIiE "${EXC[@]}" -e 'rate.?limit' -e 'ratelimit' -e 'throttle' "$ROOT" 2>/dev/null | head -20 || true

sec "Headers de segurança configurados?"
for f in vercel.json netlify.toml next.config.js next.config.mjs next.config.ts _headers; do
  [ -f "$ROOT/$f" ] && { printf '%s: ' "$f"; grep -oiE 'Strict-Transport-Security|Content-Security-Policy|X-Frame-Options|X-Content-Type-Options' "$ROOT/$f" | sort -u | tr '\n' ' '; echo; }
done

sec "Source maps em produção"
grep -rnIE "${EXC[@]}" 'sourcemap *: *true|productionBrowserSourceMaps *: *true' "$ROOT" 2>/dev/null || echo "(nenhum explícito)"

echo; echo "Fim. Lembre: o scanner é heurístico. Confirme cada item lendo o código."
