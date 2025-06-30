import { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { HttpAgent, AnonymousIdentity, Agent } from '@dfinity/agent';
import { useAgent as useIdentityKitAgent } from '@nfid/identitykit/react';
import { initActorManager } from './ActorManager';

export type AgentNetwork = 'ic' | 'testnet' | 'local';

export interface AgentProviderProps {
  network?: AgentNetwork;
  children: ReactNode;
}

export interface AgentContextValue {
  agent: Agent | undefined; // Authenticated agent from IdentityKit (undefined if not connected)
  anonAgent: HttpAgent; // Always anonymous
  isLocal: boolean;
  network: AgentNetwork;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({
  network: networkProp,
  children,
}: AgentProviderProps) {
  // Detect local vs. mainnet
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const network: AgentNetwork = networkProp || (isLocal ? 'local' : 'ic');
  const host = network === 'ic' ? 'https://ic0.app' : network === 'testnet' ? 'https://testnet.dfinity.network' : 'http://localhost:8080';

  // Get authenticated agent from IdentityKit (undefined if not connected)
  const agent = useIdentityKitAgent({ host });

  // Memoize anonymous agent
  const anonAgent = useMemo(() => new HttpAgent({ host, identity: new AnonymousIdentity() }), [host]);

  // Fetch root key for local
  useEffect(() => {
    if (isLocal) {
      if (agent) {
        agent.fetchRootKey().catch(() => {});
      }
      anonAgent.fetchRootKey().catch(() => {});
    }
  }, [isLocal, agent, anonAgent]);

  // Initialize the ActorManager with the authenticated agent (or anon if not available)
  useEffect(() => {
    initActorManager(agent || anonAgent);
  }, [agent, anonAgent]);

  const value: AgentContextValue = { agent, anonAgent, isLocal, network };
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgentContext() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgentContext must be used under <AgentProvider>');
  return ctx;
}

// For convenience, keep a default useAgent hook for authenticated agent
export function useAgent() {
  return useAgentContext().agent;
}

export function useAnonAgent() {
  return useAgentContext().anonAgent;
}

// Hook to get agent for mutations (throws if not authenticated)
export function useAuthenticatedAgent() {
  const { agent } = useAgentContext();
  if (!agent) {
    throw new Error('User must be authenticated to perform this action');
  }
  return agent;
}