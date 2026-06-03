import React, { useState } from 'react';
import { Database, Cloud, CheckCircle, AlertCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';

interface SupabaseSetupProps {
  onComplete?: () => void;
}

const STEPS = [
  { num: 1, title: 'Crie uma conta no Supabase', desc: <>Acesse <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">supabase.com</a> e crie um projeto</> },
  { num: 2, title: 'Execute o SQL Schema', desc: <>No SQL Editor do Supabase, execute o conteúdo de <code className="bg-white/8 px-1.5 py-0.5 rounded text-slate-300 font-mono text-xs">supabase/schema.sql</code></> },
  { num: 3, title: 'Copie as credenciais', desc: 'Em Settings → API, copie a URL e a anon key' },
  {
    num: 4,
    title: 'Configure o .env',
    desc: (
      <pre className="mt-2 bg-black/30 border border-white/8 text-emerald-400 p-3 rounded-lg text-xs overflow-x-auto font-mono">
        {`VITE_SUPABASE_URL="https://seu-projeto.supabase.co"\nVITE_SUPABASE_ANON_KEY="sua_anon_key"`}
      </pre>
    ),
  },
  { num: 5, title: 'Reinicie o servidor', desc: <>Execute <code className="bg-white/8 px-1.5 py-0.5 rounded text-slate-300 font-mono text-xs">npm run dev</code> novamente</> },
];

export function SupabaseSetup({ onComplete }: SupabaseSetupProps) {
  const { isConfigured, isLoading, error, facebookConnection, adAccounts, clients, templates, migrateData, refreshAll } = useSupabase();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; migrated: { connection: boolean; accounts: number; clients: number; templates: number } } | null>(null);

  const handleMigration = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const result = await migrateData();
      setMigrationResult(result);
      if (result.success && onComplete) setTimeout(onComplete, 2000);
    } catch (err) {
      console.error('Erro na migração:', err);
    } finally {
      setIsMigrating(false);
    }
  };

  const cardClass = "relative rounded-2xl border border-white/6 bg-white/3 backdrop-blur-sm overflow-hidden p-8 max-w-2xl mx-auto";

  // Not configured
  if (!isConfigured) {
    return (
      <div className={cardClass}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Configurar Supabase</h2>
          <p className="text-sm text-slate-500">Para usar o banco de dados, você precisa configurar o Supabase</p>
        </div>

        <div className="bg-white/3 border border-white/6 rounded-xl p-6 mb-6 space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Passo a passo</h3>
          <ol className="space-y-4">
            {STEPS.map(({ num, title, desc }) => (
              <li key={num} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-500/15 border border-brand-500/25 text-brand-400 flex items-center justify-center text-xs font-bold">
                  {num}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-300">{title}</p>
                  <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/20 hover:-translate-y-px"
        >
          <Cloud className="w-4 h-4" />
          Abrir Supabase Dashboard
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className={`${cardClass} text-center`}>
        <div className="relative w-14 h-14 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
          <div className="absolute inset-3 rounded-full bg-brand-500/10 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
          </div>
        </div>
        <p className="text-sm text-slate-500">Conectando ao Supabase...</p>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className={cardClass}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Erro de Conexão</h2>
          <p className="text-sm text-red-400">{error}</p>
        </div>
        <button
          onClick={refreshAll}
          className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/8 border border-white/10 text-slate-300 font-semibold text-sm transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Connected — status & migration
  return (
    <div className={cardClass}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Supabase Conectado!</h2>
        <p className="text-sm text-slate-500">Banco de dados configurado e funcionando</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { label: 'Contas de Anúncio', value: adAccounts.length },
          { label: 'Clientes Configurados', value: clients.length },
          { label: 'Templates', value: templates.length },
          { label: 'Facebook Conectado', value: facebookConnection ? '✓' : '✗' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/3 border border-white/6 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold font-mono text-brand-400">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Migration */}
      {!migrationResult && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 mb-5">
          <h3 className="text-sm font-semibold text-amber-300 mb-1">Migrar dados do localStorage?</h3>
          <p className="text-xs text-amber-400/70 mb-4">Se você já tinha dados salvos localmente, pode migrá-los para o Supabase.</p>
          <button
            onClick={handleMigration}
            disabled={isMigrating}
            className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-300 font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isMigrating ? <><Loader2 className="w-4 h-4 animate-spin" /> Migrando dados...</> : <><Database className="w-4 h-4" /> Migrar Dados do localStorage</>}
          </button>
        </div>
      )}

      {/* Migration result */}
      {migrationResult && (
        <div className={`rounded-xl p-4 mb-5 border ${migrationResult.success ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-red-500/8 border-red-500/20'}`}>
          <h3 className={`text-sm font-semibold mb-2 ${migrationResult.success ? 'text-emerald-300' : 'text-red-400'}`}>
            {migrationResult.success ? '✓ Migração Concluída!' : '✗ Erro na Migração'}
          </h3>
          {migrationResult.success && (
            <ul className="text-xs text-emerald-400/80 space-y-1">
              <li>· Conexão Facebook: {migrationResult.migrated.connection ? 'Migrada' : 'Não encontrada'}</li>
              <li>· Contas de Anúncio: {migrationResult.migrated.accounts} migradas</li>
              <li>· Clientes: {migrationResult.migrated.clients} migrados</li>
              <li>· Templates: {migrationResult.migrated.templates} migrados</li>
            </ul>
          )}
        </div>
      )}

      {onComplete && (
        <button
          onClick={onComplete}
          className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/20 hover:-translate-y-px"
        >
          Continuar para o Dashboard
        </button>
      )}
    </div>
  );
}

export default SupabaseSetup;
