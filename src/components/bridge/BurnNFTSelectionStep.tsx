import { NFTSelectionStep, NFTSelectionStepProps } from './NFTSelectionStep';

export interface BurnNFTSelectionStepProps extends NFTSelectionStepProps {}

export function BurnNFTSelectionStep(props: BurnNFTSelectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select Cast NFTs to Burn</h3>
        <p className="text-gray-600">
          Choose which <strong>cast NFTs</strong> (remote EVM NFTs) you'd like to burn and convert back to ckNFTs on the Internet Computer.
        </p>
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <p className="text-amber-800">
            <strong>🔥 Burn Process for Cast NFTs:</strong> Your selected cast NFTs will be permanently burned on the remote EVM chain 
            and corresponding ckNFTs will be reminted on the Internet Computer using the remote contract reference.
          </p>
          
          <details className="mt-2 group">
            <summary className="cursor-pointer text-amber-700 hover:text-amber-800 text-xs">
              ⚠️ Important: What happens during cast NFT burn...
            </summary>
            <div className="mt-2 text-xs text-amber-600 space-y-1">
              <p>• <strong>Cast NFT (Remote EVM):</strong> Will be permanently destroyed (burned) on remote chain</p>
              <p>• <strong>ckNFT (IC):</strong> New ckNFT reminted on IC using remote contract reference</p>
              <p>• <strong>Process:</strong> Follows the same remintCkNFT pattern as in App.tsx</p>
              <p>• <strong>Ownership:</strong> You'll own the reminted ckNFT on Internet Computer</p>
              <p>• <strong>Irreversible:</strong> Cast NFT cannot be recovered once burned</p>
            </div>
          </details>
        </div>
      </div>

      {/* Delegate to the main NFTSelectionStep for the actual selection UI */}
      <NFTSelectionStep {...props} />
    </div>
  );
}
