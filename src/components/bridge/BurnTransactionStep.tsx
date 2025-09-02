import { useState } from 'react';
import { ethers } from 'ethers';
import { Loader2, AlertCircle, CheckCircle, ExternalLink, ArrowLeft } from 'lucide-react';
import { useMetaMask } from '../../hooks/useEVM';
import { useAuth } from '../../hooks/useAuth';
import { use99Mutations } from '../../hooks/use99Mutations';
import type { SelectedNFT } from './NFTSelectionStep';
import type { BurnCosts } from './BurnCostStep';
import type { Network } from '../../declarations/orchestrator/orchestrator.did';

// Import the ICRC99NFT ABI for ERC721 operations
import { abi as ICRC99NFT_ABI } from '/Users/afat/Dropbox/development/ICDevs/projects/icrc99-orchestrator/sample-nfts/packages/hardhat/artifacts/contracts/ICRC99NFT.sol/ICRC99NFT.json';

export interface BurnTransactionStepProps {
  selectedNFTs: SelectedNFT[];
  targetNetwork: Network | null;
  costs: BurnCosts | null;
  onTransactionComplete: (txHash?: string) => void;
  onTransactionError: (error: string) => void;
  onBack?: () => void; // Optional back navigation
}

interface BurnState {
  status: 'idle' | 'transferring' | 'confirming' | 'reminting' | 'completed' | 'failed';
  currentStep: string;
  evmTxHashes: string[];
  mintResults: any[];
  error?: string;
  currentNFTIndex: number;
  totalNFTs: number;
}

export function BurnTransactionStep({
  selectedNFTs,
  targetNetwork,
  costs,
  onTransactionComplete,
  onTransactionError,
  onBack,
}: BurnTransactionStepProps) {
  const [burnState, setBurnState] = useState<BurnState>({ 
    status: 'idle',
    currentStep: '',
    evmTxHashes: [],
    mintResults: [],
    currentNFTIndex: 0,
    totalNFTs: selectedNFTs.length
  });
  
  const { activeAddress, chainId } = useMetaMask();
  const { user } = useAuth();
  const mutations = use99Mutations(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai');

  // For burn operations, we handle multiple NFTs
  const totalNFTs = selectedNFTs.length;

  const getChainExplorerUrl = (txHash: string): string => {
    switch (chainId) {
      case 1: return `https://etherscan.io/tx/${txHash}`;
      case 137: return `https://polygonscan.com/tx/${txHash}`;
      case 56: return `https://bscscan.com/tx/${txHash}`;
      case 42161: return `https://arbiscan.io/tx/${txHash}`;
      case 10: return `https://optimistic.etherscan.io/tx/${txHash}`;
      case 8453: return `https://basescan.org/tx/${txHash}`;
      case 31337: case 1338: return `http://localhost:8545/tx/${txHash}`;
      default: return `https://etherscan.io/tx/${txHash}`;
    }
  };

  const executeBurnProcess = async () => {
    if (!costs?.nftDetails || costs.nftDetails.length === 0 || !window.ethereum || !user?.principal || !targetNetwork) {
      const error = 'Missing required data for burn execution';
      setBurnState(prev => ({ ...prev, status: 'failed', error }));
      onTransactionError(error);
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      console.log('🔥 Starting complete burn process for', costs.nftDetails.length, 'NFTs');

      setBurnState(prev => ({ 
        ...prev, 
        status: 'transferring',
        currentStep: 'Preparing EVM transfers...',
        totalNFTs: costs.nftDetails!.length
      }));

      // Step 1: Execute EVM transfers to burn addresses
      const evmTxHashes: string[] = [];

      for (let i = 0; i < costs.nftDetails.length; i++) {
        const nftDetail = costs.nftDetails[i];
        
        setBurnState(prev => ({ 
          ...prev, 
          currentStep: `Transferring NFT ${i + 1}/${costs.nftDetails!.length} to burn address...`,
          currentNFTIndex: i
        }));

        console.log(`🔥 Transferring NFT ${nftDetail.nft.tokenId} to burn address:`, nftDetail.burnFundingAddress);

        // Create contract instance
        const contract = new ethers.Contract(nftDetail.nft.contractAddress, ICRC99NFT_ABI, signer);

        // Execute the transfer
        const tx = await contract.safeTransferFrom(
          activeAddress,
          nftDetail.burnFundingAddress,
          BigInt(nftDetail.nft.tokenId)
        );

        console.log(`✅ NFT ${nftDetail.nft.tokenId} transfer tx sent:`, tx.hash);
        evmTxHashes.push(tx.hash);

        setBurnState(prev => ({ 
          ...prev, 
          status: 'confirming',
          currentStep: `Waiting for NFT ${i + 1}/${costs.nftDetails!.length} transfer confirmation...`,
          evmTxHashes
        }));

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`✅ NFT ${nftDetail.nft.tokenId} transfer confirmed:`, receipt);
      }

      // Step 2: Execute IC mint operations using the remint process
      setBurnState(prev => ({ 
        ...prev, 
        status: 'reminting',
        currentStep: 'Starting IC remint operations...'
      }));

      // Process each NFT mint request using the REMOTE contract reference
      const mintResults: any[] = [];
      for (let i = 0; i < costs.nftDetails.length; i++) {
        const nftDetail = costs.nftDetails[i];
        
        setBurnState(prev => ({ 
          ...prev, 
          currentStep: `Reminting ckNFT ${i + 1}/${costs.nftDetails!.length} on IC...`,
          currentNFTIndex: i
        }));

        // Create mint request for this NFT using REMOTE contract details
        // This follows the same pattern as remintCkNFT in the main App.tsx
        const mintRequest = {
          nft: {
            tokenId: BigInt(nftDetail.nft.tokenId),
            contract: nftDetail.nft.contractAddress, // This should be the remote contract address
            network: targetNetwork!, // This should be the remote network where the cast NFT exists
          },
          resume: [] as [], // Empty for new mint
          mintToAccount: { 
            owner: user.principal!, 
            subaccount: [] as [] 
          },
          spender: [] as [], // Empty optional
        };

        console.log('🎯 Executing IC remint for NFT using remote contract reference:', {
          mintRequest,
          remoteContractAddress: nftDetail.nft.contractAddress,
          targetNetwork: targetNetwork,
          note: 'This follows the remintCkNFT pattern from App.tsx'
        });

        // Execute the mint operation using the same pattern as remintCkNFT
        const mintResult = await mutations.mintFromEVM.mutateAsync({
          request: mintRequest,
          requiredCycles: nftDetail.cyclesCost,
          skipApproval: true, // We already approved payment in the cost step
        });

        console.log(`✅ IC remint completed for NFT ${nftDetail.nft.tokenId} using remote contract:`, mintResult);
        mintResults.push(mintResult);
      }

      setBurnState(prev => ({ 
        ...prev, 
        status: 'completed',
        currentStep: 'Burn completed successfully!',
        evmTxHashes,
        mintResults
      }));

      console.log('🎉 Complete burn process finished successfully:', {
        nftsProcessed: costs.nftDetails.length,
        evmTransactions: evmTxHashes,
        mintResults,
      });

      onTransactionComplete(evmTxHashes[0]); // Pass the first transaction hash

    } catch (error: any) {
      console.error('❌ Error during burn execution:', error);
      
      let errorMessage = 'Failed to execute burn operation';
      
      if (error.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Burn operation cancelled by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas fees';
      } else if (error.message?.includes('execution reverted')) {
        errorMessage = 'Transaction reverted. NFT may not be owned by your address or already transferred.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setBurnState(prev => ({ 
        ...prev, 
        status: 'failed', 
        error: errorMessage 
      }));
      onTransactionError(errorMessage);
    }
  };

  const retry = () => {
    setBurnState({ 
      status: 'idle',
      currentStep: '',
      evmTxHashes: [],
      mintResults: [],
      currentNFTIndex: 0,
      totalNFTs: selectedNFTs.length
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Execute Complete Burn Process</h3>
        <p className="text-gray-600">
          Transfer your cast NFTs to burn addresses and remint them as ckNFTs on the Internet Computer.
        </p>
      </div>

      {/* NFT Details */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">Burn Process Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total NFTs:</span>
            <span className="font-medium text-gray-800">{totalNFTs}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Your Address:</span>
            <span className="font-mono text-gray-800">
              {activeAddress?.slice(0, 6)}...{activeAddress?.slice(-4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Process:</span>
            <span className="text-gray-800">EVM Transfer → IC Remint</span>
          </div>
        </div>
      </div>

      {/* Execution Summary - only show in idle state */}
      {burnState.status === 'idle' && costs && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">Ready to Execute</h4>
          <div className="space-y-2 text-sm text-green-700">
            <div className="flex items-center justify-between">
              <span>✅ Cycles Payment:</span>
              <span className="font-medium">{(Number(costs.cyclesCost) / 1_000_000_000_000).toFixed(2)} T approved</span>
            </div>
            <div className="flex items-center justify-between">
              <span>✅ Gas Estimation:</span>
              <span className="font-medium">{costs.gasEstimate.toString()} gas (~{(Number(costs.ethCost) / 1e18).toFixed(4)} ETH)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>✅ Target Addresses:</span>
              <span className="font-medium">{selectedNFTs.length} burn addresses calculated</span>
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">
            Click "Execute Burn Process" below to start the irreversible burn and remint operation.
          </p>
        </div>
      )}

      {/* Progress Display */}
      {burnState.status !== 'idle' && burnState.status !== 'failed' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center mb-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                Processing NFT {burnState.currentNFTIndex + 1} of {burnState.totalNFTs}
              </p>
              <p className="text-xs text-blue-600">{burnState.currentStep}</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-blue-100 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((burnState.currentNFTIndex + (burnState.status === 'completed' ? 1 : 0)) / burnState.totalNFTs) * 100}%` 
              }}
            ></div>
          </div>
          
          {/* EVM Transaction links */}
          {burnState.evmTxHashes.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-blue-700 mb-1">EVM Transactions:</p>
              <div className="space-y-1">
                {burnState.evmTxHashes.map((txHash, index) => (
                  <a
                    key={txHash}
                    href={getChainExplorerUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-xs text-blue-700 hover:text-blue-800"
                  >
                    NFT {index + 1}: {txHash.slice(0, 8)}...{txHash.slice(-6)} 
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction Status */}
      <div className="space-y-4">
        {burnState.status === 'idle' && (
          <div className="space-y-4">
            {costs?.hasInsufficientEthBalance ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="font-medium text-red-800">Cannot Execute - Insufficient ETH</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  You need {costs ? ethers.formatEther(costs.ethCost) : '0'} ETH for gas fees but only have {costs?.userEthBalance ? ethers.formatEther(costs.userEthBalance) : '0'} ETH.
                  Please add more ETH to your wallet before proceeding.
                </p>
              </div>
            ) : (
              <button
                onClick={executeBurnProcess}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                🔥 Execute Complete Burn Process ({totalNFTs} NFT{totalNFTs > 1 ? 's' : ''})
              </button>
            )}
          </div>
        )}

        {burnState.status === 'completed' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center mb-3">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-800">🎉 Burn Process Completed Successfully!</p>
                <p className="text-xs text-green-600">
                  All {burnState.totalNFTs} NFT{burnState.totalNFTs > 1 ? 's' : ''} burned and reminted as ckNFTs on IC
                </p>
              </div>
            </div>
            
            {/* Results Summary */}
            <div className="mt-3 space-y-2">
              <p className="text-xs text-green-700 font-medium">Process Summary:</p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-green-600">EVM Transfers:</span>
                  <span className="ml-1 text-green-800">{burnState.evmTxHashes.length} completed</span>
                </div>
                <div>
                  <span className="text-green-600">IC Remints:</span>
                  <span className="ml-1 text-green-800">{burnState.mintResults.length} completed</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {burnState.status === 'failed' && (
          <div className="space-y-3">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Burn Process Failed</p>
                  <p className="text-xs text-red-600 mt-1">{burnState.error}</p>
                </div>
              </div>
            </div>
            
            {/* Error Recovery Guide */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">Troubleshooting Tips:</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Check if you have sufficient ETH for gas fees in your wallet</li>
                <li>Verify that your cycles allowance hasn't expired</li>
                <li>Ensure MetaMask is connected and on the correct network</li>
                <li>Try refreshing costs if gas prices have changed significantly</li>
                <li>Check if the NFT is still in your wallet (not already transferred)</li>
              </ul>
              <p className="text-xs text-blue-600 mt-2">
                Use the "Back to Costs" button to recalculate costs or approve new allowances.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Warning Message */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>⚠️ Important:</strong> This process will permanently transfer your cast NFTs to burn addresses 
          on the remote EVM chain and remint them as ckNFTs on the Internet Computer. This action is irreversible. 
          Make sure you have sufficient ETH for gas fees and cycles are approved for IC operations.
        </p>
      </div>

      {/* Navigation and Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            disabled={burnState.status === 'transferring' || burnState.status === 'confirming' || burnState.status === 'reminting'}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Costs
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {burnState.status === 'idle' && (
            <button
              onClick={executeBurnProcess}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              Execute Burn Process
            </button>
          )}

          {burnState.status === 'failed' && (
            <div className="flex space-x-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Back to Costs
                </button>
              )}
              <button
                onClick={retry}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
              >
                Retry Burn
              </button>
            </div>
          )}

          {burnState.status === 'completed' && burnState.evmTxHashes.length > 0 && (
            <a
              href={`https://etherscan.io/tx/${burnState.evmTxHashes[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              View on Etherscan
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
