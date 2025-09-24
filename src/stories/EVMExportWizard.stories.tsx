import type { Meta, StoryObj } from '@storybook/react';
import { EVMExportWizard } from '../components/bridge/EVMExportWizard';
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

const meta: Meta<typeof EVMExportWizard> = {
  title: 'Bridge/EVMExportWizard',
  component: EVMExportWizard,
  decorators: [withStoryProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## EVMExportWizard Component

The EVMExportWizard provides a comprehensive multi-step interface for exporting ckNFTs from the Internet Computer to EVM chains. This wizard manages the complete IC-to-EVM bridging workflow from ckNFT selection through cast execution and completion confirmation.

### Features
- **Multi-step Workflow**: Clear progression through export process (Connect IC → Select ckNFT → Target Network → Costs → Export → Complete)
- **Dual Wallet Integration**: Seamless IC and EVM wallet management
- **Cost Transparency**: Real-time cost calculation with cycles and gas estimates
- **Cast Operation**: ICRC-99 cast operation to EVM with progress tracking
- **Error Recovery**: Comprehensive error handling with retry mechanisms
- **Modal Interface**: Full-screen modal with navigation controls

### Integration Points
- **IC Authentication**: useAuth for IC identity management
- **EVM Integration**: useMetaMask for EVM wallet operations
- **ICRC-99 Protocol**: use99Mutations for cast operations
- **Progress Tracking**: Comprehensive bridge progress system

### Usage Context
This wizard is typically initiated when users want to move their ckNFTs from IC to EVM chains for trading, usage in DeFi, or integration with EVM-based applications.
        `
      }
    },
  },
  argTypes: {
    canisterId: {
      control: 'text',
      description: 'Pre-select ckNFT canister ID',
    },
    tokenId: {
      control: 'text',
      description: 'Pre-specify token ID to export',
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
      defaultValue: true,
    },
    onComplete: { 
      action: 'export completed',
      description: 'Callback when export process completes',
    },
    onCancel: { 
      action: 'export cancelled',
      description: 'Callback when wizard is cancelled',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EVMExportWizard>;

// Mock selected IC NFTs for testing
const mockSelectedICNFTs = [
  {
    tokenId: '1',
    canisterId: 'umunu-kh777-77774-qaaca-cai',
    metadata: {
      name: 'Bored Ape #1234',
      description: 'A rare Bored Ape NFT from the BAYC collection',
    },
    owner: { toText: () => 'test-principal' } as any,
    image: 'https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=BAYC+1234',
    name: 'Bored Ape #1234',
    description: 'A rare Bored Ape NFT from the BAYC collection',
  },
  {
    tokenId: '2',
    canisterId: 'umunu-kh777-77774-qaaca-cai',
    metadata: {
      name: 'CryptoPunk #5678',
      description: 'A classic CryptoPunk from the legendary collection',
    },
    owner: { toText: () => 'test-principal' } as any,
    image: 'https://via.placeholder.com/300x300/10B981/FFFFFF?text=Punk+5678',
    name: 'CryptoPunk #5678',
    description: 'A classic CryptoPunk from the legendary collection',
  },
];

// Basic export wizard
export const Default: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    modal: false,
  },
};

// With wallet connected
export const WalletConnected: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    modal: false,
  },
};

// With selected NFTs
export const WithSelectedNFTs: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    mockSelectedICNFTs,
    initialStep: 'select-ic-nft',
    modal: false,
  },
};

// Remote contract step
export const RemoteContractStep: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    mockSelectedICNFTs,
    initialStep: 'remote-contract',
    modal: false,
  },
};

// Costs step
export const CostsStep: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    mockSelectedICNFTs,
    mockExportCosts: '15000000000',
    initialStep: 'costs',
    modal: false,
  },
};

// Export in progress
export const ExportInProgress: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    mockSelectedICNFTs,
    mockExportCosts: '15000000000',
    initialStep: 'export',
    modal: false,
  },
};

// Success
export const ExportComplete: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    mockSelectedICNFTs,
    mockExportResult: {
      success: true,
      evmTransactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      remoteContractAddress: '0x9876543210fedcba9876543210fedcba98765432',
      tokenId: '1, 2',
    },
    initialStep: 'complete',
    modal: false,
  },
};

// Failure
export const ExportFailed: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    mockSelectedICNFTs,
    mockExportResult: {
      success: false,
      error: 'Insufficient cycles balance. Please top up your cycles and try again.',
    },
    initialStep: 'complete',
    modal: false,
  },
};

// Single NFT export
export const SingleNFTExport: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon'],
    mockWalletConnected: true,
    mockSelectedICNFTs: [mockSelectedICNFTs[0]],
    mockExportResult: {
      success: true,
      evmTransactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      remoteContractAddress: '0x9876543210fedcba9876543210fedcba98765432',
      tokenId: '1',
    },
    initialStep: 'complete',
    modal: false,
  },
};

// Modal version
export const ModalVersion: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    modal: true,
  },
};

// Limited networks
export const LimitedNetworks: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum'],
    mockWalletConnected: true,
    initialStep: 'remote-contract',
    modal: false,
  },
};
