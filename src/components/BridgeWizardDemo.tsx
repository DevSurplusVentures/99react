import React, { useState } from 'react';
import { EVMBurnWizard, ICReturnWizard } from './bridge';

export function BridgeWizardDemo() {
  const [activeWizard, setActiveWizard] = useState<'burn' | 'return' | null>(null);

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-gray-900">ICRC-99 Bridge Wizards</h2>
      <p className="text-gray-600">
        Complete NFT bridging suite supporting bidirectional transfers between EVM chains and Internet Computer.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Import Wizard */}
        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
          <div className="text-2xl mb-2">🔵</div>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Import Wizard</h3>
          <p className="text-sm text-blue-700 mb-4">
            Import EVM NFTs to Internet Computer as ckNFTs
          </p>
          <p className="text-xs text-blue-600">
            Direction: EVM → IC
          </p>
        </div>

        {/* Export Wizard */}
        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg">
          <div className="text-2xl mb-2">🟢</div>
          <h3 className="text-lg font-semibold text-green-900 mb-2">Export Wizard</h3>
          <p className="text-sm text-green-700 mb-4">
            Export ckNFTs to new EVM contracts with fresh deployments
          </p>
          <p className="text-xs text-green-600">
            Direction: IC → EVM (New)
          </p>
        </div>

        {/* Burn Wizard */}
        <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg">
          <div className="text-2xl mb-2">🔴</div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Burn Wizard</h3>
          <p className="text-sm text-red-700 mb-4">
            Burn EVM NFTs and mint corresponding ckNFTs on IC
          </p>
          <p className="text-xs text-red-600">
            Direction: EVM Burn → IC Mint
          </p>
          <button
            onClick={() => setActiveWizard('burn')}
            className="mt-3 w-full px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            Demo Burn Wizard
          </button>
        </div>

        {/* Return Wizard */}
        <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
          <div className="text-2xl mb-2">🟣</div>
          <h3 className="text-lg font-semibold text-purple-900 mb-2">Return Wizard</h3>
          <p className="text-sm text-purple-700 mb-4">
            Return ckNFTs to their original EVM source chains
          </p>
          <p className="text-xs text-purple-600">
            Direction: IC → EVM (Source)
          </p>
          <button
            onClick={() => setActiveWizard('return')}
            className="mt-3 w-full px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
          >
            Demo Return Wizard
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Bridge Operations Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">EVM → IC Operations</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• <strong>Import:</strong> Lock EVM NFT, mint ckNFT</li>
              <li>• <strong>Burn:</strong> Burn EVM NFT, mint ckNFT</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">IC → EVM Operations</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• <strong>Export:</strong> Lock ckNFT, deploy new EVM contract</li>
              <li>• <strong>Return:</strong> Burn ckNFT, unlock/mint on source EVM</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Wizards */}
      {activeWizard === 'burn' && (
        <EVMBurnWizard
          sourceChainId="1"
          sourceContractAddress="0x1234567890123456789012345678901234567890"
          sourceTokenId="123"
          onComplete={(result) => {
            console.log('Burn wizard completed:', result);
            setActiveWizard(null);
          }}
          onCancel={() => setActiveWizard(null)}
          mockBurnResult={{
            success: true,
            icTransactionHash: 'ic-tx-hash-example',
            ckNFTCanisterId: 'ckNFT-canister-id-example',
            tokenId: '123',
          }}
        />
      )}

      {activeWizard === 'return' && (
        <ICReturnWizard
          onComplete={(result) => {
            console.log('Return wizard completed:', result);
            setActiveWizard(null);
          }}
          onCancel={() => setActiveWizard(null)}
          mockReturnResult={{
            success: true,
            evmTransactionHash: 'evm-tx-hash-example',
            targetChainId: '1',
            targetContractAddress: '0x1234567890123456789012345678901234567890',
            tokenId: '123',
          }}
        />
      )}
    </div>
  );
}

export default BridgeWizardDemo;
