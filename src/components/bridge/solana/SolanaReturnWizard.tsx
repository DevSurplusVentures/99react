import { useState, useCallback, useEffect } from 'react';
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

// Step components
import { SolanaConnectionStep } from '../SolanaConnectionStep';
import { ICNFTSelectionStep } from '../ICNFTSelectionStep';
import type { SelectedICNFT } from '../EVMExportWizard';
import { SolanaReturnCostStep } from './SolanaReturnCostStep';
import { SolanaReturnExecutionStep } from './SolanaReturnExecutionStep';
import type { SolanaReturnCosts } from './SolanaReturnCostStep';

// ============================================================================
// Type Definitions
// ============================================================================

type ReturnWizardStep = 'connect-ic' | 'select-cknft' | 'connect-solana' | 'costs' | 'return' | 'complete';

export interface SolanaReturnResult {
  success: boolean;
  error?: string;
  solanaSignature?: string;
  ckNFTCanisterId?: string;
  tokenId?: string;
}

export interface SolanaReturnWizardProps {
  /** Pre-selected ckNFT canister ID */
  ckNFTCanisterId?: string;
  /** Pre-selected token ID */
  tokenId?: string;
  /** Callback when the return process completes */
  onComplete?: (result: SolanaReturnResult) => void;
  /** Callback when the wizard is cancelled */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Show the wizard in a modal */
  modal?: boolean;
}

// ============================================================================
// Return Completion Step Component
// ============================================================================

interface ReturnCompletionStepProps {
  result: SolanaReturnResult;
  onStartNew: () => void;
  onClose: () => void;
}

function ReturnCompletionStep({ result, onStartNew, onClose }: ReturnCompletionStepProps) {
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Return Complete!</h3>
            <p className="text-gray-600">
              Your ckNFT has been returned to Solana as the original NFT.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Return Failed</h3>
            <p className="text-gray-600 mb-4">
              There was an error during the return process.
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
              <div className="text-sm text-gray-600 mb-1">Solana Signature:</div>
              <div className="text-xs font-mono text-gray-800 break-all">
                {result.solanaSignature}
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
            Return Another NFT
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

export function SolanaReturnWizard({
  ckNFTCanisterId: _ckNFTCanisterId,
  tokenId: _tokenId,
  onComplete,
  onCancel,
  className,
  modal = true,
}: SolanaReturnWizardProps) {
  // ============================================================================
  // State Management
  // ============================================================================

  const [currentStep, setCurrentStep] = useState<ReturnWizardStep>('connect-ic');
  const [selectedNFT, setSelectedNFT] = useState<SelectedICNFT | null>(null);
  const [returnCosts, setReturnCosts] = useState<SolanaReturnCosts | null>(null);
  const [progress, setProgress] = useState<BridgeProgress | null>(null);
  const [returnResult, setReturnResult] = useState<SolanaReturnResult | null>(null);
  const [manualNavigation, setManualNavigation] = useState(false); // Track manual back/forward navigation

  // ============================================================================
  // Hooks
  // ============================================================================

  const { publicKey, connected, connection, sendTransaction } = useSolana();
  const { user } = useAuth();

  // ============================================================================
  // Step Configuration
  // ============================================================================

  const steps = [
    { id: 'connect-ic', title: 'Connect IC', description: 'Connect IC wallet' },
    { id: 'select-cknft', title: 'Select ckNFT', description: 'Choose ckNFT to return' },
    { id: 'connect-solana', title: 'Connect Solana', description: 'Connect Solana wallet' },
    { id: 'costs', title: 'Costs', description: 'Review return costs' },
    { id: 'return', title: 'Return', description: 'Execute return' },
    { id: 'complete', title: 'Complete', description: 'Return summary' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  // ============================================================================
  // Progress Management
  // ============================================================================

  const createReturnProgressState = useCallback((direction: BridgeDirection) => {
    const returnProgress = createBridgeProgress(direction, [
      {
        id: 'verify-connection',
        title: 'Verify Connection',
        description: 'Checking Solana wallet and IC authentication',
        stage: 'setup',
      },
      {
        id: 'prepare-cast',
        title: 'Prepare Cast Request',
        description: 'Preparing cast operation parameters',
        stage: 'setup',
      },
      {
        id: 'execute-cast',
        title: 'Execute Cast',
        description: 'Calling icrc99_cast on ckNFT canister',
        stage: 'execution',
      },
      {
        id: 'monitor-status',
        title: 'Monitor Cast Status',
        description: 'Waiting for cast to complete on Solana',
        stage: 'execution',
      },
    ]);
    setProgress(returnProgress);
    return returnProgress;
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
      case 'connect-ic':
        return user !== null;
      case 'select-cknft':
        return selectedNFT !== null;
      case 'connect-solana':
        return connected && publicKey !== null;
      case 'costs':
        return returnCosts !== null && 
               returnCosts.castSignerAddress !== undefined &&
               !returnCosts.needsCastSignerFunding;
      case 'return':
        return returnResult?.success === true;
      default:
        return false;
    }
  }, [currentStep, user, selectedNFT, connected, publicKey, returnCosts, returnResult]);

  // ============================================================================
  // Transaction Handlers
  // ============================================================================

  const handleTransactionComplete = useCallback(
    (solanaSignature?: string) => {
      console.log('🎉 Return transaction completed:', { solanaSignature });

      setReturnResult({
        success: true,
        solanaSignature,
        ckNFTCanisterId: selectedNFT?.canisterId,
        tokenId: selectedNFT?.tokenId,
      });

      updateProgressStep('execute-cast', 'completed', undefined, solanaSignature);
      updateProgressStep('monitor-status', 'completed');

      setCurrentStep('complete');

      onComplete?.({
        success: true,
        solanaSignature,
        ckNFTCanisterId: selectedNFT?.canisterId,
        tokenId: selectedNFT?.tokenId,
      });
    },
    [updateProgressStep, onComplete, selectedNFT]
  );

  const handleTransactionError = useCallback(
    (error: string, stage?: string) => {
      console.error('❌ Return transaction failed:', error);

      setReturnResult({ success: false, error });

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
  // Navigation
  // ============================================================================

  // const goToStep = useCallback((step: ReturnWizardStep) => {
  //   setCurrentStep(step);
  // }, []);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setManualNavigation(false); // Clear manual navigation flag when going forward
      setCurrentStep(steps[nextIndex].id as ReturnWizardStep);
    }
  }, [currentStepIndex, steps]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setManualNavigation(true); // Set flag to prevent auto-advance
      setCurrentStep(steps[prevIndex].id as ReturnWizardStep);
      // Clear the flag after a short delay to allow the step to render
      setTimeout(() => setManualNavigation(false), 500);
    }
  }, [currentStepIndex, steps]);

  const handleStartNew = useCallback(() => {
    setCurrentStep('connect-ic');
    setSelectedNFT(null);
    setReturnCosts(null);
    setProgress(null);
    setReturnResult(null);
  }, []);

  const handleClose = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Auto-advance when connections are ready (but not during manual navigation)
  useEffect(() => {
    if (currentStep === 'connect-ic' && user && !manualNavigation) {
      console.log('✅ IC connected, auto-advancing to ckNFT selection');
      goNext();
    }
  }, [currentStep, user, manualNavigation, goNext]);

  useEffect(() => {
    if (currentStep === 'connect-solana' && connected && publicKey && !manualNavigation) {
      console.log('✅ Solana connected, auto-advancing to costs');
      goNext();
    }
  }, [currentStep, connected, publicKey, manualNavigation, goNext]);

  // ============================================================================
  // Render Step Content
  // ============================================================================

  const renderStepContent = () => {
    switch (currentStep) {
      case 'connect-ic':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Internet Computer</h3>
              <p className="text-sm text-gray-600">
                Connect with your IC wallet to access your ckNFTs
              </p>
            </div>
            <div className="text-center text-sm text-gray-500">
              {user ? (
                <div className="text-green-600">✅ Connected as {user.principal.toText().slice(0, 10)}...</div>
              ) : (
                <div>Please connect using the login button in the header</div>
              )}
            </div>
          </div>
        );

      case 'select-cknft':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select ckNFT to Return</h3>
              <p className="text-sm text-gray-600">
                Choose the Solana-originated ckNFT you want to return
              </p>
            </div>
            <ICNFTSelectionStep
              selectedNFTs={selectedNFT ? [selectedNFT] : []}
              onSelectionChange={(nfts) => setSelectedNFT(nfts[0] || null)}
              userPrincipal={user?.principal}
              targetChain='solana'
            />
          </div>
        );

      case 'connect-solana':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Solana Wallet</h3>
              <p className="text-sm text-gray-600">
                Connect your Solana wallet to receive the returned NFT
              </p>
            </div>
            <SolanaConnectionStep />
          </div>
        );

      case 'costs':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Review Costs & Approve</h3>
              <p className="text-sm text-gray-600">
                Review the costs and approve cycles for the return operation
              </p>
            </div>
            {selectedNFT && (
              <SolanaReturnCostStep
                selectedNFT={{
                  canisterId: selectedNFT.canisterId,
                  tokenId: BigInt(selectedNFT.tokenId),
                  metadata: (selectedNFT.metadata?.allMetadata || []) as any
                }}
                costs={returnCosts}
                onCostsCalculated={setReturnCosts}
                isConnected={connected}
                walletPublicKey={publicKey?.toString()}
                connection={connection}
                sendTransaction={sendTransaction}
                targetSolanaAddress={publicKey?.toString()}
              />
            )}
          </div>
        );

      case 'return':
        // Create progress if not exists
        if (!progress) {
          createReturnProgressState('ic-to-evm' as any);
        }

        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Returning ckNFT to Solana</h3>
              <p className="text-sm text-gray-600">
                Please wait while we process your return...
              </p>
            </div>
            {selectedNFT && returnCosts && publicKey && progress && (
              <SolanaReturnExecutionStep
                selectedNFT={{
                  canisterId: selectedNFT.canisterId,
                  tokenId: BigInt(selectedNFT.tokenId)
                }}
                returnCosts={returnCosts}
                targetSolanaAddress={publicKey.toString()}
                progress={progress}
                onProgressUpdate={setProgress}
                onComplete={handleTransactionComplete}
                onError={handleTransactionError}
              />
            )}
          </div>
        );

      case 'complete':
        return returnResult && (
          <ReturnCompletionStep
            result={returnResult}
            onStartNew={handleStartNew}
            onClose={handleClose}
          />
        );

      default:
        return null;
    }
  };

  // ============================================================================
  // Render Wizard
  // ============================================================================

  const wizardContent = (
    <div className={clsx('bg-white rounded-lg shadow-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Return ckNFT to Solana
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].title}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderStepContent()}
      </div>

      {/* Footer - Navigation */}
      {currentStep !== 'return' && currentStep !== 'complete' && (
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={goBack}
            disabled={currentStepIndex === 0}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              currentStepIndex === 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-100'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={goNext}
            disabled={!canGoNext()}
            className={clsx(
              'flex items-center gap-2 px-6 py-2 rounded-lg transition-colors font-medium',
              canGoNext()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            {currentStep === 'costs' ? 'Start Return' : 'Continue'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {wizardContent}
        </div>
      </div>
    );
  }

  return wizardContent;
}
