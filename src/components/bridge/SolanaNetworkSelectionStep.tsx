import { useState } from 'react';
import { clsx } from 'clsx';
import { ExternalLink } from 'lucide-react';
import { useSolana } from '../../hooks/useSolana';

export interface SolanaNetworkSelectionStepProps {
  selectedNetwork?: string;
  onNetworkChange: (network: string, endpoint: string) => void;
}

interface SolanaNetworkOption {
  id: string;
  name: string;
  displayName: string;
  endpoint: string;
  icon: string;
  explorer: string;
  description: string;
}

export function SolanaNetworkSelectionStep({
  selectedNetwork,
  onNetworkChange,
}: SolanaNetworkSelectionStepProps) {
  const { wallet, connected, publicKey, connect, disconnect } = useSolana();
  const [isConnecting, setIsConnecting] = useState(false);

  // Solana network configuration
  const networkOptions: SolanaNetworkOption[] = [
    {
      id: 'mainnet-beta',
      name: 'mainnet-beta',
      displayName: 'Mainnet Beta',
      endpoint: 'https://api.mainnet-beta.solana.com',
      icon: '◎',
      explorer: 'https://explorer.solana.com',
      description: 'Solana production network with real SOL',
    },
    {
      id: 'devnet',
      name: 'devnet',
      displayName: 'Devnet',
      endpoint: 'https://api.devnet.solana.com',
      icon: '◎',
      explorer: 'https://explorer.solana.com/?cluster=devnet',
      description: 'Solana test network for development',
    },
    {
      id: 'testnet',
      name: 'testnet',
      displayName: 'Testnet',
      endpoint: 'https://api.testnet.solana.com',
      icon: '◎',
      explorer: 'https://explorer.solana.com/?cluster=testnet',
      description: 'Solana test network for testing',
    },
    {
      id: 'localnet',
      name: 'localnet',
      displayName: 'Localnet',
      endpoint: 'http://127.0.0.1:8899',
      icon: '⚡',
      explorer: 'http://localhost:8899',
      description: 'Local Solana validator for development',
    },
  ];

  const handleConnect = async () => {
    if (!wallet) {
      console.error('No wallet available');
      return;
    }

    setIsConnecting(true);
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleNetworkSelect = (network: SolanaNetworkOption) => {
    onNetworkChange(network.name, network.endpoint);
  };

  const selectedNetworkOption = networkOptions.find(n => n.name === selectedNetwork);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Solana Wallet</h3>
        <p className="text-gray-600">
          Connect your Phantom or compatible wallet, then select your target network.
        </p>
      </div>

      {/* Step 1: Wallet Connection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step 1: Connect Wallet
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Connect your Phantom, Solflare, or other Solana wallet to continue.
          </p>
        </div>

        {!connected ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <div className="text-4xl mb-2">👻</div>
              <p className="text-gray-600 mb-2">No Solana wallet connected</p>
              {!wallet && (
                <p className="text-sm text-gray-500 mb-4">
                  Please install a Solana wallet extension like Phantom
                </p>
              )}
              <button
                onClick={handleConnect}
                disabled={!wallet || isConnecting}
                className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
              {!wallet && (
                <div className="mt-4">
                  <a
                    href="https://phantom.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center justify-center"
                  >
                    Get Phantom Wallet
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-green-800">✅ Wallet Connected</p>
                  <p className="text-sm text-green-600 font-mono">
                    {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
                  </p>
                  {wallet && (
                    <p className="text-xs text-green-600 mt-1">
                      Using: {wallet.adapter.name}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-sm text-green-700 hover:text-green-900 underline"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Network Selection */}
      <div className="space-y-4">
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step 2: Select Target Network
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Choose the Solana network where you want to export your NFTs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {networkOptions.map((network) => (
            <button
              key={network.id}
              onClick={() => handleNetworkSelect(network)}
              className={clsx(
                'p-4 border-2 rounded-lg text-left transition-all hover:shadow-md',
                selectedNetwork === network.name
                  ? 'border-cyan-500 bg-cyan-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">{network.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{network.displayName}</h4>
                  <p className="text-xs text-gray-500">{network.endpoint.slice(0, 30)}...</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{network.description}</p>
              
              <div className="flex items-center text-sm">
                <a
                  href={network.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-cyan-600 hover:text-cyan-700 flex items-center"
                >
                  View Explorer
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>

              {selectedNetwork === network.name && (
                <div className="mt-3 flex items-center text-sm text-cyan-700">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Selected
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Current Network Info */}
      {selectedNetworkOption && (
        <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
          <h4 className="font-medium text-cyan-800 mb-2">Target Network Configuration</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-cyan-600">Network:</span>
              <span className="font-medium text-cyan-800">{selectedNetworkOption.displayName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-600">Endpoint:</span>
              <span className="font-mono text-xs text-cyan-800">{selectedNetworkOption.endpoint}</span>
            </div>
            {selectedNetworkOption.id === 'mainnet-beta' && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-700">
                  ⚠️ Mainnet deployment will use real SOL. Make sure you have sufficient balance.
                </p>
              </div>
            )}
            {selectedNetworkOption.id === 'localnet' && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-700">
                  💡 Make sure your local Solana validator is running at {selectedNetworkOption.endpoint}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">📚 About Solana Networks</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">Mainnet Beta:</span> Production network with real value. Use for live NFT exports.
          </p>
          <p>
            <span className="font-medium">Devnet:</span> Test network for development. Get free SOL from faucets.
          </p>
          <p>
            <span className="font-medium">Testnet:</span> Stress testing network. May experience instability.
          </p>
          <p>
            <span className="font-medium">Localnet:</span> Local validator running on your machine. Requires setup.
          </p>
        </div>
        
        <div className="mt-4 p-3 bg-white rounded border border-gray-200">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Need test SOL?</h5>
          <div className="space-y-1">
            <a
              href="https://faucet.solana.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center"
            >
              Solana Devnet Faucet
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
            <a
              href="https://solfaucet.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center"
            >
              Community Faucet
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
