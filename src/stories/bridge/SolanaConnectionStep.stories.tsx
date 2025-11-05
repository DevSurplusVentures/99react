import type { Meta, StoryObj } from '@storybook/react';
import { SolanaConnectionStep } from '../../components/bridge/SolanaConnectionStep';
import type { SolanaConnectionStepProps } from '../../components/bridge/SolanaConnectionStep';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaWalletProvider } from '../../provider/SolanaWalletProvider';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import '@nfid/identitykit/react/styles.css';

// Suppress network errors in Storybook
if (typeof window !== 'undefined') {
  try {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (args[0]?.includes?.('Cannot POST') || args[0]?.includes?.('404')) {
        return;
      }
      originalError.apply(console, args);
    };
  } catch (e) {
    // Ignore
  }
}

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

// Provider wrapper for Solana components
const withSolanaProviders = (Story: any) => (
  <SolanaWalletProvider>
    <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
      <AgentProvider network="local">
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-gray-50 p-4">
            <Story />
          </div>
        </QueryClientProvider>
      </AgentProvider>
    </IdentityKitProvider>
  </SolanaWalletProvider>
);

const meta = {
  title: 'Bridge/SolanaConnectionStep',
  component: SolanaConnectionStep,
  decorators: [withSolanaProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## SolanaConnectionStep Component

The SolanaConnectionStep component provides a comprehensive interface for Solana wallet connection and cluster selection in the NFT bridging process.

### Features
- **Wallet Connection**: Phantom, Backpack, Solflare, and other Solana wallet support with status tracking
- **Cluster Selection**: Visual grid of Solana networks (mainnet, devnet, testnet, localnet)
- **Custom RPC Detection**: Automatic detection of local validator or custom RPC endpoints
- **Balance Display**: Real-time SOL balance fetching from actual RPC endpoint
- **Connection Status**: Live wallet and cluster connection status indicators
- **Multi-Wallet Support**: Compatible with all Solana Wallet Adapter-supported wallets

### User Journey
1. **Wallet Connection**: Connect Phantom, Backpack, or other Solana-compatible wallet
2. **Account Display**: View connected account address (base58 format), wallet name, and balance
3. **RPC Detection**: Automatic detection if wallet is using custom RPC (e.g., localhost validator)
4. **Cluster Selection**: Choose target blockchain cluster from supported options
5. **Cluster Validation**: Visual feedback when wallet cluster matches/mismatches target selection

### Cluster Information
Each cluster option displays:
- Cluster name and icon (◎ for mainnet/devnet/testnet, 🔧 for custom)
- RPC endpoint for technical reference
- Native currency (SOL)
- Block explorer link (Solscan) for transaction verification
- Description explaining cluster purpose

### Custom RPC Support
The component intelligently detects when your wallet (e.g., Backpack) is connected to:
- **Localhost Validator** (\`http://127.0.0.1:8899\`)
- **Custom RPC Endpoints** (any non-standard RPC)
- Shows special UI hints and recommendations for local development

### Integration Points
- **Solana Wallet Adapter** - Direct integration with wallet connection and cluster detection
- **Multi-Cluster Support** - Mainnet, Devnet, Testnet, and custom endpoints
- **Connection State** - Real-time updates via \`useSolana()\` hook
- **Balance Fetching** - Uses actual wallet RPC endpoint for accurate balance

### Connection States
- **Disconnected**: No wallet connected, showing connection button and wallet modal
- **Connected Same Cluster**: Wallet connected and cluster matches target (success state)
- **Connected Different Cluster**: Wallet on different cluster than target (warning state)
- **Custom RPC Detected**: Wallet using localhost or custom endpoint (special UI)
- **Loading Balance**: Fetching SOL balance from RPC endpoint

### RPC Endpoint Behavior
The component uses \`actualRpcEndpoint\` from \`useSolana()\` hook to:
1. Detect the real RPC endpoint from the wallet provider (e.g., Backpack's injected connection)
2. Fetch balance from the correct endpoint (not the default ConnectionProvider)
3. Display accurate network information even with custom RPCs
4. Support localhost validators for development workflows

### Usage in Bridge Wizards
This component is used as the first step in:
- **SolanaExportWizard**: IC → Solana NFT bridging
- **SolanaImportWizard**: Solana → IC NFT bridging

It ensures the user has a connected wallet and has selected their target cluster before proceeding to NFT selection and transaction execution.
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    selectedTargetCluster: {
      control: { type: 'select' },
      options: [undefined, 'mainnet-beta', 'devnet', 'testnet', 'localnet'],
      description: 'User-selected target Solana cluster for bridging',
      table: {
        type: { summary: 'SolanaCluster | undefined' },
        defaultValue: { summary: 'undefined' },
      },
    },
    onTargetClusterChange: {
      action: 'target-cluster-changed',
      description: 'Callback fired when user selects a target cluster',
      table: {
        type: { summary: '(cluster: SolanaCluster) => void' },
      },
    },
  },
} satisfies Meta<typeof SolanaConnectionStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedTargetCluster: 'devnet',
    onTargetClusterChange: () => {},
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaConnectionStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaConnectionStep</code> component provides wallet connection and cluster selection 
              for Solana NFT bridging operations. This is the first step in Solana export/import wizards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Connect Solana wallet (Phantom, Backpack, Solflare)</li>
                <li>• Display wallet address and balance</li>
                <li>• Select target Solana cluster</li>
                <li>• Detect custom RPC endpoints</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Multi-wallet support</li>
                <li>• Real-time SOL balance</li>
                <li>• Cluster mismatch detection</li>
                <li>• Localhost validator support</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🌐 Supported Clusters</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="flex items-center mb-2">
                  <div className="text-2xl mr-3">◎</div>
                  <div className="font-medium text-gray-900">Mainnet Beta</div>
                </div>
                <div className="text-sm text-gray-600">Production network with real SOL</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="flex items-center mb-2">
                  <div className="text-2xl mr-3">◎</div>
                  <div className="font-medium text-gray-900">Devnet</div>
                </div>
                <div className="text-sm text-gray-600">Testing network with free SOL</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="flex items-center mb-2">
                  <div className="text-2xl mr-3">◎</div>
                  <div className="font-medium text-gray-900">Testnet</div>
                </div>
                <div className="text-sm text-gray-600">Validator stress testing</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="flex items-center mb-2">
                  <div className="text-2xl mr-3">🔧</div>
                  <div className="font-medium text-gray-900">Localnet</div>
                </div>
                <div className="text-sm text-gray-600">Local validator (http://127.0.0.1:8899)</div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">🔄 Connection Flow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-medium text-sm text-gray-900">Connect Wallet</div>
                <div className="text-xs text-gray-600 mt-1">Phantom/Backpack/Solflare</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-medium text-sm text-gray-900">Show Account</div>
                <div className="text-xs text-gray-600 mt-1">Address + Balance</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-medium text-sm text-gray-900">Detect RPC</div>
                <div className="text-xs text-gray-600 mt-1">Actual endpoint</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">4️⃣</div>
                <div className="font-medium text-sm text-gray-900">Select Cluster</div>
                <div className="text-xs text-gray-600 mt-1">Target network</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">🔧 Custom RPC Detection</h2>
            <div className="space-y-3 text-yellow-800">
              <p><strong>Automatic Detection:</strong> Detects localhost validator or custom RPC endpoints</p>
              <p><strong>Wallet Integration:</strong> Uses actual wallet RPC (not default provider)</p>
              <p><strong>Balance Accuracy:</strong> Fetches balance from correct endpoint</p>
              <p><strong>Localnet Option:</strong> Shows localnet cluster when custom RPC detected</p>
              <p><strong>Development Support:</strong> Perfect for local Solana validator workflows</p>
            </div>
          </div>
        </div>
      )
    }
  }
};

export const NotConnected: Story = {
  args: {
    selectedTargetCluster: undefined,
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state when no Solana wallet is connected. Shows connection button and available clusters are hidden until wallet connects.',
      },
    },
  },
};

export const Connected: Story = {
  args: {
    selectedTargetCluster: undefined,
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected state showing wallet account, balance, and cluster selection grid. User can now select target cluster for bridging. **Note**: Install Phantom/Backpack wallet extension and connect to see this state in Storybook.',
      },
    },
  },
};

export const MainnetSelected: Story = {
  args: {
    selectedTargetCluster: 'mainnet-beta',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when Mainnet Beta is selected as target cluster. Shows success indicator if wallet is also on mainnet, or cluster mismatch warning if not. **Note**: Requires wallet connection.',
      },
    },
  },
};

export const DevnetSelected: Story = {
  args: {
    selectedTargetCluster: 'devnet',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when Devnet is selected as target cluster. Devnet is commonly used for testing with free SOL from faucets. **Note**: Requires wallet connection.',
      },
    },
  },
};

export const TestnetSelected: Story = {
  args: {
    selectedTargetCluster: 'testnet',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when Testnet is selected as target cluster. Testnet is used for validator testing. **Note**: Requires wallet connection.',
      },
    },
  },
};

export const LocalnetSelected: Story = {
  args: {
    selectedTargetCluster: 'localnet',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when Localnet (custom RPC) is selected. This option only appears when wallet is connected to localhost or custom RPC endpoint. Common for development with local Solana validator. **Note**: Requires wallet connection to custom RPC.',
      },
    },
  },
};

export const ClusterMismatch: Story = {
  args: {
    selectedTargetCluster: 'devnet',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when selected target cluster differs from current wallet cluster. Shows warning with guidance that wallet may need to be reconfigured. **Example**: Wallet on mainnet, but devnet selected as target. **Note**: Requires wallet connection.',
      },
    },
  },
};

export const CustomRPCDetected: Story = {
  args: {
    selectedTargetCluster: 'devnet',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when wallet (e.g., Backpack) is connected to custom RPC endpoint like localhost validator (http://127.0.0.1:8899). Shows special UI with purple highlight, custom RPC detection info, and helpful tip about cluster selection. **Note**: Requires wallet configured with custom RPC.',
      },
    },
  },
};

export const WithBalance: Story = {
  args: {
    selectedTargetCluster: 'mainnet-beta',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected state showing SOL balance fetched from actual RPC endpoint. Balance updates automatically when wallet connects. Link to view account on Solscan explorer. **Note**: Requires wallet connection with SOL balance.',
      },
    },
  },
};

export const LoadingBalance: Story = {
  args: {
    selectedTargetCluster: 'mainnet-beta',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State while fetching balance from RPC endpoint. Shows loading indicator in balance section. **Note**: Visible briefly after wallet connection.',
      },
    },
  },
};

export const NoBalanceAvailable: Story = {
  args: {
    selectedTargetCluster: 'mainnet-beta',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when balance fetch fails (RPC timeout, network error, etc.). Shows "Unable to fetch balance" message. **Note**: May occur with slow/unreliable RPC endpoints.',
      },
    },
  },
};

export const PhantomWallet: Story = {
  args: {
    selectedTargetCluster: 'mainnet-beta',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected with Phantom wallet - most popular Solana wallet extension. Shows "Using Phantom" in connection status. **Note**: Requires Phantom wallet extension.',
      },
    },
  },
};

export const BackpackWallet: Story = {
  args: {
    selectedTargetCluster: 'localnet',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected with Backpack wallet - supports custom RPC endpoints. Often used for local development. Shows "Using Backpack" and may detect custom RPC. **Note**: Requires Backpack wallet extension.',
      },
    },
  },
};

export const SolflareWallet: Story = {
  args: {
    selectedTargetCluster: 'devnet',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected with Solflare wallet. Shows "Using Solflare" in connection status. **Note**: Requires Solflare wallet extension.',
      },
    },
  },
};

export const ConnectingState: Story = {
  args: {
    selectedTargetCluster: undefined,
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state during wallet connection process. Button shows "Connecting..." and is disabled. **Note**: Click "Connect Wallet" to see this state briefly.',
      },
    },
  },
};

export const DisconnectingState: Story = {
  args: {
    selectedTargetCluster: 'mainnet-beta',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state during wallet disconnection. **Note**: Click "Disconnect" button to see this state briefly.',
      },
    },
  },
};

export const WalletModalPrompt: Story = {
  args: {
    selectedTargetCluster: undefined,
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when clicking "Connect Wallet" with no wallet selected. Opens Solana Wallet Adapter modal for wallet selection (Phantom, Backpack, Solflare, etc.). **Note**: Click "Connect Wallet" to trigger modal.',
      },
    },
  },
};

export const MultipleWalletsDetected: Story = {
  args: {
    selectedTargetCluster: undefined,
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when multiple Solana wallet extensions are installed. Wallet modal shows all available options. **Note**: Install multiple wallet extensions (Phantom + Backpack + Solflare) to see.',
      },
    },
  },
};

export const NoWalletsDetected: Story = {
  render: () => (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Solana Wallet</h3>
        <p className="text-gray-600">
          Connect your Phantom, Solflare, or other Solana wallet, then select your target cluster.
        </p>
      </div>
      
      <div className="flex flex-col items-center space-y-4">
        <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center w-full">
          <div className="text-4xl mb-2">◎</div>
          <p className="text-gray-600 mb-4">No Solana wallets detected</p>
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
            <p className="text-sm text-amber-800 font-medium mb-2">⚠️ No Wallet Extension Found</p>
            <p className="text-xs text-amber-700">
              Please install a Solana wallet extension to continue:
            </p>
            <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
              <li><a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">Phantom Wallet</a></li>
              <li><a href="https://backpack.app/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">Backpack Wallet</a></li>
              <li><a href="https://solflare.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">Solflare Wallet</a></li>
            </ul>
          </div>
          <button
            disabled
            className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed"
          >
            No Wallets Available
          </button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'State when no Solana wallet extensions are detected in browser. Shows install instructions with links. **Note**: Disable all Solana wallet extensions to see this state.',
      },
    },
  },
};

export const ConnectionRejected: Story = {
  args: {
    selectedTargetCluster: undefined,
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when user rejects wallet connection request in wallet popup. Shows error message and allows retry. **Note**: Reject wallet connection popup to see.',
      },
    },
  },
};

export const LocalValidatorWorkflow: Story = {
  args: {
    selectedTargetCluster: 'devnet',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete local development workflow. Wallet (Backpack) connected to localhost validator (http://127.0.0.1:8899). Shows custom RPC detection, balance from local endpoint, and recommendation to select Devnet as target. **Use Case**: NFT development and testing with local Solana validator. **Note**: Requires local validator running and wallet configured.',
      },
    },
  },
};

export const MainnetProductionWorkflow: Story = {
  args: {
    selectedTargetCluster: 'mainnet-beta',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Production workflow on Mainnet Beta. Wallet connected to mainnet with real SOL. Target cluster set to mainnet-beta. All green status indicators showing ready state. **Use Case**: Real NFT bridging on production network. **Note**: Use with caution - real SOL and NFTs.',
      },
    },
  },
};

export const DevnetTestingWorkflow: Story = {
  args: {
    selectedTargetCluster: 'devnet',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Testing workflow on Devnet. Wallet connected to devnet with free SOL from faucet. Target cluster set to devnet. All status indicators showing ready state. **Use Case**: Safe testing environment with free test tokens. **Note**: Use https://faucet.solana.com/ for free devnet SOL.',
      },
    },
  },
};

export const Interactive: Story = {
  args: {
    selectedTargetCluster: undefined,
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive demo. Connect your wallet, select clusters, and explore all states. Actions are logged to console. **Instructions**: 1) Click "Connect Wallet", 2) Approve in wallet popup, 3) Select target cluster, 4) Observe status changes.',
      },
    },
  },
};

// Responsive variants
export const Mobile: Story = {
  args: {
    selectedTargetCluster: 'mainnet-beta',
    onTargetClusterChange: () => {},
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized view. Cluster grid stacks vertically for better touch interaction. All features remain accessible. **Note**: Requires wallet connection (mobile wallets or browser extension).',
      },
    },
  },
};

export const Tablet: Story = {
  args: {
    selectedTargetCluster: 'mainnet-beta',
    onTargetClusterChange: () => {},
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Tablet-optimized view with 2-column cluster grid for optimal screen usage.',
      },
    },
  },
};

// Edge cases
export const VeryLongAddress: Story = {
  args: {
    selectedTargetCluster: 'mainnet-beta',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows address truncation behavior. Solana addresses (base58, 44 chars) are shortened to "7WkR...F4z" format for display. Full address shown on hover/click.',
      },
    },
  },
};

export const ZeroBalance: Story = {
  args: {
    selectedTargetCluster: 'devnet',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'State when wallet has 0.0000 SOL balance. Common for new wallets or after spending all tokens. **Tip**: Use Solana faucet for devnet SOL.',
      },
    },
  },
};

export const HighBalance: Story = {
  args: {
    selectedTargetCluster: 'mainnet-beta',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Wallet with large SOL balance (e.g., 1,234.5678 SOL). Tests number formatting and display. **Note**: Balance shown with 4 decimal precision.',
      },
    },
  },
};

export const SlowRPCEndpoint: Story = {
  args: {
    selectedTargetCluster: 'mainnet-beta',
    onTargetClusterChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Behavior with slow/laggy RPC endpoint. Balance loading may take longer. Consider upgrading to paid RPC provider for better performance. **Note**: Free RPC endpoints can be slow during high traffic.',
      },
    },
  },
};

// Documentation-focused stories
export const RPCEndpointExplanation: Story = {
  render: () => (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-xl font-bold mb-4">How RPC Detection Works</h3>
        
        <div className="space-y-4 text-sm">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">1. Standard RPC (Mainnet/Devnet/Testnet)</h4>
            <p className="text-blue-800 mb-2">
              When connected to standard networks, the component uses the cluster name from your wallet connection.
            </p>
            <code className="text-xs bg-white px-2 py-1 rounded border block">
              https://api.mainnet-beta.solana.com
            </code>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">2. Custom RPC Detection</h4>
            <p className="text-purple-800 mb-2">
              The component intelligently detects when your wallet (especially Backpack) is using a custom RPC endpoint:
            </p>
            <ul className="list-disc list-inside text-purple-700 text-xs space-y-1">
              <li>Checks <code>window.backpack.connection.rpcEndpoint</code></li>
              <li>Checks <code>window.solana.connection.rpcEndpoint</code></li>
              <li>Falls back to ConnectionProvider endpoint</li>
              <li>Compares against known cluster endpoints</li>
            </ul>
            <code className="text-xs bg-white px-2 py-1 rounded border block mt-2">
              http://127.0.0.1:8899 (localhost validator)
            </code>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">3. Balance Fetching</h4>
            <p className="text-green-800 mb-2">
              Uses the <strong>actual</strong> RPC endpoint from your wallet to fetch balance, not the default provider:
            </p>
            <code className="text-xs bg-white px-2 py-1 rounded border block">
              {`const actualConnection = new Connection(actualRpcEndpoint)`}
            </code>
            <p className="text-green-700 text-xs mt-2">
              This ensures accurate balance even with custom RPC endpoints.
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Technical explanation of RPC endpoint detection mechanism used by the component.',
      },
    },
  },
};

export const ClusterSelectionGuide: Story = {
  render: () => (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-xl font-bold mb-4">Cluster Selection Guide</h3>
        
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-1">Mainnet Beta</h4>
            <p className="text-sm text-gray-700 mb-2">Production network with real value</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Use for production NFT bridging</li>
              <li>• Requires real SOL for transactions</li>
              <li>• Highest security and reliability</li>
              <li>• Live on Solscan explorer</li>
            </ul>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-1">Devnet</h4>
            <p className="text-sm text-gray-700 mb-2">Development and testing network</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Best for testing NFT bridging workflows</li>
              <li>• Free SOL from faucet</li>
              <li>• Safe environment for experimentation</li>
              <li>• Use before mainnet deployment</li>
            </ul>
          </div>

          <div className="border-l-4 border-yellow-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-1">Testnet</h4>
            <p className="text-sm text-gray-700 mb-2">Validator testing network</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• For validator and infrastructure testing</li>
              <li>• Less stable than devnet</li>
              <li>• Free SOL available</li>
              <li>• Not recommended for app development</li>
            </ul>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-1">Custom RPC (Localnet)</h4>
            <p className="text-sm text-gray-700 mb-2">Local validator or custom endpoint</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• For rapid local development</li>
              <li>• Full control over network state</li>
              <li>• Instant transactions and resets</li>
              <li>• Requires local validator setup</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>💡 Recommendation:</strong> Start with <strong>Devnet</strong> for testing, then move to <strong>Mainnet</strong> for production. Use <strong>Localnet</strong> for rapid development iteration.
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comprehensive guide to choosing the right Solana cluster for your use case.',
      },
    },
  },
};
