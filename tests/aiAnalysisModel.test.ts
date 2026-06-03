import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAiAnalysisPayload } from '../services/aiAnalysisModel';

test('normalizeAiAnalysisPayload turns malformed provider JSON into a safe failed analysis', () => {
  const result = normalizeAiAnalysisPayload('not-json');

  assert.equal(result.summary, 'Nao foi possivel gerar uma analise confiavel para este periodo.');
  assert.deepEqual(result.positives, []);
  assert.deepEqual(result.attentionPoints, []);
  assert.deepEqual(result.internalAlerts, []);
  assert.deepEqual(result.recommendations, []);
  assert.deepEqual(result.talkingPoints, []);
  assert.equal(result.riskLevel, 'normal');
  assert.equal(result.opportunityLevel, 'normal');
});

test('normalizeAiAnalysisPayload marks every recommendation as agency-facing', () => {
  const result = normalizeAiAnalysisPayload({
    summary: 'Cliente com melhoria de conversao.',
    recommendations: [
      { action: 'redistribuir verba', audience: 'client' },
      'revisar termos de busca',
    ],
  });

  assert.equal(result.recommendations.length, 2);
  assert.equal(result.recommendations[0].audience, 'agency');
  assert.equal(result.recommendations[1].audience, 'agency');
  assert.equal(result.recommendations[1].text, 'revisar termos de busca');
});

test('normalizeAiAnalysisPayload keeps talking points separate from automatic client message', () => {
  const result = normalizeAiAnalysisPayload({
    summary: 'Resumo interno.',
    automaticClientMessage: 'Nao deve existir no objeto normalizado.',
    talkingPoints: ['Explique a queda de CTR sem assustar o cliente.'],
  });

  assert.equal('automaticClientMessage' in result, false);
  assert.deepEqual(result.talkingPoints, ['Explique a queda de CTR sem assustar o cliente.']);
});

test('normalizeAiAnalysisPayload clamps invalid risk and opportunity levels', () => {
  const result = normalizeAiAnalysisPayload({
    summary: 'Resumo.',
    riskLevel: 'panic',
    opportunityLevel: 'huge',
  });

  assert.equal(result.riskLevel, 'normal');
  assert.equal(result.opportunityLevel, 'normal');
});

test('normalizeAiAnalysisPayload accepts only supported risk and opportunity levels', () => {
  assert.equal(normalizeAiAnalysisPayload({ riskLevel: 'low', opportunityLevel: 'low' }).riskLevel, 'low');
  assert.equal(normalizeAiAnalysisPayload({ riskLevel: 'attention', opportunityLevel: 'high' }).riskLevel, 'attention');
  assert.equal(normalizeAiAnalysisPayload({ riskLevel: 'critical', opportunityLevel: 'normal' }).opportunityLevel, 'normal');
});
