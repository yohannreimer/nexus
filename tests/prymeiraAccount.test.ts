import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAccessDeniedUrl,
  checkPrymeiraProductAccess,
  mapAccessDecisionToContext,
} from '../services/prymeiraAccount';

test('checkPrymeiraProductAccess calls Account API with product_key=ads', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({
      allowed: true,
      workspace_id: 'workspace-1',
      workspace_role: 'owner',
      product_key: 'ads',
      product_role: 'admin',
      status: 'active',
      plan: 'internal',
      limits: { clients: 50 },
      reason: 'active_entitlement',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await checkPrymeiraProductAccess({
    accountApiUrl: 'https://account.test/',
    productKey: 'ads',
    token: 'token-123',
    fetcher,
  });

  assert.equal(calls[0].url, 'https://account.test/access-check?product_key=ads');
  assert.deepEqual(calls[0].init?.headers, { Authorization: 'Bearer token-123' });
  assert.equal(result.workspace_id, 'workspace-1');
});

test('mapAccessDecisionToContext requires allowed workspace access', () => {
  const context = mapAccessDecisionToContext({
    allowed: true,
    workspace_id: 'workspace-1',
    workspace_role: 'owner',
    product_key: 'ads',
    product_role: 'admin',
    status: 'active',
    plan: 'internal',
    limits: { clients: 50 },
    reason: 'active_entitlement',
  }, {
    clerkUserId: 'clerk-1',
    email: 'user@prymeira.test',
    name: 'User Test',
  });

  assert.deepEqual(context, {
    clerkUserId: 'clerk-1',
    email: 'user@prymeira.test',
    name: 'User Test',
    workspaceId: 'workspace-1',
    workspaceRole: 'owner',
    productKey: 'ads',
    productRole: 'admin',
    plan: 'internal',
    limits: { clients: 50 },
  });
});

test('buildAccessDeniedUrl preserves product, reason, and return URL', () => {
  const url = buildAccessDeniedUrl({
    hubUrl: 'https://app.prymeiradigital.com.br/',
    productKey: 'ads',
    reason: 'no_entitlement',
    returnUrl: 'https://ads.prymeiradigital.com.br/clientes',
  });

  assert.equal(
    url,
    'https://app.prymeiradigital.com.br/acesso-negado?product_key=ads&reason=no_entitlement&return_url=https%3A%2F%2Fads.prymeiradigital.com.br%2Fclientes'
  );
});
