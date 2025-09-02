import { useState, useCallback, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMetaMask } from '../../hooks/useEVM';
import { useAuth } from '../../hooks/useAuth';
import { use99Mutations } from '../../hooks/use99Mutations';
import { BridgeProgress, BridgeDirection, createBridgeProgress, updateBridgeStep } from '../../lib/bridgeProgress';
import type { Network } from '../../declarations/orchestrator/orchestrator.did';

// Step components
import { EVMConnectionStep } from './EVMConnectionStep';
import { NFTSelectionStep } from './NFTSelectionStep';
import { BurnCostStep } from './BurnCostStep';
import { BurnTransactionStep } from './BurnTransactionStep';
import type { SelectedNFT, NFTDiscoveryService } from './NFTSelectionStep';
import type { BurnCosts } from './BurnCostStep';

type BurnWizardStep = 'connect' | 'select-evm-nft' | 'costs' | 'burn' | 'complete';

export interface SelectedEVMNFT {
  tokenId: string;
  contractAddress: string;
  chainId: string;
  metadata?: any;
  image?: string;
  name?: string;
  description?: string;
}

export interface BurnResult {
  success: boolean;
  error?: string;
  icTransactionHash?: string;
  ckNFTCanisterId?: string;
  tokenId?: string;
}

export interface EVMBurnWizardProps {
  /** The source EVM chain to burn from */
  sourceChainId?: string;
  /** The source contract address */
  sourceContractAddress?: string;
  /** The token ID to burn */
  sourceTokenId?: string;
  /** NFT discovery service for finding collections and NFTs */
  nftDiscoveryService?: NFTDiscoveryService;
  /** Callback when the burn process completes */
  onComplete?: (result: BurnResult) => void;
  /** Callback when the wizard is cancelled */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Show the wizard in a modal */
  modal?: boolean;
  /** Mock burn result for testing */
  mockBurnResult?: BurnResult;
}

export function EVMBurnWizard({
  sourceChainId: initialChainId,
  sourceContractAddress: initialContractAddress,
  sourceTokenId: initialTokenId,
  nftDiscoveryService,
  onComplete,
  onCancel,
  className,
  modal = true,
  mockBurnResult,
}: EVMBurnWizardProps) {
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

  // Supported networks for burn operations
  const supportedNetworks = Object.keys(networkToChainId);

  // Target network state for burn operations
  // NOTE: For burn operations, this should represent the REMOTE network where cast NFTs exist
  // This is different from import operations where targetNetwork is the destination
  const [targetNetwork, setTargetNetwork] = useState<Network | null>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<BurnWizardStep>('connect');
  const [selectedNFTs, setSelectedNFTs] = useState<SelectedNFT[]>([]);
  const [burnCosts, setBurnCosts] = useState<BurnCosts | null>(null);
  const [burnTxHash, setBurnTxHash] = useState<string | null>(null);
  const [progress, setProgress] = useState<BridgeProgress | null>(null);
  const [burnResult, setBurnResult] = useState<BurnResult | null>(mockBurnResult || null);

  // Debug NFT selection changes
  console.log('🔍 EVMBurnWizard selectedNFTs state:', {
    selectedNFTs: selectedNFTs.map(nft => ({
      contractAddress: nft.contractAddress,
      tokenId: nft.tokenId,
      name: nft.name,
      isMockAddress: nft.contractAddress === '0x1234567890123456789012345678901234567890'
    })),
    count: selectedNFTs.length,
    currentStep
  });

  // Hooks
  const { activeAddress, isUnlocked, connectWallet, switchChain, chainId } = useMetaMask();
  const { user } = useAuth();

  // Initialize with provided values if available
  useEffect(() => {
    if (initialChainId && initialContractAddress && initialTokenId) {
      setSelectedNFTs([{
        tokenId: initialTokenId,
        contractAddress: initialContractAddress,
        name: `Token ${initialTokenId}`,
        description: `NFT from contract ${initialContractAddress}`,
      }]);
    }
  }, [initialChainId, initialContractAddress, initialTokenId]);

  const steps = [
    { id: 'connect', title: 'Connect', description: 'Connect EVM wallet' },
    { id: 'select-evm-nft', title: 'Select NFT', description: 'Choose NFT to burn' },
    { id: 'costs', title: 'Costs', description: 'Review burn costs' },
    { id: 'burn', title: 'Burn', description: 'Execute burn operation' },
    { id: 'complete', title: 'Complete', description: 'Burn summary' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  // Get mutations
  const orchestratorCanisterId = process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai';
  const mutations = use99Mutations(orchestratorCanisterId);

  // Progress management
  const createBurnProgressState = useCallback((direction: BridgeDirection) => {
    const burnProgress = createBridgeProgress(direction, [
      { id: 'verify-evm-connection', title: 'Verify EVM Connection', description: 'Checking EVM wallet connection to remote network', stage: 'setup' },
      { id: 'get-burn-address', title: 'Get Burn Address', description: 'Getting burn funding address from ckNFT canister', stage: 'setup' },
      { id: 'transfer-to-burn', title: 'Transfer to Burn Address', description: 'Transferring cast NFT to burn address on remote EVM chain', stage: 'execution' },
      { id: 'remint-cknft', title: 'Remint ckNFT', description: 'Reminting ckNFT on IC using remote contract reference (following remintCkNFT pattern)', stage: 'execution' },
    ]);
    setProgress(burnProgress);
    return burnProgress;
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
        return isUnlocked && activeAddress && targetNetwork !== null;
      case 'select-evm-nft':
        return selectedNFTs.length > 0;
      case 'costs':
        return burnCosts !== null;
      case 'burn':
        return burnResult?.success === true;
      default:
        return false;
    }
  }, [currentStep, activeAddress, isUnlocked, targetNetwork, selectedNFTs, burnCosts, burnResult]);

  console.log('EVMBurnWizard canGoNext analysis:', {
    currentStep,
    activeAddress: !!activeAddress,
    isUnlocked,
    selectedNFTs: selectedNFTs.length,
    burnCosts: !!burnCosts,
    burnResultSuccess: burnResult?.success
  });

  // Transaction handlers
  const handleTransactionComplete = useCallback((txHash?: string) => {
    console.log('🎉 Burn transaction completed:', txHash);
    if (txHash) {
      setBurnTxHash(txHash);
    }
    setBurnResult({ success: true });
    updateProgressStep('transfer-to-burn', 'completed', undefined, txHash);
    updateProgressStep('remint-cknft', 'loading', 'Starting ckNFT remint process using remote contract reference...');
    
    // Move to completion step
    setCurrentStep('complete');
    
    // Call onComplete callback if provided
    onComplete?.({ 
      success: true, 
      icTransactionHash: txHash || '' 
    });
  }, [updateProgressStep, onComplete]);

  const handleTransactionError = useCallback((error: string) => {
    console.error('❌ Burn transaction failed:', error);
    setBurnResult({ success: false, error });
    updateProgressStep('transfer-to-burn', 'failed', error);
    
    // Call onComplete callback if provided
    onComplete?.({ 
      success: false, 
      error 
    });
  }, [updateProgressStep, onComplete]);

  // Error handling
  const hasError = useMemo(() => {
    if (progress?.steps) {
      const burnError = progress.steps.some((step: any) => step.status === 'failed');
      if (burnError) return true;
    }
    
    if (burnResult && !burnResult.success) {
      return true;
    }
    
    return false;
  }, [progress, burnResult]);

  // Automatically advance to complete step when burn is successful
  useEffect(() => {
    if (burnResult?.success && currentStep !== 'complete') {
      console.log('🎉 Burn completed successfully, advancing to complete step');
      setCurrentStep('complete');
    }
  }, [burnResult, currentStep]);

  const canGoPrev = currentStepIndex > 0 && 
    (currentStep !== 'burn' && currentStep !== 'complete' || hasError);

  const handleNext = useCallback(() => {
    if (!canGoNext()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id as BurnWizardStep);
    }
  }, [currentStepIndex, canGoNext, steps]);

  const handlePrev = useCallback(() => {
    if (!canGoPrev) return;

    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id as BurnWizardStep);
    }
  }, [currentStepIndex, canGoPrev, steps]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'connect':
        return (
          <EVMConnectionStep
            isConnected={!!activeAddress && isUnlocked}
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
            selectedTargetNetwork={targetNetwork && 'Ethereum' in targetNetwork ? 
              chainIdToNetwork[Number(targetNetwork.Ethereum[0])] || undefined : undefined}
            onTargetNetworkChange={(networkName: string) => {
              const chainId = networkToChainId[networkName as keyof typeof networkToChainId];
              if (chainId) {
                console.log('🎯 Remote network selected for burn operation:', networkName, 'Chain ID:', chainId);
                console.log('🔥 This represents the REMOTE network where cast NFTs currently exist');
                setTargetNetwork({ Ethereum: [BigInt(chainId)] });
              }
            }}
          />
        );

      case 'select-evm-nft':
        return (
          <NFTSelectionStep
            mode="burn"
            account={activeAddress!}
            network={chainId ? chainIdToNetwork[chainId] || null : null}
            selectedNFTs={selectedNFTs}
            onSelectionChange={setSelectedNFTs}
            nftDiscoveryService={nftDiscoveryService}
          />
        );

      case 'costs':
        return (
          <BurnCostStep
            selectedNFTs={selectedNFTs}
            targetNetwork={targetNetwork} // This is the REMOTE network where cast NFTs exist
            costs={burnCosts}
            onCostsCalculated={setBurnCosts}
            compact={hasError}
            isConnected={!!activeAddress && isUnlocked}
            activeAddress={activeAddress}
          />
        );

      case 'burn':
        return (
          <BurnTransactionStep
            selectedNFTs={selectedNFTs}
            targetNetwork={targetNetwork}
            costs={burnCosts}
            onTransactionComplete={handleTransactionComplete}
            onTransactionError={handleTransactionError}
            onBack={handlePrev}
          />
        );

      case 'complete':
        return (
          <BurnCompletionStep
            result={burnResult!}
            onStartNew={() => {
              setCurrentStep('connect');
              setSelectedNFTs([]);
              setBurnCosts(null);
              setBurnResult(null);
              createBurnProgressState('evm-to-ic' as BridgeDirection);
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
          <h2 className="text-xl font-semibold text-gray-900">Burn EVM NFT</h2>
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

function BurnCompletionStep({
  result,
  onStartNew,
  onClose,
}: {
  result: BurnResult;
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Burn Successful!</h3>
            <p className="text-gray-600">
              Your EVM NFT has been successfully burned and minted as a ckNFT on the Internet Computer.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Burn Failed</h3>
            <p className="text-gray-600">{result.error}</p>
          </>
        )}
      </div>

      {result.success && (
        <div className="space-y-3 text-sm">
          {/* ckNFT Canister Information */}
          {result.ckNFTCanisterId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-800 mb-1">ckNFT Canister</p>
              <p className="text-blue-700 font-mono text-xs break-all">
                {result.ckNFTCanisterId}
              </p>
            </div>
          )}
          
          {/* Token Information */}
          {result.tokenId && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-800 mb-1">Token ID</p>
              <p className="text-green-700">{result.tokenId}</p>
            </div>
          )}
          
          {/* IC Transaction */}
          {result.icTransactionHash && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="font-medium text-gray-800 mb-1">IC Transaction</p>
              <p className="text-gray-700 font-mono text-xs break-all">
                {result.icTransactionHash}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center space-x-4">
        <button
          onClick={onStartNew}
          className="px-6 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors"
        >
          Burn More NFTs
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
