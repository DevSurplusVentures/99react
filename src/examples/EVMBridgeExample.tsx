import React, { useState, useEffect } from 'react';
import { BridgeChecklist } from '../components/BridgeChecklist/BridgeChecklist';
import { use99Mutations } from '../hooks/use99Mutations';
import { createBridgeProgress, updateBridgeStep } from '../utils/bridgeProgress';
import {
  useMetaMask,
  useNetworkManager,
  useNFTBridge,
  useAdvancedGasFees,
  type BridgeConfig
} from '../hooks';

// Example component showing EVM + ICRC-99 bridge integration
export function EVMBridgeExample() {
  // EVM wallet connection
  const { isDetected, isUnlocked, activeAddress, chainId, connectWallet, switchChain } = useMetaMask();
  
  // Network management
  const { switchNetwork, addNetwork } = useNetworkManager();
  
  // ICRC-99 mutations
  const mutations = use99Mutations();
  
  // Bridge progress state
  const [progress, setProgress] = useState(() => createBridgeProgress());
  
  // Example bridge configuration (Ethereum → Base)
  const bridgeConfig: BridgeConfig = {
    sourceChain: {
      chainId: 1,
      name: 'Ethereum',
      contractAddress: '0x1234567890123456789012345678901234567890', // Example NFT contract
    },
    targetChain: {
      chainId: 8453,
      name: 'Base',
      bridgeAddress: '0x9876543210987654321098765432109876543210', // Example bridge contract
    },
  };
  
  // NFT bridging functionality
  const nftBridge = useNFTBridge(bridgeConfig);
  const { isL2Chain } = useAdvancedGasFees(chainId || 1);
  
  // Example NFT to bridge
  const [tokenId, setTokenId] = useState('1');
  const [targetAddress, setTargetAddress] = useState('');

  // Auto-update progress based on wallet state
  useEffect(() => {
    if (isDetected && isUnlocked && activeAddress) {
      setProgress(prev => updateBridgeStep(prev, 'setup-wallet', { 
        status: 'completed',
        message: `Connected to ${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
      }));
    }
  }, [isDetected, isUnlocked, activeAddress]);

  useEffect(() => {
    if (chainId === bridgeConfig.sourceChain.chainId) {
      setProgress(prev => updateBridgeStep(prev, 'setup-network', { 
        status: 'completed',
        message: `Connected to ${bridgeConfig.sourceChain.name}`
      }));
    }
  }, [chainId, bridgeConfig.sourceChain.chainId, bridgeConfig.sourceChain.name]);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  // Handle network switching
  const handleSwitchNetwork = async () => {
    try {
      await switchNetwork(bridgeConfig.sourceChain.chainId);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  // Handle NFT approval
  const handleApproveNFT = async () => {
    if (!tokenId) return;

    try {
      setProgress(prev => updateBridgeStep(prev, 'approve-nft', { 
        status: 'in-progress',
        message: 'Approving NFT for bridge...'
      }));

      const result = await nftBridge.approveForBridge(tokenId);
      
      setProgress(prev => updateBridgeStep(prev, 'approve-nft', { 
        status: 'completed',
        message: `NFT approved. Tx: ${result.txHash?.slice(0, 10)}...`
      }));
    } catch (error: any) {
      setProgress(prev => updateBridgeStep(prev, 'approve-nft', { 
        status: 'error',
        message: error.message
      }));
    }
  };

  // Handle bridge execution
  const handleExecuteBridge = async () => {
    if (!tokenId || !targetAddress) return;

    try {
      setProgress(prev => updateBridgeStep(prev, 'execute-bridge', { 
        status: 'in-progress',
        message: 'Executing bridge transaction...'
      }));

      // This would use the ICRC-99 mutations
      await mutations.mintFromEVM.mutateAsync({
        tokenId,
        sourceContract: bridgeConfig.sourceChain.contractAddress,
        targetAddress,
        sourceChain: bridgeConfig.sourceChain.chainId.toString(),
      });
      
      setProgress(prev => updateBridgeStep(prev, 'execute-bridge', { 
        status: 'completed',
        message: 'Bridge transaction completed!'
      }));
    } catch (error: any) {
      setProgress(prev => updateBridgeStep(prev, 'execute-bridge', { 
        status: 'error',
        message: error.message
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">EVM ↔ ICRC-99 Bridge</h1>
        
        {/* Wallet Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Wallet Status</h3>
          <div className="space-y-2 text-sm">
            <div>MetaMask: {isDetected ? '✅ Detected' : '❌ Not Found'}</div>
            <div>Connection: {isUnlocked ? '✅ Connected' : '❌ Disconnected'}</div>
            <div>Address: {activeAddress || 'Not connected'}</div>
            <div>Chain ID: {chainId || 'Unknown'}</div>
            <div>L2 Chain: {isL2Chain ? '✅ Yes' : '❌ No'}</div>
          </div>
          
          {!isUnlocked && (
            <button
              onClick={handleConnectWallet}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Connect Wallet
            </button>
          )}
          
          {isUnlocked && chainId !== bridgeConfig.sourceChain.chainId && (
            <button
              onClick={handleSwitchNetwork}
              className="mt-3 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Switch to {bridgeConfig.sourceChain.name}
            </button>
          )}
        </div>

        {/* Bridge Configuration */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Bridge Configuration</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-gray-600 mb-1">Token ID to Bridge:</label>
              <input
                type="text"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Enter token ID"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">Target IC Principal:</label>
              <input
                type="text"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Enter IC principal"
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleApproveNFT}
              disabled={!tokenId || !isUnlocked}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Approve NFT
            </button>
            
            <button
              onClick={handleExecuteBridge}
              disabled={!tokenId || !targetAddress || !isUnlocked}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Execute Bridge
            </button>
          </div>
        </div>
      </div>

      {/* Bridge Progress Checklist */}
      <BridgeChecklist 
        progress={progress}
        onUpdateProgress={setProgress}
      />

      {/* Bridge Information */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Bridge Information</h2>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Source Chain</h3>
            <div className="space-y-1">
              <div>Name: {bridgeConfig.sourceChain.name}</div>
              <div>Chain ID: {bridgeConfig.sourceChain.chainId}</div>
              <div>Contract: {bridgeConfig.sourceChain.contractAddress}</div>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Target Chain</h3>
            <div className="space-y-1">
              <div>Name: {bridgeConfig.targetChain.name}</div>
              <div>Chain ID: {bridgeConfig.targetChain.chainId}</div>
              <div>Bridge: {bridgeConfig.targetChain.bridgeAddress}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
