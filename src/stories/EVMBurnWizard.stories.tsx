import type { Meta, StoryObj } from '@storybook/react';
import { EVMBurnWizard } from '../components/bridge/EVMBurnWizard';
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

const meta: Meta<typeof EVMBurnWizard> = {
  title: 'Bridge/EVMBurnWizard',
  component: EVMBurnWizard,
  decorators: [withStoryProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# EVMBurnWizard

The EVMBurnWizard component provides a comprehensive multi-step interface for burning EVM NFTs and converting them to ckNFTs on the Internet Computer. This wizard manages the complete workflow from EVM wallet connection through NFT selection, cost calculation, burn execution, and completion confirmation.

## Overview

This wizard implements the EVM-to-IC bridge direction, allowing users to:
- Connect their EVM wallet (MetaMask)
- Select EVM NFTs to burn from their collection
- Review burn costs and gas estimates
- Execute the burn transaction on EVM
- Monitor the completion and ckNFT minting on IC

## Architecture

The EVMBurnWizard is built with five distinct steps:
1. **Connect**: EVM wallet connection and network selection
2. **Select NFT**: Browse and select EVM NFTs to burn
3. **Costs**: Review burn costs including gas fees and IC fees
4. **Burn**: Execute the burn transaction with progress tracking
5. **Complete**: Confirmation with transaction details and next steps

## Key Features

- **Multi-step Workflow**: Clear progression through burn process
- **Network Support**: Supports all major EVM chains (Ethereum, Polygon, BSC, Arbitrum, etc.)
- **NFT Discovery**: Integrated NFT collection browsing and selection
- **Cost Calculation**: Real-time burn cost estimation including gas fees
- **Progress Tracking**: Live transaction monitoring with detailed status updates
- **Error Handling**: Comprehensive error states with retry options
- **Modal Interface**: Full-screen modal presentation with escape options
- **Responsive Design**: Optimized for all screen sizes

## Integration

The component integrates with several key systems:
- **EVM Hooks**: useMetaMask for wallet connection and network management
- **Authentication**: useAuth for IC identity management
- **Mutations**: use99Mutations for ICRC-99 bridge operations
- **Bridge Progress**: Comprehensive progress tracking system
- **NFT Services**: NFT discovery and metadata services

## Usage Patterns

### Basic Usage
\`\`\`tsx
<EVMBurnWizard
  onComplete={(result) => console.log('Burn completed:', result)}
  onCancel={() => console.log('Burn cancelled')}
/>
\`\`\`

### Pre-configured Burn
\`\`\`tsx
<EVMBurnWizard
  sourceChainId="1"
  sourceContractAddress="0x..."
  sourceTokenId="123"
  onComplete={(result) => handleBurnComplete(result)}
/>
\`\`\`

### Custom NFT Discovery
\`\`\`tsx
<EVMBurnWizard
  nftDiscoveryService={customDiscoveryService}
  onComplete={handleComplete}
/>
\`\`\`

## Props Reference

- **sourceChainId**: Pre-select source EVM chain
- **sourceContractAddress**: Pre-specify contract address
- **sourceTokenId**: Pre-specify token ID to burn
- **nftDiscoveryService**: Custom NFT discovery implementation
- **onComplete**: Callback for burn completion with result data
- **onCancel**: Callback for wizard cancellation
- **modal**: Display mode (modal vs inline)
- **mockBurnResult**: Test result for development/testing

## Error Handling

The wizard includes comprehensive error handling for:
- Wallet connection failures
- Network switching issues
- Insufficient gas fees
- Transaction failures
- Network congestion
- Contract interaction errors

Each error provides clear messaging and recovery options where possible.
        `
      }
    },
  },
  argTypes: {
    sourceChainId: {
      control: 'select',
      options: ['', '1', '137', '56', '31337', '42161', '10', '8453'],
      description: 'Pre-select source EVM chain ID',
    },
    sourceContractAddress: {
      control: 'text',
      description: 'Pre-specify source contract address',
    },
    sourceTokenId: {
      control: 'text',
      description: 'Pre-specify token ID to burn',
    },
    modal: {
      control: 'boolean',
      description: 'Display as modal overlay',
    },
    onComplete: { action: 'burn completed' },
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
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default EVMBurnWizard with full modal interface and step-by-step workflow.',
      },
    },
  },
};

// Pre-configured with source details
export const PreConfiguredBurn: Story = {
  args: {
    sourceChainId: '1',
    sourceContractAddress: '0x1234567890123456789012345678901234567890',
    sourceTokenId: '123',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Wizard pre-configured with specific NFT details, starting from the connection step.',
      },
    },
  },
};

// Ethereum mainnet configuration
export const EthereumBurn: Story = {
  args: {
    sourceChainId: '1',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard configured for Ethereum mainnet operations.',
      },
    },
  },
};

// Polygon configuration
export const PolygonBurn: Story = {
  args: {
    sourceChainId: '137',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard configured for Polygon network operations.',
      },
    },
  },
};

// BSC configuration
export const BSCBurn: Story = {
  args: {
    sourceChainId: '56',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard configured for Binance Smart Chain operations.',
      },
    },
  },
};

// Local development configuration
export const LocalDevelopment: Story = {
  args: {
    sourceChainId: '31337',
    sourceContractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard configured for local Hardhat development environment.',
      },
    },
  },
};

// Non-modal inline display
export const InlineDisplay: Story = {
  args: {
    modal: false,
    className: 'max-w-4xl mx-auto',
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard displayed inline without modal overlay.',
      },
    },
  },
};

// Success completion state
export const SuccessfulBurn: Story = {
  args: {
    modal: true,
    mockWalletConnected: true,
    mockBurnResult: {
      success: true,
      icTransactionHash: '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
      ckNFTCanisterId: 'hsncy-tqaaa-aaaal-ar2eq-cai',
      tokenId: '123',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard in completion state showing successful burn result.',
      },
    },
  },
};

// Failed burn state
export const FailedBurn: Story = {
  args: {
    modal: true,
    mockWalletConnected: true,
    mockBurnResult: {
      success: false,
      error: 'Insufficient gas fees for burn transaction. Please add more ETH to your wallet.',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard showing failed burn state with error message.',
      },
    },
  },
};

// Multi-NFT burn scenario
export const MultiNFTBurn: Story = {
  args: {
    sourceChainId: '1',
    sourceContractAddress: '0x1234567890123456789012345678901234567890',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard configured for burning multiple NFTs from the same collection.',
      },
    },
  },
};

// Network switching scenario
export const NetworkSwitchRequired: Story = {
  args: {
    sourceChainId: '137', // Polygon
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard requiring network switch to Polygon for burn operation.',
      },
    },
  },
};

// Premium collection burn
export const PremiumCollectionBurn: Story = {
  args: {
    sourceChainId: '1',
    sourceContractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', // BAYC-style
    sourceTokenId: '8888',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard configured for burning high-value NFTs with premium collection metadata.',
      },
    },
  },
};

// Gas price spike scenario
export const HighGasBurn: Story = {
  args: {
    sourceChainId: '1',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard during high gas price periods with cost warnings.',
      },
    },
  },
};

// Wallet connection error state  
export const WalletConnectionError: Story = {
  args: {
    modal: true,
    mockWalletConnected: false, // Explicitly set to false to show connection error
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard handling wallet connection errors and recovery options.',
      },
    },
  },
};

// Custom discovery service
export const CustomDiscoveryService: Story = {
  args: {
    modal: true,
    mockWalletConnected: true,
    nftDiscoveryService: {
      discoverCollections: async () => [
        {
          address: '0xCustomContract123',
          name: 'Custom Collection',
          symbol: 'CUSTOM',
          totalSupply: 1000,
          description: 'A custom NFT collection for testing discovery services',
        },
      ],
      getCollectionNFTs: async () => [
        {
          tokenId: '1',
          contractAddress: '0xCustomContract123',
          name: 'Custom NFT #1',
          description: 'First NFT in custom collection',
          image: 'https://via.placeholder.com/300x300?text=Custom+NFT+1',
        },
      ],
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard with custom NFT discovery service implementation.',
      },
    },
  },
};

// Arbitrum Layer 2 configuration
export const ArbitrumBurn: Story = {
  args: {
    sourceChainId: '42161',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard configured for Arbitrum Layer 2 network operations.',
      },
    },
  },
};

// Optimism Layer 2 configuration
export const OptimismBurn: Story = {
  args: {
    sourceChainId: '10',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard configured for Optimism Layer 2 network operations.',
      },
    },
  },
};

// Base network configuration
export const BaseBurn: Story = {
  args: {
    sourceChainId: '8453',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard configured for Base network operations.',
      },
    },
  },
};

// Connection step focus
export const ConnectionStep: Story = {
  args: {
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard starting at the connection step, showing wallet connection interface.',
      },
    },
  },
};

// Cost calculation focus
export const CostCalculationStep: Story = {
  args: {
    sourceChainId: '1',
    sourceContractAddress: '0x1234567890123456789012345678901234567890',
    sourceTokenId: '123',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard demonstrating cost calculation step with gas estimation.',
      },
    },
  },
};

// Transaction monitoring
export const TransactionMonitoring: Story = {
  args: {
    sourceChainId: '1',
    sourceContractAddress: '0x1234567890123456789012345678901234567890',
    sourceTokenId: '123',
    modal: true,
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'EVMBurnWizard showing transaction monitoring with progress tracking.',
      },
    },
  },
};