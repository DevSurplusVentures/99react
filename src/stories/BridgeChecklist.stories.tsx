import type { Meta, StoryObj } from '@storybook/react';
import { BridgeChecklist } from '../components/BridgeChecklist';
import { 
  createBridgeProgress, 
  updateBridgeStep,
  BridgeProgress 
} from '../lib/bridgeProgress';

const meta = {
  title: 'Bridge/BridgeChecklist',
  component: BridgeChecklist,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A compact, traffic light-style bridge progress component with collapsible stages. Perfect for complex multi-step operations with grouped stages and simplified overview.',
      },
    },
  },
  argTypes: {
    onRetryStep: {
      action: 'retry-step',
      description: 'Callback when a failed step should be retried',
    },
    onToggleStage: {
      action: 'toggle-stage',
      description: 'Callback when a stage is toggled',
    },
  },
} satisfies Meta<typeof BridgeChecklist>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper function to create progress with specific stage states
function createProgressWithStageState(
  direction: 'evm-to-ic' | 'ic-to-evm',
  completedStages: number,
  currentStageProgress: number = 0,
  hasErrors = false
): BridgeProgress {
  let progress = createBridgeProgress(direction);
  
  // Complete specified number of full stages
  for (let stageIndex = 0; stageIndex < Math.min(completedStages, progress.stages.length); stageIndex++) {
    const stage = progress.stages[stageIndex];
    for (const step of stage.steps) {
      progress = updateBridgeStep(progress, step.id, {
        status: 'completed',
        txHash: step.id.includes('approve') || step.id.includes('transfer') ? 
          '0x' + Math.random().toString(16).substring(2, 66) : undefined,
      });
    }
  }
  
  // Add progress to current stage
  if (completedStages < progress.stages.length) {
    const currentStage = progress.stages[completedStages];
    const stepsToProgress = Math.min(currentStageProgress, currentStage.steps.length);
    
    for (let i = 0; i < stepsToProgress; i++) {
      const step = currentStage.steps[i];
      let status: 'completed' | 'failed' | 'loading' = 'completed';
      let error: string | undefined;
      
      // Add realistic errors
      if (hasErrors && i === stepsToProgress - 1) {
        status = 'failed';
        if (step.id.includes('cycles')) {
          error = 'Insufficient cycles balance. Need 1T cycles but only have 500G.';
        } else if (step.id.includes('gas')) {
          error = 'Insufficient ETH for gas fees. Need 0.05 ETH but only have 0.01 ETH.';
        } else if (step.id.includes('approve')) {
          error = 'User rejected transaction in wallet.';
        } else {
          error = 'Network timeout. Please try again.';
        }
      } else if (i === stepsToProgress - 1 && !hasErrors) {
        status = 'loading';
      }
      
      progress = updateBridgeStep(progress, step.id, {
        status,
        error,
        txHash: status === 'completed' && (step.id.includes('approve') || step.id.includes('transfer')) ? 
          '0x' + Math.random().toString(16).substring(2, 66) : undefined,
      });
    }
  }
  
  return progress;
}

// EVM → IC Stories

export const EVMToIC_Initial: Story = {
  args: {
    progress: createBridgeProgress('evm-to-ic'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state - all stages collapsed, ready to start setup.',
      },
    },
  },
};

export const EVMToIC_SetupInProgress: Story = {
  args: {
    progress: createProgressWithStageState('evm-to-ic', 0, 2),
  },
  parameters: {
    docs: {
      description: {
        story: 'Setup stage in progress - wallets are connected, entering NFT details.',
      },
    },
  },
};

export const EVMToIC_SetupComplete: Story = {
  args: {
    progress: createProgressWithStageState('evm-to-ic', 1, 0),
  },
  parameters: {
    docs: {
      description: {
        story: 'Setup complete (green light), moving to canister management stage.',
      },
    },
  },
};

export const EVMToIC_CanisterError: Story = {
  args: {
    progress: createProgressWithStageState('evm-to-ic', 1, 3, true),
  },
  parameters: {
    docs: {
      description: {
        story: 'Error in canister stage (red light) - insufficient cycles balance.',
      },
    },
  },
};

export const EVMToIC_PreparationInProgress: Story = {
  args: {
    progress: createProgressWithStageState('evm-to-ic', 2, 2),
  },
  parameters: {
    docs: {
      description: {
        story: 'Preparation stage active (yellow light) - approving NFT transfers.',
      },
    },
  },
};

export const EVMToIC_ExecutionPhase: Story = {
  args: {
    progress: createProgressWithStageState('evm-to-ic', 3, 3),
  },
  parameters: {
    docs: {
      description: {
        story: 'Final execution phase - bridging NFT from EVM to IC.',
      },
    },
  },
};

export const EVMToIC_Completed: Story = {
  args: {
    progress: createProgressWithStageState('evm-to-ic', 4, 0),
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete EVM to IC bridge - all stages green, all collapsed.',
      },
    },
  },
};

// IC → EVM Stories

export const ICToEVM_Initial: Story = {
  args: {
    progress: createBridgeProgress('ic-to-evm'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial IC to EVM cast state.',
      },
    },
  },
};

export const ICToEVM_ContractDeployment: Story = {
  args: {
    progress: createProgressWithStageState('ic-to-evm', 1, 5),
  },
  parameters: {
    docs: {
      description: {
        story: 'Contract management stage - deploying EVM contract.',
      },
    },
  },
};

export const ICToEVM_FundingError: Story = {
  args: {
    progress: createProgressWithStageState('ic-to-evm', 1, 4, true),
  },
  parameters: {
    docs: {
      description: {
        story: 'Gas funding error - need more ETH for deployment.',
      },
    },
  },
};

export const ICToEVM_ConsensusWait: Story = {
  args: {
    progress: (() => {
      let progress = createProgressWithStageState('ic-to-evm', 3, 2);
      // Add consensus metadata
      progress = updateBridgeStep(progress, 'wait-for-consensus', {
        status: 'loading',
        metadata: { 
          consensusNodes: 8,
          requiredNodes: 13,
          estimatedWaitTime: '4-6 minutes'
        },
      });
      return progress;
    })(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Waiting for cross-chain consensus - the longest step.',
      },
    },
  },
};

export const ICToEVM_Completed: Story = {
  args: {
    progress: createProgressWithStageState('ic-to-evm', 4, 0),
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete IC to EVM cast - all stages completed.',
      },
    },
  },
};

// Error and Edge Cases

export const MultipleStageErrors: Story = {
  args: {
    progress: (() => {
      let progress = createBridgeProgress('evm-to-ic');
      
      // Complete setup stage
      const setupSteps = progress.stages[0].steps;
      for (const step of setupSteps) {
        progress = updateBridgeStep(progress, step.id, { status: 'completed' });
      }
      
      // Fail in canister stage
      progress = updateBridgeStep(progress, 'approve-cycles-orchestrator', {
        status: 'failed',
        error: 'Transaction timeout. Please try again.',
      });
      
      // Complete some canister steps
      progress = updateBridgeStep(progress, 'check-cknft-canister', { status: 'completed' });
      progress = updateBridgeStep(progress, 'create-cknft-canister', { status: 'completed' });
      
      // Fail in preparation stage
      progress = updateBridgeStep(progress, 'approve-nft-transfer', {
        status: 'failed',
        error: 'User rejected transaction in MetaMask.',
      });
      
      return progress;
    })(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple stage errors - shows red lights and expandable error details.',
      },
    },
  },
};

export const MixedStageStates: Story = {
  args: {
    progress: (() => {
      let progress = createBridgeProgress('ic-to-evm');
      
      // Complete setup (green)
      const setupSteps = progress.stages[0].steps;
      for (const step of setupSteps) {
        progress = updateBridgeStep(progress, step.id, { status: 'completed' });
      }
      
      // Partial contract stage with error (red)
      progress = updateBridgeStep(progress, 'check-remote-contract', { status: 'completed' });
      progress = updateBridgeStep(progress, 'fund-gas-account', {
        status: 'failed',
        error: 'Insufficient ETH balance.',
      });
      
      // Skip some prep steps
      progress = updateBridgeStep(progress, 'approve-cycles-cast', { status: 'skipped' });
      
      return progress;
    })(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Mixed stage states - completed, failed, and skipped steps.',
      },
    },
  },
};

// Interactive Stories

export const InteractiveDemo: Story = {
  args: {
    progress: createProgressWithStageState('evm-to-ic', 1, 2, true),
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo - click stages to expand/collapse, retry failed steps.',
      },
    },
  },
};

export const MobileCompact: Story = {
  args: {
    progress: createProgressWithStageState('ic-to-evm', 2, 3),
    className: 'max-w-sm',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized compact view.',
      },
    },
  },
};

// Performance Test Story
export const LargeDataset: Story = {
  args: {
    progress: (() => {
      let progress = createBridgeProgress('evm-to-ic');
      
      // Simulate a complex bridge with lots of metadata
      for (let i = 0; i < 10; i++) {
        const step = progress.steps[i];
        if (step) {
          progress = updateBridgeStep(progress, step.id, {
            status: i < 7 ? 'completed' : i === 7 ? 'loading' : 'pending',
            txHash: i < 7 ? '0x' + Math.random().toString(16).substring(2, 66) : undefined,
            metadata: {
              timestamp: Date.now() - (10 - i) * 60000,
              gasUsed: Math.floor(Math.random() * 100000),
              blockNumber: 18000000 + i,
            },
          });
        }
      }
      
      return progress;
    })(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with rich metadata and transaction details.',
      },
    },
  },
};
