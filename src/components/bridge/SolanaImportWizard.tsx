import { useState, useEffect } from 'react';
import { useSolana } from '../../hooks/useSolana';
import { SolanaConnectionStep } from './SolanaConnectionStep';
import { SolanaCollectionSelectionStep, type SelectedSolanaCollection } from './SolanaCollectionSelectionStep';
import { SolanaNFTSelectionStep, type SelectedSolanaNFT } from './SolanaNFTSelectionStep';
import { SolanaCanisterCostStep } from './SolanaCanisterCostStep';
import { NFTMintEstimationStep } from './NFTMintEstimationStep';
import { SolanaBridgeExecutionStep } from './SolanaBridgeExecutionStep';
import { useOrchestratorAllowance } from '../../hooks/use99Mutations';
import type { SolanaCluster } from '../../types/solana';

// Result type for Solana import operation
export interface SolanaImportResult {
  success: boolean;
  solanaTransactionHash?: string;
  icTransactionHash?: string;
  canisterAddress?: string;
  tokenId?: string;
  error?: string;
}

export interface SolanaImportWizardProps {
  onComplete?: (result: SolanaImportResult) => void;
  onCancel?: () => void;
  mode?: 'inline' | 'modal';
}

// Helper component for Step 4 that checks allowance before continuing
function Step4MintEstimation({
  selectedNFTs,
  mintCosts,
  setMintCosts,
  canisterAddress,
  onBack,
  onContinue,
}: {
  selectedNFTs: SelectedSolanaNFT[];
  mintCosts: bigint | null;
  setMintCosts: (costs: bigint) => void;
  canisterAddress: string | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  // Calculate the same 120% buffered amount that will be approved in Step 5
  // This ensures we check for the ACTUAL amount needed, not just the base cost
  const requiredApprovalAmount = mintCosts ? (mintCosts * BigInt(120)) / BigInt(100) : undefined; // 120% buffer for all steps
  
  const { data: allowanceInfo, isLoading: isLoadingAllowance } = useOrchestratorAllowance(requiredApprovalAmount);

  return (
    <div className="space-y-6">
      <NFTMintEstimationStep
        networkSource="solana"
        selectedSolanaNFTs={selectedNFTs}
        mintCosts={mintCosts}
        onMintCostsCalculated={setMintCosts}
      />

      {/* Approval Status Info */}
      {mintCosts && requiredApprovalAmount && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Cycles Approval Required</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p>
              <strong>Base mint cost:</strong> {mintCosts.toString()} cycles
            </p>
            <p>
              <strong>With 20% buffer:</strong> {requiredApprovalAmount.toString()} cycles
            </p>
            {allowanceInfo && (
              <>
                <p>
                  <strong>Current allowance:</strong> {allowanceInfo.allowance.toString()} cycles
                </p>
                <p className={allowanceInfo.isSufficient ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}>
                  {allowanceInfo.isSufficient ? '✅ Sufficient allowance' : '❌ Insufficient - please approve in next step'}
                </p>
              </>
            )}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            💡 The approval will be requested automatically in Step 5 (Bridge Execution) if not already approved.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!canisterAddress || !mintCosts || isLoadingAllowance}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Continue to bridge - approval will be handled in next step if needed"
        >
          {isLoadingAllowance ? 'Checking approval...' : 'Continue to Bridge Execution'}
        </button>
      </div>
      
      {(!canisterAddress || !mintCosts) && (
        <p className="text-sm text-amber-600 text-center">
          ⚠️ {!canisterAddress ? 'Please create or wait for canister to be detected' : 'Calculating mint costs...'}
        </p>
      )}
    </div>
  );
}

export function SolanaImportWizard({
  onComplete,
  onCancel,
  mode = 'inline',
}: SolanaImportWizardProps) {
  const { cluster } = useSolana(); // Get actual cluster from wallet connection
  const [currentStep, setCurrentStep] = useState<number>(1);
  // Initialize with actual wallet cluster instead of defaulting to devnet
  const [selectedTargetCluster, setSelectedTargetCluster] = useState<SolanaCluster>(cluster);
  const [selectedCollection, setSelectedCollection] = useState<SelectedSolanaCollection | null>(null);
  const [selectedNFTs, setSelectedNFTs] = useState<SelectedSolanaNFT[]>([]);
  const [canisterCosts, setCanisterCosts] = useState<bigint | null>(null);
  const [mintCosts, setMintCosts] = useState<bigint | null>(null);
  const [canisterAddress, setCanisterAddress] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // Update target cluster when wallet cluster changes
  useEffect(() => {
    setSelectedTargetCluster(cluster);
  }, [cluster]);

  // Debug: Log when collection changes
  console.log('[SolanaImportWizard] State:', {
    currentStep,
    hasSelectedCollection: !!selectedCollection,
    selectedCollectionAddress: selectedCollection?.collection.address,
    selectedCollectionNFTCount: selectedCollection?.collection.nfts?.length,
  });

  const steps = [
    { number: 1, name: 'Connect', description: 'Connect your Solana wallet' },
    { number: 2, name: 'Select NFTs', description: 'Choose collection and NFTs' },
    { number: 3, name: 'Create Canister', description: 'Set up ckNFT canister' },
    { number: 4, name: 'Estimate Costs', description: 'Check minting fees' },
    { number: 5, name: 'Bridge', description: 'Execute the bridge transfer' },
    { number: 6, name: 'Complete', description: 'View your bridged NFTs' },
  ];

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const containerClass = mode === 'modal'
    ? 'bg-white rounded-lg'
    : 'bg-white shadow-xl rounded-lg';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Import Solana NFTs</h2>
            <p className="text-gray-600 mt-1">Bridge your Solana NFTs to Internet Computer</p>
          </div>
          {onCancel && (
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress Steps */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      currentStep === step.number
                        ? 'bg-purple-600 text-white'
                        : currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-medium ${
                      currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 ${
                    currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 py-6">
        {/* Step 1: Connect Wallet */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <SolanaConnectionStep
              selectedTargetCluster={selectedTargetCluster}
              onTargetClusterChange={setSelectedTargetCluster}
            />

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Continue to NFT Selection
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Collection and NFTs */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Collection Selection */}
            <SolanaCollectionSelectionStep
              selectedCollection={selectedCollection}
              onCollectionChange={setSelectedCollection}
              refreshTrigger={refreshTrigger}
            />

            {/* NFT Selection - only show after collection is selected */}
            {selectedCollection && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <SolanaNFTSelectionStep
                  selectedCollection={selectedCollection}
                  selectedNFTs={selectedNFTs}
                  onSelectionChange={setSelectedNFTs}
                  mode="import"
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <button
                onClick={() => {
                  setCurrentStep(1);
                  // Refresh NFT list when going back in case they transferred NFTs
                  setRefreshTrigger(prev => prev + 1);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!selectedCollection || selectedNFTs.length === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue to Canister Creation
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Create Canister */}
        {currentStep === 3 && selectedCollection && (
          <div className="space-y-6">
            <SolanaCanisterCostStep
              selectedCollection={selectedCollection}
              costs={canisterCosts}
              onCostsCalculated={setCanisterCosts}
              onCanisterCreated={(canisterId) => {
                console.log('[SolanaImportWizard] Canister created/found:', canisterId);
                setCanisterAddress(canisterId);
              }}
            />

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Continue to Cost Estimation
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Estimate Minting Costs */}
        {currentStep === 4 && <Step4MintEstimation
          selectedNFTs={selectedNFTs}
          mintCosts={mintCosts}
          setMintCosts={setMintCosts}
          canisterAddress={canisterAddress}
          onBack={() => setCurrentStep(3)}
          onContinue={() => setCurrentStep(5)}
        />}

        {/* Step 5: Bridge Execution */}
        {currentStep === 5 && canisterAddress && mintCosts && (
          <div className="space-y-6">
            <SolanaBridgeExecutionStep
              selectedNFTs={selectedNFTs}
              canisterAddress={canisterAddress}
              mintCosts={mintCosts}
              targetCluster={selectedTargetCluster}
              onComplete={(result) => {
                console.log('Bridge complete:', result);
                // Save the canister address from the bridge result
                if (result.canisterAddress) {
                  setCanisterAddress(result.canisterAddress);
                }
                // Refresh NFT list since NFTs were transferred out of wallet
                setRefreshTrigger(prev => prev + 1);
                setCurrentStep(6);
                if (onComplete) {
                  onComplete({
                    success: result.success,
                    solanaTransactionHash: result.solanaSignatures[0],
                    canisterAddress: result.canisterAddress,
                  });
                }
              }}
              onError={(error) => {
                console.error('Bridge error:', error);
                if (onComplete) {
                  onComplete({
                    success: false,
                    error: error.message,
                  });
                }
              }}
            />

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Complete */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="p-8 bg-green-50 border-2 border-green-200 rounded-lg text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Bridge Complete!
              </h3>
              <p className="text-green-700">
                Your Solana NFTs have been successfully bridged to the Internet Computer
              </p>
              <div className="mt-4 space-y-1 text-sm text-green-600">
                <p>{selectedNFTs.length} NFT{selectedNFTs.length !== 1 ? 's' : ''} bridged</p>
                {canisterAddress && (
                  <p>Canister: {canisterAddress}</p>
                )}
              </div>
            </div>

            {/* Info about updated NFT list */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Note:</strong> Your NFT list has been automatically refreshed. 
                The bridged NFTs are no longer in your Solana wallet and won't appear when you start a new bridge.
              </p>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <button
                onClick={() => {
                  // Reset wizard and refresh NFT list
                  setCurrentStep(1);
                  setSelectedCollection(null);
                  setSelectedNFTs([]);
                  setCanisterCosts(null);
                  setMintCosts(null);
                  setCanisterAddress(null);
                  setRefreshTrigger(prev => prev + 1);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Start New Bridge
              </button>
              <button
                onClick={() => {
                  if (onComplete) {
                    onComplete({
                      success: true,
                      canisterAddress: canisterAddress || undefined,
                    });
                  }
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
