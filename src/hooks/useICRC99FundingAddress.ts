import { useQuery } from '@tanstack/react-query';
import { Principal } from '@dfinity/principal';
import { useAnonymousActor } from './useActor';
import type { _SERVICE as OrchestratorService } from '../declarations/orchestrator/orchestrator.did';
import { idlFactory as orchestratorIdlFactory } from '../declarations/orchestrator/orchestrator.did.js';
import type { Network } from '../declarations/orchestrator/orchestrator.did';

export interface UseICRC99FundingAddressOptions {
  /** Enable/disable the query */
  enabled?: boolean;
  /** Refetch interval in milliseconds */
  refetchInterval?: number;
}

/**
 * Hook to get the ICRC-99 funding address for a canister on a specific network
 * Uses anonymous actor for unauthenticated access
 */
export function useICRC99FundingAddress(
  canisterId: Principal | null,
  network: Network | null,
  options: UseICRC99FundingAddressOptions = {}
) {
  const { enabled = true, refetchInterval } = options;
  
  const orchestratorCanisterId = process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai';
  const unauthenticatedOrchActor = useAnonymousActor<OrchestratorService>(
    orchestratorCanisterId,
    orchestratorIdlFactory
  );

  return useQuery({
    queryKey: [
      'icrc99-funding-address',
      canisterId?.toString(),
      network ? JSON.stringify(network, (_key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ) : null
    ],
    queryFn: async (): Promise<string | null> => {
      if (!unauthenticatedOrchActor || !canisterId || !network) {
        throw new Error('Missing required parameters for funding address query');
      }

      console.log('🔍 Getting ICRC-99 funding address...', {
        canisterId: canisterId.toString(),
        network,
      });

      const result = await unauthenticatedOrchActor.get_icrc99_address(canisterId, network);
      
      // Result is [] | [string] - extract the string if present
      const address = Array.isArray(result) && result.length > 0 ? result[0] : null;
      
      console.log('💰 ICRC-99 funding address result:', { address });
      
      return address || null;
    },
    enabled: enabled && !!unauthenticatedOrchActor && !!canisterId && !!network,
    refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes - funding addresses don't change often
    retry: 2,
  });
}

/**
 * Hook to get the ICRC-99 funding address for a contract pointer on a specific network
 * First gets the ckNFT canister for the contract, then gets the funding address
 */
export function useICRC99FundingAddressForContract(
  sourceContractPointer: { network: Network; contract: string } | null,
  targetNetwork: Network | null,
  options: UseICRC99FundingAddressOptions = {}
) {
  const { enabled = true } = options;
  
  const orchestratorCanisterId = process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai';
  const unauthenticatedOrchActor = useAnonymousActor<OrchestratorService>(
    orchestratorCanisterId,
    orchestratorIdlFactory
  );

  return useQuery({
    queryKey: [
      'icrc99-funding-address-for-contract',
      sourceContractPointer ? JSON.stringify(sourceContractPointer, (_key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ) : null,
      targetNetwork ? JSON.stringify(targetNetwork, (_key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ) : null
    ],
    queryFn: async (): Promise<string | null> => {
      if (!unauthenticatedOrchActor || !sourceContractPointer || !targetNetwork) {
        throw new Error('Missing required parameters for contract funding address query');
      }

      console.log('🔍 Getting ckNFT canister for funding address...', {
        sourceContract: sourceContractPointer.contract,
        sourceNetwork: sourceContractPointer.network,
        targetNetwork,
      });

      // First, get the ckNFT canister that represents this source contract
      const ckNFTCanisters = await unauthenticatedOrchActor.get_ck_nft_canister([sourceContractPointer]);
      const ckNFTCanisterId = ckNFTCanisters[0];
      
      if (!ckNFTCanisterId) {
        console.warn('⚠️ No ckNFT canister found for source contract, cannot get funding address');
        return null;
      }

      console.log('✅ Found ckNFT canister for funding address:', ckNFTCanisterId.toString());
      
      // Now get the funding address from this ckNFT canister
      const result = await unauthenticatedOrchActor.get_icrc99_address(ckNFTCanisterId, targetNetwork);
      
      // Result is [] | [string] - extract the string if present
      const address = Array.isArray(result) && result.length > 0 ? result[0] : null;
      
      console.log('💰 ICRC-99 funding address from ckNFT canister:', { address });
      
      return address || null;
    },
    enabled: enabled && !!unauthenticatedOrchActor && !!sourceContractPointer && !!targetNetwork,
    staleTime: 5 * 60 * 1000, // 5 minutes - funding addresses don't change often
    retry: 2,
  });
}
