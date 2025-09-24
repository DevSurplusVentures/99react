import type { Meta, StoryObj } from '@storybook/react';
import { ICReturnWizard } from '../components/bridge/ICReturnWizard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../provider/AgentProvider';
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

// Error suppression for network calls
if (typeof window !== 'undefined') {
  try {
    // Store original console.error to suppress expected errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      // Suppress specific network errors from stories
      if (args[0]?.includes?.('Cannot POST') || args[0]?.includes?.('404')) {
        return;
      }
      originalError.apply(console, args);
    };
  } catch (e) {
    // Ignore if we can't override console
  }
}

const meta: Meta<typeof ICReturnWizard> = {
  title: 'Bridge/ICReturnWizard',
  component: ICReturnWizard,
  decorators: [withStoryProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# ICReturnWizard

The ICReturnWizard component provides a comprehensive multi-step interface for returning ckNFTs from the Internet Computer back to their original EVM chains. This wizard manages the complete reverse-bridge workflow from IC wallet connection through ckNFT selection, target chain configuration, cost management, and return execution.

## Overview

This wizard implements the IC-to-EVM bridge direction, allowing users to:
- Connect their IC wallet (Internet Identity, NFID, etc.)
- Select ckNFTs from their IC collection to return
- Automatically detect original chain and contract information
- Configure target EVM wallet and verify network settings
- Review return costs including gas fees and burn funding
- Execute the return transaction with comprehensive monitoring
- Receive confirmation when NFTs appear on target EVM chain

## Architecture

The ICReturnWizard features six distinct steps:
1. **Connect**: IC wallet connection and authentication
2. **Select ckNFT**: Browse and select ckNFTs to return
3. **Target Network**: EVM wallet connection and network configuration
4. **Costs**: Review costs and fund burn addresses for gas fees
5. **Return**: Execute return with progress tracking and monitoring
6. **Complete**: Confirmation with transaction details and links

## Key Features

- **Native Chain Detection**: Automatically detects original source chain and contract
- **Multi-step Workflow**: Clear progression through return process
- **Dual Wallet Integration**: Seamless IC and EVM wallet management
- **Smart Validation**: Ensures returns only go to original source contracts
- **Cost Transparency**: Real-time cost calculation with ETH gas estimates
- **Burn Address Funding**: Automated gas funding address management
- **Progress Monitoring**: Live transaction tracking across both chains
- **Error Recovery**: Comprehensive error handling with retry mechanisms
- **Modal Interface**: Full-screen modal with navigation controls

## Native Chain Validation

The wizard includes sophisticated validation to ensure ckNFTs can only be returned to their original source:
- Detects original EVM chain from ckNFT metadata
- Validates target contract matches original source contract
- Prevents cross-chain returns that could result in asset loss
- Provides clear messaging about required target networks

## Integration Points

The component integrates with multiple systems:
- **IC Hooks**: useAuth for IC identity management
- **EVM Hooks**: useMetaMask for EVM wallet operations
- **Native Chain Service**: useNativeChain for chain detection
- **Bridge Operations**: use99Mutations for ICRC-99 return operations
- **ICRC-37**: Token approval system for ckNFT transfers
- **Progress Tracking**: Comprehensive bridge progress system

## Usage Patterns

### Basic Usage
\`\`\`tsx
<ICReturnWizard
  onComplete={(result) => console.log('Return completed:', result)}
  onCancel={() => console.log('Return cancelled')}
/>
\`\`\`

### Pre-configured Return
\`\`\`tsx
<ICReturnWizard
  ckNFTCanisterId="rdmx6-jaaaa-aaaah-qcaiq-cai"
  tokenId="123"
  targetChainId="1"
  targetContractAddress="0x..."
  onComplete={handleReturnComplete}
/>
\`\`\`

### Modal vs Inline Display
\`\`\`tsx
<ICReturnWizard
  modal={false}
  className="max-w-4xl mx-auto"
  onComplete={handleComplete}
/>
\`\`\`

## Props Reference

- **ckNFTCanisterId**: Pre-select ckNFT canister
- **tokenId**: Pre-specify token ID to return
- **targetChainId**: Pre-configure target EVM chain
- **targetContractAddress**: Pre-specify target contract
- **onComplete**: Callback for return completion with result data
- **onCancel**: Callback for wizard cancellation
- **modal**: Display mode (modal vs inline)
- **mockReturnResult**: Test result for development/testing

## Cost Management

The wizard includes sophisticated cost management:
- **Cycles Cost**: Required cycles for IC-side operations
- **Gas Estimates**: Real-time EVM gas price calculations
- **Burn Address Funding**: Automatic gas funding address generation
- **Balance Validation**: Ensures sufficient funding before execution
- **Multi-NFT Support**: Handles batch returns with individual cost tracking

## Error Handling

Comprehensive error handling for:
- Wallet connection failures (both IC and EVM)
- Network validation errors
- Insufficient funding (cycles or ETH)
- Contract validation failures
- Cross-chain communication issues
- Transaction execution failures

Each error provides clear recovery guidance and retry options where applicable.

## Security Features

- **Origin Validation**: Prevents returns to non-original contracts
- **Double Confirmation**: Requires explicit approval at multiple steps
- **Balance Verification**: Confirms adequate funding before execution
- **Transaction Monitoring**: Tracks completion across both chains
- **Error Recovery**: Safe rollback mechanisms for failed operations
        `
      }
    },
  },
  argTypes: {
    ckNFTCanisterId: {
      control: 'text',
      description: 'Pre-select ckNFT canister ID',
    },
    tokenId: {
      control: 'text',
      description: 'Pre-specify token ID to return',
    },
    targetChainId: {
      control: 'select',
      options: ['', '1', '137', '56', '31337', '42161', '10', '8453'],
      description: 'Pre-configure target EVM chain ID',
    },
    targetContractAddress: {
      control: 'text',
      description: 'Pre-specify target contract address',
    },
    modal: {
      control: 'boolean',
      description: 'Display as modal overlay',
    },
    onComplete: { action: 'return completed' },
    onCancel: { action: 'wizard cancelled' },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic wizard with all steps
export const Default: Story = {
  args: {
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default ICReturnWizard with full modal interface and step-by-step workflow.',
      },
    },
  },
};

// Pre-configured with ckNFT details
export const PreConfiguredReturn: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '123',
    targetChainId: '1',
    targetContractAddress: '0x1234567890123456789012345678901234567890',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Wizard pre-configured with specific ckNFT details and target information.',
      },
    },
  },
};

// Ethereum return scenario
export const EthereumReturn: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '123',
    targetChainId: '1',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard configured for returning ckNFT to Ethereum mainnet.',
      },
    },
  },
};

// Polygon return scenario
export const PolygonReturn: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '456',
    targetChainId: '137',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard configured for returning ckNFT to Polygon network.',
      },
    },
  },
};

// BSC return scenario
export const BSCReturn: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '789',
    targetChainId: '56',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard configured for returning ckNFT to Binance Smart Chain.',
      },
    },
  },
};

// Local development return
export const LocalDevelopmentReturn: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '1',
    targetChainId: '31337',
    targetContractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard configured for local Hardhat development environment returns.',
      },
    },
  },
};

// Non-modal inline display
export const InlineDisplay: Story = {
  args: {
    modal: false,
    className: 'max-w-4xl mx-auto',
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard displayed inline without modal overlay.',
      },
    },
  },
};

// Successful return completion
export const SuccessfulReturn: Story = {
  args: {
    modal: true,
    mockReturnResult: {
      success: true,
      evmTransactionHash: '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
      targetChainId: '1',
      targetContractAddress: '0x1234567890123456789012345678901234567890',
      tokenId: '123',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard in completion state showing successful return result.',
      },
    },
  },
};

// Failed return state
export const FailedReturn: Story = {
  args: {
    modal: true,
    mockReturnResult: {
      success: false,
      error: 'Burn address funding insufficient. Please add 0.005 ETH to burn address: 0xabc...def',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard showing failed return state with detailed error message.',
      },
    },
  },
};

// Multi-ckNFT return scenario
export const MultiCkNFTReturn: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard configured for returning multiple ckNFTs from the same canister.',
      },
    },
  },
};

// Native chain auto-detection
export const NativeChainDetection: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '123',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard demonstrating native chain auto-detection and validation.',
      },
    },
  },
};

// Cross-chain validation error
export const CrossChainValidationError: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '123',
    targetChainId: '137', // Wrong chain
    targetContractAddress: '0x9999999999999999999999999999999999999999', // Wrong contract
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard showing validation error when target doesn\'t match native chain.',
      },
    },
  },
};

// High gas cost scenario
export const HighGasCostReturn: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '123',
    targetChainId: '1',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard during high gas price periods with cost warnings.',
      },
    },
  },
};

// Burn address funding required
export const BurnAddressFundingRequired: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '123',
    targetChainId: '1',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard showing burn address funding requirements and status.',
      },
    },
  },
};

// Arbitrum Layer 2 return
export const ArbitrumReturn: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '123',
    targetChainId: '42161',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard configured for Arbitrum Layer 2 return operations.',
      },
    },
  },
};

// Optimism Layer 2 return
export const OptimismReturn: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '456',
    targetChainId: '10',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard configured for Optimism Layer 2 return operations.',
      },
    },
  },
};

// Base network return
export const BaseReturn: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '789',
    targetChainId: '8453',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard configured for Base network return operations.',
      },
    },
  },
};

// IC wallet connection step
export const ICWalletConnection: Story = {
  args: {
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard starting at IC wallet connection step.',
      },
    },
  },
};

// ckNFT selection step
export const CkNFTSelection: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard demonstrating ckNFT selection interface.',
      },
    },
  },
};

// Target network configuration step
export const TargetNetworkConfiguration: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '123',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard showing target network configuration with dual wallet setup.',
      },
    },
  },
};

// Cost calculation and funding
export const CostCalculationAndFunding: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '123',
    targetChainId: '1',
    targetContractAddress: '0x1234567890123456789012345678901234567890',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard showing cost calculation step with burn address funding.',
      },
    },
  },
};

// Transaction execution monitoring
export const TransactionExecutionMonitoring: Story = {
  args: {
    ckNFTCanisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    tokenId: '123',
    targetChainId: '1',
    targetContractAddress: '0x1234567890123456789012345678901234567890',
    modal: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'ICReturnWizard showing transaction execution with comprehensive progress tracking.',
      },
    },
  },
};