import { Actor } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import { useAgent, useAnonAgent, useAuthenticatedAgent } from '../provider/AgentProvider';
import { useIsAuthenticated } from './useAuth';

/**
 * Hook to retrieve a typed actor for any canister ID and IDL at runtime.
 * Uses authenticated agent if available, falls back to anonymous agent for queries.
 */
export function useActor<T>(
  canisterId: string,
  idlFactory: IDL.InterfaceFactory
): T {
  const agent = useAgent();
  
  return Actor.createActor<T>(idlFactory, {
    agent,
    canisterId,
  });
}

/**
 * Hook to retrieve a typed actor for anonymous queries.
 */
export function useAnonymousActor<T>(
  canisterId: string,
  idlFactory: IDL.InterfaceFactory
): T {
  const agent = useAnonAgent();
  
  return Actor.createActor<T>(idlFactory, {
    agent,
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
 * Hook to retrieve a typed actor that safely handles unauthenticated cases.
 * Returns null if user is not authenticated.
 */
export function useSafeAuthenticatedActor<T>(
  canisterId: string,
  idlFactory: IDL.InterfaceFactory
): T | null {
  const isAuthenticated = useIsAuthenticated();
  const agent = isAuthenticated ? useAuthenticatedAgent() : null;
  
  if (!agent) {
    return null;
  }
  
  return Actor.createActor<T>(idlFactory, {
    agent,
    canisterId,
  });
}