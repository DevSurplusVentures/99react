import { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { Principal } from '@dfinity/principal';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthenticatedAgent } from '../../provider/AgentProvider';
import { useAnonymousActor } from '../../hooks/useActor';
import { useICRC99Support } from '../../hooks/useICRC99Support';
import { use99Mutations } from '../../hooks/use99Mutations';
import { useSolana } from '../../hooks/useSolana';
import type { CastRequest as CkNFTCastRequest, Network as CkNFTNetwork } from '../../declarations/ckNFT/ckNFT.did';
import { BridgeProgress, BridgeDirection, BridgeStep, createBridgeProgress, updateBridgeStep, retryBridgeStep } from '../../lib/bridgeProgress';
import { BridgeChecklist } from '../BridgeChecklist';
import type { Network as OrchestratorNetwork, ContractPointer, SolanaCluster } from '../../declarations/orchestrator/orchestrator.did';
import { idlFactory as orchestratorIdlFactory } from '../../declarations/orchestrator/orchestrator.did.js';
import type { _SERVICE as OrchestratorService } from '../../declarations/orchestrator/orchestrator.did';
import type { NFTMetadata } from '../../core/NFTMetadata';

// Step components
import { ICNFTSelectionStep } from './ICNFTSelectionStep';
import { SolanaNetworkSelectionStep } from './SolanaNetworkSelectionStep';
import { SolanaExportCostStep } from './SolanaExportCostStep';

type SolanaExportWizardStep = 'select-ic-nft' | 'network' | 'costs' | 'export' | 'complete';

export interface SelectedICNFT {
  tokenId: string;
  canisterId: string;
  metadata?: NFTMetadata;
  owner: Principal;
  image?: string;
  name?: string;
  description?: string;
}

export interface SolanaNetworkInfo {
  name: string;
  endpoint: string;
  deployed: boolean;
  collectionAddress?: string;
  network: CkNFTNetwork; // Use ckNFT Network type for cast requests
}

export interface SolanaExportWizardProps {
  /** The source ckNFT canister ID to export from */
  sourceCanisterId?: string;
  /** Callback when the export process completes */
  onComplete?: (result: SolanaExportResult) => void;
  /** Callback when the wizard is cancelled */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Show the wizard in a modal */
  modal?: boolean;
  /** Initial step to show (for demos/testing) */
  initialStep?: SolanaExportWizardStep;
}

export interface SolanaExportResult {
  success: boolean;
  icTransactionHash?: string;
  solanaTransactionHash?: string;
  collectionAddress?: string;
  tokenIds?: string[];
  mintAddresses?: string[]; // Solana mint addresses for each exported NFT
  error?: string;
}

export function SolanaExportWizard({
  sourceCanisterId,
  onComplete,
  onCancel,
  className,
  modal = false,
  initialStep,
}: SolanaExportWizardProps) {
  const [currentStep, setCurrentStep] = useState<SolanaExportWizardStep>(initialStep || 'select-ic-nft');
  const [selectedICNFTs, setSelectedICNFTs] = useState<SelectedICNFT[]>([]);
  const [targetNetwork, setTargetNetwork] = useState<SolanaNetworkInfo | null>(null);
  const [exportCosts, setExportCosts] = useState<bigint | null>(null);
  const [isExportReady, setIsExportReady] = useState(false);
  
  // Store the active canister ID for ICRC-99 checking
  const [activeCanisterId, setActiveCanisterId] = useState<string | null>(sourceCanisterId || null);

  // Store the source contract pointer determined from ICRC-99 check
  const [sourceContractPointer, setSourceContractPointer] = useState<ContractPointer | null>(null);
  
  const [exportResult, setExportResult] = useState<SolanaExportResult | null>(null);
  const [progress, setProgress] = useState<BridgeProgress | null>(null);
  const [hasError, setHasError] = useState(false);

  // Hooks
  const { wallet: _wallet, connected, publicKey } = useSolana();
  const { user } = useAuth();
  const authenticatedAgent = useAuthenticatedAgent();
  
  // Check ICRC-99 support for the active canister
  const icrc99Support = useICRC99Support(activeCanisterId);
  
  // Debug logging for ICRC-99 support
  useEffect(() => {
    console.log('🔍 SolanaExportWizard ICRC-99 support state:', {
      activeCanisterId,
      icrc99Support,
      sourceCanisterId,
    });
  }, [activeCanisterId, icrc99Support, sourceCanisterId]);

  // Update source contract pointer when ICRC-99 support status changes
  useEffect(() => {
    if (!activeCanisterId || icrc99Support.isLoading) {
      setSourceContractPointer(null);
      return;
    }

    if (icrc99Support.isSupported && icrc99Support.nativeChain) {
      console.log('✅ ICRC-99 supported, using native chain info as source pointer:', icrc99Support.nativeChain);
      setSourceContractPointer(icrc99Support.nativeChain);
    } else {
      console.log('🔄 ICRC-99 not supported, using IC network fallback for canister:', activeCanisterId);
      setSourceContractPointer({
        network: { IC: [] },
        contract: activeCanisterId,
      });
    }
  }, [activeCanisterId, icrc99Support.isLoading, icrc99Support.isSupported, icrc99Support.nativeChain]);
  
  // ICRC-99 mutations for real export operations
  const mutations = use99Mutations(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai');
  
  // Create unauthenticated orchestrator actor for polling
  const unauthenticatedOrchActor = useAnonymousActor<OrchestratorService>(
    process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai',
    orchestratorIdlFactory
  );

  // Progress management functions
  const createExportProgressState = useCallback((direction: BridgeDirection, needsDeployment: boolean) => {
    const customSteps: Omit<BridgeStep, 'status'>[] = [];
    
    // Only add deployment step if collection isn't already deployed
    if (needsDeployment) {
      customSteps.push({
        id: 'deploy-solana-collection',
        title: 'Deploy Solana Collection',
        description: 'Creating Metaplex NFT collection on Solana',
        estimatedDuration: 120,
        retryable: true,
        stage: 'contract',
      });
    }
    
    // Always need these steps
    customSteps.push(
      {
        id: 'approve-cycles-cast',
        title: 'Approve Cycles',
        description: 'Approving cycles for cast operations',
        estimatedDuration: 30,
        retryable: true,
        stage: 'preparation',
      },
      {
        id: 'cast-nfts',
        title: 'Cast NFTs to Solana',
        description: 'Exporting ckNFTs to Solana blockchain',
        estimatedDuration: 120,
        retryable: true,
        stage: 'execution',
      },
      {
        id: 'wait-solana-confirmation',
        title: 'Confirm Cast Completion',
        description: 'Polling cast status until NFTs are transferred and finalized on Solana',
        estimatedDuration: 180, // Can take up to 10 minutes
        retryable: false,
        stage: 'execution',
      }
    );
    
    const newProgress = createBridgeProgress(direction, customSteps);
    setProgress(newProgress);
    return newProgress;
  }, []);

  const updateProgressStep = useCallback((stepId: string, status: 'loading' | 'completed' | 'failed', error?: string, txHash?: string) => {
    if (!progress) return;
    const updatedProgress = updateBridgeStep(progress, stepId, {
      status,
      ...(error && { error }),
      ...(txHash && { txHash }),
    });
    setProgress(updatedProgress);
  }, [progress]);

  const retryProgressStep = useCallback((stepId: string) => {
    if (!progress) return;
    const updatedProgress = retryBridgeStep(progress, stepId);
    setProgress(updatedProgress);
  }, [progress]);

  // Initialize progress when component mounts
  useEffect(() => {
    // Don't create progress until we know if deployment is needed
    // Progress will be created in handleStartExport when we have all the info
  }, []);

  // Helper to convert network name to SolanaCluster variant
  const getSolanaCluster = (networkName: string): SolanaCluster => {
    switch (networkName.toLowerCase()) {
      case 'mainnet-beta':
      case 'mainnet':
        return { Mainnet: null };
      case 'devnet':
        return { Devnet: null };
      case 'testnet':
        return { Testnet: null };
      case 'localnet':
      case 'localhost':
        // Use Custom with the full RPC URL for localnet
        // This must match the orchestrator's MapNetwork configuration
        return { Custom: "http://127.0.0.1:8899" };
      default:
        return { Custom: networkName };
    }
  };

  // Poll for collection address after deployment
  const pollForCollectionAddress = useCallback(async (txHash: string, maxAttempts: number = 10, intervalMs: number = 5000) => {
    console.log('🔍 Polling for deployed Solana collection address...', { txHash, maxAttempts, intervalMs });
    
    let attempts = 0;
    
    return new Promise<void>((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        attempts++;
        console.log(`🔍 Polling attempt ${attempts}/${maxAttempts} for collection address...`);

        try {
          if (unauthenticatedOrchActor && selectedICNFTs[0]?.canisterId && targetNetwork) {
            try {
              const solanaCluster = getSolanaCluster(targetNetwork.name);
              const contractPointer: ContractPointer = {
                contract: selectedICNFTs[0].canisterId,
                network: { Solana: [solanaCluster] }, // Proper tuple format
              };

              const canisterIdResult = await unauthenticatedOrchActor.get_ck_nft_canister([contractPointer]);
              
              if (Array.isArray(canisterIdResult) && canisterIdResult[0] && canisterIdResult[0][0]) {
                const canisterId = canisterIdResult[0][0];
                console.log('✅ Found ckNFT canister:', canisterId.toString());
                
                const solanaNetwork: OrchestratorNetwork = { Solana: [getSolanaCluster(targetNetwork.name)] };
                const remoteResult = await unauthenticatedOrchActor.get_remote([[canisterId, solanaNetwork]]);
                
                if (Array.isArray(remoteResult) && remoteResult[0] && remoteResult[0][0]) {
                  const remoteContract = remoteResult[0][0];
                  const remoteAddress = remoteContract.address && remoteContract.address.length > 0 ? remoteContract.address[0] : null;
                  
                  if (remoteAddress) {
                    console.log('🎉 Found newly deployed Solana collection address:', remoteAddress);
                    
                    setTargetNetwork(prev => prev ? {
                      ...prev,
                      collectionAddress: remoteAddress,
                      deployed: true,
                    } : null);
                    
                    clearInterval(pollInterval);
                    resolve();
                    return;
                  }
                }
              }
            } catch (pollError) {
              console.warn(`⚠️ Polling attempt ${attempts} failed:`, pollError);
            }
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            console.warn('⏱️ Max polling attempts reached without finding collection address');
            reject(new Error('Failed to retrieve collection address after deployment'));
          }
        } catch (error) {
          console.error('Error in polling iteration:', error);
          clearInterval(pollInterval);
          reject(error);
        }
      }, intervalMs);
    });
  }, [selectedICNFTs, targetNetwork, unauthenticatedOrchActor]);

  // Main export execution function
  const handleStartExport = useCallback(async () => {
    console.log('🎯 handleStartExport called with:', {
      selectedICNFTs: selectedICNFTs.length,
      publicKey: publicKey?.toBase58(),
      userPrincipal: user?.principal,
      targetNetwork,
    });

    if (!selectedICNFTs.length || !publicKey || !user?.principal || !targetNetwork || !sourceContractPointer || !exportCosts) {
      console.warn('❌ Missing required data for export:', {
        selectedICNFTs: selectedICNFTs.length,
        publicKey: !!publicKey,
        userPrincipal: !!user?.principal,
        targetNetwork: !!targetNetwork,
        sourceContractPointer: !!sourceContractPointer,
        exportCosts: !!exportCosts,
      });
      return;
    }

    setCurrentStep('export');
    setHasError(false);
    createExportProgressState('ic-to-solana' as BridgeDirection, !targetNetwork.deployed);
    
    try {
      console.log(`🚀 Starting Solana export process for ${selectedICNFTs.length} ckNFT(s)`);
      console.log(`📋 Collection already deployed: ${targetNetwork.deployed}`);

      // Step 1: Deploy Solana collection (if needed)
      if (!targetNetwork.deployed) {
        updateProgressStep('deploy-solana-collection', 'loading');
        
        console.log('📦 Deploying Solana collection...');
        updateProgressStep('deploy-solana-collection', 'loading', 'Deploying Metaplex collection to Solana...');
        
        try {
          if (!sourceContractPointer) {
            throw new Error('Source contract pointer not available');
          }
          
          const solanaCluster = getSolanaCluster(targetNetwork.name);
          const solanaNetwork: OrchestratorNetwork = { Solana: [solanaCluster] };
          
          console.log('📝 Deploying Solana collection:', {
            sourceContract: sourceContractPointer,
            targetNetwork: solanaNetwork,
          });
          
          // Use orchestrator to deploy remote collection
          const deployResult = await mutations.createRemoteContract.mutateAsync({
            pointer: sourceContractPointer,
            network: solanaNetwork,
            gasPrice: 0n, // Solana doesn't use gas price like EVM
            gasLimit: 0n, // Solana doesn't use gas limit like EVM
            maxPriorityFeePerGas: 0n,
          });
          
          console.log('✅ Solana collection deployment initiated:', deployResult);
          
          // Extract transaction hash from deployment result
          let txHash: string | null = null;
          if (deployResult && typeof deployResult === 'object') {
            if ('Ok' in deployResult && typeof deployResult.Ok === 'string') {
              txHash = deployResult.Ok;
            } else if ('transactionHash' in deployResult) {
              txHash = (deployResult as any).transactionHash;
            }
          } else if (typeof deployResult === 'string') {
            txHash = deployResult;
          }
          
          if (txHash) {
            console.log('📋 Got deployment transaction hash:', txHash);
            await pollForCollectionAddress(txHash);
          } else {
            console.warn('⚠️ No transaction hash received from deployment');
            setTargetNetwork(prev => prev ? { ...prev, deployed: true } : null);
          }
          
        } catch (deployError) {
          console.error('❌ Solana collection deployment failed:', deployError);
          setHasError(true);
          updateProgressStep('deploy-solana-collection', 'failed', 
            deployError instanceof Error ? deployError.message : 'Collection deployment failed');
          return;
        }
        
        // Only mark deployment complete if we actually deployed
        updateProgressStep('deploy-solana-collection', 'completed');
      } else {
        console.log('✅ Using existing collection:', targetNetwork.collectionAddress);
      }

      // Step 2: Pre-approve cycles for all casting operations
      updateProgressStep('approve-cycles-cast', 'loading');
      
      try {
        if (!exportCosts) {
          throw new Error('Export costs not calculated');
        }

        console.log('🔋 Using pre-calculated export costs for cycle approval:', exportCosts.toString());

        const ckNFTCanisterId = selectedICNFTs[0]?.canisterId;
        if (!ckNFTCanisterId) {
          throw new Error('No ckNFT canister ID available');
        }

        // Note: Approval is already done in the costs step, so we can skip here
        console.log('✅ Cycles already approved in costs step');
        
      } catch (approvalError) {
        console.error('❌ Cycle approval verification failed:', approvalError);
        setHasError(true);
        updateProgressStep('approve-cycles-cast', 'failed',
          approvalError instanceof Error ? approvalError.message : 'Cycle approval failed');
        return;
      }
      
      updateProgressStep('approve-cycles-cast', 'completed');

      // Step 3: Cast (export) each NFT using ICRC-99 calls
      updateProgressStep('cast-nfts', 'loading');
      
      const castResults: any[] = [];
      
      try {
        console.log(`🔄 Starting to cast ${selectedICNFTs.length} NFT(s) to Solana`);
        
        for (let i = 0; i < selectedICNFTs.length; i++) {
          const nft = selectedICNFTs[i];
          console.log(`🔄 Casting NFT ${i + 1}/${selectedICNFTs.length}: Token ${nft.tokenId} from ${nft.canisterId}`);
          
          updateProgressStep('cast-nfts', 'loading', `Casting NFT ${i + 1}/${selectedICNFTs.length}: ${nft.name || nft.tokenId}...`);
          
          try {
            // Create ckNFT actor for direct cast call
            const { Actor } = await import('@dfinity/agent');
            const { idlFactory: icrc7IdlFactory } = await import('../../declarations/ckNFT/ckNFT.did.js');
            
            if (!authenticatedAgent) {
              throw new Error('Authenticated agent not available. Please authenticate with Internet Identity.');
            }
            
            const ckNFTActor = Actor.createActor(icrc7IdlFactory, {
              agent: authenticatedAgent,
              canisterId: nft.canisterId,
            });
            
            const userAccount = {
              owner: typeof user.principal === 'string' ? Principal.fromText(user.principal) : user.principal,
              subaccount: [] as [],
            };
            
            const targetContractAddress = targetNetwork.collectionAddress || 'pending';
            
            // Build cast request - use the network directly from targetNetwork state
            // which should be a Network type from ckNFT declarations
            const ckNFTCastRequest: CkNFTCastRequest = {
              targetOwner: publicKey.toBase58(), // Solana wallet address
              tokenId: BigInt(nft.tokenId),
              fromSubaccount: [],
              remoteContract: {
                network: targetNetwork.network, // Use the stored network object
                contract: targetContractAddress,
              },
              gasPrice: [],
              gasLimit: [],
              maxPriorityFeePerGas: [],
              memo: [],
              created_at_time: [],
            };
            
            console.log('📝 Submitting cast request:', ckNFTCastRequest);
            
            // Submit cast operation to ckNFT canister
            const castResult = await (ckNFTActor as any).icrc99_cast([ckNFTCastRequest], [userAccount]);
            
            console.log(`✅ Cast result for NFT ${i + 1}:`, castResult);
            
            // Parse cast result - it's wrapped in nested arrays: [[Result]]
            let unwrappedResult = castResult;
            
            // Unwrap nested arrays
            while (Array.isArray(unwrappedResult) && unwrappedResult.length > 0) {
              unwrappedResult = unwrappedResult[0];
            }
            
            console.log(`📦 Unwrapped cast result:`, unwrappedResult);
            
            if (unwrappedResult && typeof unwrappedResult === 'object') {
              if ('Ok' in unwrappedResult) {
                const txId = unwrappedResult.Ok;
                castResults.push({ nft, txId, success: true });
                console.log(`✅ NFT ${i + 1}/${selectedICNFTs.length} cast successfully. TX ID:`, txId);
              } else if ('Err' in unwrappedResult) {
                const error = unwrappedResult.Err;
                console.error(`❌ Cast failed for NFT ${i + 1}:`, error);
                
                // Parse error with detailed information
                let errorMessage = 'Unknown cast error';
                if (typeof error === 'object') {
                  if ('InsufficientAllowance' in error) {
                    const [current, needed] = error.InsufficientAllowance;
                    errorMessage = `Insufficient cycles allowance: have ${current}, need ${needed}. Please approve more cycles to the ckNFT canister.`;
                  } else if ('Unauthorized' in error) {
                    errorMessage = 'Unauthorized to cast this NFT. You must be the owner.';
                  } else if ('GenericError' in error && error.GenericError.message) {
                    errorMessage = `Cast error: ${error.GenericError.message}`;
                  } else if ('GenericBatchError' in error && error.GenericBatchError.message) {
                    errorMessage = `Batch cast error: ${error.GenericBatchError.message}`;
                  } else {
                    errorMessage = `Cast error: ${JSON.stringify(error)}`;
                  }
                }
                
                throw new Error(errorMessage);
              }
            }
            
          } catch (castError) {
            console.error(`❌ Error casting NFT ${i + 1}/${selectedICNFTs.length}:`, castError);
            setHasError(true);
            updateProgressStep('cast-nfts', 'failed', 
              castError instanceof Error ? castError.message : `Failed to cast NFT ${i + 1}`);
            throw castError;
          }
        }
        
        updateProgressStep('cast-nfts', 'completed', `Successfully submitted ${castResults.length} NFT(s) for casting`);
        
      } catch (castError) {
        console.error('❌ NFT casting process failed:', castError);
        throw castError;
      }

      // Step 4: Poll for cast status until completion
      updateProgressStep('wait-solana-confirmation', 'loading');
      
      try {
        console.log('⏳ Polling for cast completion...', {
          castCount: castResults.length,
          castIds: castResults.map(r => r.txId),
        });
        
        const maxAttempts = 120; // 120 attempts × 5 seconds = 10 minutes max
        let attempts = 0;
        let allCompleted = false;
        let lastStatuses: any[] = [];
        
        while (attempts < maxAttempts && !allCompleted) {
          attempts++;
          
          // Wait 5 seconds between polls
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          console.log(`🔍 Checking cast status (attempt ${attempts}/${maxAttempts})...`);
          
          // Poll all cast statuses
          const statusPromises = castResults.map(async (castResult) => {
            try {
              const castId = BigInt(castResult.txId);
              const ckNFTCanisterId = castResult.nft.canisterId;
              
              const userAccount = {
                owner: typeof user.principal === 'string' ? Principal.fromText(user.principal) : user.principal,
                subaccount: [] as [],
              };
              
              const statusResult = await mutations.getCastStatus.mutateAsync({
                castIds: [castId],
                ckNFTCanisterId,
                account: userAccount,
              });
              
              console.log(`🔍 Raw status result for cast ${castId}:`, statusResult);
              
              // statusResult is an array of statuses, get the first one
              const firstStatus = statusResult && statusResult.length > 0 ? statusResult[0] : null;
              
              if (!firstStatus) {
                console.warn(`⚠️ No status returned for cast ${castId}`);
              }
              
              return { castId, status: firstStatus, nft: castResult.nft };
            } catch (error) {
              console.error('Error fetching cast status:', error);
              return { castId: castResult.txId, status: null, nft: castResult.nft };
            }
          });
          
          lastStatuses = await Promise.all(statusPromises);
          
          // Check if all casts are complete
          allCompleted = lastStatuses.every(s => {
            if (!s.status) {
              console.warn(`⚠️ No status for cast ${s.castId}, skipping check`);
              return false;
            }
            
            // Log the full status object for debugging (use console.log directly to handle BigInt)
            console.log(`🔍 Full status object for cast ${s.castId}:`, s.status);
            console.log(`🔍 Type check - is array:`, Array.isArray(s.status), `is object:`, typeof s.status === 'object');
            
            // Handle if status is wrapped in an array (optional type from Candid)
            const castState = Array.isArray(s.status) ? s.status[0] : s.status;
            
            if (!castState || !castState.status) {
              console.error(`❌ Invalid cast state structure for cast ${s.castId}:`, castState);
              return false; // Don't throw, just mark as not complete
            }
            
            // The status property contains the CastStatus variant
            const status = castState.status;
            
            if (!status || typeof status !== 'object') {
              console.error(`❌ Status variant missing or wrong type for cast ${s.castId}:`, status);
              return false;
            }
            
            // Log detailed status
            console.log(`📊 Cast ${s.castId} status variant:`, status);
            
            // Check for completion states
            if ('Completed' in status) {
              console.log(`✅ Cast ${s.castId} completed! Block:`, status.Completed);
              return true;
            }
            if ('RemoteFinalized' in status) {
              console.log(`✅ Cast ${s.castId} finalized on Solana! Hash:`, status.RemoteFinalized);
              return true;
            }
            if ('Error' in status) {
              console.error(`❌ Cast ${s.castId} failed:`, status.Error);
              throw new Error(`Cast failed: ${JSON.stringify(status.Error)}`);
            }
            
            // Display progress states with transaction links
            if ('Created' in status) {
              console.log(`📝 Cast ${s.castId}: Created`);
            } else if ('SubmittingToOrchestrator' in status) {
              console.log(`📤 Cast ${s.castId}: Submitting to orchestrator...`);
              updateProgressStep('wait-solana-confirmation', 'loading', 
                `Cast ${s.castId}: Submitting to orchestrator...`);
            } else if ('SubmittedToOrchestrator' in status) {
              console.log(`✅ Cast ${s.castId}: Submitted (Remote ID: ${status.SubmittedToOrchestrator.remoteCastId})`);
              updateProgressStep('wait-solana-confirmation', 'loading', 
                `Cast ${s.castId}: Submitted to orchestrator (Remote Cast ID: ${status.SubmittedToOrchestrator.remoteCastId})`);
            } else if ('WaitingOnContract' in status) {
              console.log(`⏳ Cast ${s.castId}: Waiting for collection deployment...`);
              updateProgressStep('wait-solana-confirmation', 'loading', 
                `Cast ${s.castId}: Deploying collection on Solana... TX: ${status.WaitingOnContract.transaction.substring(0, 8)}...`);
            } else if ('WaitingOnMint' in status) {
              console.log(`🎨 Cast ${s.castId}: Minting NFT on Solana...`);
              updateProgressStep('wait-solana-confirmation', 'loading', 
                `Cast ${s.castId}: Minting NFT on Solana... TX: ${status.WaitingOnMint.transaction.substring(0, 8)}...`);
            } else if ('WaitingOnTransfer' in status) {
              console.log(`📦 Cast ${s.castId}: Transferring NFT to recipient...`);
              updateProgressStep('wait-solana-confirmation', 'loading', 
                `Cast ${s.castId}: Transferring NFT to owner... TX: ${status.WaitingOnTransfer.transaction.substring(0, 8)}...`);
            }
            
            return false;
          });
          
          if (allCompleted) {
            console.log('✅ All casts completed!');
            break;
          }
        }
        
        if (!allCompleted) {
          throw new Error('Cast polling timeout - exceeded maximum wait time');
        }
        
        updateProgressStep('wait-solana-confirmation', 'completed',
          `All ${castResults.length} NFT(s) successfully exported to Solana and confirmed`);
        
        // Extract Solana transaction hashes from final statuses
        const solTxHashes = lastStatuses
          .map(s => {
            if (s.status?.status && 'RemoteFinalized' in s.status.status) {
              return s.status.status.RemoteFinalized;
            }
            return null;
          })
          .filter(Boolean);
        
        // Create success result with transaction hashes
        // Note: Mint addresses can be found in the Solana transaction details
        const result: SolanaExportResult = {
          success: true,
          collectionAddress: targetNetwork.collectionAddress,
          tokenIds: selectedICNFTs.map(nft => nft.tokenId),
          solanaTransactionHash: solTxHashes[0] || undefined,
        };
        
        console.log('✅ Export complete! Transaction hashes:', solTxHashes);
        
        setExportResult(result);
        setCurrentStep('complete');
        
        if (onComplete) {
          onComplete(result);
        }
        
      } catch (confirmError) {
        console.error('❌ Confirmation failed:', confirmError);
        setHasError(true);
        updateProgressStep('wait-solana-confirmation', 'failed',
          confirmError instanceof Error ? confirmError.message : 'Failed to confirm Solana transactions');
        throw confirmError;
      }

    } catch (err) {
      console.error('❌ Export process failed:', err);
      setHasError(true);
      const errorResult: SolanaExportResult = {
        success: false,
        error: err instanceof Error ? err.message : 'Export failed',
      };
      setExportResult(errorResult);
      
      if (onComplete) {
        onComplete(errorResult);
      }
    }
  }, [selectedICNFTs, publicKey, user, targetNetwork, sourceContractPointer, exportCosts, authenticatedAgent, mutations, onComplete, pollForCollectionAddress, createExportProgressState, updateProgressStep]);

  // Step navigation
  const steps: Array<{ id: SolanaExportWizardStep; title: string; description: string }> = [
    { id: 'select-ic-nft', title: 'Select NFTs', description: 'Choose ckNFTs to export' },
    { id: 'network', title: 'Network', description: 'Select Solana network' },
    { id: 'costs', title: 'Review Costs', description: 'Approve export costs' },
    { id: 'export', title: 'Export', description: 'Execute export to Solana' },
    { id: 'complete', title: 'Complete', description: 'Export complete' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const canGoPrev = currentStep !== 'select-ic-nft' && currentStep !== 'export' && currentStep !== 'complete';
  
  const canGoNext = useCallback((): boolean => {
    switch (currentStep) {
      case 'select-ic-nft':
        return selectedICNFTs.length > 0;
      case 'network':
        return connected && targetNetwork !== null;
      case 'costs':
        return exportCosts !== null && exportCosts > 0n && isExportReady;
      case 'export':
      case 'complete':
        return false;
      default:
        return false;
    }
  }, [currentStep, selectedICNFTs, connected, targetNetwork, exportCosts, isExportReady]);

  const handleNext = () => {
    if (!canGoNext()) return;
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
      setHasError(false);
    }
  };

  const handlePrev = () => {
    if (!canGoPrev) return;
    
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
      setHasError(false);
    }
  };

  // Handle NFT selection from ICNFTSelectionStep
  const handleICNFTSelection = (nfts: SelectedICNFT[]) => {
    setSelectedICNFTs(nfts);
    
    // Update active canister ID when NFTs are selected
    if (nfts.length > 0) {
      const canisterId = nfts[0].canisterId;
      setActiveCanisterId(canisterId);
    }
  };

  // Handle network selection
  const handleNetworkChange = async (networkName: string, endpoint: string) => {
    // Create a CkNFTNetwork for Solana with the proper cluster configuration
    const solanaCluster = getSolanaCluster(networkName);
    const ckNFTSolanaNetwork: CkNFTNetwork = { Solana: [solanaCluster] };
    
    // Check if a remote collection already exists for this ckNFT on the selected network
    let deployed = false;
    let collectionAddress: string | undefined;
    
    if (activeCanisterId && sourceContractPointer && unauthenticatedOrchActor) {
      try {
        console.log('🔍 Checking for existing remote collection on', networkName);
        const solanaNetwork: OrchestratorNetwork = { Solana: [solanaCluster] };
        
        // Get the ckNFT canister ID for this contract pointer
        const canisterIdResult = await unauthenticatedOrchActor.get_ck_nft_canister([sourceContractPointer]);
        
        if (Array.isArray(canisterIdResult) && canisterIdResult[0] && canisterIdResult[0][0]) {
          const canisterId = canisterIdResult[0][0];
          console.log('📦 Checking remote for ckNFT canister:', canisterId.toString());
          
          // Query get_remote to check if collection exists
          const remoteResult = await unauthenticatedOrchActor.get_remote([[canisterId, solanaNetwork]]);
          
          if (Array.isArray(remoteResult) && remoteResult[0] && remoteResult[0][0]) {
            const remoteContract = remoteResult[0][0];
            const remoteAddress = remoteContract.address && remoteContract.address.length > 0 ? remoteContract.address[0] : null;
            
            if (remoteAddress) {
              console.log('✅ Found existing Solana collection:', remoteAddress);
              deployed = true;
              collectionAddress = remoteAddress;
            } else {
              console.log('⚠️ Remote exists but no address yet');
            }
          } else {
            console.log('ℹ️ No remote collection found, will need deployment');
          }
        }
      } catch (error) {
        console.warn('⚠️ Error checking for existing remote:', error);
        // Continue with deployed = false
      }
    }
    
    setTargetNetwork({
      name: networkName,
      endpoint,
      deployed,
      collectionAddress,
      network: ckNFTSolanaNetwork,
    });
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-ic-nft':
        return (
          <div>
            <ICNFTSelectionStep
              selectedNFTs={selectedICNFTs}
              onSelectionChange={handleICNFTSelection}
              sourceCanisterId={sourceCanisterId}
              userPrincipal={user?.principal}
              targetChain='solana'
            />
            
            {selectedICNFTs.length > 0 && activeCanisterId && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  {icrc99Support.isLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-cyan-600 border-t-transparent rounded-full" />
                      <span className="text-sm text-gray-600">Checking ICRC-99 support...</span>
                    </>
                  ) : icrc99Support.isSupported ? (
                    <>
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-green-700 font-medium">ICRC-99 Supported</span>
                      <span className="text-xs text-gray-500">- Cross-chain casting available</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-yellow-700 font-medium">ICRC-7 Only</span>
                      <span className="text-xs text-gray-500">- IC-to-Solana casting available</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'network':
        return (
          <SolanaNetworkSelectionStep
            selectedNetwork={targetNetwork?.name}
            onNetworkChange={handleNetworkChange}
          />
        );

      case 'costs':
        return (
          <SolanaExportCostStep
            selectedNFTs={selectedICNFTs}
            targetNetwork={targetNetwork}
            sourceContractPointer={sourceContractPointer}
            onCostsCalculated={setExportCosts}
            onReadyStateChange={setIsExportReady}
            onDeploymentComplete={(collectionAddress) => {
              console.log('✅ Collection deployment complete, updating network info:', collectionAddress);
              setTargetNetwork(prev => prev ? {
                ...prev,
                deployed: true,
                collectionAddress: collectionAddress,
              } : null);
            }}
          />
        );

      case 'export':
        return (
          <SolanaExportProgressStep
            progress={progress}
            onRetryStep={retryProgressStep}
          />
        );

      case 'complete':
        return (
          <SolanaExportCompletionStep
            result={exportResult!}
            onStartNew={() => {
              setCurrentStep('select-ic-nft');
              setSelectedICNFTs([]);
              setTargetNetwork(null);
              setExportCosts(null);
              setExportResult(null);
              setHasError(false);
              // Don't create progress here - will be created in handleStartExport with correct deployment flag
            }}
            onClose={() => onCancel?.()}
          />
        );

      default:
        return null;
    }
  };

  const wizardContent = (
    <div className={clsx(
      'bg-white rounded-lg shadow-lg',
      modal && 'max-w-4xl mx-auto',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Export NFTs to Solana</h2>
          <p className="text-sm text-gray-500 mt-1">
            Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex]?.description}
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={clsx(
                'flex items-center',
                index < steps.length - 1 && 'flex-1'
              )}
            >
              <div
                className={clsx(
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                  index < currentStepIndex
                    ? 'bg-green-100 text-green-600'
                    : index === currentStepIndex
                    ? hasError 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-cyan-100 text-cyan-600'
                    : 'bg-gray-100 text-gray-400'
                )}
              >
                {index < currentStepIndex ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : index === currentStepIndex && hasError ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={clsx(
                  'ml-2 text-sm font-medium hidden sm:inline',
                  index <= currentStepIndex ? 'text-gray-900' : 'text-gray-400',
                  index === currentStepIndex && hasError && 'text-red-600'
                )}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={clsx(
                    'flex-1 h-0.5 mx-4',
                    index < currentStepIndex ? 'bg-green-200' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        
        {hasError && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-red-700 font-medium">
                Error in {steps[currentStepIndex]?.title}
              </span>
              <span className="ml-2 text-xs text-red-600">
                Use the Previous button to go back and retry
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Step Content */}
      <div className="p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
        {renderStepContent()}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 border-t border-gray-200">
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          className={clsx(
            'flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
            canGoPrev
              ? hasError
                ? 'text-white bg-red-600 hover:bg-red-700'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              : 'text-gray-400 bg-gray-50 cursor-not-allowed'
          )}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {hasError ? 'Go Back & Retry' : 'Previous'}
        </button>

        <div className="flex space-x-3">
          {currentStep === 'costs' && canGoNext() && (
            <button
              onClick={handleStartExport}
              className="flex items-center px-6 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors"
            >
              Start Export
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}

          {currentStep !== 'costs' && currentStep !== 'export' && currentStep !== 'complete' && (
            <button
              onClick={handleNext}
              disabled={!canGoNext()}
              className={clsx(
                'flex items-center px-6 py-2 text-sm font-medium rounded-md transition-colors',
                canGoNext()
                  ? 'text-white bg-cyan-600 hover:bg-cyan-700'
                  : 'text-gray-400 bg-gray-100 cursor-not-allowed'
              )}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        {wizardContent}
      </div>
    );
  }

  return wizardContent;
}

// Solana Export Progress Step Component
function SolanaExportProgressStep({
  progress,
  onRetryStep,
}: {
  progress: BridgeProgress | null;
  onRetryStep: (stepId: string) => void;
}) {
  if (!progress) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Initializing Export</h3>
        <p className="text-gray-600">Setting up Solana export process...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Exporting to Solana</h3>
        <p className="text-gray-600">
          Your NFTs are being exported to the Solana blockchain
        </p>
      </div>

      {/* For IC-native NFT exports, only show relevant progress stages */}
      {progress && (
        <BridgeChecklist
          progress={{
            ...progress,
            stages: progress.stages.filter(stage => 
              stage.id === 'preparation' || stage.id === 'execution'
            )
          }}
          onRetryStep={onRetryStep}
        />
      )}
    </div>
  );
}

// Solana Export Completion Step
function SolanaExportCompletionStep({
  result,
  onStartNew,
  onClose,
}: {
  result: SolanaExportResult;
  onStartNew: () => void;
  onClose: () => void;
}) {
  if (!result.success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Export Failed</h3>
        <p className="text-gray-600 mb-6">
          There was an issue exporting your NFTs to Solana.
        </p>
        
        {result.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
            <h4 className="font-semibold text-red-900 mb-2">Error Details:</h4>
            <p className="text-sm text-red-700">{result.error}</p>
          </div>
        )}
        
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={onStartNew}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">Export Successful!</h3>
      <p className="text-gray-600 mb-6">
        Your NFTs have been successfully exported to Solana.
      </p>
      
      <div className="bg-cyan-50 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
        <h4 className="font-semibold text-gray-900 mb-2">Export Details:</h4>
        <div className="space-y-2 text-sm">
          {result.collectionAddress && (
            <div>
              <span className="text-gray-500">Collection Address:</span>
              <div className="font-mono text-xs break-all text-cyan-700">{result.collectionAddress}</div>
            </div>
          )}
          {result.tokenIds && (
            <div>
              <span className="text-gray-500">NFTs Exported:</span>
              <div className="font-medium text-gray-900">{result.tokenIds.length} token{result.tokenIds.length !== 1 ? 's' : ''}</div>
            </div>
          )}
          {result.solanaTransactionHash && (
            <div>
              <span className="text-gray-500">Transaction:</span>
              <div className="font-mono text-xs break-all text-cyan-700">{result.solanaTransactionHash}</div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={onStartNew}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
        >
          Export More NFTs
        </button>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
