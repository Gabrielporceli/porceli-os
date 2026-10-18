#!/usr/bin/env bash
# Acesso temporário de auditoria ao servidor: preparar, coletar e revogar.
#
# Roda na máquina de quem audita (Linux, macOS ou Git Bash no Windows), com ssh e ssh-keygen.
# O acesso criado no servidor é mínimo de propósito:
#   - usuário próprio "auditoria", sem senha, só entra com a chave gerada aqui;
#   - a chave vence sozinha (expiry-time) e não abre túnel, terminal nem repasse;
#   - sudo só para DOIS comandos fixos, sem argumentos: a coleta somente leitura e a revogação;
#   - o script de coleta vai embutido no bloco, conferido por hash e com dono root (o usuário não troca).
#
# Uso:
#   bash acesso-auditoria.sh preparar <host> [--horas 4] [--porta 22] [--pastas "/srv/360"]
#   bash acesso-auditoria.sh coletar  <host>
#   bash acesso-auditoria.sh revogar  <host>
#   bash acesso-auditoria.sh situacao <host>
#
# Os arquivos locais (chave, servidor conhecido, registro) ficam em $AUDITORIA_DIR (padrão ~/.auditoria-acesso/<host>).
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USUARIO=auditoria
acao="${1:-}"; host="${2:-}"
[ -n "$acao" ] && [ -n "$host" ] || { sed -n '2,20p' "$0"; exit 2; }
shift 2
[[ "$host" =~ ^[A-Za-z0-9.:-]+$ ]] || { echo "Host inválido: $host" >&2; exit 2; }

DIR="${AUDITORIA_DIR:-$HOME/.auditoria-acesso}/$host"
CHAVE="$DIR/chave"
CONF="$DIR/config"
REGISTRO="$DIR/registro.txt"
agora() { date '+%Y-%m-%d %H:%M:%S %z'; }
registrar() { mkdir -p "$DIR"; echo "$(agora) | $*" >> "$REGISTRO"; }

porta=22; horas=4; pastas="/srv /var/www /opt /home"
[ -f "$CONF" ] && . "$CONF"
while [ $# -gt 0 ]; do
  case "$1" in
    --horas) horas="$2"; shift 2;;
    --porta) porta="$2"; shift 2;;
    --pastas) pastas="$2"; shift 2;;
    *) echo "Opção desconhecida: $1" >&2; exit 2;;
  esac
done
[[ "$horas" =~ ^[0-9]{1,3}$ ]] && [ "$horas" -ge 1 ] && [ "$horas" -le 72 ] || { echo "--horas entre 1 e 72" >&2; exit 2; }
[[ "$porta" =~ ^[0-9]{1,5}$ ]] || { echo "--porta inválida" >&2; exit 2; }
[[ "$pastas" =~ ^[A-Za-z0-9/_.\ -]+$ ]] || { echo "--pastas só aceita caminhos simples" >&2; exit 2; }

ssh_auditoria() {
  ssh -i "$CHAVE" -p "$porta" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=15 \
      -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$DIR/servidor_conhecido" \
      "$USUARIO@$host" "$@"
}

bloco_limpeza() {
  cat <<'LIMPEZA'
sudo bash <<'LIMPA_AUDITORIA'
pkill -KILL -u auditoria 2>/dev/null
rm -f /etc/sudoers.d/95-auditoria /usr/local/sbin/coleta-auditoria /usr/local/sbin/revogar-auditoria
rm -rf /usr/local/lib/auditoria
id auditoria >/dev/null 2>&1 && deluser --remove-home auditoria >/dev/null
id auditoria >/dev/null 2>&1 && echo "FALHOU: o usuário auditoria ainda existe" || echo "LIMPO: acesso de auditoria removido"
LIMPA_AUDITORIA
LIMPEZA
}

case "$acao" in
preparar)
  command -v ssh-keygen >/dev/null || { echo "ssh-keygen não encontrado" >&2; exit 1; }
  mkdir -p "$DIR"; chmod 700 "$DIR"
  [ -f "$CHAVE" ] && { echo "Já existe uma chave para $host. Rode 'revogar' antes de preparar de novo." >&2; exit 1; }
  ssh-keygen -q -t ed25519 -N "" -C "auditoria-$(date +%Y%m%d)" -f "$CHAVE"
  printf 'porta=%q\nhoras=%q\npastas=%q\n' "$porta" "$horas" "$pastas" > "$CONF"
  publica=$(cat "$CHAVE.pub")
  coleta="$AQUI/coleta-servidor.sh"
  carga=$(gzip -9c "$coleta" | base64 | tr -d '\n')
  hash=$(sha256sum "$coleta" | cut -d' ' -f1)
  registrar "preparado: chave gerada ($(ssh-keygen -lf "$CHAVE.pub" | cut -d' ' -f2)), vence em $horas h após ser instalada"
  cat <<EOF
=====================================================================
COLE O BLOCO ABAIXO NO TERMINAL DO SERVIDOR (ex.: terminal do navegador
da Hostinger), como root ou como um usuário com sudo. Ele cria um acesso
de auditoria SOMENTE LEITURA que vence sozinho em $horas hora(s).
Vai a chave PÚBLICA. A chave privada fica só nesta máquina.
=====================================================================
sudo bash <<'BLOCO_AUDITORIA'
set -euo pipefail
U=auditoria
id "\$U" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "\$U" >/dev/null
install -d -m 700 -o "\$U" -g "\$U" /home/\$U/.ssh
VENCE=\$(date -d "+$horas hours" +%Y%m%d%H%M)
echo "expiry-time=\"\$VENCE\",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty $publica" > /home/\$U/.ssh/authorized_keys
chown "\$U:\$U" /home/\$U/.ssh/authorized_keys && chmod 600 /home/\$U/.ssh/authorized_keys
install -d -m 755 -o root -g root /usr/local/lib/auditoria
echo '$carga' | base64 -d | gunzip > /usr/local/lib/auditoria/coleta-servidor.sh
echo "$hash  /usr/local/lib/auditoria/coleta-servidor.sh" | sha256sum -c --quiet
chown root:root /usr/local/lib/auditoria/coleta-servidor.sh && chmod 755 /usr/local/lib/auditoria/coleta-servidor.sh
printf '#!/bin/bash\nPASTAS_APP="%s" exec bash /usr/local/lib/auditoria/coleta-servidor.sh --stdout\n' "$pastas" > /usr/local/sbin/coleta-auditoria
cat > /usr/local/sbin/revogar-auditoria <<'REVOGA'
#!/bin/bash
rm -f /etc/sudoers.d/95-auditoria /home/auditoria/.ssh/authorized_keys /usr/local/sbin/coleta-auditoria
rm -rf /usr/local/lib/auditoria
systemd-run --quiet --on-active=20 /bin/sh -c 'pkill -KILL -u auditoria; deluser --remove-home auditoria; rm -f /usr/local/sbin/revogar-auditoria' 2>/dev/null \
  || setsid nohup /bin/sh -c 'sleep 20; pkill -KILL -u auditoria; deluser --remove-home auditoria; rm -f /usr/local/sbin/revogar-auditoria' >/dev/null 2>&1 &
echo "REVOGADO: chave, sudo e scripts removidos; o usuário auditoria some em 20 segundos."
REVOGA
chown root:root /usr/local/sbin/coleta-auditoria /usr/local/sbin/revogar-auditoria
chmod 755 /usr/local/sbin/coleta-auditoria /usr/local/sbin/revogar-auditoria
echo 'auditoria ALL=(root) NOPASSWD: /usr/local/sbin/coleta-auditoria "", /usr/local/sbin/revogar-auditoria ""' > /etc/sudoers.d/95-auditoria
chmod 440 /etc/sudoers.d/95-auditoria && visudo -cf /etc/sudoers.d/95-auditoria >/dev/null
sshd -T 2>/dev/null | grep -qi '^allowusers' && echo "ATENCAO: o SSH tem AllowUsers. Inclua 'auditoria' para o acesso funcionar."
echo "PRONTO: acesso de auditoria criado, valido ate \$VENCE (hora do servidor)."
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub | awk '{print "Impressao digital do servidor: " \$2}'
BLOCO_AUDITORIA
=====================================================================
Depois de ver "PRONTO", rode: bash acesso-auditoria.sh coletar $host
=====================================================================
EOF
  ;;

coletar)
  [ -f "$CHAVE" ] || { echo "Sem chave para $host. Rode 'preparar' primeiro." >&2; exit 1; }
  saida="$DIR/coleta-$(date +%Y%m%d-%H%M).txt"
  if ssh_auditoria 'sudo /usr/local/sbin/coleta-auditoria' > "$saida"; then
    impressao=$(ssh-keygen -lf "$DIR/servidor_conhecido" 2>/dev/null | head -1 | cut -d' ' -f2)
    registrar "coleta feita: $(wc -l < "$saida") linhas em $saida; servidor $impressao"
    echo "Coleta salva em: $saida"
    echo "Impressão digital do servidor nesta conexão: $impressao (compare com a que o bloco mostrou)"
  else
    rm -f "$saida"
    echo "Não foi possível conectar. O bloco foi colado? A chave venceu? A porta $porta está liberada a partir desta máquina?" >&2
    exit 1
  fi
  ;;

revogar)
  ok=0
  if [ -f "$CHAVE" ] && ssh_auditoria 'sudo /usr/local/sbin/revogar-auditoria'; then
    ok=1
    echo "Conferindo em 25 segundos se o acesso parou de funcionar..."
    sleep 25
    if ssh_auditoria true 2>/dev/null; then
      ok=0; echo "ATENÇÃO: o acesso ainda funciona."
    else
      echo "Confirmado: a chave não entra mais."
    fi
  fi
  if [ $ok = 1 ]; then
    registrar "revogado pelo próprio acesso e confirmado (a chave não entra mais)"
  else
    registrar "revogação automática não confirmada: entregue o bloco de limpeza manual"
    echo
    echo "Não deu para revogar sozinho (chave já vencida ou servidor fora do ar)."
    echo "A chave vence sozinha, mas o usuário fica no servidor. Peça para colar no terminal do servidor:"
    echo
    bloco_limpeza
  fi
  rm -f "$CHAVE" "$CHAVE.pub" "$CONF"
  echo "Chave local apagada. Registro: $REGISTRO"
  ;;

situacao)
  [ -f "$REGISTRO" ] && cat "$REGISTRO" || echo "Nada registrado para $host."
  [ -f "$CHAVE" ] && { ssh_auditoria true 2>/dev/null && echo "Acesso: ATIVO" || echo "Acesso: sem conexão (vencido, revogado ou bloco não colado)"; } || echo "Chave local: não existe"
  ;;

*) echo "Ação desconhecida: $acao (use preparar, coletar, revogar ou situacao)" >&2; exit 2;;
esac
