import { useState, useCallback, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { Principal } from '@dfinity/principal';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ethers } from 'ethers';
import { useMetaMask } from '../../hooks/useEVM';
import { useAuth } from '../../hooks/useAuth';
import { useAuthenticatedAgent } from '../../provider/AgentProvider';
import { useAnonymousActor } from '../../hooks/useActor';
import { useICRC99Support } from '../../hooks/useICRC99Support';
import { use99Mutations } from '../../hooks/use99Mutations';
import type { CastRequest as CkNFTCastRequest } from '../../declarations/ckNFT/ckNFT.did';
import { BridgeProgress, BridgeDirection, BridgeStep, createBridgeProgress, updateBridgeStep, retryBridgeStep } from '../../lib/bridgeProgress';
import { BridgeChecklist } from '../BridgeChecklist';
import type { Network, ContractPointer } from '../../declarations/orchestrator/orchestrator.did';
import { idlFactory as orchestratorIdlFactory } from '../../declarations/orchestrator/orchestrator.did.js';
import type { _SERVICE as OrchestratorService } from '../../declarations/orchestrator/orchestrator.did';
import type { NFTMetadata } from '../../core/NFTMetadata';

// Step components (to be created)
import { EVMConnectionStep } from './EVMConnectionStep';
import { ICNFTSelectionStep } from './ICNFTSelectionStep';
import { RemoteContractStep } from './RemoteContractStep';
import { ExportCostsStep } from './ExportCostsStep';

type ExportWizardStep = 'select-ic-nft' | 'connect' | 'remote-contract' | 'costs' | 'export' | 'complete';

export interface SelectedICNFT {
  tokenId: string;
  canisterId: string;
  metadata?: NFTMetadata;
  owner: Principal;
  image?: string;
  name?: string;
  description?: string;
}

export interface RemoteContractInfo {
  address?: string;
  network: Network;
  deployed: boolean;
  transactionHash?: string;
}

export interface EVMExportWizardProps {
  /** The source ckNFT canister ID to export from */
  sourceCanisterId?: string;
  /** Supported EVM networks for export */
  supportedNetworks?: string[];
  /** Callback when the export process completes */
  onComplete?: (result: ExportResult) => void;
  /** Callback when the wizard is cancelled */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Show the wizard in a modal */
  modal?: boolean;
  /** Initial step to show (for demos/testing) */
  initialStep?: ExportWizardStep;
  /** Mock selected IC NFTs (for demos/testing) */
  mockSelectedICNFTs?: SelectedICNFT[];
  /** Mock wallet connection state (for demos/testing) */
  mockWalletConnected?: boolean;
  /** Mock export costs (for demos/testing) */
  mockExportCosts?: string;
  /** Mock export result (for demos/testing) */
  mockExportResult?: ExportResult;
}

export interface ExportResult {
  success: boolean;
  icTransactionHash?: string;
  evmTransactionHash?: string;
  remoteContractAddress?: string;
  tokenId?: string;
  error?: string;
}

export function EVMExportWizard({
  sourceCanisterId,
  supportedNetworks = ['ethereum', 'polygon', 'hardhat', 'hardhat-2'],
  onComplete,
  onCancel,
  className,
  modal = false,
  initialStep,
  mockSelectedICNFTs,
  mockWalletConnected,
  mockExportCosts,
  mockExportResult,
}: EVMExportWizardProps) {
  // Network name to chain ID mapping (same as import wizard)
  const networkToChainId = {
    ethereum: 1,
    polygon: 137,
    bsc: 56,
    hardhat: 31337,
    'hardhat-2': 1338,
    arbitrum: 42161,
    optimism: 10,
    base: 8453,
  };

  // Chain ID to network name mapping
  const chainIdToNetwork = Object.fromEntries(
    Object.entries(networkToChainId).map(([name, id]) => [id, name])
  );

  const [currentStep, setCurrentStep] = useState<ExportWizardStep>(initialStep || 'select-ic-nft');
  const [selectedICNFTs, setSelectedICNFTs] = useState<SelectedICNFT[]>(mockSelectedICNFTs || []);
  const [targetNetwork, setTargetNetwork] = useState<Network | null>(null);
  const [remoteContractInfo, setRemoteContractInfo] = useState<RemoteContractInfo | null>(null);
  const [exportCosts, setExportCosts] = useState<bigint | null>(
    mockExportCosts ? BigInt(mockExportCosts) : null
  );
  
  // Store the active canister ID for ICRC-99 checking (initialize with sourceCanisterId if provided)
  const [activeCanisterId, setActiveCanisterId] = useState<string | null>(sourceCanisterId || null);

  // Store the source contract pointer determined from ICRC-99 check
  const [sourceContractPointer, setSourceContractPointer] = useState<ContractPointer | null>(null);
  
  // Debug logging for export costs changes
  useEffect(() => {
    console.log('💰 Export costs updated:', {
      exportCosts: exportCosts?.toString() || 'null',
      currentStep,
      canGoNextResult: currentStep === 'costs' ? exportCosts !== null : 'not costs step'
    });
  }, [exportCosts, currentStep]);
  const [exportResult, setExportResult] = useState<ExportResult | null>(mockExportResult || null);
  const [progress, setProgress] = useState<BridgeProgress | null>(null);

  // Hooks
  const { activeAddress, isUnlocked, connectWallet, switchChain, chainId } = useMetaMask();
  const { user } = useAuth();
  const authenticatedAgent = useAuthenticatedAgent();
  
  // Check ICRC-99 support for the active canister
  const icrc99Support = useICRC99Support(activeCanisterId);
  
  // Debug logging for ICRC-99 support
  useEffect(() => {
    console.log('🔍 EVMExportWizard ICRC-99 support state:', {
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

  // Override wallet state for mocking
  const effectiveIsConnected = mockWalletConnected !== undefined ? mockWalletConnected : isUnlocked;
  const effectiveAccount = mockWalletConnected !== undefined 
    ? (mockWalletConnected ? '0x742d35Cc6635C0532925a3b8D11e432f1b7C4b7b' : null)
    : activeAddress;
  
  // Debug logging for mocking
  console.log('🔍 EVMExportWizard wallet state:', {
    mockWalletConnected,
    isUnlocked,
    effectiveIsConnected,
    effectiveAccount,
    currentStep,
  });

  // Progress management functions
  const createExportProgressState = useCallback((direction: BridgeDirection) => {
    // Define custom steps that match our simplified export flow
    const customSteps: Omit<BridgeStep, 'status'>[] = [
      {
        id: 'create-remote-contract',
        title: 'Deploy Remote Contract',
        description: 'Creating or verifying EVM contract for receiving NFTs',
        estimatedDuration: 180,
        retryable: true,
        stage: 'contract',
      },
      {
        id: 'fund-gas-account',
        title: 'Fund Gas Account',
        description: 'Sending ETH to bridge funding address for gas fees',
        estimatedDuration: 90,
        retryable: true,
        stage: 'preparation',
      },
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
        title: 'Cast NFTs',
        description: 'Exporting ckNFTs to EVM blockchain',
        estimatedDuration: 120,
        retryable: true,
        stage: 'execution',
      },
      {
        id: 'wait-evm-confirmation',
        title: 'Wait for Confirmation',
        description: 'Monitoring cast operations for completion',
        estimatedDuration: 300,
        retryable: false,
        stage: 'execution',
      },
    ];
    
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
    createExportProgressState('ic-to-evm' as BridgeDirection);
  }, [createExportProgressState]);

  // Poll for contract address after deployment (similar to RemoteContractStep)
  const pollForContractAddress = useCallback(async (txHash: string, maxAttempts: number = 10, intervalMs: number = 5000) => {
    console.log('🔍 Starting to poll for deployed contract address...', { txHash, maxAttempts, intervalMs });
    
    let attempts = 0;
    
    return new Promise<void>((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        attempts++;
        console.log(`🔍 Polling attempt ${attempts}/${maxAttempts} for contract address...`);

        try {
          // Check if the orchestrator now recognizes the new contract using get_remote
          if (unauthenticatedOrchActor && selectedICNFTs[0]?.canisterId && targetNetwork) {
            try {
              // First get the ckNFT canister ID
              const contractPointer = {
                contract: selectedICNFTs[0].canisterId,
                network: targetNetwork,
              };

              const canisterIdResult = await unauthenticatedOrchActor.get_ck_nft_canister([contractPointer]);
              
              if (Array.isArray(canisterIdResult) && canisterIdResult[0] && canisterIdResult[0][0]) {
                const canisterId = canisterIdResult[0][0];
                console.log('✅ Found ckNFT canister:', canisterId.toString());
                
                // Now check if the remote contract has been deployed using get_remote
                const remoteResult = await unauthenticatedOrchActor.get_remote([[canisterId, targetNetwork]]);
                
                if (Array.isArray(remoteResult) && remoteResult[0] && remoteResult[0][0]) {
                  const remoteContract = remoteResult[0][0];
                  
                  // Extract the address from the remote contract state
                  const remoteAddress = remoteContract.address && remoteContract.address.length > 0 ? remoteContract.address[0] : null;
                  
                  if (remoteAddress) {
                    console.log('🎉 Found newly deployed remote contract address:', remoteAddress);
                    
                    // Update remote contract info with the actual address
                    setRemoteContractInfo(prev => prev ? {
                      ...prev,
                      address: remoteAddress,
                      deployed: true,
                    } : {
                      address: remoteAddress,
                      network: targetNetwork,
                      deployed: true,
                    });

                    // Clear polling and resolve
                    clearInterval(pollInterval);
                    resolve();
                    return;
                  } else {
                    console.log('⏳ Remote contract found but address not yet available');
                  }
                } else {
                  console.log('⏳ ckNFT canister exists but remote contract not yet deployed');
                }
              } else {
                console.log('⏳ ckNFT canister not yet created');
              }
            } catch (error) {
              console.warn('Error checking for remote contract:', error);
            }
          }

          // Check if we've exceeded max attempts
          if (attempts >= maxAttempts) {
            console.warn('⚠️ Max polling attempts reached, contract address may not be available yet');
            clearInterval(pollInterval);
            // Don't reject, just resolve without address (user can refresh manually)
            resolve();
          }

        } catch (error) {
          console.error('❌ Error during contract address polling:', error);
          clearInterval(pollInterval);
          reject(error);
        }
      }, intervalMs);
    });
  }, [unauthenticatedOrchActor, selectedICNFTs, targetNetwork]);

  const steps: { id: ExportWizardStep; title: string; description: string }[] = [
    { id: 'select-ic-nft', title: 'Select IC NFTs', description: 'Choose ckNFTs to export back to EVM' },
    { id: 'connect', title: 'Connect Wallet', description: 'Connect your EVM wallet for receiving NFTs' },
    { id: 'remote-contract', title: 'Remote Contract', description: 'Deploy or use existing EVM contract' },
    { id: 'costs', title: 'Export Costs', description: 'Review and approve cycles for export operation' },
    { id: 'export', title: 'Export Progress', description: 'Monitor the export process' },
    { id: 'complete', title: 'Complete', description: 'Export summary' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  
  const canGoNext = useCallback(() => {
    const result = (() => {
      switch (currentStep) {
        case 'select-ic-nft':
          return selectedICNFTs.length > 0;
        case 'connect':
          return isUnlocked && activeAddress;
        case 'remote-contract':
          return remoteContractInfo !== null && remoteContractInfo.address && remoteContractInfo.address.trim() !== '';
        case 'costs':
          return exportCosts !== null;
        case 'export':
          return exportResult?.success === true;
        default:
          return false;
      }
    })();
    
    console.log('🔍 canGoNext check:', {
      currentStep,
      result,
      selectedICNFTs: selectedICNFTs.length,
      isUnlocked,
      activeAddress: !!activeAddress,
      remoteContractInfo: remoteContractInfo ? {
        address: remoteContractInfo.address || 'null',
        deployed: remoteContractInfo.deployed,
        network: remoteContractInfo.network
      } : 'null',
      exportCosts: exportCosts?.toString() || 'null',
      exportResultSuccess: exportResult?.success
    });
    
    return result;
  }, [currentStep, selectedICNFTs, isUnlocked, activeAddress, remoteContractInfo, exportCosts, exportResult]);

  // Error handling similar to import wizard
  const hasError = useMemo(() => {
    if (progress?.steps) {
      const exportError = progress.steps.some((step: any) => step.status === 'failed');
      if (exportError) return true;
    }
    
    if (exportResult && !exportResult.success) {
      return true;
    }
    
    return false;
  }, [progress, exportResult]);

  // Automatically advance to complete step when export is successful
  useEffect(() => {
    if (exportResult?.success && currentStep !== 'complete') {
      console.log('🎉 Export completed successfully, advancing to complete step');
      setCurrentStep('complete');
    }
  }, [exportResult, currentStep]);

  const canGoPrev = currentStepIndex > 0 && 
    (currentStep !== 'export' && currentStep !== 'complete' || hasError);

  const handleNext = useCallback(() => {
    if (!canGoNext()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  }, [currentStepIndex, canGoNext, steps]);

  const handlePrev = useCallback(() => {
    if (!canGoPrev) return;

    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  }, [currentStepIndex, canGoPrev, steps]);

  const handleStartExport = useCallback(async () => {
    console.log('🎯 handleStartExport called with:', {
      selectedICNFTs: selectedICNFTs.length,
      activeAddress,
      userPrincipal: user?.principal,
      remoteContractInfo,
      targetNetwork
    });

    if (!selectedICNFTs.length || !activeAddress || !user?.principal || !remoteContractInfo || !targetNetwork || !sourceContractPointer || !exportCosts) {
      console.warn('❌ Missing required data for export:', {
        selectedICNFTs: selectedICNFTs.length,
        activeAddress: !!activeAddress,
        userPrincipal: !!user?.principal,
        remoteContractInfo: !!remoteContractInfo,
        targetNetwork: !!targetNetwork,
        sourceContractPointer: !!sourceContractPointer,
        exportCosts: !!exportCosts
      });
      return;
    }

    setCurrentStep('export');
    createExportProgressState('ic-to-evm');
    
    try {
      console.log(`🚀 Starting real ICRC-99 export process for ${selectedICNFTs.length} ckNFT(s) to EVM`);

      // Step 1: Verify EVM wallet connection (no need for loading/completed immediately)
      console.log('✅ EVM wallet already connected:', activeAddress);

      // Step 2: Create or verify remote contract exists
      updateProgressStep('create-remote-contract', 'loading');
      
      if (!remoteContractInfo.deployed && remoteContractInfo.address) {
        // Need to deploy remote contract first
        console.log('📦 Deploying remote contract to EVM...', remoteContractInfo.deployed, remoteContractInfo.address);
        updateProgressStep('create-remote-contract', 'loading', 'Deploying remote contract to EVM...');
        
        try {
          // Use the pre-calculated source contract pointer from ICRC-99 check
          if (!sourceContractPointer) {
            throw new Error('Source contract pointer not available. Please ensure NFTs are selected.');
          }
          
          console.log('📝 Using sourceContractPointer for createRemoteContract (original native network from ICRC-99 or IC fallback):', sourceContractPointer);
          console.log('📝 Using target network for createRemoteContract:', targetNetwork);
          
          // Get proper gas parameters for deployment
          console.log('⛽ Calculating gas parameters for remote contract deployment...');
          let gasPrice: bigint;
          let maxPriorityFeePerGas: bigint;
          let gasLimit: bigint;

          try {
            if (!window.ethereum) {
              throw new Error('MetaMask not available for gas estimation');
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            
            // Get current fee data
            const feeData = await provider.getFeeData();
            console.log('📊 Current fee data for deployment:', {
              gasPrice: feeData.gasPrice?.toString(),
              maxFeePerGas: feeData.maxFeePerGas?.toString(),
              maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
            });

            // Calculate gas parameters
            gasPrice = feeData.maxFeePerGas || feeData.gasPrice || BigInt(50_000_000_000); // 50 gwei fallback
            maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || BigInt(2_000_000_000); // 2 gwei fallback
            
            // Contract deployment typically needs more gas
            gasLimit = BigInt(2_000_000); // 2M gas for contract deployment

            console.log('✅ Calculated deployment gas parameters:', {
              gasPrice: gasPrice.toString(),
              maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
              gasLimit: gasLimit.toString(),
            });

          } catch (gasError) {
            console.warn('⚠️ Failed to get real-time gas data for deployment, using fallback values:', gasError);
            // Fallback to reasonable defaults
            gasPrice = BigInt(50_000_000_000); // 50 gwei
            maxPriorityFeePerGas = BigInt(2_000_000_000); // 2 gwei
            gasLimit = BigInt(2_000_000); // 2M gas
          }
          
          const deployResult = await mutations.createRemoteContract.mutateAsync({
            pointer: sourceContractPointer, // Use ICRC-99 native chain or IC fallback as source
            network: targetNetwork, // Target network (where we want to deploy the remote contract)
            gasPrice,
            gasLimit,
            maxPriorityFeePerGas,
          });
          
          console.log('✅ Remote contract deployment initiated:', deployResult);
          
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
            
            // Start polling for the actual contract address
            await pollForContractAddress(txHash);
          } else {
            console.warn('⚠️ No transaction hash received from deployment, marking as deployed without address');
            // Fallback: mark as deployed but without address (user can refresh manually)
            setRemoteContractInfo(prev => prev ? { ...prev, deployed: true } : null);
          }
          
        } catch (deployError) {
          console.error('❌ Remote contract deployment failed:', deployError);
          updateProgressStep('create-remote-contract', 'failed', 
            deployError instanceof Error ? deployError.message : 'Remote contract deployment failed');
          return;
        }
      }
      
      updateProgressStep('create-remote-contract', 'completed');

      // Step 3: Pre-approve cycles for all casting operations
      updateProgressStep('approve-cycles-cast', 'loading');
      
      try {
        // Use the export costs that were already calculated and approved by the user
        if (!exportCosts) {
          throw new Error('Export costs not calculated. Please go back to the costs step.');
        }

        console.log('🔋 Using pre-calculated export costs for cycle approval:', exportCosts.toString());

        // Get the ckNFT canister ID for approval
        const ckNFTCanisterId = selectedICNFTs[0]?.canisterId;
        if (!ckNFTCanisterId) {
          throw new Error('No ckNFT canister ID available');
        }

        // Approve cycles for the ckNFT canister once for all operations
        const approvalAmount = (exportCosts * BigInt(110)) / BigInt(100); // 110% buffer
        
        await mutations.cyclesApprove.mutateAsync({
          fee: [],
          memo: [],
          from_subaccount: [],
          created_at_time: [],
          amount: approvalAmount,
          expected_allowance: [],
          expires_at: [BigInt(Date.now() * 1000000) + BigInt(24 * 60 * 60 * 1000000000)], // 1 day
          spender: {
            owner: Principal.fromText(ckNFTCanisterId),
            subaccount: []
          }
        });
        
        console.log('✅ Cycles approved for all casting operations');
      } catch (cyclesError) {
        console.error('❌ Failed to approve cycles for casting:', cyclesError);
        updateProgressStep('approve-cycles-cast', 'failed', 
          cyclesError instanceof Error ? cyclesError.message : 'Failed to approve cycles');
        return;
      }
      
      updateProgressStep('approve-cycles-cast', 'completed');

      // Step 4: Pre-approve all NFTs for transfer (done once before the loop)
      updateProgressStep('fund-gas-account', 'loading', 'Approving NFTs for transfer...');
      
      try {
        const ckNFTCanisterId = selectedICNFTs[0]?.canisterId;
        if (!ckNFTCanisterId) {
          throw new Error('No ckNFT canister ID available');
        }

        // Create a direct ckNFT actor for approvals
        const { Actor } = await import('@dfinity/agent');
        const { idlFactory: ckNFTIdlFactory } = await import('../../declarations/ckNFT');
        
        if (!authenticatedAgent) {
          throw new Error('User must be authenticated to approve NFTs');
        }

        const ckNFTActor = Actor.createActor(ckNFTIdlFactory, {
          agent: authenticatedAgent,
          canisterId: Principal.fromText(ckNFTCanisterId),
        });

        // Create approval requests for all NFTs at once
        const approvalRequests = selectedICNFTs.map(nft => ({
          token_id: BigInt(nft.tokenId),
          approval_info: {
            spender: {
              owner: Principal.fromText(nft.canisterId),
              subaccount: [] as []
            },
            memo: [] as [],
            from_subaccount: [] as [],
            created_at_time: [] as [],
            expires_at: [BigInt(Date.now() * 1000000) + BigInt(24 * 60 * 60 * 1000000000)] as [bigint], // 1 day expiry
          }
        }));
        
        // Approve all NFTs for the ckNFT canister to spend
        const approvalResults = await (ckNFTActor as any).icrc37_approve_tokens(approvalRequests);
        console.log('🔐 NFT approval results:', approvalResults);
        
        // Check for approval errors
        for (let i = 0; i < approvalResults.length; i++) {
          const result = approvalResults[i];
          if (Array.isArray(result) && result.length > 0 && result[0] && 'Err' in result[0]) {
            const error = result[0].Err;
            console.error(`❌ Failed to approve NFT ${selectedICNFTs[i].tokenId}:`, error);
            throw new Error(`Failed to approve NFT ${selectedICNFTs[i].tokenId}: ${JSON.stringify(error)}`);
          }
        }
        
        console.log('✅ All NFTs approved for transfer');
      } catch (approvalError) {
        console.error('❌ Failed to approve NFTs for transfer:', approvalError);
        updateProgressStep('fund-gas-account', 'failed', 
          approvalError instanceof Error ? approvalError.message : 'Failed to approve NFTs');
        return;
      }
      
      updateProgressStep('fund-gas-account', 'completed');

      // Step 5: Cast (export) each NFT using real ICRC-99 calls (approvals already done)
      updateProgressStep('cast-nfts', 'loading');
      
      const castResults: any[] = [];
      const exportedTokenReferences: string[] = [];
      const castStatusIds: bigint[] = [];
      let evmTransactionHashes: string[] = [];
      
      for (let i = 0; i < selectedICNFTs.length; i++) {
        const nft = selectedICNFTs[i];
        console.log(`🔄 Casting NFT ${i + 1}/${selectedICNFTs.length}: Token ${nft.tokenId} from ${nft.canisterId}`);
        
        updateProgressStep('cast-nfts', 'loading', `Casting NFT ${i + 1}/${selectedICNFTs.length}: ${nft.name || nft.tokenId}...`);
        
        try {
          // Create the cast request using real ICRC-99 parameters
          // Native contract pointer - use the actual native chain from ICRC-99, not the ckNFT canister
          const nativeContractPointer: ContractPointer = sourceContractPointer;
          
          console.log('🔍 Using native contract pointer from ICRC-99:', {
            nativeNetwork: nativeContractPointer.network,
            nativeContract: nativeContractPointer.contract,
            ckNFTCanister: nft.canisterId,
            tokenId: nft.tokenId,
          });
          
          // Create the ckNFT cast request with proper gas calculations
          console.log('⛽ Calculating gas parameters for NFT cast operation...');
          let castGasPrice: bigint;
          let castMaxPriorityFeePerGas: bigint;
          let castGasLimit: bigint;

          try {
            if (!window.ethereum) {
              throw new Error('MetaMask not available for gas estimation');
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            
            // Get current fee data
            const feeData = await provider.getFeeData();
            console.log('📊 Current fee data for cast operation:', {
              gasPrice: feeData.gasPrice?.toString(),
              maxFeePerGas: feeData.maxFeePerGas?.toString(),
              maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
            });

            // Calculate gas parameters for NFT operations
            castGasPrice = feeData.maxFeePerGas || feeData.gasPrice || BigInt(50_000_000_000); // 50 gwei fallback
            castMaxPriorityFeePerGas = feeData.maxPriorityFeePerGas || BigInt(2_000_000_000); // 2 gwei fallback
            
            // NFT minting operations typically need 150-300k gas
            castGasLimit = BigInt(300_000); // 300k gas for NFT operations

            console.log('✅ Calculated cast gas parameters:', {
              gasPrice: castGasPrice.toString(),
              maxPriorityFeePerGas: castMaxPriorityFeePerGas.toString(),
              gasLimit: castGasLimit.toString(),
            });

          } catch (gasError) {
            console.warn('⚠️ Failed to get real-time gas data for cast, using fallback values:', gasError);
            // Fallback to reasonable defaults
            castGasPrice = BigInt(50_000_000_000); // 50 gwei
            castMaxPriorityFeePerGas = BigInt(2_000_000_000); // 2 gwei
            castGasLimit = BigInt(300_000); // 300k gas
          }

          const ckNFTCastRequest: CkNFTCastRequest = {
            tokenId: BigInt(nft.tokenId),
            gasPrice: [castGasPrice],
            memo: [], // No memo
            fromSubaccount: [], // No specific subaccount
            remoteContract: {
              contract: remoteContractInfo.address || '',
              network: targetNetwork, // Use the actual selected target network
            },
            maxPriorityFeePerGas: [castMaxPriorityFeePerGas],
            created_at_time: [], // Current time
            gasLimit: [castGasLimit],
            targetOwner: activeAddress, // Target EVM address
          };
          
          console.log('📤 Submitting ckNFT cast request:', {
            tokenId: nft.tokenId,
            canisterId: nft.canisterId,
            targetEVM: activeAddress,
            remoteContract: remoteContractInfo.address,
          });
          
          // Submit the real cast operation directly to ckNFT canister (bypassing mutations to avoid internal approvals)
          // Cycles and NFT approvals are already done above
          const { Actor } = await import('@dfinity/agent');
          const { idlFactory: ckNFTIdlFactory } = await import('../../declarations/ckNFT');
          
          const ckNFTActor = Actor.createActor(ckNFTIdlFactory, {
            agent: authenticatedAgent,
            canisterId: Principal.fromText(nft.canisterId),
          });

          // Call icrc99_cast directly (not through the mutation to avoid internal approvals)
          const userAccount = user?.principal ? {
            owner: typeof user.principal === 'string' ? Principal.fromText(user.principal) : user.principal,
            subaccount: [] as []
          } : null;

          if (!userAccount) {
            throw new Error('User account not available for casting');
          }

          const castResult = await (ckNFTActor as any).icrc99_cast([ckNFTCastRequest], [userAccount]);
          
          // Handle optional result (first item in array)
          const firstResult = castResult[0];
          if (firstResult && firstResult[0] && 'Ok' in firstResult[0]) {
            console.log(`✅ NFT ${i + 1}/${selectedICNFTs.length} cast submitted successfully. Cast ID: ${firstResult.Ok}`);
            castResults.push(firstResult);
            castStatusIds.push(firstResult.Ok);
            exportedTokenReferences.push(`${nft.name || `Token ${nft.tokenId}`} → EVM (Cast ID: ${firstResult.Ok})`);
          } else {
            const error = firstResult ? firstResult.Err : 'No result returned';
            console.error(`❌ NFT ${i + 1}/${selectedICNFTs.length} cast failed:`, error);
            
            // Handle specific error types with helpful messages
            let errorMessage = 'Cast operation failed';
            
            if (error && typeof error === 'object') {
              if ('InsufficientAllowance' in error && Array.isArray(error.InsufficientAllowance)) {
                const [required, available] = error.InsufficientAllowance;
                errorMessage = `Insufficient allowance for NFT casting. Required: ${required.toString()}, Available: ${available.toString()}. Please approve the NFT for transfer before casting.`;
              } else if ('InsufficientCycles' in error && Array.isArray(error.InsufficientCycles)) {
                const [required, available] = error.InsufficientCycles;
                errorMessage = `Insufficient cycles for casting. Required: ${required.toString()}, Available: ${available.toString()}. Please ensure sufficient cycles are available.`;
              } else if ('InsufficientBalance' in error && Array.isArray(error.InsufficientBalance)) {
                const [required, available] = error.InsufficientBalance;
                errorMessage = `Insufficient balance for casting. Required: ${required.toString()}, Available: ${available.toString()}.`;
              } else if ('NotFound' in error) {
                errorMessage = 'NFT not found. Please ensure the NFT exists and you own it.';
              } else if ('Unauthorized' in error) {
                errorMessage = 'Unauthorized to cast this NFT. Please ensure you own the NFT.';
              } else if ('ExistingCast' in error) {
                const castId = error.ExistingCast;
                errorMessage = `NFT is already being cast. Existing cast ID: ${castId.toString()}`;
              } else {
                // Generic error handling with BigInt serialization
                try {
                  errorMessage = `Cast operation failed: ${JSON.stringify(error, (_key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                  )}`;
                } catch {
                  errorMessage = `Cast operation failed: ${String(error)}`;
                }
              }
            } else {
              errorMessage = `Cast operation failed: ${String(error)}`;
            }
            
            throw new Error(errorMessage);
          }
          
        } catch (castError) {
          console.error(`❌ Error casting NFT ${i + 1}/${selectedICNFTs.length}:`, castError);
          updateProgressStep('cast-nfts', 'failed', 
            castError instanceof Error ? castError.message : `Failed to cast NFT ${i + 1}`);
          return;
        }
      }

      updateProgressStep('cast-nfts', 'completed', `Successfully submitted ${castResults.length} NFT(s) for casting`);
      
      // Step 4: Monitor cast status and wait for EVM confirmation
      updateProgressStep('wait-evm-confirmation', 'loading', 'Monitoring cast operations...');
      
      try {
        console.log('🔍 Monitoring cast operations:', castStatusIds.map(id => id.toString()));
        
        // Poll cast status until all operations complete
        let maxAttempts = 30; // 5 minutes with 10-second intervals
        let allCompleted = false;
        let evmTransactionHashes: string[] = [];
        
        while (maxAttempts > 0 && !allCompleted) {
          updateProgressStep('wait-evm-confirmation', 'loading', 
            `Monitoring cast operations... (${31 - maxAttempts}/30 checks)`);
          
          try {
            // Get the ckNFT canister ID from the first selected NFT (all should be from same canister)
            const ckNFTCanisterId = selectedICNFTs[0]?.canisterId;
            if (!ckNFTCanisterId) {
              throw new Error('ckNFT canister ID not available for status check');
            }

            const statusResults = await mutations.getCastStatus.mutateAsync({
              castIds: castStatusIds,
              ckNFTCanisterId: ckNFTCanisterId,
              // Optionally pass user account for authenticated status check
              account: user?.principal ? { owner: user.principal, subaccount: [] } : undefined
            });
            console.log('🔍 Cast status check results from ckNFT canister:', statusResults);
            
            let completedCount = 0;
            let hasErrors = false;
            
            for (let i = 0; i < statusResults.length; i++) {
              const castStateOption = statusResults[i];
              // Handle Candid optional: [] | [CastStateShared]
              const castState = castStateOption && castStateOption[0];
              if (castState) {
                console.log(`🔍 Cast ${castStatusIds[i]} state:`, castState);
                
                // The status is in castState.status as a variant
                const status = castState.status;
                
                if (status && 'Completed' in status) {
                  completedCount++;
                  console.log(`✅ Cast ${castStatusIds[i]} completed with value:`, status.Completed);
                  
                  // Look for transaction hash in the history
                  if (castState.history) {
                    for (const historyEntry of castState.history) {
                      const [historyStatus] = historyEntry;
                      if (historyStatus && 'WaitingOnTransfer' in historyStatus) {
                        const txHash = historyStatus.WaitingOnTransfer?.transaction;
                        if (txHash && !evmTransactionHashes.includes(txHash)) {
                          evmTransactionHashes.push(txHash);
                          console.log(`📋 Found transaction hash for cast ${castStatusIds[i]}: ${txHash}`);
                        }
                      }
                    }
                  }
                } else if (status && ('Error' in status || 'Failed' in status)) {
                  hasErrors = true;
                  console.error(`❌ Cast operation ${castStatusIds[i]} failed:`, status);
                } else {
                  console.log(`⏳ Cast ${castStatusIds[i]} still in progress:`, status);
                }
              } else {
                console.warn(`⚠️ No status found for cast ID ${castStatusIds[i]}`);
              }
            }
            
            if (hasErrors) {
              throw new Error('One or more cast operations failed');
            }
            
            if (completedCount === castStatusIds.length) {
              allCompleted = true;
              console.log('🎉 All cast operations completed successfully!');
            } else {
              console.log(`⏳ Progress: ${completedCount}/${castStatusIds.length} casts completed`);
              await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before next check
            }
            
          } catch (statusError) {
            console.error('❌ Error checking cast status:', statusError);
            // Continue trying for a bit longer in case of temporary issues
          }
          
          maxAttempts--;
        }
        
        if (!allCompleted) {
          console.warn('⚠️ Cast operations still in progress after monitoring timeout');
          updateProgressStep('wait-evm-confirmation', 'completed', 
            'Cast operations submitted successfully. Final confirmation may take additional time.');
        } else {
          updateProgressStep('wait-evm-confirmation', 'completed', 
            `All ${castResults.length} NFT(s) successfully exported to EVM`);
        }
        
      } catch (monitorError) {
        console.error('❌ Error monitoring cast operations:', monitorError);
        // Don't fail the entire process - the casts were submitted successfully
        updateProgressStep('wait-evm-confirmation', 'completed', 
          'Cast operations submitted. Monitoring encountered issues but exports should complete.');
      }

      // Success!
      setExportResult({
        success: true,
        evmTransactionHash: evmTransactionHashes.length > 0 ? evmTransactionHashes[0] : undefined,
        icTransactionHash: castStatusIds.map(id => id.toString()).join(', '),
        remoteContractAddress: remoteContractInfo.address || 'deployed-contract-address',
        tokenId: selectedICNFTs.map(nft => nft.tokenId).join(', '),
      });

      console.log('🎉 ICRC-99 export process completed successfully!');

      setCurrentStep('complete');
      onComplete?.({
        success: true,
        evmTransactionHash: evmTransactionHashes.length > 0 ? evmTransactionHashes[0] : undefined,
        icTransactionHash: castStatusIds.map(id => id.toString()).join(', '),
        remoteContractAddress: remoteContractInfo.address || 'deployed-contract-address',
        tokenId: selectedICNFTs.map(nft => nft.tokenId).join(', '),
      });
    } catch (error) {
      console.error('Export process failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      
      if (progress?.steps) {
        const currentProgressStep = progress.steps.find((step: any) => step.status === 'loading');
        if (currentProgressStep) {
          updateProgressStep(currentProgressStep.id, 'failed', errorMessage);
        }
      }
      
      setExportResult({
        success: false,
        error: errorMessage,
      });
      
      onComplete?.({
        success: false,
        error: errorMessage,
      });
    }
  }, [selectedICNFTs, activeAddress, user, remoteContractInfo, targetNetwork, sourceContractPointer, exportCosts, updateProgressStep, onComplete, progress, createExportProgressState, mutations]);

  console.log('EVMExportWizard initialized with steps:', remoteContractInfo);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-ic-nft':
        return (
          <div className="space-y-4">
            <ICNFTSelectionStep
              sourceCanisterId={sourceCanisterId}
              selectedNFTs={selectedICNFTs}
              onSelectionChange={setSelectedICNFTs}
              userPrincipal={user?.principal}
              onCanisterChange={setActiveCanisterId}
              targetChain='evm'
            />
            
            {/* Show ICRC-99 support status when canister is loaded */}
            {selectedICNFTs.length > 0 && activeCanisterId && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  {icrc99Support.isLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
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
                      <span className="text-xs text-gray-500">- IC-to-EVM casting available</span>
                    </>
                  )}
                </div>
                
                {icrc99Support.nativeChain && sourceContractPointer && (
                  <div className="mt-2 text-xs text-gray-600">
                    <span className="font-medium">Source Network:</span> {
                      'IC' in sourceContractPointer.network ? 'Internet Computer' :
                      'Ethereum' in sourceContractPointer.network ? 'Ethereum Network' :
                      'Other Network'
                    }
                    <br />
                    <span className="font-medium">Contract:</span> <span className="font-mono">{sourceContractPointer.contract}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'connect':
        return (
          <EVMConnectionStep
            isConnected={effectiveIsConnected}
            account={effectiveAccount}
            supportedNetworks={supportedNetworks}
            currentNetwork={chainId ? chainIdToNetwork[chainId] || null : null}
            onConnect={connectWallet}
            onSwitchNetwork={(network) => {
              const chainId = networkToChainId[network as keyof typeof networkToChainId];
              if (chainId) {
                return switchChain(chainId);
              }
              throw new Error(`Unsupported network: ${network}`);
            }}
            selectedTargetNetwork={targetNetwork && 'Ethereum' in targetNetwork ? 
              chainIdToNetwork[Number(targetNetwork.Ethereum[0])] || undefined : undefined}
            onTargetNetworkChange={(networkName: string) => {
              const chainId = networkToChainId[networkName as keyof typeof networkToChainId];
              if (chainId) {
                setTargetNetwork({ Ethereum: [BigInt(chainId)] });
              }
            }}
          />
        );

      case 'remote-contract':
        return (
          <RemoteContractStep
            selectedNFTs={selectedICNFTs}
            targetChainId={targetNetwork && 'Ethereum' in targetNetwork ? targetNetwork.Ethereum[0]?.toString() || '' : ''}
            remoteContractInfo={remoteContractInfo}
            onRemoteContractInfoChange={setRemoteContractInfo}
            sourceCanisterId={selectedICNFTs[0]?.canisterId || ''}
            sourceContractPointer={sourceContractPointer}
          />
        );

      case 'costs':
        return (
          <ExportCostsStep
            selectedNFTs={selectedICNFTs}
            targetNetwork={targetNetwork}
            remoteContractInfo={remoteContractInfo}
            sourceContractPointer={sourceContractPointer}
            onCostsCalculated={setExportCosts}
          />
        );

      case 'export':
        return (
          <ExportProgressStep
            progress={progress}
            onRetryStep={retryProgressStep}
            onToggleStage={() => {}} // No-op since collapsible stages are removed
          />
        );

      case 'complete':
        return (
          <ExportCompletionStep
            result={exportResult!}
            onStartNew={() => {
              setCurrentStep('select-ic-nft');
              setSelectedICNFTs([]);
              setTargetNetwork(null);
              setRemoteContractInfo(null);
              setExportCosts(null);
              setExportResult(null);
              createExportProgressState('ic-to-evm' as BridgeDirection);
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
          <h2 className="text-xl font-semibold text-gray-900">Export NFTs to EVM</h2>
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
                      : 'bg-blue-100 text-blue-600'
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
        
        {/* Error indicator */}
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
      <div className="p-6 min-h-[400px]">
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
              className="flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
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
                  ? 'text-white bg-blue-600 hover:bg-blue-700'
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

// Export Progress Step Component (similar to import wizard)
function ExportProgressStep({
  progress,
  onRetryStep,
  onToggleStage,
}: {
  progress: BridgeProgress | null;
  onRetryStep: (stepId: string) => void;
  onToggleStage: (stageId: string) => void;
}) {
  if (!progress) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Initializing export process...</p>
      </div>
    );
  }

  const activeSteps = progress.steps?.filter((step: any) => 
    step.status === 'loading' || step.status === 'failed'
  ) || [];
  
  const currentStep = activeSteps[0];
  const hasErrors = progress.steps?.some((step: any) => step.status === 'failed') || false;
  const completedSteps = progress.steps?.filter((step: any) => step.status === 'completed') || [];
  const totalSteps = progress.steps?.length || 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {hasErrors ? 'Export Failed' : 'Export in Progress'}
        </h3>
        <p className="text-gray-600">
          {hasErrors 
            ? 'An error occurred during the export process.' 
            : 'Exporting your ckNFTs back to the EVM blockchain...'}
        </p>
      </div>

      {/* Progress Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">
            {completedSteps.length} of {totalSteps} steps completed
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              hasErrors ? 'bg-red-500' : 'bg-blue-600'
            }`}
            style={{ width: `${(completedSteps.length / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      {currentStep && (
        <div className={`p-4 rounded-lg border ${
          currentStep.status === 'failed' 
            ? 'bg-red-50 border-red-200' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center">
            {currentStep.status === 'loading' ? (
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
            ) : (
              <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <div>
              <h4 className={`font-medium ${
                currentStep.status === 'failed' ? 'text-red-800' : 'text-blue-800'
              }`}>
                {currentStep.status === 'loading' ? 'In Progress: ' : 'Failed: '}
                {currentStep.title || currentStep.id}
              </h4>
              {currentStep.error && (
                <p className="text-sm text-red-600 mt-1">{currentStep.error}</p>
              )}
              {currentStep.status === 'loading' && (
                <p className="text-sm text-blue-600 mt-1">Please wait...</p>
              )}
            </div>
          </div>

          {/* Retry button for failed steps */}
          {currentStep.status === 'failed' && (
            <div className="mt-3">
              <button
                onClick={() => onRetryStep(currentStep.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Retry Step
              </button>
            </div>
          )}
        </div>
      )}

      {/* All steps completed successfully */}
      {!currentStep && !hasErrors && totalSteps > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-green-800">Export Complete!</h4>
              <p className="text-sm text-green-600 mt-1">Your ckNFTs have been successfully exported to EVM.</p>
            </div>
          </div>
        </div>
      )}

      {/* Show detailed checklist for debugging */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
          Show Detailed Progress
        </summary>
        <div className="mt-3 p-4 bg-gray-50 rounded-lg">
          <BridgeChecklist
            progress={progress}
            onRetryStep={onRetryStep}
            onToggleStage={onToggleStage}
          />
        </div>
      </details>
    </div>
  );
}

// Export Completion Step Component
function ExportCompletionStep({
  result,
  onStartNew,
  onClose,
}: {
  result: ExportResult;
  onStartNew: () => void;
  onClose: () => void;
}) {
  const tokenIds = result.tokenId ? result.tokenId.split(', ') : [];
  const isMultipleNFTs = tokenIds.length > 1;

  return (
    <div className="space-y-6 text-center">
      <div>
        {result.success ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isMultipleNFTs ? `${tokenIds.length} NFTs Exported Successfully!` : 'Export Successful!'}
            </h3>
            <p className="text-gray-600">
              {isMultipleNFTs 
                ? `Your ${tokenIds.length} ckNFTs have been successfully exported back to the EVM blockchain.`
                : 'Your ckNFT has been successfully exported back to the EVM blockchain.'
              }
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Export Failed</h3>
            <p className="text-gray-600">{result.error}</p>
          </>
        )}
      </div>

      {result.success && (
        <div className="space-y-3 text-sm">
          {/* Remote Contract Information */}
          {result.remoteContractAddress && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-800 mb-1">EVM Contract</p>
              <p className="text-blue-700 font-mono text-xs break-all">
                {result.remoteContractAddress}
              </p>
            </div>
          )}
          
          {/* Token Information */}
          {tokenIds.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-800 mb-1">
                {isMultipleNFTs ? 'Exported Token IDs' : 'Exported Token ID'}
              </p>
              <p className="text-green-700">{result.tokenId}</p>
            </div>
          )}
          
          {/* EVM Transaction */}
          {result.evmTransactionHash && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="font-medium text-gray-800 mb-1">EVM Transaction</p>
              <p className="text-gray-700 font-mono text-xs break-all">
                {result.evmTransactionHash}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center space-x-4">
        <button
          onClick={onStartNew}
          className="px-6 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
        >
          Export More NFTs
        </button>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
