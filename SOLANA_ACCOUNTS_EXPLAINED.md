# Solana Account Model Explained 🔑

## The Confusion: "Owner" vs "Authority"

In Solana, **"owner"** has a specific technical meaning that's different from what you might expect!

### Your Wallet (System Account)
```
Address: 7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z
Owner: System Program (11111111111111111111111111111111)
You Control: ✅ YES (you have the private key)
Holds: SOL (for fees, rent, etc.)
```

**"Owner"** = The Solana **program** that controls the account's data
**You** = The **keypair holder** who can sign transactions

### Token Account (NFT Holder)
```
Address: 2c8PKPLTvVywhyNZcTrU67UuR66A2KjzuieaeV1jMYes (derived address)
Owner: Token Program (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
Authority: YOUR WALLET (7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z)
You Control: ✅ YES (your wallet is the "authority")
Holds: 1 NFT token
```

**"Owner"** = The **Token Program** (manages all token accounts)
**"Authority"** = **Your wallet** (can transfer the tokens)

## How It Works Together

```
┌─────────────────────────────────────────────────┐
│ Your Wallet (System Account)                    │
│ 7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z    │
│                                                  │
│ • You sign transactions with your private key   │
│ • Holds SOL for fees                            │
│ • Owner: System Program                         │
└───────────────┬─────────────────────────────────┘
                │
                │ is "authority" of
                │
                ▼
┌─────────────────────────────────────────────────┐
│ Token Account (holds the NFT)                   │
│ 2c8PKPLTvVywhyNZcTrU67UuR66A2KjzuieaeV1jMYes   │
│                                                  │
│ • Derived address (PDA)                         │
│ • Holds: 1 NFT (mint: AFKq1qdnm...)            │
│ • Owner: Token Program                          │
│ • Authority: Your Wallet ←── YOU CONTROL THIS   │
└─────────────────────────────────────────────────┘
```

## What This Means For Transfers

When you transfer an NFT:

1. **Your wallet** signs the transaction
2. The **Token Program** (as owner) executes the transfer
3. Your wallet must be the **authority** of the source token account
4. The destination gets a new token account with THEM as authority

## The RPC Issue

If you're using a **custom RPC endpoint**, it might be:
- ❌ Not synced with the local test validator
- ❌ Looking at mainnet instead of localhost
- ❌ Cached/stale data

### Check Your RPC:

The bridge will log:
```
Connection details: {
  rpcEndpoint: "http://127.0.0.1:8899",  // Should be localhost for test validator
  commitment: "confirmed"
}
```

If it shows a different endpoint (like mainnet-beta, devnet, or a remote URL), that's the problem!

### Fix:

Make sure your wallet is configured to use the **local test validator**:
```
RPC Endpoint: http://127.0.0.1:8899
Network: Localhost
```

## Summary

✅ **YES** - The "owner" (authority) should be your wallet address
✅ **BUT** - The account's technical "owner" is the Token Program
✅ **YOU** - Control the tokens because your wallet is the "authority"

The confusion comes from Solana using "owner" to mean "which program controls this account" rather than "who owns the assets". The assets are controlled by the "authority" field!
