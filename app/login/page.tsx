"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Checkbox } from "primereact/checkbox";
import { AppLogo } from "@/components/AppLogo";
import { getLoginUrl } from "@/lib/api-config";
import { setAuthSession, resolvePostLoginPath } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import { loadingState } from "@/lib/loading-store";

type LoginValues = {
  email: string;
  password: string;
  remember?: boolean;
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { control, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    defaultValues: { email: "", password: "", remember: false }
  });

  const onSubmit = async (values: LoginValues) => {
    const requestedNext = searchParams.get("next");
    let loginUrl = getLoginUrl();
    try {
      loadingState.start();
      if (!loginUrl) {
        for (let i = 0; i < 20 && !loginUrl; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          loginUrl = getLoginUrl();
        }
      }
      if (loginUrl) {
        const res = await fetch(loginUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: values.email.trim(),
            username: values.email.trim(),
            password: values.password,
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.accessToken) {
          toast.error(data?.message || "Credenciais inválidas.");
          return;
        }

        setAuthSession(data.accessToken, data.role || "ADMIN", data.email);
        toast.success(`Bem-vindo ao Aires Prime!`);
        const role = data.role || "ADMIN";
        router.push(resolvePostLoginPath(requestedNext, role));
      } else {
        toast.error("Serviço de autenticação indisponível. Verifique a configuração da API.");
      }
    } catch {
      toast.error("Erro de conexão com o servidor.");
    } finally {
      loadingState.stop();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#071C33] p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl shadow-2xl">
        
        {/* Lado Esquerdo - Branding */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600/20 to-emerald-600/20 border-r border-white/10">
          <div className="flex items-center gap-3">
            <AppLogo boxClassName="w-12 h-12" />
            <span className="text-2xl font-bold text-white tracking-tight font-[family-name:var(--font-playfair)]">Aires Prime</span>
          </div>
          
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4 font-[family-name:var(--font-playfair)]">
              Excelência em Gestão Imobiliária.
            </h1>
            <p className="text-white/60 text-lg">
              Acesse sua conta para gerenciar contratos, lotes e leads com a nova interface de alta performance.
            </p>
          </div>
          
          <div className="text-sm text-white/40 italic">
            "A tecnologia a serviço do seu crescimento."
          </div>
        </div>

        {/* Lado Direito - Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="md:hidden flex flex-col items-center mb-8">
            <AppLogo boxClassName="w-16 h-16 mb-4" />
            <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-playfair)]">Aires Prime</h2>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h3 className="text-2xl font-semibold text-white mb-2">Entrar no Sistema</h3>
            <p className="text-white/50">Informe suas credenciais de acesso.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-white/80 font-medium">E-mail</label>
              <div className="relative">
                <i className="pi pi-envelope absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10" />
                <Controller
                  name="email"
                  control={control}
                  rules={{ required: "E-mail é obrigatório" }}
                  render={({ field }) => (
                    <InputText 
                      {...field} 
                      id="email" 
                      placeholder="seu@email.com" 
                      className={cn("w-full p-inputtext-lg !pl-12 pr-4 bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all", { "p-invalid": errors.email })} 
                    />
                  )}
                />
              </div>
              {errors.email && <small className="p-error">{errors.email.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" title="password" className="text-white/80 font-medium">Senha</label>
              <div className="relative">
                <i className="pi pi-lock absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10" />
                <Controller
                  name="password"
                  control={control}
                  rules={{ required: "Senha é obrigatória" }}
                  render={({ field }) => (
                    <Password 
                      {...field} 
                      id="password" 
                      placeholder="••••••••" 
                      toggleMask 
                      feedback={false}
                      className="w-full"
                      inputClassName="w-full p-inputtext-lg !pl-12 pr-12 bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all"
                    />
                  )}
                />
              </div>
              {errors.password && <small className="p-error">{errors.password.message}</small>}
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Controller
                  name="remember"
                  control={control}
                  render={({ field }) => (
                    <Checkbox inputId="remember" checked={field.value ?? false} onChange={(e) => field.onChange(e.checked ?? false)} />
                  )}
                />
                <label htmlFor="remember" className="text-white/60 text-sm cursor-pointer">Lembrar de mim</label>
              </div>
              <a href="#" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Esqueceu a senha?</a>
            </div>

            <Button 
              type="submit" 
              label="Login" 
              icon="pi pi-sign-in" 
              iconPos="right"
              className="p-button-lg mt-4 px-8 bg-blue-600 border-none hover:bg-blue-500 transition-all font-semibold" 
              pt={{
                icon: { className: 'text-lg' }
              }}
            />
          </form>

          <div className="mt-12 pt-8 border-t border-white/10 text-center">
            <p className="text-white/40 text-sm">
              Não possui acesso? <a href="#" className="text-white/70 hover:text-white font-semibold">Fale com o administrador</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#071C33]" />}>
      <LoginContent />
    </Suspense>
  );
}
