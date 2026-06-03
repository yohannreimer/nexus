import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePrymeiraWorkspaceFromAuthorization } from '../server/prymeiraAccess';

type AccessError = Error & {
  statusCode?: number;
  reason?: string;
};

function assertAccessError(error: unknown, statusCode: number, reason?: string): boolean {
  assert.ok(error instanceof Error);
  const accessError = error as AccessError;
  assert.equal(accessError.statusCode, statusCode);

  if (reason) {
    assert.equal(accessError.reason, reason);
  }

  return true;
}

test('resolvePrymeiraWorkspaceFromAuthorization rejects missing bearer token', async () => {
  await assert.rejects(
    () => resolvePrymeiraWorkspaceFromAuthorization({
      authorization: undefined,
      accountApiUrl: 'https://account.test',
      productKey: 'ads',
      fetcher: fetch,
    }),
    /Bearer token is required/
  );
});

test('resolvePrymeiraWorkspaceFromAuthorization returns workspace from Account API', async () => {
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({
    allowed: true,
    workspace_id: 'workspace-1',
    workspace_role: 'owner',
    product_key: 'ads',
    product_role: 'admin',
    status: 'active',
    plan: 'internal',
    limits: {},
    reason: 'active_entitlement',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const context = await resolvePrymeiraWorkspaceFromAuthorization({
    authorization: 'Bearer token-123',
    accountApiUrl: 'https://account.test',
    productKey: 'ads',
    fetcher,
  });

  assert.equal(context.workspaceId, 'workspace-1');
  assert.equal(context.token, 'token-123');
});

test('resolvePrymeiraWorkspaceFromAuthorization accepts lowercase bearer scheme', async () => {
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({
    allowed: true,
    workspace_id: 'workspace-1',
    workspace_role: 'owner',
    product_key: 'ads',
    product_role: 'admin',
    status: 'active',
    plan: 'internal',
    limits: {},
    reason: 'active_entitlement',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const context = await resolvePrymeiraWorkspaceFromAuthorization({
    authorization: 'bearer token-123',
    accountApiUrl: 'https://account.test',
    productKey: 'ads',
    fetcher,
  });

  assert.equal(context.workspaceId, 'workspace-1');
  assert.equal(context.token, 'token-123');
});

test('resolvePrymeiraWorkspaceFromAuthorization rejects denied decisions with reason', async () => {
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({
    allowed: false,
    workspace_id: 'workspace-1',
    workspace_role: 'owner',
    product_key: 'ads',
    product_role: null,
    status: 'inactive',
    plan: null,
    limits: {},
    reason: 'no_entitlement',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  await assert.rejects(
    () => resolvePrymeiraWorkspaceFromAuthorization({
      authorization: 'Bearer token-123',
      accountApiUrl: 'https://account.test',
      productKey: 'ads',
      fetcher,
    }),
    (error) => assertAccessError(error, 403, 'no_entitlement'),
  );
});

test('resolvePrymeiraWorkspaceFromAuthorization rejects missing workspace context', async () => {
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({
    allowed: true,
    workspace_id: null,
    workspace_role: null,
    product_key: 'ads',
    product_role: 'admin',
    status: 'active',
    plan: 'internal',
    limits: {},
    reason: 'active_entitlement',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  await assert.rejects(
    () => resolvePrymeiraWorkspaceFromAuthorization({
      authorization: 'Bearer token-123',
      accountApiUrl: 'https://account.test',
      productKey: 'ads',
      fetcher,
    }),
    (error) => assertAccessError(error, 403),
  );
});

test('resolvePrymeiraWorkspaceFromAuthorization maps upstream Account API failures to 502', async () => {
  const fetcher: typeof fetch = async () => new Response('unavailable', { status: 500 });

  await assert.rejects(
    () => resolvePrymeiraWorkspaceFromAuthorization({
      authorization: 'Bearer token-123',
      accountApiUrl: 'https://account.test',
      productKey: 'ads',
      fetcher,
    }),
    (error) => assertAccessError(error, 502),
  );
});

test('resolvePrymeiraWorkspaceFromAuthorization preserves upstream 401 responses', async () => {
  const fetcher: typeof fetch = async () => new Response('unauthorized', { status: 401 });

  await assert.rejects(
    () => resolvePrymeiraWorkspaceFromAuthorization({
      authorization: 'Bearer token-123',
      accountApiUrl: 'https://account.test',
      productKey: 'ads',
      fetcher,
    }),
    (error) => assertAccessError(error, 401),
  );
});

test('resolvePrymeiraWorkspaceFromAuthorization preserves upstream 403 responses', async () => {
  const fetcher: typeof fetch = async () => new Response('forbidden', { status: 403 });

  await assert.rejects(
    () => resolvePrymeiraWorkspaceFromAuthorization({
      authorization: 'Bearer token-123',
      accountApiUrl: 'https://account.test',
      productKey: 'ads',
      fetcher,
    }),
    (error) => assertAccessError(error, 403),
  );
});
