import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDeterministicReport } from '../services/deterministicReport';

const input = {
  clientName: 'Clínica São Bento',
  periodLabel: '01/05/2026 a 15/05/2026',
  totals: {
    spend: 12345.67,
    impressions: 987654,
    clicks: 4321,
    ctr: 0.4375,
    cpc: 2.8571,
    cpm: 12.5,
    conversions: 88,
  },
  campaigns: [
    {
      id: 'low-spend',
      name: 'Topo <Marca & Oferta>',
      platform: 'meta' as const,
      accountId: 'act_1',
      spend: 1000,
      impressions: 200000,
      clicks: 750,
      ctr: 0.375,
      cpc: 1.3333,
      cpm: 5,
      conversions: 12,
    },
    {
      id: 'top-spend',
      name: 'Fundo "Conversão" & Retorno',
      platform: 'google' as const,
      accountId: 'customer_1',
      spend: 9000,
      impressions: 500000,
      clicks: 3000,
      ctr: 0.6,
      cpc: 3,
      cpm: 18,
      conversions: 70,
    },
  ],
  portalLink: 'https://portal.example.com/relatorios/123',
  agencyName: 'Nexus AI',
};

test('buildDeterministicReport includes client, period and core metrics', () => {
  const report = buildDeterministicReport(input);

  assert.match(report.whatsappMessage, /Clínica São Bento/);
  assert.match(report.whatsappMessage, /01\/05\/2026 a 15\/05\/2026/);
  assert.match(report.whatsappMessage, /Investimento: \*R\$ 12\.345,67\*/);
  assert.match(report.whatsappMessage, /Impressões: 987\.654/);
  assert.match(report.whatsappMessage, /Cliques: 4\.321/);
  assert.match(report.whatsappMessage, /CTR: 0,44%/);
  assert.match(report.whatsappMessage, /CPC: R\$ 2,86/);
  assert.match(report.whatsappMessage, /Conversões: 88/);
});

test('buildDeterministicReport uses stable Brazilian formatting', () => {
  const report = buildDeterministicReport(input);

  assert.match(report.html, /R\$ 12\.345,67/);
  assert.match(report.html, /987\.654/);
  assert.match(report.html, /4\.321/);
  assert.match(report.html, /0,44%/);
  assert.match(report.html, /R\$ 2,86/);
  assert.match(report.html, /R\$ 12,50/);
});

test('buildDeterministicReport sorts campaigns by spend', () => {
  const report = buildDeterministicReport(input);

  assert.deepEqual(
    report.summaryPayload.topCampaigns.map((campaign) => campaign.id),
    ['top-spend', 'low-spend'],
  );
  assert.ok(
    report.html.indexOf('Fundo &quot;Conversão&quot; &amp; Retorno') <
      report.html.indexOf('Topo &lt;Marca &amp; Oferta&gt;'),
  );
});

test('buildDeterministicReport does not include agency-facing recommendation verbs', () => {
  const report = buildDeterministicReport(input);
  const clientFacingText = `${report.whatsappMessage}\n${report.html}`.toLowerCase();

  assert.doesNotMatch(clientFacingText, /\bpausar\b/);
  assert.doesNotMatch(clientFacingText, /\brealocar\b/);
  assert.doesNotMatch(clientFacingText, /\bescale\b/);
  assert.doesNotMatch(clientFacingText, /\brecomendo\b/);
});

test('buildDeterministicReport HTML contains title and escaped campaign names', () => {
  const report = buildDeterministicReport(input);

  assert.match(report.html, /<h1[^>]*>Relatório de Performance<\/h1>/);
  assert.match(report.html, /Fundo &quot;Conversão&quot; &amp; Retorno/);
  assert.match(report.html, /Topo &lt;Marca &amp; Oferta&gt;/);
  assert.doesNotMatch(report.html, /Topo <Marca & Oferta>/);
});

test('buildDeterministicReport omits whitespace-only portal link', () => {
  const report = buildDeterministicReport({
    ...input,
    portalLink: '   ',
  });

  assert.doesNotMatch(report.whatsappMessage, /Portal:/);
  assert.doesNotMatch(report.html, /Portal:/);
});
