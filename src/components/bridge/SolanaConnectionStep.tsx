import { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { ExternalLink } from 'lucide-react';
import { Connection } from '@solana/web3.js';
import { useSolana } from '../../hooks/useSolana';
import type { SolanaCluster } from '../../types/solana';
import { SOLANA_RPC_ENDPOINTS, SOLANA_EXPLORER_URLS } from '../../types/solana';

export interface SolanaConnectionStepProps {
  selectedTargetCluster?: SolanaCluster;
  onTargetClusterChange?: (cluster: SolanaCluster) => void;
}

interface ClusterOption {
  id: SolanaCluster;
  name: string;
  icon: string;
  rpcEndpoint: string;
  explorer: string;
  nativeCurrency: string;
  description: string;
}

export function SolanaConnectionStep({
  selectedTargetCluster,
  onTargetClusterChange,
}: SolanaConnectionStepProps) {
  const {
    publicKey,
    address,
    connected,
    connecting,
    wallet,
    cluster,
    connection,
    actualRpcEndpoint,
    connect,
    disconnect,
    openWalletModal,
  } = useSolana();

  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Detect if connected to custom/localhost RPC (not a known provider)
  const detectedRpcEndpoint = actualRpcEndpoint || connection?.rpcEndpoint || '';
  
  // List of known production RPC providers (not considered "custom")
  const knownProviders = [
    'mainnet-beta.solana.com',
    'api.mainnet-beta.solana.com',
    'devnet.solana.com',
    'api.devnet.solana.com',
    'testnet.solana.com',
    'api.testnet.solana.com',
    'xnftdata.com',      // Backpack
    'helius-rpc.com',    // Helius
    'rpcpool.com',       // RPCPool
    'quicknode.pro',     // QuickNode
    'genesysgo.net',     // GenesysGo
    'triton.one',        // Triton
    'hellomoon.io',      // HelloMoon
    'syndica.io',        // Syndica
    'blockdaemon.com',   // Blockdaemon
  ];
  
  // Only treat as custom if it's not a known provider AND connected
  const isCustomRpc = connected && detectedRpcEndpoint && 
    !knownProviders.some(provider => detectedRpcEndpoint.includes(provider)) &&
    (detectedRpcEndpoint.includes('localhost') || 
     detectedRpcEndpoint.includes('127.0.0.1') || 
     detectedRpcEndpoint.includes('0.0.0.0') ||
     // Any https endpoint not matching known providers
     (!detectedRpcEndpoint.includes('mainnet') && 
      !detectedRpcEndpoint.includes('devnet') && 
      !detectedRpcEndpoint.includes('testnet')));

  /**
   * Create a connection using the actual RPC endpoint from the wallet
   * This ensures balance queries go to the correct endpoint (e.g., localhost)
   */
  const actualConnection = useMemo(() => {
    if (actualRpcEndpoint) {
      return new Connection(actualRpcEndpoint, 'confirmed');
    }
    return connection;
  }, [actualRpcEndpoint, connection]);

  // Cluster configuration
  const clusterOptions: ClusterOption[] = [
    {
      id: 'mainnet-beta',
      name: 'Solana Mainnet',
      icon: '◎',
      rpcEndpoint: SOLANA_RPC_ENDPOINTS['mainnet-beta'],
      explorer: SOLANA_EXPLORER_URLS['mainnet-beta'],
      nativeCurrency: 'SOL',
      description: 'Production network with real SOL',
    },
    {
      id: 'devnet',
      name: 'Solana Devnet',
      icon: '◎',
      rpcEndpoint: SOLANA_RPC_ENDPOINTS.devnet,
      explorer: SOLANA_EXPLORER_URLS.devnet,
      nativeCurrency: 'SOL',
      description: 'Test network with free SOL from faucet',
    },
    {
      id: 'testnet',
      name: 'Solana Testnet',
      icon: '◎',
      rpcEndpoint: SOLANA_RPC_ENDPOINTS.testnet,
      explorer: SOLANA_EXPLORER_URLS.testnet,
      nativeCurrency: 'SOL',
      description: 'Testing network for validators',
    },
    ...(isCustomRpc ? [{
      id: 'localnet' as SolanaCluster, // Use 'localnet' to match export wizard convention
      name: 'Custom RPC (Localhost)',
      icon: '🔧',
      rpcEndpoint: detectedRpcEndpoint,
      explorer: SOLANA_EXPLORER_URLS.devnet, // Default to devnet explorer
      nativeCurrency: 'SOL',
      description: 'Your wallet is connected to a custom RPC endpoint',
    }] : []),
  ];

  // Fetch balance when wallet connects
  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey || !actualConnection) return;

      setIsLoadingBalance(true);
      try {
        console.log('[SolanaConnectionStep] Fetching balance from:', actualConnection.rpcEndpoint);
        const balanceLamports = await actualConnection.getBalance(publicKey);
        const balanceSOL = balanceLamports / 1e9; // Convert lamports to SOL
        console.log('[SolanaConnectionStep] Balance:', balanceSOL, 'SOL');
        setBalance(balanceSOL);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [publicKey, actualConnection]);

  const handleConnect = async () => {
    try {
      if (!wallet) {
        // No wallet selected, show modal
        openWalletModal();
      } else {
        // Wallet selected, connect
        await connect();
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setBalance(null);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const handleClusterSelect = (clusterId: SolanaCluster) => {
    if (onTargetClusterChange) {
      onTargetClusterChange(clusterId);
    }
  };

  const selectedCluster = clusterOptions.find(c => c.id === selectedTargetCluster);

  // Shorten address for display (Solana base58 addresses)
  const shortenedAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Solana Wallet</h3>
        <p className="text-gray-600">
          Connect your Phantom, Solflare, or other Solana wallet, then select your target cluster.
        </p>
      </div>

      {/* Step 1: Wallet Connection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step 1: Connect Wallet
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Connect your Solana wallet to continue. Supports Phantom, Solflare, Backpack, and more.
          </p>
        </div>

        {!connected ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <div className="text-4xl mb-2">◎</div>
              <p className="text-gray-600 mb-4">No wallet connected</p>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
              {!wallet && (
                <p className="text-xs text-gray-500 mt-2">
                  A wallet selection modal will appear
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-green-800">✅ Wallet Connected</p>
                    <p className="text-sm text-green-600 font-mono">{shortenedAddress}</p>
                    {wallet && (
                      <p className="text-xs text-green-500 mt-1">
                        Using {wallet.adapter.name}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1 text-sm text-green-700 hover:text-green-900 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* RPC Connection Info */}
            {connection && (
              <div className={clsx(
                "p-3 border rounded-lg text-xs",
                isCustomRpc 
                  ? "bg-purple-50 border-purple-200" 
                  : "bg-blue-50 border-blue-200"
              )}>
                <div className="flex items-start">
                  <span className="text-base mr-2">{isCustomRpc ? '🔧' : 'ℹ️'}</span>
                  <div className="flex-1">
                    <p className={clsx(
                      "font-medium mb-1",
                      isCustomRpc ? "text-purple-800" : "text-blue-800"
                    )}>
                      {isCustomRpc ? 'Custom RPC Detected' : 'RPC Connection'}
                    </p>
                    <p className={clsx(
                      "font-mono text-xs break-all",
                      isCustomRpc ? "text-purple-700" : "text-blue-700"
                    )}>
                      {detectedRpcEndpoint}
                    </p>
                    {isCustomRpc && (
                      <p className="text-purple-600 mt-1">
                        Your wallet (Backpack) is using a custom RPC endpoint, likely your local validator. 
                        This will be used for all transactions.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Balance Display */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Wallet Balance</p>
                  {isLoadingBalance ? (
                    <p className="text-sm text-gray-500">Loading...</p>
                  ) : balance !== null ? (
                    <p className="text-lg font-semibold text-gray-900">
                      {balance.toFixed(4)} SOL
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">Unable to fetch balance</p>
                  )}
                </div>
                {address && !isCustomRpc && (
                  <a
                    href={`${SOLANA_EXPLORER_URLS[cluster]}/account/${address}${cluster !== 'mainnet-beta' ? `?cluster=${cluster}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 inline-flex items-center text-sm"
                  >
                    View Account <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Cluster Selection (only show if wallet is connected) */}
      {connected && (
        <div className="space-y-4">
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Step 2: Select Target Cluster
            </label>
            <p className="text-sm text-gray-500 mb-3">
              {isCustomRpc 
                ? 'Your wallet is connected to a custom RPC. Select the corresponding cluster for bridging.'
                : 'Choose the Solana cluster where you want to bridge your NFTs.'
              }
            </p>
            {isCustomRpc && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>💡 Tip:</strong> Since you're using a custom RPC (likely localhost), select "Devnet" 
                  as your target cluster. Your wallet will continue using your local validator for transactions.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clusterOptions.map((clusterOption) => (
              <button
                key={clusterOption.id}
                onClick={() => handleClusterSelect(clusterOption.id)}
                className={clsx(
                  'p-4 border-2 rounded-lg text-left transition-all hover:shadow-md',
                  selectedTargetCluster === clusterOption.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-3">{clusterOption.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{clusterOption.name}</h4>
                    <p className="text-xs text-gray-500">{clusterOption.description}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Currency: {clusterOption.nativeCurrency}</p>
                  <a
                    href={clusterOption.explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 inline-flex items-center mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Explorer <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </button>
            ))}
          </div>

          {/* Cluster Status */}
          {selectedTargetCluster && (
            <div className="space-y-3">
              {cluster === selectedTargetCluster ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-green-800">✅ Cluster Connected</p>
                      <p className="text-sm text-green-600">
                        {selectedCluster?.name} ({selectedCluster?.id})
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-800">⚠️ Cluster Mismatch</p>
                      <p className="text-sm text-amber-600">
                        Target cluster: {selectedCluster?.name} ({selectedCluster?.id})
                      </p>
                      <p className="text-xs text-amber-500 mt-1">
                        Currently connected to: {cluster}
                      </p>
                      <p className="text-xs text-amber-500 mt-2">
                        Note: You may need to reconnect your wallet to switch clusters, or use a custom RPC endpoint in your wallet settings.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
