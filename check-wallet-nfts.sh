#!/bin/bash

# Script to check what NFTs are owned by a specific wallet address
# on the local Solana test validator

WALLET_ADDRESS="7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z"
RPC_URL="http://127.0.0.1:8899"

echo "🔍 Checking NFTs owned by wallet: $WALLET_ADDRESS"
echo "================================================"
echo ""

echo "📋 Fetching all token accounts..."
RESPONSE=$(curl -s $RPC_URL -X POST -H "Content-Type: application/json" -d "{
  \"jsonrpc\": \"2.0\",
  \"id\": 1,
  \"method\": \"getTokenAccountsByOwner\",
  \"params\": [
    \"$WALLET_ADDRESS\",
    {
      \"programId\": \"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA\"
    },
    {
      \"encoding\": \"jsonParsed\"
    }
  ]
}")

echo ""
echo "🎨 NFTs (tokens with amount=1, decimals=0):"
echo "============================================"

echo "$RESPONSE" | jq -r '.result.value[] | select(.account.data.parsed.info.tokenAmount.uiAmount == 1 and .account.data.parsed.info.tokenAmount.decimals == 0) | "
Mint Address: \(.account.data.parsed.info.mint)
Token Account: \(.pubkey)
Owner: \(.account.data.parsed.info.owner)
Amount: \(.account.data.parsed.info.tokenAmount.uiAmount)
---"'

echo ""
echo "📊 Total NFTs found:"
echo "$RESPONSE" | jq '[.result.value[] | select(.account.data.parsed.info.tokenAmount.uiAmount == 1 and .account.data.parsed.info.tokenAmount.decimals == 0)] | length'

echo ""
echo "✅ Done!"
