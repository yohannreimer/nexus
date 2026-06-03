import { SignIn } from '@clerk/clerk-react';
import { BarChart3 } from 'lucide-react';

export function PrymeiraLoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0a09] grid lg:grid-cols-[52fr_48fr]">
      <section className="hidden lg:flex flex-col justify-between p-12 border-r border-white/10 bg-[radial-gradient(circle_at_25%_20%,rgba(245,158,11,0.22),transparent_34%),#0a0a09]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-amber-300/30 bg-amber-300/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="text-white font-semibold">Ads Vision</div>
            <div className="text-xs text-stone-500">Prymeira Digital</div>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="text-sm uppercase tracking-[0.28em] text-amber-300 mb-4">Prymeira Account</p>
          <h1 className="text-5xl font-semibold text-white leading-tight">
            Relatórios de mídia conectados ao seu workspace.
          </h1>
          <p className="text-base text-stone-400 mt-5 max-w-lg">
            Entre com sua conta Prymeira para acessar clientes, contas de anúncio, automações e inteligência do Ads
            Vision.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-lg">
          {['Meta Ads', 'Google Ads', 'Relatórios'].map((label) => (
            <div key={label} className="h-16 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="h-1.5 w-12 rounded-full bg-amber-300/70 mb-3" />
              <div className="text-xs text-stone-400">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <main className="flex items-center justify-center p-5">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex w-11 h-11 rounded-xl border border-amber-300/30 bg-amber-300/10 items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5 text-amber-300" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Ads Vision</h1>
            <p className="text-sm text-stone-500 mt-1">Prymeira Digital</p>
          </div>

          <SignIn
            routing="hash"
            appearance={{
              variables: {
                colorPrimary: '#f59e0b',
                colorBackground: '#11110f',
                colorText: '#f8fafc',
                colorTextSecondary: '#a8a29e',
                borderRadius: '8px',
              },
            }}
          />
        </div>
      </main>
    </div>
  );
}
