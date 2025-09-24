import type { Meta, StoryObj } from '@storybook/react';
import { Principal } from '@dfinity/principal';
import { MarketListingPrice } from '../components/MarketListingPrice';
import type { IntentStatus, TokenSpec } from '../declarations/market/market.did';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../provider/AgentProvider';
import '@nfid/identitykit/react/styles.css';

// Create query client for stories
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

// Providers for marketplace components
const withMarketProviders = (Story: any) => (
  <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
    <AgentProvider network="local">
      <QueryClientProvider client={queryClient}>
        <div className="p-4 bg-gray-50 min-h-screen">
          <Story />
        </div>
      </QueryClientProvider>
    </AgentProvider>
  </IdentityKitProvider>
);

// Mock data
const mockTokenSpec: TokenSpec = {
  canister: Principal.fromText('uzt4z-lp777-77777-qaabq-cai'), // Mock token canister
  inventory: [{ 
    Free: BigInt('1000000000000000000') // 1 token (18 decimals)
  }] 
};

const mockActiveListing: IntentStatus = {
  active: true,
  intent_id: BigInt('123'),
  original_config: [
    [
      {
        satisfying_tokens: [[mockTokenSpec]]
      }
    ]
  ],
  current_config: [],
  escrow: [],
  satisfying_tokens: [[mockTokenSpec]],
  satisfying_nfts: []
};

const mockInactiveListing: IntentStatus = {
  active: false,
  intent_id: BigInt('456'),
  original_config: [],
  current_config: [],
  escrow: [],
  satisfying_tokens: [],
  satisfying_nfts: []
};

const mockOwner = {
  owner: '2223e-iaaaa-aaaac-awyra-cai',
  subaccount: null
};

const mockUserOwner = {
  owner: 'user-principal-id',
  subaccount: null
};

const meta: Meta<typeof MarketListingPrice> = {
  title: 'Market/MarketListingPrice',
  component: MarketListingPrice,
  tags: ['autodocs'],
  decorators: [withMarketProviders],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## MarketListingPrice Component

A comprehensive marketplace component that handles NFT listing prices, purchase flows, and ownership management.

### Features
- **Dynamic Pricing**: Displays current market listing prices with token information
- **Buy/Sell Functionality**: Integrated purchase flow with wallet connection
- **Owner Controls**: List/unlist NFTs when user owns them
- **Token Support**: Multi-token support for different payment methods
- **Price Management**: Create, update, and cancel price listings
- **Authentication Integration**: Seamless wallet connection and user management
- **Error Handling**: Comprehensive error states and user feedback

### User Flows
1. **Viewing Listings**: Users see current price and token information
2. **Purchasing**: Non-owners can buy NFTs through integrated purchase flow
3. **Listing**: Owners can set prices and list their NFTs for sale
4. **Price Updates**: Owners can modify existing listing prices
5. **Unlisting**: Owners can remove items from market

### Integration Points
- **Market Contract**: Handles intent creation and fulfillment
- **Token Management**: Supports multiple fungible tokens for payments
- **NFT Ownership**: Validates ownership for listing permissions
- **Wallet Integration**: Authentication and transaction signing
        `,
      },
    },
  },
  argTypes: {
    listing: {
      control: 'object',
      description: 'Current market listing status with price and token information'
    },
    marketCanisterId: {
      control: 'text',
      description: 'The canister ID of the marketplace contract'
    },
    nftCanisterId: {
      control: 'text',
      description: 'The canister ID of the NFT collection'
    },
    tokenId: {
      control: 'text',
      description: 'The token ID of the specific NFT'
    },
    intentId: {
      control: 'text',
      description: 'Optional intent ID for existing listings'
    },
    owner: {
      control: 'object',
      description: 'Current owner information for the NFT'
    }
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveListing: Story = {
  args: {
    listing: mockActiveListing,
    marketCanisterId: 'market-canister-id',
    nftCanisterId: 'nft-canister-id',
    tokenId: '123',
    intentId: '123',
    owner: mockOwner,
  },
  parameters: {
    docs: {
      description: {
        story: 'Active marketplace listing showing current price and buy button for non-owners.',
      },
    },
  },
};

export const NoListing: Story = {
  args: {
    listing: null,
    marketCanisterId: 'market-canister-id',
    nftCanisterId: 'nft-canister-id',
    tokenId: '123',
    owner: mockOwner,
  },
  parameters: {
    docs: {
      description: {
        story: 'NFT without active listing - shows "Not for sale" state.',
      },
    },
  },
};

export const UserOwnsNFT: Story = {
  args: {
    listing: null,
    marketCanisterId: 'market-canister-id',
    nftCanisterId: 'nft-canister-id',
    tokenId: '123',
    owner: mockUserOwner,
  },
  parameters: {
    docs: {
      description: {
        story: 'NFT owned by current user - shows listing controls and price setting interface.',
      },
    },
  },
};

export const UserOwnsWithActiveListing: Story = {
  args: {
    listing: mockActiveListing,
    marketCanisterId: 'market-canister-id',
    nftCanisterId: 'nft-canister-id',
    tokenId: '123',
    intentId: '123',
    owner: mockUserOwner,
  },
  parameters: {
    docs: {
      description: {
        story: 'User owns NFT with active listing - shows price management and unlisting options.',
      },
    },
  },
};

export const InactiveListing: Story = {
  args: {
    listing: mockInactiveListing,
    marketCanisterId: 'market-canister-id',
    nftCanisterId: 'nft-canister-id',
    tokenId: '123',
    intentId: '456',
    owner: mockOwner,
  },
  parameters: {
    docs: {
      description: {
        story: 'Inactive or expired listing - shows unavailable state.',
      },
    },
  },
};

export const HighValueListing: Story = {
  args: {
    listing: {
      ...mockActiveListing,
      original_config: [
        [
          {
            satisfying_tokens: [[{
              ...mockTokenSpec,
              inventory: [{
                Free: BigInt('100000000000000000000') // 100 tokens
              }]
            }]]
          }
        ]
      ]
    },
    marketCanisterId: 'market-canister-id',
    nftCanisterId: 'nft-canister-id',
    tokenId: '789',
    intentId: '789',
    owner: mockOwner,
  },
  parameters: {
    docs: {
      description: {
        story: 'High-value NFT listing showing large price amounts and confirmation flows.',
      },
    },
  },
};

export const LoadingState: Story = {
  args: {
    listing: null,
    marketCanisterId: 'market-canister-id',
    nftCanisterId: 'nft-canister-id',
    tokenId: '123',
    owner: null, // Simulates loading owner information
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching listing and ownership information.',
      },
    },
  },
};

export const ErrorState: Story = {
  args: {
    listing: mockActiveListing,
    marketCanisterId: 'invalid-canister-id',
    nftCanisterId: 'nft-canister-id', 
    tokenId: '123',
    owner: mockOwner,
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when marketplace data fails to load or transactions fail.',
      },
    },
  },
};

export const MobileView: Story = {
  args: {
    listing: mockActiveListing,
    marketCanisterId: 'market-canister-id',
    nftCanisterId: 'nft-canister-id',
    tokenId: '123',
    intentId: '123',
    owner: mockOwner,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized view of marketplace listing with touch-friendly controls.',
      },
    },
  },
};

export const InteractiveDemo: Story = {
  args: {
    listing: mockActiveListing,
    marketCanisterId: 'market-canister-id',
    nftCanisterId: 'nft-canister-id',
    tokenId: '123',
    intentId: '123',
    owner: mockOwner,
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo for testing purchase flows and price management.',
      },
    },
  },
};