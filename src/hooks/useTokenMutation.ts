import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedActor } from './useActor';
import { useIsAuthenticated } from './useAuth';
import type { ActorSubclass } from '@dfinity/agent';
import type { _SERVICE as ICRC1TokenCanister, ApproveArgs, ApproveResponse } from '../backend/token/service.did.d.js';
import { idlFactory as tokenIdl } from '../backend/token/service.did.js';

/**
 * useApproveToken - Approve a spender for a fungible token (ICRC-1/2)
 * Requires authentication as this is a mutation operation
 * @param canisterId - The token canister ID
 */
export function useApproveToken(canisterId: string) {
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const actor = useAuthenticatedActor<ActorSubclass<ICRC1TokenCanister>>(canisterId, tokenIdl as any);
  
  const mutationFn = async (args: ApproveArgs): Promise<ApproveResponse> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to approve tokens');
    }
    console.log("Approving token with args:", args);
    return actor.icrc2_approve(args);
  };
  
  return useMutation({
    mutationFn,
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['fungible-token', canisterId] });
    },
  });
}
