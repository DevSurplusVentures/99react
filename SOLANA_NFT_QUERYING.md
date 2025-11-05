# Solana NFT Querying Implementation

## Overview

Implemented comprehensive NFT querying functionality for the Solana burn flow. Users can now:
1. Auto-discover NFTs owned by their wallet
2. Manually input specific NFT mint addresses
3. View NFTs grouped by collection
4. See full Metaplex metadata

## Files Added/Modified

### 1. **src/lib/solana/nftQuery.ts** (NEW - 430 lines)

Utility library for querying Solana NFTs with Metaplex metadata:

**Key Functions:**
- `queryOwnedNFTs(connection, ownerAddress)` - Discovers all NFTs owned by a wallet
- `queryNFTByMint(connection, mintAddress, ownerAddress?)` - Queries a specific NFT by mint address
- `getNFTMetadata(connection, mintAddress)` - Fetches Metaplex metadata for an NFT
- `getMetadataPDA(mint)` - Derives Metaplex metadata PDA
- `parseMetadata(data)` - Parses raw Metaplex metadata account data
- `fetchMetadataJson(uri)` - Fetches JSON metadata from URI (Arweave/IPFS)
- `groupNFTsByCollection(nfts)` - Groups NFTs by collection address

**How It Works:**

```typescript
// Query all NFTs owned by wallet
const nfts = await queryOwnedNFTs(connection, publicKey);

// Query specific NFT by mint address  
const nft = await queryNFTByMint(connection, mintAddress);

// Each NFT includes:
{
  mintAddress: string;
  tokenAccount: string;
  name?: string;
  symbol?: string;
  uri?: string;
  collectionAddress?: string;
  image?: string;
  description?: string;
  metadata?: any;
}
```

**Process:**
1. Query all SPL Token accounts owned by wallet (`getTokenAccountsByOwner`)
2. Filter to NFTs (decimals = 0, amount = 1)
3. For each NFT:
   - Derive Metaplex metadata PDA
   - Fetch and parse metadata account
   - Fetch JSON metadata from URI (image, description, etc.)
   - Extract collection information

### 2. **src/components/bridge/SolanaBurnNFTSelectionStep.tsx** (UPDATED - 570 lines)

Enhanced NFT selection UI with querying capabilities:

**New Features:**

#### A. Auto-Discovery
- Automatically queries all NFTs owned by connected wallet
- Fetches full metadata (name, image, description, collection)
- Shows loading state while querying blockchain

```typescript
useEffect(() => {
  if (connected && publicKey && connection) {
    const nfts = await queryOwnedNFTs(connection, publicKey);
    setAvailableNFTs(nfts.map(nft => ({
      mintAddress: nft.mintAddress,
      collectionAddress: nft.collectionAddress || '',
      cluster,
      name: nft.name,
      description: nft.description,
      image: nft.image,
      metadata: nft.metadata,
    })));
  }
}, [connected, publicKey, connection]);
```

#### B. Manual Input
- "Add NFT by Mint Address" button
- Input field for paste/type mint address
- Validates and fetches metadata
- Useful for:
  - NFTs not auto-detected
  - Trapped NFTs from incomplete mints
  - Testing specific addresses

```typescript
const handleManualInput = async () => {
  const nft = await queryNFTByMint(connection, manualMintAddress.trim());
  if (nft) {
    setAvailableNFTs([selectedNFT, ...availableNFTs]);
    setSelectedNFT(selectedNFT);
  }
};
```

#### C. View Modes

**1. All NFTs View** (default)
- Grid display of all NFTs
- Shows name, image, mint address, collection
- Single-select with flame icon indicator

**2. Collection View**
- Groups NFTs by collection address
- Collection header with NFT count
- Expandable sections per collection
- Easier to find NFTs from same project

```typescript
const nftsByCollection = filteredNFTs.reduce((acc, nft) => {
  const collectionKey = nft.collectionAddress || 'uncategorized';
  acc.set(collectionKey, [...(acc.get(collectionKey) || []), nft]);
  return acc;
}, new Map());
```

#### D. Search & Filter
- Real-time search across name, mint address, collection
- Works in both view modes
- Case-insensitive matching

## Usage Flow

### User Journey:

1. **Connect Wallet** - User connects Solana wallet (Phantom, Backpack, etc.)
2. **Auto-Query** - System automatically queries blockchain for owned NFTs
3. **Browse Options:**
   - View all NFTs in grid
   - Switch to collection view
   - Search by name/address
4. **Manual Input (Optional):**
   - Click "Add NFT by Mint Address"
   - Paste mint address (e.g., `7PijVMKnnoCXy1iDNH36A5a7XTa97ydMqMen3PFe1QFS`)
   - System validates and adds to list
5. **Select NFT** - Click to select NFT for burn
6. **Proceed** - Continue to cost calculation step

### Example Use Cases:

#### Case 1: Normal Burn Flow
```
1. User owns NFT from cast operation
2. Auto-discovery finds it
3. User selects from grid
4. Proceeds to burn
```

#### Case 2: Trapped NFT Recovery
```
1. NFT mint started but incomplete
2. Not showing in wallet
3. User has mint address from logs/explorer
4. Clicks "Add NFT by Mint Address"
5. Pastes address
6. System validates and adds
7. User can now burn/recover
```

#### Case 3: Collection-Based Selection
```
1. User owns 100+ NFTs from multiple collections
2. Switches to "By Collection" view
3. Finds desired collection
4. Selects NFT from that collection
5. Proceeds to burn
```

## Technical Details

### Metaplex Metadata Structure

```typescript
interface MetaplexMetadata {
  key: number;                    // Metadata version
  updateAuthority: string;        // Who can update metadata
  mint: string;                   // NFT mint address
  name: string;                   // NFT name
  symbol: string;                 // Collection symbol
  uri: string;                    // JSON metadata URI
  sellerFeeBasisPoints: number;   // Royalty %
  creators?: Array<{              // Creator addresses
    address: string;
    verified: boolean;
    share: number;
  }>;
  primarySaleHappened: boolean;
  isMutable: boolean;
  collection?: {                  // Collection info
    verified: boolean;
    key: string;                  // Collection mint address
  };
}
```

### Metadata PDA Derivation

```typescript
// Metadata account is a PDA derived from:
// - "metadata" string
// - Metaplex program ID
// - NFT mint address
const [metadataPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('metadata'),
    METADATA_PROGRAM_ID.toBuffer(),
    mint.toBuffer(),
  ],
  METADATA_PROGRAM_ID
);
```

### JSON Metadata (from URI)

```json
{
  "name": "NFT Name",
  "description": "NFT description",
  "image": "https://arweave.net/...",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    }
  ],
  "properties": {
    "files": [
      {
        "uri": "https://...",
        "type": "image/png"
      }
    ],
    "category": "image"
  }
}
```

## Future Enhancements

### TODO: Orchestrator Integration
Currently shows ALL NFTs owned by wallet. Need to add filtering:

```typescript
// 1. Query orchestrator for controlled collections
const remotes = await orchestrator.get_remote();
const controlledCollections = remotes
  .filter(r => r.confirmed)
  .map(r => r.address);

// 2. Filter NFTs to only controlled collections
const burnableNFTs = allNFTs.filter(nft => 
  controlledCollections.includes(nft.collectionAddress)
);
```

### TODO: Collection Metadata
Fetch collection-level metadata for better UX:

```typescript
// Query collection mint metadata
const collectionMetadata = await getNFTMetadata(
  connection,
  new PublicKey(collectionAddress)
);

// Display collection name/image in grouped view
```

### TODO: Caching
Add local storage caching to reduce RPC calls:

```typescript
const cachedNFTs = localStorage.getItem(`nfts_${address}_${cluster}`);
if (cachedNFTs && Date.now() - cache.timestamp < 5 * 60 * 1000) {
  return JSON.parse(cachedNFTs);
}
```

## Testing

### Manual Testing Steps:

1. **Auto-Discovery:**
   - Connect wallet with NFTs
   - Verify all NFTs appear
   - Check images load correctly
   - Verify collection addresses shown

2. **Manual Input:**
   - Click "Add NFT by Mint Address"
   - Paste valid mint address
   - Verify NFT appears with metadata
   - Test invalid address (should error)

3. **View Modes:**
   - Toggle between views
   - Verify correct grouping
   - Check NFT counts match

4. **Search:**
   - Search by name
   - Search by mint address
   - Search by collection
   - Verify results update

5. **Selection:**
   - Select NFT
   - Verify flame icon appears
   - Verify "1 NFT selected" counter
   - Click "Clear selection"

### Integration with PIC Tests:

The test file already demonstrates the flow:

```typescript
// From solana_cast_collection_deployment.test.ts:1170
const aliceTokenAccounts = await solanaConnection!.getTokenAccountsByOwner(
  aliceSolanaKeypair.publicKey,
  { programId: TOKEN_PROGRAM_ID }
);

// Find NFT (amount = 1, decimals = 0)
for (const { account } of aliceTokenAccounts.value) {
  const accountData = AccountLayout.decode(account.data);
  if (accountData.amount === 1n) {
    const mintAddress = new PublicKey(accountData.mint);
    // This is an NFT!
  }
}
```

## Error Handling

### Common Errors:

1. **"No metadata found"** - NFT doesn't have Metaplex metadata
2. **"Not an NFT"** - Token has decimals > 0 or amount != 1
3. **"Failed to fetch metadata"** - RPC connection issue
4. **"Invalid mint address"** - Malformed address string

### Error Recovery:

```typescript
try {
  const nft = await queryNFTByMint(connection, mintAddress);
} catch (error) {
  if (error.message.includes('Account does not exist')) {
    setError('NFT not found on Solana');
  } else if (error.message.includes('Not an NFT')) {
    setError('Address is not an NFT (must be SPL Token with 0 decimals)');
  } else {
    setError('Failed to query NFT. Please try again.');
  }
}
```

## Performance Considerations

### Query Optimization:

1. **Parallel Fetching** - Fetch all metadata concurrently:
   ```typescript
   await Promise.all(nfts.map(nft => getNFTMetadata(connection, nft.mint)));
   ```

2. **Lazy Loading** - Don't fetch JSON metadata until needed
3. **Pagination** - For wallets with 100+ NFTs, implement virtual scrolling
4. **RPC Limits** - Be aware of rate limits (especially on free endpoints)

### Recommendations:

- Use dedicated RPC endpoint for production (e.g., Helius, QuickNode)
- Implement retry logic for failed requests
- Cache results in localStorage
- Show loading skeletons for better UX

## References

- **Metaplex Docs**: https://docs.metaplex.com/
- **SPL Token Program**: https://spl.solana.com/token
- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js/
- **PIC Test Reference**: `pic/solana/solana_cast_collection_deployment.test.ts:1170-1230`
