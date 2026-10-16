#!/usr/bin/env python3
"""Gera os entregáveis da auditoria a partir de achados.json.

Uso:
    python3 gerar_entregaveis.py docs/seguranca/2026-10-16/achados.json

Saídas, na mesma pasta do JSON:
    diagnostico.html       relatório para leitura e impressão
    diagnostico.pdf        o mesmo relatório em PDF (exige Chrome/Chromium/Edge)
    prompt-correcao.md     prompt para colar numa sessão nova e corrigir tudo

Só usa a biblioteca padrão. O schema do JSON está em references/entregaveis.md.
"""
import glob
import html
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SEV_ORDEM = ["CRÍTICA", "ALTA", "MÉDIA", "BAIXA"]
SEV_COR = {"CRÍTICA": "#b42318", "ALTA": "#c4320a", "MÉDIA": "#b54708", "BAIXA": "#475467"}
PRAZO_PADRAO = {"CRÍTICA": "hoje", "ALTA": "7d", "MÉDIA": "30d", "BAIXA": "backlog"}
PRAZO_NOME = {
    "hoje": "Agora (próximas 24 h)",
    "7d": "Esta semana",
    "30d": "Próximos 30 dias",
    "backlog": "Backlog de hardening",
}
ESFORCO_NOME = {"P": "Pequeno (< 1 h)", "M": "Médio (1–4 h)", "G": "Grande (> 4 h)"}
STATUS_ICONE = {"ok": "✅", "falha": "❌", "parcial": "⚠️", "na": "—"}

# Defesa em profundidade: mascara qualquer coisa com cara de segredo que tenha
# escapado para o JSON, para que nunca chegue ao PDF nem ao prompt.
_SEGREDOS = [
    re.compile(r"(eyJ[A-Za-z0-9_-]{2})[A-Za-z0-9_.-]{8,}"),
    re.compile(r"(sk_(?:live|test)_[A-Za-z0-9]{2})[A-Za-z0-9]{6,}"),
    re.compile(r"(sb_secret_[A-Za-z0-9]{2})[A-Za-z0-9_-]{6,}"),
    re.compile(r"(gh[pousr]_[A-Za-z0-9]{2})[A-Za-z0-9]{10,}"),
    re.compile(r"(AKIA[A-Z0-9]{2})[A-Z0-9]{10,}"),
    re.compile(r"(\$aact_[A-Za-z0-9]{2})[A-Za-z0-9_=-]{10,}"),
]
_URL_SENHA = re.compile(r"(://[^:/\s]+:)[^@\s]+@")


def mascarar(valor):
    if isinstance(valor, str):
        for rx in _SEGREDOS:
            valor = rx.sub(r"\1…[mascarado]", valor)
        return _URL_SENHA.sub(r"\1…[mascarado]@", valor)
    if isinstance(valor, list):
        return [mascarar(v) for v in valor]
    if isinstance(valor, dict):
        return {k: mascarar(v) for k, v in valor.items()}
    return valor


def e(texto):
    return html.escape(str(texto or ""))


def bloco(texto):
    """Escapa e preserva quebras de linha; `código` vira <code>."""
    t = e(texto)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    return t.replace("\n", "<br>")


def normalizar(d):
    achados = d.get("achados", [])
    for a in achados:
        a["severidade"] = (a.get("severidade") or "BAIXA").upper().replace("MEDIA", "MÉDIA").replace("CRITICA", "CRÍTICA")
        a.setdefault("prazo", PRAZO_PADRAO.get(a["severidade"], "backlog"))
        a.setdefault("confianca", "Confirmado")
    achados.sort(key=lambda a: (SEV_ORDEM.index(a["severidade"]) if a["severidade"] in SEV_ORDEM else 9, a.get("id", "")))
    d["achados"] = achados
    contagem = {s: sum(1 for a in achados if a["severidade"] == s) for s in SEV_ORDEM}
    d["contagem"] = contagem
    if not d.get("nota"):
        if contagem["CRÍTICA"]:
            d["nota"] = "F"
        elif contagem["ALTA"]:
            d["nota"] = "D"
        elif contagem["MÉDIA"] > 3:
            d["nota"] = "C"
        elif contagem["MÉDIA"]:
            d["nota"] = "B"
        else:
            d["nota"] = "A"
    return d


# ---------------------------------------------------------------- HTML / PDF

CSS = """
@page { size: A4; margin: 16mm 14mm 18mm; }
* { box-sizing: border-box; }
body { font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
       color: #101828; font-size: 10.5pt; line-height: 1.5; margin: 0; }
h1 { font-size: 24pt; margin: 0 0 4px; letter-spacing: -0.02em; }
h2 { font-size: 15pt; margin: 26px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #101828; }
h3 { font-size: 12pt; margin: 18px 0 6px; }
code { font-family: "SFMono-Regular", Menlo, Consolas, monospace; font-size: 9pt;
       background: #f2f4f7; padding: 1px 4px; border-radius: 3px; word-break: break-all; }
pre { font-family: "SFMono-Regular", Menlo, Consolas, monospace; font-size: 8.5pt; background: #f2f4f7;
      padding: 10px; border-radius: 6px; white-space: pre-wrap; word-break: break-word; }
.capa { padding: 8px 0 18px; border-bottom: 1px solid #d0d5dd; margin-bottom: 8px; }
.meta { color: #475467; font-size: 9.5pt; }
.placar { display: flex; gap: 10px; margin: 16px 0; }
.nota { width: 92px; height: 92px; border-radius: 12px; display: flex; align-items: center;
        justify-content: center; font-size: 44pt; font-weight: 800; color: #fff; flex: none; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex: 1; }
.kpi { border: 1px solid #d0d5dd; border-radius: 10px; padding: 8px 10px; }
.kpi b { display: block; font-size: 20pt; line-height: 1.1; }
.kpi span { font-size: 8.5pt; color: #475467; text-transform: uppercase; letter-spacing: .04em; }
table { width: 100%; border-collapse: collapse; margin: 6px 0 4px; font-size: 9.5pt; }
th, td { text-align: left; vertical-align: top; padding: 6px 8px; border-bottom: 1px solid #eaecf0; }
th { background: #f9fafb; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .03em; color: #475467; }
tr { page-break-inside: avoid; }
.sev { display: inline-block; padding: 1px 8px; border-radius: 99px; color: #fff; font-size: 8pt;
       font-weight: 700; letter-spacing: .03em; white-space: nowrap; }
.card { border: 1px solid #d0d5dd; border-left-width: 5px; border-radius: 8px; padding: 10px 14px;
        margin: 10px 0; page-break-inside: avoid; }
.card h3 { margin: 0 0 6px; }
.campo { margin: 4px 0; }
.campo b { color: #344054; }
.fase { border: 1px solid #d0d5dd; border-radius: 10px; padding: 10px 14px; margin: 10px 0; page-break-inside: avoid; }
.fase h3 { margin: 0 0 6px; }
.fase ol { margin: 4px 0 0 18px; padding: 0; }
.fase li { margin: 3px 0; }
.manual { background: #fffaeb; border: 1px solid #fedf89; border-radius: 10px; padding: 10px 14px; margin: 10px 0; }
.quebra { page-break-before: always; }
.rodape { color: #667085; font-size: 8.5pt; margin-top: 24px; border-top: 1px solid #eaecf0; padding-top: 8px; }
"""

COR_NOTA = {"A": "#067647", "B": "#4e7d0e", "C": "#b54708", "D": "#c4320a", "F": "#b42318"}


def pilula(sev):
    return f'<span class="sev" style="background:{SEV_COR.get(sev, "#475467")}">{e(sev)}</span>'


def montar_html(d, prompt_md):
    c = d["contagem"]
    partes = [f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Diagnóstico de segurança · {e(d.get('projeto'))}</title><style>{CSS}</style></head><body>
<div class="capa">
  <div class="meta">DIAGNÓSTICO DE SEGURANÇA · MODO {e(str(d.get('modo', 'completo')).upper())}</div>
  <h1>{e(d.get('projeto', 'Projeto'))}</h1>
  <div class="meta">{e(d.get('data'))} · Escopo: {e(d.get('escopo', ''))}</div>
  <div class="meta">Stack: {e(', '.join(d.get('stack', [])))}</div>
</div>
<div class="placar">
  <div class="nota" style="background:{COR_NOTA.get(d['nota'], '#475467')}">{e(d['nota'])}</div>
  <div class="kpis">
    {''.join(f'<div class="kpi" style="border-color:{SEV_COR[s]}"><b style="color:{SEV_COR[s]}">{c[s]}</b><span>{s.lower()}</span></div>' for s in SEV_ORDEM)}
  </div>
</div>
<h2>Resumo executivo</h2>
<p>{bloco(d.get('resumo_executivo', ''))}</p>
"""]

    top = d.get("top_acoes") or [f"{a['id']}: {a.get('titulo', '')}" for a in d["achados"][:3]]
    if top:
        partes.append("<h3>Top 3 ações</h3><ol>" + "".join(f"<li>{bloco(t)}</li>" for t in top[:3]) + "</ol>")

    ma = d.get("modelo_ameacas") or {}
    if ma:
        partes.append("<h2>Modelo de ameaças</h2><table><tbody>")
        for rotulo, chave in (("Ativos críticos", "ativos"), ("Fronteiras sem proteção", "fronteiras"), ("Fluxos de maior risco", "fluxos")):
            if ma.get(chave):
                partes.append(f"<tr><th style='width:28%'>{rotulo}</th><td>{'<br>'.join(bloco(x) for x in ma[chave])}</td></tr>")
        partes.append("</tbody></table>")

    if d.get("checklist"):
        partes.append("<h2>Checklist de prontidão para produção</h2><table><thead><tr><th></th><th>Item</th><th>Evidência</th></tr></thead><tbody>")
        for it in d["checklist"]:
            partes.append(f"<tr><td style='width:28px'>{STATUS_ICONE.get(it.get('status'), '?')}</td><td>{bloco(it.get('item'))}</td><td>{bloco(it.get('evidencia'))}</td></tr>")
        partes.append("</tbody></table>")

    # Plano prático
    partes.append('<h2 class="quebra">Plano prático de correção</h2>')
    manuais = d.get("acoes_manuais") or []
    if manuais:
        partes.append('<div class="manual"><h3 style="margin-top:0">Ações que só você pode fazer (painéis e contas)</h3><ol>'
                      + "".join(f"<li>{bloco(m)}</li>" for m in manuais) + "</ol></div>")
    for prazo in ("hoje", "7d", "30d", "backlog"):
        itens = [a for a in d["achados"] if a.get("prazo") == prazo]
        if not itens:
            continue
        horas = {"P": 0.5, "M": 2.5, "G": 6}
        total = sum(horas.get(a.get("esforco", "M"), 2.5) for a in itens)
        partes.append(f'<div class="fase"><h3>{PRAZO_NOME[prazo]} · {len(itens)} item(ns) · ~{total:g} h</h3><ol>')
        for a in itens:
            partes.append(f"<li>{pilula(a['severidade'])} <b>{e(a['id'])}</b> {bloco(a.get('titulo'))}"
                          f" <span class='meta'>· esforço {e(ESFORCO_NOME.get(a.get('esforco', 'M'), a.get('esforco')))}</span>"
                          f"<br><span class='meta'>Pronto quando: {bloco(a.get('criterio_aceite', '—'))}</span></li>")
        partes.append("</ol></div>")

    # Achados detalhados
    partes.append('<h2 class="quebra">Achados detalhados</h2>')
    for a in d["achados"]:
        cor = SEV_COR.get(a["severidade"], "#475467")
        partes.append(f'<div class="card" style="border-left-color:{cor}"><h3>{pilula(a["severidade"])} {e(a["id"])} · {e(a.get("titulo"))}</h3>')
        for rotulo, chave in (("Confiança", "confianca"), ("Onde", "local"), ("Classificação", "tipo"),
                              ("Cenário de ataque", "cenario"), ("Impacto", "impacto"), ("Evidência", "evidencia"),
                              ("Correção", "correcao"), ("Teste que prova a correção", "teste"),
                              ("Critério de aceite", "criterio_aceite")):
            if a.get(chave):
                partes.append(f'<div class="campo"><b>{rotulo}:</b> {bloco(a[chave])}</div>')
        partes.append("</div>")

    if d.get("suspeitas"):
        partes.append("<h2>Suspeitas a confirmar</h2><table><thead><tr><th>Suspeita</th><th>O que falta para confirmar</th></tr></thead><tbody>")
        for s in d["suspeitas"]:
            partes.append(f"<tr><td>{bloco(s.get('titulo'))}</td><td>{bloco(s.get('o_que_falta'))}</td></tr>")
        partes.append("</tbody></table>")

    if d.get("reauditoria"):
        partes.append("<h2>Comparação com a auditoria anterior</h2><table><thead><tr><th>Item</th><th>Status</th><th>Evidência</th></tr></thead><tbody>")
        for r in d["reauditoria"]:
            partes.append(f"<tr><td>{bloco(r.get('id'))}</td><td>{bloco(r.get('status'))}</td><td>{bloco(r.get('evidencia'))}</td></tr>")
        partes.append("</tbody></table>")

    partes.append(f'<h2 class="quebra">Prompt de correção</h2><p class="meta">Cole numa sessão nova do Claude Code, na raiz do projeto. Também está em <code>prompt-correcao.md</code>.</p><pre>{e(prompt_md)}</pre>')
    partes.append(f'<div class="rodape">Gerado pela skill auditoria-seguranca. A ausência de achados numa área não garante que ela esteja segura, só que nada foi encontrado no escopo analisado. Segredos aparecem mascarados.</div></body></html>')
    return "".join(partes)


def achar_navegador():
    if os.environ.get("CHROME_PATH") and os.path.exists(os.environ["CHROME_PATH"]):
        return os.environ["CHROME_PATH"]
    for nome in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome", "msedge", "microsoft-edge"):
        p = shutil.which(nome)
        if p:
            return p
    candidatos = []
    if platform.system() == "Darwin":
        candidatos += ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                       "/Applications/Chromium.app/Contents/MacOS/Chromium",
                       "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
                       "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"]
    elif platform.system() == "Windows":
        for base in (os.environ.get("PROGRAMFILES", ""), os.environ.get("PROGRAMFILES(X86)", ""), os.environ.get("LOCALAPPDATA", "")):
            candidatos += [os.path.join(base, r"Google\Chrome\Application\chrome.exe"),
                           os.path.join(base, r"Microsoft\Edge\Application\msedge.exe")]
    pw = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", os.path.expanduser("~/.cache/ms-playwright"))
    candidatos += sorted(glob.glob(os.path.join(pw, "chromium-*/chrome-linux*/chrome")), reverse=True)
    candidatos += sorted(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome"), reverse=True)
    return next((c for c in candidatos if c and os.path.exists(c)), None)


def gerar_pdf(html_path, pdf_path):
    nav = achar_navegador()
    if not nav:
        return False, "Chrome/Chromium/Edge não encontrado (defina CHROME_PATH)."
    with tempfile.TemporaryDirectory() as perfil:
        cmd = [nav, "--headless", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer",
               f"--user-data-dir={perfil}", f"--print-to-pdf={pdf_path}", Path(html_path).resolve().as_uri()]
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        except Exception as exc:  # noqa: BLE001
            return False, str(exc)
    if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
        return True, nav
    return False, (r.stderr or r.stdout)[-400:]


# ---------------------------------------------------------------- Prompt

def montar_prompt(d):
    L = []
    L.append(f"# Correção de segurança: {d.get('projeto', 'projeto')} (auditoria de {d.get('data', '')})\n")
    L.append("Você vai corrigir as vulnerabilidades listadas abaixo, encontradas numa auditoria de segurança deste repositório. "
             "O diagnóstico completo está em `diagnostico.pdf`, na mesma pasta deste arquivo.\n")
    L.append("## Regras\n")
    L.append("1. Trabalhe **na ordem abaixo**, um item por vez, e faça um commit por item com o ID no título (ex.: `fix(seguranca): VULN-1 …`).")
    L.append("2. Para cada item: (a) confirme no código que o problema ainda existe; (b) escreva o teste de segurança indicado e veja-o falhar; (c) aplique a correção **mínima**, seguindo as convenções do projeto; (d) rode o teste, o lint e o typecheck; (e) só então passe para o próximo.")
    L.append("3. Se o problema já tiver sido corrigido, registre isso e siga em frente. Se a correção exigir uma decisão de produto ou quebrar um fluxo existente, **pare e me pergunte**.")
    L.append("4. SQL vai em migration **nova**. Nunca edite migrations já aplicadas. **Nunca** aplique migration nem altere configuração no banco remoto sem minha confirmação explícita.")
    L.append("5. Nunca escreva segredos no código, em migrations, em logs ou na resposta. Use variáveis de ambiente ou o Vault.")
    L.append("6. Não amplie o escopo: nada de refatorações não relacionadas.")
    L.append("7. No final, mostre uma tabela `ID | status (corrigido / já estava corrigido / bloqueado) | commit | teste` e me lembre das ações manuais pendentes.\n")

    manuais = d.get("acoes_manuais") or []
    if manuais:
        L.append("## Ações manuais (eu faço; você só me lembra e adapta o código a elas)\n")
        L += [f"- [ ] {m}" for m in manuais]
        L.append("")

    L.append("## Itens, em ordem de prioridade\n")
    for prazo in ("hoje", "7d", "30d", "backlog"):
        itens = [a for a in d["achados"] if a.get("prazo") == prazo]
        if not itens:
            continue
        L.append(f"### {PRAZO_NOME[prazo]}\n")
        for a in itens:
            L.append(f"#### {a['id']} [{a['severidade']}] {a.get('titulo', '')}")
            for rotulo, chave in (("Onde", "local"), ("Problema", "cenario"), ("Correção esperada", "correcao"),
                                  ("Teste", "teste"), ("Pronto quando", "criterio_aceite")):
                if a.get(chave):
                    L.append(f"- **{rotulo}:** {a[chave]}")
            L.append("")
    L.append("## Ao terminar\n")
    L.append("Rode `/auditoria-seguranca` no modo **re-auditoria**, comparando com esta auditoria, para confirmar que tudo foi fechado e que nada regrediu.")
    return "\n".join(L) + "\n"


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    src = Path(sys.argv[1])
    dados = normalizar(mascarar(json.loads(src.read_text(encoding="utf-8"))))
    pasta = src.parent

    prompt = montar_prompt(dados)
    (pasta / "prompt-correcao.md").write_text(prompt, encoding="utf-8")

    html_path = pasta / "diagnostico.html"
    html_path.write_text(montar_html(dados, prompt), encoding="utf-8")

    ok, info = gerar_pdf(html_path, pasta / "diagnostico.pdf")
    print(f"✔ {pasta / 'prompt-correcao.md'}")
    print(f"✔ {html_path}")
    if ok:
        print(f"✔ {pasta / 'diagnostico.pdf'}")
    else:
        print(f"✖ PDF não gerado: {info}\n  Alternativa: abra diagnostico.html no navegador → Imprimir → Salvar como PDF.")
        sys.exit(1)


if __name__ == "__main__":
    main()
