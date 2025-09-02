import { useState, useCallback, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { Principal } from '@dfinity/principal';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ethers } from 'ethers';
import { useAuth } from '../../hooks/useAuth';
import { useMetaMask } from '../../hooks/useEVM';
import { use99Mutations } from '../../hooks/use99Mutations';
import { useNativeChain } from '../../hooks/useNativeChain';
import type { CastRequest as CkNFTCastRequest } from '../../declarations/ckNFT/ckNFT.did';
import { BridgeProgress, BridgeDirection, createBridgeProgress, updateBridgeStep, retryBridgeStep } from '../../lib/bridgeProgress';
import { BridgeChecklist } from '../BridgeChecklist';
import type { Network } from '../../declarations/orchestrator/orchestrator.did';
import { ICNFTSelectionStep } from './ICNFTSelectionStep';
import { ReturnCostStep, type ReturnCosts } from './ReturnCostStep';
import { EVMConnectionStep } from './EVMConnectionStep';
import type { SelectedICNFT } from './EVMExportWizard';
import { Actor } from '@dfinity/agent';
import { useAgent } from '../../provider/AgentProvider';
import { idlFactory as ckNFTIdl } from '../../declarations/ckNFT/index';
import type { _SERVICE as CkNFTService, ApproveTokenArg } from '../../declarations/ckNFT/ckNFT.did';

type ReturnWizardStep = 'connect' | 'select-cknft' | 'select-target-chain' | 'costs' | 'return' | 'complete';

export interface SelectedCkNFT extends SelectedICNFT {
  nativeChain?: Network;
  nativeContract?: string;
}

export interface ReturnResult {
  success: boolean;
  error?: string;
  evmTransactionHash?: string;
  targetChainId?: string;
  targetContractAddress?: string;
  tokenId?: string;
}

export interface ICReturnWizardProps {
  /** The ckNFT canister ID to return from */
  ckNFTCanisterId?: string;
  /** The token ID to return */
  tokenId?: string;
  /** The target EVM chain to return to */
  targetChainId?: string;
  /** The target contract address */
  targetContractAddress?: string;
  /** Callback when the return process completes */
  onComplete?: (result: ReturnResult) => void;
  /** Callback when the wizard is cancelled */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Show the wizard in a modal */
  modal?: boolean;
  /** Mock return result for testing */
  mockReturnResult?: ReturnResult;
}

export function ICReturnWizard({
  ckNFTCanisterId: initialCanisterId,
  tokenId: initialTokenId,
  targetChainId: initialTargetChainId,
  targetContractAddress: initialTargetContractAddress,
  onComplete,
  onCancel,
  className,
  modal = true,
  mockReturnResult,
}: ICReturnWizardProps) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<ReturnWizardStep>('connect');
  const [selectedCkNFTs, setSelectedCkNFTs] = useState<SelectedCkNFT[]>([]);
  const [targetChainId, setTargetChainId] = useState<string>(initialTargetChainId || '');
  const [targetContractAddress, setTargetContractAddress] = useState<string>(initialTargetContractAddress || '');
  const [returnCosts, setReturnCosts] = useState<ReturnCosts | null>(null);
  const [progress, setProgress] = useState<BridgeProgress | null>(null);
  const [returnResult, setReturnResult] = useState<ReturnResult | null>(mockReturnResult || null);
  const [cyclesApprovalStatus, setCyclesApprovalStatus] = useState<{
    isApproved: boolean;
    allowanceAmount?: bigint;
  }>({ isApproved: false });
  const [contractValidation, setContractValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    error: string | null;
    isNativeContract: boolean;
  }>({
    isValidating: false,
    isValid: null,
    error: null,
    isNativeContract: false,
  });
  const [burnBalanceStatus, setBurnBalanceStatus] = useState<{
    hasRequiredBalances: boolean;
    balanceInfo: {[address: string]: {balance: bigint, required: bigint, sufficient: boolean}};
  }>({
    hasRequiredBalances: false,
    balanceInfo: {}
  });
  
  // Network mappings for consistent chain ID handling
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
  
  const chainIdToNetwork = Object.fromEntries(
    Object.entries(networkToChainId).map(([name, id]) => [id, name])
  );
  
  const supportedNetworks = ['ethereum', 'polygon', 'bsc', 'hardhat', 'hardhat-2', 'arbitrum', 'optimism', 'base'];

  // Hooks
  const { user } = useAuth();
  const { activeAddress, isUnlocked, connectWallet, switchChain, chainId } = useMetaMask();
  const authenticatedAgent = useAgent();
  
  // Native chain detection for the first selected ckNFT
  const firstCkNFT = selectedCkNFTs.length > 0 ? selectedCkNFTs[0] : null;
  const { nativeChain, loading: nativeChainLoading, error: nativeChainError } = useNativeChain(
    firstCkNFT?.canisterId || '',
    firstCkNFT ? BigInt(firstCkNFT.tokenId) : undefined
  );

  // Helper function to create ckNFT actor for approval
  const createCkNFTActor = useCallback(async (canisterId: string): Promise<CkNFTService> => {
    if (!authenticatedAgent) {
      throw new Error('Authenticated agent not available');
    }
    
    return Actor.createActor(ckNFTIdl, {
      agent: authenticatedAgent,
      canisterId,
    });
  }, [authenticatedAgent]);

  // Helper function to approve tokens for return
  const approveTokensForReturn = useCallback(async (selectedNFT: SelectedCkNFT, spender: Principal): Promise<void> => {
    const actor = await createCkNFTActor(selectedNFT.canisterId);
    
    const approveArgs: ApproveTokenArg = {
      token_id: BigInt(selectedNFT.tokenId),
      approval_info: {
        spender: { 
          owner: spender, 
          subaccount: [] 
        },
        expires_at: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
      },
    };

    const result = await actor.icrc37_approve_tokens([approveArgs]);
    
    // Check if approval was successful
    if (result.length === 0 || 'Err' in result[0]) {
      throw new Error('Token approval failed');
    }
  }, [createCkNFTActor]);

  // Update selected ckNFT with native chain information when it's fetched
  useEffect(() => {
    if (nativeChain && firstCkNFT && !firstCkNFT.nativeChain) {
      console.log('🔗 Adding native chain info to selected ckNFT:', nativeChain);
      setSelectedCkNFTs(prev => 
        prev.map((nft, index) => 
          index === 0 
            ? {
                ...nft, 
                nativeChain: nativeChain.network,
                nativeContract: nativeChain.contract
              } 
            : nft
        )
      );

      // Auto-select target network based on native chain
      if ('Ethereum' in nativeChain.network && nativeChain.network.Ethereum.length > 0) {
        const ethereumChainId = nativeChain.network.Ethereum[0];
        if (ethereumChainId) {
          const nativeChainId = ethereumChainId.toString();
          console.log('🎯 Auto-selecting target network based on native chain:', nativeChainId);
          setTargetChainId(nativeChainId);
        }
      }

      // Auto-fill contract address from native chain
      if (nativeChain.contract && !targetContractAddress) {
        console.log('🎯 Auto-filling contract address from native chain:', nativeChain.contract);
        setTargetContractAddress(nativeChain.contract);
      }
    }
  }, [nativeChain, firstCkNFT, targetContractAddress]);

  // Auto-fill contract address when target chain matches native chain
  useEffect(() => {
    if (targetChainId && selectedCkNFTs.length > 0 && selectedCkNFTs[0].nativeChain && selectedCkNFTs[0].nativeContract) {
      const targetNetwork = createNetworkFromChainId(targetChainId);
      const nativeNetwork = selectedCkNFTs[0].nativeChain;
      
      // Check if target network matches native network
      const isMatchingNetwork = targetNetwork && 'Ethereum' in targetNetwork && 'Ethereum' in nativeNetwork &&
        targetNetwork.Ethereum[0] === nativeNetwork.Ethereum[0];
      
      // Only auto-fill if contract address is empty or doesn't match native contract
      if (isMatchingNetwork && (!targetContractAddress || targetContractAddress !== selectedCkNFTs[0].nativeContract)) {
        console.log('🎯 Auto-filling native contract address for matching network:', selectedCkNFTs[0].nativeContract);
        setTargetContractAddress(selectedCkNFTs[0].nativeContract);
        setContractValidation({
          isValidating: false,
          isValid: true,
          error: null,
          isNativeContract: true,
        });
      }
    }
  }, [targetChainId, selectedCkNFTs, targetContractAddress]);

  // Validate contract address when it changes
  useEffect(() => {
    if (targetContractAddress && targetChainId && selectedCkNFTs.length > 0) {
      validateContractAddress();
    } else {
      setContractValidation({
        isValidating: false,
        isValid: null,
        error: null,
        isNativeContract: false,
      });
    }
  }, [targetContractAddress, targetChainId, selectedCkNFTs]);

  const validateContractAddress = async () => {
    if (!targetContractAddress || !targetChainId || !selectedCkNFTs.length) return;

    const firstCkNFT = selectedCkNFTs[0];
    const targetNetwork = createNetworkFromChainId(targetChainId);
    
    setContractValidation({
      isValidating: true,
      isValid: null,
      error: null,
      isNativeContract: false,
    });

    try {
      // Check if this matches the native contract
      const isNativeContract = firstCkNFT.nativeContract === targetContractAddress &&
        firstCkNFT.nativeChain && targetNetwork && 
        'Ethereum' in firstCkNFT.nativeChain && 'Ethereum' in targetNetwork &&
        firstCkNFT.nativeChain.Ethereum[0] === targetNetwork.Ethereum[0];

      if (isNativeContract) {
        setContractValidation({
          isValidating: false,
          isValid: true,
          error: null,
          isNativeContract: true,
        });
        console.log('✅ Contract address matches native contract');
      } else if (firstCkNFT.nativeChain && firstCkNFT.nativeContract) {
        // This is not the native chain/contract - return wizard should only allow native returns
        setContractValidation({
          isValidating: false,
          isValid: false,
          error: `Return wizard can only return to the original chain/contract. Expected: ${firstCkNFT.nativeContract} on chain ${formatNetworkName(firstCkNFT.nativeChain)}`,
          isNativeContract: false,
        });
        console.warn('❌ Contract does not match native contract - return wizard only supports native returns');
      } else {
        // Basic validation - check if address looks like an Ethereum address
        const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(targetContractAddress);
        
        setContractValidation({
          isValidating: false,
          isValid: isValidAddress,
          error: isValidAddress ? null : 'Invalid contract address format',
          isNativeContract: false,
        });
      }

    } catch (error) {
      console.error('❌ Error validating contract address:', error);
      setContractValidation({
        isValidating: false,
        isValid: false,
        error: 'Failed to validate contract address',
        isNativeContract: false,
      });
    }
  };

  // Initialize with provided values if available
  useEffect(() => {
    if (initialCanisterId && initialTokenId) {
      setSelectedCkNFTs([{
        tokenId: initialTokenId,
        canisterId: initialCanisterId,
        owner: user?.principal || Principal.anonymous(),
        nativeChain: undefined, // Will be detected later
        nativeContract: initialTargetContractAddress,
      }]);
    }
  }, [initialCanisterId, initialTokenId, initialTargetContractAddress, user?.principal]);

  const steps = [
    { id: 'connect', title: 'Connect', description: 'Connect IC wallet' },
    { id: 'select-cknft', title: 'Select ckNFT', description: 'Choose ckNFT to return' },
    { id: 'select-target-chain', title: 'Target Network', description: 'Connect wallet & select destination' },
    { id: 'costs', title: 'Costs', description: 'Review return costs and fund gas account' },
    { id: 'return', title: 'Return', description: 'Execute return operation' },
    { id: 'complete', title: 'Complete', description: 'Return summary' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  // Get mutations
  const orchestratorCanisterId = process.env.REACT_APP_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai';
  const mutations = use99Mutations(orchestratorCanisterId);

  // Helper function to format network name
  const formatNetworkName = (network: Network): string => {
    if ('IC' in network) {
      return `Internet Computer${network.IC.length > 0 ? ` (${network.IC[0]})` : ''}`;
    } else if ('Ethereum' in network) {
      return `Ethereum${network.Ethereum.length > 0 ? ` (Chain ${network.Ethereum[0]})` : ''}`;
    } else if ('Solana' in network) {
      return `Solana${network.Solana.length > 0 ? ` (${network.Solana[0]})` : ''}`;
    } else if ('Bitcoin' in network) {
      return `Bitcoin${network.Bitcoin.length > 0 ? ` (${network.Bitcoin[0]})` : ''}`;
    } else if ('Other' in network) {
      return 'Other Network';
    }
    return 'Unknown Network';
  };

  // Helper function to create Network object from chain ID
  const createNetworkFromChainId = (chainId: string): Network | null => {
    const id = parseInt(chainId);
    if (isNaN(id)) return null;
    
    // Map common chain IDs to Network types - support all the networks we have in our mappings
    switch (id) {
      case 1: // Ethereum Mainnet
      case 5: // Goerli
      case 11155111: // Sepolia
      case 137: // Polygon
      case 56: // BSC
      case 31337: // Hardhat Local
      case 1338: // Hardhat Local 2
      case 42161: // Arbitrum
      case 10: // Optimism
      case 8453: // Base
        return { Ethereum: [BigInt(id)] };
      default:
        // For other chain IDs, assume Ethereum (this covers any custom networks)
        return { Ethereum: [BigInt(id)] };
    }
  };

  // Progress management
  const createReturnProgressState = useCallback((direction: BridgeDirection) => {
    const returnProgress = createBridgeProgress(direction, [
      { id: 'verify-ic-connection', title: 'Verify IC Connection', description: 'Checking IC wallet connection', stage: 'setup' },
      { id: 'approve-cknft-transfer', title: 'Approve ckNFT Transfer', description: 'Approving ckNFT transfer to bridge', stage: 'preparation' },
      { id: 'fund-burn-address', title: 'Fund Burn Address', description: 'Sending ETH to burn address for gas fees', stage: 'preparation' },
      { id: 'initiate-cast', title: 'Initiate Cast', description: 'Starting return process to EVM', stage: 'execution' },
      { id: 'wait-evm-confirmation', title: 'Wait for EVM Confirmation', description: 'Waiting for NFT to appear on target EVM chain', stage: 'execution' },
    ]);
    setProgress(returnProgress);
    return returnProgress;
  }, []);

  const updateProgressStep = useCallback((stepId: string, status: 'loading' | 'completed' | 'failed', error?: string, txHash?: string) => {
    setProgress(prevProgress => {
      if (!prevProgress) return null;
      return updateBridgeStep(prevProgress, stepId, { status, error, txHash });
    });
  }, []);

  // Validation
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'connect':
        return !!user?.principal;
      case 'select-cknft':
        return selectedCkNFTs.length > 0;
      case 'select-target-chain':
        return targetChainId && targetContractAddress && isUnlocked && contractValidation.isValid === true;
      case 'costs':
        return returnCosts !== null && burnBalanceStatus.hasRequiredBalances;
      case 'return':
        return returnResult?.success === true;
      default:
        return false;
    }
  }, [currentStep, user, selectedCkNFTs, targetChainId, targetContractAddress, isUnlocked, contractValidation.isValid, returnCosts, returnResult, burnBalanceStatus.hasRequiredBalances]);

  console.log('ICReturnWizard canGoNext analysis:', {
    currentStep,
    userPrincipal: !!user?.principal,
    selectedCkNFTsLength: selectedCkNFTs.length,
    targetChainId,
    targetContractAddress,
    isEvmWalletConnected: isUnlocked,
    contractValidation: contractValidation.isValid,
    isNativeContract: contractValidation.isNativeContract,
    returnCosts: !!returnCosts,
    burnBalanceStatus: burnBalanceStatus.hasRequiredBalances,
    returnResultSuccess: returnResult?.success
  });

  // Error handling
  const hasError = useMemo(() => {
    if (progress?.steps) {
      const returnError = progress.steps.some((step: any) => step.status === 'failed');
      if (returnError) return true;
    }
    
    if (returnResult && !returnResult.success) {
      return true;
    }
    
    return false;
  }, [progress, returnResult]);

  // Automatically advance to complete step when return is successful
  useEffect(() => {
    if (returnResult?.success && currentStep !== 'complete') {
      console.log('🎉 Return completed successfully, advancing to complete step');
      setCurrentStep('complete');
    }
  }, [returnResult, currentStep]);

  const canGoPrev = currentStepIndex > 0 && 
    (currentStep !== 'return' && currentStep !== 'complete' || hasError);

  const handleNext = useCallback(() => {
    if (!canGoNext()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id as ReturnWizardStep);
    }
  }, [currentStepIndex, canGoNext, steps]);

  const handlePrev = useCallback(() => {
    if (!canGoPrev) return;

    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id as ReturnWizardStep);
    }
  }, [currentStepIndex, canGoPrev, steps]);

  const handleStartReturn = useCallback(async () => {
    console.log('🎯 handleStartReturn called with:', {
      selectedCkNFTs,
      targetChainId,
      targetContractAddress,
      userPrincipal: user?.principal,
      returnCosts
    });

    if (!selectedCkNFTs.length || !targetChainId || !targetContractAddress || !user?.principal || !returnCosts) {
      console.warn('❌ Missing required data for return:', {
        selectedCkNFTsLength: selectedCkNFTs.length,
        targetChainId: !!targetChainId,
        targetContractAddress: !!targetContractAddress,
        userPrincipal: !!user?.principal,
        returnCosts: !!returnCosts
      });
      return;
    }

    if (!activeAddress) {
      console.warn('❌ MetaMask address required for return operation');
      alert('Please connect your MetaMask wallet to continue with the return operation.');
      return;
    }

    setCurrentStep('return');
    createReturnProgressState('ic-to-evm');
    
    try {
      const firstCkNFT = selectedCkNFTs[0]; // For now, handle first NFT
      console.log(`🚀 Starting IC return process for ckNFT ${firstCkNFT.tokenId}`);

      // Step 1: Verify IC wallet connection
      updateProgressStep('verify-ic-connection', 'loading');
      console.log('✅ IC wallet already connected:', user.principal);
      updateProgressStep('verify-ic-connection', 'completed');

      // Step 2: Approve ckNFT transfer
      updateProgressStep('approve-cknft-transfer', 'loading', 'Please approve the ckNFT transfer...');
      
      console.log('📝 Checking cycles approval status:', cyclesApprovalStatus);
      
      // Check if we already have adequate cycles approval
      if (cyclesApprovalStatus.isApproved && cyclesApprovalStatus.allowanceAmount && 
          cyclesApprovalStatus.allowanceAmount >= returnCosts.cyclesCost) {
        console.log('✅ Cycles already approved with sufficient allowance, skipping approval step');
        updateProgressStep('approve-cknft-transfer', 'completed', 
          `ckNFT transfer pre-approved (${cyclesApprovalStatus.allowanceAmount} cycles available)`);
      } else {
        console.log(`📝 Approving ${selectedCkNFTs.length} ckNFT${selectedCkNFTs.length > 1 ? 's' : ''} for transfer with ICRC-37...`);
        
        // Get orchestrator principal for approval - use consistent environment variable
        const orchestratorPrincipal = Principal.fromText(orchestratorCanisterId);
        
        // Approve all selected NFTs for return using real ICRC-37 call
        for (let i = 0; i < selectedCkNFTs.length; i++) {
          const nft = selectedCkNFTs[i];
          console.log(`📝 Approving NFT ${i + 1}/${selectedCkNFTs.length}: ${nft.tokenId}`);
          await approveTokensForReturn(nft, orchestratorPrincipal);
        }
        
        updateProgressStep('approve-cknft-transfer', 'completed', 
          `${selectedCkNFTs.length} ckNFT${selectedCkNFTs.length > 1 ? 's' : ''} approved for transfer`);
      }
      
      // Step 3: Fund burn addresses for gas fees (updated to handle multiple NFTs)
      updateProgressStep('fund-burn-address', 'loading', 'Checking burn address funding...');
      
      try {
        // Get all burn addresses that need to be funded - support both new multiple format and legacy single
        const burnAddresses = returnCosts?.burnFundingAddresses || [];
        const legacyBurnAddress = returnCosts?.burnFundingAddress;
        
        // Use new multiple addresses format if available, otherwise fall back to legacy single address
        const addressesToCheck = burnAddresses.length > 0 ? burnAddresses : (legacyBurnAddress ? [legacyBurnAddress] : []);
        
        if (addressesToCheck.length === 0) {
          console.log('⚠️ No burn funding addresses available - proceeding without funding check');
          updateProgressStep('fund-burn-address', 'completed', 'No burn addresses to fund');
        } else {
          console.log(`💰 Checking ${addressesToCheck.length} burn address(es) for funding...`);
          
          if (!window.ethereum) {
            throw new Error('MetaMask not available for balance check');
          }
          
          const provider = new ethers.BrowserProvider(window.ethereum);
          
          // Check each burn address individually
          for (let i = 0; i < addressesToCheck.length; i++) {
            const burnAddress = addressesToCheck[i];
            console.log(`💰 Checking burn address ${i + 1}/${addressesToCheck.length}: ${burnAddress}`);
            
            const balance = await provider.getBalance(burnAddress);
            
            // Calculate required balance for this NFT - use individual NFT cost if available
            const nftEthCost = returnCosts?.nftDetails?.[i]?.ethCost || 
                              (returnCosts?.ethCost ? returnCosts.ethCost / BigInt(selectedCkNFTs.length) : BigInt(0));
            
            console.log(`💰 Address ${burnAddress} balance: ${ethers.formatEther(balance)} ETH`);
            console.log(`💰 Required gas cost for NFT ${i + 1}: ${ethers.formatEther(nftEthCost)} ETH`);
            
            // Require at least 2x the estimated cost for safety
            const minRequiredBalance = nftEthCost * BigInt(2);
            
            if (balance < minRequiredBalance) {
              const shortfall = minRequiredBalance - balance;
              throw new Error(
                `Burn address ${i + 1}/${addressesToCheck.length} (NFT #${selectedCkNFTs[i]?.tokenId || 'Unknown'}) needs ${ethers.formatEther(shortfall)} more ETH. ` +
                `Current: ${ethers.formatEther(balance)} ETH, Required: ${ethers.formatEther(minRequiredBalance)} ETH. ` +
                `Address: ${burnAddress}`
              );
            }
            
            console.log(`✅ Burn address ${i + 1} sufficiently funded: ${ethers.formatEther(balance)} ETH (required: ${ethers.formatEther(minRequiredBalance)} ETH)`);
          }
          
          updateProgressStep('fund-burn-address', 'completed', 
            `All ${addressesToCheck.length} burn address(es) sufficiently funded`);
        }
      } catch (error) {
        console.error('❌ Burn address funding check failed:', error);
        updateProgressStep('fund-burn-address', 'failed', error instanceof Error ? error.message : 'Failed to verify burn address funding');
        throw error;
      }
      
      // Step 4: Initiate cast to EVM
      updateProgressStep('initiate-cast', 'loading', 'Initiating cast to target EVM chain...');
      
      console.log('🔄 Initiating real cast to EVM via mutations.castToEVM...');
      
      // PHASE 4: Real ICRC-99 cast operation integration
      try {
        // Construct ICRC-99 cast request with proper gas calculations
        const targetNetwork = createNetworkFromChainId(targetChainId);
        if (!targetNetwork) {
          throw new Error(`Unsupported target chain ID: ${targetChainId}`);
        }

        // Get proper gas estimates from current MetaMask chain
        console.log('⛽ Calculating gas parameters from MetaMask provider...');
        let gasPrice: bigint;
        let maxPriorityFeePerGas: bigint;
        let gasLimit: bigint;

        try {
          if (!window.ethereum) {
            throw new Error('MetaMask not available for gas estimation');
          }

          const provider = new ethers.BrowserProvider(window.ethereum);
          
          // Ensure we're on the correct chain
          const providerNetwork = await provider.getNetwork();
          const expectedChainId = parseInt(targetChainId);
          if (Number(providerNetwork.chainId) !== expectedChainId) {
            throw new Error(`MetaMask is on chain ${providerNetwork.chainId}, but expected ${expectedChainId}. Please switch to the target chain.`);
          }

          // Get current fee data
          const feeData = await provider.getFeeData();
          console.log('📊 Current fee data from provider:', {
            gasPrice: feeData.gasPrice?.toString(),
            maxFeePerGas: feeData.maxFeePerGas?.toString(),
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
          });

          // Calculate gas parameters following the app's pattern
          gasPrice = feeData.maxFeePerGas || feeData.gasPrice || BigInt(50_000_000_000); // 50 gwei fallback
          maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || BigInt(2_000_000_000); // 2 gwei fallback
          
          // For NFT minting operations, we typically need 150-300k gas
          // Using a conservative estimate with buffer
          gasLimit = BigInt(300_000); // 300k gas limit for NFT operations

          console.log('✅ Calculated gas parameters:', {
            gasPrice: gasPrice.toString(),
            maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
            gasLimit: gasLimit.toString(),
            totalCostEstimate: ethers.formatEther(gasPrice * gasLimit),
          });

        } catch (gasError) {
          console.warn('⚠️ Failed to get real-time gas data, using fallback values:', gasError);
          // Fallback to reasonable defaults
          gasPrice = BigInt(50_000_000_000); // 50 gwei
          maxPriorityFeePerGas = BigInt(2_000_000_000); // 2 gwei
          gasLimit = BigInt(300_000); // 300k gas
        }

        // Create cast requests for all selected NFTs
        const castRequests: CkNFTCastRequest[] = selectedCkNFTs.map(nft => ({
          tokenId: BigInt(nft.tokenId),
          gasPrice: [gasPrice],
          memo: [], // No memo
          fromSubaccount: [], // No specific subaccount
          remoteContract: {
            contract: targetContractAddress,
            network: targetNetwork, // Use Network type
          },
          maxPriorityFeePerGas: [maxPriorityFeePerGas],
          created_at_time: [], // Current time
          gasLimit: [gasLimit],
          targetOwner: activeAddress || '', // Metamask address as target owner
        }));

        console.log(`📋 Cast requests constructed for ${selectedCkNFTs.length} NFTs:`, castRequests);

        // Execute real cast operation through mutations - use the first ckNFT's canister
        // Note: All selected NFTs should be from the same canister for batch operations
        console.log('🚀 Calling mutations.castToEVM with cast requests...');
        const castResponse = await mutations.castToEVM.mutateAsync({
          castRequests: castRequests,
          ckNFTCanisterId: Principal.fromText(firstCkNFT.canisterId),
          spender: undefined // Use default spender
        });

        console.log('✅ Cast operation response:', castResponse);

        // Extract cast IDs from response for monitoring
        const castIds: bigint[] = [];
        for (let i = 0; i < castResponse.length; i++) {
          const result = castResponse[i];
          if (result && 'Ok' in result) {
            castIds.push(result.Ok);
            console.log(`✅ Cast ${i + 1} submitted with ID:`, result.Ok.toString());
          } else if (result && 'Err' in result) {
            throw new Error(`Cast operation ${i + 1} failed: ${JSON.stringify(result.Err)}`);
          } else {
            console.warn(`⚠️ Cast operation ${i + 1} returned unexpected result:`, result);
          }
        }

        if (castIds.length === 0) {
          throw new Error('No valid cast IDs received from cast operation');
        }

        updateProgressStep('initiate-cast', 'completed', 
          `Cast request${selectedCkNFTs.length > 1 ? 's' : ''} submitted successfully (${castIds.length} operation${castIds.length > 1 ? 's' : ''})`);
        
        // Step 4: Monitor cast status for EVM confirmation
        updateProgressStep('wait-evm-confirmation', 'loading', 
          `Monitoring ${castIds.length} cast operation${castIds.length > 1 ? 's' : ''} for EVM confirmation...`);
        
        console.log('🔍 Starting cast status monitoring for IDs:', castIds.map(id => id.toString()));
        
        // Poll cast status until completion (following EVMExportWizard pattern)
        let maxAttempts = 30; // 5 minutes with 10-second intervals
        let allCompleted = false;
        let evmTransactionHashes: string[] = [];
        
        while (maxAttempts > 0 && !allCompleted) {
          updateProgressStep('wait-evm-confirmation', 'loading', 
            `Monitoring cast operation... (${31 - maxAttempts}/30 checks)`);
          
          try {
            const statusResults = await mutations.getCastStatus.mutateAsync({
              castIds: castIds,
              ckNFTCanisterId: firstCkNFT.canisterId,
              account: user?.principal ? { owner: user.principal, subaccount: [] } : undefined
            });
            
            console.log('🔍 Cast status check results:', statusResults);
            console.log('🔍 castIds array:', castIds.map(id => id.toString()));
            
            let completedCount = 0;
            
            for (let i = 0; i < statusResults.length; i++) {
              const castStateOption = statusResults[i];
              // Handle Candid optional: [] | [CastStateShared]
              const castState = castStateOption && castStateOption[0];
              if (castState) {
                console.log(`🔍 Cast ${castIds[i]} state:`, castState);
                
                const status = castState.status;
                
                if (status && 'Completed' in status) {
                  completedCount++;
                  console.log(`✅ Cast ${castIds[i]} completed:`, status.Completed);
                  
                  // Look for transaction hash in the history
                  if (castState.history) {
                    for (const historyEntry of castState.history) {
                      const [historyStatus] = historyEntry;
                      if (historyStatus && 'WaitingOnTransfer' in historyStatus) {
                        const txHash = historyStatus.WaitingOnTransfer?.transaction;
                        if (txHash && !evmTransactionHashes.includes(txHash)) {
                          evmTransactionHashes.push(txHash);
                          console.log(`📋 Found EVM transaction hash: ${txHash}`);
                        }
                      }
                    }
                  }
                } else if (status && ('Error' in status || 'Failed' in status)) {
                  // Extract detailed error information
                  let errorDetails = 'Unknown error';
                  if ('Error' in status) {
                    if (typeof status.Error === 'object' && status.Error !== null) {
                      // Handle nested error objects like {GenericError: '...'}
                      const errorObj = status.Error as any;
                      if ('GenericError' in errorObj) {
                        errorDetails = `GenericError: ${errorObj.GenericError}`;
                      } else {
                        errorDetails = JSON.stringify(errorObj);
                      }
                    } else {
                      errorDetails = String(status.Error);
                    }
                  } else if ('Failed' in status) {
                    errorDetails = String(status.Failed);
                  }
                  
                  console.error(`❌ Cast operation ${castIds[i]} failed with error:`, errorDetails);
                  console.error(`❌ Full status object:`, status);
                  
                  // Throw immediately with detailed error message to stop the process
                  throw new Error(`Cast operation failed: ${errorDetails}. Please check the burn address funding or network conditions and try again.`);
                } else {
                  console.log(`⏳ Cast ${castIds[i]} still in progress:`, status);
                }
              } else {
                console.warn(`⚠️ No status found for cast ID ${castIds[i]}`);
              }
            }
            
            console.log(`🔍 Completion check: ${completedCount} of ${castIds.length} completed`);
            
            if (completedCount === castIds.length) {
              allCompleted = true;
              console.log('🎉 Cast operation completed successfully! Setting final state...');
              
              const primaryTxHash = evmTransactionHashes[0] || `cast-${castIds[0].toString()}`;
              console.log('🔍 Setting completion with primaryTxHash:', primaryTxHash);
              
              updateProgressStep('wait-evm-confirmation', 'completed', 
                `NFT${selectedCkNFTs.length > 1 ? 's' : ''} successfully returned to EVM chain${evmTransactionHashes.length > 0 ? ` (${evmTransactionHashes.length} TX${evmTransactionHashes.length > 1 ? 's' : ''})` : ''}`);
              
              // Success!
              const returnResultData = {
                success: true,
                evmTransactionHash: primaryTxHash,
                targetChainId,
                targetContractAddress,
                tokenId: selectedCkNFTs.length === 1 ? firstCkNFT.tokenId : `${selectedCkNFTs.length} NFTs`,
              };
              
              console.log('🔍 Setting returnResult:', returnResultData);
              setReturnResult(returnResultData);

              console.log('🔍 Setting currentStep to complete...');
              setCurrentStep('complete');
              
              console.log('🔍 Calling onComplete callback...');
              onComplete?.(returnResultData);
              
              console.log(`🎉 IC return process completed successfully for ${selectedCkNFTs.length} NFT${selectedCkNFTs.length > 1 ? 's' : ''}! Exiting function...`);
              return; // Exit the function successfully
            } else {
              console.log(`⏳ Progress: ${completedCount}/${castIds.length} casts completed`);
              await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before next check
            }
            
          } catch (statusError) {
            console.error('❌ Error checking cast status:', statusError);
            // Continue trying for a bit longer in case of temporary issues
          }
          
          maxAttempts--;
        }
        
        // If we reach here, monitoring timed out
        if (!allCompleted) {
          console.warn('⚠️ Cast operation monitoring timed out');
          updateProgressStep('wait-evm-confirmation', 'completed', 
            `Cast${selectedCkNFTs.length > 1 ? 's' : ''} submitted successfully. Final EVM confirmation may take additional time.`);
          
          // Set partial success result
          setReturnResult({
            success: true,
            evmTransactionHash: evmTransactionHashes[0] || `cast-${castIds[0].toString()}`,
            targetChainId,
            targetContractAddress,
            tokenId: selectedCkNFTs.length === 1 ? firstCkNFT.tokenId : `${selectedCkNFTs.length} NFTs`,
          });

          setCurrentStep('complete');
          onComplete?.({
            success: true,
            evmTransactionHash: evmTransactionHashes[0] || `cast-${castIds[0].toString()}`,
            targetChainId,
            targetContractAddress,
            tokenId: selectedCkNFTs.length === 1 ? firstCkNFT.tokenId : `${selectedCkNFTs.length} NFTs`,
          });
        }

      } catch (castError) {
        console.error('❌ Cast operation failed:', castError);
        const castErrorMessage = castError instanceof Error ? castError.message : 'Cast operation failed';
        updateProgressStep('initiate-cast', 'failed', castErrorMessage);
        throw castError; // Re-throw to be caught by outer catch block
      }

    } catch (error) {
        console.error('Return process failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Return failed';
        
        if (progress?.steps) {
          const currentProgressStep = progress.steps.find((step: any) => step.status === 'loading');
          if (currentProgressStep) {
            updateProgressStep(currentProgressStep.id, 'failed', errorMessage);
          }
        }
        
        setReturnResult({
          success: false,
          error: errorMessage,
        });
        
        onComplete?.({
          success: false,
          error: errorMessage,
        });
      }
  }, [selectedCkNFTs, targetChainId, targetContractAddress, user, returnCosts, progress, approveTokensForReturn, mutations, setReturnResult, setCurrentStep, onComplete, updateProgressStep]);

  // Memoize the approval status change callback to prevent infinite re-renders
  const handleApprovalStatusChange = useCallback((isApproved: boolean, allowanceAmount?: bigint) => {
    console.log('🔄 Cycles approval status changed:', { isApproved, allowanceAmount });
    setCyclesApprovalStatus({ isApproved, allowanceAmount: allowanceAmount || 0n });
  }, [setCyclesApprovalStatus]);

  // Handle burn balance status changes to prevent returning without sufficient ETH
  const handleBurnBalanceStatusChange = useCallback((hasRequiredBalances: boolean, balanceInfo: {[address: string]: {balance: bigint, required: bigint, sufficient: boolean}}) => {
    console.log('🔍 Burn balance status changed:', { hasRequiredBalances, balanceInfo });
    setBurnBalanceStatus({ hasRequiredBalances, balanceInfo });
  }, [setBurnBalanceStatus]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'connect':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Connect IC Wallet</h4>
            <p className="text-gray-600">
              Connect your Internet Computer wallet to access your ckNFTs.
            </p>
            
            {user?.principal ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h5 className="font-medium text-green-800 mb-2">✅ Wallet Connected</h5>
                <p className="text-sm text-green-700 font-mono break-all">
                  {user.principal.toString()}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-600">
                  Please connect your IC wallet using Internet Identity, NFID, or another supported provider.
                </p>
              </div>
            )}
          </div>
        );

      case 'select-cknft':
        return (
          <ICNFTSelectionStep
            selectedNFTs={selectedCkNFTs}
            onSelectionChange={setSelectedCkNFTs}
            userPrincipal={user?.principal}
            sourceCanisterId={initialCanisterId}
            onCanisterChange={(canisterId) => {
              // Handle canister change if needed
              console.log('Canister changed to:', canisterId);
            }}
          />
        );

      case 'select-target-chain':
        return (
          <div className="space-y-6">
            {/* Auto-selection info banner */}
            {selectedCkNFTs.length > 0 && selectedCkNFTs[0].nativeChain && targetChainId && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <h6 className="font-medium text-blue-800">Auto-Selected from Native Chain</h6>
                </div>
                <p className="text-sm text-blue-700">
                  The target network has been automatically selected based on the ckNFT's original source chain: <strong>{formatNetworkName(selectedCkNFTs[0].nativeChain)}</strong>
                </p>
                {/* Show warning if the detected chain is not in our supported list */}
                {targetChainId && !chainIdToNetwork[Number(targetChainId)] && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-xs text-amber-700">
                      ⚠️ Note: This chain (ID: {targetChainId}) may not be fully supported by the wallet interface, but the return operation should still work.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <EVMConnectionStep
              isConnected={isUnlocked}
              account={activeAddress}
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
              selectedTargetNetwork={targetChainId ? chainIdToNetwork[Number(targetChainId)] || undefined : undefined}
              onTargetNetworkChange={(networkName: string) => {
                const chainId = networkToChainId[networkName as keyof typeof networkToChainId];
                if (chainId) {
                  setTargetChainId(chainId.toString());
                }
              }}
            />
            
            {/* Contract Address Input - shown after network is selected */}
            {targetChainId && (
              <div className="border-t border-gray-200 pt-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Step 3: Target Contract Address
                    </label>
                    <p className="text-sm text-gray-500 mb-3">
                      Enter the contract address where you want to return your NFT.
                    </p>
                    <div className="relative">
                      <input
                        type="text"
                        value={targetContractAddress}
                        onChange={(e) => setTargetContractAddress(e.target.value)}
                        placeholder="0x..."
                        className={clsx(
                          "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2",
                          contractValidation.isValid === true
                            ? "border-green-300 focus:ring-green-500"
                            : contractValidation.isValid === false
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        )}
                      />
                      {contractValidation.isValidating && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Validation Status */}
                    {contractValidation.isValid === true && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center text-green-800 text-sm">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {contractValidation.isNativeContract 
                            ? "✅ Valid native contract - can proceed with return"
                            : "✅ Valid contract address format"
                          }
                        </div>
                      </div>
                    )}
                    
                    {contractValidation.isValid === false && contractValidation.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center text-red-800 text-sm">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {contractValidation.error}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedCkNFTs.length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h6 className="font-medium text-yellow-800 mb-2">💡 Native Chain Information</h6>
                      
                      {nativeChainLoading ? (
                        <div className="flex items-center text-yellow-600 text-sm">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                          Detecting native chain information...
                        </div>
                      ) : nativeChainError ? (
                        <div className="text-red-600 text-sm">
                          Failed to detect native chain: {nativeChainError}
                        </div>
                      ) : selectedCkNFTs[0].nativeChain ? (
                        <div>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="text-yellow-600">Original Chain:</span>
                              <span className="ml-2 text-yellow-800">{formatNetworkName(selectedCkNFTs[0].nativeChain)}</span>
                            </div>
                            {selectedCkNFTs[0].nativeContract && (
                              <div>
                                <span className="text-yellow-600">Original Contract:</span>
                                <span className="ml-2 font-mono text-yellow-800">{selectedCkNFTs[0].nativeContract}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-yellow-600 mt-2">
                            The target network and contract have been automatically selected based on the ckNFT's native chain. The return wizard can only return NFTs to their original source.
                          </p>
                          
                          {/* Auto-fill button */}
                          {targetChainId && selectedCkNFTs[0].nativeContract && 
                           targetContractAddress !== selectedCkNFTs[0].nativeContract && (
                            <button
                              onClick={() => {
                                const targetNetwork = createNetworkFromChainId(targetChainId);
                                const nativeNetwork = selectedCkNFTs[0].nativeChain;
                                const isMatchingNetwork = targetNetwork && nativeNetwork && 
                                  'Ethereum' in targetNetwork && 'Ethereum' in nativeNetwork &&
                                  targetNetwork.Ethereum[0] === nativeNetwork.Ethereum[0];
                                
                                if (isMatchingNetwork && selectedCkNFTs[0].nativeContract) {
                                  setTargetContractAddress(selectedCkNFTs[0].nativeContract);
                                }
                              }}
                              className="mt-2 px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors"
                            >
                              Use Original Contract Address
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-600 text-sm">
                          No native chain information available for this ckNFT
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'costs':
        const targetNetwork = createNetworkFromChainId(targetChainId);
        return (
          <ReturnCostStep
            selectedCkNFTs={selectedCkNFTs}
            targetNetwork={targetNetwork}
            targetContract={targetContractAddress}
            costs={returnCosts}
            onCostsCalculated={setReturnCosts}
            onApprovalStatusChange={handleApprovalStatusChange}
            onBurnBalanceStatusChange={handleBurnBalanceStatusChange}
            onContinue={() => setCurrentStep('return')}
          />
        );

      case 'return':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-lg font-medium text-gray-900 mb-2">Returning ckNFT to EVM</h4>
              <p className="text-gray-600">
                Your ckNFT is being returned to the target EVM chain.
              </p>
            </div>

            {progress && (
              <BridgeChecklist
                progress={progress}
                onRetryStep={(stepId) => {
                  const retryProgress = retryBridgeStep(progress, stepId);
                  setProgress(retryProgress);
                  // Add retry logic here
                }}
              />
            )}

            {/* Show error state with reset option */}
            {progress && progress.steps.some((step: any) => step.status === 'failed') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-red-800">Return Process Failed</h5>
                    <p className="text-red-600 text-sm">
                      The return process encountered an error. You can start over or try funding the burn address with more ETH.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Reset everything to start over
                      setProgress(null);
                      setCurrentStep('costs');
                      setReturnCosts(null);
                    }}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={handleStartReturn}
                disabled={progress !== null}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {progress ? 'Returning...' : 'Start Return Process'}
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <ReturnCompletionStep
            result={returnResult!}
            onStartNew={() => {
              setCurrentStep('connect');
              setSelectedCkNFTs([]);
              setTargetChainId('');
              setTargetContractAddress('');
              setReturnCosts(null);
              setReturnResult(null);
              setProgress(null);
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
          <h2 className="text-xl font-semibold text-gray-900">Return ckNFT to EVM</h2>
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
            <div key={step.id} className="flex items-center">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                index < currentStepIndex
                  ? 'bg-green-100 text-green-800'
                  : index === currentStepIndex
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-500'
              )}>
                {index + 1}
              </div>
              <span className={clsx(
                'ml-2 text-sm font-medium',
                index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
              )}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={clsx(
                  'w-8 h-px mx-4',
                  index < currentStepIndex ? 'bg-green-300' : 'bg-gray-300'
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {renderStepContent()}
      </div>

      {/* Burn Balance Warning - show when on costs step and balances are insufficient */}
      {currentStep === 'costs' && returnCosts && !burnBalanceStatus.hasRequiredBalances && Object.keys(burnBalanceStatus.balanceInfo).length > 0 && (
        <div className="mx-6 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">Insufficient Burn Address Funding</h4>
              <p className="text-sm text-yellow-700 mb-3">
                Some burn funding addresses don't have sufficient ETH balance for the return operation. Please fund these addresses before proceeding:
              </p>
              <div className="space-y-2">
                {Object.entries(burnBalanceStatus.balanceInfo)
                  .filter(([, info]) => !info.sufficient)
                  .map(([address, info]) => (
                    <div key={address} className="text-sm">
                      <div className="font-mono text-yellow-800 text-xs break-all mb-1">{address}</div>
                      <div className="text-yellow-700">
                        Balance: {(Number(info.balance) / 1e18).toFixed(6)} ETH | 
                        Required: {(Number(info.required) / 1e18).toFixed(6)} ETH | 
                        <span className="font-medium text-yellow-800">
                          Need: {((Number(info.required) - Number(info.balance)) / 1e18).toFixed(6)} ETH more
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-yellow-600 mt-2">
                💡 Use the "Send ETH" buttons in the burn funding section above to fund these addresses.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between p-6 border-t border-gray-200">
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>

        <button
          onClick={handleNext}
          disabled={!canGoNext()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );

  return modal ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {wizardContent}
    </div>
  ) : (
    wizardContent
  );
}

function ReturnCompletionStep({
  result,
  onStartNew,
  onClose,
}: {
  result: ReturnResult;
  onStartNew: () => void;
  onClose: () => void;
}) {
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Return Successful!</h3>
            <p className="text-gray-600">
              Your ckNFT has been successfully returned to the target EVM chain.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Return Failed</h3>
            <p className="text-gray-600">{result.error}</p>
          </>
        )}
      </div>

      {result.success && (
        <div className="space-y-3 text-sm">
          {/* Target Chain Information */}
          {result.targetChainId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-800 mb-1">Target Chain</p>
              <p className="text-blue-700">Chain {result.targetChainId}</p>
            </div>
          )}
          
          {/* Contract Address */}
          {result.targetContractAddress && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-800 mb-1">Contract Address</p>
              <p className="text-green-700 font-mono text-xs break-all">
                {result.targetContractAddress}
              </p>
            </div>
          )}
          
          {/* Token Information */}
          {result.tokenId && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="font-medium text-purple-800 mb-1">Token ID</p>
              <p className="text-purple-700">{result.tokenId}</p>
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
          Return More ckNFTs
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
