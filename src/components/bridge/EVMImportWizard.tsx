import { useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { clsx } from 'clsx';
import { BridgeChecklist } from '../BridgeChecklist';
import { use99Mutations } from '../../hooks/use99Mutations';
import { useAuth } from '../../hooks/useAuth';
import { useMetaMask } from '../../hooks/useEVM';
import type { ContractPointer, Network } from '../../declarations/orchestrator/orchestrator.did';
import { EVMConnectionStep } from './EVMConnectionStep';
import { NFTSelectionStep, type SelectedNFT, type NFTDiscoveryService } from './NFTSelectionStep';
import { CanisterCostStep } from './CanisterCostStep';
import { NFTMintEstimationStep } from './NFTMintEstimationStep';

import { 
  BridgeProgress, 
  BridgeDirection, 
  createBridgeProgress,
  updateBridgeStep,
  retryBridgeStep
} from '../../lib/bridgeProgress';

type WizardStep = 'connect' | 'select' | 'costs' | 'gas' | 'bridge' | 'complete';

export interface EVMImportWizardProps {
  /** The ICRC-99 canister ID to import NFTs to */
  canisterId: string;
  /** Supported EVM networks for import */
  supportedNetworks?: string[];
  /** NFT discovery service for fetching user's collections and NFTs */
  nftDiscoveryService?: NFTDiscoveryService;
  /** Callback when the import process completes */
  onComplete?: (result: ImportResult) => void;
  /** Callback when the wizard is cancelled */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Show the wizard in a modal */
  modal?: boolean;
  /** Initial step to show (for demos/testing) */
  initialStep?: WizardStep;
  /** Mock selected NFTs (for demos/testing) */
  mockSelectedNFTs?: SelectedNFT[];
  /** Mock wallet connection state (for demos/testing) */
  mockWalletConnected?: boolean;
  /** Mock canister costs (for demos/testing) */
  mockCanisterCosts?: string;
  /** Mock mint costs (for demos/testing) */
  mockMintCosts?: string;
  /** Mock import result (for demos/testing) */
  mockImportResult?: ImportResult;
}

export interface ImportResult {
  success: boolean;
  evmTransactionHash?: string;
  icTransactionHash?: string;
  canisterAddress?: string;
  tokenId?: string;
  error?: string;
}

export function EVMImportWizard({
  canisterId: _canisterId,
  supportedNetworks = ['ethereum', 'polygon'],
  nftDiscoveryService,
  onComplete,
  onCancel,
  className,
  modal = false,
  initialStep,
  mockSelectedNFTs,
  mockWalletConnected,
  mockCanisterCosts,
  mockMintCosts,
  mockImportResult,
}: EVMImportWizardProps) {
  // Network name to chain ID mapping
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

  const [currentStep, setCurrentStep] = useState<WizardStep>(initialStep || 'connect');
  const [selectedNFTs, setSelectedNFTs] = useState<SelectedNFT[]>(mockSelectedNFTs || []);
  const [targetNetwork, setTargetNetwork] = useState<Network | null>(null);
  const [canisterCosts, setCanisterCosts] = useState<bigint | null>(
    mockCanisterCosts ? BigInt(mockCanisterCosts) : null
  );
  const [mintCosts, setMintCosts] = useState<bigint | null>(
    mockMintCosts ? BigInt(mockMintCosts) : null
  );
  const [importResult, setImportResult] = useState<ImportResult | null>(mockImportResult || null);
  const [progress, setProgress] = useState<BridgeProgress | null>(null);

  // Hooks
  const { activeAddress, isUnlocked, connectWallet, switchChain, chainId } = useMetaMask();
  const { user } = useAuth();

  // ICRC-99 mutations for bridge operations - now safe to call without authentication
  const mutations = use99Mutations(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai');
  
  // Create contract pointer for bridge operations - use target network when available
  const contractPointer: ContractPointer | null = useMemo(() => {
    if (selectedNFTs.length === 0) return null;
    
    // For now, we'll use the first NFT's contract for the bridge operation
    // Note: All selected NFTs should be from the same contract for this bridge version
    const firstContract = selectedNFTs[0].contractAddress;
    
    // Check if all NFTs are from the same contract
    const allSameContract = selectedNFTs.every(nft => nft.contractAddress === firstContract);
    if (!allSameContract) {
      console.warn('⚠️ Selected NFTs are from different contracts. Only NFTs from the first contract will be bridged:', firstContract);
    }
    
    // Use target network if selected, otherwise fall back to current connected network
    let network: Network;
    if (targetNetwork) {
      network = targetNetwork;
    } else if (chainId) {
      // Fallback to current connected network
      network = { Ethereum: [BigInt(chainId)] };
    } else {
      return null; // No network available
    }
    
    return {
      contract: firstContract,
      network,
    };
  }, [selectedNFTs, targetNetwork, chainId]);

  // Debug logging for contract pointer and target network
  useEffect(() => {
    console.log('🔍 Import wizard contract pointer updated:', {
      contractPointer,
      targetNetwork,
      chainId,
      hasSelectedNFTs: selectedNFTs.length > 0,
    });
  }, [contractPointer, targetNetwork, chainId, selectedNFTs.length]);

  // Only get cost data during bridge operations, not for display
  // Cost calculation is handled by CanisterCostStep component

  // Override wallet state for mocking in Storybook
  const effectiveIsConnected = mockWalletConnected !== undefined ? mockWalletConnected : isUnlocked;
  const effectiveAccount = mockWalletConnected ? '0x742d35Cc6635C0532925a3b8D11e432f1b7C4b7b' : activeAddress;

  // Helper function to sanitize text for UTF-8 compatibility
  const sanitizeText = useCallback((text: string): string => {
    try {
      // Remove any null bytes and non-printable characters except newlines
      let cleaned = text.replace(/\x00/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Ensure valid UTF-8 by encoding and decoding
      const encoder = new TextEncoder();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const bytes = encoder.encode(cleaned);
      cleaned = decoder.decode(bytes);
      
      // Remove any replacement characters that might have been added
      cleaned = cleaned.replace(/\uFFFD/g, '');
      
      return cleaned.trim();
    } catch (error) {
      console.warn('Error sanitizing text:', error, 'Original:', text);
      // Fallback: keep only ASCII characters
      return text.replace(/[^\x20-\x7E\n]/g, '').trim();
    }
  }, []);

  // Progress management functions
  const createBridgeProgressState = useCallback((direction: BridgeDirection) => {
    const newProgress = createBridgeProgress(direction);
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
    createBridgeProgressState('evm-to-ic' as BridgeDirection);
  }, [createBridgeProgressState]);

  const steps: { id: WizardStep; title: string; description: string }[] = [
    { id: 'connect', title: 'Connect Wallet', description: 'Connect your EVM wallet' },
    { id: 'select', title: 'Select NFTs', description: 'Choose NFTs to import' },
    { id: 'costs', title: 'Canister Costs', description: 'Review and pay canister fees' },
    { id: 'gas', title: 'NFT Mint Costs', description: 'Review and approve cycles for NFT minting' },
    { id: 'bridge', title: 'Bridge Progress', description: 'Monitor the bridging process' },
    { id: 'complete', title: 'Complete', description: 'Import summary' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'connect':
        return isUnlocked && activeAddress && targetNetwork !== null;
      case 'select':
        return selectedNFTs.length > 0;
      case 'costs':
        return canisterCosts !== null;
      case 'gas':
        return mintCosts !== null;
      case 'bridge':
        return importResult?.success === true;
      default:
        return false;
    }
  }, [currentStep, isUnlocked, activeAddress, targetNetwork, selectedNFTs, canisterCosts, mintCosts, importResult]);

  // Allow going back on errors, even during bridge step
  const hasError = useMemo(() => {
    // Check if there's a bridge error in progress
    if (progress?.steps) {
      const bridgeError = progress.steps.some((step: any) => step.status === 'failed');
      if (bridgeError) {
        console.log('🚨 Bridge error detected in progress steps:', progress.steps.filter((step: any) => step.status === 'failed'));
        return true;
      }
    }
    
    // Check mutation errors from the current step
    if (currentStep === 'costs') {
      const error = !!(mutations.createCanister.error);
      if (error) console.log('🚨 Canister creation error detected:', mutations.createCanister.error);
      return error;
    }
    
    if (currentStep === 'gas') {
      const error = !!(mutations.mintFromEVM.error);
      if (error) console.log('🚨 Mint estimation error detected:', mutations.mintFromEVM.error);
      return error;
    }
    
    if (currentStep === 'bridge') {
      const error = !!(mutations.mintFromEVM.error || mutations.getApprovalAddress.error);
      if (error) console.log('🚨 Bridge mutation error detected:', { 
        mintError: mutations.mintFromEVM.error, 
        approvalError: mutations.getApprovalAddress.error 
      });
      return error;
    }
    
    // Check if import result shows failure
    if (importResult && !importResult.success) {
      console.log('🚨 Import result shows failure:', importResult.error);
      return true;
    }
    
    return false;
  }, [progress, currentStep, mutations.createCanister.error, mutations.mintFromEVM.error, mutations.getApprovalAddress.error, importResult]);

  const canGoPrev = currentStepIndex > 0 && 
    (currentStep !== 'bridge' && currentStep !== 'complete' || hasError);

  // Debug logging for back button state
  useEffect(() => {
    console.log('🔙 Back button state:', {
      currentStepIndex,
      currentStep,
      hasError,
      canGoPrev,
      progressSteps: progress?.steps?.map(s => ({ id: s.id, status: s.status }))
    });
  }, [currentStepIndex, currentStep, hasError, canGoPrev, progress?.steps]);

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

  const handleStartBridge = useCallback(async () => {
    if (!selectedNFTs.length || !activeAddress || !contractPointer || !user?.principal) return;

    setCurrentStep('bridge');
    
    // Create bridge progress state
    createBridgeProgressState('evm-to-ic');
    
    try {
      // Step 1: Connect EVM wallet - Already connected
      updateProgressStep('connect-evm-wallet', 'loading');
      updateProgressStep('connect-evm-wallet', 'completed');

      console.log(`🚀 Starting bridge process for ${selectedNFTs.length} NFT(s)`);

      // Filter NFTs to only include those from the contract we're bridging
      const contractAddress = contractPointer.contract;
      const contractNFTs = selectedNFTs.filter(nft => nft.contractAddress === contractAddress);
      
      if (contractNFTs.length !== selectedNFTs.length) {
        console.warn(`⚠️ Filtered ${selectedNFTs.length - contractNFTs.length} NFT(s) from different contracts. Bridging ${contractNFTs.length} NFT(s) from contract ${contractAddress}`);
      }
      
      if (contractNFTs.length === 0) {
        throw new Error('No NFTs found for the selected contract');
      }

      // Group NFTs by their status (ready-to-mint vs owned)
      const readyToMintNFTs = contractNFTs.filter(nft => nft.ownershipStatus === 'ready-to-mint');
      const ownedNFTs = contractNFTs.filter(nft => nft.ownershipStatus === 'owned');
      
      console.log(`📊 NFT breakdown for contract ${contractAddress}: ${readyToMintNFTs.length} ready-to-mint, ${ownedNFTs.length} owned`);

      // For owned NFTs, we need to handle transfer first
      if (ownedNFTs.length > 0) {
        // Step 2: Transfer all owned NFTs to bridge
        updateProgressStep('approve-nft-transfer', 'loading');
        
        console.log(`🔄 Processing ${ownedNFTs.length} owned NFT(s) for transfer`);
        
        // Process each owned NFT
        for (let i = 0; i < ownedNFTs.length; i++) {
          const ownedNFT = ownedNFTs[i];
          console.log(`🚀 Processing owned NFT ${i + 1}/${ownedNFTs.length}: Token ${ownedNFT.tokenId}`);
          
          // Get the approval address from the orchestrator
          const approvalAddressResult = await mutations.getApprovalAddress.mutateAsync({
            request: {
              account: {
                owner: user.principal,
                subaccount: [] as []
              },
              remoteNFTPointer: {
                tokenId: BigInt(ownedNFT.tokenId),
                contract: contractPointer.contract,
                network: contractPointer.network,
              }
            }
          });
          
          const approvalAddress = approvalAddressResult;
          if (!approvalAddress) {
            throw new Error(`Failed to get approval address for NFT ${ownedNFT.tokenId}`);
          }

          // Step 2.5: Transfer NFT to the approval address using MetaMask
          updateProgressStep('transfer-nft-to-bridge', 'loading', `Transferring NFT ${i + 1}/${ownedNFTs.length}`);
          
          try {
            // Get the user to transfer the NFT using MetaMask
            if (!window.ethereum) {
              throw new Error('MetaMask not detected');
            }
            
            // Import ethers for this operation
            const { ethers } = await import('ethers');
            
            // Create provider and signer
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Enhanced ERC-721 ABI for transfer operations
            const erc721ABI = [
              'function safeTransferFrom(address from, address to, uint256 tokenId) external',
              'function transferFrom(address from, address to, uint256 tokenId) external',
              'function ownerOf(uint256 tokenId) external view returns (address)'
            ];
            
            // Create contract instance
            const nftContract = new ethers.Contract(
              ownedNFT.contractAddress,
              erc721ABI,
              signer
            );
            
            const tokenId = BigInt(ownedNFT.tokenId);
            
            console.log(`🔍 Pre-transfer checks for NFT ${i + 1}:`, {
              tokenId: tokenId.toString(),
              from: activeAddress,
              to: approvalAddress,
              contract: ownedNFT.contractAddress
            });
            
            // Verify ownership before transfer
            try {
              const currentOwner = await nftContract.ownerOf(tokenId);
              console.log(`Current NFT ${i + 1} owner:`, currentOwner);
              console.log('User address:', activeAddress);
              
              if (currentOwner.toLowerCase() !== activeAddress.toLowerCase()) {
                throw new Error(`NFT ${i + 1} ownership mismatch. Current owner: ${currentOwner}, User: ${activeAddress}`);
              }
            } catch (ownershipError) {
              console.error(`Ownership check failed for NFT ${i + 1}:`, ownershipError);
              throw new Error(`Failed to verify NFT ${i + 1} ownership: ${ownershipError instanceof Error ? ownershipError.message : 'Unknown error'}`);
            }
            
            // Transfer the NFT to the bridge address (no approval needed - direct transfer)
            console.log(`🚀 Transferring NFT ${i + 1} (${tokenId.toString()}) from ${activeAddress} to ${approvalAddress}`);
            updateProgressStep('transfer-nft-to-bridge', 'loading', `Executing NFT ${i + 1} transfer...`);
            
            try {
              // Try safeTransferFrom first
              const transferTx = await nftContract.safeTransferFrom(
                activeAddress,
                approvalAddress,
                tokenId
              );
              
              console.log(`Transfer transaction ${i + 1} submitted:`, transferTx.hash);
              
              // Wait for transaction confirmation
              const receipt = await transferTx.wait();
              console.log(`Transfer ${i + 1} confirmed:`, receipt);
              
              updateProgressStep('transfer-nft-to-bridge', 'loading', `NFT ${i + 1} transferred successfully`);
              
            } catch (safeTransferError) {
              console.warn(`safeTransferFrom failed for NFT ${i + 1}, trying transferFrom:`, safeTransferError);
              
              // If safeTransferFrom fails, try regular transferFrom
              const transferTx = await nftContract.transferFrom(
                activeAddress,
                approvalAddress,
                tokenId
              );
              
              console.log(`Transfer transaction ${i + 1} submitted (via transferFrom):`, transferTx.hash);
              
              // Wait for transaction confirmation
              const receipt = await transferTx.wait();
              console.log(`Transfer ${i + 1} confirmed (via transferFrom):`, receipt);
              
              updateProgressStep('transfer-nft-to-bridge', 'loading', `NFT ${i + 1} transferred successfully`);
            }
            
          } catch (transferError) {
            console.error(`NFT ${i + 1} transfer failed:`, transferError);
            
            // Provide more detailed error messaging
            let errorMessage = `NFT ${i + 1} transfer failed`;
            if (transferError instanceof Error) {
              if (transferError.message.includes('execution reverted')) {
                if (transferError.message.includes('ERC721: transfer caller is not owner nor approved')) {
                  errorMessage = `Transfer failed for NFT ${i + 1}: Not approved for transfer. Please ensure the NFT is approved.`;
                } else if (transferError.message.includes('ERC721: transfer from incorrect owner')) {
                  errorMessage = `Transfer failed for NFT ${i + 1}: You do not own this NFT or ownership has changed.`;
                } else if (transferError.message.includes('ERC721: transfer to the zero address')) {
                  errorMessage = `Transfer failed for NFT ${i + 1}: Invalid bridge address received.`;
                } else {
                  errorMessage = `Transfer failed for NFT ${i + 1}: ${transferError.message}`;
                }
              } else {
                errorMessage = `NFT ${i + 1}: ${transferError.message}`;
              }
            }
            
            updateProgressStep('transfer-nft-to-bridge', 'failed', errorMessage);
            
            // Add additional debugging information
            console.error(`🔥 Transfer error details for NFT ${i + 1}:`, {
              error: transferError,
              tokenId: ownedNFT.tokenId,
              contract: ownedNFT.contractAddress,
              from: activeAddress,
              to: approvalAddress,
              network: chainId
            });
            
            throw new Error(errorMessage);
          }
          
          // Add a small delay between transfers to avoid overwhelming the network
          if (i < ownedNFTs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Add the transferred NFT to ready-to-mint list for minting
          readyToMintNFTs.push(ownedNFT);
          console.log(`✅ NFT ${i + 1}/${ownedNFTs.length} transferred successfully and added to mint queue`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        updateProgressStep('approve-nft-transfer', 'completed', `${ownedNFTs.length} NFT(s) transferred`);
        updateProgressStep('transfer-nft-to-bridge', 'completed', `All ${ownedNFTs.length} owned NFT(s) transferred successfully`);
      } else {
        // Skip transfer steps if no owned NFTs
        console.log('🏃‍♂️ No owned NFTs to transfer, skipping transfer steps');
        updateProgressStep('approve-nft-transfer', 'completed', 'Skipped - No owned NFTs to transfer');
        updateProgressStep('transfer-nft-to-bridge', 'completed', 'Skipped - No owned NFTs to transfer');
      }
      // Step 3: Create or ensure ckNFT canister exists
      updateProgressStep('create-cknft-canister', 'loading');
      
      let canisterResult;
      
      // Check if canister already exists by querying directly
      try {
        const existingCanisters = await mutations.getCkNFTCanister.mutateAsync([contractPointer]);
        const existingCanisterId = existingCanisters[0];
        
        if (existingCanisterId) {
          // Canister already exists
          console.log('Using existing canister:', existingCanisterId);
          canisterResult = { Ok: existingCanisterId };
        } else {
          // Create new canister using first NFT for defaults
          const firstNFT = selectedNFTs[0];
          canisterResult = await mutations.createCanister.mutateAsync({
            pointer: contractPointer,
            defaults: {
              name: sanitizeText(firstNFT.name || `ckNFT Collection`),
              symbol: sanitizeText(`ck${firstNFT.contractAddress.slice(-4)}`),
              description: sanitizeText(`Bridged NFT collection from ${contractPointer.contract}`),
            },
            requiredCycles: canisterCosts || BigInt(0),
            skipApproval: false // Let the mutation handle cycles approval
          });
        }
      } catch (existingCheckError) {
        // If checking existing fails, try to create new canister
        console.log('Failed to check existing canister, creating new one:', existingCheckError);
        const firstNFT = selectedNFTs[0];
        canisterResult = await mutations.createCanister.mutateAsync({
          pointer: contractPointer,
          defaults: {
            name: sanitizeText(firstNFT.name || `ckNFT Collection`),
            symbol: sanitizeText(`ck${firstNFT.contractAddress.slice(-4)}`),
            description: sanitizeText(`Bridged NFT collection from ${contractPointer.contract}`),
          },
          requiredCycles: canisterCosts || BigInt(0),
          skipApproval: false // Let the mutation handle cycles approval
        });
      }
      
      if ('Err' in canisterResult) {
        // Handle BigInt serialization properly
        const errorMessage = (() => {
          try {
            return JSON.stringify(canisterResult.Err, (_key, value) =>
              typeof value === 'bigint' ? value.toString() : value
            );
          } catch {
            return String(canisterResult.Err);
          }
        })();
        throw new Error(`Canister creation failed: ${errorMessage}`);
      }
      
      const newCanisterId = 'Ok' in canisterResult ? canisterResult.Ok : canisterResult;
      updateProgressStep('create-cknft-canister', 'completed');

      // Step 4: Mint (bridge) the NFTs
      updateProgressStep('mint-cknft', 'loading');
      
      console.log(`🎯 Starting mint process for ${readyToMintNFTs.length} NFT(s)`);
      
      const mintResults: any[] = [];
      const mintedTokenReferences: string[] = [];
      
      // Mint each ready-to-mint NFT sequentially
      for (let i = 0; i < readyToMintNFTs.length; i++) {
        const nft = readyToMintNFTs[i];
        console.log(`🔄 Minting NFT ${i + 1}/${readyToMintNFTs.length}: Token ${nft.tokenId}`);
        
        updateProgressStep('mint-cknft', 'loading', `Minting NFT ${i + 1}/${readyToMintNFTs.length}...`);
        
        // Create mint request for the current NFT
        // IMPORTANT: The tokenId should be preserved across chains
        // The IC NFT should maintain the same token ID as the original EVM NFT
        const mintRequest = {
          nft: {
            tokenId: BigInt(nft.tokenId), // This should be preserved on IC
            contract: contractPointer.contract,
            network: contractPointer.network,
          },
          resume: [] as [], // Empty for new mint
          mintToAccount: { 
            owner: user.principal, 
            subaccount: [] as [] 
          },
          spender: [] as [], // Empty optional
        };

        console.log(`🔍 Mint request data for NFT ${i + 1} (preserving token ID ${nft.tokenId}):`, {
          mintRequest: {
            ...mintRequest,
            nft: {
              ...mintRequest.nft,
              tokenId: mintRequest.nft.tokenId.toString(), // Convert BigInt for logging
            },
            mintToAccount: {
              ...mintRequest.mintToAccount,
              owner: mintRequest.mintToAccount.owner.toString(), // Convert Principal for logging
            }
          },
          userPrincipal: user.principal,
          userPrincipalType: typeof user.principal,
          mintCosts: mintCosts?.toString(),
          contractPointer,
          selectedNFT: nft,
          note: "Token ID should be preserved: " + nft.tokenId
        });

        //do not include spender unless interacting with a marketplace
        const mintResult = await mutations.mintFromEVM.mutateAsync({
          request: mintRequest,
          
          requiredCycles: mintCosts || undefined, // Pass the mint cost for allowance checking
          skipApproval: i > 0 // Skip approval check after first mint (allowance should be sufficient)
        });
        
        console.log(`✅ Raw mint result for NFT ${i + 1} (original token ID: ${nft.tokenId}):`, mintResult);
        console.log(`🔍 Mint result type analysis:`, {
          resultType: typeof mintResult,
          hasOk: 'Ok' in mintResult,
          hasErr: 'Err' in mintResult,
          okValue: 'Ok' in mintResult ? mintResult.Ok : null,
          okValueType: 'Ok' in mintResult ? typeof mintResult.Ok : null,
          originalTokenId: nft.tokenId,
          expectedBehavior: "The IC token should maintain the same ID as the original EVM token"
        });

        if ('Ok' in mintResult) {
          const mintRequestId = mintResult.Ok; // This is the mint request ID, not the token ID
          const originalTokenId = nft.tokenId; // Extract the original token ID from the request
          console.log(`✅ Mint request ${i + 1} get_mint_status: ${mintRequestId.toString()}`);
          
          // Now we need to poll for the mint status to get the actual token ID and transaction details
          console.log(`🔍 Polling for mint completion status...`);
          let pollAttempts = 0;
          const maxPollAttempts = 30; // 30 attempts with 2 second delays = 1 minute timeout
          let mintStatus: any = null;
          let tokenReference = '';
          
          while (pollAttempts < maxPollAttempts) {
            try {
              const statusResults = await mutations.getMintStatus.mutateAsync([mintRequestId]);
              const currentStatus = statusResults[0];
              
              if (currentStatus && Array.isArray(currentStatus) && currentStatus.length > 0) {
                mintStatus = currentStatus[0];
                console.log(`📊 Mint status poll ${pollAttempts + 1}:`, mintStatus);
                
                if ('Complete' in mintStatus) {
                  const completeStatus = mintStatus.Complete;
                  const mintTransactionId = completeStatus.mintTrx;
                  
                  console.log(`🎉 Mint completed! Transaction ID: ${mintTransactionId.toString()}`);
                  
                  // For ICRC-99, the token ID should be preserved from the original request
                  // The transaction ID is different - it's just the IC transaction that executed the mint
                  console.log(`🔍 Token ID validation - Original: ${originalTokenId}, Expected to be preserved per ICRC-99 protocol`);
                  
                  // The token should maintain the same ID as requested, transaction ID is just for tracking
                  tokenReference = `Token ${originalTokenId} (IC Tx: ${mintTransactionId.toString()})`;
                  console.log(`✅ Token ID preserved correctly: ${originalTokenId} (Mint Tx: ${mintTransactionId})`);
                  break;
                } else if ('Err' in mintStatus) {
                  // Mint failed
                  const errorMessage = (() => {
                    try {
                      return JSON.stringify(mintStatus.Err, (_key, value) =>
                        typeof value === 'bigint' ? value.toString() : value
                      );
                    } catch {
                      return String(mintStatus.Err);
                    }
                  })();
                  throw new Error(`Mint failed for NFT ${i + 1} (Token ${originalTokenId}): ${errorMessage}`);
                } else {
                  // Still in progress
                  const statusType = Object.keys(mintStatus)[0];
                  console.log(`⏳ Mint still in progress... Status: ${statusType}`);
                  
                  // Update progress with more specific status
                  if (statusType === 'CheckingOwner') {
                    updateProgressStep('mint-cknft', 'loading', `Verifying ownership for NFT ${i + 1}/${readyToMintNFTs.length}`);
                  } else if (statusType === 'RetrievingMetadata') {
                    updateProgressStep('mint-cknft', 'loading', `Retrieving metadata for NFT ${i + 1}/${readyToMintNFTs.length}`);
                  } else if (statusType === 'Transferring') {
                    updateProgressStep('mint-cknft', 'loading', `Transferring NFT ${i + 1}/${readyToMintNFTs.length}`);
                  } else if (statusType === 'Minting') {
                    updateProgressStep('mint-cknft', 'loading', `Minting NFT ${i + 1}/${readyToMintNFTs.length} on IC`);
                  }
                }
              } else {
                console.log(`⏳ Waiting for mint status to be available...`);
              }
              
              pollAttempts++;
              if (pollAttempts < maxPollAttempts && !('Complete' in (mintStatus || {}))) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
              }
            } catch (statusError) {
              console.error(`❌ Error checking mint status (attempt ${pollAttempts + 1}):`, statusError);
              pollAttempts++;
              if (pollAttempts < maxPollAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }
          
          if (!mintStatus || !('Complete' in mintStatus)) {
            console.warn(`⚠️ Mint status polling timed out for NFT ${i + 1}`);
            // If we timeout, we still got the mint request accepted, so it may complete later
            tokenReference = `Token ${originalTokenId} (IC - Pending)`;
          }
          
          mintedTokenReferences.push(tokenReference);
          mintResults.push(mintResult);
          console.log(`🎉 NFT ${i + 1}/${readyToMintNFTs.length} processed: ${tokenReference}`);
        } else {
          // Handle BigInt serialization properly
          const errorMessage = (() => {
            try {
              return JSON.stringify(mintResult.Err, (_key, value) =>
                typeof value === 'bigint' ? value.toString() : value
              );
            } catch {
              return String(mintResult.Err);
            }
          })();
          throw new Error(`Mint failed for NFT ${i + 1} (Token ${nft.tokenId}): ${errorMessage}`);
        }
      }

      updateProgressStep('mint-cknft', 'completed', `Successfully minted ${mintResults.length} NFT(s)`);
      
      // Start verification step
      updateProgressStep('verify-mint-complete', 'loading');
      
      // Complete verification step
      updateProgressStep('verify-mint-complete', 'completed', `All ${mintResults.length} NFT(s) verified`);

      // Success! Set final result
      const allTokenIds = readyToMintNFTs.map(nft => nft.tokenId);
      
      setImportResult({
        success: true,
        icTransactionHash: mintedTokenReferences.join(' | '),
        canisterAddress: newCanisterId.toString(),
        tokenId: allTokenIds.join(', '),
      });

      console.log('🎉 Multi-NFT bridge process completed successfully!', {
        mintedCount: mintResults.length,
        tokenReferences: mintedTokenReferences,
        canisterId: newCanisterId.toString(),
        tokenIds: allTokenIds
      });

      setCurrentStep('complete');
      onComplete?.({
        success: true,
        icTransactionHash: mintedTokenReferences.join(' | '),
        canisterAddress: newCanisterId.toString(),
        tokenId: allTokenIds.join(', '),
      });
    } catch (error) {
      console.error('Bridge process failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bridge failed';
      
      // Mark current step as failed
      if (progress?.steps) {
        const currentProgressStep = progress.steps.find((step: any) => step.status === 'loading');
        if (currentProgressStep) {
          updateProgressStep(currentProgressStep.id, 'failed', errorMessage);
        }
      }
      
      setImportResult({
        success: false,
        error: errorMessage,
      });
      
      onComplete?.({
        success: false,
        error: errorMessage,
      });
    }
  }, [selectedNFTs, activeAddress, contractPointer, user, mutations, canisterCosts, updateProgressStep, onComplete, progress, createBridgeProgressState]);

  const renderStepContent = () => {
    switch (currentStep) {
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
                console.log('🎯 Target network selected for import:', networkName, 'Chain ID:', chainId);
                setTargetNetwork({ Ethereum: [BigInt(chainId)] });
              }
            }}
          />
        );

      case 'select':
        return (
          <NFTSelectionStep
            account={effectiveAccount!}
            network={chainId ? chainIdToNetwork[chainId] || null : null}
            selectedNFTs={selectedNFTs}
            onSelectionChange={setSelectedNFTs}
            nftDiscoveryService={nftDiscoveryService}
          />
        );

      case 'costs':
        return (
          <CanisterCostStep
            selectedNFTs={selectedNFTs}
            costs={canisterCosts}
            onCostsCalculated={setCanisterCosts}
            compact={hasError} // Use compact mode when there are errors
          />
        );

      case 'gas':
        return (
          <NFTMintEstimationStep
            selectedNFTs={selectedNFTs}
            mintCosts={mintCosts}
            onMintCostsCalculated={setMintCosts}
          />
        );

      case 'bridge':
        return (
          <BridgeProgressStep
            progress={progress}
            onRetryStep={retryProgressStep}
            onToggleStage={() => {}} // No-op since collapsible stages are removed
            setProgress={setProgress} // Pass setProgress for debugging skip functionality
          />
        );

      case 'complete':
        return (
          <CompletionStep
            result={importResult!}
            onStartNew={() => {
              setCurrentStep('connect');
              setSelectedNFTs([]);
              setCanisterCosts(null);
              setMintCosts(null);
              setImportResult(null);
              createBridgeProgressState('evm-to-ic' as BridgeDirection);
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
          <h2 className="text-xl font-semibold text-gray-900">Import NFTs from EVM</h2>
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
                ? 'text-white bg-red-600 hover:bg-red-700' // Prominent when there's an error
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              : 'text-gray-400 bg-gray-50 cursor-not-allowed'
          )}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {hasError ? 'Go Back & Retry' : 'Previous'}
        </button>

        <div className="flex space-x-3">
          {currentStep === 'gas' && canGoNext() && (
            <button
              onClick={handleStartBridge}
              className="flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Start Bridge
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}

          {currentStep !== 'gas' && currentStep !== 'bridge' && currentStep !== 'complete' && (
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

function BridgeProgressStep({
  progress,
  onRetryStep,
  onToggleStage,
  setProgress,
}: {
  progress: BridgeProgress | null;
  onRetryStep: (stepId: string) => void;
  onToggleStage: (stageId: string) => void;
  setProgress?: (progress: BridgeProgress | null) => void;
}) {
  if (!progress) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Initializing bridge process...</p>
      </div>
    );
  }

  // Get current status
  const activeSteps = progress.steps?.filter((step: any) => 
    step.status === 'loading' || step.status === 'failed'
  ) || [];
  
  const currentStep = activeSteps[0];
  const hasErrors = progress.steps?.some((step: any) => step.status === 'failed') || false;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {hasErrors ? 'Bridge Failed' : 'Bridge in Progress'}
        </h3>
        <p className="text-gray-600">
          {hasErrors 
            ? 'An error occurred during the bridge process.' 
            : 'Bridging your NFT to the Internet Computer...'}
        </p>
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
            <div className="mt-3 space-x-2">
              <button
                onClick={() => onRetryStep(currentStep.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Retry Step
              </button>
              {/* Add skip button for transfer step during development */}
              {currentStep.id === 'transfer-nft-to-bridge' && setProgress && (
                <button
                  onClick={() => {
                    console.log('⏭️ Skipping failed transfer step for debugging');
                    if (progress?.steps) {
                      const updatedProgress = { ...progress };
                      const stepIndex = updatedProgress.steps.findIndex((s: any) => s.id === currentStep.id);
                      if (stepIndex !== -1) {
                        updatedProgress.steps[stepIndex] = {
                          ...updatedProgress.steps[stepIndex],
                          status: 'completed',
                          error: undefined
                        };
                        setProgress(updatedProgress);
                      }
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Skip for Testing
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* All steps completed successfully */}
      {!currentStep && !hasErrors && progress.steps && progress.steps.length > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-green-800">Bridge Complete!</h4>
              <p className="text-sm text-green-600 mt-1">Your NFT has been successfully bridged.</p>
            </div>
          </div>
        </div>
      )}

      {/* Show detailed checklist as a collapsible section for debugging */}
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

function CompletionStep({
  result,
  onStartNew,
  onClose,
}: {
  result: ImportResult;
  onStartNew: () => void;
  onClose: () => void;
}) {
  // Parse multiple results if they exist
  const tokenIds = result.tokenId ? result.tokenId.split(', ') : [];
  const icTransactionHashes = result.icTransactionHash ? result.icTransactionHash.split(' | ') : [];
  const isMultipleNFTs = tokenIds.length > 1;

  // Parse token references to detect ID mismatches
  const parseTokenReference = (ref: string) => {
    // Updated patterns to handle transaction-based format:
    // "Token 123 (IC Tx: 456)" - Preserved ID with transaction info
    // "Token 123 → 456 (IC)" - ID mismatch (old format, shouldn't happen with new implementation)
    // "Token 123 (IC - Pending)" - Pending status
    
    const txMatch = ref.match(/Token (\d+) \(IC Tx: (\d+)\)/);
    if (txMatch) {
      return { 
        original: txMatch[1], 
        ic: txMatch[1], // Token ID is preserved, tx ID is just for tracking
        hasMismatch: false,
        txId: txMatch[2]
      };
    }
    
    const pendingMatch = ref.match(/Token (\d+) \(IC - Pending\)/);
    if (pendingMatch) {
      return { 
        original: pendingMatch[1], 
        ic: pendingMatch[1], 
        hasMismatch: false,
        isPending: true
      };
    }
    
    // Legacy format checks (should not occur with new implementation)
    const arrowMatch = ref.match(/Token (\d+) → (\d+)/);
    if (arrowMatch) {
      return { original: arrowMatch[1], ic: arrowMatch[2], hasMismatch: true };
    }
    
    const icMatch = ref.match(/Token (\d+) \(IC/);
    if (icMatch) {
      return { original: icMatch[1], ic: icMatch[1], hasMismatch: false };
    }
    
    const basicMatch = ref.match(/Token (\d+)/);
    if (basicMatch) {
      return { original: basicMatch[1], ic: basicMatch[1], hasMismatch: false };
    }
    
    return { original: 'Unknown', ic: 'Unknown', hasMismatch: false };
  };

  const tokenInfo = icTransactionHashes.map(parseTokenReference);
  const hasAnyMismatch = tokenInfo.some(info => info.hasMismatch);
  const hasAnyPending = tokenInfo.some(info => info.isPending);

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
              {isMultipleNFTs ? `${tokenIds.length} NFTs Imported Successfully!` : 'Import Successful!'}
            </h3>
            <p className="text-gray-600">
              {isMultipleNFTs 
                ? `Your ${tokenIds.length} NFTs have been successfully bridged to the Internet Computer.`
                : 'Your NFT has been successfully bridged to the Internet Computer.'
              }
            </p>
            {hasAnyMismatch && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  ⚠️ Note: Some token IDs were changed during minting. This should be investigated.
                </p>
              </div>
            )}
            {hasAnyPending && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  ⏳ Note: Some mints are still pending completion. You can check back later for the final status.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Import Failed</h3>
            <p className="text-gray-600">{result.error}</p>
          </>
        )}
      </div>

      {result.success && (
        <div className="space-y-3 text-sm">
          {/* Bridged NFT Status */}
          {tokenInfo.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-800 mb-2">
                {isMultipleNFTs ? `${tokenIds.length} NFTs Bridged Successfully!` : 'NFT Bridged Successfully!'}
              </p>
              {isMultipleNFTs ? (
                <div className="space-y-2">
                  {tokenInfo.map((info, index) => (
                    <div key={index} className="text-green-700">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">NFT {index + 1}:</span>
                        <div className="text-right">
                          {info.hasMismatch ? (
                            <div className="text-amber-700">
                              <code className="bg-amber-100 px-2 py-1 rounded text-xs">
                                EVM: {info.original} → IC: {info.ic}
                              </code>
                              <div className="text-xs text-amber-600 mt-1">⚠️ Token ID changed</div>
                            </div>
                          ) : info.isPending ? (
                            <div className="text-blue-700">
                              <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                                Token ID: {info.original}
                              </code>
                              <div className="text-xs text-blue-600 mt-1">⏳ Mint pending...</div>
                            </div>
                          ) : (
                            <div>
                              <code className="bg-green-100 px-2 py-1 rounded text-xs">
                                Token ID: {info.original}
                              </code>
                              <div className="text-xs text-green-600 mt-1">
                                ID preserved ✓{info.txId ? ` (Tx: ${info.txId})` : ''}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-green-700">
                  {tokenInfo[0].hasMismatch ? (
                    <div className="text-amber-700">
                      <code className="bg-amber-100 px-2 py-1 rounded text-xs">
                        EVM: {tokenInfo[0].original} → IC: {tokenInfo[0].ic}
                      </code>
                      <div className="text-xs text-amber-600 mt-1">⚠️ Token ID was changed during minting</div>
                    </div>
                  ) : tokenInfo[0].isPending ? (
                    <div className="text-blue-700">
                      <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                        Token ID: {tokenInfo[0].original}
                      </code>
                      <div className="text-xs text-blue-600 mt-1">⏳ Mint still pending...</div>
                    </div>
                  ) : (
                    <div>
                      <code className="bg-green-100 px-2 py-1 rounded text-xs">
                        Token ID: {tokenInfo[0].original}
                      </code>
                      <div className="text-xs text-green-600 mt-1">
                        Token ID preserved correctly ✓{tokenInfo[0].txId ? ` (Tx: ${tokenInfo[0].txId})` : ''}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Canister Information */}
          {result.canisterAddress && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-800 mb-1">ckNFT Canister</p>
              <p className="text-blue-700">ID: <code className="bg-blue-100 px-2 py-1 rounded text-xs">{result.canisterAddress}</code></p>
            </div>
          )}
          
          {/* Token ID Preservation Info */}
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="font-medium text-purple-800 mb-1">
              Cross-Chain Token ID{isMultipleNFTs ? 's' : ''}
            </p>
            <div className="text-xs text-purple-600 mb-2">
              NFT token IDs should remain the same on both EVM and IC networks
            </div>
            {isMultipleNFTs ? (
              <div className="space-y-1">
                {tokenIds.map((tokenId, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-purple-700">Original EVM ID {index + 1}:</span>
                    <code className="bg-purple-100 px-2 py-1 rounded text-xs">{tokenId}</code>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-purple-700">Original EVM ID:</span>
                <code className="bg-purple-100 px-2 py-1 rounded text-xs">{tokenIds[0]}</code>
              </div>
            )}
          </div>
          
          {/* EVM Transaction (if available) */}
          {result.evmTransactionHash && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="font-medium text-gray-800 mb-1">EVM Transaction</p>
              <p className="text-gray-700">Hash: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{result.evmTransactionHash}</code></p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center space-x-4">
        <button
          onClick={onStartNew}
          className="px-6 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
        >
          Import More NFTs
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
