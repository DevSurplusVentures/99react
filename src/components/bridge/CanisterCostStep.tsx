import { useEffect, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { Principal } from '@dfinity/principal';
import { useMetaMask } from '../../hooks/useEVM';
import { useAuth } from '../../hooks/useAuth';
import { useFungibleToken } from '../../hooks/useFungibleToken';
import { useCanisterCreationCost, useExistingCanister, useOrchestratorAllowance, use99Mutations, useCollectionMetadata } from '../../hooks/use99Mutations';
import type { ContractPointer } from '../../declarations/orchestrator/orchestrator.did';
import { SelectedNFT } from './NFTSelectionStep';

export interface CanisterCostStepProps {
  selectedNFTs: SelectedNFT[];
  costs: bigint | null;
  onCostsCalculated: (costs: bigint) => void;
  // Add a compact mode for cleaner display
  compact?: boolean;
}

export function CanisterCostStep({
  selectedNFTs,
  costs,
  onCostsCalculated,
  compact = false,
}: CanisterCostStepProps) {
  const { chainId } = useMetaMask();
  const { user } = useAuth();
  
  // Use the enhanced fungible token hook for cycles ledger
  const CYCLES_LEDGER_CANISTER_ID = process.env.CYCLES_LEDGER_CANISTER_ID || 'um5iw-rqaaa-aaaaq-qaaba-cai';
  const cyclesToken = useFungibleToken(CYCLES_LEDGER_CANISTER_ID);
  const { useBalance, useApprove } = cyclesToken;
  
  // Get user's cycles balance
  /* console.log('CanisterCostStep: User auth state', { 
    user: user ? { principal: user.principal?.toString() } : null,
    hasPrincipal: !!user?.principal 
  }); */
  
  const balanceQuery = useBalance(
    user?.principal ? { owner: user.principal, subaccount: [] } : undefined
  );
  
  // Get approve mutation
  const approveMutation = useApprove();
  
  // Helper functions to match the old interface
  const cyclesBalance = balanceQuery.data;
  const isLoadingBalance = balanceQuery.isLoading;
  const balanceError = balanceQuery.error;
  const isLoadingApprove = approveMutation.isPending;
  const approveError = approveMutation.error;
  
  const formatCycles = (amount: bigint) => {
    const decimals = 12; // Cycles have 12 decimals
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fraction = amount % divisor;
    const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 3);
    return `${whole.toLocaleString()}.${fractionStr} TC`;
  };
  
  const hasSufficientBalance = (requiredAmount: bigint) => {
    return cyclesBalance ? cyclesBalance >= requiredAmount : false;
  };

  // ICRC-99 mutations - now safe to call without authentication
  const mutations = use99Mutations(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai');

  // Create contract pointer for the first selected NFT to get cost estimate
  // Memoize this to prevent infinite re-renders caused by object recreation
  const contractPointer: ContractPointer | null = useMemo(() => {
    if (selectedNFTs.length === 0) return null;
    
    // Use nullish coalescing for more predictable fallback behavior
    const effectiveChainId = chainId ?? 1; // Default to Ethereum mainnet if null/undefined
    
    const network = { Ethereum: [BigInt(effectiveChainId)] as [bigint] };
    
    return {
      contract: selectedNFTs[0].contractAddress,
      network
    };
  }, [
    selectedNFTs.length > 0 ? selectedNFTs[0]?.contractAddress : null, // Only depend on first NFT's contract
    chainId ?? 1 // Use nullish coalescing for consistent fallback
  ]);

  /* console.log('CanisterCostStep: Component state', {
    selectedNFTs: selectedNFTs.length,
    chainId,
    contractPointer,
    costs
  }); */

  // Query for the actual canister creation cost
  const {
    data: realCost,
    isLoading: isLoadingCost,
    error: costError
  } = useCanisterCreationCost(contractPointer, selectedNFTs.length > 0);

  // Check if a canister already exists for this contract
  const {
    data: existingCanister,
    isLoading: isLoadingExisting,
    error: existingError
  } = useExistingCanister(contractPointer, selectedNFTs.length > 0);

  // Check the current allowance for the orchestrator
  const {
    data: allowanceInfo,
    isLoading: isLoadingAllowance
  } = useOrchestratorAllowance(realCost || undefined);

  /* console.log('CanisterCostStep: Query results', {
    realCost,
    isLoadingCost,
    costError,
    existingCanister,
    isLoadingExisting,
    existingError
  }); */

  // Update costs when real cost is loaded
  useEffect(() => {
    if (realCost && costs === null) {
      /* console.log('CanisterCostStep: Updating costs', realCost); */
      onCostsCalculated(realCost);
    }
  }, [realCost, costs, onCostsCalculated]);

  const displayCost = costs || realCost;
  const isLoading = isLoadingCost || isLoadingExisting || (selectedNFTs.length > 0 && !displayCost);
  const hasError = costError || balanceError || existingError;
  
  // More robust canister existence check
  // Handle Candid optional format: [] = None, [value] = Some(value)
  const canisterExists = Array.isArray(existingCanister) ? 
    existingCanister.length > 0 : 
    existingCanister !== null && existingCanister !== undefined;
  
  // Memoize the actual canister ID for display purposes
  const actualCanisterId = useMemo(() => {
    if (!existingCanister) return null;
    if (Array.isArray(existingCanister)) {
      if (existingCanister.length === 0) return null;
      const canisterId = existingCanister[0];
      if (canisterId && typeof canisterId === 'object' && 'toString' in canisterId) {
        return canisterId.toString();
      }
      return String(canisterId);
    }
    if (typeof existingCanister === 'object' && 'toString' in existingCanister) {
      return existingCanister.toString();
    }
    return String(existingCanister);
  }, [existingCanister]);
  
  // Removed useNFTCollection hook to eliminate infinite loop source
  // Using focused collection metadata query instead
  const {
    data: collectionMetadata,
    isLoading: isLoadingCollection,
    error: collectionError
  } = useCollectionMetadata(
    actualCanisterId, // This is already converted to string in the useMemo above
    canisterExists && !!actualCanisterId
  );
  
  // Better canister ID display handling
  const displayCanisterId = () => {
    if (!existingCanister) return 'N/A';
    
    try {
      // Handle Candid optional array format
      if (Array.isArray(existingCanister)) {
        if (existingCanister.length === 0) {
          return 'No canister found';
        }
        // Get the first (and should be only) element
        const canisterId = existingCanister[0];
        if (canisterId && typeof canisterId === 'object' && 'toString' in canisterId) {
          return canisterId.toString();
        }
        return String(canisterId);
      }
      
      // If it's a Principal object, convert to string
      if (existingCanister && typeof existingCanister === 'object' && 'toString' in existingCanister) {
        return existingCanister.toString();
      }
      // If it's already a string
      if (typeof existingCanister === 'string') {
        return existingCanister;
      }
      // Fallback
      return String(existingCanister);
    } catch (error) {
      console.error('Error converting canister ID to string:', error, existingCanister);
      return 'Error displaying ID';
    }
  };

  /*console.log('CanisterCostStep: Render state', {
    displayCost,
    isLoading,
    hasError,
    canisterExists,
    existingCanister,
    existingCanisterType: typeof existingCanister,
    existingCanisterConstructor: existingCanister?.constructor?.name,
    existingCanisterIsArray: Array.isArray(existingCanister),
    existingCanisterLength: Array.isArray(existingCanister) ? existingCanister.length : 'N/A',
    displayCanisterId: displayCanisterId(),
    costError,
    balanceError,
    existingError
  });*/

  // Handle canister creation
  const handleCreateCanister = useCallback(async () => {
    if (!contractPointer || !displayCost) {
      console.error('CanisterCostStep: Missing required data for canister creation');
      return;
    }

    try {
      /* console.log('CanisterCostStep: Creating canister', { contractPointer }); */
      
      // Check if we already have sufficient allowance
      const skipApproval = allowanceInfo?.isSufficient && !allowanceInfo?.isExpired;
      
      if (skipApproval) {
        console.log('CanisterCostStep: Sufficient allowance exists, skipping auto-approval');
      } else {
        console.log('CanisterCostStep: Will auto-approve cycles during creation');
      }
      
      const result = await mutations.createCanister.mutateAsync({
        pointer: contractPointer,
        defaults: {
          name: `ckNFT for ${contractPointer.contract}`,
          symbol: 'ckNFT',
          description: `Cross-chain NFT canister for ${contractPointer.contract}`,
        },
        spender: user?.principal ? { owner: user.principal, subaccount: [] } : undefined,
        requiredCycles: displayCost, // Pass the required cycles for auto-approval
        skipApproval, // Skip approval if we already have sufficient allowance
      });

      console.log('CanisterCostStep: Canister creation result', result);
      
      if ('Ok' in result) {
        console.log('CanisterCostStep: Canister created successfully', result.Ok.toString());
        // Refresh the existing canister query to reflect the new state
        // The mutation should automatically invalidate the relevant queries
      } else {
        // This shouldn't happen anymore since errors are thrown by the mutation
        console.error('CanisterCostStep: Unexpected result format', result);
      }
    } catch (error) {
      console.error('CanisterCostStep: Error creating canister', error);
      // Error will be handled by the mutation's error state
    }
  }, [contractPointer, displayCost, allowanceInfo, mutations.createCanister, user?.principal]);

  const canCreate = !isLoading && 
                   displayCost && 
                   cyclesBalance !== undefined && 
                   hasSufficientBalance(displayCost) && 
                   !canisterExists &&
                   !mutations.createCanister.isPending;

  // Format cycles for display (cycles typically have 12 decimals)
  const formatCyclesDisplay = (amount: bigint): string => {
    return formatCycles(amount);
  };

  // Rough estimate to convert cycles to ICP for comparison
  const cyclesToICP = (cycles: bigint): string => {
    // Rough estimate: 1 ICP ≈ 1 trillion cycles
    const icpAmount = Number(cycles) / 1_000_000_000_000;
    return icpAmount.toFixed(6);
  };

  // Compact view for cleaner status display
  if (compact) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Status</h3>
          <p className="text-gray-600">
            Current status of your NFT canister on the Internet Computer.
          </p>
        </div>

        {hasError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Error: {(() => {
                try {
                  if (costError instanceof Error) return costError.message;
                  if (balanceError instanceof Error) return balanceError.message;
                  if (existingError instanceof Error) return existingError.message;
                  if (costError) return String(costError);
                  if (balanceError) return String(balanceError);
                  if (existingError) return String(existingError);
                  return 'Unknown error occurred';
                } catch (e) {
                  console.error('Error formatting error message:', e, { costError, balanceError, existingError });
                  return 'Error formatting error message';
                }
              })()}
            </p>
          </div>
        )}

        {mutations.createCanister.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Canister creation failed: {mutations.createCanister.error instanceof Error 
                ? mutations.createCanister.error.message 
                : String(mutations.createCanister.error)}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-6">
            <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading canister information...</p>
          </div>
        ) : canisterExists ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-green-800">
                  ✅ ckNFT Canister Ready
                </h4>
                <p className="text-xs text-green-600 font-mono mt-1">
                  {displayCanisterId()}
                </p>
              </div>
            </div>
          </div>
        ) : displayCost ? (
          <div className="space-y-3">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Canister Creation</span>
                <div className="text-right">
                  <span className="text-sm font-medium">{formatCyclesDisplay(displayCost)}</span>
                  <p className="text-xs text-gray-500">≈ {cyclesToICP(displayCost)} ICP</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <span className="text-sm text-gray-700">Your Balance</span>
                <div className="text-right">
                  {isLoadingBalance ? (
                    <span className="text-sm text-gray-500">Loading...</span>
                  ) : cyclesBalance !== undefined ? (
                    <>
                      <span className={clsx(
                        "text-sm font-medium",
                        hasSufficientBalance(displayCost) ? "text-green-600" : "text-red-600"
                      )}>
                        {formatCyclesDisplay(cyclesBalance)}
                      </span>
                      <p className="text-xs text-gray-500">≈ {cyclesToICP(cyclesBalance)} ICP</p>
                    </>
                  ) : (
                    <span className="text-sm text-red-600">Unable to load</span>
                  )}
                </div>
              </div>
            </div>

            {canCreate && (
              <button
                onClick={handleCreateCanister}
                disabled={!canCreate || mutations.createCanister.isPending}
                className={clsx(
                  "w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  canCreate && !mutations.createCanister.isPending
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                )}
              >
                {mutations.createCanister.isPending ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  `Create Canister (${formatCyclesDisplay(displayCost)})`
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-sm text-gray-500">Select NFTs to see canister costs</p>
          </div>
        )}
      </div>
    );
  }

  // Full detailed view (original)
  console.log("collectionMetadata", collectionMetadata);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
        <p className="text-gray-600">
          Review the costs for creating your NFT canisters on the Internet Computer.
        </p>
      </div>

      {hasError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Error loading information: {(() => {
              try {
                if (costError instanceof Error) return costError.message;
                if (balanceError instanceof Error) return balanceError.message;
                if (existingError instanceof Error) return existingError.message;
                if (costError) return String(costError);
                if (balanceError) return String(balanceError);
                if (existingError) return String(existingError);
                return 'Unknown error occurred';
              } catch (e) {
                console.error('Error formatting error message:', e, { costError, balanceError, existingError });
                return 'Error formatting error message';
              }
            })()}
          </p>
        </div>
      )}

      {/* Show creation error if any */}
      {mutations.createCanister.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Canister creation failed: {mutations.createCanister.error instanceof Error 
              ? mutations.createCanister.error.message 
              : String(mutations.createCanister.error)}
          </p>
        </div>
      )}

      {/* Show success message if canister was just created (but don't show if canister already exists) */}
      {mutations.createCanister.isSuccess && !canisterExists && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ Canister created successfully! Refreshing canister information...
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading canister information and your balance...</p>
        </div>
      ) : canisterExists ? (
        /* Canister already exists */
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-green-800 mb-1">
                  ckNFT Canister Already Exists
                </h4>
                <p className="text-sm text-green-700 mb-2">
                  A canister for this contract already exists on the Internet Computer.
                </p>
                <p className="text-xs text-green-600 font-mono mb-3">
                  Canister ID: {displayCanisterId()}
                </p>
                
                {/* Collection Metadata */}
                {isLoadingCollection ? (
                  <div className="mt-2 p-2 bg-green-100 rounded text-xs">
                    <div className="animate-pulse text-green-700">Loading collection metadata...</div>
                  </div>
                ) : collectionError ? (
                  <div className="mt-2 p-2 bg-yellow-100 border border-yellow-200 rounded text-xs">
                    <div className="text-yellow-700">Unable to load collection metadata</div>
                  </div>
                ) : collectionMetadata ? (
                  <div className="mt-2 p-3 bg-green-100 border border-green-200 rounded text-sm">
                    {/* Check if we have any actual metadata values (not all null) */}
                    {collectionMetadata.name || collectionMetadata.symbol || collectionMetadata.description || 
                     collectionMetadata.totalSupply !== null || collectionMetadata.supplyCap !== null || 
                     collectionMetadata.royalties ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {collectionMetadata.name && (
                          <div>
                            <span className="font-medium text-green-800">Name:</span>
                            <span className="ml-1 text-green-700">{collectionMetadata.name}</span>
                          </div>
                        )}
                        {collectionMetadata.symbol && (
                          <div>
                            <span className="font-medium text-green-800">Symbol:</span>
                            <span className="ml-1 text-green-700">{collectionMetadata.symbol}</span>
                          </div>
                        )}
                        {collectionMetadata.description && (
                          <div className="md:col-span-2">
                            <span className="font-medium text-green-800">Description:</span>
                            <p className="ml-1 text-green-700 text-xs mt-1">{collectionMetadata.description}</p>
                          </div>
                        )}
                        {collectionMetadata.totalSupply !== null && collectionMetadata.totalSupply !== undefined && (
                          <div>
                            <span className="font-medium text-green-800">Total Supply:</span>
                            <span className="ml-1 text-green-700">{String(collectionMetadata.totalSupply)}</span>
                          </div>
                        )}
                        {collectionMetadata.supplyCap !== null && collectionMetadata.supplyCap !== undefined && (
                          <div>
                            <span className="font-medium text-green-800">Supply Cap:</span>
                            <span className="ml-1 text-green-700">{String(collectionMetadata.supplyCap)}</span>
                          </div>
                        )}
                        {collectionMetadata.royalties && (
                          <div>
                            <span className="font-medium text-green-800">Royalties:</span>
                            <span className="ml-1 text-green-700">{(Number(collectionMetadata.royalties) / 100).toFixed(2)}%</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-amber-700 mb-2">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">Canister Metadata Not Yet Initialized</span>
                        </div>
                        <p className="text-xs text-amber-600 mt-1 ml-6">
                          This canister exists but its collection metadata hasn't been set up yet. 
                          The metadata will be populated during the first NFT bridging operation.
                        </p>
                      </div>
                    )}
                    
                    {/* Debug: Show raw metadata for troubleshooting */}
                    {collectionMetadata.raw && (
                      <details className="mt-3 p-2 bg-gray-100 rounded">
                        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                          🔍 Debug: Raw Metadata (Click to expand)
                        </summary>
                        <pre className="mt-2 text-xs text-gray-700 overflow-x-auto">
                          {JSON.stringify(collectionMetadata.raw, (_key, value) => {
                            if (typeof value === 'bigint') return `BigInt(${value.toString()})`;
                            return value;
                          }, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                    <div className="text-gray-600">No collection metadata available</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>No additional costs required!</strong> Since the canister already exists, 
              you can proceed directly to bridge your NFTs without paying canister creation fees.
            </p>
          </div>
        </div>
      ) : displayCost ? (
        /* Need to create canister */
        <div className="space-y-4">
          {/* Cost Information */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Canister Creation Cost</span>
                <div className="text-right">
                  <span className="font-medium">{formatCyclesDisplay(displayCost)} Cycles</span>
                  <p className="text-xs text-gray-500">≈ {cyclesToICP(displayCost)} ICP</p>
                </div>
              </div>
              
              {/* Current Balance */}
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-gray-700">Your Cycles Balance</span>
                <div className="text-right">
                  {isLoadingBalance ? (
                    <span className="text-gray-500">Loading...</span>
                  ) : cyclesBalance !== undefined ? (
                    <>
                      <span className={clsx(
                        "font-medium",
                        hasSufficientBalance(displayCost) ? "text-green-600" : "text-red-600"
                      )}>
                        {formatCyclesDisplay(cyclesBalance)} Cycles
                      </span>
                      <p className="text-xs text-gray-500">≈ {cyclesToICP(cyclesBalance)} ICP</p>
                    </>
                  ) : (
                    <span className="text-red-600">Unable to load</span>
                  )}
                </div>
              </div>

              {/* Sufficient Balance Check */}
              {cyclesBalance !== undefined && displayCost && (
                <div className="border-t pt-3">
                  {hasSufficientBalance(displayCost) ? (
                    <div className="flex items-center text-green-700">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Sufficient balance available</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center text-red-700">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">
                          Insufficient balance (need {formatCyclesDisplay(displayCost - cyclesBalance)} more cycles)
                        </span>
                      </div>
                      <p className="text-xs text-red-600">
                        You need to top up your cycles balance before proceeding.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cycles Approval Status */}
          {displayCost && (
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Existing Approval</span>
                  <div className="text-right">
                    {isLoadingAllowance ? (
                      <span className="text-gray-500">Checking...</span>
                    ) : allowanceInfo ? (
                      allowanceInfo.isSufficient && !allowanceInfo.isExpired ? (
                        <div className="flex items-center text-green-600">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium">Approved</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-600">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium">
                            {allowanceInfo.isExpired ? 'Expired' : 'Insufficient'}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center text-red-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">None</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Allowance Details */}
                {allowanceInfo && (
                  <div className="text-xs text-gray-600 border-t pt-2">
                    <div className="flex justify-between">
                      <span>Current Allowance:</span>
                      <span className="font-mono">{formatCycles(allowanceInfo.allowance)} Cycles</span>
                    </div>
                    {allowanceInfo.expires_at && (
                      <div className="flex justify-between mt-1">
                        <span>Expires:</span>
                        <span className="font-mono">
                          {new Date(Number(allowanceInfo.expires_at) / 1000000).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Approval Button */}
                {displayCost && (!allowanceInfo?.isSufficient || allowanceInfo?.isExpired) && (
                  <div className="border-t pt-3">
                    <button
                      onClick={async () => {
                        if (!displayCost) return;
                        try {
                          const orchestratorPrincipal = Principal.fromText(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai');
                          const approvalAmount = (displayCost * BigInt(110)) / BigInt(100); // 110% of required
                          const expiresAt = BigInt(Date.now() * 1000000) + BigInt(24 * 60 * 60 * 1000000000); // 1 day
                          
                          await approveMutation.mutateAsync({
                            fee: [],
                            memo: [],
                            from_subaccount: [],
                            created_at_time: [],
                            amount: approvalAmount,
                            expected_allowance: [],
                            expires_at: [expiresAt],
                            spender: {
                              owner: orchestratorPrincipal,
                              subaccount: []
                            }
                          });
                        } catch (error) {
                          console.error('Manual approval failed:', error);
                        }
                      }}
                      disabled={isLoadingApprove}
                      className={clsx(
                        "w-full px-3 py-2 text-sm rounded-md font-medium transition-colors",
                        isLoadingApprove
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-amber-600 text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                      )}
                    >
                      {isLoadingApprove ? 'Approving...' : 'Pre-approve Cycles'}
                    </button>
                    
                    {approveError && (
                      <p className="text-xs text-red-600 mt-1">
                        Approval failed: {approveError instanceof Error ? approveError.message : String(approveError)}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-1">
                      This will approve 110% of the required amount for future canister creations.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create Canister Button */}
          {canCreate && (
            <button
              onClick={handleCreateCanister}
              disabled={!canCreate || mutations.createCanister.isPending}
              className={clsx(
                "w-full px-4 py-3 rounded-lg font-medium transition-colors",
                canCreate && !mutations.createCanister.isPending
                  ? "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              )}
            >
              {mutations.createCanister.isPending ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Creating Canister...
                </div>
              ) : (
                `Create ckNFT Canister (${formatCyclesDisplay(displayCost)} Cycles)`
              )}
            </button>
          )}
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>What are cycles?</strong> Cycles are the unit of payment for computation and storage on the Internet Computer.
              This cost covers creating your NFT canister where your bridged NFTs will be securely stored and managed on-chain.
            </p>
          </div>

          {/* Instructions for topping up if needed */}
          {cyclesBalance !== undefined && displayCost && !hasSufficientBalance(displayCost) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 mb-2">
                <strong>Need more cycles?</strong> You can top up your cycles balance by:
              </p>
              <ul className="text-xs text-amber-700 space-y-1 ml-4">
                <li>• Converting ICP to cycles through the NNS</li>
                <li>• Using a cycles wallet or faucet</li>
                <li>• Having someone transfer cycles to your account</li>
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Select NFTs to see canister creation costs</p>
        </div>
      )}
    </div>
  );
}
