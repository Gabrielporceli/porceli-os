/**
 * Configuração da ponte com o cofre (repositório Git).
 *
 * O TOKEN NÃO APARECE AQUI, de propósito. `notes_sync_config` é lida pelo
 * navegador via RLS; um campo de token nesta tela significaria guardar o
 * segredo numa tabela que o cliente lê. Ele vive como secret da Edge
 * Function (`NOTES_GITHUB_TOKEN`) — ver docs/NOTAS-OBSIDIAN.md, seção 3.5.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export interface ConfigCofre {
  repo: string;
  branch: string;
  base_path: string;
  enabled: boolean;
  last_sync_at?: string | null;
  last_error?: string | null;
}

const VAZIA: ConfigCofre = { repo: "", branch: "main", base_path: "Porceli", enabled: false };

export function VaultConfigDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (c: ConfigCofre | null) => void;
}) {
  const [cfg, setCfg] = useState<ConfigCofre>(VAZIA);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("notes_sync_config")
      .select("repo, branch, base_path, enabled, last_sync_at, last_error")
      .maybeSingle()
      .then(({ data }) => setCfg(data ? (data as ConfigCofre) : VAZIA));
  }, [open]);

  // "usuario/repo" — a API do GitHub monta a URL com isso; errar aqui só
  // apareceria como 404 lá na frente, difícil de ligar à causa.
  const repoValido = /^[\w.-]+\/[\w.-]+$/.test(cfg.repo.trim());

  const salvar = async () => {
    if (!repoValido) {
      toast.error("Repositório inválido", { description: "Use o formato usuario/repositorio" });
      return;
    }
    setSalvando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSalvando(false);
      toast.error("Sessão expirada");
      return;
    }
    const { error } = await supabase.from("notes_sync_config").upsert(
      {
        user_id: user.id,
        repo: cfg.repo.trim(),
        branch: cfg.branch.trim() || "main",
        base_path: cfg.base_path.trim().replace(/^\/+|\/+$/g, ""),
        enabled: cfg.enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    toast.success("Cofre configurado");
    onSaved(cfg);
    onOpenChange(false);
  };

  const campo = "w-full rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none border border-white/[0.05] focus:border-primary/50 transition-colors";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">Cofre do Obsidian</DialogTitle>
          <DialogDescription className="text-white/40">
            As notas viram arquivos <code>.md</code> num repositório Git, que o Obsidian
            sincroniza pelo plugin Obsidian Git.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <label className="block space-y-1.5">
            <span className="text-sm text-white/70">Repositório</span>
            <input
              value={cfg.repo}
              onChange={(e) => setCfg({ ...cfg, repo: e.target.value })}
              placeholder="usuario/meu-cofre"
              className={campo}
            />
            {cfg.repo && !repoValido && (
              <span className="text-xs text-red-300">Formato esperado: usuario/repositorio</span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-sm text-white/70">Branch</span>
              <input
                value={cfg.branch}
                onChange={(e) => setCfg({ ...cfg, branch: e.target.value })}
                placeholder="main"
                className={campo}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-white/70">Subpasta</span>
              <input
                value={cfg.base_path}
                onChange={(e) => setCfg({ ...cfg, base_path: e.target.value })}
                placeholder="Porceli"
                className={campo}
              />
            </label>
          </div>
          <p className="text-xs text-white/30">
            A subpasta isola o que o CRM escreve — o resto do cofre continua só seu.
          </p>

          <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2">
            <div>
              <p className="text-sm text-white/80">Sincronização ligada</p>
              <p className="text-xs text-white/35">Desligada, o botão Sincronizar fica inativo.</p>
            </div>
            <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} />
          </div>

          {cfg.last_error && (
            <p className="rounded-xl bg-red-400/10 px-3 py-2 text-xs text-red-300">
              Último erro: {cfg.last_error}
            </p>
          )}
          {cfg.last_sync_at && !cfg.last_error && (
            <p className="text-xs text-white/30">
              Última sincronização: {new Date(cfg.last_sync_at).toLocaleString("pt-BR")}
            </p>
          )}

          <p className="rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-white/35">
            O token do GitHub não é configurado aqui: ele fica como secret da Edge Function
            (<code>NOTES_GITHUB_TOKEN</code>), porque esta tabela é lida pelo navegador.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full px-4 py-2 text-sm text-white/60 transition-colors hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              style={{ backgroundColor: "hsl(var(--primary))" }}
              className="rounded-full px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
