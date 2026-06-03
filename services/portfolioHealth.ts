import type { ClientAiAnalysis, ClientDailySnapshot, ClientReportRun, ClientWorkspaceSummary } from './clientWorkspaceTypes';

export type PortfolioClientHealth = 'healthy' | 'attention' | 'critical' | 'no_data' | 'integration_broken' | 'automation_off';

export type PortfolioAlert = {
  id: string;
  clientId: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action: 'review_client' | 'resend_report' | 'reconnect_integration' | 'validate_budget' | 'generate_ai_analysis' | 'contact_client';
};

export type PortfolioOpportunity = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  action: 'increase_budget' | 'case_study' | 'upsell' | 'strategy_meeting';
};

const EMPTY_SUMMARY: Record<PortfolioClientHealth, number> = {
  healthy: 0,
  attention: 0,
  critical: 0,
  no_data: 0,
  integration_broken: 0,
  automation_off: 0,
};

export function evaluatePortfolioHealth(input: {
  clients: ClientWorkspaceSummary[];
  runs: ClientReportRun[];
  analyses: ClientAiAnalysis[];
  dailySnapshots?: ClientDailySnapshot[];
  today?: string;
}): {
  summary: Record<PortfolioClientHealth, number>;
  alerts: PortfolioAlert[];
  opportunities: PortfolioOpportunity[];
  actionQueue: PortfolioAlert[];
} {
  const summary = { ...EMPTY_SUMMARY };
  const alerts: PortfolioAlert[] = [];
  const opportunities: PortfolioOpportunity[] = [];
  const runsByClient = groupRunsByClient(input.runs);
  const snapshotsByClient = groupDailySnapshotsByClient(input.dailySnapshots || []);
  const dailyMemoryEnabled = Array.isArray(input.dailySnapshots);
  const yesterday = previousIsoDate(input.today || new Date().toISOString().slice(0, 10));

  for (const client of input.clients) {
    const runs = runsByClient.get(client.client.id) || [];
    const latestRun = runs[0] || null;
    const previousRun = runs[1] || null;
    const dailyRows = snapshotsByClient.get(client.client.id) || [];
    const clientAlerts = evaluateClientAlerts(client, latestRun, {
      enabled: dailyMemoryEnabled,
      rows: dailyRows,
      expectedDate: yesterday,
    });
    const health = resolveClientHealth(client, latestRun, clientAlerts, {
      enabled: dailyMemoryEnabled,
      rows: dailyRows,
    });

    summary[health] += 1;
    alerts.push(...clientAlerts);

    const opportunity = evaluateConversionOpportunity(client.client.id, latestRun, previousRun);
    if (opportunity) opportunities.push(opportunity);
  }

  return {
    summary,
    alerts,
    opportunities,
    actionQueue: alerts
      .filter((alert) => alert.severity !== 'info')
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity)),
  };
}

function evaluateClientAlerts(
  client: ClientWorkspaceSummary,
  latestRun: ClientReportRun | null,
  dailyMemory: {
    enabled: boolean;
    rows: ClientDailySnapshot[];
    expectedDate: string;
  },
): PortfolioAlert[] {
  const alerts: PortfolioAlert[] = [];
  const clientId = client.client.id;

  if (client.linkedAccounts.filter((link) => link.isActive).length === 0) {
    alerts.push({
      id: `${clientId}:integration_broken`,
      clientId,
      severity: 'critical',
      title: 'Cliente sem contas conectadas',
      description: 'Este cliente nao possui conta ativa vinculada para gerar relatorios.',
      action: 'reconnect_integration',
    });
    return alerts;
  }

  if (!client.settings?.deliveryEnabled) {
    alerts.push({
      id: `${clientId}:automation_off`,
      clientId,
      severity: 'warning',
      title: 'Automacao desligada',
      description: 'O envio automatico de relatorios esta desativado para este cliente.',
      action: 'review_client',
    });
  }

  if (dailyMemory.enabled) {
    alerts.push(...evaluateDailyMemoryAlerts(clientId, dailyMemory.rows, dailyMemory.expectedDate));
  }

  if (!latestRun) {
    if (dailyMemory.enabled && dailyMemory.rows.length > 0) return alerts;
    alerts.push({
      id: `${clientId}:no_data`,
      clientId,
      severity: 'warning',
      title: 'Sem historico de relatorio',
      description: 'Ainda nao existe relatorio recente para avaliar a saude deste cliente.',
      action: 'generate_ai_analysis',
    });
    return alerts;
  }

  if (latestRun.status === 'failed') {
    alerts.push({
      id: `${clientId}:latest_report_failed`,
      clientId,
      severity: 'warning',
      title: 'Ultimo relatorio falhou',
      description: 'O ultimo relatorio agendado falhou e deve ser reenviado ou revisado.',
      action: 'resend_report',
    });
  }

  if (hasDisconnectWarning(latestRun)) {
    alerts.push({
      id: `${clientId}:account_disconnected`,
      clientId,
      severity: 'critical',
      title: 'Conta desconectada',
      description: 'Ha aviso de desconexao ou erro de integracao no ultimo relatorio.',
      action: 'reconnect_integration',
    });
  }

  const metrics = readMetrics(latestRun);
  const targetCpl = readTargetCpl(client);
  if (targetCpl > 0 && metrics.spend >= targetCpl && metrics.conversions <= 0) {
    alerts.push({
      id: `${clientId}:spend_without_conversion`,
      clientId,
      severity: 'warning',
      title: 'Gasto sem conversao',
      description: `O cliente investiu ${formatCurrency(metrics.spend)} sem conversoes no periodo avaliado.`,
      action: 'validate_budget',
    });
  }

  return alerts;
}

function resolveClientHealth(
  client: ClientWorkspaceSummary,
  latestRun: ClientReportRun | null,
  alerts: PortfolioAlert[],
  dailyMemory: {
    enabled: boolean;
    rows: ClientDailySnapshot[];
  },
): PortfolioClientHealth {
  if (client.linkedAccounts.filter((link) => link.isActive).length === 0) return 'integration_broken';
  if (!client.settings?.deliveryEnabled) return 'automation_off';
  if (!latestRun && (!dailyMemory.enabled || dailyMemory.rows.length === 0)) return 'no_data';
  if (alerts.some((alert) => alert.severity === 'critical')) return 'critical';
  if (alerts.some((alert) => alert.severity === 'warning')) return 'attention';
  return 'healthy';
}

function evaluateDailyMemoryAlerts(
  clientId: string,
  rows: ClientDailySnapshot[],
  expectedDate: string,
): PortfolioAlert[] {
  const alerts: PortfolioAlert[] = [];
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.at(-1) || null;

  if (!latest || latest.date < expectedDate) {
    alerts.push({
      id: `${clientId}:daily_memory_missing`,
      clientId,
      severity: 'warning',
      title: 'Sem leitura diaria recente',
      description: 'O monitoramento ainda nao registrou dados do dia anterior para este cliente.',
      action: 'review_client',
    });
    return alerts;
  }

  const lastThree = sorted.slice(-3);
  if (
    lastThree.length === 3
    && lastThree.every((row) => row.spend > 0 && row.conversions <= 0)
    && sum(lastThree.map((row) => row.spend)) >= 50
  ) {
    alerts.push({
      id: `${clientId}:three_day_spend_without_conversion`,
      clientId,
      severity: 'warning',
      title: '3 dias com gasto sem conversao',
      description: `O cliente investiu ${formatCurrency(sum(lastThree.map((row) => row.spend)))} nos ultimos 3 dias sem conversoes registradas.`,
      action: 'validate_budget',
    });
  }

  const latestCpa = costPerConversion(latest);
  const baselineRows = sorted.slice(0, -1).filter((row) => row.conversions > 0).slice(-14);
  const baselineSpend = sum(baselineRows.map((row) => row.spend));
  const baselineConversions = sum(baselineRows.map((row) => row.conversions));
  const baselineCpa = baselineConversions > 0 ? baselineSpend / baselineConversions : 0;

  if (latestCpa > 0 && baselineCpa > 0 && latestCpa >= baselineCpa * 1.5 && latest.spend >= 50) {
    const increase = Math.round(((latestCpa - baselineCpa) / baselineCpa) * 100);
    alerts.push({
      id: `${clientId}:cost_per_conversion_spike`,
      clientId,
      severity: 'warning',
      title: 'Custo por conversao subiu',
      description: `Ontem o custo por conversao ficou ${increase}% acima da media recente.`,
      action: 'validate_budget',
    });
  }

  return alerts;
}

function evaluateConversionOpportunity(
  clientId: string,
  latestRun: ClientReportRun | null,
  previousRun: ClientReportRun | null,
): PortfolioOpportunity | null {
  if (!latestRun || !previousRun) return null;
  const latest = readMetrics(latestRun);
  const previous = readMetrics(previousRun);
  if (previous.conversions <= 0 || latest.conversions <= previous.conversions) return null;

  const improvement = ((latest.conversions - previous.conversions) / previous.conversions) * 100;
  if (improvement < 25) return null;

  return {
    id: `${clientId}:conversion_growth`,
    clientId,
    title: 'Conversoes em crescimento',
    description: `Conversoes subiram ${Math.round(improvement)}% contra o periodo anterior.`,
    action: 'increase_budget',
  };
}

function groupRunsByClient(runs: ClientReportRun[]): Map<string, ClientReportRun[]> {
  const groups = new Map<string, ClientReportRun[]>();
  for (const run of runs) {
    const list = groups.get(run.clientId) || [];
    list.push(run);
    groups.set(run.clientId, list);
  }

  for (const list of groups.values()) {
    list.sort((a, b) => timestamp(b.createdAt || b.sentAt) - timestamp(a.createdAt || a.sentAt));
  }

  return groups;
}

function groupDailySnapshotsByClient(rows: ClientDailySnapshot[]): Map<string, ClientDailySnapshot[]> {
  const groups = new Map<string, ClientDailySnapshot[]>();
  for (const row of rows) {
    const list = groups.get(row.clientId) || [];
    list.push(row);
    groups.set(row.clientId, list);
  }

  for (const list of groups.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }

  return groups;
}

function hasDisconnectWarning(run: ClientReportRun): boolean {
  return run.warnings.some((warning) => {
    const text = typeof warning === 'string' ? warning : JSON.stringify(warning);
    return /disconnect|desconect|expired|expirad|token|integration|integracao/i.test(text);
  });
}

function readMetrics(run: ClientReportRun): { spend: number; conversions: number } {
  const payload = run.summaryPayload || {};
  const source = isRecord(payload.metrics)
    ? payload.metrics
    : isRecord(payload.totals)
      ? payload.totals
      : payload;
  return {
    spend: numberValue(source.spend),
    conversions: numberValue(source.conversions),
  };
}

function readTargetCpl(client: ClientWorkspaceSummary): number {
  const settings = client.settings?.reportTemplateSettings || {};
  return numberValue(settings.targetCpl ?? settings.targetCPL ?? settings.maxCpl ?? settings.maxCPL);
}

function severityRank(severity: PortfolioAlert['severity']): number {
  if (severity === 'critical') return 3;
  if (severity === 'warning') return 2;
  return 1;
}

function numberValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function timestamp(value: string | null): number {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function previousIsoDate(today: string): string {
  const date = new Date(`${today}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return today;
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function costPerConversion(row: ClientDailySnapshot): number {
  return row.conversions > 0 ? row.spend / row.conversions : 0;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
