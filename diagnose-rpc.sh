#!/bin/bash

echo "🔍 Solana RPC Diagnostic Tool"
echo "=============================="
echo ""

WALLET="7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z"
NFT_MINT="AFKq1qdnmWevju6k6n9QdgWvy5K1ELuXy2bQagm1Sjbu"
TOKEN_ACCOUNT="2c8PKPLTvVywhyNZcTrU67UuR66A2KjzuieaeV1jMYes"

echo "Testing different RPC endpoints..."
echo ""

# Test 1: Localhost (test validator)
echo "1️⃣  Testing: http://127.0.0.1:8899 (Local Test Validator)"
echo "   Checking wallet balance..."
RESULT=$(curl -s http://127.0.0.1:8899 -X POST -H "Content-Type: application/json" -d "{
  \"jsonrpc\": \"2.0\",
  \"id\": 1,
  \"method\": \"getBalance\",
  \"params\": [\"$WALLET\"]
}" | jq -r '.result.value // "ERROR"')

if [ "$RESULT" != "ERROR" ] && [ "$RESULT" != "null" ]; then
    echo "   ✅ Connected! Balance: $RESULT lamports"
    
    echo "   Checking token account..."
    ACCOUNT=$(curl -s http://127.0.0.1:8899 -X POST -H "Content-Type: application/json" -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": 1,
      \"method\": \"getAccountInfo\",
      \"params\": [
        \"$TOKEN_ACCOUNT\",
        {\"encoding\": \"base64\"}
      ]
    }" | jq -r '.result.value // "null"')
    
    if [ "$ACCOUNT" != "null" ]; then
        echo "   ✅ Token account EXISTS on localhost!"
    else
        echo "   ❌ Token account NOT FOUND on localhost"
    fi
else
    echo "   ❌ Cannot connect to localhost"
fi

echo ""

# Test 2: Devnet
echo "2️⃣  Testing: https://api.devnet.solana.com (Devnet)"
echo "   Checking wallet balance..."
RESULT=$(curl -s https://api.devnet.solana.com -X POST -H "Content-Type: application/json" -d "{
  \"jsonrpc\": \"2.0\",
  \"id\": 1,
  \"method\": \"getBalance\",
  \"params\": [\"$WALLET\"]
}" | jq -r '.result.value // "ERROR"')

if [ "$RESULT" != "ERROR" ] && [ "$RESULT" != "null" ]; then
    echo "   ✅ Connected! Balance: $RESULT lamports"
    
    echo "   Checking token account..."
    ACCOUNT=$(curl -s https://api.devnet.solana.com -X POST -H "Content-Type: application/json" -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": 1,
      \"method\": \"getAccountInfo\",
      \"params\": [
        \"$TOKEN_ACCOUNT\",
        {\"encoding\": \"base64\"}
      ]
    }" | jq -r '.result.value // "null"')
    
    if [ "$ACCOUNT" != "null" ]; then
        echo "   ⚠️  Token account EXISTS on Devnet (wrong network!)"
    else
        echo "   ✅ Token account not on Devnet (expected)"
    fi
else
    echo "   ❌ Cannot connect to Devnet"
fi

echo ""

# Test 3: Mainnet
echo "3️⃣  Testing: https://api.mainnet-beta.solana.com (Mainnet)"
echo "   Checking wallet balance..."
RESULT=$(curl -s https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" -d "{
  \"jsonrpc\": \"2.0\",
  \"id\": 1,
  \"method\": \"getBalance\",
  \"params\": [\"$WALLET\"]
}" | jq -r '.result.value // "ERROR"')

if [ "$RESULT" != "ERROR" ] && [ "$RESULT" != "null" ]; then
    echo "   ✅ Connected! Balance: $RESULT lamports"
    
    echo "   Checking token account..."
    ACCOUNT=$(curl -s https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": 1,
      \"method\": \"getAccountInfo\",
      \"params\": [
        \"$TOKEN_ACCOUNT\",
        {\"encoding\": \"base64\"}
      ]
    }" | jq -r '.result.value // "null"')
    
    if [ "$ACCOUNT" != "null" ]; then
        echo "   ⚠️  Token account EXISTS on Mainnet (WRONG! Should be localhost)"
    else
        echo "   ✅ Token account not on Mainnet (expected)"
    fi
else
    echo "   ❌ Cannot connect to Mainnet"
fi

echo ""
echo "📊 Summary:"
echo "==========="
echo ""
echo "Your test NFTs should ONLY exist on localhost (http://127.0.0.1:8899)"
echo ""
echo "If your wallet is configured to use Devnet or Mainnet, you'll need to:"
echo "  1. Switch your wallet to 'Localhost' network"
echo "  2. Set custom RPC: http://127.0.0.1:8899"
echo "  3. Refresh the app"
echo ""
echo "The app will log which RPC it's using in the browser console:"
echo "  Look for: 'Connection details: { rpcEndpoint: ... }'"
