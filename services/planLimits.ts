import type { NexusPlan, NexusPlanLimits } from './clientWorkspaceTypes';

const PLAN_LIMITS: Record<NexusPlan, NexusPlanLimits> = {
  starter: {
    maxClients: 5,
    portalEnabled: false,
    aiEnabled: false,
    reportAutomationEnabled: true,
    whiteLabelEnabled: false,
  },
  pro: {
    maxClients: 25,
    portalEnabled: true,
    aiEnabled: true,
    reportAutomationEnabled: true,
    whiteLabelEnabled: false,
  },
  agency: {
    maxClients: null,
    portalEnabled: true,
    aiEnabled: true,
    reportAutomationEnabled: true,
    whiteLabelEnabled: true,
  },
};

export function getPlanLimits(plan: NexusPlan): NexusPlanLimits {
  return { ...PLAN_LIMITS[plan] };
}

export type { NexusPlan, NexusPlanLimits } from './clientWorkspaceTypes';
