import {
  checkPrymeiraProductAccess,
  type PrymeiraAccessDecision,
  type PrymeiraAccessReason,
} from '../services/prymeiraAccount';

export interface ServerWorkspaceContext {
  token: string;
  workspaceId: string;
  workspaceRole: string;
  productRole: string | null;
  plan: string | null;
  limits: Record<string, unknown>;
}

interface ResolvePrymeiraWorkspaceInput {
  authorization?: string;
  accountApiUrl: string;
  productKey: string;
  fetcher?: typeof fetch;
}

type AccessError = Error & {
  statusCode?: number;
  reason?: PrymeiraAccessReason;
  cause?: unknown;
};

function createAccessError(
  message: string,
  statusCode: number,
  reason?: PrymeiraAccessReason,
  cause?: unknown,
): AccessError {
  const error = new Error(message) as AccessError;
  error.statusCode = statusCode;

  if (reason) {
    error.reason = reason;
  }

  if (cause !== undefined) {
    error.cause = cause;
  }

  return error;
}

function parseBearerToken(authorization?: string): string {
  const [scheme, token, ...extra] = authorization?.trim().split(/\s+/) ?? [];

  if (scheme?.toLowerCase() !== 'bearer' || !token || extra.length > 0) {
    throw createAccessError('Bearer token is required', 401);
  }

  return token;
}

export async function resolvePrymeiraWorkspaceFromAuthorization({
  authorization,
  accountApiUrl,
  productKey,
  fetcher,
}: ResolvePrymeiraWorkspaceInput): Promise<ServerWorkspaceContext> {
  const token = parseBearerToken(authorization);
  let decision: PrymeiraAccessDecision;

  try {
    decision = await checkPrymeiraProductAccess({
      accountApiUrl,
      productKey,
      token,
      fetcher,
    });
  } catch (error) {
    const upstreamStatusCode = typeof (error as AccessError)?.statusCode === 'number'
      ? (error as AccessError).statusCode
      : undefined;

    if (upstreamStatusCode === 401 || upstreamStatusCode === 403) {
      throw createAccessError(
        error instanceof Error ? error.message : 'Prymeira Account access denied',
        upstreamStatusCode,
        undefined,
        error,
      );
    }

    throw createAccessError('Prymeira Account access check unavailable', 502, undefined, error);
  }

  if (!decision.allowed) {
    throw createAccessError(
      `Prymeira product access denied: ${decision.reason}`,
      403,
      decision.reason,
    );
  }

  if (!decision.workspace_id || !decision.workspace_role) {
    throw createAccessError('Prymeira access decision missing workspace_id', 403);
  }

  return {
    token,
    workspaceId: decision.workspace_id,
    workspaceRole: decision.workspace_role,
    productRole: decision.product_role ?? null,
    plan: decision.plan ?? null,
    limits: decision.limits ?? {},
  };
}
