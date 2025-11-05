import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { 
  useSolana, 
  isValidSolanaAddress, 
  shortenAddress, 
  getExplorerUrl, 
  getAccountExplorerUrl 
} from '../../hooks/useSolana';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaWalletProvider } from '../../provider/SolanaWalletProvider';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import { Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
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

// Query client for stories
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

// Provider wrapper for Solana hooks
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

/**
 * SolanaHooksDemo - Demonstrates Solana wallet hooks and helper functions
 */
function SolanaHooksDemo() {
  const {
    publicKey,
    address,
    connected,
    connecting,
    disconnecting,
    wallet,
    wallets,
    isDetected,
    connection,
    cluster,
    actualRpcEndpoint,
    connect,
    disconnect,
    openWalletModal,
    signTransaction,
    signAllTransactions,
    signMessage,
    sendTransaction,
  } = useSolana();

  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const [testAddress, setTestAddress] = useState('7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z');
  const [balance, setBalance] = useState<number | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setLastAction('Connecting...');
    try {
      await connect();
      setLastAction('✅ Connected successfully');
    } catch (error) {
      console.error('Connection failed:', error);
      setLastAction(`❌ Connection failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setLastAction('Disconnecting...');
    try {
      await disconnect();
      setLastAction('✅ Disconnected successfully');
      setBalance(null);
    } catch (error) {
      console.error('Disconnect failed:', error);
      setLastAction(`❌ Disconnect failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetBalance = async () => {
    if (!publicKey) {
      setLastAction('❌ No wallet connected');
      return;
    }
    setLoading(true);
    setLastAction('Fetching balance...');
    try {
      const balanceLamports = await connection.getBalance(publicKey);
      const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
      setBalance(balanceSOL);
      setLastAction(`✅ Balance: ${balanceSOL} SOL`);
    } catch (error) {
      console.error('Balance fetch failed:', error);
      setLastAction(`❌ Balance fetch failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignMessage = async () => {
    if (!publicKey) {
      setLastAction('❌ No wallet connected');
      return;
    }
    setLoading(true);
    setLastAction('Signing message...');
    try {
      const message = new TextEncoder().encode('Hello from Storybook!');
      const signature = await signMessage(message);
      setLastAction(`✅ Message signed: ${signature.slice(0, 8)}...`);
    } catch (error) {
      console.error('Message signing failed:', error);
      setLastAction(`❌ Signing failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignTransaction = async () => {
    if (!publicKey) {
      setLastAction('❌ No wallet connected');
      return;
    }
    setLoading(true);
    setLastAction('Signing transaction...');
    try {
      const { blockhash } = await connection.getLatestBlockhash();
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: publicKey,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 1000,
        })
      );

      const signedTx = await signTransaction(transaction);
      setLastAction(`✅ Transaction signed successfully`);
    } catch (error) {
      console.error('Transaction signing failed:', error);
      setLastAction(`❌ Signing failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-2xl font-bold mb-2">Solana Wallet Hooks</h2>
        <p className="text-gray-600">
          Interactive demonstration of <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">useSolana()</code> hook and helper functions
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-xl font-bold mb-4">Connection Status</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700">Wallet Detection</h4>
            <div className={`px-3 py-2 rounded ${isDetected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isDetected ? `✅ ${wallets.length} wallet(s) detected` : '❌ No wallets detected'}
            </div>
            {wallets.length > 0 && (
              <div className="text-xs text-gray-600 space-y-1">
                {wallets.map((w, i) => (
                  <div key={i}>• {w.adapter.name}</div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700">Connection State</h4>
            <div className={`px-3 py-2 rounded ${
              connecting ? 'bg-yellow-100 text-yellow-800' :
              disconnecting ? 'bg-orange-100 text-orange-800' :
              connected ? 'bg-green-100 text-green-800' : 
              'bg-gray-100 text-gray-600'
            }`}>
              {connecting ? '⏳ Connecting...' :
               disconnecting ? '⏳ Disconnecting...' :
               connected ? '✅ Connected' : 
               '❌ Disconnected'}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700">Network Cluster</h4>
            <div className="px-3 py-2 rounded bg-blue-100 text-blue-800">
              {cluster}
            </div>
            <div className="text-xs text-gray-600 break-all">
              RPC: {actualRpcEndpoint}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700">Wallet Info</h4>
            {wallet ? (
              <div className="px-3 py-2 rounded bg-purple-100 text-purple-800">
                {wallet.adapter.name}
              </div>
            ) : (
              <div className="px-3 py-2 rounded bg-gray-100 text-gray-600">
                No wallet selected
              </div>
            )}
          </div>
        </div>

        {address && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Wallet Address</h4>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Full:</span>
                <code className="ml-2 text-xs bg-white px-2 py-1 rounded border break-all">
                  {address}
                </code>
              </div>
              <div className="text-sm">
                <span className="font-medium">Shortened:</span>
                <code className="ml-2 text-xs bg-white px-2 py-1 rounded border">
                  {shortenAddress(address)}
                </code>
              </div>
              <div className="text-sm">
                <a 
                  href={getAccountExplorerUrl(address, cluster)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View on Explorer →
                </a>
              </div>
            </div>
            {balance !== null && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <span className="font-medium text-blue-800">Balance:</span>
                <span className="ml-2 text-blue-700">{balance.toFixed(4)} SOL</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {!connected ? (
            <>
              <button
                onClick={handleConnect}
                disabled={loading || connecting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
              <button
                onClick={openWalletModal}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                Open Wallet Modal
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDisconnect}
                disabled={loading || disconnecting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
              <button
                onClick={handleGetBalance}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Get Balance
              </button>
            </>
          )}
        </div>

        {lastAction && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700 font-mono">
            Last Action: {lastAction}
          </div>
        )}
      </div>

      {/* Signing Operations */}
      {connected && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-xl font-bold mb-4">Signing Operations</h3>
          <p className="text-gray-600 mb-4 text-sm">
            These operations require wallet approval and demonstrate the signing capabilities.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleSignMessage}
              disabled={loading}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-left"
            >
              <span className="font-semibold">Sign Message</span>
              <span className="block text-xs opacity-80">Sign arbitrary message with wallet</span>
            </button>

            <button
              onClick={handleSignTransaction}
              disabled={loading}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-left"
            >
              <span className="font-semibold">Sign Transaction</span>
              <span className="block text-xs opacity-80">Sign a test transaction (not sent)</span>
            </button>
          </div>
        </div>
      )}

      {/* Helper Functions Demo */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-xl font-bold mb-4">Helper Functions</h3>
        
        <div className="space-y-4">
          {/* Address Validation */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">isValidSolanaAddress()</h4>
            <div className="space-y-2">
              <input
                type="text"
                value={testAddress}
                onChange={(e) => setTestAddress(e.target.value)}
                placeholder="Enter Solana address to validate"
                className="w-full px-3 py-2 border rounded text-sm"
              />
              <div className={`px-3 py-2 rounded text-sm ${
                isValidSolanaAddress(testAddress) 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {isValidSolanaAddress(testAddress) 
                  ? '✅ Valid Solana address' 
                  : '❌ Invalid Solana address'}
              </div>
            </div>
          </div>

          {/* Address Shortening */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">shortenAddress()</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Full:</span>
                <code className="ml-2 text-xs bg-white px-2 py-1 rounded border break-all">
                  {testAddress}
                </code>
              </div>
              <div>
                <span className="font-medium">Shortened (4 chars):</span>
                <code className="ml-2 text-xs bg-white px-2 py-1 rounded border">
                  {isValidSolanaAddress(testAddress) ? shortenAddress(testAddress, 4) : 'Invalid address'}
                </code>
              </div>
              <div>
                <span className="font-medium">Shortened (6 chars):</span>
                <code className="ml-2 text-xs bg-white px-2 py-1 rounded border">
                  {isValidSolanaAddress(testAddress) ? shortenAddress(testAddress, 6) : 'Invalid address'}
                </code>
              </div>
            </div>
          </div>

          {/* Explorer URLs */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Explorer URL Helpers</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Account URL:</span>
                <a 
                  href={isValidSolanaAddress(testAddress) ? getAccountExplorerUrl(testAddress, 'mainnet-beta') : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline text-xs"
                >
                  {isValidSolanaAddress(testAddress) ? 'View on Solscan →' : 'Invalid address'}
                </a>
              </div>
              <div>
                <span className="font-medium">Transaction URL:</span>
                <a 
                  href={getExplorerUrl('5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW', 'mainnet-beta')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline text-xs"
                >
                  View example TX on Solscan →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-xl font-bold mb-4">Code Examples</h3>
        
        <div className="space-y-4">
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
            <div className="text-green-400 mb-2">// Basic Usage</div>
            <div className="space-y-1">
              <div><span className="text-blue-400">const</span> {`{`}</div>
              <div className="ml-4">publicKey,</div>
              <div className="ml-4">connected,</div>
              <div className="ml-4">connect,</div>
              <div className="ml-4">disconnect,</div>
              <div className="ml-4">cluster,</div>
              <div className="ml-4">actualRpcEndpoint</div>
              <div>{`}`} = <span className="text-yellow-400">useSolana</span>();</div>
              <div className="mt-2"><span className="text-purple-400">await</span> <span className="text-yellow-400">connect</span>();</div>
              <div><span className="text-blue-400">console</span>.<span className="text-yellow-400">log</span>(<span className="text-green-300">'Address:'</span>, publicKey?.<span className="text-yellow-400">toBase58</span>());</div>
            </div>
          </div>

          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
            <div className="text-green-400 mb-2">// Transaction Signing</div>
            <div className="space-y-1">
              <div><span className="text-blue-400">const</span> {`{ signTransaction, publicKey }`} = <span className="text-yellow-400">useSolana</span>();</div>
              <div className="mt-2"><span className="text-blue-400">const</span> tx = <span className="text-blue-400">new</span> <span className="text-yellow-400">Transaction</span>().<span className="text-yellow-400">add</span>(</div>
              <div className="ml-4"><span className="text-yellow-400">SystemProgram</span>.<span className="text-yellow-400">transfer</span>({`{`}</div>
              <div className="ml-8">fromPubkey: publicKey,</div>
              <div className="ml-8">toPubkey: destination,</div>
              <div className="ml-8">lamports: amount</div>
              <div className="ml-4">{`})`}</div>
              <div>);</div>
              <div className="mt-2"><span className="text-blue-400">const</span> signed = <span className="text-purple-400">await</span> <span className="text-yellow-400">signTransaction</span>(tx);</div>
            </div>
          </div>

          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
            <div className="text-green-400 mb-2">// Helper Functions</div>
            <div className="space-y-1">
              <div><span className="text-green-400">// Validate address</span></div>
              <div><span className="text-blue-400">const</span> valid = <span className="text-yellow-400">isValidSolanaAddress</span>(addressStr);</div>
              <div className="mt-2"><span className="text-green-400">// Shorten for display</span></div>
              <div><span className="text-blue-400">const</span> short = <span className="text-yellow-400">shortenAddress</span>(address, <span className="text-orange-400">4</span>);</div>
              <div className="mt-2"><span className="text-green-400">// Get explorer URL</span></div>
              <div><span className="text-blue-400">const</span> url = <span className="text-yellow-400">getExplorerUrl</span>(signature, cluster);</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'Hooks/Solana Hooks',
  component: SolanaHooksDemo,
  decorators: [withSolanaProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Solana Wallet Hook

The \`useSolana()\` hook provides a comprehensive interface for Solana wallet interactions, wrapping the @solana/wallet-adapter-react hooks with a clean, consistent API.

### Features

- **Wallet Connection Management** - Connect, disconnect, and manage wallet state
- **Public Key Access** - Access user's Solana address and public key
- **Transaction Operations** - Sign and send transactions
- **Message Signing** - Sign arbitrary messages with wallet
- **Network Detection** - Automatically detect cluster and RPC endpoint
- **Wallet Detection** - Detect available browser wallets
- **Helper Functions** - Address validation, shortening, and explorer URLs

### Hook Returns

\`\`\`typescript
const {
  // Wallet State
  publicKey: PublicKey | null,
  address: string | null,
  connected: boolean,
  connecting: boolean,
  disconnecting: boolean,
  wallet: Wallet | null,
  wallets: Wallet[],
  isDetected: boolean,
  
  // Connection Info
  connection: Connection,
  cluster: SolanaCluster,
  actualRpcEndpoint: string,
  
  // Actions
  connect: () => Promise<void>,
  disconnect: () => Promise<void>,
  select: (walletName: string) => void,
  openWalletModal: () => void,
  closeWalletModal: () => void,
  
  // Signing
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  signAllTransactions: (txs: Transaction[]) => Promise<Transaction[]>,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  
  // Sending
  sendTransaction: (tx: Transaction, options?: SendOptions) => Promise<string>,
} = useSolana();
\`\`\`

### Helper Functions

#### isValidSolanaAddress(address: string): boolean
Validates if a string is a valid Solana public key.

\`\`\`typescript
const isValid = isValidSolanaAddress('7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z');
// Returns: true
\`\`\`

#### shortenAddress(address: string | PublicKey, chars?: number): string
Shortens an address for display purposes.

\`\`\`typescript
const short = shortenAddress('7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z', 4);
// Returns: '7WkR...F4z'
\`\`\`

#### getExplorerUrl(signature: string, cluster?: SolanaCluster): string
Gets Solscan explorer URL for a transaction.

\`\`\`typescript
const url = getExplorerUrl(signature, 'mainnet-beta');
// Returns: 'https://solscan.io/tx/{signature}'
\`\`\`

#### getAccountExplorerUrl(address: string | PublicKey, cluster?: SolanaCluster): string
Gets Solscan explorer URL for an account.

\`\`\`typescript
const url = getAccountExplorerUrl(publicKey, 'devnet');
// Returns: 'https://solscan.io/account/{address}?cluster=devnet'
\`\`\`

### Usage Patterns

#### Basic Connection
\`\`\`tsx
const { connect, disconnect, connected, address } = useSolana();

function WalletButton() {
  return connected ? (
    <button onClick={disconnect}>
      Disconnect {shortenAddress(address!)}
    </button>
  ) : (
    <button onClick={connect}>Connect Wallet</button>
  );
}
\`\`\`

#### Transaction Signing
\`\`\`tsx
const { signTransaction, publicKey, connection } = useSolana();

async function transferTokens(destination: PublicKey, amount: number) {
  const { blockhash } = await connection.getLatestBlockhash();
  
  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: publicKey,
  }).add(
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: destination,
      lamports: amount,
    })
  );
  
  const signed = await signTransaction(transaction);
  return signed;
}
\`\`\`

#### Network Information
\`\`\`tsx
const { cluster, actualRpcEndpoint } = useSolana();

function NetworkInfo() {
  return (
    <div>
      <p>Network: {cluster}</p>
      <p>RPC: {actualRpcEndpoint}</p>
    </div>
  );
}
\`\`\`

### RPC Endpoint Detection

The hook includes intelligent RPC endpoint detection that works with various wallet providers:

- **Backpack Wallet** - Detects custom RPC from window.backpack
- **Phantom Wallet** - Detects from window.solana  
- **Generic Wallets** - Falls back to ConnectionProvider endpoint
- **Localhost Support** - Automatically detects local validators

This ensures your application always knows the actual network the user's wallet is connected to, even when they've configured a custom RPC endpoint.

### Supported Wallets

The hook works with all Solana Wallet Adapter compatible wallets:
- Phantom
- Backpack
- Solflare
- Glow
- Torus
- Ledger
- And many more...

### Error Handling

All async methods (connect, disconnect, signing, sending) throw errors that should be caught and handled:

\`\`\`tsx
try {
  await connect();
} catch (error) {
  console.error('Connection failed:', error);
  // Show error message to user
}
\`\`\`

### Provider Requirements

This hook requires the following provider chain:

\`\`\`tsx
<SolanaWalletProvider>
  <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
    <AgentProvider network="local">
      <QueryClientProvider client={queryClient}>
        <YourComponent />
      </QueryClientProvider>
    </AgentProvider>
  </IdentityKitProvider>
</SolanaWalletProvider>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SolanaHooksDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive demonstration of useSolana hook with full wallet connection, signing, and helper function examples.',
      },
    },
  },
};

export const WalletNotDetected: Story = {
  render: () => (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">No Wallet Detected</h2>
        <div className="space-y-4">
          <div className="px-3 py-2 rounded bg-red-100 text-red-800">
            ❌ No Solana wallets detected in browser
          </div>
          <p className="text-gray-600 text-sm">
            To use Solana features, please install a wallet extension like:
          </p>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>• <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Phantom Wallet</a></li>
            <li>• <a href="https://backpack.app/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Backpack Wallet</a></li>
            <li>• <a href="https://solflare.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Solflare Wallet</a></li>
          </ul>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'State when no Solana wallet extensions are detected in the browser.',
      },
    },
  },
};

export const ConnectedState: Story = {
  render: () => (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-xl font-bold">Connected State</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="px-3 py-2 rounded bg-green-100 text-green-800">
            ✅ Connected
          </div>
          <div className="px-3 py-2 rounded bg-blue-100 text-blue-800">
            mainnet-beta
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Wallet Address</h4>
          <code className="text-xs bg-white px-2 py-1 rounded border break-all">
            7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z
          </code>
          <div className="mt-2 text-sm text-blue-700">
            Balance: 10.5234 SOL
          </div>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Disconnect
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Get Balance
          </button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'State when wallet is successfully connected with address and balance displayed.',
      },
    },
  },
};

export const LoadingStates: Story = {
  render: () => (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-semibold mb-3">Connecting State</h3>
        <div className="px-3 py-2 rounded bg-yellow-100 text-yellow-800">
          ⏳ Connecting to wallet...
        </div>
        <button disabled className="mt-3 px-4 py-2 bg-blue-600 text-white rounded opacity-50">
          Connecting...
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-semibold mb-3">Disconnecting State</h3>
        <div className="px-3 py-2 rounded bg-orange-100 text-orange-800">
          ⏳ Disconnecting from wallet...
        </div>
        <button disabled className="mt-3 px-4 py-2 bg-red-600 text-white rounded opacity-50">
          Disconnecting...
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading states during connection and disconnection operations.',
      },
    },
  },
};

export const HelperFunctions: Story = {
  render: () => (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-xl font-bold mb-4">Helper Functions</h2>
        
        {/* Address Validation */}
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">isValidSolanaAddress()</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <code className="text-xs">7WkR...F4z</code>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">✅ Valid</span>
            </div>
            <div className="flex justify-between">
              <code className="text-xs">invalid-address</code>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">❌ Invalid</span>
            </div>
          </div>
        </div>

        {/* Address Shortening */}
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">shortenAddress()</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Original:</span>
              <code className="ml-2 text-xs">7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z</code>
            </div>
            <div>
              <span className="font-medium">Shortened:</span>
              <code className="ml-2 text-xs">7WkR...F4z</code>
            </div>
          </div>
        </div>

        {/* Explorer URLs */}
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Explorer URLs</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Account:</span>
              <a href="#" className="ml-2 text-blue-600 hover:underline text-xs">
                View on Solscan →
              </a>
            </div>
            <div>
              <span className="font-medium">Transaction:</span>
              <a href="#" className="ml-2 text-blue-600 hover:underline text-xs">
                View TX on Solscan →
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
        story: 'Demonstration of helper functions for address validation, formatting, and explorer URLs.',
      },
    },
  },
};
