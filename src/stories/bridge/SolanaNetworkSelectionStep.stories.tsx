import type { Meta, StoryObj } from '@storybook/react';
import { SolanaNetworkSelectionStep } from '../../components/bridge/SolanaNetworkSelectionStep';
import type { SolanaNetworkSelectionStepProps } from '../../components/bridge/SolanaNetworkSelectionStep';
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
  title: 'Bridge/SolanaNetworkSelectionStep',
  component: SolanaNetworkSelectionStep,
  decorators: [withSolanaProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## SolanaNetworkSelectionStep Component

A streamlined component for combined wallet connection and Solana network selection in the NFT bridge. Used in import/export wizards where users need to specify their target Solana network.

### Features
- **Integrated Wallet Connection**: Built-in wallet connection UI with Phantom/Solflare/Backpack support
- **Network Selection Grid**: Visual cards for mainnet, devnet, testnet, and localnet
- **Network Details**: Each network shows endpoint URL, explorer link, and description
- **Helpful Information**: Educational content about each network type
- **Faucet Links**: Direct links to SOL faucets for testnet networks
- **Network Configuration Display**: Shows selected network details with warnings for mainnet

### Supported Networks

#### Mainnet Beta
- **Purpose**: Production network with real SOL
- **Endpoint**: \`https://api.mainnet-beta.solana.com\`
- **Explorer**: Solana Explorer (mainnet)
- **Use Case**: Live NFT bridging with real value
- **Warning**: Requires real SOL for transactions

#### Devnet
- **Purpose**: Development and testing network
- **Endpoint**: \`https://api.devnet.solana.com\`
- **Explorer**: Solana Explorer (devnet)
- **Use Case**: Safe testing environment
- **Benefits**: Free SOL from faucets, no real value risk

#### Testnet
- **Purpose**: Validator stress testing
- **Endpoint**: \`https://api.testnet.solana.com\`
- **Explorer**: Solana Explorer (testnet)
- **Use Case**: Network stress testing
- **Note**: Less stable than devnet, may experience downtime

#### Localnet
- **Purpose**: Local development with Solana validator
- **Endpoint**: \`http://127.0.0.1:8899\`
- **Explorer**: Local (or devnet fallback)
- **Use Case**: Rapid local development
- **Requirements**: Local Solana validator running

### User Journey
1. **Connect Wallet**: Click "Connect Wallet" to open wallet selection modal
2. **Approve Connection**: Approve connection in wallet popup (Phantom/Backpack/Solflare)
3. **View Wallet Info**: See connected address, wallet name
4. **Select Network**: Choose target Solana network from grid
5. **Review Configuration**: See selected network details and any warnings
6. **Access Faucets**: Use faucet links if testing on devnet/testnet

### Integration with ICRC-99
This component's network selection feeds into the ICRC-99 orchestrator's \`MapNetwork\` configuration:

\`\`\`motoko
// Orchestrator network mapping example
MapNetwork = record {
  network = variant { Solana = variant { Devnet = null } };
  service = variant {
    Solana = record {
      rpc = variant { Provider = 0 };
      canisterId = principal "tghme-zyaaa-aaaar-qarca-cai";
    }
  };
  action = variant { Add };
}
\`\`\`

The selected network determines which Solana service canister to use for bridging operations.

### Differences from SolanaConnectionStep

**SolanaNetworkSelectionStep** (this component):
- Simpler, streamlined UI focused on network selection
- Used in import wizard where quick network choice is needed
- Network-first flow (pick network, then use it)
- Educational content about each network

**SolanaConnectionStep**:
- More comprehensive with cluster/target distinction
- Custom RPC detection for local development
- Balance display and RPC endpoint information
- Used in export wizard with advanced features
- Cluster mismatch detection and warnings

Choose SolanaNetworkSelectionStep when you need a simple "connect and pick network" flow. Use SolanaConnectionStep when you need advanced features like custom RPC detection and cluster validation.

### Props

\`\`\`typescript
interface SolanaNetworkSelectionStepProps {
  selectedNetwork?: string;        // Currently selected network name
  onNetworkChange: (               // Callback when network is selected
    network: string,               // Network name (mainnet-beta, devnet, etc.)
    endpoint: string               // RPC endpoint URL
  ) => void;
}
\`\`\`

### Usage Example

\`\`\`tsx
function MyBridgeComponent() {
  const [selectedNetwork, setSelectedNetwork] = useState<string>();
  const [rpcEndpoint, setRpcEndpoint] = useState<string>();

  const handleNetworkChange = (network: string, endpoint: string) => {
    console.log('Network selected:', network);
    console.log('RPC endpoint:', endpoint);
    setSelectedNetwork(network);
    setRpcEndpoint(endpoint);
  };

  return (
    <SolanaNetworkSelectionStep
      selectedNetwork={selectedNetwork}
      onNetworkChange={handleNetworkChange}
    />
  );
}
\`\`\`

### Network Configuration Object

Each network option includes:
- **id**: Unique identifier
- **name**: Technical name (mainnet-beta, devnet, testnet, localnet)
- **displayName**: User-friendly name (Mainnet Beta, Devnet, etc.)
- **endpoint**: RPC endpoint URL
- **icon**: Display icon (◎ for standard networks, ⚡ for localnet)
- **explorer**: Block explorer base URL
- **description**: Brief explanation of network purpose

### Educational Content

The component includes a help section explaining:
- **Mainnet Beta**: Production network usage and real SOL warning
- **Devnet**: Testing with free SOL from faucets
- **Testnet**: Stress testing network characteristics
- **Localnet**: Local validator setup requirements
- **Faucet Links**: Direct links to get free test SOL

### Responsive Design
- **Desktop**: 2-column network grid for easy comparison
- **Tablet**: 2-column grid maintained
- **Mobile**: Single-column stack for better touch targets

### State Management
Component manages internal states:
- **isConnecting**: Loading state during wallet connection
- Wallet connection state from \`useSolana()\` hook
- Selected network tracked via props (controlled component)
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    selectedNetwork: {
      control: { type: 'select' },
      options: [undefined, 'mainnet-beta', 'devnet', 'testnet', 'localnet'],
      description: 'Currently selected Solana network name',
      table: {
        type: { summary: 'string | undefined' },
        defaultValue: { summary: 'undefined' },
      },
    },
    onNetworkChange: {
      action: 'network-changed',
      description: 'Callback fired when user selects a network. Receives network name and RPC endpoint.',
      table: {
        type: { summary: '(network: string, endpoint: string) => void' },
      },
    },
  },
} satisfies Meta<typeof SolanaNetworkSelectionStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    onNetworkChange: () => {},
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaNetworkSelectionStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaNetworkSelectionStep</code> component provides a streamlined interface for 
              wallet connection and Solana network selection in NFT bridge wizards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Integrated wallet connection UI</li>
                <li>• Network selection grid (4 networks)</li>
                <li>• Educational content about each network</li>
                <li>• Direct links to SOL faucets</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Visual network cards</li>
                <li>• Endpoint URL display</li>
                <li>• Network warnings (mainnet)</li>
                <li>• Simpler than SolanaConnectionStep</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🌐 Available Networks</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-purple-300">
                <div className="flex items-center mb-2">
                  <div className="text-2xl mr-3">◎</div>
                  <div>
                    <div className="font-medium text-gray-900">Mainnet Beta</div>
                    <div className="text-xs text-gray-500">https://api.mainnet-beta.solana.com</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">Production network with real SOL - use with caution</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-green-300">
                <div className="flex items-center mb-2">
                  <div className="text-2xl mr-3">◎</div>
                  <div>
                    <div className="font-medium text-gray-900">Devnet</div>
                    <div className="text-xs text-gray-500">https://api.devnet.solana.com</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">Testing network with free SOL from faucets - recommended</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-yellow-300">
                <div className="flex items-center mb-2">
                  <div className="text-2xl mr-3">◎</div>
                  <div>
                    <div className="font-medium text-gray-900">Testnet</div>
                    <div className="text-xs text-gray-500">https://api.testnet.solana.com</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">Validator testing - less stable, not for app development</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-blue-300">
                <div className="flex items-center mb-2">
                  <div className="text-2xl mr-3">⚡</div>
                  <div>
                    <div className="font-medium text-gray-900">Localnet</div>
                    <div className="text-xs text-gray-500">http://127.0.0.1:8899</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">Local validator for rapid development - full control</div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">🔄 Selection Flow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-medium text-sm text-gray-900">Connect Wallet</div>
                <div className="text-xs text-gray-600 mt-1">Phantom/Backpack/Solflare</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-medium text-sm text-gray-900">Select Network</div>
                <div className="text-xs text-gray-600 mt-1">Click network card</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-medium text-sm text-gray-900">Review Config</div>
                <div className="text-xs text-gray-600 mt-1">See endpoint + warnings</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">💡 Recommended Development Flow</h2>
            <div className="space-y-3 text-yellow-800">
              <p><strong>1. Localnet:</strong> Rapid development on local validator (instant transactions)</p>
              <p><strong>2. Devnet:</strong> Integration testing with shared network (free SOL from faucets)</p>
              <p><strong>3. Testnet:</strong> (Optional) Stress testing if needed</p>
              <p><strong>4. Mainnet:</strong> Production deployment with real users and value</p>
              <p className="pt-2 border-t border-yellow-300 mt-4">
                <strong>Faucets:</strong> Use <a href="https://faucet.solana.com/" className="underline">faucet.solana.com</a> or <a href="https://solfaucet.com/" className="underline">solfaucet.com</a> for free devnet/testnet SOL
              </p>
            </div>
          </div>
        </div>
      )
    }
  }
};

export const Default: Story = {
  args: {
    selectedNetwork: undefined,
    onNetworkChange: (network: string, endpoint: string) => {
      console.log('Network changed:', network, endpoint);
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state showing wallet connection prompt and network selection grid. Networks are selectable after wallet connects. **Note**: Install Phantom/Backpack wallet to test connection.',
      },
    },
  },
};

export const MainnetSelected: Story = {
  args: {
    selectedNetwork: 'mainnet-beta',
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Mainnet Beta selected with warning about real SOL usage. Shows production network configuration with mainnet explorer link. **Use Case**: Production NFT bridging.',
      },
    },
  },
};

export const DevnetSelected: Story = {
  args: {
    selectedNetwork: 'devnet',
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Devnet selected - most common for testing. Shows configuration with devnet explorer link. No warnings since test network. **Use Case**: Safe testing with free SOL.',
      },
    },
  },
};

export const TestnetSelected: Story = {
  args: {
    selectedNetwork: 'testnet',
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Testnet selected for validator testing. Less commonly used than devnet. Shows testnet configuration. **Use Case**: Validator stress testing.',
      },
    },
  },
};

export const LocalnetSelected: Story = {
  args: {
    selectedNetwork: 'localnet',
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Localnet (localhost validator) selected with reminder to run local validator at http://127.0.0.1:8899. **Use Case**: Rapid local development. **Requirements**: Local Solana validator running.',
      },
    },
  },
};

export const WalletNotConnected: Story = {
  args: {},
  render: () => (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Solana Wallet</h3>
        <p className="text-gray-600">
          Connect your Phantom or compatible wallet, then select your target network.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Step 1: Connect Wallet
        </label>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center w-full">
            <div className="text-4xl mb-2">👻</div>
            <p className="text-gray-600 mb-2">No Solana wallet connected</p>
            <p className="text-sm text-gray-500 mb-4">
              Please install a Solana wallet extension like Phantom
            </p>
            <button className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
              Connect Wallet
            </button>
            <div className="mt-4">
              <a href="https://phantom.app/" target="_blank" className="text-sm text-cyan-600 hover:text-cyan-700">
                Get Phantom Wallet →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Initial disconnected state with Phantom ghost icon and link to install wallet. Shows helpful guidance to get started.',
      },
    },
  },
};

export const WalletConnected: Story = {
  args: {
    selectedNetwork: undefined,
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Wallet connected state showing green success indicator with address. Network grid now active for selection. **Note**: Requires wallet connection to see this state.',
      },
    },
  },
};

export const PhantomWallet: Story = {
  args: {
    selectedNetwork: 'devnet',
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected with Phantom wallet (most popular). Shows "Using: Phantom" in connection status. Devnet selected for testing. **Note**: Requires Phantom wallet extension.',
      },
    },
  },
};

export const BackpackWallet: Story = {
  args: {
    selectedNetwork: 'localnet',
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected with Backpack wallet. Localnet selected - common with Backpack for local development. Shows "Using: Backpack". **Note**: Requires Backpack wallet extension.',
      },
    },
  },
};

export const SolflareWallet: Story = {
  args: {
    selectedNetwork: 'mainnet-beta',
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Connected with Solflare wallet on mainnet. Shows "Using: Solflare" with mainnet warning. **Note**: Requires Solflare wallet extension.',
      },
    },
  },
};

export const ConnectingState: Story = {
  args: {},
  render: () => (
    <div className="max-w-2xl mx-auto p-6">
      <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
        <div className="text-4xl mb-2">👻</div>
        <p className="text-gray-600 mb-4">No Solana wallet connected</p>
        <button disabled className="px-6 py-3 bg-cyan-600 text-white rounded-lg opacity-50 cursor-not-allowed">
          Connecting...
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading state during wallet connection. Button shows "Connecting..." and is disabled. **Note**: Click "Connect Wallet" to see this state briefly.',
      },
    },
  },
};

export const NoWalletInstalled: Story = {
  args: {},
  render: () => (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Solana Wallet</h3>
        <p className="text-gray-600">
          Connect your Phantom or compatible wallet, then select your target network.
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center w-full">
          <div className="text-4xl mb-2">👻</div>
          <p className="text-gray-600 mb-2">No Solana wallet detected</p>
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
            <p className="text-sm text-amber-800 font-medium mb-2">⚠️ No Wallet Extension Found</p>
            <p className="text-xs text-amber-700 mb-2">
              Please install a Solana wallet extension:
            </p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li><a href="https://phantom.app/" className="underline hover:text-amber-900">Phantom Wallet</a></li>
              <li><a href="https://backpack.app/" className="underline hover:text-amber-900">Backpack Wallet</a></li>
              <li><a href="https://solflare.com/" className="underline hover:text-amber-900">Solflare Wallet</a></li>
            </ul>
          </div>
          <button disabled className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed">
            No Wallets Available
          </button>
          <div className="mt-4">
            <a href="https://phantom.app/" className="text-sm text-cyan-600 hover:text-cyan-700">
              Get Phantom Wallet →
            </a>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'State when no Solana wallet extensions are detected. Shows amber warning with install links for Phantom, Backpack, and Solflare. **Note**: Disable all wallet extensions to see.',
      },
    },
  },
};

export const NetworkConfigurationShown: Story = {
  args: {
    selectedNetwork: 'devnet',
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows network configuration panel after selection. Displays network name, full endpoint URL, and helpful tips. Cyan info box with all details.',
      },
    },
  },
};

export const MainnetWithWarning: Story = {
  args: {
    selectedNetwork: 'mainnet-beta',
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Mainnet selected with yellow warning box about real SOL usage. Alerts user to verify sufficient balance. Important for preventing failed transactions.',
      },
    },
  },
};

export const LocalnetWithTip: Story = {
  args: {
    selectedNetwork: 'localnet',
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Localnet selected with blue tip box reminding user to start local validator. Shows exact endpoint URL (http://127.0.0.1:8899).',
      },
    },
  },
};

export const WithEducationalContent: Story = {
  args: {
    selectedNetwork: 'devnet',
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows full educational section about Solana networks. Includes descriptions of all network types and links to SOL faucets for testing.',
      },
    },
  },
};

export const FaucetLinksHighlighted: Story = {
  args: {},
  render: () => (
    <div className="max-w-2xl mx-auto p-6">
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">📚 About Solana Networks</h4>
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <p>
            <span className="font-medium">Devnet:</span> Test network for development. Get free SOL from faucets.
          </p>
        </div>
        
        <div className="p-3 bg-white rounded border border-gray-200">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Need test SOL?</h5>
          <div className="space-y-1">
            <a
              href="https://faucet.solana.com/"
              target="_blank"
              className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center font-semibold"
            >
              Solana Devnet Faucet →
            </a>
            <a
              href="https://solfaucet.com/"
              target="_blank"
              className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center font-semibold"
            >
              Community Faucet →
            </a>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Highlights faucet links section. Shows two faucet options for getting free test SOL on devnet/testnet. Essential for testing without real funds.',
      },
    },
  },
};

export const MultipleNetworksComparison: Story = {
  args: {},
  render: () => (
    <div className="max-w-3xl mx-auto p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Compare Solana Networks</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 border-2 border-cyan-500 bg-cyan-50 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-3">◎</span>
            <div>
              <h4 className="font-medium text-gray-900">Mainnet Beta</h4>
              <p className="text-xs text-gray-500">https://api.mainnet-beta...</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">Solana production network with real SOL</p>
          <div className="flex items-center text-sm text-cyan-700">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Selected
          </div>
        </div>

        <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-3">◎</span>
            <div>
              <h4 className="font-medium text-gray-900">Devnet</h4>
              <p className="text-xs text-gray-500">https://api.devnet.solana...</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Solana test network for development</p>
        </div>

        <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-3">◎</span>
            <div>
              <h4 className="font-medium text-gray-900">Testnet</h4>
              <p className="text-xs text-gray-500">https://api.testnet.solana...</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Solana test network for testing</p>
        </div>

        <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-3">⚡</span>
            <div>
              <h4 className="font-medium text-gray-900">Localnet</h4>
              <p className="text-xs text-gray-500">http://127.0.0.1:8899...</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Local Solana validator for development</p>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of all four network options. Shows visual distinction between selected (cyan border) and unselected (gray border) networks.',
      },
    },
  },
};

export const Interactive: Story = {
  args: {
    selectedNetwork: undefined,
    onNetworkChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive demo. Connect wallet, select networks, view configuration changes. All actions logged to console. **Instructions**: 1) Connect wallet, 2) Click network cards, 3) Check console for callbacks.',
      },
    },
  },
};

// Responsive variants
export const Mobile: Story = {
  args: {
    selectedNetwork: 'devnet',
    onNetworkChange: () => {},
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized view with single-column network grid. All information remains accessible with larger touch targets.',
      },
    },
  },
};

export const Tablet: Story = {
  args: {
    selectedNetwork: 'devnet',
    onNetworkChange: () => {},
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Tablet view maintaining 2-column grid for optimal screen usage.',
      },
    },
  },
};

// Edge cases
export const RapidNetworkSwitching: Story = {
  args: {
    selectedNetwork: 'mainnet-beta',
    onNetworkChange: (network: string, endpoint: string) => {
      console.log('⚡ Network changed to:', network, 'at', endpoint);
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Test rapid network switching. Click between networks quickly to verify state updates. Watch console for callback firing.',
      },
    },
  },
};

export const LongEndpointUrl: Story = {
  args: {},
  render: () => (
    <div className="max-w-2xl mx-auto p-6">
      <div className="p-4 border-2 border-cyan-500 bg-cyan-50 rounded-lg">
        <div className="flex items-center mb-2">
          <span className="text-2xl mr-3">◎</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900">Custom Network</h4>
            <p className="text-xs text-gray-500 truncate">
              https://solana-mainnet-very-long-url.example.com/v1/rpc...
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows endpoint URL truncation for very long URLs. Prevents layout breaking with ellipsis truncation.',
      },
    },
  },
};

// Documentation-focused stories
export const NetworkComparisonGuide: Story = {
  args: {},
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-xl font-bold mb-4">Solana Network Selection Guide</h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-gray-900">Production Networks</h4>
              
              <div className="border-l-4 border-purple-500 pl-4">
                <h5 className="font-semibold text-gray-900 mb-1">Mainnet Beta</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✅ <strong>Stability:</strong> Highest - production grade</li>
                  <li>💰 <strong>Cost:</strong> Real SOL required</li>
                  <li>🎯 <strong>Best For:</strong> Live NFT bridging</li>
                  <li>⚠️ <strong>Warning:</strong> Real value at risk</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-gray-900">Test Networks</h4>
              
              <div className="border-l-4 border-green-500 pl-4 mb-4">
                <h5 className="font-semibold text-gray-900 mb-1">Devnet</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✅ <strong>Stability:</strong> High - stable for testing</li>
                  <li>🆓 <strong>Cost:</strong> Free SOL from faucets</li>
                  <li>🎯 <strong>Best For:</strong> Development & testing</li>
                  <li>💡 <strong>Tip:</strong> Start here before mainnet</li>
                </ul>
              </div>

              <div className="border-l-4 border-yellow-500 pl-4 mb-4">
                <h5 className="font-semibold text-gray-900 mb-1">Testnet</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>⚠️ <strong>Stability:</strong> Variable - may have outages</li>
                  <li>🆓 <strong>Cost:</strong> Free SOL available</li>
                  <li>🎯 <strong>Best For:</strong> Validator testing</li>
                  <li>❌ <strong>Not Recommended:</strong> App development</li>
                </ul>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h5 className="font-semibold text-gray-900 mb-1">Localnet</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✅ <strong>Stability:</strong> Full control</li>
                  <li>🆓 <strong>Cost:</strong> No network costs</li>
                  <li>🎯 <strong>Best For:</strong> Rapid local iteration</li>
                  <li>🔧 <strong>Requires:</strong> Local validator setup</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-semibold text-blue-900 mb-2">💡 Recommended Development Flow</h5>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li><strong>Localnet:</strong> Rapid development on local validator</li>
              <li><strong>Devnet:</strong> Integration testing with shared network</li>
              <li><strong>Testnet:</strong> (Optional) Stress testing if needed</li>
              <li><strong>Mainnet:</strong> Production deployment with real users</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comprehensive comparison guide showing stability, cost, and use cases for each network type. Includes recommended development flow.',
      },
    },
  },
};

export const ICRC99Integration: Story = {
  args: {},
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-xl font-bold mb-4">ICRC-99 Network Mapping</h3>
        
        <p className="text-gray-700 mb-4">
          The selected network maps to ICRC-99 orchestrator configuration:
        </p>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Devnet Selection Example</h4>
            <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`dfx canister call orchestrator configure '(
  vec {
    variant {
      MapNetwork = record {
        network = variant { Solana = variant { Devnet = null } };
        service = variant {
          Solana = record {
            rpc = variant { Provider = 0 };
            canisterId = principal "tghme-zyaaa-aaaar-qarca-cai";
          }
        };
        action = variant { Add };
      }
    };
  }
)' --network local`}
            </pre>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Network Variant Mapping</h4>
            <table className="w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="text-left p-2">UI Selection</th>
                  <th className="text-left p-2">Orchestrator Variant</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-2"><code>mainnet-beta</code></td>
                  <td className="p-2"><code>{`variant { Solana = variant { Mainnet = null } }`}</code></td>
                </tr>
                <tr>
                  <td className="p-2"><code>devnet</code></td>
                  <td className="p-2"><code>{`variant { Solana = variant { Devnet = null } }`}</code></td>
                </tr>
                <tr>
                  <td className="p-2"><code>testnet</code></td>
                  <td className="p-2"><code>{`variant { Solana = variant { Testnet = null } }`}</code></td>
                </tr>
                <tr>
                  <td className="p-2"><code>localnet</code></td>
                  <td className="p-2"><code>{`variant { Solana = variant { Custom = "http://127.0.0.1:8899" } }`}</code></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The orchestrator uses these network mappings to route NFT bridging operations 
              to the correct Solana service canister and RPC provider configuration.
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows how UI network selection maps to ICRC-99 orchestrator configuration. Includes Motoko code examples and variant mapping table.',
      },
    },
  },
};
