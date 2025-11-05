import type { Meta, StoryObj } from '@storybook/react';
import { BurnNFTSelectionStep } from '../../components/bridge/BurnNFTSelectionStep';
import type { SelectedNFT } from '../../components/bridge/NFTSelectionStep';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@nfid/identitykit/react/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Story decorator with all necessary providers
const withStoryProviders = (Story: any) => (
  <QueryClientProvider client={queryClient}>
    <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
      <AgentProvider>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-4xl mx-auto">
            <Story />
          </div>
        </div>
      </AgentProvider>
    </IdentityKitProvider>
  </QueryClientProvider>
);

// Mock data for cast NFTs (remote EVM NFTs that were previously bridged from IC)
const mockCastNFTs: SelectedNFT[] = [
  {
    contractAddress: '0x742d35Cc6cF582C4D1bb3F6C4b3F6C1b9C4b3F6C',
    tokenId: '101',
    name: 'Cast ckNFT #101',
    image: 'https://via.placeholder.com/400x400/6366f1/ffffff?text=Cast+%23101',
    collection: 'ckNFT Collection (Cast)',
    metadata: {
      name: 'Cast ckNFT #101',
      description: 'A cast NFT originally from Internet Computer, now on EVM chain',
      attributes: [
        { trait_type: 'Origin', value: 'Internet Computer' },
        { trait_type: 'Status', value: 'Cast to EVM' },
        { trait_type: 'Rarity', value: 'Common' },
      ],
      originalCanister: 'hsncy-tqaaa-aaaal-ar2eq-cai',
      originalTokenId: '42',
    },
  },
  {
    contractAddress: '0x742d35Cc6cF582C4D1bb3F6C4b3F6C1b9C4b3F6C',
    tokenId: '102',
    name: 'Cast ckNFT #102',
    image: 'https://via.placeholder.com/400x400/ec4899/ffffff?text=Cast+%23102',
    collection: 'ckNFT Collection (Cast)',
    metadata: {
      name: 'Cast ckNFT #102',
      description: 'A rare cast NFT with special properties from IC',
      attributes: [
        { trait_type: 'Origin', value: 'Internet Computer' },
        { trait_type: 'Status', value: 'Cast to EVM' },
        { trait_type: 'Rarity', value: 'Rare' },
        { trait_type: 'Special', value: 'Animated' },
      ],
      originalCanister: 'hsncy-tqaaa-aaaal-ar2eq-cai',
      originalTokenId: '15',
    },
  },
  {
    contractAddress: '0x742d35Cc6cF582C4D1bb3F6C4b3F6C1b9C4b3F6C',
    tokenId: '103',
    name: 'Cast ckNFT #103',
    image: 'https://via.placeholder.com/400x400/10b981/ffffff?text=Cast+%23103',
    collection: 'ckNFT Collection (Cast)',
    metadata: {
      name: 'Cast ckNFT #103',
      description: 'An epic cast NFT with legendary traits',
      attributes: [
        { trait_type: 'Origin', value: 'Internet Computer' },
        { trait_type: 'Status', value: 'Cast to EVM' },
        { trait_type: 'Rarity', value: 'Epic' },
        { trait_type: 'Power', value: 'Legendary' },
      ],
      originalCanister: 'hsncy-tqaaa-aaaal-ar2eq-cai',
      originalTokenId: '7',
    },
  }
];

const meta: Meta<typeof BurnNFTSelectionStep> = {
  title: 'Bridge/BurnNFTSelectionStep',
  component: BurnNFTSelectionStep,
  decorators: [withStoryProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## BurnNFTSelectionStep Component

The BurnNFTSelectionStep component provides an interface for selecting cast NFTs (EVM NFTs originally from IC) to burn and convert back to ckNFTs on the Internet Computer.

### Features
- **Cast NFT Selection**: Browse and select cast NFTs that were previously bridged from IC to EVM chains
- **Burn Process Education**: Clear explanation of what happens during the burn and remint process
- **Safety Warnings**: Important warnings about the irreversible nature of the burn operation
- **Origin Information**: Display original IC canister and token ID information
- **Multi-Selection Support**: Select multiple cast NFTs for batch burning

### User Journey
1. User views available cast NFTs in their EVM wallet
2. User selects which cast NFTs to burn (convert back to ckNFTs)
3. System displays clear warnings about the irreversible burn process
4. User confirms understanding and proceeds to burn cost calculation

### Integration Points
- **NFTSelectionStep**: Extends the base NFT selection component
- **MetaMask Integration**: Access to EVM wallet for cast NFT discovery
- **ICRC99 Protocol**: Understanding of cast NFT metadata and origin information
`,
      },
    },
  },
  argTypes: {
    nfts: {
      description: 'Array of available cast NFTs that can be burned',
      control: { type: 'object' },
    },
    selectedNFTs: {
      description: 'Array of currently selected cast NFTs for burning',
      control: { type: 'object' },
    },
    onSelectionChange: {
      description: 'Callback when cast NFT selection changes',
      action: 'onSelectionChange',
    },
    loading: {
      description: 'Whether cast NFTs are being loaded from wallet',
      control: { type: 'boolean' },
    },
    error: {
      description: 'Error message when loading cast NFTs fails',
      control: { type: 'text' },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    nfts: mockCastNFTs,
    selectedNFTs: [],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state showing available cast NFTs for burning with educational content.',
      },
    },
  },
};

export const WithSelection: Story = {
  args: {
    nfts: mockCastNFTs,
    selectedNFTs: [mockCastNFTs[0]],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'State with one cast NFT selected for burning, showing selection UI.',
      },
    },
  },
};

export const MultipleSelection: Story = {
  args: {
    nfts: mockCastNFTs,
    selectedNFTs: [mockCastNFTs[0], mockCastNFTs[2]],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'State with multiple cast NFTs selected for batch burning operation.',
      },
    },
  },
};

export const Loading: Story = {
  args: {
    nfts: [],
    selectedNFTs: [],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching cast NFTs from connected EVM wallet.',
      },
    },
  },
};

export const EmptyState: Story = {
  args: {
    nfts: [],
    selectedNFTs: [],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no cast NFTs are available for burning.',
      },
    },
  },
};

export const LoadingError: Story = {
  args: {
    nfts: [],
    selectedNFTs: [],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
    error: 'Failed to load cast NFTs from MetaMask. Please check your wallet connection.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when cast NFT loading fails due to wallet or network issues.',
      },
    },
  },
};

export const LargeCollection: Story = {
  args: {
    nfts: Array(12).fill(null).map((_, i) => ({
      ...mockCastNFTs[i % 3],
      tokenId: (100 + i + 1).toString(),
      name: `Cast ckNFT #${100 + i + 1}`,
      image: `https://via.placeholder.com/400x400/${['6366f1', 'ec4899', '10b981', 'f59e0b', 'ef4444'][i % 5]}/ffffff?text=Cast+%23${100 + i + 1}`,
    })),
    selectedNFTs: [],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Large collection of cast NFTs with pagination and grid layout.',
      },
    },
  },
};

export const SingleCastNFT: Story = {
  args: {
    nfts: [mockCastNFTs[0]],
    selectedNFTs: [mockCastNFTs[0]],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'State with only one cast NFT available and selected for burning.',
      },
    },
  },
};

export const RareNFTs: Story = {
  args: {
    nfts: mockCastNFTs.map(nft => ({
      ...nft,
      metadata: {
        ...nft.metadata,
        attributes: [
          ...nft.metadata?.attributes || [],
          { trait_type: 'Market Value', value: 'High' },
          { trait_type: 'Burn Warning', value: 'Valuable Asset' },
        ],
      },
    })),
    selectedNFTs: [],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Selection interface for rare/valuable cast NFTs with additional warnings.',
      },
    },
  },
};

export const InteractiveDemo: Story = {
  args: {
    nfts: mockCastNFTs,
    selectedNFTs: [],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing the full cast NFT selection and burn process.',
      },
    },
  },
};

export const MobileView: Story = {
  args: {
    nfts: mockCastNFTs,
    selectedNFTs: [mockCastNFTs[1]],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized view of cast NFT selection with touch-friendly interface.',
      },
    },
  },
};

export const NetworkError: Story = {
  args: {
    nfts: [],
    selectedNFTs: [],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
    error: 'Network error: Unable to connect to Ethereum network. Please check your connection.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when network connectivity prevents loading cast NFTs.',
      },
    },
  },
};

export const WalletDisconnected: Story = {
  args: {
    nfts: [],
    selectedNFTs: [],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
    error: 'Wallet not connected. Please connect your MetaMask wallet to view cast NFTs.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when EVM wallet is not connected or available.',
      },
    },
  },
};

export const FilteredView: Story = {
  args: {
    nfts: mockCastNFTs.filter(nft => 
      nft.metadata?.attributes?.some(attr => attr.value === 'Rare' || attr.value === 'Epic')
    ),
    selectedNFTs: [],
    onSelectionChange: (nfts: SelectedNFT[]) => console.log('Selection changed:', nfts),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Filtered view showing only rare and epic cast NFTs available for burning.',
      },
    },
  },
};