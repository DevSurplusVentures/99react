# useNFTOwner

Fetch the owner (full Account object) for an NFT.

```ts
const { owner, loading, error } = useNFTOwner(
  canisterId,
  tokenId,
  {
    override: async (canisterId, tokenId, queryArgs) => { /* custom fetch */ },
    queryArgs: { /* additional params */ }
  }
);
```

- Batches requests for efficiency by default.
- Pass an `override` to use your own backend or cache.
- Returns `{ owner, loading, error }` where owner is `{ owner: string, subaccount?: Uint8Array }` or null.

# useNFTOwnerOf

Fetch all tokenIds that a user owns in a collection (with pagination handled for you).

```ts
const { tokenIds, loading, error } = useNFTOwnerOf(
  canisterId,
  { owner: principal, subaccount?: Uint8Array },
  {
    override: async (canisterId, account, queryArgs) => { /* custom fetch */ },
    queryArgs:
  }
);
```

# useNFTCollection

Fetch static, metadata for the NFT collection:

```ts
const { collection, loading, error } = useNFTCollection(
  canisterId,
  {
    override: async (canisterId, queryArgs) => { /* custom fetch */ } 
  }
);
```

- Collection metadata includes symbol, name, description, cap, etc, fully parsed.

# Options / Customization

- All fetching hooks allow an `override` function for custom side-loading or pre-caching (e.g. via an API endpoint, etc.).
- All hooks take an optional `queryArgs` bag, forwarded to your override as a third arg.