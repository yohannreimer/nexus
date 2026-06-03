import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

export function PrymeiraLoadingState({ label = 'Verificando acesso Prymeira' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center p-4" role="status" aria-live="polite">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-300 mx-auto mb-4" />
        <p className="text-sm text-stone-300">{label}</p>
      </div>
    </div>
  );
}

export function PrymeiraConfigError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center p-4" role="alert">
      <div className="max-w-md rounded-xl border border-amber-300/20 bg-stone-950 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-300 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-white mb-2">Configuração necessária</h1>
        <p className="text-sm text-stone-400">{message}</p>
      </div>
    </div>
  );
}

export function PrymeiraRedirectingState() {
  return (
    <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center p-4" role="status" aria-live="polite">
      <div className="text-center">
        <ShieldCheck className="w-9 h-9 text-amber-300 mx-auto mb-4" />
        <p className="text-sm text-stone-300">Redirecionando para a Prymeira Account</p>
      </div>
    </div>
  );
}
