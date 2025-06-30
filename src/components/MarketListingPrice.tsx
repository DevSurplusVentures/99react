import { useFungibleToken } from '../hooks/useFungibleToken.ts';
import { useApproveToken } from '../hooks/useTokenMutation';
import { useManageMarket } from '../hooks/useMarketMutations';
import { useApproveTokens } from '../hooks/useNFTMutations';
import { useAuth, useIsAuthenticated } from '../hooks/useAuth';
import { useAgent } from '../provider/AgentProvider';
import { Principal } from '@dfinity/principal';
import { useState } from 'react';
import type { 
  IntentStatus, 
  TokenSpec, 
  ManageMarketRequest,
  IntentFeature,
  Escrow,
  Account__1
} from "../declarations/market/market.did";

// Hardcoded list of approved fungible tokens for listing
const APPROVED_FUNGIBLE_TOKENS = [
  {
    canisterId: 'uzt4z-lp777-77774-qaabq-cai', // ICP (ckBTC)
    symbol: 'TTT',
    name: 'Test Token',
    decimals: 8
  }
  // Add more approved tokens here as needed
];

/**
 * MarketListingPrice
 * @param {object} props
 * @param {any} props.listing - The market listing object (should contain price and token canisterId)
 * @param {string} props.nftCanisterId - The canister ID of the NFT being sold
 * @param {string | bigint} props.tokenId - The token ID of the NFT being listed
 * @param {object} props.owner - The owner information of the NFT
 */
export function MarketListingPrice({ listing, marketCanisterId, intentId, nftCanisterId, tokenId, owner }: {
  listing: IntentStatus | null;
  marketCanisterId: string;
  intentId?: string | bigint;
  nftCanisterId: string;
  tokenId: string | bigint;
  owner?: { owner: string; subaccount?: any } | null;
}) {
  const { connect, user } = useAuth();
  const isAuthenticated = useIsAuthenticated();
  const agent = useAgent(); // Get the actual agent to check if it's ready
  
  // Check if both user and agent are available (fully authenticated)
  const isFullyAuthenticated = isAuthenticated && !!agent;
  
  // Check if user owns this NFT
  const userOwnsNFT = owner && user && 
    owner.owner === (typeof user.principal === 'string' ? user.principal : user.principal.toString());
  
  // If there's a listing, show the existing listing price/buy functionality
  if (listing) {
    // Extract price and tokenCanisterId from IntentStatus (listing)
    // Find the 'satisfying_tokens' feature in original_config
    console.log("MarketListingPrice called with listing:", listing);
    let price: bigint | null = null;
    let tokenCanisterId: string | Principal | null = null;
    if (listing && Array.isArray(listing.original_config)) {
      for (const optFeature of listing.original_config) {
        console.log("Checking original_config feature:", optFeature);
        if (optFeature && optFeature[0] && 'satisfying_tokens' in optFeature[0]) {
          console.log("Found satisfying_tokens in original_config:", optFeature[0]);
          // [[TokenSpec]]
          const satisfyingTokens: TokenSpec[][] = optFeature[0].satisfying_tokens;
          if (Array.isArray(satisfyingTokens) && satisfyingTokens.length > 0 && Array.isArray(satisfyingTokens[0]) && satisfyingTokens[0].length > 0) {
            const tokenSpec = satisfyingTokens[0][0];
            if (tokenSpec) {
              tokenCanisterId = tokenSpec.canister?.toText ? tokenSpec.canister.toText() : tokenSpec.canister;
              if (
                tokenSpec.inventory &&
                Array.isArray(tokenSpec.inventory) &&
                tokenSpec.inventory.length > 0 &&
                tokenSpec.inventory[0] !== undefined &&
                typeof tokenSpec.inventory[0] === 'object' &&
                tokenSpec.inventory[0] !== null &&
                'quantity' in tokenSpec.inventory[0] &&
                tokenSpec.inventory[0].quantity != null
              ) {
                price = tokenSpec.inventory[0].quantity;
              }
              break;
            }
          }
        }
      }
    }

    // Only call the hook if tokenCanisterId is a string
    if (!price || !tokenCanisterId) return null;

    // Ensure tokenCanisterId is a string
    const tokenCanisterIdStr = 
      typeof tokenCanisterId === 'string' 
        ? tokenCanisterId
        : tokenCanisterId && typeof tokenCanisterId === 'object' && 'toText' in tokenCanisterId && typeof tokenCanisterId.toText === 'function'
        ? tokenCanisterId.toText()
        : '';

    if (!tokenCanisterIdStr) return null;

    // Early return if not fully authenticated to avoid calling authenticated hooks
    if (!isFullyAuthenticated) {
      // Show loading state if user is authenticated but agent is not ready yet
      if (isAuthenticated && !agent) {
        return <MarketListingPriceContent 
          price={price}
          tokenCanisterIdStr={tokenCanisterIdStr} 
          isAuthenticated={false}
          onLogin={undefined} // Don't show login button, just loading
          isConnecting={true}
        />;
      }
      
      return <MarketListingPriceContent 
        price={price}
        tokenCanisterIdStr={tokenCanisterIdStr} 
        isAuthenticated={false}
        onLogin={async () => {
          try {
            await connect();
          } catch (error) {
            console.error('Login failed:', error);
            alert('Failed to connect wallet. Please try again.');
          }
        }}
      />;
    }

    // User is fully authenticated, render with mutation hooks
    return <AuthenticatedMarketListingPrice 
      price={price}
      tokenCanisterIdStr={tokenCanisterIdStr}
      marketCanisterId={marketCanisterId}
      intentId={intentId!}
      user={user}
      listing={listing}
      nftCanisterId={nftCanisterId}
      tokenId={tokenId}
    />;
  }
  
  // No listing exists - show list button if user owns the NFT
  if (userOwnsNFT) {
    if (!isFullyAuthenticated) {
      return (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-gray-500 text-xs">You own this NFT</span>
          {isAuthenticated && !agent ? (
            <span className="ml-2 px-3 py-1 rounded bg-gray-400 text-white text-xs">
              Connecting...
            </span>
          ) : (
            <button
              className="ml-2 px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
              onClick={async () => {
                try {
                  await connect();
                } catch (error) {
                  console.error('Login failed:', error);
                  alert('Failed to connect wallet. Please try again.');
                }
              }}
            >
              Connect to List
            </button>
          )}
        </div>
      );
    }
    
    return <NFTListingComponent 
      nftCanisterId={nftCanisterId}
      tokenId={tokenId}
      marketCanisterId={marketCanisterId}
      user={user}
    />;
  }
  
  // Not listed and user doesn't own it
  return <div className="text-xs text-gray-400">Not listed</div>;
}

// Component for unauthenticated users
function MarketListingPriceContent({ price, tokenCanisterIdStr, isAuthenticated, onLogin, isConnecting }: {
  price: any;
  tokenCanisterIdStr: string;
  isAuthenticated: boolean;
  onLogin?: () => void;
  isConnecting?: boolean;
}) {
  const { symbol, decimals, loading, error } = useFungibleToken(tokenCanisterIdStr);

  if (loading) return <span className="text-gray-400">Loading price...</span>;
  if (error) return <span className="text-red-500">Error loading token info</span>;

  const displayPrice = decimals != null ? Number(price) / 10 ** decimals : price.toString();

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="font-mono text-green-700">
        {symbol} {displayPrice}
      </span>
      {!isAuthenticated && (
        isConnecting ? (
          <span className="ml-2 px-3 py-1 rounded bg-gray-400 text-white text-xs">
            Connecting...
          </span>
        ) : onLogin ? (
          <button
            className="ml-2 px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
            onClick={onLogin}
          >
            Connect to Buy
          </button>
        ) : null
      )}
    </div>
  );
}

// Component for authenticated users with mutation hooks
function AuthenticatedMarketListingPrice({ price, tokenCanisterIdStr, marketCanisterId, intentId, user, listing, nftCanisterId, tokenId }: {
  price: any;
  tokenCanisterIdStr: string;
  marketCanisterId: string;
  intentId: string | bigint;
  user: any;
  listing: IntentStatus;
  nftCanisterId: string;
  tokenId: string | bigint;
}) {
  const approveToken = useApproveToken(tokenCanisterIdStr);
  const manageMarket = useManageMarket(marketCanisterId);

  const handleBuy = async () => {
    if (!user) {
      alert('Please connect your wallet first');
      return;
    }

    const buyerPrincipal = user.principal.toString();
    console.log("handleBuy called with:", { buyerPrincipal, marketCanisterId, intentId, price });
    
    // Validate inputs
    if (!buyerPrincipal || !marketCanisterId || !intentId) {
      alert('Missing required information for purchase');
      return;
    }

    try {
      // 1. Approve the market canister to spend the price
      // Ensure fee is properly converted to BigInt
      const feeAmount = fee !== null && fee !== undefined ? 
        (typeof fee === 'bigint' ? fee : BigInt(fee.toString())) : 0n;
      
      const approveArgs = {
        from_subaccount: [],
        spender: { owner: Principal.fromText(marketCanisterId), subaccount: [] },
        amount: BigInt(price) + feeAmount,
        expected_allowance: [], // Set to 0 to reset allowance
        fee: [],
        memo: [],
        created_at_time: [BigInt(Date.now() * 1_000_000)],
        expires_at: [],
      };
      console.log("Approve args:", approveArgs);
      const approveResult = await approveToken.mutateAsync(approveArgs as any);
      console.log("Approve result:", approveResult);
      if (approveResult && typeof approveResult === 'object' && 'Err' in approveResult) {
        alert('Approval failed');
        return;
      }
      
      // 2. Execute the intent
      // Construct satisfying_intent that mirrors the original listing intent
      // The buyer provides fungible tokens (intent_tokens) to get the NFT (satisfying_tokens from original)
      const satisfyingIntentFeatures: Array<[] | [IntentFeature]> = [];
      
      console.log("Constructing satisfying intent for listing:", listing);
      
      // Add intent_tokens feature - the fungible tokens the buyer is providing
      const buyerAccount: Account__1 = {
        owner: typeof user.principal === 'string' ? Principal.fromText(user.principal) : user.principal,
        subaccount: []
      };
      
      // Convert intentId to BigInt if it's a string
      const intentIdBigInt = typeof intentId === 'string' ? BigInt(intentId) : intentId;
      
      // Create the fungible token spec for the payment
      const fungibleTokenSpec: TokenSpec = {
        canister: Principal.fromText(tokenCanisterIdStr),
        inventory: [{ quantity: BigInt(price) }],
        meta: [],
        token_pointer: []
      };
      
      // Create the intent array with proper typing
      const intentArray: Array<[] | [TokenSpec]> = [[fungibleTokenSpec]];
      
      const intentTokensEscrow: Escrow = {
        target_intent_id: [intentIdBigInt],
        owner: buyerAccount,
        kind: {
          intent: intentArray
        },
        counterparty: [],
        lock_to_date: []
      };
      
      const intentTokensFeature: IntentFeature = {
        intent_tokens: [intentTokensEscrow]
      };
      
      satisfyingIntentFeatures.push([intentTokensFeature]);
      
      // Add satisfying_tokens feature - the NFT we want to buy
      // Use the passed nftCanisterId and tokenId directly
      const tokenIdBigInt = typeof tokenId === 'string' ? BigInt(tokenId) : tokenId;
      
      // Create the NFT token spec
      const nftTokenSpec: TokenSpec = {
        canister: Principal.fromText(nftCanisterId),
        inventory: [{ tokenIds: [tokenIdBigInt] }],
        meta: [],
        token_pointer: []
      };
      
      const satisfyingTokensFeature: IntentFeature = {
        satisfying_tokens: [[nftTokenSpec]] // Array<Array<TokenSpec>> - wrap in double array
      };
      
      satisfyingIntentFeatures.push([satisfyingTokensFeature]);
      
      
      console.log("Constructed satisfying intent features:", satisfyingIntentFeatures);
      console.log("Number of satisfying_tokens features:", satisfyingIntentFeatures.filter(f => f[0] && 'satisfying_tokens' in f[0]).length);
      console.log("Number of intent_tokens features:", satisfyingIntentFeatures.filter(f => f[0] && 'intent_tokens' in f[0]).length);
      
      // Debug: Log types of key values
      console.log("Type verification before sending:");
      console.log("- intentIdBigInt:", typeof intentIdBigInt, intentIdBigInt);
      console.log("- buyerAccount.owner:", typeof buyerAccount.owner, buyerAccount.owner);
      console.log("- price (as BigInt):", typeof BigInt(price), BigInt(price));
      console.log("- tokenCanister Principal:", typeof Principal.fromText(tokenCanisterIdStr), Principal.fromText(tokenCanisterIdStr));
      console.log("- nftCanister Principal:", typeof Principal.fromText(nftCanisterId), Principal.fromText(nftCanisterId));
      console.log("- tokenIdBigInt:", typeof tokenIdBigInt, tokenIdBigInt);
      

      const executeIntentReq: ManageMarketRequest = {
        execute_intent: {
          intent_ids: [intentIdBigInt],
          satisfying_intent: satisfyingIntentFeatures,
        }
      };
      console.log("Executing intent with request:", executeIntentReq);
      console.log("Final request array being sent:", [executeIntentReq]);
      
      // Additional type checking
      console.log("Checking types before mutation:");
      console.log("- executeIntentReq type:", typeof executeIntentReq);
      console.log("- executeIntentReq.execute_intent.intent_ids type:", typeof executeIntentReq.execute_intent.intent_ids[0]);
      console.log("- satisfyingIntentFeatures length:", satisfyingIntentFeatures.length);
      
      let mutateResult = await manageMarket.mutateAsync([executeIntentReq]);
      alert('Purchase successful!');
      console.log("Purchase result:", mutateResult);
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed. Please try again.');
    }
  };

  const { symbol, decimals, loading, error, fee } = useFungibleToken(tokenCanisterIdStr);

  const isLoading = approveToken.status === 'pending' || manageMarket.status === 'pending';

  if (loading) return <span className="text-gray-400">Loading price...</span>;
  if (error) return <span className="text-red-500">Error loading token info</span>;

  const displayPrice = decimals != null ? Number(price) / 10 ** decimals : price.toString();

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="font-mono text-green-700">
        {symbol} {displayPrice}
      </span>
      <button
        className="ml-2 px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
        onClick={handleBuy}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Buy'}
      </button>
    </div>
  );
}

// Component for listing NFTs when user owns them
function NFTListingComponent({ nftCanisterId, tokenId, marketCanisterId, user }: {
  nftCanisterId: string;
  tokenId: string | bigint;
  marketCanisterId: string;
  user: any;
}) {
  const [showListingForm, setShowListingForm] = useState(false);
  const [selectedToken, setSelectedToken] = useState(APPROVED_FUNGIBLE_TOKENS[0]);
  const [priceInput, setPriceInput] = useState('');
  const [isListing, setIsListing] = useState(false);
  
  const approveTokens = useApproveTokens(nftCanisterId);
  const manageMarket = useManageMarket(marketCanisterId);

  const handleList = async () => {
    if (!priceInput || isNaN(Number(priceInput))) {
      alert('Please enter a valid price');
      return;
    }

    setIsListing(true);
    try {
      const tokenIdBigInt = typeof tokenId === 'string' ? BigInt(tokenId) : tokenId;
      const priceInTokenUnits = BigInt(Math.floor(Number(priceInput) * Math.pow(10, selectedToken.decimals)));

      console.log("Listing NFT:", { nftCanisterId, tokenId: tokenIdBigInt, price: priceInTokenUnits, selectedToken });

      // 1. Approve the NFT for the market canister
      const approveArgs = {
        token_id: tokenIdBigInt,
        approval_info: {
          from_subaccount: [],
          spender: {
            owner: Principal.fromText(marketCanisterId),
            subaccount: []
          },
          memo: [],
          expires_at: [],
          created_at_time: [BigInt(Date.now() * 1_000_000)]
        }
      };

      console.log("Approving NFT for market:", approveArgs);
      const approveResult = await approveTokens.mutateAsync(approveArgs as any);
      console.log("Approve result:", approveResult);

      // Check if there's an error in the approval result
      // approveResult is ([] | [ApproveTokenResult])[]
      if (Array.isArray(approveResult) && approveResult.length > 0) {
        const firstResult = approveResult[0];
        if (Array.isArray(firstResult) && firstResult.length > 0) {
          const result = firstResult[0];
          if (result && typeof result === 'object' && 'Err' in result) {
            console.error('Approval error:', result.Err);
            alert('Failed to approve NFT for listing');
            return;
          }
        }
      }

      // 2. Create the listing intent
      const userAccount: Account__1 = {
        owner: typeof user.principal === 'string' ? Principal.fromText(user.principal) : user.principal,
        subaccount: []
      };

      // Create the NFT token spec (what we're offering)
      const nftTokenSpec: TokenSpec = {
        canister: Principal.fromText(nftCanisterId),
        inventory: [{ tokenIds: [tokenIdBigInt] }],
        meta: [],
        token_pointer: []
      };

      // Create the fungible token spec (what we want in return)
      const fungibleTokenSpec: TokenSpec = {
        canister: Principal.fromText(selectedToken.canisterId),
        inventory: [{ quantity: priceInTokenUnits }],
        meta: [],
        token_pointer: []
      };

      // Create intent_tokens escrow (the NFT we're offering)
      const intentTokensEscrow: Escrow = {
        target_intent_id: [],
        owner: userAccount,
        kind: {
          intent: [[nftTokenSpec]] // Array<[] | [TokenSpec]>
        },
        counterparty: [],
        lock_to_date: []
      };

      // Create intent features
      const intentTokensFeature: IntentFeature = {
        intent_tokens: [intentTokensEscrow]
      };

      const satisfyingTokensFeature: IntentFeature = {
        satisfying_tokens: [[fungibleTokenSpec]] // Array<Array<TokenSpec>>
      };

      const listIntentFeatures: Array<[] | [IntentFeature]> = [
        [intentTokensFeature],
        [satisfyingTokensFeature]
      ];

      const listIntentReq: ManageMarketRequest = {
        list_intent: listIntentFeatures
      };

      console.log("Creating listing intent:", listIntentReq);
      const listResult = await manageMarket.mutateAsync([listIntentReq]);
      console.log("List result:", listResult);

      alert('NFT listed successfully!');
      setShowListingForm(false);
      setPriceInput('');
      
      // Refresh the page or trigger a re-fetch of market data
      window.location.reload();

    } catch (error) {
      console.error('Failed to list NFT:', error);
      alert('Failed to list NFT. Please try again.');
    } finally {
      setIsListing(false);
    }
  };

  if (!showListingForm) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <span className="text-gray-500 text-xs">You own this NFT</span>
        <button
          className="ml-2 px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
          onClick={() => setShowListingForm(true)}
        >
          List for Sale
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 mt-2">
      <h4 className="text-sm font-semibold mb-2">List NFT for Sale</h4>
      
      <div className="mb-2">
        <label className="block text-xs text-gray-600 mb-1">Accept Token:</label>
        <select
          value={selectedToken.canisterId}
          onChange={(e) => {
            const token = APPROVED_FUNGIBLE_TOKENS.find(t => t.canisterId === e.target.value);
            if (token) setSelectedToken(token);
          }}
          className="w-full text-xs border rounded px-2 py-1"
        >
          {APPROVED_FUNGIBLE_TOKENS.map(token => (
            <option key={token.canisterId} value={token.canisterId}>
              {token.symbol} - {token.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-2">
        <label className="block text-xs text-gray-600 mb-1">Price ({selectedToken.symbol}):</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          placeholder="Enter price"
          className="w-full text-xs border rounded px-2 py-1"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleList}
          disabled={isListing || !priceInput}
          className="flex-1 px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isListing ? 'Listing...' : 'List NFT'}
        </button>
        <button
          onClick={() => setShowListingForm(false)}
          className="px-3 py-1 rounded bg-gray-400 text-white text-xs hover:bg-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
