import { useState } from 'react';
import { clsx } from 'clsx';
import { ExternalLink } from 'lucide-react';

export interface EVMConnectionStepProps {
  isConnected: boolean;
  account: string | null;
  supportedNetworks: string[];
  currentNetwork: string | null;
  onConnect: () => Promise<void>;
  onSwitchNetwork: (network: string) => Promise<void>;
  selectedTargetNetwork?: string;
  onTargetNetworkChange?: (network: string) => void;
}

interface NetworkOption {
  id: string;
  name: string;
  chainId: number;
  icon: string;
  blockExplorer: string;
  nativeCurrency: string;
}

export function EVMConnectionStep({
  isConnected,
  account,
  supportedNetworks,
  currentNetwork,
  onConnect,
  onSwitchNetwork,
  selectedTargetNetwork,
  onTargetNetworkChange,
}: EVMConnectionStepProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  // Network configuration
  const networkOptions: NetworkOption[] = [
    {
      id: 'ethereum',
      name: 'Ethereum',
      chainId: 1,
      icon: '🔷',
      blockExplorer: 'https://etherscan.io',
      nativeCurrency: 'ETH',
    },
    {
      id: 'polygon',
      name: 'Polygon',
      chainId: 137,
      icon: '🟣',
      blockExplorer: 'https://polygonscan.com',
      nativeCurrency: 'MATIC',
    },
    {
      id: 'bsc',
      name: 'BNB Smart Chain',
      chainId: 56,
      icon: '🟡',
      blockExplorer: 'https://bscscan.com',
      nativeCurrency: 'BNB',
    },
    {
      id: 'hardhat',
      name: 'Hardhat Local',
      chainId: 31337,
      icon: '⚡',
      blockExplorer: 'http://localhost:8545',
      nativeCurrency: 'ETH',
    },
    {
      id: 'hardhat-2',
      name: 'Hardhat Local 2',
      chainId: 1338,
      icon: '⚡',
      blockExplorer: 'http://localhost:9545',
      nativeCurrency: 'ETH',
    },
    {
      id: 'arbitrum',
      name: 'Arbitrum',
      chainId: 42161,
      icon: '🔵',
      blockExplorer: 'https://arbiscan.io',
      nativeCurrency: 'ETH',
    },
    {
      id: 'optimism',
      name: 'Optimism',
      chainId: 10,
      icon: '🔴',
      blockExplorer: 'https://optimistic.etherscan.io',
      nativeCurrency: 'ETH',
    },
    {
      id: 'base',
      name: 'Base',
      chainId: 8453,
      icon: '🔵',
      blockExplorer: 'https://basescan.org',
      nativeCurrency: 'ETH',
    },
  ].filter(network => supportedNetworks.includes(network.id));

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleNetworkSelect = async (networkId: string) => {
    if (onTargetNetworkChange) {
      onTargetNetworkChange(networkId);
    }
    
    if (isConnected && currentNetwork !== networkId) {
      await onSwitchNetwork(networkId);
    }
  };

  const selectedNetwork = networkOptions.find(n => n.id === selectedTargetNetwork);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your EVM Wallet</h3>
        <p className="text-gray-600">
          Connect your MetaMask or compatible wallet, then select your target network.
        </p>
      </div>

      {/* Step 1: Wallet Connection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step 1: Connect Wallet
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Connect your MetaMask or other Web3 wallet to continue.
          </p>
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <div className="text-4xl mb-2">🦊</div>
              <p className="text-gray-600 mb-4">No wallet connected</p>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-green-800">✅ Wallet Connected</p>
                <p className="text-sm text-green-600 font-mono">{account}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Network Selection (only show if wallet is connected) */}
      {isConnected && (
        <div className="space-y-4">
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Step 2: Select Target Network
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Choose the blockchain network where you want to export your NFTs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {networkOptions.map((network) => (
              <button
                key={network.id}
                onClick={() => handleNetworkSelect(network.id)}
                className={clsx(
                  'p-4 border-2 rounded-lg text-left transition-all hover:shadow-md',
                  selectedTargetNetwork === network.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-3">{network.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{network.name}</h4>
                    <p className="text-sm text-gray-500">Chain ID: {network.chainId}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Currency: {network.nativeCurrency}</p>
                  <a
                    href={network.blockExplorer}
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

          {/* Network Status */}
          {selectedTargetNetwork && (
            <div className="space-y-3">
              {currentNetwork === selectedTargetNetwork ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-green-800">✅ Network Connected</p>
                      <p className="text-sm text-green-600">
                        {selectedNetwork?.name} Network (Chain ID: {selectedNetwork?.chainId})
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-800">⚠️ Network Switch Required</p>
                      <p className="text-sm text-amber-600">
                        Please switch to {selectedNetwork?.name} network (Chain ID: {selectedNetwork?.chainId})
                      </p>
                      {currentNetwork && (
                        <p className="text-xs text-amber-500">
                          Currently on: {currentNetwork}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onSwitchNetwork(selectedTargetNetwork)}
                      className="px-4 py-2 text-sm bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200 transition-colors"
                    >
                      Switch Network
                    </button>
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
