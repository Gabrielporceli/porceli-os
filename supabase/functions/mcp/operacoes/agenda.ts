// Agenda — mesmo passo a passo de src/pages/Calendar.tsx: atividade comum
// vira tarefa no Notion; com reunião (Meet), vira evento no Google Agenda.
// Concluir tarefa recorrente cria a próxima ocorrência.
import { exigir, Ferramenta, invocar, parametros } from "../contexto.ts";

type Recorrencia = "daily" | "weekly" | "biweekly" | "monthly";
const ROTULO: Record<Recorrencia, string> = { daily: "Diária", weekly: "Semanal", biweekly: "Quinzenal", monthly: "Mensal" };
const DO_ROTULO: Record<string, Recorrencia> = { "Diária": "daily", "Semanal": "weekly", "Quinzenal": "biweekly", "Mensal": "monthly" };

function proximaOcorrencia(data: string, tipo: Recorrencia): string {
  const d = new Date(data + "T12:00:00");
  if (tipo === "daily") d.setDate(d.getDate() + 1);
  else if (tipo === "weekly") d.setDate(d.getDate() + 7);
  else if (tipo === "biweekly") d.setDate(d.getDate() + 14);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

async function criarAtividade(a: { titulo: string; data: string; hora?: string; cliente?: string; recorrencia?: Recorrencia; reuniao_meet?: boolean }) {
  exigir(a.titulo?.trim(), "Título obrigatório.");
  exigir(a.data, "Data obrigatória (YYYY-MM-DD).");
  if (a.reuniao_meet) {
    const hora = a.hora || "12:00";
    const [h, m] = hora.split(":").map(Number);
    const fim = `${String(h + 1 >= 24 ? 23 : h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const r = await invocar("google-calendar-events", {
      action: "CREATE_EVENT", title: a.titulo, start: `${a.data}T${hora}:00-03:00`, end: `${a.data}T${fim}:00-03:00`, createMeetLink: true,
    });
    return { passos: ["evento criado no Google Agenda com Meet"], link_meet: r?.event?.hangoutLink ?? null, evento_id: r?.event?.id ?? null };
  }
  const r = await invocar("notion-tasks", {
    action: "CREATE_TASK", title: a.titulo, dueDate: a.data + (a.hora ? `T${a.hora}:00-03:00` : ""),
    client: a.cliente ?? "", recurrence: a.recorrencia ? ROTULO[a.recorrencia] : undefined,
  });
  return { passos: ["tarefa criada no Notion"], resposta: r };
}

async function editarAtividade(a: {
  tipo: "google" | "notion"; id: string; titulo?: string; data?: string; hora?: string;
  cliente?: string; recorrencia?: Recorrencia | ""; status?: string;
}) {
  exigir(a.id, "id é obrigatório");
  if (a.tipo === "google") {
    if (a.data && !a.hora) throw new Error("Eventos do Google precisam de horário.");
    const body: Record<string, unknown> = { action: "UPDATE_EVENT", eventId: a.id };
    if (a.titulo) body.title = a.titulo;
    if (a.data) body.start = `${a.data}T${a.hora}:00-03:00`;
    await invocar("google-calendar-events", body);
    return { passos: ["evento atualizado no Google Agenda"] };
  }
  const updates: Record<string, unknown> = {};
  if (a.titulo !== undefined) updates.title = a.titulo;
  if (a.data !== undefined) updates.dueDate = a.data + (a.hora ? `T${a.hora}:00-03:00` : "");
  if (a.cliente !== undefined) updates.client = a.cliente;
  if (a.recorrencia !== undefined) updates.recurrence = a.recorrencia ? ROTULO[a.recorrencia] : "";
  if (a.status !== undefined) updates.status = a.status;
  await invocar("notion-tasks", { action: "UPDATE_TASK", task_id: a.id, ...updates });
  return { passos: ["tarefa atualizada no Notion"] };
}

async function concluirTarefa(a: { tarefa_id: string }) {
  exigir(a.tarefa_id, "tarefa_id é obrigatório");
  // A tela usa a tarefa já carregada para saber a recorrência; aqui busca.
  const lista = await invocar("notion-tasks", undefined, { metodo: "GET" });
  // deno-lint-ignore no-explicit-any
  const tarefa = (lista?.tasks ?? []).find((t: any) => t.id === a.tarefa_id);
  await invocar("notion-tasks", { action: "UPDATE_TASK", task_id: a.tarefa_id, status: "Realizado" });
  const passos = ["tarefa marcada como Realizado"];
  const tipo = tarefa?.recurrence ? DO_ROTULO[tarefa.recurrence] : undefined;
  if (tarefa && tipo && tarefa.dueDate) {
    const proxima = proximaOcorrencia(tarefa.dueDate.split("T")[0], tipo);
    await invocar("notion-tasks", {
      action: "CREATE_TASK", title: tarefa.title, dueDate: proxima + (tarefa.time ? `T${tarefa.time}:00-03:00` : ""),
      client: tarefa.clients?.[0] ?? "", recurrence: tarefa.recurrence,
    });
    passos.push(`próxima ocorrência criada para ${proxima}`);
  }
  return { passos };
}

async function excluirAtividade(a: { tipo: "google" | "notion"; id: string }) {
  exigir(a.id, "id é obrigatório");
  if (a.tipo === "google") await invocar("google-calendar-events", { action: "DELETE_EVENT", eventId: a.id });
  else await invocar("notion-tasks", { action: "DELETE_TASK", task_id: a.id });
  return { passos: [a.tipo === "google" ? "evento excluído do Google Agenda" : "tarefa excluída do Notion"] };
}

/** Hoje em Brasília, YYYY-MM-DD. */
const hojeBR = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

/**
 * Só o período pedido e só os campos que importam: a lista inteira do Notion
 * custava milhares de tokens por consulta para o agente.
 */
async function listarAgenda(a: { dia?: string; ate_dia?: string; de?: string; ate?: string }) {
  const de = (a.dia ?? a.de?.slice(0, 10)) || hojeBR();
  const ate = (a.ate_dia ?? a.ate?.slice(0, 10)) || de;
  const [notion, google] = await Promise.all([
    invocar("notion-tasks", undefined, { metodo: "GET" }).catch((e) => ({ erro: (e as Error).message })),
    invocar("google-calendar-events", undefined, {
      metodo: "GET", query: { timeMin: `${de}T00:00:00-03:00`, timeMax: `${ate}T23:59:59-03:00` },
    }).catch((e) => ({ erro: (e as Error).message })),
  ]);
  // deno-lint-ignore no-explicit-any
  const tarefas = (notion?.tasks ?? []) as any[];
  const aberta = (t: { status?: string }) => !/realizad|conclu|done/i.test(t.status ?? "");
  const noPeriodo = tarefas.filter((t) => t.dueDate && t.dueDate.slice(0, 10) >= de && t.dueDate.slice(0, 10) <= ate);
  const atrasadas = tarefas.filter((t) => t.dueDate && t.dueDate.slice(0, 10) < hojeBR() && aberta(t));
  // deno-lint-ignore no-explicit-any
  const curta = (t: any) => ({
    id: t.id, titulo: t.title, dia: t.dueDate?.slice(0, 10), hora: t.time || undefined, status: t.status,
    cliente: t.clients?.[0] || undefined, responsavel: t.responsible || undefined,
  });
  return {
    periodo: de === ate ? de : `${de} a ${ate}`,
    tarefas_notion: notion?.erro ? { erro: notion.erro } : noPeriodo.map(curta),
    tarefas_atrasadas: notion?.erro ? undefined : atrasadas.length,
    // deno-lint-ignore no-explicit-any
    eventos_google: google?.erro ? { erro: google.erro } : ((google?.events ?? []) as any[]).map((e) => ({
      id: e.id, titulo: e.title, inicio: e.start, fim: e.end, dia_inteiro: e.allDay || undefined,
    })),
  };
}

const recorrencia = { type: "string", enum: ["daily", "weekly", "biweekly", "monthly"] };

export const AGENDA: Record<string, Ferramenta> = {
  listar_agenda: {
    description: "Agenda de um dia ou período: tarefas do Notion e eventos do Google Agenda, como a tela Calendário. "
      + "dia = YYYY-MM-DD (padrão: hoje em Brasília); ate_dia para um período. Traz também quantas tarefas estão atrasadas.",
    inputSchema: parametros({ dia: { type: "string" }, ate_dia: { type: "string" } }),
    executar: listarAgenda,
  },
  criar_atividade: {
    description: "Cria uma atividade como a tela Calendário: sem reunião vira tarefa no Notion (com cliente e recorrência opcionais); com reuniao_meet: true vira evento de 1 h no Google Agenda com link do Meet. Fuso de São Paulo.",
    inputSchema: parametros({
      titulo: { type: "string" }, data: { type: "string", description: "YYYY-MM-DD" }, hora: { type: "string", description: "HH:mm" },
      cliente: { type: "string", description: "Nome do cliente (etiqueta no Notion)." }, recorrencia, reuniao_meet: { type: "boolean" },
    }, ["titulo", "data"]),
    executar: criarAtividade,
  },
  editar_atividade: {
    description: "Edita evento do Google (tipo google: título, data+hora) ou tarefa do Notion (tipo notion: título, data/hora, cliente, recorrência, status).",
    inputSchema: parametros({
      tipo: { type: "string", enum: ["google", "notion"] }, id: { type: "string" }, titulo: { type: "string" },
      data: { type: "string" }, hora: { type: "string" }, cliente: { type: "string" }, recorrencia, status: { type: "string" },
    }, ["tipo", "id"]),
    executar: editarAtividade,
  },
  concluir_tarefa: {
    description: "Marca uma tarefa do Notion como Realizado; se for recorrente, cria a próxima ocorrência (como a tela).",
    inputSchema: parametros({ tarefa_id: { type: "string" } }, ["tarefa_id"]),
    executar: concluirTarefa,
  },
  excluir_atividade: {
    description: "Exclui um evento do Google Agenda ou uma tarefa do Notion.",
    inputSchema: parametros({ tipo: { type: "string", enum: ["google", "notion"] }, id: { type: "string" } }, ["tipo", "id"]),
    executar: excluirAtividade,
  },
};
