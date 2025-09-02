import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../provider/AgentProvider';
import { EVMImportWizard } from '../components/bridge/EVMImportWizard';

const meta = {
  title: 'Bridge/EVM Import Wizard',
  component: EVMImportWizard,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      return (
        <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
          <AgentProvider network="local">
            <QueryClientProvider client={queryClient}>
              <Story />
            </QueryClientProvider>
          </AgentProvider>
        </IdentityKitProvider>
      );
    },
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The EVMImportWizard is a comprehensive multi-step component for importing NFTs from EVM chains to the Internet Computer. 

## Features

- **Multi-step Flow**: Guides users through wallet connection, NFT selection, cost estimation, and bridging
- **Progress Tracking**: Real-time progress updates with traffic light status indicators
- **Error Handling**: Comprehensive error recovery and retry mechanisms
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **White-labelable**: Customizable styling and branding options

## Use Cases

- Import individual NFTs from Ethereum to IC
- Batch import multiple NFTs
- Cross-chain NFT marketplace integration
- DeFi protocols requiring NFT collateral on IC

## Integration

\`\`\`tsx
import { EVMImportWizard } from './components/bridge/EVMImportWizard';

function MyApp() {
  return (
    <EVMImportWizard
      canisterId="rrkah-fqaaa-aaaaa-aaaaq-cai"
      supportedNetworks={['ethereum', 'polygon']}
      onComplete={(result) => {
        if (result.success) {
          console.log('Import successful!', result);
        } else {
          console.error('Import failed:', result.error);
        }
      }}
    />
  );
}
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    canisterId: {
      control: 'text',
      description: 'The ICRC-99 canister ID to import NFTs to',
    },
    nftDiscoveryService: {
      control: 'object',
      description: 'Service for discovering user NFT collections and assets',
    },
    supportedNetworks: {
      control: 'object',
      description: 'Array of supported EVM networks',
    },
    modal: {
      control: 'boolean',
      description: 'Display wizard in a modal overlay',
    },
    onComplete: {
      description: 'Callback fired when import completes (success or failure)',
    },
    onCancel: {
      description: 'Callback fired when user cancels the wizard',
    },
    initialStep: {
      control: 'select',
      options: ['connect', 'select', 'costs', 'gas', 'bridge', 'complete'],
      description: 'Initial step to show (for demos/testing)',
    },
    mockWalletConnected: {
      control: 'boolean',
      description: 'Mock wallet connection state (for demos/testing)',
    },
    mockSelectedNFTs: {
      control: 'object',
      description: 'Mock selected NFTs (for demos/testing)',
    },
    mockCanisterCosts: {
      control: 'text',
      description: 'Mock canister costs (for demos/testing)',
    },
    mockGasEstimate: {
      control: 'text',
      description: 'Mock gas estimate (for demos/testing)',
    },
    mockImportResult: {
      control: 'object',
      description: 'Mock import result (for demos/testing)',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EVMImportWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data for demonstrations
const mockNFTs = [
  {
    contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    tokenId: '1234',
    name: 'Bored Ape #1234',
    image: 'https://ipfs.io/ipfs/QmRRPWG96cmgTn2qSzjwr2qvfNEuhunv6FNeMFGa9bx6mQ',
    description: 'A unique digital collectible ape',
  },
  {
    contractAddress: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6',
    tokenId: '5678',
    name: 'Mutant Ape #5678',
    image: 'https://ipfs.io/ipfs/QmYx6GsYAKnNzZ9A6NvEKV9nf1VaDzJrqDR23Y8YSkebLU',
    description: 'A mutated ape with special properties',
  },
];

export const Default: Story = {
  args: {
    canisterId: 'vb2j2-fp777-77774-qaafq-cai', // ICP ledger canister ID (known valid)
    supportedNetworks: ['ethereum', 'polygon'],
    modal: false,
    onComplete: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: `
Default EVMImportWizard configuration with Ethereum and Polygon support.
The wizard starts with the wallet connection step and guides users through the complete import process.
        `,
      },
    },
  },
};

export const Modal: Story = {
  args: {
    ...Default.args,
    modal: true,
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: `
Modal variant displays the wizard in a full-screen overlay.
Perfect for integration into existing applications where you want the wizard to appear as a modal dialog.
        `,
      },
    },
  },
};

export const SingleNetwork: Story = {
  args: {
    ...Default.args,
    supportedNetworks: ['ethereum'],
  },
  parameters: {
    docs: {
      description: {
        story: `
Configuration for single network support (Ethereum only).
Useful when your application only needs to support one specific EVM chain.
        `,
      },
    },
  },
};

export const MultiNetwork: Story = {
  args: {
    ...Default.args,
    supportedNetworks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'hardhat'],
  },
  parameters: {
    docs: {
      description: {
        story: `
Extended multi-network support including Ethereum, Polygon, BSC, Arbitrum, and Hardhat local development.
Demonstrates how the wizard adapts to different network configurations including local development environments.
        `,
      },
    },
  },
};

export const CustomCanister: Story = {
  args: {
    ...Default.args,
    canisterId: 'rkp4c-7iaaa-aaaaa-aaaca-cai', // Cycles minting canister ID (known valid)
  },
  parameters: {
    docs: {
      description: {
        story: `
Example with a custom canister ID.
Each deployment or white-label implementation would use their specific canister identifier.
        `,
      },
    },
  },
};

export const WithCustomStyling: Story = {
  args: {
    ...Default.args,
    className: 'border-2 border-blue-500 shadow-2xl',
  },
  parameters: {
    docs: {
      description: {
        story: `
Demonstrates custom styling capabilities using Tailwind CSS classes.
The component accepts className prop for easy customization and theming.
        `,
      },
    },
  },
};

// Workflow Stories - showing different steps
export const WalletConnectionStep: Story = {
  args: {
    ...Default.args,
    initialStep: 'connect',
    mockWalletConnected: false,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Step 1: Wallet Connection**

This step handles:
- MetaMask detection and connection
- Network verification and switching
- Account permission handling
- Multi-wallet support (future enhancement)
        `,
      },
    },
  },
};

export const WalletConnectedStep: Story = {
  args: {
    ...Default.args,
    initialStep: 'connect',
    mockWalletConnected: true,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Step 1: Wallet Connected**

Shows the connected state with wallet address and network information.
        `,
      },
    },
  },
};

export const NFTSelectionStep: Story = {
  args: {
    ...Default.args,
    initialStep: 'select',
    mockWalletConnected: true,
    mockSelectedNFTs: [],
  },
  parameters: {
    docs: {
      description: {
        story: `
**Step 2: NFT Selection**

Features include:
- Grid view of user's NFTs
- Multi-select capabilities
- NFT metadata display
- Search and filtering
- Collection grouping
        `,
      },
    },
  },
};

export const NFTSelectedStep: Story = {
  args: {
    ...Default.args,
    initialStep: 'select',
    mockWalletConnected: true,
    mockSelectedNFTs: [mockNFTs[0]],
  },
  parameters: {
    docs: {
      description: {
        story: `
**Step 2: NFT Selected**

Shows the step with an NFT already selected, ready to proceed to cost estimation.
        `,
      },
    },
  },
};

export const CostEstimationStep: Story = {
  args: {
    ...Default.args,
    initialStep: 'costs',
    mockWalletConnected: true,
    mockSelectedNFTs: [mockNFTs[0]],
    mockCanisterCosts: '1000000000000', // 1 ICP in e8s
  },
  parameters: {
    docs: {
      description: {
        story: `
**Step 3: Cost Estimation**

Displays:
- IC canister creation costs
- EVM gas fee estimates
- Total cost breakdown
- Payment options (ICP, cycles)
- Cost optimization tips
        `,
      },
    },
  },
};

export const GasEstimationStep: Story = {
  args: {
    ...Default.args,
    initialStep: 'gas',
    mockWalletConnected: true,
    mockSelectedNFTs: [mockNFTs[0]],
    mockCanisterCosts: '1000000000000',
    mockGasEstimate: '0.025',
  },
  parameters: {
    docs: {
      description: {
        story: `
**Step 4: Gas Estimation**

Shows:
- Current gas prices on EVM network
- Estimated gas costs for the bridge transaction
- Gas optimization suggestions
- Ready to proceed with bridging
        `,
      },
    },
  },
};

export const BridgeProgressStep: Story = {
  args: {
    ...Default.args,
    initialStep: 'bridge',
    mockWalletConnected: true,
    mockSelectedNFTs: [mockNFTs[0]],
    mockCanisterCosts: '1000000000000',
    mockGasEstimate: '0.025',
  },
  parameters: {
    docs: {
      description: {
        story: `
**Step 5: Bridge Progress**

Shows real-time progress with:
- Traffic light status indicators
- Collapsible stage grouping
- Transaction hash links
- Retry mechanisms for failed steps
- Estimated completion times
        `,
      },
    },
  },
};

export const CompletionStep: Story = {
  args: {
    ...Default.args,
    initialStep: 'complete',
    mockWalletConnected: true,
    mockSelectedNFTs: [mockNFTs[0]],
    mockImportResult: {
      success: true,
      evmTransactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      icTransactionHash: 'abc123-def456-ghi789-jkl012',
      canisterAddress: 'vb2j2-fp777-77774-qaafq-cai',
      tokenId: '1234',
    },
  },
  parameters: {
    docs: {
      description: {
        story: `
**Step 6: Completion**

Success state includes:
- Import confirmation
- Transaction details and links
- New IC canister information
- Options to import more NFTs
- Share/social features
        `,
      },
    },
  },
};

export const CompletionFailure: Story = {
  args: {
    ...Default.args,
    initialStep: 'complete',
    mockWalletConnected: true,
    mockSelectedNFTs: [mockNFTs[0]],
    mockImportResult: {
      success: false,
      error: 'Insufficient gas fees. Please ensure you have enough ETH to complete the transaction.',
    },
  },
  parameters: {
    docs: {
      description: {
        story: `
**Step 6: Completion (Failed)**

Error state shows:
- Clear error message and explanation
- Retry options when applicable
- Support links and troubleshooting
- Option to start over or cancel
        `,
      },
    },
  },
};

export const MultipleNFTsSelected: Story = {
  args: {
    ...Default.args,
    initialStep: 'select',
    mockWalletConnected: true,
    mockSelectedNFTs: mockNFTs,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Multiple NFTs Selected**

Demonstrates the wizard with multiple NFTs selected for batch import.
This is useful for users who want to import their entire collection at once.
        `,
      },
    },
  },
};

// Error States
export const ErrorStates: Story = {
  args: {
    ...Default.args,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Error Handling**

The wizard provides comprehensive error recovery:

- **Connection Errors**: Wallet not found, network issues
- **Permission Errors**: User rejects transactions
- **Gas Errors**: Insufficient funds, gas estimation failures
- **Bridge Errors**: Network congestion, canister creation failures
- **Retry Logic**: Automatic and manual retry options

All errors include clear explanations and suggested actions.
        `,
      },
    },
  },
};

// Integration Examples
export const IntegrationExample: Story = {
  args: {
    ...Default.args,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Integration Example**

\`\`\`tsx
import { useState } from 'react';
import { EVMImportWizard } from './components/bridge/EVMImportWizard';

function NFTMarketplace() {
  const [showImport, setShowImport] = useState(false);
  const [importedNFTs, setImportedNFTs] = useState([]);

  const handleImportComplete = (result) => {
    if (result.success) {
      setImportedNFTs(prev => [...prev, result]);
      setShowImport(false);
      // Refresh NFT listings
      refreshNFTCollection();
    }
  };

  return (
    <div>
      <button 
        onClick={() => setShowImport(true)}
        className="btn-primary"
      >
        Import from Ethereum
      </button>

      {showImport && (
        <EVMImportWizard
          canisterId={MARKETPLACE_CANISTER_ID}
          supportedNetworks={['ethereum', 'polygon']}
          modal={true}
          onComplete={handleImportComplete}
          onCancel={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
\`\`\`
        `,
      },
    },
  },
};

// Mock NFT Discovery Service for demonstrations
const mockNFTDiscoveryService = {
  async getCollections(network: string, userAddress: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return [
      {
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        name: 'Bored Ape Yacht Club',
        symbol: 'BAYC',
        totalSupply: '10000',
        description: 'A collection of 10,000 unique Bored Ape NFTs',
        imageUrl: 'https://ipfs.io/ipfs/QmRRPWG96cmgTn2qSzjwr2qvfNEuhunv6FNeMFGa9bx6mQ',
        verified: true,
      },
      {
        contractAddress: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6',
        name: 'Mutant Ape Yacht Club', 
        symbol: 'MAYC',
        totalSupply: '30000',
        description: 'Mutant Apes bred from the BAYC ecosystem',
        imageUrl: 'https://ipfs.io/ipfs/QmYx6GsYAKnNzZ9A6NvEKV9nf1VaDzJrqDR23Y8YSkebLU',
        verified: true,
      },
      {
        contractAddress: '0x8943C7bAC1914C9A7ABa750Bf2B6B09Fd21037E0',
        name: 'Lazy Lions',
        symbol: 'LION',
        totalSupply: '10000',
        imageUrl: 'https://ipfs.io/ipfs/QmT5QMWV4ZLyYhRV8QY35xNyJ9BoKr1Q3X6iBqHJZ3C7Tt',
        verified: false,
      },
    ];
  },

  async getNFTsInCollection(contractAddress: string, userAddress: string, network: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock different collections
    if (contractAddress === '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D') {
      return [
        {
          contractAddress,
          tokenId: '1234',
          name: 'Bored Ape #1234',
          image: 'https://ipfs.io/ipfs/QmRRPWG96cmgTn2qSzjwr2qvfNEuhunv6FNeMFGa9bx6mQ',
          description: 'A unique digital collectible ape',
        },
        {
          contractAddress,
          tokenId: '5678',
          name: 'Bored Ape #5678',
          image: 'https://ipfs.io/ipfs/QmSg9bPzW6QhKz9nQVyJ4YzYpR1X8Z7nA3qK9kR5c2QqxS',
          description: 'Another unique digital collectible ape',
        },
      ];
    } else if (contractAddress === '0x60E4d786628Fea6478F785A6d7e704777c86a7c6') {
      return [
        {
          contractAddress,
          tokenId: '9876',
          name: 'Mutant Ape #9876',
          image: 'https://ipfs.io/ipfs/QmYx6GsYAKnNzZ9A6NvEKV9nf1VaDzJrqDR23Y8YSkebLU',
          description: 'A mutated ape with special properties',
        },
      ];
    }
    
    return [];
  },
};

export const WithNFTDiscovery: Story = {
  args: {
    ...Default.args,
    initialStep: 'select',
    mockWalletConnected: true,
    nftDiscoveryService: mockNFTDiscoveryService,
  },
  parameters: {
    docs: {
      description: {
        story: `
**NFT Discovery Service Integration**

This example demonstrates the complete NFT selection experience with a mock discovery service.

Features shown:
- **Collection Discovery**: Automatically loads user's NFT collections
- **Manual Contract Entry**: Users can enter contract addresses manually  
- **NFT Enumeration**: Shows individual NFTs owned in each collection
- **Multi-select Interface**: Users can select multiple NFTs to bridge
- **Loading States**: Proper loading indicators during API calls
- **Error Handling**: Graceful error handling for failed requests

The NFT discovery service can integrate with:
- Moralis NFT API
- Alchemy NFT API  
- OpenSea API
- Covalent API
- SimpleHash API
- Custom indexing services
        `,
      },
    },
  },
};
