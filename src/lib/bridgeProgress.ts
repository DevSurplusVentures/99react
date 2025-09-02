/**
 * Universal progress tracking system for multi-step bridging operations
 * Provides type-safe progress tracking for EVM ↔ IC NFT bridging
 */

export type BridgeStepStatus = 'pending' | 'loading' | 'completed' | 'failed' | 'skipped';

export type BridgeStep = {
  id: string;
  title: string;
  description: string;
  status: BridgeStepStatus;
  error?: string;
  txHash?: string;
  estimatedDuration?: number; // in seconds
  startTime?: number;
  endTime?: number;
  retryable?: boolean;
  metadata?: Record<string, any>;
  stage: string; // Stage grouping
};

export type BridgeStageStatus = 'pending' | 'loading' | 'completed' | 'failed' | 'warning';

export type BridgeStage = {
  id: string;
  title: string;
  description: string;
  status: BridgeStageStatus;
  steps: BridgeStep[];
  estimatedDuration: number;
  isCollapsed?: boolean;
};

export type BridgeDirection = 'evm-to-ic' | 'ic-to-evm';

export type BridgeProgress = {
  id: string;
  direction: BridgeDirection;
  steps: BridgeStep[];
  stages: BridgeStage[]; // Staged view
  currentStep: number;
  isComplete: boolean;
  totalSteps: number;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  metadata?: Record<string, any>;
};

// Predefined step templates for common bridging operations

export const EVMToICSteps: Omit<BridgeStep, 'status'>[] = [
  // Stage 1: Setup & Connection
  {
    id: 'connect-ic-wallet',
    title: 'Connect IC Wallet',
    description: 'Connect your Internet Computer wallet (Internet Identity, NFID, Plug, etc.)',
    estimatedDuration: 15,
    retryable: true,
    stage: 'setup',
  },
  {
    id: 'connect-evm-wallet',
    title: 'Connect EVM Wallet',
    description: 'Connect your Ethereum wallet (MetaMask, WalletConnect, etc.) and switch to correct network',
    estimatedDuration: 20,
    retryable: true,
    stage: 'setup',
  },
  {
    id: 'input-nft-details',
    title: 'Specify NFT Details',
    description: 'Enter the contract address, token ID, and select source chain',
    estimatedDuration: 30,
    retryable: false,
    stage: 'setup',
  },
  {
    id: 'verify-ownership',
    title: 'Verify EVM Ownership',
    description: 'Confirming you own the NFT on the source EVM chain',
    estimatedDuration: 15,
    retryable: true,
    stage: 'setup',
  },

  // Stage 2: Canister Management
  {
    id: 'check-cknft-canister',
    title: 'Check ckNFT Canister',
    description: 'Checking if a ckNFT canister exists for this contract',
    estimatedDuration: 10,
    retryable: true,
    stage: 'canister',
  },
  {
    id: 'estimate-canister-cost',
    title: 'Calculate Canister Cost',
    description: 'Estimating cycles needed to create new ckNFT canister (if needed)',
    estimatedDuration: 5,
    retryable: true,
    stage: 'canister',
  },
  {
    id: 'check-balances',
    title: 'Check Balances',
    description: 'Verifying ICP and cycles balances for canister creation and minting',
    estimatedDuration: 10,
    retryable: true,
    stage: 'canister',
  },
  {
    id: 'approve-cycles-orchestrator',
    title: 'Approve Cycles (Orchestrator)',
    description: 'Approve cycles ledger to spend cycles for orchestrator operations',
    estimatedDuration: 30,
    retryable: true,
    stage: 'canister',
  },
  {
    id: 'create-cknft-canister',
    title: 'Create ckNFT Canister',
    description: 'Deploying new ckNFT canister on Internet Computer (if needed)',
    estimatedDuration: 90,
    retryable: true,
    stage: 'canister',
  },

  // Stage 3: Preparation
  {
    id: 'estimate-mint-cost',
    title: 'Calculate Mint Cost',
    description: 'Estimating cycles needed for minting process',
    estimatedDuration: 5,
    retryable: true,
    stage: 'preparation',
  },
  {
    id: 'approve-cycles-mint',
    title: 'Approve Cycles (Mint)',
    description: 'Approve cycles for the minting operation',
    estimatedDuration: 30,
    retryable: true,
    stage: 'preparation',
  },
  {
    id: 'get-approval-address',
    title: 'Get Approval Address',
    description: 'Getting the bridge contract address for NFT approval',
    estimatedDuration: 10,
    retryable: true,
    stage: 'preparation',
  },
  {
    id: 'approve-nft-transfer',
    title: 'Approve NFT Transfer',
    description: 'Approve the bridge to transfer your NFT (EVM transaction)',
    estimatedDuration: 60,
    retryable: true,
    stage: 'preparation',
  },

  // Stage 4: Bridge Execution
  {
    id: 'initiate-mint',
    title: 'Initiate Mint',
    description: 'Starting the cross-chain minting process',
    estimatedDuration: 30,
    retryable: true,
    stage: 'execution',
  },
  {
    id: 'verify-ownership-remotely',
    title: 'Verify Remote Ownership',
    description: 'Bridge verifying NFT ownership on source chain',
    estimatedDuration: 45,
    retryable: true,
    stage: 'execution',
  },
  {
    id: 'fetch-metadata',
    title: 'Retrieve Metadata',
    description: 'Fetching NFT metadata from source chain',
    estimatedDuration: 30,
    retryable: true,
    stage: 'execution',
  },
  {
    id: 'transfer-nft-to-bridge',
    title: 'Transfer to Bridge',
    description: 'Bridge contract receiving NFT from source chain',
    estimatedDuration: 120,
    retryable: false,
    stage: 'execution',
  },
  {
    id: 'mint-cknft',
    title: 'Mint ckNFT',
    description: 'Minting your NFT on the Internet Computer',
    estimatedDuration: 60,
    retryable: true,
    stage: 'execution',
  },
  {
    id: 'verify-mint-complete',
    title: 'Verify Completion',
    description: 'Confirming your ckNFT was successfully minted and is in your wallet',
    estimatedDuration: 15,
    retryable: true,
    stage: 'execution',
  },
];

export const ICToEVMSteps: Omit<BridgeStep, 'status'>[] = [
  // Stage 1: Setup & Connection
  {
    id: 'connect-ic-wallet',
    title: 'Connect IC Wallet',
    description: 'Connect your Internet Computer wallet containing the ckNFT',
    estimatedDuration: 15,
    retryable: true,
    stage: 'setup',
  },
  {
    id: 'select-cknft',
    title: 'Select ckNFT',
    description: 'Choose which ckNFT you want to bridge to EVM',
    estimatedDuration: 20,
    retryable: false,
    stage: 'setup',
  },
  {
    id: 'select-target-network',
    title: 'Select Target Network',
    description: 'Choose which EVM network to deploy your NFT contract to',
    estimatedDuration: 15,
    retryable: false,
    stage: 'setup',
  },
  {
    id: 'connect-evm-wallet',
    title: 'Connect EVM Wallet',
    description: 'Connect your target EVM wallet for receiving NFTs',
    estimatedDuration: 20,
    retryable: true,
    stage: 'setup',
  },

  // Stage 2: Contract Management
  {
    id: 'check-remote-contract',
    title: 'Check Remote Contract',
    description: 'Checking if NFT contract already exists on target EVM chain',
    estimatedDuration: 10,
    retryable: true,
    stage: 'contract',
  },
  {
    id: 'estimate-gas-costs',
    title: 'Calculate Gas Costs',
    description: 'Estimating gas fees for contract deployment and minting',
    estimatedDuration: 15,
    retryable: true,
    stage: 'contract',
  },
  {
    id: 'get-funding-address',
    title: 'Get Funding Address',
    description: 'Getting the bridge funding address for gas payments',
    estimatedDuration: 10,
    retryable: true,
    stage: 'contract',
  },
  {
    id: 'fund-gas-account',
    title: 'Fund Gas Account',
    description: 'Send ETH to bridge funding address for gas fees',
    estimatedDuration: 90,
    retryable: true,
    stage: 'contract',
  },
  {
    id: 'approve-cycles-remote',
    title: 'Approve Cycles (Remote)',
    description: 'Approve cycles for remote contract deployment',
    estimatedDuration: 30,
    retryable: true,
    stage: 'contract',
  },
  {
    id: 'deploy-evm-contract',
    title: 'Deploy EVM Contract',
    description: 'Deploying NFT contract on target EVM network',
    estimatedDuration: 180,
    retryable: true,
    stage: 'contract',
  },
  {
    id: 'verify-contract-deployment',
    title: 'Verify Contract',
    description: 'Confirming contract was successfully deployed',
    estimatedDuration: 30,
    retryable: true,
    stage: 'contract',
  },

  // Stage 3: Preparation
  {
    id: 'estimate-cast-costs',
    title: 'Calculate Cast Costs',
    description: 'Estimating cycles and gas needed for casting operation',
    estimatedDuration: 10,
    retryable: true,
    stage: 'preparation',
  },
  {
    id: 'approve-cycles-cast',
    title: 'Approve Cycles (Cast)',
    description: 'Approve cycles for the casting operation',
    estimatedDuration: 30,
    retryable: true,
    stage: 'preparation',
  },
  {
    id: 'approve-cknft-transfer',
    title: 'Approve ckNFT Transfer',
    description: 'Approve the bridge to transfer your ckNFT',
    estimatedDuration: 30,
    retryable: true,
    stage: 'preparation',
  },

  // Stage 4: Cast Execution
  {
    id: 'initiate-cast',
    title: 'Initiate Cast',
    description: 'Starting the cross-chain casting process',
    estimatedDuration: 45,
    retryable: true,
    stage: 'execution',
  },
  {
    id: 'burn-cknft',
    title: 'Burn ckNFT',
    description: 'Burning ckNFT on Internet Computer to release for EVM minting',
    estimatedDuration: 60,
    retryable: false,
    stage: 'execution',
  },
  {
    id: 'wait-for-consensus',
    title: 'Wait for Consensus',
    description: 'Waiting for cross-chain consensus and verification',
    estimatedDuration: 300,
    retryable: false,
    stage: 'execution',
  },
  {
    id: 'mint-on-evm',
    title: 'Mint on EVM',
    description: 'Minting your NFT on the target EVM chain',
    estimatedDuration: 120,
    retryable: true,
    stage: 'execution',
  },
  {
    id: 'verify-evm-ownership',
    title: 'Verify EVM Ownership',
    description: 'Confirming NFT was minted to your EVM wallet',
    estimatedDuration: 30,
    retryable: true,
    stage: 'execution',
  },
  {
    id: 'cast-complete',
    title: 'Cast Complete',
    description: 'Bridge operation completed successfully',
    estimatedDuration: 5,
    retryable: false,
    stage: 'execution',
  },
];

// Stage definitions for EVM to IC flow
export const EVMToICStageTemplates = [
  {
    id: 'setup',
    title: '🔌 Setup & Connection',
    description: 'Connect wallets and verify NFT ownership',
  },
  {
    id: 'canister',
    title: '🏭 Canister Management',
    description: 'Create or check ckNFT canister on IC',
  },
  {
    id: 'preparation',
    title: '⚙️ Preparation',
    description: 'Approve cycles and NFT transfers',
  },
  {
    id: 'execution',
    title: '🚀 Bridge Execution',
    description: 'Execute cross-chain bridging',
  },
];

// Stage definitions for IC to EVM flow
export const ICToEVMStageTemplates = [
  {
    id: 'setup',
    title: '🔌 Setup & Connection',
    description: 'Connect wallets and select ckNFT',
  },
  {
    id: 'contract',
    title: '📜 Contract Management',
    description: 'Deploy or check EVM contract',
  },
  {
    id: 'preparation',
    title: '⚙️ Preparation',
    description: 'Approve cycles and ckNFT transfers',
  },
  {
    id: 'execution',
    title: '🚀 Cast Execution',
    description: 'Execute cross-chain casting',
  },
];

/**
 * Toggle a stage's collapsed state
 */
export function toggleStageCollapsed(
  progress: BridgeProgress,
  stageId: string
): BridgeProgress {
  const updatedStages = progress.stages.map(stage => 
    stage.id === stageId 
      ? { ...stage, isCollapsed: !stage.isCollapsed }
      : stage
  );

  return {
    ...progress,
    stages: updatedStages,
  };
}

/**
 * Get the current active stage (first non-completed stage)
 */
export function getCurrentStage(progress: BridgeProgress): BridgeStage | null {
  return progress.stages.find(stage => 
    stage.status !== 'completed'
  ) || null;
}

/**
 * Get traffic light status for stages (red/yellow/green)
 */
export function getStageTrafficLight(stage: BridgeStage): 'red' | 'yellow' | 'green' | 'gray' {
  switch (stage.status) {
    case 'failed':
      return 'red';
    case 'loading':
      return 'yellow';
    case 'completed':
      return 'green';
    default:
      return 'gray';
  }
}

/**
 * Validate bridge progress structure and data integrity
 */
function createStagesFromSteps(steps: BridgeStep[], direction: BridgeDirection): BridgeStage[] {
  const stageTemplates = direction === 'evm-to-ic' ? EVMToICStageTemplates : ICToEVMStageTemplates;
  
  return stageTemplates.map(template => {
    const stageSteps = steps.filter(step => step.stage === template.id);
    const estimatedDuration = stageSteps.reduce((sum, step) => sum + (step.estimatedDuration || 0), 0);
    
    // Calculate stage status
    let status: BridgeStageStatus = 'pending';
    if (stageSteps.length > 0) {
      const completedCount = stageSteps.filter(s => s.status === 'completed').length;
      const failedCount = stageSteps.filter(s => s.status === 'failed').length;
      const loadingCount = stageSteps.filter(s => s.status === 'loading').length;
      
      if (failedCount > 0) {
        status = 'failed';
      } else if (completedCount === stageSteps.length) {
        status = 'completed';
      } else if (loadingCount > 0 || completedCount > 0) {
        status = 'loading';
      }
    }
    
    return {
      id: template.id,
      title: template.title,
      description: template.description,
      status,
      steps: stageSteps,
      estimatedDuration,
      isCollapsed: status === 'completed', // Auto-collapse completed stages
    };
  });
}

/**
 * Create a new bridge progress tracker
 */
export function createBridgeProgress(
  direction: BridgeDirection,
  customSteps?: Omit<BridgeStep, 'status'>[],
  metadata?: Record<string, any>
): BridgeProgress {
  const stepTemplates = customSteps || (direction === 'evm-to-ic' ? EVMToICSteps : ICToEVMSteps);
  
  const steps: BridgeStep[] = stepTemplates.map(step => ({
    ...step,
    status: 'pending' as BridgeStepStatus,
  }));

  const stages = createStagesFromSteps(steps, direction);

  return {
    id: `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    direction,
    steps,
    stages,
    currentStep: 0,
    isComplete: false,
    totalSteps: steps.length,
    startTime: Date.now(),
    metadata,
  };
}

/**
 * Update a specific step in the bridge progress
 */
export function updateBridgeStep(
  progress: BridgeProgress,
  stepId: string,
  updates: Partial<Pick<BridgeStep, 'status' | 'error' | 'txHash' | 'metadata' | 'startTime' | 'endTime'>>
): BridgeProgress {
  const stepIndex = progress.steps.findIndex(step => step.id === stepId);
  if (stepIndex === -1) {
    throw new Error(`Step with id "${stepId}" not found`);
  }

  const updatedSteps = [...progress.steps];
  const currentStep = updatedSteps[stepIndex];
  
  // Update timestamps based on status changes
  const now = Date.now();
  let stepUpdates = { ...updates };
  
  if (updates.status === 'loading' && currentStep.status === 'pending') {
    stepUpdates = { ...stepUpdates, startTime: now };
  } else if (
    (updates.status === 'completed' || updates.status === 'failed') && 
    currentStep.startTime
  ) {
    stepUpdates = { ...stepUpdates, endTime: now };
  }

  updatedSteps[stepIndex] = {
    ...currentStep,
    ...stepUpdates,
    metadata: {
      ...currentStep.metadata,
      ...updates.metadata,
    },
  };

  // Update current step index and completion status
  let newCurrentStep = progress.currentStep;
  let isComplete = progress.isComplete;

  if (updates.status === 'completed') {
    // Move to next step if this one is completed
    newCurrentStep = Math.min(stepIndex + 1, progress.totalSteps - 1);
    
    // Check if all steps are completed
    isComplete = updatedSteps.every(step => 
      step.status === 'completed' || step.status === 'skipped'
    );
  } else if (updates.status === 'loading') {
    // Set current step to the loading step
    newCurrentStep = stepIndex;
  }

  const updatedProgress: BridgeProgress = {
    ...progress,
    steps: updatedSteps,
    currentStep: newCurrentStep,
    isComplete,
  };

  // Recalculate stages based on updated steps
  updatedProgress.stages = createStagesFromSteps(updatedSteps, progress.direction);

  // Calculate total duration if complete
  if (isComplete && !progress.endTime) {
    updatedProgress.endTime = now;
    updatedProgress.totalDuration = now - progress.startTime;
  }

  return updatedProgress;
}

/**
 * Skip a step (mark as skipped and move to next)
 */
export function skipBridgeStep(
  progress: BridgeProgress,
  stepId: string,
  reason?: string
): BridgeProgress {
  return updateBridgeStep(progress, stepId, {
    status: 'skipped',
    metadata: { skipReason: reason },
  });
}

/**
 * Retry a failed step (reset to pending)
 */
export function retryBridgeStep(
  progress: BridgeProgress,
  stepId: string
): BridgeProgress {
  const stepIndex = progress.steps.findIndex(step => step.id === stepId);
  if (stepIndex === -1) {
    throw new Error(`Step with id "${stepId}" not found`);
  }

  const step = progress.steps[stepIndex];
  if (!step?.retryable) {
    throw new Error(`Step "${stepId}" is not retryable`);
  }

  const updatedSteps = [...progress.steps];
  updatedSteps[stepIndex] = {
    ...step,
    status: 'pending',
    error: undefined,
    startTime: undefined,
    endTime: undefined,
  };

  return {
    ...progress,
    steps: updatedSteps,
    currentStep: stepIndex,
  };
}

/**
 * Get progress statistics
 */
export function getBridgeStats(progress: BridgeProgress) {
  const completedSteps = progress.steps.filter(s => s.status === 'completed').length;
  const failedSteps = progress.steps.filter(s => s.status === 'failed').length;
  const skippedSteps = progress.steps.filter(s => s.status === 'skipped').length;
  const loadingSteps = progress.steps.filter(s => s.status === 'loading').length;
  
  const progressPercentage = ((completedSteps + skippedSteps) / progress.totalSteps) * 100;
  
  const estimatedTotalDuration = progress.steps.reduce(
    (total, step) => total + (step.estimatedDuration || 0),
    0
  );
  
  const actualDuration = progress.totalDuration || 
    (progress.isComplete ? undefined : Date.now() - progress.startTime);

  return {
    completedSteps,
    failedSteps,
    skippedSteps,
    loadingSteps,
    progressPercentage,
    estimatedTotalDuration,
    actualDuration,
    isStuck: loadingSteps === 0 && failedSteps > 0 && !progress.isComplete,
    currentStepTitle: progress.steps[progress.currentStep]?.title,
    currentStepDescription: progress.steps[progress.currentStep]?.description,
  };
}

/**
 * Get all failed steps that can be retried
 */
export function getRetryableSteps(progress: BridgeProgress): BridgeStep[] {
  return progress.steps.filter(step => 
    step.status === 'failed' && step.retryable !== false
  );
}

/**
 * Create a simple progress update handler
 */
export function createProgressHandler(
  onUpdate: (progress: BridgeProgress) => void
) {
  return {
    startStep: (progress: BridgeProgress, stepId: string) => {
      const updated = updateBridgeStep(progress, stepId, { status: 'loading' });
      onUpdate(updated);
      return updated;
    },
    
    completeStep: (progress: BridgeProgress, stepId: string, txHash?: string) => {
      const updated = updateBridgeStep(progress, stepId, { 
        status: 'completed',
        txHash 
      });
      onUpdate(updated);
      return updated;
    },
    
    failStep: (progress: BridgeProgress, stepId: string, error: string) => {
      const updated = updateBridgeStep(progress, stepId, { 
        status: 'failed',
        error 
      });
      onUpdate(updated);
      return updated;
    },
    
    skipStep: (progress: BridgeProgress, stepId: string, reason?: string) => {
      const updated = skipBridgeStep(progress, stepId, reason);
      onUpdate(updated);
      return updated;
    },
    
    retryStep: (progress: BridgeProgress, stepId: string) => {
      const updated = retryBridgeStep(progress, stepId);
      onUpdate(updated);
      return updated;
    },
  };
}

/**
 * Validate that a bridge progress object is well-formed
 */
export function validateBridgeProgress(progress: BridgeProgress): string[] {
  const errors: string[] = [];
  
  if (!progress.id) {
    errors.push('Progress must have an id');
  }
  
  if (!['evm-to-ic', 'ic-to-evm'].includes(progress.direction)) {
    errors.push('Direction must be either "evm-to-ic" or "ic-to-evm"');
  }
  
  if (progress.steps.length === 0) {
    errors.push('Progress must have at least one step');
  }
  
  if (progress.currentStep < 0 || progress.currentStep >= progress.steps.length) {
    errors.push('Current step index is out of bounds');
  }
  
  if (progress.totalSteps !== progress.steps.length) {
    errors.push('Total steps count does not match actual steps array length');
  }
  
  // Check for duplicate step IDs
  const stepIds = progress.steps.map(s => s.id);
  const uniqueStepIds = new Set(stepIds);
  if (stepIds.length !== uniqueStepIds.size) {
    errors.push('Duplicate step IDs found');
  }
  
  return errors;
}
