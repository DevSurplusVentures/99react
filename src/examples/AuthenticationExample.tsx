// Example usage of the new NFID IdentityKit authentication system

import { useAuth, useIsAuthenticated } from '../hooks/useAuth';
import { useTransferNFT, useMintNFT } from '../hooks/useNFTMutations';
import { useManageMarket } from '../hooks/useMarketMutations';

export function ExampleComponent() {
  const { connect, disconnect, user, isConnecting } = useAuth();
  const isAuthenticated = useIsAuthenticated();
  
  // NFT mutations - require authentication
  const transferNFT = useTransferNFT('your-nft-canister-id');
  const mintNFT = useMintNFT('your-nft-canister-id');
  
  // Market mutations - require authentication
  const manageMarket = useManageMarket('your-market-canister-id');

  const handleConnect = () => {
    connect(); // Will open wallet selection modal
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleTransfer = async () => {
    if (!isAuthenticated) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      await transferNFT.mutateAsync({
        to: { principal: user!.principal, subaccount: [] },
        token_id: 123n,
        memo: [],
        created_at_time: [],
      });
      console.log('Transfer successful!');
    } catch (error) {
      console.error('Transfer failed:', error);
    }
  };

  const handleMint = async () => {
    if (!isAuthenticated) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      await mintNFT.mutateAsync({
        tokens: [{
          token_id: 124n,
          owner: user!.principal,
          metadata: [['name', { Text: 'My NFT' }]],
          memo: [],
          created_at_time: [],
        }],
      });
      console.log('Mint successful!');
    } catch (error) {
      console.error('Mint failed:', error);
    }
  };

  return (
    <div>
      <h2>Authentication Status</h2>
      {isConnecting && <p>Connecting...</p>}
      {isAuthenticated ? (
        <div>
          <p>Connected as: {user?.principal.toString()}</p>
          <button onClick={handleDisconnect}>Disconnect</button>
          <button onClick={handleTransfer} disabled={transferNFT.isPending}>
            Transfer NFT
          </button>
          <button onClick={handleMint} disabled={mintNFT.isPending}>
            Mint NFT
          </button>
        </div>
      ) : (
        <div>
          <p>Not connected</p>
          <button onClick={handleConnect}>Connect Wallet</button>
        </div>
      )}
    </div>
  );
}

/*
Key Features of the New System:

1. **Automatic Authentication Checks**: All mutation hooks automatically check if the user 
   is authenticated before making calls. If not authenticated, they throw an error.

2. **Wallet Approval Prompts**: When using ACCOUNTS mode, every authenticated transaction 
   will display a wallet approval prompt for explicit user consent.

3. **Anonymous Queries**: Query operations can use anonymous agents when authentication 
   is not required, improving performance for public data.

4. **Flexible Configuration**: The system supports both ICRC28 (signer chain) and 
   ACCOUNTS mode, configurable in the IdentityKitProvider.

5. **Error Handling**: Clear error messages when authentication is required but not present.

Usage Guidelines:

- **Mutations**: Always require authentication and will show wallet prompts
- **Queries**: Use anonymous agents by default for better performance
- **Authentication**: Use useAuth() hook to manage connection state
- **Actor Creation**: Use useAuthenticatedActor for mutations, useAnonymousActor for queries

Configuration Options:

In main.tsx, you can switch between modes:
- IdentityKitAuthType.ACCOUNTS: Every transaction requires wallet approval
- IdentityKitAuthType.DELEGATION: Uses delegated identity (pre-approved transactions)

The current setup uses ACCOUNTS mode for maximum security and transparency.
*/
