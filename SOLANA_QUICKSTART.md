# Solana Quick Start Guide

Welcome to the Solana integration for the 99React NFT bridge! This guide will help you get started with bridging NFTs between Solana and the Internet Computer using the ICRC-99 protocol.

## Table of Contents

1. [Wallet Installation](#wallet-installation)
2. [Network Selection](#network-selection)
3. [Getting Test SOL](#getting-test-sol)
4. [Local Validator Setup](#local-validator-setup)
5. [Import Flow (Solana → IC)](#import-flow-solana--ic)
6. [Export Flow (IC → Solana)](#export-flow-ic--solana)
7. [Troubleshooting](#troubleshooting)

---

## Wallet Installation

The 99React bridge supports three major Solana wallets. You need to install at least one to get started.

### 1. Phantom (Recommended for Beginners)

**Most Popular Solana Wallet**

- **Download**: [phantom.app](https://phantom.app)
- **Platforms**: Chrome, Firefox, Brave, Edge, iOS, Android
- **Features**: 
  - Simple, intuitive interface
  - Built-in token swaps
  - NFT gallery with automatic detection
  - Hardware wallet support (Ledger)

**Installation Steps:**
1. Visit [phantom.app](https://phantom.app)
2. Click "Download" and select your browser
3. Install the extension
4. Create a new wallet or import existing seed phrase
5. **Important**: Write down your seed phrase and store it securely!

### 2. Backpack (Recommended for Developers)

**Developer-Friendly Wallet**

- **Download**: [backpack.app](https://backpack.app)
- **Platforms**: Chrome, iOS, Android
- **Features**:
  - Custom RPC endpoint support (perfect for localhost)
  - Multi-chain support (Solana + others)
  - xNFT applications
  - Advanced settings

**Installation Steps:**
1. Visit [backpack.app](https://backpack.app)
2. Download for your platform
3. Create account (uses unique username system)
4. Import Solana wallet or create new one
5. **For developers**: Configure custom RPC in Settings → Network

### 3. Solflare

**Feature-Rich Wallet**

- **Download**: [solflare.com](https://solflare.com)
- **Platforms**: Chrome, Firefox, Brave, Edge, iOS, Android
- **Features**:
  - Hardware wallet integration (Ledger)
  - Portfolio tracking and analytics
  - Staking support
  - Multiple account support

**Installation Steps:**
1. Visit [solflare.com](https://solflare.com)
2. Select "Download" and choose your platform
3. Install and launch the extension
4. Create new wallet or import existing
5. Save your seed phrase securely

---

## Network Selection

Solana has multiple networks (clusters) for different purposes:

### 🌐 Mainnet-Beta (Production)

- **Use for**: Real NFTs with actual value
- **RPC**: `https://api.mainnet-beta.solana.com`
- **SOL cost**: Real money - must purchase SOL
- **Explorer**: [https://explorer.solana.com](https://explorer.solana.com)

**When to use:**
- Production deployments
- Trading real NFTs
- Launching collections

### 🧪 Devnet (Testing)

- **Use for**: Development and testing
- **RPC**: `https://api.devnet.solana.com`
- **SOL cost**: Free from faucet
- **Explorer**: [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)

**When to use:**
- Testing bridge functionality
- Developing new features
- Learning how Solana works

### 🔬 Testnet (Experimental)

- **Use for**: Testing with latest features
- **RPC**: `https://api.testnet.solana.com`
- **SOL cost**: Free from faucet
- **Explorer**: [https://explorer.solana.com/?cluster=testnet](https://explorer.solana.com/?cluster=testnet)

**When to use:**
- Testing experimental Solana features
- Rare - most development uses devnet

### 🔧 Localnet (Local Development)

- **Use for**: Offline development
- **RPC**: `http://localhost:8899`
- **SOL cost**: Free via airdrop command
- **No public explorer**: Use local tools

**When to use:**
- Offline development
- Fast iteration without network delays
- Testing without rate limits

---

## Getting Test SOL

You need SOL to pay for transactions on Solana. Here's how to get test SOL for development:

### Devnet Faucet (Easiest)

**Web Interface:**
1. Visit [https://faucet.solana.com](https://faucet.solana.com)
2. Enter your wallet address
3. Select "Devnet"
4. Click "Confirm Airdrop"
5. Wait ~30 seconds
6. Check your wallet - you should have 1-2 SOL

**Command Line:**
```bash
# Install Solana CLI if not already installed
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Request airdrop (replace with your address)
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet

# Check balance
solana balance <YOUR_WALLET_ADDRESS> --url devnet
```

**Rate Limits:**
- 1 airdrop per hour per address
- 2 SOL per airdrop
- Use multiple wallets if you need more

### Localnet Airdrop

When using local validator:

```bash
# Airdrop any amount (no limits)
solana airdrop 1000 <YOUR_WALLET_ADDRESS> --url localhost

# Or airdrop to wallet directly
solana airdrop 1000 $(solana address) --url localhost
```

### Mainnet SOL (Production)

For mainnet, you must purchase SOL:

**Centralized Exchanges:**
- Coinbase: [coinbase.com](https://coinbase.com)
- Binance: [binance.com](https://binance.com)
- Kraken: [kraken.com](https://kraken.com)

**Decentralized Exchanges:**
- Jupiter: [jup.ag](https://jup.ag)
- Raydium: [raydium.io](https://raydium.io)

**Cross-chain Bridges:**
- Wormhole: [wormhole.com](https://wormhole.com)
- Allbridge: [allbridge.io](https://allbridge.io)

---

## Local Validator Setup

For offline development and fast iteration:

### 1. Install Solana CLI

```bash
# macOS, Linux, WSL
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Verify installation
solana --version
```

### 2. Start Local Validator

```bash
# Basic validator
solana-test-validator

# With Metaplex programs (for NFT support)
solana-test-validator \
  --clone-upgradeable-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s \
  --url https://api.mainnet-beta.solana.com

# With custom settings
solana-test-validator \
  --reset \                          # Reset ledger on restart
  --limit-ledger-size 50000000 \     # Limit disk usage
  --rpc-port 8899 \                  # Default RPC port
  --quiet                             # Less verbose output
```

**Validator will start at:**
- RPC: `http://localhost:8899`
- WebSocket: `ws://localhost:8900`

### 3. Configure Wallet for Localhost

#### Backpack (Recommended):
1. Open Backpack settings
2. Navigate to "Network"
3. Enter custom RPC: `http://localhost:8899`
4. Save

#### Phantom:
1. Settings → Developer Settings
2. Enable "Testnet Mode"
3. Select "Localhost"
4. Enter `http://localhost:8899`

### 4. Fund Your Wallet

```bash
# Airdrop SOL to your wallet
solana airdrop 1000 <YOUR_ADDRESS> --url localhost

# Or use CLI to get your address
WALLET_ADDRESS=$(solana address)
solana airdrop 1000 $WALLET_ADDRESS --url localhost
```

### 5. Verify Setup

```bash
# Check balance
solana balance --url localhost

# Check validator is running
solana cluster-version --url localhost

# View recent transactions
solana transaction-history --url localhost
```

### 6. Stop Validator

```bash
# Ctrl+C in terminal where validator is running

# Or kill all validators
pkill -f solana-test-validator
```

---

## Import Flow (Solana → IC)

**Objective**: Burn an NFT on Solana and mint it on the Internet Computer

### Step 1: Connect Wallet

1. Open the 99React bridge interface
2. Click "Import from Solana"
3. Click "Connect Wallet"
4. Select your wallet (Phantom/Backpack/Solflare)
5. Approve connection in wallet popup
6. Verify connection - your address should appear
7. Select target cluster (devnet for testing)

**Troubleshooting:**
- Wallet not appearing? Refresh page and try again
- "No wallet detected"? Make sure extension is installed and enabled
- Connection rejected? Check wallet isn't locked

### Step 2: Select NFTs

1. Wait for NFTs to load (uses Metaplex to discover)
2. Browse your collections
3. Click on a collection to expand
4. Select individual NFTs to bridge
5. Review selection count
6. Click "Continue"

**What happens:**
- Metaplex queries all NFTs you own
- NFTs are grouped by collection
- Metadata is loaded from on-chain + off-chain sources
- Verified collections show ✓ checkmark

**Tips:**
- Can select multiple NFTs at once
- NFTs from different collections can be bridged together
- Search/filter if you have many NFTs

### Step 3: Create Canister (First Time Only)

If you don't have a ckNFT canister yet:

1. Review canister creation cost (~1 TC)
2. Make sure you have sufficient cycles in your IC wallet
3. Click "Approve Cycles"
4. Confirm in IC wallet/agent
5. Wait for canister creation (~30 seconds)
6. **Save your canister ID** - you'll reuse it

**Note:**
- Only needed once per user
- Subsequent imports use same canister
- Canister is owned by your IC principal

### Step 4: Estimate Costs

1. Review minting costs (~0.5 TC per NFT)
2. See 120% buffer for approval
3. Total cost = (Number of NFTs × 0.5 TC) × 1.2
4. Click "Approve Cycles"
5. Confirm allowance in IC wallet
6. Wait for approval confirmation

**Cost Breakdown:**
```
Example: 3 NFTs
Base: 3 × 0.5 TC = 1.5 TC
Buffer: 1.5 TC × 1.2 = 1.8 TC
Total approval: 1.8 TC
```

### Step 5: Bridge Execution

**For each selected NFT:**

1. **Burn on Solana:**
   - Transaction created to burn NFT
   - Wallet popup to approve
   - Click "Approve" in wallet
   - Wait for Solana confirmation
   - Burn signature captured

2. **Mint on IC:**
   - Burn proof sent to orchestrator
   - ckNFT minted on your canister
   - Token ID assigned
   - Metadata copied from Solana

**Progress Tracking:**
- See real-time status for each NFT
- ✅ Completed
- ⏳ In Progress  
- ❌ Failed (can retry)

**Important:**
- Don't close browser during bridging
- Each NFT processes independently
- Failed burns can be retried
- Burn proofs are preserved

### Step 6: Completion

1. Review successful bridges
2. See your new IC token IDs
3. Click "View on IC Dashboard" to see NFTs
4. Burn signatures saved for verification

**Verification:**
```bash
# Check balance in your ckNFT canister
dfx canister call <YOUR_CANISTER> icrc7_balance_of '(
  vec {
    record {
      owner = principal "<YOUR_PRINCIPAL>";
      subaccount = null;
    }
  }
)'
```

---

## Export Flow (IC → Solana)

**Objective**: Cast an IC ckNFT back to its source on Solana

### Step 1: Select IC NFTs

1. Choose your ckNFT canister
2. View your IC NFTs
3. Filter for Solana-compatible NFTs (must have source pointer)
4. Select NFT(s) to export
5. Click "Continue"

**Requirements:**
- NFT must have Solana source pointer (from previous import)
- You must be the owner
- Canister must support ICRC-99 cast operation

### Step 2: Network Selection

1. View source network from NFT metadata
2. Select target Solana cluster
3. **Warning if mismatch**: NFT from devnet but targeting mainnet
4. Connect Solana wallet
5. Confirm target address
6. Click "Continue"

**Best Practice:**
- Match source cluster (devnet → devnet)
- Use same wallet that originally owned NFT (if possible)

### Step 3: Review Costs

**Cycles Cost (IC):**
- Orchestrator gas fee: ~0.1 TC per NFT
- Approval for 120% buffer
- Must approve cycles ledger

**SOL Cost (Solana):**

**If Collection Exists:**
```
Per NFT:
- NFT mint: 0.001 SOL
- Token account: 0.002 SOL  
- Metadata: 0.002 SOL
- Master edition: 0.001 SOL
- Priority fee: 0-0.002 SOL (based on preset)
Total: ~0.006-0.008 SOL per NFT
```

**If New Collection Needed:**
```
One-time deployment:
- Collection mint: 0.001 SOL
- Collection metadata: 0.002 SOL
- Master edition: 0.001 SOL
Total: ~0.004 SOL

Plus per-NFT costs above
```

**Priority Fee Selection:**
- **None**: 0 SOL, ~1-2 minutes
- **Low**: 0.0001 SOL, ~30-60 seconds
- **Medium**: 0.0005 SOL, ~15-30 seconds (recommended)
- **High**: 0.001 SOL, ~5-15 seconds

### Step 4: Approve Cycles

1. Click "Approve Cycles"
2. Confirm in IC wallet
3. Wait for orchestrator allowance confirmation
4. Click "Approve Casting"
5. Approve each NFT for casting
6. Wait for canister approvals

**Dual Approval:**
- Orchestrator needs allowance for gas
- Canister needs approval to cast each NFT
- Both expire in 24 hours

### Step 5: Fund Solana Address

**Funding address provided by orchestrator:**

1. Copy funding address
2. Transfer required SOL amount

**Methods by Cluster:**

**Localnet:**
```bash
solana airdrop <AMOUNT> <FUNDING_ADDRESS> --url localhost
```

**Devnet:**
1. Visit [faucet.solana.com](https://faucet.solana.com)
2. Paste funding address
3. Request airdrop

**Mainnet:**
1. Transfer from your wallet
2. Or scan QR code
3. Wait for confirmation

**Verification:**
- UI polls balance automatically
- Shows checkmark when sufficient
- Proceeds when ready

### Step 6: Collection Deployment (If Needed)

If collection doesn't exist on target Solana cluster:

1. Review collection metadata
2. Confirm deployment
3. Orchestrator creates collection on Solana
4. Uses funding address for transaction fees
5. Wait for deployment (~30-60 seconds)
6. Collection address saved

**Progress:**
- ⏳ Deploying collection...
- ✅ Collection deployed
- 📍 Address: `<COLLECTION_MINT>`

### Step 7: Execute Cast

1. Click "Export Now"
2. For each NFT:
   - Orchestrator calls `icrc99_cast`
   - Transaction signed with IC
   - NFT minted on Solana via service canister
   - Confirmation on both chains
3. Track progress for each NFT
4. View Solana transaction signatures

**Real-time Status:**
- Casting... (IC transaction pending)
- Minting... (Solana transaction pending)
- Confirming... (waiting for finality)
- Complete ✅ (visible in Solana wallet)

### Step 8: Completion

1. All NFTs successfully exported
2. View Solana transaction links
3. Click "View in Phantom/Backpack/Solflare"
4. NFTs now in Solana wallet
5. IC ckNFTs marked as cast

**Verification:**

Check Solana Explorer:
```
https://explorer.solana.com/address/<NFT_MINT>?cluster=devnet
```

Check IC canister:
```bash
# NFT should show cast status
dfx canister call <CANISTER> icrc99_get_cast_status '(<TOKEN_ID>)'
```

---

## Troubleshooting

### Wallet Connection Issues

#### "No wallet detected"

**Problem**: Browser extension not detected

**Solutions:**
1. Refresh the page
2. Check extension is installed and enabled
3. Try different browser
4. Restart browser
5. Check no other dApps have exclusive lock

#### "Connection rejected"

**Problem**: User or wallet denied connection

**Solutions:**
1. Try connecting again
2. Check wallet isn't locked (enter password)
3. Review and approve in wallet popup
4. Check wallet isn't in "locked dApp" mode

#### "Wallet connected but balance not showing"

**Problem**: RPC connection issue

**Solutions:**
1. Wait 10-20 seconds for RPC response
2. Switch to different RPC endpoint
3. Check network status: [status.solana.com](https://status.solana.com)
4. Try different wallet

### NFT Loading Issues

#### "No NFTs found"

**Problem**: Metaplex not finding NFTs

**Solutions:**
1. Confirm you own NFTs on selected cluster
2. Wait 30-60 seconds for full load
3. Try refreshing/reconnecting wallet
4. Check correct cluster selected
5. Verify NFTs are Metaplex standard (not all Solana NFTs are)

#### "NFT images not loading"

**Problem**: Metadata URI unavailable

**Solutions:**
1. Wait - some URIs are slow (Arweave, IPFS)
2. Check if original collection has metadata issues
3. NFT can still bridge without image
4. Try different network/VPN if geo-blocked

### Bridging Errors

#### Import: "Burn transaction failed"

**Problem**: Solana transaction rejected

**Solutions:**
1. Check sufficient SOL for transaction fee (~0.000005 SOL)
2. Verify you still own the NFT
3. Check wallet isn't in "simulation mode"
4. Increase priority fee
5. Retry transaction

#### Import: "Mint failed on IC"

**Problem**: IC transaction rejected after Solana burn

**Solutions:**
1. **Don't panic** - burn proof is saved
2. Contact support with burn signature
3. Check cycles balance
4. Retry mint with same burn proof
5. NFT can be recovered

#### Export: "Insufficient allowance"

**Problem**: Approval expired or insufficient

**Solutions:**
1. Re-approve cycles ledger
2. Check 24-hour expiry hasn't passed
3. Approve higher amount (120% buffer)
4. Re-approve NFT casting

#### Export: "Not enough SOL in funding address"

**Problem**: Funding address balance too low

**Solutions:**
1. Transfer more SOL
2. Check correct address
3. Wait for transfer confirmation
4. Verify on explorer
5. UI auto-detects when sufficient

### Local Validator Issues

#### "Cannot connect to localhost:8899"

**Problem**: Validator not running

**Solutions:**
```bash
# Check if running
curl http://localhost:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Start validator
solana-test-validator

# If port in use, kill existing
pkill -f solana-test-validator
```

#### "Validator starts then immediately stops"

**Problem**: Ledger corruption or port conflict

**Solutions:**
```bash
# Reset ledger
solana-test-validator --reset

# Use different port
solana-test-validator --rpc-port 8898

# Check disk space
df -h

# Clear test ledger
rm -rf test-ledger/
```

### Performance Issues

#### "Transactions very slow"

**Problem**: Network congestion or RPC rate limiting

**Solutions:**
1. Increase priority fee (Medium or High)
2. Switch to different RPC endpoint
3. Use paid RPC service (Alchemy, QuickNode)
4. Wait for network congestion to clear
5. Use localnet for development

#### "Metaplex loading forever"

**Problem**: RPC rate limits or slow metadata

**Solutions:**
1. Wait 2-3 minutes - some metadata is slow
2. Switch RPC endpoint
3. Use paid RPC (no rate limits)
4. Load fewer NFTs at once
5. Use localnet with cloned programs

### Cost/Payment Issues

#### "Not enough cycles"

**Problem**: Insufficient IC cycles for operation

**Solutions:**
1. Check cycles balance in wallet
2. Get more cycles from exchange
3. Top up cycles ledger
4. Reduce number of NFTs per batch
5. Ask for cycles from faucet (testnet)

#### "Approval failed"

**Problem**: ICRC-2 approval rejected

**Solutions:**
1. Check wallet/agent is connected
2. Verify sufficient cycles for approval + fee
3. Try approving higher amount
4. Check approval hasn't expired
5. Reconnect IC identity

### Still Having Issues?

**Get Help:**
- Discord: [discord.gg/99bridge](#)  
- GitHub Issues: [github.com/your-repo/issues](#)
- Documentation: [Full architecture docs](.plan/architecture/)
- Storybook: `pnpm run storybook` - See component examples

**Before Reporting:**
1. Check browser console for errors
2. Note exact error message
3. Screenshot the issue
4. Note cluster/network used
5. Provide transaction signatures if applicable

---

## Next Steps

- **Explore Storybook**: `pnpm run storybook` for component documentation
- **Read Architecture**: See `.plan/architecture/` for technical details  
- **Join Community**: Connect with other developers
- **Build Features**: Use this bridge in your own dApps

Happy bridging! 🌉✨
