# NFID IdentityKit Integration

This project has been updated to use NFID IdentityKit for authentication and canister interactions on the Internet Computer.

## Key Changes

### 1. AgentProvider Updates
- **Before**: Required manual identity management
- **After**: Automatically uses IdentityKit's authenticated agents
- **Removed**: `identity` prop from AgentProvider
- **Added**: Automatic authentication state management

### 2. Actor Management
- **New Hooks**:
  - `useAuthenticatedActor<T>()` - For mutations requiring authentication
  - `useAnonymousActor<T>()` - For public queries
  - `useActor<T>()` - Automatically chooses authenticated or anonymous

### 3. Authentication Hooks
- `useAuth()` - Connection, disconnection, and user data
- `useIsAuthenticated()` - Boolean authentication status

### 4. Mutation Updates
All mutation hooks now:
- Require user authentication
- Show wallet approval prompts (in ACCOUNTS mode)
- Throw clear errors when not authenticated
- Use authenticated actors for all update calls

## Configuration

### ACCOUNTS Mode (Current Setup)
```tsx
<IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
```
- Every transaction requires wallet approval
- Maximum security and transparency
- Supported by NFID, Plug, OISY wallets

### DELEGATION Mode (Alternative)
```tsx
<IdentityKitProvider authType={IdentityKitAuthType.DELEGATION}>
```
- Pre-approved transactions (legacy mode)
- Better UX but less transparent
- Supported by most wallets

## Usage Examples

### Basic Authentication
```tsx
import { useAuth, useIsAuthenticated } from './hooks/useAuth';

function MyComponent() {
  const { connect, disconnect, user } = useAuth();
  const isAuthenticated = useIsAuthenticated();
  
  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Connected: {user?.principal.toString()}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={() => connect()}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### NFT Operations
```tsx
import { useTransferNFT, useMintNFT } from './hooks/useNFTMutations';

function NFTComponent() {
  const transferNFT = useTransferNFT('canister-id');
  const mintNFT = useMintNFT('canister-id');
  
  // These will automatically require authentication
  // and show wallet approval prompts
  
  const handleTransfer = () => {
    transferNFT.mutate({
      to: { principal: targetPrincipal, subaccount: [] },
      token_id: 123n,
      // ...other args
    });
  };
}
```

### Market Operations
```tsx
import { useManageMarket } from './hooks/useMarketMutations';

function MarketComponent() {
  const manageMarket = useManageMarket('market-canister-id');
  
  const handleListIntent = () => {
    manageMarket.mutate([{
      List: {
        // intent listing parameters
      }
    }]);
  };
}
```

## Error Handling

All mutations will throw errors with clear messages:
- `"User must be authenticated to transfer NFTs"`
- `"User must be authenticated to manage market"`
- etc.

Handle these in your UI:
```tsx
try {
  await transferNFT.mutateAsync(args);
} catch (error) {
  if (error.message.includes('authenticated')) {
    // Show "Please connect wallet" message
  }
}
```

## Migration Checklist

- [x] Updated AgentProvider to use IdentityKit
- [x] Created authentication hooks
- [x] Updated all NFT mutation hooks
- [x] Updated all market mutation hooks
- [x] Added authentication checks
- [x] Configured ACCOUNTS mode in main.tsx
- [x] Created usage examples

## Wallet Support

Currently supported wallets with ACCOUNTS mode:
- ✅ NFID Wallet
- ✅ Plug
- ✅ OISY
- ❌ Internet Identity (DELEGATION mode only)
- ❌ Stoic (DELEGATION mode only)

## Benefits

1. **Security**: Every transaction requires explicit wallet approval
2. **Transparency**: Users see exactly what they're signing
3. **Flexibility**: Support for both ACCOUNTS and DELEGATION modes
4. **Developer Experience**: Clear authentication state management
5. **Error Handling**: Automatic authentication checks with clear error messages

## Next Steps

1. Test wallet connections in your development environment
2. Verify mutation operations show approval prompts
3. Test error handling for unauthenticated states
4. Consider adding loading states for connection/disconnection
5. Add user feedback for successful/failed transactions
