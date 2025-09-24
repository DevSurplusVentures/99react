import type { Meta, StoryObj } from '@storybook/react';
import { NFTMintEstimationStep } from '../../components/bridge/NFTMintEstimationStep';
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

// Mock data for the stories
const mockSelectedNFTs: SelectedNFT[] = [
  {
    contractAddress: '0x742d35Cc6cF582C4D1bb3F6C4b3F6C1b9C4b3F6C',
    tokenId: '1',
    name: 'Bored Ape #1',
    image: 'https://via.placeholder.com/400x400/ff6b35/ffffff?text=BAYC+%231',
    collection: 'Bored Ape Yacht Club',
    metadata: {
      name: 'Bored Ape #1',
      description: 'A bored ape from the yacht club',
      attributes: [
        { trait_type: 'Background', value: 'Blue' },
        { trait_type: 'Fur', value: 'Brown' },
      ],
    },
  },
  {
    contractAddress: '0x742d35Cc6cF582C4D1bb3F6C4b3F6C1b9C4b3F6C',
    tokenId: '42',
    name: 'Bored Ape #42',
    image: 'https://via.placeholder.com/400x400/6366f1/ffffff?text=BAYC+%2342',
    collection: 'Bored Ape Yacht Club',
    metadata: {
      name: 'Bored Ape #42',
      description: 'Another bored ape with rare traits',
      attributes: [
        { trait_type: 'Background', value: 'Gold' },
        { trait_type: 'Fur', value: 'Golden' },
        { trait_type: 'Eyes', value: 'Laser' },
      ],
    },
  }
];

const mockSingleNFT: SelectedNFT = {
  contractAddress: '0x742d35Cc6cF582C4D1bb3F6C4b3F6C1b9C4b3F6C',
  tokenId: '7777',
  name: 'CryptoPunk #7777',
  image: 'https://via.placeholder.com/400x400/10b981/ffffff?text=PUNK+%237777',
  collection: 'CryptoPunks',
  metadata: {
    name: 'CryptoPunk #7777',
    description: 'A rare CryptoPunk with unique characteristics',
    attributes: [
      { trait_type: 'Type', value: 'Alien' },
      { trait_type: 'Accessory', value: 'Bandana' },
    ],
  },
};

const meta: Meta<typeof NFTMintEstimationStep> = {
  title: 'Bridge/NFTMintEstimationStep',
  component: NFTMintEstimationStep,
  decorators: [withStoryProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## NFTMintEstimationStep Component

The NFTMintEstimationStep component calculates and displays the estimated cycles cost for minting NFTs on the Internet Computer during the bridging process.

### Features
- **Mint Cost Calculation**: Calculate cycles required for minting NFTs on IC based on metadata size and complexity
- **Multi-NFT Support**: Handle cost estimation for single or multiple NFTs with detailed breakdowns
- **Cycles Integration**: Integration with cycles ledger for balance checking and payment approval
- **Real-time Updates**: Dynamic cost calculation as NFT selection changes
- **Payment Approval**: Streamlined cycles payment approval workflow

### User Journey
1. System calculates estimated cycles cost for minting selected NFTs on IC
2. User views detailed cost breakdown including metadata processing fees
3. User checks cycles balance and approves payment if sufficient
4. System validates payment approval and proceeds to minting process

### Integration Points
- **useMetaMask**: Ethereum wallet connection for NFT data
- **useAuth**: Authentication state and principal ID
- **useFungibleToken**: Cycles balance and payment management
- **use99Mutations**: Orchestrator interactions for mint operations
`,
      },
    },
  },
  argTypes: {
    selectedNFTs: {
      description: 'Array of EVM NFTs selected for minting on IC',
      control: { type: 'object' },
    },
    mintCosts: {
      description: 'Current calculated mint costs in cycles',
      control: { type: 'number' },
    },
    onMintCostsCalculated: {
      description: 'Callback when mint costs are calculated',
      action: 'onMintCostsCalculated',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    selectedNFTs: [mockSingleNFT],
    mintCosts: null,
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state showing mint cost estimation for a single NFT.',
      },
    },
  },
};

export const CalculatingCosts: Story = {
  args: {
    selectedNFTs: [mockSingleNFT],
    mintCosts: null,
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while calculating mint costs based on NFT metadata complexity.',
      },
    },
  },
};

export const SuccessfulEstimation: Story = {
  args: {
    selectedNFTs: [mockSingleNFT],
    mintCosts: BigInt(250000000), // 0.25 TC
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Successful cost estimation showing detailed cycles breakdown for minting.',
      },
    },
  },
};

export const InsufficientBalance: Story = {
  args: {
    selectedNFTs: [mockSingleNFT],
    mintCosts: BigInt(1000000000), // 1 TC (assuming user has less)
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when user has insufficient cycles balance for minting operation.',
      },
    },
  },
};

export const MultipleNFTs: Story = {
  args: {
    selectedNFTs: mockSelectedNFTs,
    mintCosts: BigInt(500000000), // 0.5 TC total
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Cost estimation for multiple NFTs with combined cycles cost calculation.',
      },
    },
  },
};

export const HighComplexityNFT: Story = {
  args: {
    selectedNFTs: [{
      ...mockSingleNFT,
      metadata: {
        ...mockSingleNFT.metadata,
        attributes: Array(20).fill(null).map((_, i) => ({
          trait_type: `Trait ${i + 1}`,
          value: `Value ${i + 1}`,
        })),
        description: 'This is a very complex NFT with extensive metadata, multiple attributes, and detailed properties that will require more cycles to mint on the Internet Computer. '.repeat(5),
      }
    }],
    mintCosts: BigInt(750000000), // 0.75 TC (higher due to complexity)
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Higher cost estimation for NFT with complex metadata and many attributes.',
      },
    },
  },
};

export const PaymentApproved: Story = {
  args: {
    selectedNFTs: [mockSingleNFT],
    mintCosts: BigInt(250000000), // 0.25 TC
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Success state after user has approved cycles payment for minting.',
      },
    },
  },
};

export const NoICConnection: Story = {
  args: {
    selectedNFTs: [mockSingleNFT],
    mintCosts: BigInt(250000000), // 0.25 TC
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when no Internet Identity connection is available.',
      },
    },
  },
};

export const LargeCollection: Story = {
  args: {
    selectedNFTs: Array(10).fill(null).map((_, i) => ({
      ...mockSingleNFT,
      tokenId: (i + 1).toString(),
      name: `Collection NFT #${i + 1}`,
      image: `https://via.placeholder.com/400x400/${['6366f1', 'ec4899', '10b981', 'f59e0b', 'ef4444'][i % 5]}/ffffff?text=NFT+${i + 1}`,
    })),
    mintCosts: BigInt(2500000000), // 2.5 TC for 10 NFTs
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Cost estimation for a large collection of NFTs with bulk pricing benefits.',
      },
    },
  },
};

export const EstimationError: Story = {
  args: {
    selectedNFTs: [mockSingleNFT],
    mintCosts: null,
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when cost estimation fails due to network or metadata issues.',
      },
    },
  },
};

export const InteractiveDemo: Story = {
  args: {
    selectedNFTs: mockSelectedNFTs,
    mintCosts: BigInt(500000000), // 0.5 TC
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demonstration of mint cost calculation with multiple scenarios.',
      },
    },
  },
};

export const MobileView: Story = {
  args: {
    selectedNFTs: [mockSingleNFT],
    mintCosts: BigInt(250000000), // 0.25 TC
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized view of mint cost estimation with touch-friendly interface.',
      },
    },
  },
};

export const CostBreakdown: Story = {
  args: {
    selectedNFTs: mockSelectedNFTs,
    mintCosts: BigInt(500000000), // 0.5 TC
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Detailed cost breakdown showing base minting cost, metadata processing, and additional fees.',
      },
    },
  },
};

export const RetryAfterError: Story = {
  args: {
    selectedNFTs: [mockSingleNFT],
    mintCosts: null,
    onMintCostsCalculated: (costs: bigint) => console.log('Mint costs calculated:', costs.toString()),
  },
  parameters: {
    docs: {
      description: {
        story: 'Retry state allowing user to recalculate costs after initial estimation failed.',
      },
    },
  },
};