export type PrymeiraAccessReason =
  | 'no_customer'
  | 'no_workspace'
  | 'no_workspace_membership'
  | 'workspace_suspended'
  | 'no_product'
  | 'inactive_product'
  | 'no_entitlement'
  | 'no_product_seat'
  | 'seats_limit_reached'
  | 'expired'
  | 'blocked'
  | 'cancelled'
  | 'trial_expired'
  | 'active_entitlement'
  | 'internal_access';

export interface PrymeiraAccessDecision {
  allowed: boolean;
  workspace_id?: string | null;
  workspace_role?: string | null;
  product_key?: string | null;
  product_role?: string | null;
  status?: string | null;
  plan?: string | null;
  limits?: Record<string, unknown> | null;
  reason: PrymeiraAccessReason;
}

export interface PrymeiraWorkspaceContext {
  clerkUserId: string;
  email: string;
  name: string | null;
  workspaceId: string;
  workspaceRole: string;
  productKey: string;
  productRole: string | null;
  plan: string | null;
  limits: Record<string, unknown>;
}

interface CheckPrymeiraProductAccessInput {
  accountApiUrl: string;
  productKey: string;
  token: string;
  fetcher?: typeof fetch;
}

interface PrymeiraUserInput {
  clerkUserId: string;
  email: string;
  name: string | null;
}

interface BuildAccessDeniedUrlInput {
  hubUrl: string;
  productKey: string;
  reason: PrymeiraAccessReason;
  returnUrl: string;
}

type PrymeiraAccountError = Error & {
  statusCode?: number;
  cause?: unknown;
};

const ACCESS_REASONS = new Set<PrymeiraAccessReason>([
  'no_customer',
  'no_workspace',
  'no_workspace_membership',
  'workspace_suspended',
  'no_product',
  'inactive_product',
  'no_entitlement',
  'no_product_seat',
  'seats_limit_reached',
  'expired',
  'blocked',
  'cancelled',
  'trial_expired',
  'active_entitlement',
  'internal_access',
]);

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAccessReason(value: unknown): value is PrymeiraAccessReason {
  return typeof value === 'string' && ACCESS_REASONS.has(value as PrymeiraAccessReason);
}

function optionalStringOrNull(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

function parseAccessDecision(value: unknown): PrymeiraAccessDecision {
  if (!isObject(value)) {
    throw new Error('Invalid Prymeira Account access response');
  }

  if (typeof value.allowed !== 'boolean' || !isAccessReason(value.reason)) {
    throw new Error('Invalid Prymeira Account access response');
  }

  if (
    !optionalStringOrNull(value.workspace_id)
    || !optionalStringOrNull(value.workspace_role)
    || !optionalStringOrNull(value.product_key)
    || !optionalStringOrNull(value.product_role)
    || !optionalStringOrNull(value.status)
    || !optionalStringOrNull(value.plan)
  ) {
    throw new Error('Invalid Prymeira Account access response');
  }

  if (value.limits !== undefined && value.limits !== null && !isObject(value.limits)) {
    throw new Error('Invalid Prymeira Account access response');
  }

  return value as unknown as PrymeiraAccessDecision;
}

export async function checkPrymeiraProductAccess({
  accountApiUrl,
  productKey,
  token,
  fetcher = fetch,
}: CheckPrymeiraProductAccessInput): Promise<PrymeiraAccessDecision> {
  const baseUrl = trimTrailingSlash(accountApiUrl);
  const params = new URLSearchParams({ product_key: productKey });
  const response = await fetcher(`${baseUrl}/access-check?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = new Error(`Prymeira Account access check failed with status ${response.status}`) as PrymeiraAccountError;
    error.statusCode = response.status;
    throw error;
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    const parseError = new Error('Invalid Prymeira Account access response JSON') as Error & {
      cause?: unknown;
    };
    parseError.cause = error;
    throw parseError;
  }

  return parseAccessDecision(json);
}

export function mapAccessDecisionToContext(
  decision: PrymeiraAccessDecision,
  user: PrymeiraUserInput,
): PrymeiraWorkspaceContext {
  if (!decision.allowed || !decision.workspace_id || !decision.workspace_role || !decision.product_key) {
    throw new Error('Prymeira Account access decision does not include allowed workspace context');
  }

  return {
    clerkUserId: user.clerkUserId,
    email: user.email,
    name: user.name,
    workspaceId: decision.workspace_id,
    workspaceRole: decision.workspace_role,
    productKey: decision.product_key,
    productRole: decision.product_role ?? null,
    plan: decision.plan ?? null,
    limits: decision.limits ?? {},
  };
}

export function buildAccessDeniedUrl({
  hubUrl,
  productKey,
  reason,
  returnUrl,
}: BuildAccessDeniedUrlInput): string {
  const url = new URL('/acesso-negado', hubUrl);
  url.searchParams.set('product_key', productKey);
  url.searchParams.set('reason', reason);
  url.searchParams.set('return_url', returnUrl);
  return url.toString();
}
