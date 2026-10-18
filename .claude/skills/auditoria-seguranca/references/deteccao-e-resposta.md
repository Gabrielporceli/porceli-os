# Camada de detecção e resposta (perceber o ataque e agir a tempo)

Prevenção falha um dia. Esta camada mede se alguém **percebe** e se a empresa **sabe o que fazer**.

## 1. Detecção

| # | Item | ✅ quando | Se falhar |
|---|------|-----------|-----------|
| D1 | Eventos de segurança registrados | Login com falha, bloqueio, mudança de papel, exclusão, exportação, erro de autorização e webhook recusado ficam num registro com quem, quando e de onde | MÉDIA |
| D2 | Alguém é avisado | Os eventos graves geram alerta ativo (e-mail, WhatsApp, sino do admin, Slack), com limite para não virar ruído | MÉDIA (ALTA se o sistema guarda dados sensíveis e não há nenhum alerta) |
| D3 | Sistema fora do ar | Monitor externo de disponibilidade (UptimeRobot, Better Stack, Uptime Kuma) avisando alguém | BAIXA a MÉDIA |
| D4 | Servidor | fail2ban/CrowdSec com aviso, ou agente de detecção (Wazuh, CrowdSec); alerta de disco cheio | BAIXA a MÉDIA |
| D5 | Certificado e backup | Alerta se o certificado estiver para vencer ou se o backup falhar | MÉDIA para backup sem alerta |
| D6 | Registro protegido | O registro de ações não pode ser apagado por quem é registrado (inclusive admin) e é guardado por tempo definido | BAIXA |

## 2. Resposta a incidentes

| # | Item | ✅ quando |
|---|------|-----------|
| R1 | Plano escrito | Existe um plano de 1 a 2 páginas: quem decide, quem executa, quem fala com cliente, contatos (hospedagem, advogado, encarregado de dados) |
| R2 | Roteiro técnico | Sabe-se como: tirar o sistema do ar, derrubar todas as sessões, trocar cada segredo (com o efeito de cada troca), preservar logs antes de mexer |
| R3 | LGPD | O plano prevê avaliar se o incidente tem risco ou dano relevante aos titulares e, se tiver, **comunicar a ANPD e os titulares em até 3 dias úteis** (Resolução CD/ANPD nº 15/2024; confira se há atualização), guardar o registro do incidente e ter um encarregado (DPO) definido |
| R4 | Backup restaurável | Um teste de restauração foi feito e cronometrado; o tempo aceitável de parada e de perda de dados está escrito |
| R5 | Lista de segredos | Existe a lista de todos os segredos (sem os valores), onde ficam e como trocar cada um |

Se R1 a R5 não existirem, **gere o rascunho do plano** junto com os entregáveis (`plano-incidentes.md`, convertido em PDF), preenchido com o que a auditoria já sabe do sistema: componentes, segredos, onde estão os logs, como derrubar sessões e como restaurar. Deixe em branco, marcado como "A PREENCHER", só o que depende de pessoas (nomes e telefones).

## Como reportar

- Achados com `"camada": "deteccao"`.
- O rascunho do plano de incidentes é um entregável, não um achado. O achado é a ausência do plano (R1).
