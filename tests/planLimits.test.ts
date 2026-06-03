import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlanLimits } from '../services/planLimits';

test('starter plan has a small client cap', () => {
  assert.equal(getPlanLimits('starter').maxClients, 5);
});

test('pro plan has a larger client cap', () => {
  assert.equal(getPlanLimits('pro').maxClients, 25);
});

test('agency plan is unlimited', () => {
  assert.equal(getPlanLimits('agency').maxClients, null);
});

test('portal is enabled outside starter', () => {
  assert.equal(getPlanLimits('starter').portalEnabled, false);
  assert.equal(getPlanLimits('pro').portalEnabled, true);
  assert.equal(getPlanLimits('agency').portalEnabled, true);
});

test('AI is enabled for pro and agency plans', () => {
  assert.equal(getPlanLimits('starter').aiEnabled, false);
  assert.equal(getPlanLimits('pro').aiEnabled, true);
  assert.equal(getPlanLimits('agency').aiEnabled, true);
});

test('report automation is enabled for every paid plan', () => {
  assert.equal(getPlanLimits('starter').reportAutomationEnabled, true);
  assert.equal(getPlanLimits('pro').reportAutomationEnabled, true);
  assert.equal(getPlanLimits('agency').reportAutomationEnabled, true);
});
