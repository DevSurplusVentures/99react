import { useState, useEffect, useMemo } from 'react';
import { Principal } from '@dfinity/principal';
import clsx from 'clsx';
import { useMetaMask } from '../../hooks/useEVM';
import { useSolana } from '../../hooks/useSolana';
import { useAuth } from '../../hooks/useAuth';
import { useOrchestratorAllowance, use99Mutations } from '../../hooks/use99Mutations';
import { useFungibleToken } from '../../hooks/useFungibleToken';
import { createSolanaNetwork } from '../../types/solana';
import { solanaTokenIdFromMint } from '../../utils/solanaTokenId';
import type { SelectedNFT } from './NFTSelectionStep';
import type { SelectedSolanaNFT } from './SolanaNFTSelectionStep';

export type NetworkSource = 'evm' | 'solana';

export interface NFTMintEstimationStepProps {
  /** Network source: 'evm' for Ethereum/EVM chains, 'solana' for Solana */
  networkSource: NetworkSource;
  /** Selected NFTs to calculate mint costs for (EVM) */
  selectedNFTs?: SelectedNFT[];
  /** Selected Solana NFTs to calculate mint costs for */
  selectedSolanaNFTs?: SelectedSolanaNFT[];
  /** Current calculated mint costs */
  mintCosts: bigint | null;
  /** Callback when mint costs are calculated */
  onMintCostsCalculated: (costs: bigint) => void;
}

export function NFTMintEstimationStep({
  networkSource,
  selectedNFTs = [],
  selectedSolanaNFTs = [],
  mintCosts,
  onMintCostsCalculated,
}: NFTMintEstimationStepProps) {
  // Conditionally use network-specific hooks
  const { chainId } = useMetaMask();
  
  // Safely use Solana hook - it may not be available in all contexts (e.g., Storybook)
  let solanaWallet;
  try {
    solanaWallet = useSolana();
  } catch (error) {
    console.warn('Solana wallet provider not available:', error);
    solanaWallet = undefined;
  }
  
  const { user } = useAuth();
  
  // Safely access cluster with fallback
  const cluster = solanaWallet?.cluster ?? 'devnet';
  
  // Determine the active NFT list based on network source
  const activeNFTs = networkSource === 'evm' ? selectedNFTs : selectedSolanaNFTs;
  const nftCount = activeNFTs.length;
  
  // Theme colors based on network source
  const themeColor = networkSource === 'evm' ? 'blue' : 'purple';
  const bgColor = networkSource === 'evm' ? 'bg-blue-50' : 'bg-purple-50';
  const borderColor = networkSource === 'evm' ? 'border-blue-200' : 'border-purple-200';
  const textColor = networkSource === 'evm' ? 'text-blue-800' : 'text-purple-800';
  const primaryBtnColor = networkSource === 'evm' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700';
  const primaryRingColor = networkSource === 'evm' ? 'focus:ring-blue-500' : 'focus:ring-purple-500';
  
  // Use the enhanced fungible token hook for cycles ledger
  const CYCLES_LEDGER_CANISTER_ID = process.env.CYCLES_LEDGER_CANISTER_ID || 'um5iw-rqaaa-aaaaq-qaaba-cai';
  const cyclesToken = useFungibleToken(CYCLES_LEDGER_CANISTER_ID);
  const { useBalance, useApprove } = cyclesToken;
  
  // Get user's cycles balance
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

  // ICRC-99 mutations for getting mint costs
  const mutations = use99Mutations(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'uzt4z-lp777-77774-qaabq-cai');

  // Create mint requests for cost estimation
  const mintRequests = useMemo(() => {
    if (nftCount === 0 || !user?.principal) return [];
    
    // Create network variant based on source
    let network;
    if (networkSource === 'evm') {
      const effectiveChainId = chainId ?? 1;
      network = { Ethereum: [BigInt(effectiveChainId)] as [bigint] };
    } else {
      // Use createSolanaNetwork to get proper SolanaCluster variant
      const effectiveCluster = cluster ?? 'devnet';
      network = createSolanaNetwork(effectiveCluster);
    }

    // Map NFTs to mint requests based on network source
    if (networkSource === 'evm') {
      return selectedNFTs.map(nft => ({
        nft: {
          tokenId: BigInt(nft.tokenId),
          contract: nft.contractAddress,
          network,
        },
        resume: [] as [],
        mintToAccount: { owner: user.principal!, subaccount: [] as [] },
        spender: [] as [],
      }));
    } else {
      return selectedSolanaNFTs.map(nft => ({
        nft: {
          tokenId: solanaTokenIdFromMint(nft.mintAddress), // Convert Solana mint address to BigInt
          contract: nft.collection?.address || nft.mintAddress, // Use collection address as contract
          network,
        },
        resume: [] as [],
        mintToAccount: { owner: user.principal!, subaccount: [] as [] },
        spender: [] as [],
      }));
    }
  }, [networkSource, nftCount, chainId, cluster, selectedNFTs, selectedSolanaNFTs, user?.principal]);

  // Get mint cost estimation
  const [isGettingMintCost, setIsGettingMintCost] = useState(false);
  const [mintCostError, setMintCostError] = useState<string | null>(null);
  const [totalMintCost, setTotalMintCost] = useState<bigint | null>(null);

  useEffect(() => {
    if (mintRequests.length > 0 && !totalMintCost && !isGettingMintCost) {
      setIsGettingMintCost(true);
      setMintCostError(null);
      
      mutations.getMintCost.mutateAsync(mintRequests)
        .then(costs => {
          // Sum up all the costs (costs is array of bigint | null)
          let total = BigInt(0);
          for (const cost of costs) {
            if (cost !== null) {
              total += cost;
            }
          }
          setTotalMintCost(total);
          onMintCostsCalculated(total);
        })
        .catch(error => {
          console.error('Failed to get mint costs:', error);
          setMintCostError(error instanceof Error ? error.message : String(error));
        })
        .finally(() => {
          setIsGettingMintCost(false);
        });
    }
  }, [mintRequests, totalMintCost, isGettingMintCost, mutations.getMintCost, onMintCostsCalculated]);

  // Use the provided mint costs or the calculated ones
  const displayCost = mintCosts || totalMintCost;
  const isLoading = isGettingMintCost || isLoadingBalance;
  const hasError = mintCostError || balanceError;

  // Check the current allowance for the orchestrator
  const {
    data: allowanceInfo,
    isLoading: isLoadingAllowance
  } = useOrchestratorAllowance(displayCost || undefined);

  console.log('Allowance info:', allowanceInfo);

  // Rough estimate to convert cycles to ICP for comparison
  const cyclesToICP = (cycles: bigint): string => {
    const icpAmount = Number(cycles) / 1_000_000_000_000;
    return icpAmount.toFixed(6);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">NFT Mint Costs</h3>
        <p className="text-gray-600">
          Review the cycles needed to mint your selected NFTs on the Internet Computer.
        </p>
      </div>

      {hasError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Error loading mint costs: {hasError instanceof Error ? hasError.message : String(hasError)}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className={clsx("animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-4", `border-${themeColor}-600`)}></div>
          <p className="text-gray-600">Calculating mint costs for {nftCount} NFT{nftCount !== 1 ? 's' : ''}...</p>
        </div>
      ) : displayCost ? (
        <div className="space-y-4">
          {/* Cost Information */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Total Mint Cost ({nftCount} NFT{nftCount !== 1 ? 's' : ''})</span>
                <div className="text-right">
                  <span className="font-medium">{formatCycles(displayCost)} Cycles</span>
                  <p className="text-xs text-gray-500">≈ {cyclesToICP(displayCost)} ICP</p>
                </div>
              </div>
              
              {/* Per NFT breakdown */}
              {nftCount > 1 && (
                <div className="text-xs text-gray-600 border-t pt-2">
                  <div className="flex justify-between">
                    <span>Per NFT Cost:</span>
                    <span className="font-mono">≈ {formatCycles(displayCost / BigInt(nftCount))} Cycles</span>
                  </div>
                </div>
              )}
              
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
                        {formatCycles(cyclesBalance)} Cycles
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
                          Insufficient balance (need {formatCycles(displayCost - cyclesBalance)} more cycles)
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
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Mint Approval Status</span>
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
                      <span className="text-sm font-medium">Not Approved</span>
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
                        {new Date(Number(allowanceInfo.expires_at) / 1000000).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Approval Button */}
              {displayCost && (!allowanceInfo?.isSufficient || allowanceInfo?.isExpired) && (
                <div className="border-t pt-3">
                  <button
                    onClick={async () => {
                      if (!displayCost) return;
                      try {
                        const orchestratorPrincipal = Principal.fromText(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'uzt4z-lp777-77774-qaabq-cai');
                        const approvalAmount = (displayCost * BigInt(120)) / BigInt(100); // 120% of required (matches bridge execution)
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
                        console.error('Mint approval failed:', error);
                      }
                    }}
                    disabled={isLoadingApprove}
                    className={clsx(
                      "w-full px-3 py-2 text-sm rounded-md font-medium transition-colors",
                      isLoadingApprove
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : `${primaryBtnColor} text-white focus:outline-none focus:ring-2 ${primaryRingColor} focus:ring-offset-2`
                    )}
                  >
                    {isLoadingApprove ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Approving...
                      </div>
                    ) : (
                      `Approve Cycles for Minting (${formatCycles((displayCost * BigInt(110)) / BigInt(100))} Cycles)`
                    )}
                  </button>
                  
                  {approveError && (
                    <p className="text-xs text-red-600 mt-1">
                      Approval failed: {approveError instanceof Error ? approveError.message : String(approveError)}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">
                    This will approve 110% of the required amount for minting operations.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className={clsx("p-4 border rounded-lg", bgColor, borderColor)}>
            <p className={clsx("text-sm", textColor)}>
              <strong>About NFT minting costs:</strong> Each NFT requires cycles to mint on the Internet Computer. 
              This covers the computational cost of creating the NFT, storing metadata, and updating the canister state.
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
          <p className="text-gray-500">Select NFTs to see minting costs</p>
        </div>
      )}
    </div>
  );
}
