import { useState, useEffect } from 'react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG       = '#0a0a09';
const SURFACE  = '#111110';
const BORDER   = '#1e1e1c';
const ACCENT   = '#fcc009';
const TEXT     = '#f6f2e8';
const TEXT_SOFT = '#9e9589';
const TEXT_MUTED = '#5a5652';
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const APP_URL = 'https://nexus.prymeiradigital.com.br';

// ── Responsive hook ───────────────────────────────────────────────────────────
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return isMobile;
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function NexusLogoMark({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      background: '#4f46e5',
      borderRadius: size * 0.28,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 0 10px rgba(99,102,241,0.4)',
    }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 14 14" fill="none">
        <circle cx="4" cy="4" r="2" stroke="#fff" strokeWidth="1.4"/>
        <circle cx="10" cy="10" r="2" stroke="#fff" strokeWidth="1.4"/>
        <line x1="5.4" y1="5.4" x2="8.6" y2="8.6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ isMobile }: { isMobile: boolean }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: BG, borderBottom: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 20px' : '0 48px', height: 64,
      fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <NexusLogoMark size={28} />
        <span style={{ color: TEXT, fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Nexus AI
        </span>
      </div>

      {!isMobile && (
        <div style={{ display: 'flex', gap: 32 }}>
          {([['Plataformas', '#plataformas'], ['Funcionalidades', '#funcionalidades'], ['Planos', '#planos']] as const).map(([label, href]) => (
            <a key={href} href={href} style={{ color: TEXT_SOFT, fontSize: 14, textDecoration: 'none', fontFamily: FONT }}
              onMouseOver={e => (e.currentTarget.style.color = TEXT)}
              onMouseOut={e => (e.currentTarget.style.color = TEXT_SOFT)}>
              {label}
            </a>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {!isMobile && (
          <a href={APP_URL} style={{ color: TEXT_SOFT, fontSize: 14, textDecoration: 'none', fontFamily: FONT }}
            onMouseOver={e => (e.currentTarget.style.color = TEXT)}
            onMouseOut={e => (e.currentTarget.style.color = TEXT_SOFT)}>
            Entrar
          </a>
        )}
        <a href={`${APP_URL}/signup`} style={{
          background: ACCENT, color: BG,
          padding: '8px 18px', borderRadius: 6,
          fontSize: 14, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
          fontFamily: FONT,
        }}>
          Começar teste
        </a>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ isMobile }: { isMobile: boolean }) {
  const chips = ['Meta Ads', 'Google Ads', 'WhatsApp', 'Gemini 2.0'];
  const chipColors: Record<string, string> = {
    'Meta Ads': '#1877f2',
    'Google Ads': '#4285f4',
    'WhatsApp': '#25d366',
    'Gemini 2.0': '#8b5cf6',
  };

  return (
    <section style={{ background: BG, padding: isMobile ? '72px 20px 64px' : '96px 48px 80px', fontFamily: FONT }}>
      <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          background: SURFACE, border: `1px solid ${BORDER}`,
          color: TEXT_SOFT, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.08em', padding: '5px 12px', borderRadius: 20,
          marginBottom: 32, textTransform: 'uppercase' as const,
        }}>
          Powered by Gemini 2.0 · Meta Ads · Google Ads
        </div>

        <h1 style={{
          color: TEXT, fontSize: isMobile ? 32 : 52,
          fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1,
          margin: '0 0 24px',
        }}>
          Relatórios de Ads<br />
          <span style={{ color: ACCENT }}>no piloto automático.</span>
        </h1>

        <p style={{
          color: TEXT_SOFT, fontSize: isMobile ? 16 : 18,
          lineHeight: 1.6, margin: '0 0 40px',
        }}>
          Conecte suas contas de anúncio e deixe a IA enviar análises diárias para seus clientes via WhatsApp —
          {' '}<span style={{ color: TEXT }}>sem abrir nenhuma plataforma.</span>
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          <a href={`${APP_URL}/signup`} style={{
            background: ACCENT, color: BG,
            padding: '14px 28px', borderRadius: 7,
            fontSize: 15, fontWeight: 700, textDecoration: 'none',
          }}>
            Começar gratuitamente →
          </a>
          <a href="#funcionalidades" style={{
            background: 'transparent', color: TEXT,
            padding: '14px 28px', borderRadius: 7,
            border: `1px solid ${BORDER}`,
            fontSize: 15, fontWeight: 500, textDecoration: 'none',
          }}>
            Ver funcionalidades
          </a>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {chips.map(chip => (
            <span key={chip} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: SURFACE, border: `1px solid ${BORDER}`,
              padding: '5px 12px', borderRadius: 20,
              color: '#c0c0be', fontSize: 12, fontWeight: 500,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: chipColors[chip], flexShrink: 0 }} />
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Problema ──────────────────────────────────────────────────────────────────
const PAIN_CARDS = [
  {
    title: 'Relatório manual todo dia',
    subtitle: '2h/dia perdidas',
    desc: 'Copiar métricas, formatar prints, montar PDF — repetido para cada cliente, todo dia.',
  },
  {
    title: 'Cliente cobrando atualização',
    subtitle: 'Resposta atrasada',
    desc: 'O cliente manda mensagem perguntando como estão os anúncios antes de você ter tempo de checar.',
  },
  {
    title: 'Dados inconsistentes',
    subtitle: 'Meta vs. Google',
    desc: 'Cada plataforma tem seu painel, sua métrica, seu jeito de reportar. Comparar é trabalho manual.',
  },
];

function Problema({ isMobile }: { isMobile: boolean }) {
  return (
    <section style={{ background: '#fafaf8', padding: isMobile ? '64px 20px' : '80px 48px', fontFamily: FONT }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{
          color: '#0a0a09', fontSize: isMobile ? 26 : 38,
          fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15,
          margin: '0 0 16px', textAlign: 'center',
        }}>
          Sua agência perde 2h por dia criando relatórios.
        </h2>
        <p style={{ color: '#5a5a58', fontSize: 17, textAlign: 'center', lineHeight: 1.6, margin: '0 0 48px' }}>
          Isso é 40 horas por mês que poderiam estar em estratégia, prospecção ou descanso.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
          {PAIN_CARDS.map(card => (
            <div key={card.title} style={{
              background: '#fff9f9', border: '1px solid #fee2e2',
              borderRadius: 10, padding: 24,
            }}>
              <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                {card.subtitle}
              </div>
              <h3 style={{ color: '#0a0a09', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                {card.title}
              </h3>
              <p style={{ color: '#6a6a68', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Plataformas ───────────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    key: 'meta',
    name: 'Meta Ads',
    color: '#1877f2',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877f2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    connection: 'OAuth 2.0 oficial via Meta for Developers. Token de longa duração (60 dias) com renovação automática.',
    permissions: 'ads_read — somente leitura. O Nexus AI nunca gerencia, pausa ou altera campanhas.',
    metrics: ['Impressões', 'Cliques', 'Alcance', 'CPM', 'CPC', 'CTR', 'Gasto total', 'ROAS', 'Conversões', 'Frequência'],
    usage: 'Os dados são enviados à IA Gemini para gerar um resumo em linguagem natural. O resumo é enviado via WhatsApp ao gestor ou cliente. Nenhum dado é revendido ou compartilhado com terceiros.',
  },
  {
    key: 'google',
    name: 'Google Ads',
    color: '#4285f4',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    connection: 'OAuth 2.0 oficial via Google Ads API. Autenticação gerenciada pelo Google Identity Services.',
    permissions: 'Escopo: https://www.googleapis.com/auth/adwords — somente leitura de relatórios e métricas. O Nexus AI não cria, edita ou exclui campanhas, grupos de anúncios ou anúncios.',
    metrics: ['Impressões', 'Cliques', 'CTR', 'CPC médio', 'Gasto total', 'Conversões', 'Custo por conversão', 'ROAS', 'Qualidade do anúncio', 'Posição média'],
    usage: 'Os dados de desempenho são processados pela IA Gemini para gerar análises automáticas em português. Os relatórios são entregues via WhatsApp diretamente para o gestor de tráfego ou cliente final. Nenhuma alteração é feita na conta Google Ads.',
  },
];

function Plataformas({ isMobile }: { isMobile: boolean }) {
  return (
    <section id="plataformas" style={{ background: '#ffffff', padding: isMobile ? '64px 20px' : '80px 48px', fontFamily: FONT }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-block',
            background: '#f0f9ff', border: '1px solid #bae6fd',
            color: '#0369a1', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.08em', padding: '5px 12px', borderRadius: 20,
            marginBottom: 20, textTransform: 'uppercase' as const,
          }}>
            Integrações oficiais
          </div>
          <h2 style={{
            color: '#0a0a09', fontSize: isMobile ? 26 : 38,
            fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 16px',
          }}>
            Conectado às maiores plataformas de Ads
          </h2>
          <p style={{ color: '#5a5a58', fontSize: 17, lineHeight: 1.6, margin: 0 }}>
            O Nexus AI usa apenas APIs oficiais com autenticação OAuth 2.0 — acesso de leitura, sem intervenção nas campanhas.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 24 }}>
          {PLATFORMS.map(platform => (
            <div key={platform.key} style={{
              background: '#fafaf8', border: '1px solid #e8e8e4',
              borderRadius: 14, padding: 32,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: '#fff', border: '1px solid #e8e8e4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                  {platform.icon}
                </div>
                <div>
                  <div style={{ color: '#0a0a09', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {platform.name}
                  </div>
                  <div style={{ color: '#6a6a68', fontSize: 12, marginTop: 2 }}>
                    Integração oficial via OAuth 2.0
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#3a3a38', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 6 }}>
                  Como o Nexus AI se conecta
                </div>
                <p style={{ color: '#5a5a58', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  {platform.connection}
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#3a3a38', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 6 }}>
                  Permissões solicitadas
                </div>
                <p style={{ color: '#5a5a58', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  {platform.permissions}
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#3a3a38', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 10 }}>
                  Métricas acessadas
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {platform.metrics.map(m => (
                    <span key={m} style={{
                      background: '#fff', border: '1px solid #e8e8e4',
                      color: '#3a3a38', fontSize: 12, fontWeight: 500,
                      padding: '3px 10px', borderRadius: 12,
                    }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#3a3a38', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 6 }}>
                  Como os dados são usados
                </div>
                <p style={{ color: '#5a5a58', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  {platform.usage}
                </p>
              </div>

              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 8, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
                <span style={{ color: '#15803d', fontSize: 12, fontWeight: 600 }}>
                  Somente leitura — sem acesso financeiro ou gerenciamento de campanhas
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Funcionalidades ───────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '🔐', title: 'Conexão OAuth oficial', desc: 'Meta e Google via APIs certificadas. Sem senhas armazenadas, token de acesso com escopo mínimo.' },
  { icon: '🤖', title: 'Relatórios via IA Gemini', desc: 'Análise em linguagem natural. A IA identifica tendências, alertas e oportunidades automaticamente.' },
  { icon: '📲', title: 'Envio automático WhatsApp', desc: 'Relatório entregue todo dia no horário que você definir — sem intervenção manual.' },
  { icon: '👥', title: 'Multi-conta / multi-cliente', desc: 'Gerencie todas as contas de anúncio de todos os seus clientes em um único painel.' },
  { icon: '📊', title: 'Dashboard em tempo real', desc: 'Visualize métricas consolidadas de Meta e Google lado a lado, sem trocar de aba.' },
  { icon: '📄', title: 'PDF com branding da agência', desc: 'Relatórios exportados com logo e cores da sua agência. Profissionalismo na entrega.' },
  { icon: '⚠️', title: 'Alertas automáticos', desc: 'Notificação imediata quando ROAS cai abaixo do threshold ou campanha para de gastar.' },
  { icon: '📁', title: 'Histórico completo', desc: 'Todos os relatórios salvos e pesquisáveis. Compare desempenho mês a mês com um clique.' },
];

function Funcionalidades({ isMobile }: { isMobile: boolean }) {
  return (
    <section id="funcionalidades" style={{ background: '#fafaf8', padding: isMobile ? '64px 20px' : '80px 48px', fontFamily: FONT }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{
          color: '#0a0a09', fontSize: isMobile ? 26 : 38,
          fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15,
          margin: '0 0 48px', textAlign: 'center',
        }}>
          Tudo que uma agência de tráfego precisa
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: '#fff', border: '1px solid #e8e8e4',
              borderRadius: 10, padding: '20px 24px',
              display: 'flex', gap: 16, alignItems: 'flex-start',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
              <div>
                <div style={{ color: '#0a0a09', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 4 }}>
                  {f.title}
                </div>
                <p style={{ color: '#6a6a68', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Como funciona ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    number: '01',
    title: 'Conecte suas contas',
    desc: 'Autorize o acesso via OAuth 2.0 para Meta Ads e Google Ads. Leva menos de 2 minutos. Nenhuma senha é armazenada.',
  },
  {
    number: '02',
    title: 'Configure clientes e campanhas',
    desc: 'Associe cada cliente às suas contas de anúncio. Selecione quais campanhas monitorar e o horário de envio do relatório.',
  },
  {
    number: '03',
    title: 'A IA trabalha por você',
    desc: 'Todo dia no horário configurado, o Nexus AI coleta os dados, gera a análise com IA e envia o relatório via WhatsApp.',
  },
];

function ComoFunciona({ isMobile }: { isMobile: boolean }) {
  return (
    <section style={{ background: BG, padding: isMobile ? '64px 20px' : '80px 48px', fontFamily: FONT }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-block', background: SURFACE, border: `1px solid ${BORDER}`,
            color: TEXT_SOFT, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.08em', padding: '5px 12px', borderRadius: 20,
            marginBottom: 20, textTransform: 'uppercase' as const,
          }}>
            Como funciona
          </div>
          <h2 style={{
            color: TEXT, fontSize: isMobile ? 26 : 38,
            fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15, margin: 0,
          }}>
            Três passos. Depois é automático.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 24 }}>
          {STEPS.map((step, i) => (
            <div key={step.number} style={{
              background: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: 12, padding: 28, position: 'relative',
            }}>
              <div style={{
                color: ACCENT, fontSize: 36, fontWeight: 900,
                letterSpacing: '-0.05em', lineHeight: 1, marginBottom: 16,
                opacity: 0.7,
              }}>
                {step.number}
              </div>
              <h3 style={{ color: TEXT, fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
                {step.title}
              </h3>
              <p style={{ color: TEXT_SOFT, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {step.desc}
              </p>
              {i < STEPS.length - 1 && !isMobile && (
                <div style={{
                  position: 'absolute', right: -13, top: '50%',
                  transform: 'translateY(-50%)',
                  color: TEXT_MUTED, fontSize: 20,
                }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Planos ────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 97,
    priceAnnual: 797,
    desc: 'Para freelancers e gestores solo.',
    features: ['Até 3 clientes', 'Meta Ads + Google Ads', 'Relatórios diários via WhatsApp', 'Dashboard básico'],
    recommended: false,
  },
  {
    id: 'agencia',
    name: 'Agência',
    priceMonthly: 197,
    priceAnnual: 1597,
    desc: 'Para agências em crescimento.',
    features: ['Até 15 clientes', 'Meta Ads + Google Ads', 'Relatórios diários via WhatsApp', 'Dashboard completo', 'PDF com branding', 'Alertas automáticos'],
    recommended: true,
  },
  {
    id: 'agencia-pro',
    name: 'Agência Pro',
    priceMonthly: 347,
    priceAnnual: 2797,
    desc: 'Para agências estabelecidas.',
    features: ['Clientes ilimitados', 'Meta Ads + Google Ads', 'Relatórios diários via WhatsApp', 'Dashboard completo', 'PDF com branding', 'Alertas automáticos', 'API de integração', 'Suporte prioritário'],
    recommended: false,
  },
];

function Planos({ isMobile }: { isMobile: boolean }) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  return (
    <section id="planos" style={{ background: '#fafaf8', padding: isMobile ? '64px 20px' : '80px 48px', fontFamily: FONT }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h2 style={{
          color: '#0a0a09', fontSize: isMobile ? 26 : 38,
          fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15,
          margin: '0 0 8px', textAlign: 'center',
        }}>
          Escolha seu plano
        </h2>
        <p style={{ color: '#5a5a58', fontSize: 16, textAlign: 'center', lineHeight: 1.6, margin: '0 0 32px' }}>
          Comece com 7 dias grátis. Sem cartão de crédito.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 40px' }}>
          <div style={{ display: 'flex', background: '#eeeeec', borderRadius: 8, padding: 4 }}>
            {(['monthly', 'annual'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                background: billing === b ? '#fff' : 'transparent',
                color: billing === b ? '#0a0a09' : '#6a6a68',
                border: 'none', cursor: 'pointer',
                padding: '7px 20px', borderRadius: 6,
                fontSize: 14, fontWeight: 600, fontFamily: FONT,
                boxShadow: billing === b ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {b === 'monthly' ? 'Mensal' : 'Anual'}
                {b === 'annual' && (
                  <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10 }}>
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              background: '#fff',
              border: plan.recommended ? `2px solid ${ACCENT}` : '1px solid #e8e8e4',
              borderRadius: 10, padding: 28, position: 'relative',
              boxShadow: plan.recommended ? `0 4px 20px rgba(252,192,9,0.12)` : '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {plan.recommended && (
                <div style={{
                  position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                  background: ACCENT, color: BG,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                  padding: '4px 12px', borderRadius: 10, textTransform: 'uppercase' as const, whiteSpace: 'nowrap',
                }}>
                  Mais popular
                </div>
              )}
              <div style={{ color: '#0a0a09', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ color: '#6a6a68', fontSize: 13, marginBottom: 16 }}>{plan.desc}</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ color: '#0a0a09', fontSize: 34, fontWeight: 900, letterSpacing: '-0.04em' }}>
                  R$ {billing === 'monthly' ? plan.priceMonthly : Math.round(plan.priceAnnual / 12)}
                </span>
                <span style={{ color: '#8a8a88', fontSize: 14 }}>/mês</span>
                {billing === 'annual' && (
                  <div style={{ color: '#6a6a68', fontSize: 12, marginTop: 2 }}>
                    R$ {plan.priceAnnual}/ano
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 24 }}>
                {plan.features.map(feat => (
                  <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', color: '#3a3a38', fontSize: 14 }}>
                    <span style={{ color: '#16a34a', fontSize: 12, flexShrink: 0 }}>✓</span>
                    {feat}
                  </div>
                ))}
              </div>
              <a href={`${APP_URL}/signup?plan=${plan.id}`} style={{
                display: 'block', textAlign: 'center',
                background: plan.recommended ? ACCENT : '#0a0a09',
                color: plan.recommended ? BG : '#fff',
                padding: '11px 0', borderRadius: 7,
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}>
                Começar teste grátis
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Final ─────────────────────────────────────────────────────────────────
function CtaFinal({ isMobile }: { isMobile: boolean }) {
  return (
    <section style={{ background: BG, padding: isMobile ? '72px 20px' : '96px 48px', fontFamily: FONT, textAlign: 'center' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{
          display: 'inline-block', background: SURFACE, border: `1px solid ${BORDER}`,
          color: TEXT_SOFT, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.08em', padding: '5px 12px', borderRadius: 20,
          marginBottom: 24, textTransform: 'uppercase' as const,
        }}>
          7 dias grátis · Sem cartão
        </div>
        <h2 style={{
          color: TEXT, fontSize: isMobile ? 30 : 44,
          fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px',
        }}>
          Automatize seus relatórios hoje.
        </h2>
        <p style={{ color: TEXT_SOFT, fontSize: 17, lineHeight: 1.6, margin: '0 0 40px' }}>
          Configure em menos de 5 minutos. Seu primeiro relatório automático chega amanhã.
        </p>
        <a href={`${APP_URL}/signup`} style={{
          display: 'inline-block', background: ACCENT, color: BG,
          padding: '16px 40px', borderRadius: 8,
          fontSize: 16, fontWeight: 700, textDecoration: 'none',
        }}>
          Começar gratuitamente →
        </a>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ isMobile }: { isMobile: boolean }) {
  return (
    <footer style={{
      background: '#050505', borderTop: `1px solid #111110`,
      padding: isMobile ? '32px 20px' : '32px 48px',
      fontFamily: FONT,
      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: 'space-between', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NexusLogoMark size={20} />
        <span style={{ color: '#4a4a48', fontSize: 13 }}>Nexus AI · © 2026 Prymeira Digital</span>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {([['Termos de uso', '/termos'], ['Privacidade', '/privacidade'], ['Suporte', '/suporte']] as const).map(([label, href]) => (
          <a key={href} href={href} style={{ color: '#4a4a48', fontSize: 13, textDecoration: 'none' }}
            onMouseOver={e => (e.currentTarget.style.color = '#8a8a88')}
            onMouseOut={e => (e.currentTarget.style.color = '#4a4a48')}>
            {label}
          </a>
        ))}
      </div>
    </footer>
  );
}

// ── NexusLandingPage ──────────────────────────────────────────────────────────
export function NexusLandingPage() {
  const isMobile = useIsMobile();
  return (
    <div style={{ fontFamily: FONT }}>
      <Navbar isMobile={isMobile} />
      <Hero isMobile={isMobile} />
      <Problema isMobile={isMobile} />
      <Plataformas isMobile={isMobile} />
      <Funcionalidades isMobile={isMobile} />
      <ComoFunciona isMobile={isMobile} />
      <Planos isMobile={isMobile} />
      <CtaFinal isMobile={isMobile} />
      <Footer isMobile={isMobile} />
    </div>
  );
}
