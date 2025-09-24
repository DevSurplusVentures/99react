import type { Meta, StoryObj } from '@storybook/react';
import { NFTSelectionStep } from '../../components/bridge/NFTSelectionStep';
import type { 
  SelectedNFT, 
  NFTCollection, 
  NFTDiscoveryService,
  NFTSelectionStepProps 
} from '../../components/bridge/NFTSelectionStep';
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

// Mock NFT data
const mockNFTCollections: NFTCollection[] = [
  {
    contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    name: 'Bored Ape Yacht Club',
    symbol: 'BAYC',
    imageUrl: 'https://i.seadn.io/gae/Ju9CkWtV-1Okvf45wo8UctR-M9He2PjILP0oOvxE89AyiPPGtrR3gysu1Zgy0hjd2xKIgjJJtWIc0ybj4Vd7wv8t3pxDGHoJBzDB?auto=format&w=256',
    totalSupply: 10000,
    verified: true,
  },
  {
    contractAddress: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6',
    name: 'Mutant Ape Yacht Club',
    symbol: 'MAYC',
    imageUrl: 'https://i.seadn.io/gae/lHexKRMpw-aoSyB1WdqzLI5KjkMZi6UTGTOApV5ApUO3eQLc_hI8T0Bah8EOmxCJJFU0E-NU-KPdUwXEbp7xzSZgfOE7T6F_kUUY?auto=format&w=256',
    totalSupply: 19423,
    verified: true,
  },
  {
    contractAddress: '0x49cF6f5d44E70224e2E23fDcdd2C053F30aDA28B',
    name: 'CloneX',
    symbol: 'CloneX',
    imageUrl: 'https://i.seadn.io/gae/XN0XuD8Uh3jyRWNtPTFeXJg_ht8m5ofDx6aMHuB1GZQjYLYjqJq8Q6s1I5E0Bz7G_qR1_YSdK7MJ0C8UYZm-X5JpNWAKnl6h?auto=format&w=256',
    totalSupply: 20000,
    verified: true,
  },
  {
    contractAddress: '0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e',
    name: 'Doodles',
    symbol: 'DOODLE',
    imageUrl: 'https://i.seadn.io/gae/7B0qai02OdHA8P_EOVK672qUliyjQdQDGNrACxs7WnTgZAkJa_wWURnIFKeOh5VTf8cfTqW3wQpozGedaC9mteKphEOtztls02RlWQ?auto=format&w=256',
    totalSupply: 10000,
    verified: true,
  },
  {
    contractAddress: '0x1A92f7381B9F03921564a437210bB9396471050C',
    name: 'Cool Cats NFT',
    symbol: 'COOL',
    imageUrl: 'https://i.seadn.io/gae/LIov33kogXOK4XZd2ESj29sqm_Hww5JSdO7AFn5wjt8xgnJJ0UpNV9yITqxra3s_LMEW1AnnrgOVB_hDpjJRA1uF4skI5Sdi_9rULi8?auto=format&w=256',
    totalSupply: 9999,
    verified: false,
  },
];

const mockOwnedNFTs: SelectedNFT[] = [
  {
    contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    tokenId: '1234',
    name: 'Bored Ape Yacht Club #1234',
    image: 'https://i.seadn.io/gae/H8jOCJuQokNqGBpkBN5wk1oZwO7LgQXcb1Hv4p7t-tZk-QQ',
    description: 'A unique Bored Ape with rare traits',
    ownershipStatus: 'owned',
    currentOwner: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
  },
  {
    contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    tokenId: '5678',
    name: 'Bored Ape Yacht Club #5678',
    image: 'https://i.seadn.io/gae/K7IjOCJuQokNqGBpkBN5wk1oZwO7LgQXcb1Hv4p7t-tZk-QQ',
    description: 'Another unique Bored Ape with different traits',
    ownershipStatus: 'owned',
    currentOwner: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
  },
  {
    contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    tokenId: '9012',
    name: 'Bored Ape Yacht Club #9012',
    image: 'https://i.seadn.io/gae/M8jOCJuQokNqGBpkBN5wk1oZwO7LgQXcb1Hv4p7t-tZk-QQ',
    description: 'A rare golden Bored Ape',
    ownershipStatus: 'bridged',
    currentOwner: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    bridgeTransferHash: '0x1234567890abcdef',
  },
];

const mockBridgedNFTs: SelectedNFT[] = [
  {
    contractAddress: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6',
    tokenId: '2345',
    name: 'Mutant Ape Yacht Club #2345',
    image: 'https://i.seadn.io/gae/N8jOCJuQokNqGBpkBN5wk1oZwO7LgQXcb1Hv4p7t-tZk-QQ',
    description: 'A mutant ape ready for minting',
    ownershipStatus: 'ready-to-mint',
    currentOwner: '0xbridge_contract_address',
    bridgeTransferHash: '0xabcdef1234567890',
  },
  {
    contractAddress: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6',
    tokenId: '6789',
    name: 'Mutant Ape Yacht Club #6789',
    image: 'https://i.seadn.io/gae/O8jOCJuQokNqGBpkBN5wk1oZwO7LgQXcb1Hv4p7t-tZk-QQ',
    description: 'Another mutant ape already minted on IC',
    ownershipStatus: 'already-minted',
    currentOwner: '0xbridge_contract_address',
    icrcTokenId: 'ic-token-6789',
  },
];

const mockEmptyNFTs: SelectedNFT[] = [];

// Mock NFT Discovery Service
const createMockDiscoveryService = (collections: NFTCollection[], nfts: SelectedNFT[]): NFTDiscoveryService => ({
  async getCollections(network: string, account: string): Promise<NFTCollection[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return collections;
  },
  async getNFTsInCollection(contractAddress: string, account: string, network: string): Promise<SelectedNFT[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return nfts.filter(nft => nft.contractAddress === contractAddress);
  },
});

const meta: Meta<typeof NFTSelectionStep> = {
  title: 'Bridge/NFTSelectionStep',
  component: NFTSelectionStep,
  decorators: [withStoryProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## NFTSelectionStep Component

The NFTSelectionStep component provides a comprehensive interface for users to discover, browse, and select NFTs for bridging operations.

### Features
- **Collection Discovery**: Automatic discovery of user's NFT collections
- **Manual Contract Entry**: Direct contract address input for unlisted collections
- **Ownership Status Tracking**: Different states (owned, bridged, ready-to-mint, already-minted)
- **Dual Mode Support**: Import mode (mint new) vs Burn mode (return existing)
- **Visual NFT Cards**: Rich display with metadata, images, and status indicators
- **Batch Selection**: Multi-select functionality with selection summary
- **Error Handling**: Comprehensive error states and fallback options

### User Journey
1. **Collection Discovery**: View auto-discovered NFT collections or enter contract manually
2. **Collection Selection**: Choose a collection to browse contained NFTs
3. **NFT Browsing**: View all NFTs in collection with ownership status
4. **Multi-Selection**: Select multiple NFTs for bridging with visual feedback
5. **Process Summary**: Preview of what will happen to selected NFTs

### Integration Points
- **useMetaMask**: Ethereum wallet connection and account access
- **useAuth**: IC authentication state
- **use99Mutations**: Orchestrator contract interactions for ownership verification
- **NFTDiscoveryService**: External service for NFT metadata and discovery

### Mode Differences
- **Import Mode**: Users can select NFTs they own to bridge TO the Internet Computer
- **Burn Mode**: Users can select already-bridged NFTs to return FROM the Internet Computer
`,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    account: {
      description: 'Ethereum account address',
      control: { type: 'text' },
    },
    network: {
      description: 'Blockchain network (ethereum, polygon, etc.)',
      control: { type: 'text' },
    },
    selectedNFTs: {
      description: 'Currently selected NFTs',
      control: { type: 'object' },
    },
    onSelectionChange: {
      description: 'Callback when NFT selection changes',
      action: 'selection-changed',
    },
    nftDiscoveryService: {
      description: 'Service for discovering NFT collections and metadata',
      control: { type: 'object' },
    },
    mode: {
      description: 'Selection mode: import (mint new) or burn (return existing)',
      control: { type: 'select' },
      options: ['import', 'burn'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'ethereum',
    selectedNFTs: [],
    onSelectionChange: () => {},
    nftDiscoveryService: createMockDiscoveryService(mockNFTCollections, mockOwnedNFTs),
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state showing NFT collection discovery and browsing interface in import mode.',
      },
    },
  },
};

export const LoadingCollections: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'ethereum',
    selectedNFTs: [],
    onSelectionChange: () => {},
    nftDiscoveryService: {
      async getCollections() {
        // Never resolve to show loading state
        return new Promise(() => {});
      },
      async getNFTsInCollection() {
        return [];
      },
    },
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while discovering user NFT collections.',
      },
    },
  },
};

export const WithSelectedNFTs: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'ethereum',
    selectedNFTs: [mockOwnedNFTs[0], mockOwnedNFTs[1]],
    onSelectionChange: () => {},
    nftDiscoveryService: createMockDiscoveryService(mockNFTCollections, mockOwnedNFTs),
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'State with multiple NFTs already selected, showing selection summary and process preview.',
      },
    },
  },
};

export const BurnMode: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'ethereum',
    selectedNFTs: [],
    onSelectionChange: () => {},
    nftDiscoveryService: createMockDiscoveryService(mockNFTCollections, mockBridgedNFTs),
    mode: 'burn',
  },
  parameters: {
    docs: {
      description: {
        story: 'Burn mode showing NFTs that can be returned from IC to Ethereum, with different ownership statuses.',
      },
    },
  },
};

export const EmptyCollection: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'ethereum',
    selectedNFTs: [],
    onSelectionChange: () => {},
    nftDiscoveryService: createMockDiscoveryService(mockNFTCollections, mockEmptyNFTs),
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'State when selected collection contains no NFTs owned by the user.',
      },
    },
  },
};

export const NoCollectionsFound: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'ethereum',
    selectedNFTs: [],
    onSelectionChange: () => {},
    nftDiscoveryService: createMockDiscoveryService([], []),
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'State when no NFT collections are found for the user, showing manual entry options.',
      },
    },
  },
};

export const DiscoveryServiceError: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'ethereum',
    selectedNFTs: [],
    onSelectionChange: () => {},
    nftDiscoveryService: {
      async getCollections() {
        throw new Error('Failed to connect to NFT discovery service');
      },
      async getNFTsInCollection() {
        throw new Error('Service unavailable');
      },
    },
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when NFT discovery service fails, showing fallback options.',
      },
    },
  },
};

export const NoDiscoveryService: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'ethereum',
    selectedNFTs: [],
    onSelectionChange: () => {},
    nftDiscoveryService: undefined,
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Fallback state when no discovery service is configured, showing direct blockchain scanning option.',
      },
    },
  },
};

export const MixedOwnershipStates: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'ethereum',
    selectedNFTs: [mockOwnedNFTs[0], mockBridgedNFTs[0]],
    onSelectionChange: () => {},
    nftDiscoveryService: createMockDiscoveryService(mockNFTCollections, [...mockOwnedNFTs, ...mockBridgedNFTs]),
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Complex scenario with NFTs in different ownership states: owned, bridged, ready-to-mint, already-minted.',
      },
    },
  },
};

export const LargeCollection: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'ethereum',
    selectedNFTs: [],
    onSelectionChange: () => {},
    nftDiscoveryService: createMockDiscoveryService(
      mockNFTCollections,
      Array.from({ length: 50 }, (_, i) => ({
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        tokenId: (i + 1).toString(),
        name: `Bored Ape Yacht Club #${i + 1}`,
        image: `https://i.seadn.io/gae/placeholder-${i}.png`,
        description: `A unique Bored Ape #${i + 1}`,
        ownershipStatus: i % 4 === 0 ? 'bridged' : i % 4 === 1 ? 'ready-to-mint' : i % 4 === 2 ? 'already-minted' : 'owned',
        currentOwner: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
      }))
    ),
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with large collection (50 NFTs) showing grid layout and selection handling.',
      },
    },
  },
};

export const ManualContractEntry: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'ethereum',
    selectedNFTs: [],
    onSelectionChange: () => {},
    nftDiscoveryService: createMockDiscoveryService([], []),
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Manual contract entry interface for adding unlisted collections directly by contract address.',
      },
    },
  },
  decorators: [
    (Story) => {
      // Auto-open manual entry for demonstration
      setTimeout(() => {
        const showManualButton = document.querySelector('[data-testid="show-manual-entry"]') as HTMLButtonElement;
        if (showManualButton) {
          showManualButton.click();
        }
      }, 100);
      return <Story />;
    },
  ],
};

export const InteractiveDemo: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'ethereum',
    selectedNFTs: [],
    onSelectionChange: () => {},
    nftDiscoveryService: createMockDiscoveryService(mockNFTCollections, mockOwnedNFTs),
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo for testing selection flows, multi-select behavior, and user interactions.',
      },
    },
  },
};

// Responsive variants
export const Mobile: Story = {
  args: {
    ...Default.args,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized view with responsive grid layout for smaller screens.',
      },
    },
  },
};

// Edge cases
export const NoAccountConnected: Story = {
  args: {
    account: '',
    network: 'ethereum',
    selectedNFTs: [],
    onSelectionChange: () => {},
    nftDiscoveryService: createMockDiscoveryService(mockNFTCollections, mockOwnedNFTs),
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'State when no Ethereum account is connected, showing wallet connection requirements.',
      },
    },
  },
};

export const UnsupportedNetwork: Story = {
  args: {
    account: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    network: 'unsupported-network',
    selectedNFTs: [],
    onSelectionChange: () => {},
    nftDiscoveryService: createMockDiscoveryService(mockNFTCollections, mockOwnedNFTs),
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when connected to unsupported blockchain network.',
      },
    },
  },
};