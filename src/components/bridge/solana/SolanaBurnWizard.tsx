import { useState, useCallback, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useSolana } from '../../../hooks/useSolana';
import { useAuth } from '../../../hooks/useAuth';
import { 
  BridgeProgress, 
  BridgeDirection, 
  createBridgeProgress, 
  updateBridgeStep 
} from '../../../lib/bridgeProgress';
import type { SolanaCluster } from '../../../types/solana';

// Step components
import { SolanaConnectionStep } from '../SolanaConnectionStep';
import { SolanaBurnNFTSelectionStep } from '../SolanaBurnNFTSelectionStep';
import { SolanaBurnCostStep } from './SolanaBurnCostStep';
import { SolanaBurnExecutionStep } from './SolanaBurnExecutionStep';
import type { SelectedSolanaBurnNFT } from '../SolanaBurnNFTSelectionStep';
import type { SolanaBurnCosts } from './SolanaBurnCostStep';

// ============================================================================
// Type Definitions
// ============================================================================

type BurnWizardStep = 'connect' | 'select-nft' | 'costs' | 'burn' | 'complete';

export interface SolanaBurnResult {
  success: boolean;
  error?: string;
  solanaSignature?: string; // SPL Token transfer signature
  icTransactionHash?: string; // orchestrator.mint() result
  ckNFTCanisterId?: string;
  tokenId?: string;
}

export interface SolanaBurnWizardProps {
  /** The Solana cluster to operate on */
  cluster?: SolanaCluster;
  /** Pre-selected NFT mint address */
  sourceMintAddress?: string;
  /** Pre-selected collection address */
  sourceCollectionAddress?: string;
  /** Callback when the burn process completes */
  onComplete?: (result: SolanaBurnResult) => void;
  /** Callback when the wizard is cancelled */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Show the wizard in a modal */
  modal?: boolean;
  /** Mock burn result for testing */
  mockBurnResult?: SolanaBurnResult;
}

// ============================================================================
// Burn Completion Step Component
// ============================================================================

interface BurnCompletionStepProps {
  result: SolanaBurnResult;
  onStartNew: () => void;
  onClose: () => void;
}

function BurnCompletionStep({ result, onStartNew, onClose }: BurnCompletionStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        {result.success ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Burn Complete!</h3>
            <p className="text-gray-600">
              Your Solana NFT has been returned to the Internet Computer as a ckNFT.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Burn Failed</h3>
            <p className="text-gray-600 mb-4">
              There was an error during the burn process.
            </p>
            {result.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-mono">{result.error}</p>
              </div>
            )}
          </>
        )}
      </div>

      {result.success && (
        <div className="space-y-3">
          {result.solanaSignature && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Solana Transfer Signature:</div>
              <div className="text-xs font-mono text-gray-800 break-all">
                {result.solanaSignature}
              </div>
            </div>
          )}
          {result.icTransactionHash && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">IC Transaction Hash:</div>
              <div className="text-xs font-mono text-gray-800 break-all">
                {result.icTransactionHash}
              </div>
            </div>
          )}
          {result.ckNFTCanisterId && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">ckNFT Canister:</div>
              <div className="text-xs font-mono text-gray-800">
                {result.ckNFTCanisterId}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-3">
        {result.success && (
          <button
            onClick={onStartNew}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Burn Another NFT
          </button>
        )}
        <button
          onClick={onClose}
          className={clsx(
            'px-6 py-3 rounded-lg font-medium transition-colors',
            result.success
              ? 'flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'w-full bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Wizard Component
// ============================================================================

export function SolanaBurnWizard({
  cluster = 'devnet' as any, // TODO: Fix type - should be SolanaCluster variant
  sourceMintAddress,
  sourceCollectionAddress,
  onComplete,
  onCancel,
  className,
  modal = true,
  mockBurnResult,
}: SolanaBurnWizardProps) {
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [currentStep, setCurrentStep] = useState<BurnWizardStep>('connect');
  const [selectedNFT, setSelectedNFT] = useState<SelectedSolanaBurnNFT | null>(null);
  const [burnCosts, setBurnCosts] = useState<SolanaBurnCosts | null>(null);
  const [progress, setProgress] = useState<BridgeProgress | null>(null);
  const [burnResult, setBurnResult] = useState<SolanaBurnResult | null>(
    mockBurnResult || null
  );
  const [selectedCluster, setSelectedCluster] = useState<SolanaCluster>(cluster || 'devnet');

  // ============================================================================
  // Hooks
  // ============================================================================
  
  const { publicKey, connected, connection } = useSolana();
  const { user } = useAuth();

  // ============================================================================
  // Initialize with Provided Values
  // ============================================================================
  
  useEffect(() => {
    if (sourceMintAddress && sourceCollectionAddress) {
      setSelectedNFT({
        mintAddress: sourceMintAddress,
        collectionAddress: sourceCollectionAddress,
        cluster: selectedCluster,
        name: `NFT ${sourceMintAddress.slice(0, 4)}...${sourceMintAddress.slice(-4)}`,
      });
    }
  }, [sourceMintAddress, sourceCollectionAddress, selectedCluster]);

  // ============================================================================
  // Step Configuration
  // ============================================================================
  
  const steps = [
    { id: 'connect', title: 'Connect', description: 'Connect Solana wallet & IC' },
    { id: 'select-nft', title: 'Select NFT', description: 'Choose NFT to burn' },
    { id: 'costs', title: 'Costs', description: 'Review burn costs' },
    { id: 'burn', title: 'Burn', description: 'Execute burn & mint' },
    { id: 'complete', title: 'Complete', description: 'Burn summary' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  // ============================================================================
  // Progress Management
  // ============================================================================
  
  const createBurnProgressState = useCallback((direction: BridgeDirection) => {
    const burnProgress = createBridgeProgress(direction, [
      {
        id: 'verify-connection',
        title: 'Verify Connection',
        description: 'Checking Solana wallet and IC authentication',
        stage: 'setup',
      },
      {
        id: 'get-approval-address',
        title: 'Get Approval Address',
        description: 'Deriving approval address for NFT return',
        stage: 'setup',
      },
      {
        id: 'transfer-to-approval',
        title: 'Transfer to Approval Address',
        description: 'Transferring NFT to approval address on Solana',
        stage: 'execution',
      },
      {
        id: 'mint-on-ic',
        title: 'Mint ckNFT on IC',
        description: 'Calling orchestrator.mint() to return ckNFT',
        stage: 'execution',
      },
    ]);
    setProgress(burnProgress);
    return burnProgress;
  }, []);

  const updateProgressStep = useCallback(
    (stepId: string, status: 'loading' | 'completed' | 'failed', error?: string, txHash?: string) => {
      setProgress(prevProgress => {
        if (!prevProgress) return null;
        return updateBridgeStep(prevProgress, stepId, { status, error, txHash });
      });
    },
    []
  );

  // ============================================================================
  // Validation
  // ============================================================================
  
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'connect':
        return connected && publicKey && user;
      case 'select-nft':
        return selectedNFT !== null;
      case 'costs':
        return burnCosts !== null && burnCosts.userSolBalance !== undefined && 
               !burnCosts.hasInsufficientSolBalance;
      case 'burn':
        return burnResult?.success === true;
      default:
        return false;
    }
  }, [currentStep, connected, publicKey, user, selectedNFT, burnCosts, burnResult]);

  console.log('🔍 SolanaBurnWizard canGoNext analysis:', {
    currentStep,
    connected,
    publicKey: !!publicKey,
    user: !!user,
    selectedNFT: !!selectedNFT,
    burnCosts: !!burnCosts,
    hasSufficientSOL: burnCosts ? !burnCosts.hasInsufficientSolBalance : false,
    burnResultSuccess: burnResult?.success,
    canGoNext: canGoNext(),
  });

  // ============================================================================
  // Transaction Handlers
  // ============================================================================
  
  const handleTransactionComplete = useCallback(
    (solanaSignature?: string, icTxHash?: string) => {
      console.log('🎉 Burn transaction completed:', { solanaSignature, icTxHash });
      
      setBurnResult({
        success: true,
        solanaSignature,
        icTransactionHash: icTxHash,
        ckNFTCanisterId: burnCosts?.ckNFTCanisterId.toString(),
      });
      
      updateProgressStep('transfer-to-approval', 'completed', undefined, solanaSignature);
      updateProgressStep('mint-on-ic', 'completed', undefined, icTxHash);
      
      setCurrentStep('complete');
      
      onComplete?.({
        success: true,
        solanaSignature,
        icTransactionHash: icTxHash,
        ckNFTCanisterId: burnCosts?.ckNFTCanisterId.toString(),
      });
    },
    [updateProgressStep, onComplete, burnCosts]
  );

  const handleTransactionError = useCallback(
    (error: string, stage?: string) => {
      console.error('❌ Burn transaction failed:', error);
      
      setBurnResult({ success: false, error });
      
      if (stage) {
        updateProgressStep(stage, 'failed', error);
      }
      
      onComplete?.({
        success: false,
        error,
      });
    },
    [updateProgressStep, onComplete]
  );

  // ============================================================================
  // Error Handling
  // ============================================================================
  
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

  // Auto-advance to complete step on success
  useEffect(() => {
    if (burnResult?.success && currentStep !== 'complete') {
      console.log('🎉 Burn completed successfully, advancing to complete step');
      setCurrentStep('complete');
    }
  }, [burnResult, currentStep]);

  // ============================================================================
  // Navigation
  // ============================================================================
  
  const canGoPrev = 
    currentStepIndex > 0 && 
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

  // ============================================================================
  // Step Content Rendering
  // ============================================================================
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 'connect':
        return (
          <div className="space-y-6">
            <SolanaConnectionStep
              selectedTargetCluster={selectedCluster}
              onTargetClusterChange={(newCluster) => {
                console.log('Target cluster changed:', newCluster);
                setSelectedCluster(newCluster);
              }}
            />
            
            {/* Additional connection status for burn context */}
            {connected && publicKey && user && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <div className="font-medium text-green-900">Ready to Burn</div>
                    <div className="text-sm text-green-700">
                      Solana wallet and IC account connected
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'select-nft':
        return (
          <SolanaBurnNFTSelectionStep
            cluster={selectedCluster}
            onSelectionChange={setSelectedNFT}
          />
        );

      case 'costs':
        return (
          <SolanaBurnCostStep
            selectedNFT={selectedNFT}
            costs={burnCosts}
            onCostsCalculated={setBurnCosts}
            isConnected={connected}
            walletPublicKey={publicKey?.toBase58()}
            connection={connection}
          />
        );

      case 'burn':
        return (
          <SolanaBurnExecutionStep
            selectedNFT={selectedNFT}
            burnCosts={burnCosts}
            progress={progress}
            onProgressUpdate={setProgress}
            onTransactionComplete={handleTransactionComplete}
            onError={handleTransactionError}
          />
        );

      case 'complete':
        return burnResult ? (
          <BurnCompletionStep
            result={burnResult}
            onStartNew={() => {
              setCurrentStep('connect');
              setSelectedNFT(null);
              setBurnCosts(null);
              setBurnResult(null);
              createBurnProgressState('solana-to-ic' as BridgeDirection);
            }}
            onClose={() => onCancel?.()}
          />
        ) : null;

      default:
        return null;
    }
  };

  // ============================================================================
  // Main Render
  // ============================================================================
  
  const wizardContent = (
    <div
      className={clsx(
        'bg-white rounded-lg shadow-lg',
        modal && 'max-w-4xl mx-auto',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Burn Solana NFT</h2>
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
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  index < currentStepIndex
                    ? 'bg-green-100 text-green-800'
                    : index === currentStepIndex
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-500'
                )}
              >
                {index + 1}
              </div>
              <span
                className={clsx(
                  'ml-2 text-sm font-medium',
                  index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
                )}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={clsx(
                    'w-8 h-px mx-4',
                    index < currentStepIndex ? 'bg-green-300' : 'bg-gray-300'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {renderStepContent()}
      </div>

      {/* Navigation Footer */}
      {currentStep !== 'complete' && (
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className={clsx(
              'flex items-center px-4 py-2 rounded-lg font-medium transition-colors',
              canGoPrev
                ? 'text-gray-700 hover:bg-gray-200'
                : 'text-gray-400 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canGoNext()}
            className={clsx(
              'flex items-center px-6 py-2 rounded-lg font-medium transition-colors',
              canGoNext()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            Next
            <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      )}
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
