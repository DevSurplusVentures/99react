import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthenticatedActor, useAnonymousActor } from './useActor';
import { useIsAuthenticated, useAuth } from './useAuth';
import { useFungibleToken } from './useFungibleToken';
import { useAuthenticatedAgent } from '../provider/AgentProvider';
import { Principal } from '@dfinity/principal';
import { HttpAgent } from '@dfinity/agent';
import type { ContractPointer, Network, Account } from '../declarations/orchestrator/orchestrator.did';
import { idlFactory as orchestratorIdlFactory } from '../declarations/orchestrator/orchestrator.did.js';

// Import the generated orchestrator types directly
import type { _SERVICE as OrchestratorService, MintRequest, MintResult, GetCallResult, CastRequest, ApprovalAddressRequest } from '../declarations/orchestrator/orchestrator.did';

// Import ckNFT service types for cast cost calculations
import type { _SERVICE as CkNFTService, CastCostRequest, CastRequest as CkNFTCastRequest, CastResult as CkNFTCastResult } from '../declarations/ckNFT/ckNFT.did';
import { idlFactory as ckNFTIdlFactory } from '../declarations/ckNFT/ckNFT.did.js';

// Remove the custom type definitions since we're using the generated ones

// Cycles Ledger canister ID
const CYCLES_LEDGER_CANISTER_ID = process.env.CYCLES_LEDGER_CANISTER_ID || 'um5iw-rqaaa-aaaaq-qaaba-cai';

// Remove the custom type definitions since we're using the generated ones

export interface RemoteNFTPointer {
  tokenId: bigint;
  contractPointer: ContractPointer;
}

// For now, keep the simpler interface for external use but convert internally
export type SimpleCanisterDefaults = {
  logo?: string;
  name?: string;
  description?: string;
  symbol?: string;
};

/** 
 * Comprehensive hook for ICRC-99 operations following the existing useNFTMutations pattern
 * Provides mutations for cross-chain NFT bridging between EVM chains and Internet Computer
 */
export function use99Mutations(orchestratorCanisterId: string) {
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const { user } = useAuth();
  const authenticatedAgent = useAuthenticatedAgent();
  
  // Always call hook, but only use the actor if authenticated
  const authenticatedActor = useAuthenticatedActor<OrchestratorService>(
    orchestratorCanisterId,
    orchestratorIdlFactory
  );
  
  // Get anonymous actor for query calls that don't need authentication
  const anonymousActor = useAnonymousActor<OrchestratorService>(
    orchestratorCanisterId,
    orchestratorIdlFactory
  );
  
  // Use actor directly since we now require authentication on the bridge route
  const actor = authenticatedActor;
  
  // Set up the fungible token hook for cycles ledger
  const cyclesToken = useFungibleToken(CYCLES_LEDGER_CANISTER_ID);
  const { useApprove: useCyclesApprove } = cyclesToken;
  
  // Get cycles approval mutation
  const cyclesApproveMutation = useCyclesApprove();

  // EVM → IC OPERATIONS

  /**
   * Mint (import) an EVM NFT to the Internet Computer
   * This is the primary operation for bringing EVM NFTs to IC
   */
  const mintFromEVM = useMutation({
    mutationFn: async (params: {
      request: MintRequest;
      spender?: Account;
      requiredCycles?: bigint;
      skipApproval?: boolean;
    }): Promise<MintResult> => {
      if (!isAuthenticated || !actor) {
        throw new Error('User must be authenticated to mint NFTs');
      }

      console.log('Minting NFT from EVM with params:', params);

      // Check if we need to get mint cost first
      let mintCost = params.requiredCycles;
      if (!mintCost) {
        try {
          console.log('Getting mint cost for NFT...');
          const mintCosts = await anonymousActor.get_mint_cost([params.request]);
          const mintCostResult = mintCosts[0];
          // Handle Candid optional format: [] = None, [bigint] = Some(bigint)
          if (Array.isArray(mintCostResult) && mintCostResult.length > 0) {
            mintCost = mintCostResult[0];
          } else {
            mintCost = undefined;
          }
          console.log('Mint cost:', mintCost?.toString());
        } catch (error) {
          console.warn('Failed to get mint cost, proceeding without cycles check:', error);
        }
      }

      // Check and approve cycles if needed
      if (mintCost && !params.skipApproval) {
        try {
          // Check current allowance
          const orchestratorPrincipal = Principal.fromText(orchestratorCanisterId);
          const currentUser = user;
          
          if (currentUser?.principal) {
            // Check current allowance using the cycles token hook
            let needsApproval = true;
            
            try {
              // Make a fresh allowance call directly to the cycles ledger
              console.log('Making fresh allowance call to cycles ledger...');
              
              const orchestratorPrincipal = Principal.fromText(orchestratorCanisterId);
              
              // Create a temporary allowance query to get fresh data
              const allowanceParams = {
                account: { owner: currentUser.principal, subaccount: [] },
                spender: { owner: orchestratorPrincipal, subaccount: [] }
              };
              
              console.log('Allowance check params:', allowanceParams);
              
              // Force refresh allowance queries
              await queryClient.invalidateQueries({ queryKey: ['icrc2-allowance'] });
              await queryClient.invalidateQueries({ queryKey: ['orchestrator-allowance'] });
              
              // Wait a moment for the invalidation to take effect
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Try to fetch fresh allowance by refetching the query
              const allowanceQueryKey = ['icrc2-allowance', allowanceParams];
              console.log('Refetching with query key:', allowanceQueryKey);
              
              try {
                // Trigger a fresh fetch
                const freshAllowance = await queryClient.fetchQuery({
                  queryKey: allowanceQueryKey,
                  queryFn: async () => {
                    // This should trigger the useAllowance hook's query function
                    console.log('Fetching fresh allowance from blockchain...');
                    
                    // We need to make the call directly since we can't use hooks here
                    // Create anonymous actor for cycles ledger
                    const { Actor, HttpAgent } = await import('@dfinity/agent');
                    
                    const agent = new HttpAgent({
                      host: process.env.DFX_NETWORK === 'local' ? 'http://localhost:8080' : 'https://ic0.app',
                    });
                    
                    if (process.env.DFX_NETWORK === 'local') {
                      await agent.fetchRootKey().catch(err => console.warn('Failed to fetch root key:', err));
                    }
                    
                    // ICRC-2 IDL for allowance call
                    const icrc2IdlFactory = ({ IDL }: { IDL: any }) => {
                      const Account = IDL.Record({
                        owner: IDL.Principal,
                        subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
                      });
                      
                      const Allowance = IDL.Record({
                        allowance: IDL.Nat,
                        expires_at: IDL.Opt(IDL.Nat64),
                      });
                      
                      return IDL.Service({
                        icrc2_allowance: IDL.Func(
                          [IDL.Record({ account: Account, spender: Account })],
                          [Allowance],
                          ['query']
                        ),
                      });
                    };
                    
                    const cyclesActor = Actor.createActor(icrc2IdlFactory, {
                      agent,
                      canisterId: CYCLES_LEDGER_CANISTER_ID,
                    }) as any;
                    
                    const allowanceResult = await cyclesActor.icrc2_allowance(allowanceParams);
                    console.log('Fresh allowance result from blockchain:', allowanceResult);
                    
                    return {
                      allowance: allowanceResult.allowance,
                      expires_at: allowanceResult.expires_at.length > 0 ? [allowanceResult.expires_at[0]] : [],
                    };
                  },
                  staleTime: 0, // Force fresh fetch
                });
                
                console.log('Fresh allowance data:', freshAllowance);
                
                if (freshAllowance?.allowance) {
                  console.log('Found fresh allowance:', freshAllowance.allowance.toString());
                  console.log('Required mint cost:', mintCost.toString());
                  console.log('Is sufficient?', freshAllowance.allowance >= mintCost);
                  
                  if (freshAllowance.allowance >= mintCost) {
                    const now = BigInt(Date.now() * 1000000); // Convert to nanoseconds
                    const isExpired = freshAllowance.expires_at.length > 0 && 
                                    freshAllowance.expires_at[0] < now;
                    
                    console.log('Allowance expiry check - now:', now.toString());
                    console.log('Allowance expires_at:', freshAllowance.expires_at);
                    console.log('Is expired?', isExpired);
                    
                    if (!isExpired) {
                      needsApproval = false;
                      console.log('✅ Sufficient fresh allowance exists for minting, skipping approval');
                    } else {
                      console.log('❌ Fresh allowance is expired, will re-approve');
                    }
                  } else {
                    console.log('❌ Fresh allowance insufficient, will approve more');
                  }
                } else {
                  console.log('❌ No fresh allowance found, will approve');
                }
              } catch (freshFetchError) {
                console.warn('Failed to fetch fresh allowance:', freshFetchError);
                console.log('❌ Fresh allowance fetch failed, will approve to be safe');
              }
            } catch (allowanceError) {
              console.warn('Could not check current allowance, will approve:', allowanceError);
            }

            if (needsApproval) {
              console.log('Auto-approving cycles for NFT minting...');
              
              // Auto-approve with a bit extra (110% of required) and 1 day expiry
              const approvalAmount = (mintCost * BigInt(110)) / BigInt(100);
              
              await cyclesApproveMutation.mutateAsync({
                fee: [],
                memo: [],
                from_subaccount: [],
                created_at_time: [],
                amount: approvalAmount,
                expected_allowance: [],
                expires_at: [BigInt(Date.now() * 1000000) + BigInt(24 * 60 * 60 * 1000000000)], // 1 day in nanoseconds
                spender: {
                  owner: orchestratorPrincipal,
                  subaccount: []
                }
              });
              
              console.log('Cycles approved for minting');
            }
          }
        } catch (approvalError) {
          console.error('Failed to approve cycles for minting:', approvalError);
          throw new Error(`Failed to approve cycles for minting: ${approvalError instanceof Error ? approvalError.message : String(approvalError)}`);
        }
      }

      // Convert spender to Candid optional format - exactly [] or [value]
      const candidSpender = params.spender ? [params.spender] as [Account] : [] as [];
      
      // Convert user account to Candid optional format for the account parameter
      // This should be the account that made the cycles approval
      const userAccount = user?.principal ? {
        owner: typeof user.principal === 'string' ? Principal.fromText(user.principal) : user.principal,
        subaccount: [] as []
      } : null;
      const candidAccount = userAccount ? [userAccount] as [Account] : [] as [];
      
      console.log('🔍 Mint function call parameters:', {
        request: {
          ...params.request,
          nft: {
            ...params.request.nft,
            tokenId: params.request.nft.tokenId.toString(),
          },
          mintToAccount: {
            ...params.request.mintToAccount,
            owner: params.request.mintToAccount.owner.toString(),
          }
        },
        candidSpender: candidSpender.map(spender => ({
          ...spender,
          owner: spender.owner.toString()
        })),
        candidAccount: candidAccount.map(acc => ({
          ...acc,
          owner: acc.owner.toString()
        })),
        userPrincipal: user?.principal,
        userPrincipalType: typeof user?.principal,
        userAccount,
      });
      
      try {
        // Try the 3-parameter version first (with account)
        console.log('🔍 Attempting mint with 3 parameters...');
        return (actor as any).mint(params.request, candidAccount);
      } catch (threeParamError) {
        console.warn('🔍 3-parameter mint failed, trying 2-parameter version:', threeParamError);
        // Fallback to 2-parameter version
        return actor.mint(params.request, candidSpender);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nft'] });
      queryClient.invalidateQueries({ queryKey: ['mint-status'] });
      queryClient.invalidateQueries({ queryKey: ['orchestrator-allowance'] });
    },
  });

  /**
   * Check the cost of minting specific NFTs from EVM
   */
  const getMintCost = useMutation({
    mutationFn: async (requests: MintRequest[]): Promise<(bigint | null)[]> => {
      if (!anonymousActor) {
        throw new Error('Anonymous actor not available');
      }
      const result = await anonymousActor.get_mint_cost(requests);
      // Convert ([] | [bigint])[] to (bigint | null)[]
      return result.map((item) => (Array.isArray(item) ? (item.length ? item[0] : null) : null));
    },
  });

  /**
   * Get the status of ongoing mint operations
   */
  const getMintStatus = useMutation({
    mutationFn: async (mintIds: bigint[]): Promise<(any | null)[]> => {
      if (!anonymousActor) {
        throw new Error('Anonymous actor not available to get mint status');
      }
      return anonymousActor.get_mint_status(mintIds);
    },
  });

  /**
   * Verify remote ownership of an EVM NFT
   */
  const getRemoteOwner = useMutation({
    mutationFn: async (params: {
      pointers: RemoteNFTPointer[];
      spender?: Account;
    }): Promise<(GetCallResult | null)[]> => {
      if (!actor) {
        throw new Error('User must be authenticated to verify remote ownership');
      }
      const candidSpender = params.spender ? [params.spender] as [Account] : [] as [];
      // Convert local RemoteNFTPointer to orchestrator RemoteNFTPointer
      const orchestratorPointers = params.pointers.map((p) => ({
        tokenId: p.tokenId,
        contract: p.contractPointer.contract,
        network: p.contractPointer.network,
      }));
      const result = await actor.get_remote_owner(orchestratorPointers, candidSpender);
      return result.map((item) => (Array.isArray(item) ? (item.length ? item[0] : null) : null));
    },
  });

  /**
   * Get metadata from remote EVM NFT
   */
  const getRemoteMetadata = useMutation({
    mutationFn: async (params: {
      pointers: RemoteNFTPointer[];
      fields: bigint[];
      spender?: Account;
    }): Promise<(GetCallResult | null)[]> => {
      if (!actor) {
        throw new Error('User must be authenticated to get remote metadata');
      }
      const candidSpender = params.spender ? [params.spender] as [Account] : [] as [];
      // Convert local RemoteNFTPointer to orchestrator RemoteNFTPointer
      const orchestratorPointers = params.pointers.map((p) => ({
        tokenId: p.tokenId,
        contract: p.contractPointer.contract,
        network: p.contractPointer.network,
      }));
      const result = await actor.get_remote_meta(orchestratorPointers, params.fields, candidSpender);
      return result.map((item) => (Array.isArray(item) ? (item.length ? item[0] : null) : null));
    },
  });

  /**
   * Get the approval address needed for EVM NFT transfer
   * Uses anonymous actor since this is a query operation that doesn't need authentication
   */
  const getApprovalAddress = useMutation({
    mutationFn: async (params: {
      request: ApprovalAddressRequest;
      spender?: Account;
    }): Promise<string | null> => {
      if (!anonymousActor) {
        throw new Error('Anonymous actor not available for approval address query');
      }
      // Convert spender to Candid optional format - exactly [] or [value]
      const candidSpender = params.spender ? [params.spender] as [Account] : [] as [];
      const result = await anonymousActor.get_remote_approval_address(params.request, candidSpender);
      // Candid optional: [] = None, [string] = Some(string)
      if (Array.isArray(result)) {
        return result.length === 0 ? null : result[0];
      }
      return result as string | null;
    },
  });

  // IC → EVM OPERATIONS

  /**
   * Cast (export) an IC NFT to an EVM chain
   * This is the primary operation for sending IC NFTs to EVM
   */
  const castToEVM = useMutation({
    mutationFn: async (params: {
      castRequests: CkNFTCastRequest[];
      ckNFTCanisterId: Principal;
      spender?: Account;
    }): Promise<(CkNFTCastResult | null)[]> => {
      if (!isAuthenticated || !authenticatedAgent) {
        throw new Error('User must be authenticated to cast NFTs');
      }

      const { Actor } = await import('@dfinity/agent');
      
      // Create ckNFT actor using the authenticated agent directly
      const ckNFTActor = Actor.createActor(ckNFTIdlFactory, {
        agent: authenticatedAgent,
        canisterId: params.ckNFTCanisterId,
      }) as CkNFTService;

      console.log('🎯 Casting NFTs via ckNFT canister:', {
        canisterId: params.ckNFTCanisterId.toString(),
        requestCount: params.castRequests.length,
        spender: params.spender,
      });

      // Check and approve cycles for casting if needed
      // The ckNFT canister needs to be approved to spend cycles for the casting operation
      try {
        // Get the cast cost first using anonymous agent (no auth needed for cost query)
        const anonymousAgent = new HttpAgent({ host: process.env.IC_HOST });
        if (process.env.NODE_ENV === 'development') {
          await anonymousAgent.fetchRootKey();
        }
        
        const anonymousCkNFTActor = Actor.createActor(ckNFTIdlFactory, {
          agent: anonymousAgent,
          canisterId: params.ckNFTCanisterId,
        }) as CkNFTService;
        
        const castCost = await anonymousCkNFTActor.icrc99_cast_cost({
          contract: params.castRequests[0].remoteContract.contract,
          network: params.castRequests[0].remoteContract.network,
          tokenId: params.castRequests[0].tokenId,
        });

        const totalCastCost = BigInt(castCost) * BigInt(params.castRequests.length);
        
        console.log('🔋 Total cycles needed for casting:', totalCastCost.toString());

        // Calculate required approval amount with 110% buffer
        const requiredApprovalAmount = (totalCastCost * BigInt(110)) / BigInt(100);
        
        // Check current allowance to avoid double approval
        // This prevents the issue where the cost screen approved but execution screen approves again
        const currentUser = user;
        let needsCyclesApproval = true;
        
        if (currentUser?.principal) {
          try {
            // Create allowance query parameters
            const allowanceParams = {
              account: { owner: currentUser.principal, subaccount: [] },
              spender: { owner: params.ckNFTCanisterId, subaccount: [] }
            };
            
            // Get current allowance using fresh query
            const freshAllowance = await queryClient.fetchQuery({
              queryKey: ['icrc2-allowance', allowanceParams],
              queryFn: async () => {
                const { Actor, HttpAgent } = await import('@dfinity/agent');
                
                const agent = new HttpAgent({
                  host: process.env.DFX_NETWORK === 'local' ? 'http://localhost:8080' : 'https://ic0.app',
                });
                
                if (process.env.DFX_NETWORK === 'local') {
                  await agent.fetchRootKey().catch(err => console.warn('Failed to fetch root key:', err));
                }
                
                // ICRC-2 IDL for allowance call
                const icrc2IdlFactory = ({ IDL }: { IDL: any }) => {
                  const Account = IDL.Record({
                    owner: IDL.Principal,
                    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
                  });
                  
                  const Allowance = IDL.Record({
                    allowance: IDL.Nat,
                    expires_at: IDL.Opt(IDL.Nat64),
                  });
                  
                  return IDL.Service({
                    icrc2_allowance: IDL.Func(
                      [IDL.Record({ account: Account, spender: Account })],
                      [Allowance],
                      ['query']
                    ),
                  });
                };
                
                const CYCLES_LEDGER_CANISTER_ID = process.env.CYCLES_LEDGER_CANISTER_ID || 'um5iw-rqaaa-aaaaq-qaaba-cai';
                const cyclesActor = Actor.createActor(icrc2IdlFactory, {
                  agent,
                  canisterId: CYCLES_LEDGER_CANISTER_ID,
                }) as any;
                
                const allowanceResult = await cyclesActor.icrc2_allowance(allowanceParams);
                return {
                  allowance: allowanceResult.allowance,
                  expires_at: allowanceResult.expires_at.length > 0 ? [allowanceResult.expires_at[0]] : [],
                };
              },
              staleTime: 0,
            });
            
            if (freshAllowance?.allowance) {
              console.log('🔍 Current allowance for ckNFT canister:', freshAllowance.allowance.toString());
              console.log('🔍 Required approval amount:', requiredApprovalAmount.toString());
              
              if (freshAllowance.allowance >= requiredApprovalAmount) {
                const now = BigInt(Date.now() * 1000000);
                const isExpired = freshAllowance.expires_at.length > 0 && 
                               freshAllowance.expires_at[0] < now;
                
                if (!isExpired) {
                  needsCyclesApproval = false;
                  console.log('✅ Sufficient cycles allowance already exists for casting, skipping approval');
                } else {
                  console.log('❌ Cycles allowance expired, will re-approve');
                }
              } else {
                console.log('❌ Insufficient cycles allowance, will approve more');
              }
            }
          } catch (allowanceCheckError) {
            console.warn('Could not check current cycles allowance, will approve to be safe:', allowanceCheckError);
          }
        }

        // Only approve if we need to
        if (needsCyclesApproval) {
          console.log('🔋 Auto-approving cycles for ckNFT canister casting...');
          
          await cyclesApproveMutation.mutateAsync({
            fee: [],
            memo: [],
            from_subaccount: [],
            created_at_time: [],
            amount: requiredApprovalAmount,
            expected_allowance: [],
            expires_at: [BigInt(Date.now() * 1000000) + BigInt(24 * 60 * 60 * 1000000000)], // 1 day in nanoseconds
            spender: {
              owner: params.ckNFTCanisterId, // ckNFT canister is the spender for cast operations
              subaccount: []
            }
          });
          
          console.log('🔋 Cycles approved for ckNFT canister casting');
        }
      } catch (cyclesError) {
        console.warn('⚠️ Failed to approve cycles for casting, continuing anyway:', cyclesError);
        // Continue - the cast might still work if cycles were already approved
      }

      // For NFT casting, we need to approve the ckNFT canister to spend the user's NFT
      // The user owns the NFT but the canister needs approval to transfer it during casting
      const userPrincipal = user?.principal ? 
        (typeof user.principal === 'string' ? Principal.fromText(user.principal) : user.principal) : null;
      
      // Always approve if a spender is specified, because the spender is the ckNFT canister
      // that needs permission to transfer the NFT during the casting process
      const needsApproval = params.spender && userPrincipal;
      
      if (needsApproval) {
        console.log('🔐 Approving ckNFT canister to spend NFTs for casting...');
        
        try {
          // Create approval requests for each NFT - approve the ckNFT canister to spend them
          const approvalRequests = params.castRequests.map(castRequest => ({
            token_id: castRequest.tokenId,
            approval_info: {
              spender: params.spender!,
              memo: [] as [],
              from_subaccount: castRequest.fromSubaccount,
              created_at_time: [] as [],
              expires_at: [BigInt(Date.now() * 1000000) + BigInt(24 * 60 * 60 * 1000000000)] as [bigint], // 1 day expiry
            }
          }));
          
          // Approve the NFTs for the ckNFT canister to spend
          const approvalResults = await ckNFTActor.icrc37_approve_tokens(approvalRequests);
          console.log('🔐 NFT approval results:', approvalResults);
          
          // Check for approval errors
          for (let i = 0; i < approvalResults.length; i++) {
            const result = approvalResults[i];
            if (Array.isArray(result) && result.length > 0 && result[0] && 'Err' in result[0]) {
              const error = result[0].Err;
              console.error(`❌ Failed to approve NFT ${params.castRequests[i].tokenId}:`, error);
              
              // Throw specific error for insufficient allowance
              if ('InsufficientAllowance' in error) {
                const insufficientAllowance = (error as any).InsufficientAllowance;
                throw new Error(`Insufficient allowance for NFT casting. Required: ${insufficientAllowance.allowance}, Available: ${insufficientAllowance.balance}. Please approve the NFT for transfer before casting.`);
              } else {
                throw new Error(`Failed to approve NFT ${params.castRequests[i].tokenId}: ${JSON.stringify(error)}`);
              }
            }
          }
          
          console.log('✅ All NFTs approved successfully for ckNFT canister');
        } catch (approvalError) {
          console.error('❌ Failed to approve NFTs for casting:', approvalError);
          throw approvalError; // Re-throw the error to stop the casting process
        }
      } else {
        console.log('🔐 No spender specified or user not authenticated - skipping approval');
      }

      // Call icrc99_cast on the ckNFT canister directly (not the orchestrator)
      // Pass the user's account as the second parameter (similar to mint/create_canister calls)
      const userAccount = user?.principal ? {
        owner: typeof user.principal === 'string' ? Principal.fromText(user.principal) : user.principal,
        subaccount: [] as []
      } : null;
      const candidAccount = userAccount ? [userAccount] as [Account] : [] as [];
      
      const result = await ckNFTActor.icrc99_cast(params.castRequests, candidAccount);
      
      console.log('✅ Cast results from ckNFT canister:', result);
      
      // Convert Candid optional format: [] means None, [CastResult] means Some(CastResult)
      return result.map((optionalResult): CkNFTCastResult | null => {
        if (Array.isArray(optionalResult) && optionalResult.length > 0 && optionalResult[0] != null) {
          return optionalResult[0];
        }
        return null;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nft'] });
      queryClient.invalidateQueries({ queryKey: ['cast-status'] });
    },
  });

  /**
   * Get the status of ongoing cast operations from the ckNFT canister
   */
  const getCastStatus = useMutation({
    mutationFn: async (params: {
      castIds: bigint[];
      ckNFTCanisterId: string;
      account?: Account;
    }): Promise<(any | null)[]> => {
      const { Actor } = await import('@dfinity/agent');
      
      // Use anonymous agent for status queries - no authentication needed
      let agent = anonymousActor ? (anonymousActor as any)._agent || (anonymousActor as any).__agent : null;
      
      if (!agent) {
        // Create new anonymous agent if needed
        const { HttpAgent } = await import('@dfinity/agent');
        agent = new HttpAgent({ 
          host: process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://ic0.app' 
        });
        
        // Fetch root key for local development
        if (process.env.NODE_ENV === 'development') {
          await agent.fetchRootKey();
        }
      }

      // Create ckNFT actor to call icrc99_cast_status
      const ckNFTActor = Actor.createActor(ckNFTIdlFactory, {
        agent,
        canisterId: params.ckNFTCanisterId,
      }) as CkNFTService;

      // Call icrc99_cast_status on the ckNFT canister
      const result = await ckNFTActor.icrc99_cast_status(params.castIds, params.account ? [params.account] : []);
      return result;
    },
  });

  /**
   * Create a new remote contract on an EVM chain with enhanced gas calculation
   */
  const createRemoteContract = useMutation({
    mutationFn: async (params: {
      pointer: ContractPointer;
      network: Network;
      // Enhanced gas parameters
      remoteFeeData?: {
        maxFeePerGas?: bigint;
        l1DataFee?: bigint;
      };
      ethFeeData?: {
        gasPrice?: bigint;
      };
      estimatedRemoteGas?: bigint;
      estimatedRemoteSize?: bigint;
      remoteFundingBalance?: bigint;
      // Fallback to simple parameters if enhanced data not available
      gasPrice?: bigint;
      gasLimit?: bigint;
      maxPriorityFeePerGas?: bigint;
      spender?: Account;
    }) => {
      if (!actor) {
        throw new Error('User must be authenticated to create remote contracts');
      }

      let finalGasPrice: bigint;
      let finalGasLimit: bigint;
      let finalMaxPriorityFeePerGas: bigint;

      // Use enhanced gas calculation if available (following your example)
      if (params.remoteFeeData?.maxFeePerGas && 
          params.ethFeeData?.gasPrice && 
          params.estimatedRemoteGas && 
          params.estimatedRemoteSize && 
          params.remoteFundingBalance) {
        
        // Calculate fee per gas with L1 data fee consideration
        const l1DataComponent = params.remoteFeeData.l1DataFee && params.remoteFeeData.l1DataFee > 0n
          ? (params.ethFeeData.gasPrice * 16n * (params.estimatedRemoteSize + 300n)) / ((params.estimatedRemoteGas * 120n) / 100n)
          : 0n;
        
        finalGasPrice = params.remoteFeeData.maxFeePerGas + 2000000n + l1DataComponent;
        
        // Calculate available gas based on funding balance (90% of balance)
        const gasAvailable = ((params.remoteFundingBalance * 90n) / 100n) / 1800000n;
        
        finalGasLimit = params.estimatedRemoteGas;
        finalMaxPriorityFeePerGas = 2000000n; // Conservative 2M priority fee
        
        console.log('📊 Enhanced gas calculation:', {
          maxFeePerGas: params.remoteFeeData.maxFeePerGas.toString(),
          l1DataComponent: l1DataComponent.toString(),
          finalGasPrice: finalGasPrice.toString(),
          estimatedGas: params.estimatedRemoteGas.toString(),
          gasAvailable: gasAvailable.toString(),
          remoteFundingBalance: params.remoteFundingBalance.toString(),
        });
      } else {
        // Fallback to provided parameters or defaults
        finalGasPrice = params.gasPrice || 50000000000n; // 50 gwei default
        finalGasLimit = params.gasLimit || 2000000n; // 2M gas default
        finalMaxPriorityFeePerGas = params.maxPriorityFeePerGas || 2000000000n; // 2 gwei default
        
        console.log('⚠️ Using fallback gas parameters - enhanced calculation data not available');
      }

      // Convert spender to Candid optional format - exactly [] or [value]
      const candidSpender = params.spender ? [params.spender] as [Account] : [] as [];
      
      console.log('🚀 Creating remote contract with final parameters:', {
        gasPrice: finalGasPrice.toString(),
        gasLimit: finalGasLimit.toString(),
        maxPriorityFeePerGas: finalMaxPriorityFeePerGas.toString(),
      });

      return actor.create_remote(
        params.pointer,
        params.network,
        finalGasPrice,
        finalGasLimit,
        finalMaxPriorityFeePerGas,
        candidSpender
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remote-contracts'] });
    },
  });

  /**
   * Get the cost of creating a remote contract
   */
  const getRemoteCost = useMutation({
    mutationFn: async (params: {
      pointer: ContractPointer;
      network: Network;
    }): Promise<bigint> => {
      if (!actor) {
        throw new Error('User must be authenticated to get remote cost');
      }
      return actor.get_remote_cost(params.pointer, params.network);
    },
  });

  // CANISTER MANAGEMENT

  /**
   * Create a new ckNFT canister for bridging
   */
  const createCanister = useMutation({
    mutationFn: async (params: {
      pointer: ContractPointer;
      defaults: SimpleCanisterDefaults;
      spender?: Account;
      requiredCycles?: bigint;
      skipApproval?: boolean;
    }) => {
      if (!isAuthenticated || !actor) {
        throw new Error('User must be authenticated to create canisters');
      }
      
      console.log('Creating canister with params:', params);
      
      // Use the original pointer but convert BigInt to string for logging
      const logPointer = {
        contract: params.pointer.contract,
        network: JSON.stringify(params.pointer.network, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      };
      console.log('Pointer for logging:', logPointer);
      
      // Check if we need to approve cycles first
      if (params.requiredCycles && !params.skipApproval) {
        try {
          console.log('Auto-approving cycles for canister creation...');
          const orchestratorPrincipal = Principal.fromText(orchestratorCanisterId);
          
          // Auto-approve with a bit extra (110% of required) and 1 day expiry
          const approvalAmount = (params.requiredCycles * BigInt(110)) / BigInt(100);
          
          await cyclesApproveMutation.mutateAsync({
            fee: [],
            memo: [],
            from_subaccount: [],
            created_at_time: [],
            amount: approvalAmount,
            expected_allowance: [],
            expires_at: [BigInt(Date.now() * 1000000) + BigInt(24 * 60 * 60 * 1000000000)], // 1 day in nanoseconds
            spender: {
              owner: orchestratorPrincipal,
              subaccount: []
            }
          });
          
          console.log('Cycles approved successfully');
        } catch (approvalError) {
          console.error('Failed to approve cycles:', approvalError);
          throw new Error(`Failed to approve cycles: ${approvalError instanceof Error ? approvalError.message : String(approvalError)}`);
        }
      }
      
      // Convert defaults to Candid optional format - exactly [] or [value]
      const candidDefaults = {
        logo: params.defaults.logo ? [params.defaults.logo] as [string] : [] as [],
        name: params.defaults.name ? [params.defaults.name] as [string] : [] as [],
        description: params.defaults.description ? [params.defaults.description] as [string] : [] as [],
        symbol: params.defaults.symbol ? [params.defaults.symbol] as [string] : [] as [],
      };
      
      // Convert spender to Candid optional format - exactly [] or [value]
      const candidSpender = params.spender ? [params.spender] as [Account] : [] as [];
      
      const result = await actor.create_canister(params.pointer, candidDefaults, candidSpender);
      
      // Check if the result is an error and throw if so
      if ('Err' in result) {
        console.error('Canister creation error:', result.Err);
        
        // Log the full error structure for debugging
        console.log('Full error object:', JSON.stringify(result.Err, (_key, value) =>
          typeof value === 'bigint' ? `BigInt(${value.toString()})` : value
        , 2));
        
        // Handle specific error types with user-friendly messages
        if ('InsufficientCycles' in result.Err) {
          const errorData = result.Err.InsufficientCycles;
          console.log('InsufficientCycles error data:', errorData, 'Type:', typeof errorData, 'IsArray:', Array.isArray(errorData));
          
          if (Array.isArray(errorData) && errorData.length >= 2) {
            const [orchestratorBalance, totalNeeded] = errorData;
            throw new Error(
              `Insufficient cycles for canister creation. The orchestrator needs ${totalNeeded.toString()} cycles but only has ${orchestratorBalance.toString()} available. You need to approve cycles from your cycles ledger to the orchestrator canister (${process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai'}).`
            );
          } else {
            throw new Error(`Insufficient cycles for canister creation. Error data: ${JSON.stringify(errorData)}`);
          }
        } else if ('InsufficientBalance' in result.Err) {
          const errorData = result.Err.InsufficientBalance;
          if (Array.isArray(errorData) && errorData.length >= 2) {
            const [available, required] = errorData;
            throw new Error(
              `Insufficient balance or allowance. Available: ${available.toString()}, Required: ${required.toString()}. Please ensure you have sufficient cycles balance and have approved the orchestrator as a spender.`
            );
          } else {
            throw new Error(`Insufficient balance. Error data: ${JSON.stringify(errorData)}`);
          }
        } else if ('InsufficientAllowance' in result.Err) {
          const errorData = result.Err.InsufficientAllowance;
          if (Array.isArray(errorData) && errorData.length >= 2) {
            const [required, available] = errorData;
            throw new Error(
              `Insufficient allowance. Required: ${required.toString()}, Available: ${available.toString()}`
            );
          } else {
            throw new Error(`Insufficient allowance. Error data: ${JSON.stringify(errorData)}`);
          }
        } else {
          // Generic error handling with BigInt serialization support
          const errorMessage = (() => {
            try {
              return JSON.stringify(result.Err, (_key, value) =>
                typeof value === 'bigint' ? value.toString() : value
              );
            } catch {
              return String(result.Err);
            }
          })();
          throw new Error(`Canister creation failed: ${errorMessage}`);
        }
      }
      
      // Return the successful result
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canisters'] });
      queryClient.invalidateQueries({ queryKey: ['existing-canister'] });
      queryClient.invalidateQueries({ queryKey: ['orchestrator-allowance'] });
    },
  });

  /**
   * Get the cost of creating a canister
   */
  const getCreationCost = useMutation({
    mutationFn: async (pointer: ContractPointer): Promise<bigint> => {
      if (!actor) {
        throw new Error('User must be authenticated to get creation cost');
      }
      return actor.get_creation_cost(pointer);
    },
  });

  /**
   * Get the ckNFT canister for specific contracts
   */
  const getCkNFTCanister = useMutation({
    mutationFn: async (pointers: ContractPointer[]): Promise<(Principal | null)[]> => {
      if (!anonymousActor) {
        throw new Error('Anonymous actor not available');
      }
      
      const result = await anonymousActor.get_ck_nft_canister(pointers);
      // Convert ([] | [Principal])[] to (Principal | null)[]
      return result.map((item) => (Array.isArray(item) ? (item.length ? item[0] : null) : null));
    },
  });

  /**
   * Get the ICRC-99 address for a canister on a specific network
   * Uses anonymous actor since this is a query operation
   */
  const getICRC99Address = useMutation({
    mutationFn: async (params: {
      canister: Principal;
      network: Network;
    }): Promise<string | null> => {
      if (!anonymousActor) {
        throw new Error('Anonymous actor not available');
      }
      const result = await anonymousActor.get_icrc99_address(params.canister, params.network);
      // Candid optional: [] = None, [string] = Some(string)
      if (Array.isArray(result)) {
        return result.length === 0 ? null : result[0];
      }
      return result as string | null;
    },
  });

  /**
   * Get cast cost from ckNFT canister - the real cost calculation function
   */
  const getCastCost = useMutation({
    mutationFn: async (params: {
      ckNFTCanisterId: Principal;
      contract: string;
      network: Network;
      tokenId: bigint;
    }): Promise<bigint> => {
      const { Actor } = await import('@dfinity/agent');
      
      // Use anonymous agent for cost queries - no authentication needed
      let agent = anonymousActor ? (anonymousActor as any)._agent || (anonymousActor as any).__agent : null;
      
      if (!agent) {
        // Create new anonymous agent if needed
        const { HttpAgent } = await import('@dfinity/agent');
        agent = new HttpAgent({ 
          host: process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://ic0.app' 
        });
        
        // Fetch root key for local development
        if (process.env.NODE_ENV === 'development') {
          await agent.fetchRootKey();
        }
      }

      // Create ckNFT actor to call icrc99_cast_cost
      const ckNFTActor = Actor.createActor(ckNFTIdlFactory, {
        agent,
        canisterId: params.ckNFTCanisterId,
      }) as CkNFTService;

      const castCostRequest: CastCostRequest = {
        contract: params.contract,
        network: params.network,
        tokenId: params.tokenId,
      };

      const result = await ckNFTActor.icrc99_cast_cost(castCostRequest);
      return result;
    },
  });

  /**
   * Get burn funding address from ckNFT canister
   */
  const getBurnFundingAddress = useMutation({
    mutationFn: async (params: {
      ckNFTCanisterId: Principal;
      tokenId: bigint;
    }): Promise<string | null> => {
      const { Actor } = await import('@dfinity/agent');
      
      // Use anonymous agent for address queries - no authentication needed
      let agent = anonymousActor ? (anonymousActor as any)._agent || (anonymousActor as any).__agent : null;
      
      if (!agent) {
        // Create new anonymous agent if needed
        const { HttpAgent } = await import('@dfinity/agent');
        agent = new HttpAgent({ 
          host: process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://ic0.app' 
        });
        
        // Fetch root key for local development
        if (process.env.NODE_ENV === 'development') {
          await agent.fetchRootKey();
        }
      }

      // Create ckNFT actor to call icrc99_burn_fund_address
      const ckNFTActor = Actor.createActor(ckNFTIdlFactory, {
        agent,
        canisterId: params.ckNFTCanisterId,
      }) as CkNFTService;

      const result = await ckNFTActor.icrc99_burn_fund_address(params.tokenId);
      
      // Handle Candid optional format: [] = None, [[string, Network]] = Some([string, Network])
      if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && result[0].length > 0) {
        return result[0][0]; // Return just the string address
      }
      return null;
    },
  });

  // AGGREGATED STATUS HELPERS

  const isLoading = 
    mintFromEVM.isPending ||
    castToEVM.isPending ||
    createCanister.isPending ||
    createRemoteContract.isPending ||
    getMintCost.isPending ||
    getRemoteCost.isPending ||
    getCreationCost.isPending ||
    getMintStatus.isPending ||
    getCastStatus.isPending ||
    getRemoteOwner.isPending ||
    getRemoteMetadata.isPending ||
    getApprovalAddress.isPending ||
    getCkNFTCanister.isPending ||
    getICRC99Address.isPending ||
    getCastCost.isPending;

  const error = 
    mintFromEVM.error ||
    castToEVM.error ||
    createCanister.error ||
    createRemoteContract.error ||
    getMintCost.error ||
    getRemoteCost.error ||
    getCreationCost.error ||
    getMintStatus.error ||
    getCastStatus.error ||
    getRemoteOwner.error ||
    getRemoteMetadata.error ||
    getApprovalAddress.error ||
    getCkNFTCanister.error ||
    getICRC99Address.error ||
    getCastCost.error;

  return {
    // EVM → IC operations
    mintFromEVM,
    getMintCost,
    getMintStatus,
    getRemoteOwner,
    getRemoteMetadata,
    getApprovalAddress,

    // IC → EVM operations
    castToEVM,
    getCastStatus,
    getCastCost, // Real cast cost calculation
    createRemoteContract,
    getRemoteCost,
    
    // Burn operations
    getBurnFundingAddress,

    // Canister management
    createCanister,
    getCreationCost,
    getCkNFTCanister,
    getICRC99Address,

    // Cycles management
    cyclesApprove: cyclesApproveMutation,

    // Aggregated status
    isLoading,
    error,

    // Direct access to individual loading states
    isLoadingMint: mintFromEVM.isPending,
    isLoadingCast: castToEVM.isPending,
    isLoadingCanisterCreation: createCanister.isPending,
    isLoadingRemoteCreation: createRemoteContract.isPending,

    // Direct access to individual errors
    mintError: mintFromEVM.error,
    castError: castToEVM.error,
    canisterError: createCanister.error,
    remoteError: createRemoteContract.error,
  };
}

/**
 * Query hook for getting the canister creation cost
 */
export function useCanisterCreationCost(contractPointer: ContractPointer | null, enabled: boolean = true) {
  const orchestratorCanisterId = process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai';
  
  const actor = useAnonymousActor<{ get_creation_cost: (pointer: ContractPointer) => Promise<bigint> }>(
    orchestratorCanisterId,
    orchestratorIdlFactory
  );

  return useQuery({
    queryKey: [
      'canister-creation-cost', 
      contractPointer?.contract, 
      contractPointer?.network ? JSON.stringify(contractPointer.network, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ) : null
    ],
    queryFn: async () => {
      if (!contractPointer) {
        throw new Error('Contract pointer is required');
      }
      
      if (!actor) {
        throw new Error('Actor not available');
      }
      
      return actor.get_creation_cost(contractPointer);
    },
    enabled: enabled && !!contractPointer && !!actor && !!contractPointer.contract,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to check if a ckNFT canister already exists for the contract
 */
export function useExistingCanister(contractPointer: ContractPointer | null, enabled: boolean = true) {
  const orchestratorCanisterId = process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai';
  
  const actor = useAnonymousActor<{ get_ck_nft_canister: (pointers: ContractPointer[]) => Promise<(Principal | null)[]> }>(
    orchestratorCanisterId,
    orchestratorIdlFactory
  );

  return useQuery({
    queryKey: [
      'existing-canister', 
      contractPointer?.contract, 
      contractPointer?.network ? JSON.stringify(contractPointer.network, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ) : null
    ],
    queryFn: async () => {
      if (!contractPointer) {
        throw new Error('Contract pointer is required');
      }
      
      if (!actor) {
        throw new Error('Actor not available');
      }

      const result = await actor.get_ck_nft_canister([contractPointer]);
      const canisterId = result[0]; // First (and only) result
      
      // Handle Candid optional format properly
      // In Candid: [] = None, [Principal] = Some(Principal)
      if (Array.isArray(canisterId)) {
        if (canisterId.length === 0) {
          return null;
        } else {
          return canisterId[0];
        }
      }
      
      // Fallback for non-array responses
      return canisterId || null;
    },
    enabled: enabled && !!contractPointer && !!actor && !!contractPointer.contract,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to check the current cycles allowance for the orchestrator
 */
export function useOrchestratorAllowance(requiredAmount?: bigint) {
  const orchestratorCanisterId = process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai';
  const { user } = useAuth();
  
  // Use the enhanced fungible token hook for cycles ledger
  const cyclesToken = useFungibleToken(CYCLES_LEDGER_CANISTER_ID);
  const { useAllowance } = cyclesToken;
  
  // Memoize the allowance query parameters to prevent unnecessary rerenders
  const allowanceParams = useMemo(() => {
    if (!user?.principal) return undefined;
    
    return {
      account: { owner: user.principal, subaccount: [] as [] },
      spender: { owner: Principal.fromText(orchestratorCanisterId), subaccount: [] as [] }
    };
  }, [user?.principal, orchestratorCanisterId]);
  
  // Check allowance if user is authenticated
  const allowanceQuery = useAllowance(allowanceParams);
  
  // Memoize the transformed data to prevent object recreation on every render
  const transformedData = useMemo(() => {
    if (!allowanceQuery.data) return null;
    
    // Calculate expiry once and cache it for a reasonable time (1 minute)
    const now = BigInt(Date.now() * 1000000);
    const isExpired = allowanceQuery.data.expires_at.length > 0 && allowanceQuery.data.expires_at[0] ? 
      allowanceQuery.data.expires_at[0] < now : false;
    
    return {
      allowance: allowanceQuery.data.allowance,
      expires_at: allowanceQuery.data.expires_at,
      isExpired,
      isSufficient: requiredAmount ? allowanceQuery.data.allowance >= requiredAmount : false,
    };
  }, [allowanceQuery.data, requiredAmount]);
  
  // Return memoized result to prevent infinite rerenders
  return useMemo(() => ({
    data: transformedData,
    isLoading: allowanceQuery.isLoading,
    error: allowanceQuery.error,
    refetch: allowanceQuery.refetch,
  }), [transformedData, allowanceQuery.isLoading, allowanceQuery.error, allowanceQuery.refetch]);
}

/**
 * Helper function to create a basic mint request
 */
export function createMintRequest(
  tokenId: bigint,
  contractAddress: string,
  network: Network,
  mintToAccount: Account,
  spender?: Account
): MintRequest {
  return {
    nft: {
      tokenId,
      contract: contractAddress,
      network,
    },
    resume: [],
    mintToAccount,
    spender: spender ? [spender] : [],
  };
}

/**
 * Helper function to create a basic cast request
 */
export function createCastRequest(
  tokenId: bigint,
  uri: string,
  remoteContract: ContractPointer,
  nativeContract: ContractPointer,
  targetOwner: string,
  originalCaller: Account,
  gasOptions?: {
    gasPrice?: bigint;
    gasLimit?: bigint;
    maxPriorityFeePerGas?: bigint;
  },
  originalMinterAccount?: Account,
  memo?: Uint8Array | number[],
  createdAtTime?: bigint
): CastRequest {
  return {
    uri,
    tokenId,
    remoteContract,
    nativeContract,
    targetOwner,
    originalCaller,
    castId: BigInt(Date.now()), // Simple castId generation
    gasPrice: gasOptions?.gasPrice !== undefined ? [gasOptions.gasPrice] : [],
    gasLimit: gasOptions?.gasLimit !== undefined ? [gasOptions.gasLimit] : [],
    maxPriorityFeePerGas: gasOptions?.maxPriorityFeePerGas !== undefined ? [gasOptions.maxPriorityFeePerGas] : [],
    originalMinterAccount: originalMinterAccount ? [originalMinterAccount] : [],
    memo: memo ? [memo] : [],
    created_at_time: createdAtTime !== undefined ? [createdAtTime] : [],
  };
}

/**
 * Helper function to create network configurations
 */
export const NetworkHelpers = {
  ethereum: (chainId?: bigint): Network => ({ Ethereum: chainId ? [chainId] : [] }),
  ic: (subnet?: string): Network => ({ IC: subnet ? [subnet] : [] }),
  solana: (cluster?: bigint): Network => ({ Solana: cluster ? [cluster] : [] }),
  bitcoin: (network?: string): Network => ({ Bitcoin: network ? [network] : [] }),
  other: (config: Array<[string, any]>): Network => ({ Other: config }),
};

/**
 * Helper function to create account from principal
 */
export function createAccount(owner: Principal, subaccount?: Uint8Array): Account {
  return {
    owner,
    subaccount: subaccount ? [subaccount] : [],
  };
}

/**
 * Simple query hook for getting collection metadata from a specific canister
 * This is a focused, lightweight alternative to the full useNFTCollection hook
 */
export function useCollectionMetadata(canisterId: string | Principal | null, enabled: boolean = true) {
  // Convert Principal to string if needed and validate it's a proper canister ID
  const canisterIdString = useMemo(() => {
    if (!canisterId) return null;
    
    let idString: string;
    
    // If it's already a string, use it
    if (typeof canisterId === 'string') {
      idString = canisterId;
    } else if (canisterId && typeof canisterId === 'object' && 'toString' in canisterId) {
      // If it's a Principal object, convert to string
      idString = (canisterId as any).toString();
    } else {
      // Fallback to string conversion
      idString = String(canisterId);
    }
    
    // Validate that it looks like a proper canister ID (not an error message)
    if (!idString || 
        idString === 'N/A' || 
        idString === 'No canister found' || 
        idString === 'Error displaying ID' ||
        idString.startsWith('Error ') ||
        idString.length < 5) {
      return null;
    }
    
    return idString;
  }, [canisterId]);
  
  const actor = useAnonymousActor<{ 
    icrc7_collection_metadata: () => Promise<Array<[string, any]>> 
  }>(
    canisterIdString || 'umunu-kh777-77774-qaaca-cai', // Use a real but harmless canister as fallback to prevent management canister errors
    // We'll use a simple generic IDL factory for ICRC-7 calls
    ({ IDL }) => {
      return IDL.Service({
        'icrc7_collection_metadata': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Reserved))], ['query']),
      });
    }
  );

  return useQuery({
    queryKey: ['collection-metadata', canisterIdString],
    queryFn: async () => {
      if (!canisterIdString) {
        throw new Error('Canister ID is required');
      }
      
      if (!actor) {
        throw new Error('Actor not available');
      }
      
      const rawMetadata = await actor.icrc7_collection_metadata();
      
      console.log('🔍 Raw collection metadata from canister:', rawMetadata);
      console.log('🔍 Raw metadata structure:', JSON.stringify(rawMetadata, (_key, value) => {
        if (typeof value === 'bigint') return `BigInt(${value.toString()})`;
        return value;
      }, 2));
      
      // Enhanced helper function to extract values from Candid variants
      const fromValue = (v: any): any => {
        console.log('🔍 Processing value:', v, 'Type:', typeof v);
        
        if (!v) return undefined;
        
        // Handle string values directly
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return v;
        if (typeof v === 'bigint') return v;
        if (typeof v === 'boolean') return v;
        
        // Handle Candid variant objects
        if (typeof v === 'object' && v !== null) {
          // Check for common Candid variant patterns
          if ('Text' in v) {
            console.log('🔍 Found Text variant:', v.Text);
            return v.Text;
          }
          if ('Nat' in v) {
            console.log('🔍 Found Nat variant:', v.Nat);
            return BigInt(v.Nat);
          }
          if ('Int' in v) {
            console.log('🔍 Found Int variant:', v.Int);
            return BigInt(v.Int);
          }
          if ('Bool' in v) {
            console.log('🔍 Found Bool variant:', v.Bool);
            return v.Bool;
          }
          if ('Blob' in v) {
            console.log('🔍 Found Blob variant:', v.Blob);
            return v.Blob;
          }
          if ('Array' in v) {
            console.log('🔍 Found Array variant:', v.Array);
            return v.Array;
          }
          if ('Map' in v) {
            console.log('🔍 Found Map variant:', v.Map);
            return v.Map;
          }
          
          // Check for nested structures or unknown variants
          const keys = Object.keys(v);
          if (keys.length === 1) {
            const key = keys[0];
            console.log(`🔍 Found single-key variant: ${key} =>`, v[key]);
            // For unknown variants, return the inner value
            return fromValue(v[key]);
          }
          
          console.log('🔍 Complex object, returning as-is:', v);
          return v;
        }
        
        console.log('🔍 Returning value as-is:', v);
        return v;
      };
      
      // Parse the metadata following ICRC-7 standard
      const parsed: Record<string, any> = {};
      for (const [key, value] of rawMetadata) {
        console.log(`🔍 Processing metadata pair: "${key}" =>`, value);
        parsed[key] = fromValue(value);
        console.log(`🔍 Parsed result for "${key}":`, parsed[key]);
      }
      console.log('🎯 Final parsed collection metadata:', parsed);
      return {
        name: parsed['icrc7:name'] || parsed['name'] || null,
        symbol: parsed['icrc7:symbol'] || parsed['symbol'] || null,
        description: parsed['icrc7:description'] || parsed['description'] || null,
        logo: parsed['icrc7:logo'] || parsed['logo'] || null,
        totalSupply: parsed['icrc7:total_supply'] || parsed['total_supply'] || null,
        supplyCap: parsed['icrc7:supply_cap'] || parsed['supply_cap'] || null,
        maxQueryBatchSize: parsed['icrc7:max_query_batch_size'] || null,
        maxUpdateBatchSize: parsed['icrc7:max_update_batch_size'] || null,
        maxTakeValue: parsed['icrc7:max_take_value'] || null,
        maxMemoSize: parsed['icrc7:max_memo_size'] || null,
        defaultTakeValue: parsed['icrc7:default_take_value'] || null,
        royalties: parsed['icrc7:royalties'] || parsed['royalties'] || null,
        royaltyRecipient: parsed['icrc7:royalty_recipient'] || parsed['royalty_recipient'] || null,
        raw: rawMetadata,
      };
    },
    // Only enable when we have a valid canister ID - this prevents querying invalid canisters
    enabled: enabled && !!canisterIdString && !!actor && canisterIdString !== 'aaaaa-aa',
    staleTime: 10 * 60 * 1000, // 10 minutes - collection metadata doesn't change often
    refetchOnWindowFocus: false,
  });
}
