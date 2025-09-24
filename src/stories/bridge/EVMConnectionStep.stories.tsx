import type { Meta, StoryObj } from '@storybook/react';
import { EVMConnectionStep } from '../../components/bridge/EVMConnectionStep';
import type { EVMConnectionStepProps } from '../../components/bridge/EVMConnectionStep';
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

// Mock data
const supportedNetworks = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base'];
const mockAccount = '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85';

const meta: Meta<typeof EVMConnectionStep> = {
  title: 'Bridge/EVMConnectionStep',
  component: EVMConnectionStep,
  decorators: [withStoryProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## EVMConnectionStep Component

The EVMConnectionStep component provides a comprehensive interface for EVM wallet connection and network management in the bridging process.

### Features
- **Wallet Connection**: MetaMask and other EVM wallet connection with status tracking
- **Network Selection**: Visual grid of supported blockchain networks with detailed information
- **Network Switching**: Automatic detection of network mismatches and switching functionality
- **Connection Status**: Real-time wallet and network connection status indicators
- **Multi-Network Support**: Support for Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, and local development networks

### User Journey
1. **Wallet Connection**: Connect MetaMask or other EVM-compatible wallet
2. **Account Display**: View connected account address and status
3. **Network Selection**: Choose target blockchain network from supported options
4. **Network Validation**: Automatic detection if wallet needs to switch networks
5. **Network Switching**: One-click network switching with wallet approval

### Network Information
Each network option displays:
- Network name and icon
- Chain ID for technical reference
- Native currency (ETH, MATIC, BNB, etc.)
- Block explorer link for transaction verification

### Integration Points
- **MetaMask API**: Direct integration with wallet connection and network switching
- **Multi-Chain Support**: Configurable network list based on deployment
- **Connection State**: Real-time updates of wallet and network status

### Connection States
- **Disconnected**: No wallet connected, showing connection button
- **Connected Wrong Network**: Wallet connected but on incorrect network
- **Connected Correct Network**: Wallet connected and on target network
- **Connection Error**: Failed connection attempts with retry options
`,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isConnected: {
      description: 'Whether EVM wallet is connected',
      control: { type: 'boolean' },
    },
    account: {
      description: 'Connected wallet account address',
      control: { type: 'text' },
    },
    supportedNetworks: {
      description: 'List of supported network identifiers',
      control: { type: 'object' },
    },
    currentNetwork: {
      description: 'Currently connected network',
      control: { type: 'select' },
      options: [null, 'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base'],
    },
    onConnect: {
      description: 'Callback to connect wallet',
      action: 'connect-wallet',
    },
    onSwitchNetwork: {
      description: 'Callback to switch network',
      action: 'switch-network',
    },
    selectedTargetNetwork: {
      description: 'User-selected target network',
      control: { type: 'select' },
      options: [undefined, 'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base'],
    },
    onTargetNetworkChange: {
      description: 'Callback when target network selection changes',
      action: 'target-network-changed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const NotConnected: Story = {
  args: {
    isConnected: false,
    account: null,
    supportedNetworks,
    currentNetwork: null,
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: undefined,
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state when no EVM wallet is connected. Shows connection button and available networks.',
      },
    },
  },
};

export const Connected: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks,
    currentNetwork: 'ethereum',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: undefined,
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected state showing wallet account and current network. User can select target network.',
      },
    },
  },
};

export const NetworkSelected: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks,
    currentNetwork: 'ethereum',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: 'ethereum',
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when target network is selected and matches current network. Shows success indicator.',
      },
    },
  },
};

export const NetworkMismatch: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks,
    currentNetwork: 'ethereum',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: 'polygon',
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when selected target network differs from current wallet network. Shows switch network prompt.',
      },
    },
  },
};

export const PolygonNetwork: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks,
    currentNetwork: 'polygon',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: 'polygon',
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected to Polygon network showing MATIC currency and Polygonscan explorer.',
      },
    },
  },
};

export const BSCNetwork: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks,
    currentNetwork: 'bsc',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: 'bsc',
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected to Binance Smart Chain showing BNB currency and BSCScan explorer.',
      },
    },
  },
};

export const ArbitrumNetwork: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks,
    currentNetwork: 'arbitrum',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: 'arbitrum',
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected to Arbitrum showing Layer 2 scaling solution with ETH currency.',
      },
    },
  },
};

export const OptimismNetwork: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks,
    currentNetwork: 'optimism',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: 'optimism',
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected to Optimism showing Layer 2 scaling solution with ETH currency.',
      },
    },
  },
};

export const BaseNetwork: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks,
    currentNetwork: 'base',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: 'base',
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected to Base (Coinbase) network showing Layer 2 solution with ETH currency.',
      },
    },
  },
};

export const DevelopmentNetworks: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks: ['hardhat', 'hardhat-2', 'ethereum'],
    currentNetwork: 'hardhat',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: 'hardhat',
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Development environment showing local Hardhat networks for testing.',
      },
    },
  },
};

export const LimitedNetworks: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks: ['ethereum', 'polygon'],
    currentNetwork: 'ethereum',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: undefined,
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Configuration with limited network support (only Ethereum and Polygon).',
      },
    },
  },
};

export const ConnectingState: Story = {
  args: {
    isConnected: false,
    account: null,
    supportedNetworks,
    currentNetwork: null,
    onConnect: async () => {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: undefined,
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state during wallet connection process. Click connect to see loading state.',
      },
    },
  },
};

export const SwitchingNetwork: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks,
    currentNetwork: 'ethereum',
    onConnect: async () => {},
    onSwitchNetwork: async (network: string) => {
      // Simulate network switch delay
      console.log(`Switching to ${network}...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    },
    selectedTargetNetwork: 'polygon',
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Network switching state. Click "Switch Network" to simulate the switching process.',
      },
    },
  },
};

export const UnknownNetwork: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks,
    currentNetwork: 'unknown-network',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: undefined,
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when wallet is connected to an unsupported network.',
      },
    },
  },
};

export const NoSupportedNetworks: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks: [],
    currentNetwork: 'ethereum',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: undefined,
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Edge case when no networks are configured as supported.',
      },
    },
  },
};

export const Interactive: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks,
    currentNetwork: 'ethereum',
    onConnect: async () => {},
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: undefined,
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo for testing network selection and switching flows.',
      },
    },
  },
};

// Responsive variants
export const Mobile: Story = {
  args: {
    ...Connected.args,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized view with responsive grid layout for network selection.',
      },
    },
  },
};

// Error states
export const ConnectionFailed: Story = {
  args: {
    isConnected: false,
    account: null,
    supportedNetworks,
    currentNetwork: null,
    onConnect: async () => {
      throw new Error('Connection failed: User rejected the request');
    },
    onSwitchNetwork: async () => {},
    selectedTargetNetwork: undefined,
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when wallet connection fails. Click connect to see error handling.',
      },
    },
  },
};

export const NetworkSwitchFailed: Story = {
  args: {
    isConnected: true,
    account: mockAccount,
    supportedNetworks,
    currentNetwork: 'ethereum',
    onConnect: async () => {},
    onSwitchNetwork: async (network: string) => {
      throw new Error(`Failed to switch to ${network}: User rejected the request`);
    },
    selectedTargetNetwork: 'polygon',
    onTargetNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when network switching fails. Click "Switch Network" to see error handling.',
      },
    },
  },
};