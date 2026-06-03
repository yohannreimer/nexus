import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ClerkProvider, SignedIn, SignedOut, useAuth, useUser } from '@clerk/clerk-react';
import { PrymeiraConfigError, PrymeiraLoadingState, PrymeiraRedirectingState } from '../components/Auth/PrymeiraAccessState';
import { PrymeiraLoginPage } from '../components/Auth/PrymeiraLoginPage';
import { setNexusApiTokenProvider } from '../services/nexusApi';
import {
  buildAccessDeniedUrl,
  checkPrymeiraProductAccess,
  mapAccessDecisionToContext,
  type PrymeiraAccessDecision,
  type PrymeiraWorkspaceContext,
} from '../services/prymeiraAccount';

type PrymeiraAuthValue = {
  user: PrymeiraWorkspaceContext | null;
  decision: PrymeiraAccessDecision | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
};

type PrymeiraAccessState = {
  loading: boolean;
  user: PrymeiraWorkspaceContext | null;
  decision: PrymeiraAccessDecision | null;
  error: string | null;
  redirecting: boolean;
};

const PrymeiraAuthContext = createContext<PrymeiraAuthValue | undefined>(undefined);

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const accountApiUrl = import.meta.env.VITE_PRYMEIRA_ACCOUNT_API_URL as string | undefined;
const hubUrl =
  (import.meta.env.VITE_PRYMEIRA_HUB_URL as string | undefined) || 'https://app.prymeiradigital.com.br';
const productKey = (import.meta.env.VITE_PRYMEIRA_PRODUCT_KEY as string | undefined) || 'ads';

function isPublicPortalPath() {
  if (typeof window === 'undefined') {
    return false;
  }

  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[0] === 'portal' && Boolean(parts[1]);
}

export function PrymeiraAuthProvider({ children }: { children: ReactNode }) {
  if (isPublicPortalPath()) {
    return <>{children}</>;
  }

  if (!clerkKey) {
    return <PrymeiraConfigError message="Configure VITE_CLERK_PUBLISHABLE_KEY para habilitar o login Prymeira." />;
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <SignedOut>
        <PrymeiraLoginPage />
      </SignedOut>
      <SignedIn>
        <PrymeiraAccessGate>{children}</PrymeiraAccessGate>
      </SignedIn>
    </ClerkProvider>
  );
}

function PrymeiraAccessGate({ children }: { children: ReactNode }) {
  const { getToken, signOut } = useAuth();
  const { user: clerkUser, isLoaded } = useUser();
  const clerkUserId = clerkUser?.id;
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  const displayName = clerkUser?.fullName || clerkUser?.firstName || null;
  const [state, setState] = useState<PrymeiraAccessState>({
    loading: true,
    user: null,
    decision: null,
    error: null,
    redirecting: false,
  });

  useEffect(() => {
    setNexusApiTokenProvider(getToken);
  }, [getToken]);

  useEffect(() => {
    let active = true;

    async function verifyAccess() {
      if (!accountApiUrl) {
        setState({
          loading: false,
          user: null,
          decision: null,
          error: 'Configure VITE_PRYMEIRA_ACCOUNT_API_URL.',
          redirecting: false,
        });
        return;
      }

      if (!isLoaded || !clerkUserId) {
        return;
      }

      setState((current) => ({ ...current, loading: true, error: null, redirecting: false }));

      try {
        const token = await getToken();

        if (!token) {
          throw new Error('Sessão Clerk sem token.');
        }

        if (!email) {
          throw new Error('Perfil Clerk sem email principal.');
        }

        const decision = await checkPrymeiraProductAccess({ accountApiUrl, productKey, token });

        if (!active) {
          return;
        }

        if (!decision.allowed) {
          const redirectUrl = buildAccessDeniedUrl({
            hubUrl,
            productKey,
            reason: decision.reason,
            returnUrl: window.location.href,
          });

          setState({ loading: false, user: null, decision, error: null, redirecting: true });
          window.location.assign(redirectUrl);
          return;
        }

        const user = mapAccessDecisionToContext(decision, {
          clerkUserId,
          email,
          name: displayName,
        });

        setState({ loading: false, user, decision, error: null, redirecting: false });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          loading: false,
          user: null,
          decision: null,
          error: error instanceof Error ? error.message : String(error),
          redirecting: false,
        });
      }
    }

    verifyAccess();

    return () => {
      active = false;
    };
  }, [clerkUserId, displayName, email, getToken, isLoaded]);

  const value = useMemo<PrymeiraAuthValue>(
    () => ({
      user: state.user,
      decision: state.decision,
      loading: state.loading,
      isAuthenticated: Boolean(state.user),
      signOut: async () => {
        await signOut();
      },
    }),
    [signOut, state.decision, state.loading, state.user],
  );

  if (state.redirecting) {
    return <PrymeiraRedirectingState />;
  }

  if (state.loading) {
    return <PrymeiraLoadingState />;
  }

  if (state.error) {
    return <PrymeiraConfigError message={state.error} />;
  }

  if (!state.user) {
    return <PrymeiraConfigError message="A Prymeira Account não retornou um workspace válido para Ads Vision." />;
  }

  return <PrymeiraAuthContext.Provider value={value}>{children}</PrymeiraAuthContext.Provider>;
}

export function usePrymeiraAuth() {
  const context = useContext(PrymeiraAuthContext);

  if (!context) {
    throw new Error('usePrymeiraAuth deve ser usado dentro de PrymeiraAuthProvider');
  }

  return context;
}
