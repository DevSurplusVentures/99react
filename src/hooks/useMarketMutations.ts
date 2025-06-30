import { Principal } from '@dfinity/principal';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthenticatedActor, useAnonymousActor } from './useActor';
import { useIsAuthenticated } from './useAuth';
import { idlFactory as marketIdl } from '../declarations/market/index';
import type {
  ICRC8IntentMarketplaceCanister,
  ManageMarketRequest,
  ManageMarketResponse,
  Account,
  TransferResult,
} from '../declarations/market/market.did';

/** Mutation hooks for ICRC-8 Market Intents actions */

// MANAGE MARKET (list, end, execute, withdraw, etc)
export function useManageMarket(canisterId: string) {
  console.log("useManageMarket called with canisterId:", canisterId);
  const isAuthenticated = useIsAuthenticated();
  const actor = useAuthenticatedActor<ICRC8IntentMarketplaceCanister>(canisterId, marketIdl as any);
  
  // Accepts: ManageMarketRequest[]
  // Wrap each request as [req] to match candid tuple

  const mutationFn = async (args: ManageMarketRequest[]): Promise<([] | [ManageMarketResponse])[]> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to manage market');
    }
    console.log("Managing market with args:", args);
    // Map each request to the optional format: [req] (not [[req]])
    const wrappedArgs: ([] | [ManageMarketRequest])[] = args.map((req) => [req]);
    console.log("Wrapped args for actor call:", wrappedArgs);
    console.log("First wrapped arg:", wrappedArgs[0]);
    return actor.icrc8_manage_market(wrappedArgs);
  };
  
  console.log("useManageMarket mutation function created");
  return useMutation({
    mutationFn,
  });
}

// MINT FAKE TOKENS (test utility)
export function useMintFakeTokens(canisterId: string) {
  const isAuthenticated = useIsAuthenticated();
  const actor = useAuthenticatedActor<ICRC8IntentMarketplaceCanister>(canisterId, marketIdl as any);
  
  // Accepts: [Principal, Account, bigint]
  const mutationFn = async (args: [string | Principal, Account, bigint]): Promise<TransferResult> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to mint fake tokens');
    }
    const [principal, account, amount] = args;
    // Convert string to Principal if needed
    const principalObj = typeof principal === 'string' ? Principal.fromText(principal) : principal;
    return actor.mint_fake_tokens(principalObj, account, amount);
  };
  
  return useMutation({
    mutationFn,
  });
}

/** Query hooks for ICRC-8 Market Intents */

// VALIDATE INTENTS (query)
export function useValidateIntents(canisterId: string, intentIds: bigint[], features: Array<Array<any>>) {
  const actor = useAnonymousActor<ICRC8IntentMarketplaceCanister>(canisterId, marketIdl as any);
  return useQuery({
    queryKey: ['validateIntents', canisterId, intentIds, features],
    queryFn: () => actor.icrc8_validate_intents(intentIds, features),
  });
}
