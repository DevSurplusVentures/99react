import type { Meta, StoryObj } from '@storybook/react';
import { BridgeChecklist } from '../../components/BridgeChecklist';
import type { BridgeProgress, BridgeStep, BridgeStage, BridgeDirection } from '../../lib/bridgeProgress';
import { createBridgeProgress, updateBridgeStep } from '../../lib/bridgeProgress';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import '@nfid/identitykit/react/styles.css';

// Create a query client that doesn't retry
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Providers that suppress network calls
const withStoryProviders = (Story: any) => (
  <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
    <AgentProvider network="local">
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-50 p-4">
          <Story />
        </div>
      </QueryClientProvider>
    </AgentProvider>
  </IdentityKitProvider>
);

// Helper function to create mock progress states
const createMockProgress = (
  direction: BridgeDirection,
  overrides: Partial<BridgeProgress> = {}
): BridgeProgress => {
  const baseSteps: Omit<BridgeStep, 'status'>[] = direction === 'evm-to-ic' ? [
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
      description: 'Connect your Ethereum wallet (MetaMask, WalletConnect, etc.)',
      estimatedDuration: 20,
      retryable: true,
      stage: 'setup',
    },
    {
      id: 'select-nfts',
      title: 'Select NFTs',
      description: 'Choose which NFTs to bridge from your collection',
      estimatedDuration: 30,
      retryable: false,
      stage: 'setup',
    },
    {
      id: 'verify-ownership',
      title: 'Verify EVM Ownership',
      description: 'Confirming you own the selected NFTs on the source chain',
      estimatedDuration: 15,
      retryable: true,
      stage: 'setup',
    },
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
      description: 'Estimating cycles needed for canister operations',
      estimatedDuration: 5,
      retryable: true,
      stage: 'canister',
    },
    {
      id: 'approve-transfer',
      title: 'Approve NFT Transfer',
      description: 'Approve the bridge contract to transfer your NFT',
      estimatedDuration: 30,
      retryable: true,
      stage: 'transfer',
    },
    {
      id: 'transfer-nft',
      title: 'Transfer NFT',
      description: 'Transfer NFT to bridge contract on source chain',
      estimatedDuration: 60,
      retryable: true,
      stage: 'transfer',
    },
    {
      id: 'mint-cknft',
      title: 'Mint ckNFT',
      description: 'Mint equivalent NFT on Internet Computer',
      estimatedDuration: 45,
      retryable: true,
      stage: 'mint',
    },
    {
      id: 'verify-mint',
      title: 'Verify Mint',
      description: 'Confirming ckNFT was successfully minted',
      estimatedDuration: 10,
      retryable: true,
      stage: 'mint',
    },
  ] : [
    {
      id: 'connect-ic-wallet',
      title: 'Connect IC Wallet',
      description: 'Connect your Internet Computer wallet to access ckNFTs',
      estimatedDuration: 15,
      retryable: true,
      stage: 'setup',
    },
    {
      id: 'connect-evm-wallet',
      title: 'Connect EVM Wallet',
      description: 'Connect destination EVM wallet for receiving NFTs',
      estimatedDuration: 20,
      retryable: true,
      stage: 'setup',
    },
    {
      id: 'select-cknfts',
      title: 'Select ckNFTs',
      description: 'Choose which ckNFTs to cast back to EVM',
      estimatedDuration: 30,
      retryable: false,
      stage: 'setup',
    },
    {
      id: 'calculate-burn-cost',
      title: 'Calculate Burn Cost',
      description: 'Calculating gas costs for destination chain operations',
      estimatedDuration: 15,
      retryable: true,
      stage: 'burn',
    },
    {
      id: 'approve-burn-payment',
      title: 'Approve Burn Payment',
      description: 'Approve payment for gas costs and bridge fees',
      estimatedDuration: 30,
      retryable: true,
      stage: 'burn',
    },
    {
      id: 'burn-cknft',
      title: 'Burn ckNFT',
      description: 'Burn ckNFT on Internet Computer',
      estimatedDuration: 45,
      retryable: true,
      stage: 'burn',
    },
    {
      id: 'deploy-contract',
      title: 'Deploy EVM Contract',
      description: 'Deploy NFT contract on destination EVM chain',
      estimatedDuration: 90,
      retryable: true,
      stage: 'cast',
    },
    {
      id: 'mint-evm-nft',
      title: 'Mint EVM NFT',
      description: 'Mint NFT on destination EVM chain',
      estimatedDuration: 60,
      retryable: true,
      stage: 'cast',
    },
    {
      id: 'verify-cast',
      title: 'Verify Cast',
      description: 'Confirming NFT was successfully cast to EVM',
      estimatedDuration: 10,
      retryable: true,
      stage: 'cast',
    },
  ];

  const steps: BridgeStep[] = baseSteps.map(step => ({
    ...step,
    status: 'pending' as const,
  }));

  const stages: BridgeStage[] = [
    {
      id: 'setup',
      title: 'Setup & Connection',
      description: 'Connect wallets and configure bridge parameters',
      status: 'pending',
      steps: steps.filter(s => s.stage === 'setup'),
      estimatedDuration: 80,
      isCollapsed: false,
    },
    {
      id: direction === 'evm-to-ic' ? 'canister' : 'burn',
      title: direction === 'evm-to-ic' ? 'Canister Management' : 'Burn Operations',
      description: direction === 'evm-to-ic' 
        ? 'Check and prepare ckNFT canister infrastructure'
        : 'Calculate costs and burn ckNFT tokens',
      status: 'pending',
      steps: steps.filter(s => s.stage === (direction === 'evm-to-ic' ? 'canister' : 'burn')),
      estimatedDuration: direction === 'evm-to-ic' ? 15 : 90,
      isCollapsed: true,
    },
    {
      id: direction === 'evm-to-ic' ? 'transfer' : 'cast',
      title: direction === 'evm-to-ic' ? 'NFT Transfer' : 'EVM Casting',
      description: direction === 'evm-to-ic' 
        ? 'Transfer NFT from EVM to bridge contract'
        : 'Deploy contract and mint NFT on destination EVM chain',
      status: 'pending',
      steps: steps.filter(s => s.stage === (direction === 'evm-to-ic' ? 'transfer' : 'cast')),
      estimatedDuration: direction === 'evm-to-ic' ? 90 : 150,
      isCollapsed: true,
    },
    {
      id: direction === 'evm-to-ic' ? 'mint' : 'verify',
      title: direction === 'evm-to-ic' ? 'IC Minting' : 'Verification',
      description: direction === 'evm-to-ic' 
        ? 'Mint ckNFT on Internet Computer'
        : 'Verify successful casting operation',
      status: 'pending',
      steps: steps.filter(s => s.stage === (direction === 'evm-to-ic' ? 'mint' : 'verify')),
      estimatedDuration: direction === 'evm-to-ic' ? 55 : 10,
      isCollapsed: true,
    },
  ];

  return createBridgeProgress(direction, steps.map(s => ({ ...s, status: 'pending' })), {
    stages,
    ...overrides,
  });
};

const meta: Meta<typeof BridgeChecklist> = {
  title: 'Bridge/BridgeChecklist',
  component: BridgeChecklist,
  decorators: [withStoryProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## BridgeChecklist Component

The BridgeChecklist component provides a comprehensive progress tracking interface for multi-step NFT bridging operations between EVM chains and the Internet Computer.

### Features
- **Multi-Stage Progress**: Organized step progression with collapsible stage groupings
- **Real-Time Status**: Live updates of step status with visual indicators (traffic lights)
- **Error Handling**: Failed step identification with retry functionality
- **Time Estimation**: Duration estimates and actual timing for each step
- **Interactive UI**: Expandable/collapsible stages for better overview
- **Transaction Tracking**: Links to transaction hashes for verification

### Visual Elements
- **Traffic Light System**: Red (failed), Yellow (in progress), Green (completed), Gray (pending)
- **Progress Bar**: Overall completion percentage with color-coded status
- **Stage Grouping**: Logical organization of related steps
- **Step Details**: Individual step status with metadata and timing

### Supported Directions
- **EVM → IC Bridge**: Import NFTs from Ethereum-compatible chains to IC as ckNFTs
- **IC → EVM Cast**: Export ckNFTs back to EVM chains as native NFTs

### User Journey
1. **Setup Phase**: Wallet connections and parameter configuration
2. **Preparation Phase**: Cost calculations and infrastructure checks  
3. **Transfer Phase**: Asset movements and approvals
4. **Completion Phase**: Final minting/casting and verification

### Integration Points
- **Bridge Operations**: Real-time updates from bridging transactions
- **Error Recovery**: Retry mechanisms for failed steps
- **Transaction Monitoring**: Hash tracking and block confirmations
`,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    progress: {
      description: 'Bridge progress state with steps and stages',
      control: { type: 'object' },
    },
    onRetryStep: {
      description: 'Callback to retry a failed step',
      action: 'retry-step',
    },
    onToggleStage: {
      description: 'Callback when stage is expanded/collapsed',
      action: 'toggle-stage',
    },
    className: {
      description: 'Additional CSS classes',
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {
  args: {
    progress: createMockProgress('evm-to-ic'),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state of bridge progress showing all pending steps organized by stages.',
      },
    },
  },
};

export const InProgress: Story = {
  args: {
    progress: (() => {
      let progress = createMockProgress('evm-to-ic');
      progress = updateBridgeStep(progress, 'connect-ic-wallet', 'completed');
      progress = updateBridgeStep(progress, 'connect-evm-wallet', 'completed');
      progress = updateBridgeStep(progress, 'select-nfts', 'loading');
      return progress;
    })(),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Bridge in progress with some steps completed and one currently loading.',
      },
    },
  },
};

export const WithFailures: Story = {
  args: {
    progress: (() => {
      let progress = createMockProgress('evm-to-ic');
      progress = updateBridgeStep(progress, 'connect-ic-wallet', 'completed');
      progress = updateBridgeStep(progress, 'connect-evm-wallet', 'failed', 'User rejected connection request');
      progress = updateBridgeStep(progress, 'select-nfts', 'completed');
      progress = updateBridgeStep(progress, 'verify-ownership', 'failed', 'NFT not found in wallet');
      return progress;
    })(),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Bridge progress with failed steps showing retry buttons and error messages.',
      },
    },
  },
};

export const Completed: Story = {
  args: {
    progress: (() => {
      let progress = createMockProgress('evm-to-ic');
      // Complete all steps
      progress.steps.forEach(step => {
        progress = updateBridgeStep(progress, step.id, 'completed', undefined, '0x1234567890abcdef');
      });
      return progress;
    })(),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Successfully completed bridge operation with all steps showing green status.',
      },
    },
  },
};

export const ICToEVMCast: Story = {
  args: {
    progress: (() => {
      let progress = createMockProgress('ic-to-evm');
      progress = updateBridgeStep(progress, 'connect-ic-wallet', 'completed');
      progress = updateBridgeStep(progress, 'connect-evm-wallet', 'completed');
      progress = updateBridgeStep(progress, 'select-cknfts', 'completed');
      progress = updateBridgeStep(progress, 'calculate-burn-cost', 'loading');
      return progress;
    })(),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'IC to EVM casting operation showing the burn and cast process flow.',
      },
    },
  },
};

export const MidProgressWithRetries: Story = {
  args: {
    progress: (() => {
      let progress = createMockProgress('evm-to-ic');
      progress = updateBridgeStep(progress, 'connect-ic-wallet', 'completed');
      progress = updateBridgeStep(progress, 'connect-evm-wallet', 'completed');
      progress = updateBridgeStep(progress, 'select-nfts', 'completed');
      progress = updateBridgeStep(progress, 'verify-ownership', 'completed');
      progress = updateBridgeStep(progress, 'check-cknft-canister', 'completed');
      progress = updateBridgeStep(progress, 'estimate-canister-cost', 'failed', 'Network timeout', undefined);
      progress = updateBridgeStep(progress, 'approve-transfer', 'failed', 'Transaction reverted', undefined);
      return progress;
    })(),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Mid-progress bridge with multiple retryable failures showing error details.',
      },
    },
  },
};

export const TransactionHashes: Story = {
  args: {
    progress: (() => {
      let progress = createMockProgress('evm-to-ic');
      progress = updateBridgeStep(progress, 'connect-ic-wallet', 'completed');
      progress = updateBridgeStep(progress, 'connect-evm-wallet', 'completed');
      progress = updateBridgeStep(progress, 'select-nfts', 'completed');
      progress = updateBridgeStep(progress, 'verify-ownership', 'completed');
      progress = updateBridgeStep(progress, 'check-cknft-canister', 'completed');
      progress = updateBridgeStep(progress, 'estimate-canister-cost', 'completed');
      progress = updateBridgeStep(progress, 'approve-transfer', 'completed', undefined, '0xabc123def456789');
      progress = updateBridgeStep(progress, 'transfer-nft', 'loading');
      return progress;
    })(),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Bridge progress showing transaction hashes for completed blockchain operations.',
      },
    },
  },
};

export const AllStagesExpanded: Story = {
  args: {
    progress: (() => {
      const progress = createMockProgress('evm-to-ic');
      // Expand all stages
      progress.stages.forEach(stage => {
        stage.isCollapsed = false;
      });
      return progress;
    })(),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Bridge progress with all stages expanded showing detailed step view.',
      },
    },
  },
};

export const AllStagesCollapsed: Story = {
  args: {
    progress: (() => {
      const progress = createMockProgress('evm-to-ic');
      // Collapse all stages
      progress.stages.forEach(stage => {
        stage.isCollapsed = true;
      });
      return progress;
    })(),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact view with all stages collapsed showing only stage-level progress.',
      },
    },
  },
};

export const LongRunningOperation: Story = {
  args: {
    progress: (() => {
      let progress = createMockProgress('ic-to-evm');
      progress = updateBridgeStep(progress, 'connect-ic-wallet', 'completed');
      progress = updateBridgeStep(progress, 'connect-evm-wallet', 'completed');
      progress = updateBridgeStep(progress, 'select-cknfts', 'completed');
      progress = updateBridgeStep(progress, 'calculate-burn-cost', 'completed');
      progress = updateBridgeStep(progress, 'approve-burn-payment', 'completed');
      progress = updateBridgeStep(progress, 'burn-cknft', 'completed');
      progress = updateBridgeStep(progress, 'deploy-contract', 'loading');
      return progress;
    })(),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Long-running contract deployment operation showing extended duration step.',
      },
    },
  },
};

export const MultipleFailuresWithRetry: Story = {
  args: {
    progress: (() => {
      let progress = createMockProgress('evm-to-ic');
      progress = updateBridgeStep(progress, 'connect-ic-wallet', 'failed', 'Connection timeout');
      progress = updateBridgeStep(progress, 'connect-evm-wallet', 'failed', 'MetaMask not installed');
      progress = updateBridgeStep(progress, 'verify-ownership', 'failed', 'Insufficient gas');
      // Mark some as retryable
      progress.steps[0].retryable = true;
      progress.steps[1].retryable = true;
      progress.steps[3].retryable = true;
      return progress;
    })(),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple failed steps with retry options showing comprehensive error handling.',
      },
    },
  },
};

export const Interactive: Story = {
  args: {
    progress: createMockProgress('evm-to-ic'),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo for testing stage toggling and step retry functionality.',
      },
    },
  },
};

// Responsive variants
export const Mobile: Story = {
  args: {
    ...InProgress.args,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized view with responsive layout for smaller screens.',
      },
    },
  },
};

// Edge cases
export const NoStages: Story = {
  args: {
    progress: (() => {
      const progress = createMockProgress('evm-to-ic');
      progress.stages = [];
      return progress;
    })(),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Edge case with no stages defined, showing fallback behavior.',
      },
    },
  },
};

export const SingleStage: Story = {
  args: {
    progress: (() => {
      const progress = createMockProgress('evm-to-ic');
      progress.stages = [progress.stages[0]]; // Keep only first stage
      progress.steps = progress.stages[0].steps;
      return progress;
    })(),
    onRetryStep: () => {},
    onToggleStage: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple bridge operation with only one stage and minimal steps.',
      },
    },
  },
};