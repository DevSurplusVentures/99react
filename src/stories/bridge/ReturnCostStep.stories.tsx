import type { Meta, StoryObj } from '@storybook/react';
import { ReturnCostStep } from '../../components/bridge/ReturnCostStep';
import type { SelectedICNFT } from '../../components/bridge/EVMExportWizard';
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
const mockSelectedICNFTs: SelectedICNFT[] = [
  {
    id: BigInt(1),
    name: 'Cool NFT #001',
    image: 'https://via.placeholder.com/400x400/6366f1/ffffff?text=NFT+001',
    description: 'A really cool NFT from the collection',
    collection: 'hsncy-tqaaa-aaaal-ar2eq-cai',
    standard: 'ICRC-7',
    metadata: { name: 'Cool NFT #001', description: 'A really cool NFT from the collection' },
  },
  {
    id: BigInt(15),
    name: 'Amazing NFT #015',
    image: 'https://via.placeholder.com/400x400/ec4899/ffffff?text=NFT+015',
    description: 'An amazing NFT with unique properties',
    collection: 'hsncy-tqaaa-aaaal-ar2eq-cai',
    standard: 'ICRC-7',
    metadata: { name: 'Amazing NFT #015', description: 'An amazing NFT with unique properties' },
  }
];

const mockSingleICNFT: SelectedICNFT = {
  id: BigInt(42),
  name: 'Epic NFT #042',
  image: 'https://via.placeholder.com/400x400/10b981/ffffff?text=NFT+042',
  description: 'An epic NFT ready for return bridging',
  collection: 'hsncy-tqaaa-aaaal-ar2eq-cai',
  standard: 'ICRC-7',
  metadata: { name: 'Epic NFT #042', description: 'An epic NFT ready for return bridging' },
};

const mockReturnCosts = {
  cyclesCost: BigInt(500000000), // 0.5 TC
  ethCost: BigInt(50000000000000000), // 0.05 ETH
  gasEstimate: BigInt(180000),
  targetNetwork: { Ethereum: null },
  targetContract: '0x742d35Cc...1b9C4b3F6C',
  approvalAddress: '0xApproval...Address123',
  burnFundingAddress: '0xBurn...Fund123',
};

const mockMultipleReturnCosts = {
  cyclesCost: BigInt(1200000000), // 1.2 TC total
  ethCost: BigInt(120000000000000000), // 0.12 ETH total
  gasEstimate: BigInt(350000),
  targetNetwork: { Ethereum: null },
  targetContract: '0x742d35Cc...1b9C4b3F6C',
  approvalAddress: '0xApproval...Address123',
  nftDetails: [
    {
      nft: mockSelectedICNFTs[0],
      cyclesCost: BigInt(600000000), // 0.6 TC
      ethCost: BigInt(60000000000000000), // 0.06 ETH
      gasEstimate: BigInt(175000),
      burnFundingAddress: '0xBurn...Fund001',
    },
    {
      nft: mockSelectedICNFTs[1],
      cyclesCost: BigInt(600000000), // 0.6 TC
      ethCost: BigInt(60000000000000000), // 0.06 ETH
      gasEstimate: BigInt(175000),
      burnFundingAddress: '0xBurn...Fund015',
    }
  ]
};

const meta: Meta<typeof ReturnCostStep> = {
  title: 'Bridge/ReturnCostStep',
  component: ReturnCostStep,
  decorators: [withStoryProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## ReturnCostStep Component

The ReturnCostStep component handles cost calculation and payment approval for returning NFTs from the Internet Computer back to EVM networks.

### Features
- **Return Cost Calculation**: Calculate cycles and gas costs for returning IC NFTs to EVM chains
- **Multi-NFT Support**: Handle single or multiple NFT returns with individual cost breakdowns
- **Payment Integration**: IC wallet integration for cycles payment approval
- **Network Support**: Support for different EVM networks (Ethereum, Polygon, etc.)
- **Funding Address Management**: Manage burn funding addresses for return transactions

### User Journey
1. User views calculated return costs (cycles for IC operations + ETH gas for return transaction)
2. System shows detailed breakdown for each NFT if multiple selected
3. User approves cycles payment through IC wallet
4. User proceeds to return transaction execution

### Integration Points
- **useAuth**: Authentication state and principal ID
- **useFungibleToken**: Token balance and allowance management for cycles
- **use99Mutations**: Orchestrator contract interactions for return operations
- **useAnonAgent**: Anonymous agent for canister interactions
`,
      },
    },
  },
  argTypes: {
    selectedCkNFTs: {
      description: 'Array of IC NFTs selected for return bridging',
      control: { type: 'object' },
    },
    targetNetwork: {
      description: 'Target EVM network for return operation',
      control: { type: 'object' },
    },
    targetContract: {
      description: 'Target contract address on EVM network',
      control: { type: 'text' },
    },
    costs: {
      description: 'Calculated return costs',
      control: { type: 'object' },
    },
    onCostsCalculated: {
      description: 'Callback when costs are calculated',
      action: 'onCostsCalculated',
    },
    onContinue: {
      description: 'Callback when user proceeds to next step after cost approval',
      action: 'onContinue',
    },
    className: {
      description: 'Additional CSS classes for styling',
      control: { type: 'text' },
    }
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    selectedCkNFTs: [mockSingleICNFT],
    targetNetwork: mockReturnCosts.targetNetwork,
    targetContract: mockReturnCosts.targetContract,
    costs: mockReturnCosts,
    onCostsCalculated: () => console.log('Costs calculated'),
    onContinue: () => console.log('Proceeding to return transaction'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state showing cost calculation for a single IC NFT return to Ethereum.',
      },
    },
  },
};

export const CalculatingCosts: Story = {
  args: {
    selectedCkNFTs: [mockSingleICNFT],
    targetNetwork: mockReturnCosts.targetNetwork,
    targetContract: mockReturnCosts.targetContract,
    costs: null, // No costs yet - calculating
    onCostsCalculated: () => console.log('Costs calculated'),
    onContinue: () => console.log('Proceeding to return transaction'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while calculating return costs and gas estimates.',
      },
    },
  },
};

export const SuccessfulCalculation: Story = {
  args: {
    selectedCkNFTs: [mockSingleICNFT],
    targetNetwork: mockReturnCosts.targetNetwork,
    targetContract: mockReturnCosts.targetContract,
    costs: mockReturnCosts,
    onCostsCalculated: () => console.log('Costs calculated'),
    onContinue: () => console.log('Proceeding to return transaction'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Successful cost calculation showing detailed breakdown of return fees.',
      },
    },
  },
};

export const InsufficientETHForGas: Story = {
  args: {
    selectedCkNFTs: [mockSingleICNFT],
    targetNetwork: mockReturnCosts.targetNetwork,
    targetContract: mockReturnCosts.targetContract,
    costs: { ...mockReturnCosts, insufficientFunds: true },
    onCostsCalculated: () => console.log('Insufficient ETH for gas'),
    onContinue: () => console.log('Proceeding with funding'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when user has insufficient ETH to cover gas fees for the return transaction.',
      },
    },
  },
};

export const MultipleCkNFTReturn: Story = {
  args: {
    selectedCkNFTs: mockSelectedICNFTs,
    onNext: () => console.log('Proceeding to return transaction'),
    onBack: () => console.log('Going back to NFT selection'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Cost calculation for multiple IC NFTs with individual cost breakdowns and funding addresses.',
      },
    },
  },
};

export const HighReturnCosts: Story = {
  args: {
    selectedNFTs: [mockSingleICNFT],
    onNext: () => console.log('Proceeding to return transaction'),
    onBack: () => console.log('Going back to NFT selection'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Warning state for high return costs due to network congestion or complex NFT metadata.',
      },
    },
  },
};

export const ReturnToPolygon: Story = {
  args: {
    selectedCkNFTs: [mockSingleICNFT],
    targetNetwork: mockReturnCosts.targetNetwork,
    targetContract: mockReturnCosts.targetContract,
    costs: mockReturnCosts,
    onCostsCalculated: () => console.log('Costs calculated'),
    onContinue: () => console.log('Proceeding to return transaction'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Return cost calculation for Polygon network with lower gas costs.',
      },
    },
  },
};

export const PaymentApproved: Story = {
  args: {
    selectedCkNFTs: [mockSingleICNFT],
    onNext: () => console.log('Proceeding to return transaction'),
    onBack: () => console.log('Going back to NFT selection'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Success state after user has approved cycles payment for return transaction.',
      },
    },
  },
};

export const NoTargetContract: Story = {
  args: {
    selectedCkNFTs: [mockSingleICNFT],
    targetNetwork: mockReturnCosts.targetNetwork,
    targetContract: null,
    onCostsCalculated: () => console.log('No target contract'),
    onContinue: () => console.log('Selecting target contract'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when no target contract is specified for the return transaction.',
      },
    },
  },
};

export const InteractiveDemo: Story = {
  args: {
    selectedCkNFTs: mockSelectedICNFTs,
    onNext: () => console.log('Proceeding to return transaction'),
    onBack: () => console.log('Going back to NFT selection'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo with multiple NFTs and full cost calculation workflow.',
      },
    },
  },
};

export const MobileOptimized: Story = {
  args: {
    selectedCkNFTs: [mockSingleICNFT],
    onNext: () => console.log('Proceeding to return transaction'),
    onBack: () => console.log('Going back to NFT selection'),
    className: 'max-w-sm mx-auto',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized view of return cost calculation with touch-friendly interface.',
      },
    },
  },
};

export const NetworkConnectivityError: Story = {
  args: {
    selectedCkNFTs: [mockSingleICNFT],
    onNext: () => console.log('Proceeding to return transaction'),
    onBack: () => console.log('Going back to NFT selection'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when network connectivity issues prevent cost calculation.',
      },
    },
  },
};

export const LargeNFTCollection: Story = {
  args: {
    selectedCkNFTs: Array(5).fill(null).map((_, i) => ({
      ...mockSingleICNFT,
      id: BigInt(i + 1),
      name: `Collection NFT #${(i + 1).toString().padStart(3, '0')}`,
      image: `https://via.placeholder.com/400x400/${['6366f1', 'ec4899', '10b981', 'f59e0b', 'ef4444'][i]}/ffffff?text=NFT+${(i + 1).toString().padStart(3, '0')}`,
    })),
    onNext: () => console.log('Proceeding to return transaction'),
    onBack: () => console.log('Going back to NFT selection'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Cost calculation for a large collection of IC NFTs with bulk return pricing.',
      },
    },
  },
};

export const CustomNetwork: Story = {
  args: {
    selectedCkNFTs: [mockSingleICNFT],
    onNext: () => console.log('Proceeding to return transaction'),
    onBack: () => console.log('Going back to NFT selection'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Return cost calculation for custom EVM network with specific gas pricing.',
      },
    },
  },
};

export const RetryAfterFailure: Story = {
  args: {
    selectedCkNFTs: [mockSingleICNFT],
    onNext: () => console.log('Proceeding to return transaction'),
    onBack: () => console.log('Going back to NFT selection'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Retry state after initial cost calculation failed, allowing user to try again.',
      },
    },
  },
};