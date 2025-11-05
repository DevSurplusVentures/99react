import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMetaMask, useNetworkManager, useAdvancedGasFees } from '../hooks';

// Simple component to demonstrate EVM hooks
function EVMHooksDemo() {
  const { isDetected, isUnlocked, activeAddress, chainId, connectWallet } = useMetaMask();
  const { supportedNetworks, switchNetwork } = useNetworkManager();
  const { isL2Chain } = useAdvancedGasFees(chainId || 1);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">EVM Hooks Demo</h2>
      
      <div className="space-y-3">
        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-medium text-sm text-gray-700 mb-2">MetaMask Status</h3>
          <div className="text-sm space-y-1">
            <div>Detected: {isDetected ? '✅' : '❌'}</div>
            <div>Connected: {isUnlocked ? '✅' : '❌'}</div>
            <div>Address: {activeAddress ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}` : 'None'}</div>
            <div>Chain ID: {chainId || 'Unknown'}</div>
            <div>L2 Chain: {isL2Chain ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {!isUnlocked && (
          <button
            onClick={connectWallet}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Connect MetaMask
          </button>
        )}

        {isUnlocked && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Switch Networks:</h4>
            {Object.values(supportedNetworks).map((network) => (
              <button
                key={network.chainId}
                onClick={() => switchNetwork(network.chainId)}
                className={`w-full py-2 px-4 text-sm rounded ${
                  chainId === network.chainId
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {network.name} ({network.chainId})
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper with QueryClient
function EVMHooksDemoWithProvider() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <EVMHooksDemo />
    </QueryClientProvider>
  );
}

const meta: Meta<typeof EVMHooksDemoWithProvider> = {
  title: 'Hooks/EVM Hooks Demo',
  component: EVMHooksDemoWithProvider,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
This demo showcases the EVM hooks for MetaMask integration, network management, and gas fee estimation.

**Features:**
- 🦊 MetaMask connection and detection
- 🔗 Multi-network support (Ethereum, Polygon, BSC, Optimism, Base, Arbitrum, Hardhat)
- ⛽ Gas fee estimation with L2 optimizations
- 🎛️ Network switching functionality

**Usage:**
1. Make sure MetaMask is installed
2. Click "Connect MetaMask" to connect your wallet
3. Use the network buttons to switch between supported chains
4. Observe how the L2 detection changes based on the selected network

**Note:** This is a demo component. In a real application, you would integrate these hooks into your bridge interface.
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EVMHooksDemoWithProvider>;

export const Default: Story = {
  name: 'EVM Hooks Integration',
};

export const MetaMaskNotDetected: Story = {
  name: 'MetaMask Not Detected',
  parameters: {
    docs: {
      description: {
        story: 'This shows how the component behaves when MetaMask is not installed or detected.',
      },
    },
  },
  decorators: [
    (Story) => {
      // Mock window.ethereum to be undefined for this story
      // Store original reference (but don't try to serialize it)
      const originalEthereum = (window as any).ethereum;
      (window as any).ethereum = undefined;
      
      // Restore on unmount
      if (typeof window !== 'undefined') {
        // Use a timeout to restore after render
        setTimeout(() => {
          (window as any).ethereum = originalEthereum;
        }, 0);
      }
      
      return (
        <div>
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-sm">
            <strong>Simulated:</strong> MetaMask not detected
          </div>
          <Story />
        </div>
      );
    },
  ],
};

export const L2NetworkDemo: Story = {
  name: 'L2 Network Features',
  parameters: {
    docs: {
      description: {
        story: `
This demo highlights the L2-specific features of the EVM hooks:

- **L2 Detection**: Automatically detects if you're on an L2 network (Polygon, BSC, Optimism, Base, Arbitrum) or local development (Hardhat)
- **Gas Optimization**: Uses L2-specific gas calculations for accurate fee estimation
- **Network Management**: Easy switching between mainnet and L2 networks

Try switching to different networks to see how the L2 detection changes!
        `,
      },
    },
  },
};

export const BridgeIntegration: Story = {
  name: 'Bridge Integration Preview',
  parameters: {
    docs: {
      description: {
        story: `
This shows how the EVM hooks integrate with the ICRC-99 bridge system:

**Bridge Flow:**
1. **Wallet Connection**: User connects MetaMask wallet
2. **Network Setup**: Switch to source chain (e.g., Ethereum)
3. **NFT Approval**: Approve NFT for bridge contract
4. **Gas Estimation**: Calculate bridge transaction costs (including L2 fees)
5. **Bridge Execution**: Execute the cross-chain transfer

**EVM Hooks Used:**
- \`useMetaMask\`: Wallet connection and account management
- \`useNetworkManager\`: Chain switching and network configuration
- \`useERC721Contract\`: NFT contract interactions
- \`useAdvancedGasFees\`: Fee estimation with L2 support
- \`useNFTBridge\`: Complete bridge workflow management

The hooks work seamlessly with the existing \`use99Mutations\` and \`BridgeChecklist\` components.
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <div>
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-medium text-blue-900 mb-2">Bridge Integration Architecture</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <div>• <strong>EVM Layer:</strong> MetaMask, contract interactions, gas estimation</div>
            <div>• <strong>Bridge Layer:</strong> ICRC-99 orchestrator, cross-chain messaging</div>
            <div>• <strong>UI Layer:</strong> BridgeChecklist, progress tracking, user feedback</div>
          </div>
        </div>
        <Story />
      </div>
    ),
  ],
};
