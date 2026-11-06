"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  User,
  Lock,
  Mail,
  Save,
  UserCircle,
  ShieldCheck,
  Power,
  Camera,
  Trash2,
} from "lucide-react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { apiFetch } from "@/lib/api-fetch";
import { getUsuarioMeUrl } from "@/lib/api-config";
import { clearAuthSession } from "@/lib/auth-storage";
import {
  deleteUsuarioMeAvatar,
  fetchUsuarioMeAvatarObjectUrl,
  uploadUsuarioMeAvatar,
} from "@/lib/usuario-avatar";
import { useRouter } from "next/navigation";

type UsuarioPerfilModalProps = {
  visible: boolean;
  onHide: () => void;
};

const ACCEPTED_IMAGE = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export function UsuarioPerfilModal({ visible, onHide }: UsuarioPerfilModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
  });

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    const fetchUser = async () => {
      setLoading(true);
      try {
        const response = await apiFetch(getUsuarioMeUrl());
        if (!response.ok) throw new Error("Erro ao carregar dados do perfil.");
        const data = await response.json();
        if (cancelled) return;
        setUser(data);
        setForm({
          nome: data.nome || "",
          email: data.email || "",
          senha: "",
          confirmarSenha: "",
        });
        if (data.temAvatar) {
          objectUrl = await fetchUsuarioMeAvatarObjectUrl();
          if (cancelled) {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            return;
          }
          setAvatarUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return objectUrl;
          });
        } else if (!cancelled) {
          setAvatarUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      } catch {
        toast.error("Falha ao carregar perfil.");
        onHide();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [visible, onHide]);

  useEffect(() => {
    if (!visible) {
      setAvatarUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [visible]);

  const replaceAvatarPreview = async (temAvatar: boolean) => {
    if (!temAvatar) {
      setAvatarUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const next = await fetchUsuarioMeAvatarObjectUrl();
    setAvatarUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next;
    });
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2 MB.");
      return;
    }

    setAvatarBusy(true);
    try {
      const result = await uploadUsuarioMeAvatar(file);
      setUser((prev: any) => (prev ? { ...prev, temAvatar: result.temAvatar } : prev));
      await replaceAvatarPreview(result.temAvatar);
      toast.success("Foto atualizada.");
    } catch (error: any) {
      toast.error(error?.message || "Falha ao enviar a foto.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarBusy(true);
    try {
      await deleteUsuarioMeAvatar();
      setUser((prev: any) => (prev ? { ...prev, temAvatar: false } : prev));
      await replaceAvatarPreview(false);
      toast.success("Foto removida.");
    } catch (error: any) {
      toast.error(error?.message || "Falha ao remover a foto.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (form.senha && form.senha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (form.senha && form.senha !== form.confirmarSenha) {
      toast.error("As senhas não coincidem!");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch(getUsuarioMeUrl(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          senha: form.senha || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao atualizar perfil.");
      }

      toast.success("Perfil atualizado com sucesso!");
      onHide();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const headerElement = (
    <div className="flex items-center gap-3 py-2">
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
        <UserCircle size={24} />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white leading-tight">Meu Perfil</h3>
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Configurações da Conta</p>
      </div>
    </div>
  );

  return (
    <DashboardDialog
      visible={visible}
      onHide={onHide}
      header={headerElement}
      className="w-full max-w-2xl mx-4"
      contentClassName="bg-[#020817] border-white/5 p-0 overflow-hidden"
      headerClassName="bg-[#020817] border-b border-white/5 p-6"
      pt={{
        root: { className: "rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl" },
        mask: { className: "backdrop-blur-sm bg-black/40" },
        closeButton: { className: "text-white/20 hover:text-white transition-colors" },
      }}
    >
      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        <div className="flex items-center gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-[#1E293B] border-4 border-white/5 flex items-center justify-center text-amber-500 text-3xl font-bold shadow-inner ring-4 ring-amber-500/5 overflow-hidden">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                user?.nome?.charAt(0).toUpperCase() || "?"
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE}
              className="hidden"
              onChange={handleAvatarPick}
            />
            <button
              type="button"
              disabled={loading || avatarBusy}
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-amber-500 text-[#020817] shadow-lg transition-colors hover:bg-amber-400 disabled:opacity-50"
              title="Alterar foto"
            >
              <Camera size={14} />
            </button>
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20 w-fit">
              <ShieldCheck size={12} className="text-amber-500" />
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">
                {user?.perfil?.nome || user?.role || "Usuário"}
              </span>
            </div>
            <h4 className="text-lg font-bold text-white truncate">{user?.nome}</h4>
            <p className="text-xs text-white/40 truncate">{user?.email}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={loading || avatarBusy}
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-bold uppercase tracking-widest text-amber-500/90 hover:text-amber-400 disabled:opacity-50"
              >
                {avatarBusy ? "Enviando…" : "Enviar foto"}
              </button>
              {user?.temAvatar && (
                <button
                  type="button"
                  disabled={loading || avatarBusy}
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-rose-400/90 hover:text-rose-300 disabled:opacity-50"
                >
                  <Trash2 size={10} />
                  Remover
                </button>
              )}
            </div>
            <p className="text-[10px] text-white/25">JPG, PNG ou WebP · máx. 2 MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="modal-nome" className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">
              Nome Completo
            </label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
              <InputText
                id="modal-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                className="w-full bg-white/5 border-white/10 text-white rounded-2xl py-3 !pl-12 focus:border-amber-500/50 transition-all text-sm"
                placeholder="Seu nome"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-white/30 uppercase tracking-wider ml-1">E-mail</label>
            <div className="relative opacity-50">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
              <InputText
                value={form.email}
                disabled
                className="w-full bg-white/5 border-white/10 text-white rounded-2xl py-3 !pl-12 cursor-not-allowed text-sm"
              />
            </div>
          </div>
        </div>

        <Divider className="before:border-white/5" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest flex items-center gap-2">
              <Lock size={14} />
              Segurança
            </h5>
            <span className="text-[10px] text-white/20 italic">Opcional</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 z-10" />
                <Password
                  id="modal-senha"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  toggleMask
                  feedback={false}
                  className="w-full"
                  inputClassName="w-full bg-white/5 border-white/10 text-white rounded-2xl py-3 !pl-12 focus:border-amber-500/50 transition-all text-sm"
                  placeholder="senha"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 z-10" />
                <Password
                  id="modal-confirmarSenha"
                  value={form.confirmarSenha}
                  onChange={(e) => setForm({ ...form, confirmarSenha: e.target.value })}
                  toggleMask
                  feedback={false}
                  className="w-full"
                  inputClassName="w-full bg-white/5 border-white/10 text-white rounded-2xl py-3 !pl-12 focus:border-amber-500/50 transition-all text-sm"
                  placeholder="repita senha"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-white/5">
          <Button
            type="button"
            onClick={() => {
              onHide();
              clearAuthSession();
              router.push("/login");
            }}
            className="w-full sm:w-auto bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-8 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-4"
          >
            <span className="text-xs uppercase tracking-widest">Sair do Sistema</span>
            <Power size={18} />
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 border-none text-[#020817] px-10 py-3 rounded-2xl font-bold shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-4"
          >
            <span className="text-xs uppercase tracking-widest">Salvar Alterações</span>
            <Save size={18} />
          </Button>
        </div>
      </form>
    </DashboardDialog>
  );
}
