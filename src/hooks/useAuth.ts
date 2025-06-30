import { useAuth as useIdentityKitAuth } from '@nfid/identitykit/react';

/**
 * Re-export IdentityKit's useAuth hook for convenience
 */
export function useAuth() {
  return useIdentityKitAuth();
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { user } = useAuth();
  return !!user;
}
