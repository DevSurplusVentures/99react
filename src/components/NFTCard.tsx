import { useNFTMetadata } from '../lib';
import { useNFTOwner } from '../hooks/useNFTOwner';
import { useMarketListingNFT } from '../hooks/useMarketListingNFT';
import { MarketListingPrice } from './MarketListingPrice';

// Add optional nftMetadata prop for Storybook mocking
export interface NFTCardProps {
  /** Canister ID of the NFT collection */
  canisterId: string;
  /** Token ID (as text or number) */
  tokenId: bigint;
  /** Optional, for Storybook */
  nftMetadata?: any;
  /** Optional, market canister ID for listing lookup */
  marketId?: string;
}

export function NFTCard({ canisterId, tokenId, nftMetadata: injectedMetadata, marketId }: NFTCardProps) {
  // Only use the injectedMetadata if it is a valid object with the expected shape
  try {
    const shouldUseInjected =
      injectedMetadata &&
      typeof injectedMetadata === 'object' &&
      ('loading' in injectedMetadata || 'metadata' in injectedMetadata || 'error' in injectedMetadata);
    const nftMetadata = shouldUseInjected
      ? injectedMetadata
      : useNFTMetadata(canisterId, tokenId);

    // Fetch owner
    const { owner, loading: ownerLoading, error: ownerError } = useNFTOwner(canisterId, tokenId);

    // Fetch market listing if marketId is provided
    const marketListing = marketId
      ? useMarketListingNFT(marketId, canisterId, tokenId)
      : { listing: null, loading: false, error: null };

    if (nftMetadata.loading || ownerLoading || marketListing.loading) {
      return (
        <div className="animate-pulse bg-gray-100 rounded-xl p-4">
          <div className="bg-gray-300 h-48 rounded-lg mb-4" />
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-300 rounded w-1/2" />
        </div>
      );
    }

    if (nftMetadata.error || !nftMetadata.metadata) {
      console.error('Error loading NFT metadata:', nftMetadata.error);
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          Error loading NFT metadata.
        </div>
      );
    }

    // Helper to render owner
    function renderOwner() {
      if (ownerError) return <div className="text-xs text-red-500">Error loading owner</div>;
      if (!owner) return <div className="text-xs text-gray-400">Owner: Unknown</div>;
      return (
        <div className="text-xs text-gray-500 truncate">
          Owner: <span title={owner.owner}>{owner.owner}</span>
        </div>
      );
    }

    // Helper to render market listing
    function renderMarketListing() {
      if (!marketId) return null;
      if (marketListing.error) return <div className="text-xs text-red-500">Error loading listing</div>;
      
      // If no listing exists, still render MarketListingPrice so it can show "List for Sale" button for owners
      return (
        <div className="text-xs text-green-600 mt-2">
          <MarketListingPrice
            listing={marketListing.listing}
            marketCanisterId={marketId}
            intentId={marketListing.listing?.intent_id}
            nftCanisterId={canisterId}
            tokenId={tokenId}
            owner={owner}
          />
        </div>
      );
    }

    return (
      <>
        {nftMetadata.metadata && nftMetadata.metadata.parsedMetadata &&
        nftMetadata.metadata.parsedMetadata.icrc97 &&
        typeof nftMetadata.metadata.parsedMetadata.icrc97 === 'object' &&
        Object.keys(nftMetadata.metadata.parsedMetadata.icrc97).some(
          (k) =>
            k !== 'attributes' &&
            nftMetadata.metadata &&
            nftMetadata.metadata.parsedMetadata.icrc97[k as keyof typeof nftMetadata.metadata.parsedMetadata.icrc97]
        ) ? (
          <div className="bg-white shadow-md rounded-2xl p-4">
            <img
              src={nftMetadata.metadata.parsedMetadata.icrc97.image}
              alt={nftMetadata.metadata.parsedMetadata.icrc97.name}
              className="w-full h-48 object-cover rounded-lg"
            />
            <h3 className="mt-4 text-xl font-semibold text-gray-900">
              {nftMetadata.metadata.parsedMetadata.icrc97.name}
            </h3>
            <div className="mt-1 text-gray-500 text-xs">
              Token ID: {tokenId.toString()}
            </div>
            {renderOwner()}
            {renderMarketListing()}
            {nftMetadata.metadata.parsedMetadata.icrc97.description && (
              <p className="mt-2 text-gray-600 text-sm">
                {nftMetadata.metadata.parsedMetadata.icrc97.description}
              </p>
            )}
          </div>
        ) : nftMetadata.metadata && nftMetadata.metadata.parsedMetadata ? (() => {
          // Try to parse icrc97raw as JSON
          let parsed: any = null;
          try {
            parsed = nftMetadata.metadata.parsedMetadata.icrc97raw
              ? JSON.parse(nftMetadata.metadata.parsedMetadata.icrc97raw)
              : null;
          } catch {}
          if (parsed && typeof parsed === 'object') {
            return (
              <div>
                <div className="mb-2 text-gray-500 text-xs">
                  Token ID: {tokenId.toString()}
                </div>
                {renderOwner()}
                {renderMarketListing()}
                <pre className="bg-gray-50 rounded-xl p-4 text-xs overflow-x-auto">
                  {JSON.stringify(parsed, null, 2)}
                </pre>
              </div>
            );
          }
          if (
            nftMetadata.metadata.parsedMetadata.icrc97raw &&
            nftMetadata.metadata.parsedMetadata.icrc97raw.trim() !== ''
          ) {
            return (
              <div>
                <div className="mb-2 text-gray-500 text-xs">
                  Token ID: {tokenId.toString()}
                </div>
                {renderOwner()}
                {renderMarketListing()}
                <pre className="bg-gray-50 rounded-xl p-4 text-xs overflow-x-auto">
                  {nftMetadata.metadata.parsedMetadata.icrc97raw}
                </pre>
              </div>
            );
          }
          // If parsedMetadata exists but no icrc97 or icrc97raw, show fallback
          return (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl p-4">
              No displayable metadata found.
            </div>
          );
        })() : (
          // If parsedMetadata is missing entirely
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl p-4">
            No metadata available.
          </div>
        )}
      </>
    );
  } catch (e) {
    console.error('Error rendering NFTCard:', e);
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
        Error rendering NFT card.
      </div>
    );
  }
}
