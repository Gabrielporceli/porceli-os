#!/usr/bin/env bash
# Coleta de segurança do servidor (Linux), SOMENTE LEITURA.
#
# O que faz: lê configurações e estados e grava tudo num arquivo de texto para a auditoria.
# O que NÃO faz: não instala, não altera, não reinicia, não apaga nada. Não lê o conteúdo de .env,
# de chaves privadas nem do banco: só nomes de variáveis, permissões e impressões digitais de chaves.
#
# Como usar (no servidor):
#   bash coleta-servidor.sh                 # como usuário comum: coleta o que der
#   sudo bash coleta-servidor.sh            # recomendado: coleta firewall, SSH efetivo, logs de acesso
#   PASTAS_APP="/srv/360" bash coleta-servidor.sh   # pastas da aplicação para conferir permissões
#
# Saída: coleta-servidor-<host>-<data>.txt na pasta atual. Revise antes de enviar.
set -u
export LC_ALL=C
HOST=$(hostname 2>/dev/null || echo servidor)
SAIDA="coleta-servidor-${HOST}-$(date +%Y%m%d-%H%M).txt"
PASTAS_APP="${PASTAS_APP:-/srv /var/www /opt /home}"
ROOT=0; [ "$(id -u)" = "0" ] && ROOT=1

# Mascara valores com cara de segredo em qualquer linha que sair
mascarar() {
  sed -E \
    -e 's/(^|[^A-Za-z])((pass(word)?|secret|token|apikey|api_key|senha|segredo|[a-z_]*_key)[A-Za-z_]*[[:space:]]*[=:][[:space:]]*)[^[:space:]]+/\1\2[mascarado]/Ig' \
    -e 's/(eyJ[A-Za-z0-9_-]{2})[A-Za-z0-9_.-]+/\1[mascarado]/g' \
    -e 's#(://[^:/ ]+:)[^@ ]+@#\1[mascarado]@#g'
}
sec() { printf '\n===== %s =====\n' "$1"; }
roda() { # roda um comando somente leitura, sem falhar a coleta
  printf '$ %s\n' "$*"
  timeout 20 bash -c "$*" 2>&1 | mascarar | head -n "${LIMITE:-200}"
}
precisa_root() { [ $ROOT = 1 ] || { echo "(pulado: rode com sudo para coletar)"; return 1; }; }

{
echo "Coleta de segurança somente leitura"
echo "Host: $HOST | Data: $(date -Is) | Root: $ROOT"

sec "1. Sistema e atualizações"
roda "cat /etc/os-release | head -4"
roda "uname -r"
roda "uptime"
roda "test -f /var/run/reboot-required && echo 'REINICIO PENDENTE para aplicar atualizações' || echo 'sem reinício pendente'"
roda "apt list --upgradable 2>/dev/null | tail -n +2 | wc -l | xargs echo 'pacotes com atualização disponível:'"
roda "apt list --upgradable 2>/dev/null | grep -i -- '-security' | wc -l | xargs echo 'dessas, de segurança:'"
roda "dpkg -l unattended-upgrades 2>/dev/null | tail -1"
roda "cat /etc/apt/apt.conf.d/20auto-upgrades 2>/dev/null"
roda "ls -la --time-style=long-iso /var/log/unattended-upgrades/ 2>/dev/null | tail -3"
roda "timedatectl 2>/dev/null | grep -Ei 'synchronized|NTP'"

sec "2. Usuários, sudo e chaves SSH"
roda "awk -F: '\$7 !~ /(nologin|false)\$/ {print \$1, \$3, \$6, \$7}' /etc/passwd"
roda "getent group sudo admin wheel 2>/dev/null"
if precisa_root; then
  roda "grep -rhv '^#' /etc/sudoers /etc/sudoers.d/ 2>/dev/null | grep -v '^\$'"
  for h in /root /home/*; do
    [ -f "$h/.ssh/authorized_keys" ] || continue
    echo "-- chaves autorizadas em $h (impressões digitais, sem a chave):"
    ssh-keygen -lf "$h/.ssh/authorized_keys" 2>&1 | head -20
    grep -oE '(expiry-time|from|command)="[^"]*"' "$h/.ssh/authorized_keys" 2>/dev/null | head -10
  done
fi
roda "last -n 15 -a 2>/dev/null | head -17"
roda "lastb -n 1 >/dev/null 2>&1 && lastb 2>/dev/null | wc -l | xargs echo 'tentativas de login com falha registradas (btmp):' || echo 'lastb sem permissão'"

sec "3. SSH"
if [ $ROOT = 1 ] && command -v sshd >/dev/null; then
  roda "sshd -T 2>/dev/null | grep -Ei '^(port|permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|maxauthtries|allowusers|allowgroups|x11forwarding|permitemptypasswords|clientaliveinterval|loglevel) '"
else
  roda "grep -Ehi '^\s*(port|permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|maxauthtries|allowusers|x11forwarding)\b' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf 2>/dev/null"
fi

sec "4. Firewall e portas abertas"
if precisa_root; then
  roda "ufw status verbose 2>/dev/null || echo 'ufw ausente'"
  roda "nft list ruleset 2>/dev/null | head -60 || iptables -S 2>/dev/null | head -60"
fi
roda "ss -tulpn 2>/dev/null | awk 'NR==1 || /LISTEN|UNCONN/' | head -40"

sec "5. Proteção contra força bruta"
roda "systemctl is-active fail2ban 2>/dev/null || echo 'fail2ban inativo ou ausente'"
if precisa_root; then roda "fail2ban-client status 2>/dev/null; fail2ban-client status sshd 2>/dev/null | tail -6"; fi
if precisa_root; then
  roda "journalctl -u ssh -u sshd --since '-7 days' 2>/dev/null | grep -ci 'failed password\|invalid user' | xargs echo 'falhas de login SSH nos últimos 7 dias:'"
fi

sec "6. Servidor web (Nginx) e TLS"
roda "nginx -v 2>&1"
if precisa_root; then LIMITE=400 roda "nginx -T 2>/dev/null | grep -Ev '^\s*#' | grep -Ei 'server_name|listen|ssl_protocols|ssl_ciphers|add_header|server_tokens|client_max_body_size|access_log|limit_req|limit_conn|proxy_set_header|location|return 301|autoindex'"; fi
for d in $(ls /etc/letsencrypt/live 2>/dev/null); do
  [ "$d" = README ] && continue
  roda "openssl x509 -in /etc/letsencrypt/live/$d/cert.pem -noout -subject -enddate 2>/dev/null"
done
roda "systemctl list-timers 2>/dev/null | grep -i certbot || echo 'timer do certbot não encontrado'"

sec "7. Aplicação: processos, permissões e segredos (sem ler valores)"
roda "pm2 jlist 2>/dev/null | grep -oE '\"name\":\"[^\"]+\"|\"status\":\"[^\"]+\"|\"exec_mode\":\"[^\"]+\"' | paste - - - | head -10 || echo 'pm2 indisponível para este usuário'"
roda "ps -eo user,pid,cmd --sort=user | grep -Ei 'node|next|pm2|python|java|php' | grep -v grep | head -15"
for base in $PASTAS_APP; do
  [ -d "$base" ] || continue
  echo "-- $base"
  find "$base" -maxdepth 4 \( -name '.env' -o -name '.env.*' -o -name '*.db' -o -name '*.sqlite' -o -name '*.pem' -o -name 'id_*' \) -not -path '*/node_modules/*' 2>/dev/null | head -30 | while read -r f; do
    stat -c '%A %U:%G %n' "$f" 2>/dev/null
    case "$f" in *.env|*.env.*) echo "   variáveis (só nomes): $(grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' "$f" 2>/dev/null | tr -d '=' | tr '\n' ' ')";; esac
  done
  find "$base" -maxdepth 3 -type d \( -name data -o -name backups -o -name anexos -o -name uploads \) -not -path '*/node_modules/*' 2>/dev/null | head -10 | while read -r d; do stat -c '%A %U:%G %n' "$d"; done
  find "$base" -maxdepth 4 -perm -o+w -not -type l -not -path '*/node_modules/*' 2>/dev/null | head -10 | sed 's/^/   ESCRITA PARA TODOS: /'
done

sec "8. Tarefas agendadas e backups"
roda "crontab -l 2>/dev/null || echo 'sem crontab para este usuário'"
if precisa_root; then for u in $(cut -d: -f1 /etc/passwd); do c=$(crontab -l -u "$u" 2>/dev/null | grep -v '^#' | grep -v '^$'); [ -n "$c" ] && { echo "-- crontab de $u:"; echo "$c" | mascarar; }; done; fi
roda "ls /etc/cron.d 2>/dev/null"
for base in $PASTAS_APP; do find "$base" -maxdepth 4 -type d -name backups -not -path '*/node_modules/*' 2>/dev/null | while read -r d; do echo "-- $d (mais recentes)"; ls -lt --time-style=long-iso "$d" 2>/dev/null | head -4; done; done
for base in $PASTAS_APP; do find "$base" -maxdepth 4 -name '*backup*.log' 2>/dev/null | head -3 | while read -r f; do echo "-- $f (fim)"; tail -5 "$f" | mascarar; done; done

sec "9. Logs e monitoramento"
roda "systemctl is-active rsyslog systemd-journald 2>/dev/null"
roda "journalctl --disk-usage 2>/dev/null"
roda "ls /etc/logrotate.d 2>/dev/null | tr '\n' ' '"
roda "systemctl list-units --type=service --state=running 2>/dev/null | grep -Ei 'auditd|wazuh|ossec|crowdsec|netdata|node_exporter|datadog|newrelic|uptime' || echo 'nenhum agente de monitoramento ou detecção encontrado'"

sec "10. Disco e recursos"
roda "df -h -x tmpfs -x devtmpfs 2>/dev/null"
roda "free -h"

echo; echo "Fim da coleta. Nada foi alterado no servidor."
} > "$SAIDA" 2>&1

echo "Coleta salva em: $SAIDA"
echo "Revise o arquivo antes de enviar. Ele não contém senhas nem chaves, mas tem nomes de usuários, portas e caminhos."
