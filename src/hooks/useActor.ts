import { Actor } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import { useAgent, useAnonAgent, useAuthenticatedAgent } from '../provider/AgentProvider';

/**
 * Hook to retrieve a typed actor for any canister ID and IDL at runtime.
 * Uses authenticated agent if available, falls back to anonymous agent for queries.
 */
export function useActor<T>(
  canisterId: string,
  idlFactory: IDL.InterfaceFactory
): T {
  const agent = useAgent();
  const anonAgent = useAnonAgent();
  
  // Use authenticated agent if available, otherwise use anonymous agent
  const selectedAgent = agent || anonAgent;
  
  return Actor.createActor<T>(idlFactory, {
    agent: selectedAgent,
    canisterId,
  });
}

/**
 * Hook to retrieve a typed actor that requires authentication.
 * Throws an error if user is not authenticated.
 */
export function useAuthenticatedActor<T>(
  canisterId: string,
  idlFactory: IDL.InterfaceFactory
): T {
  const agent = useAuthenticatedAgent();
  
  return Actor.createActor<T>(idlFactory, {
    agent,
    canisterId,
  });
}

/**
 * Hook to retrieve a typed actor that always uses anonymous agent.
 * Useful for public queries that don't require authentication.
 */
export function useAnonymousActor<T>(
  canisterId: string,
  idlFactory: IDL.InterfaceFactory
): T {
  const anonAgent = useAnonAgent();
  
  return Actor.createActor<T>(idlFactory, {
    agent: anonAgent,
    canisterId,
  });
}