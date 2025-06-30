# useNFTMutations

All mutation hooks require a canisterId and use the authenticated agent from context. Each uses TanStack `useMutation` and invalidates relevant queries on success.

## Usage

```ts
const transfer = useTransferNFT(canisterId)
transfer.mutate([{ to: {...}, token_id, ... }])

const approve = useApproveTokens(canisterId)
approve.mutate([{ token_id, approval_info: {...} }])

const approveColl = useApproveCollection(canisterId)
approveColl.mutate([{ approval_info: {...} }])

const transferFrom = useTransferFrom(canisterId)
transferFrom.mutate([{ ... }])

const revokeTokenApproval = useRevokeTokenApproval(canisterId)
revokeTokenApproval.mutate([{ ... }])

const revokeCollectionApproval = useRevokeCollectionApproval(canisterId)
revokeCollectionApproval.mutate([{ ... }])

const mint = useMintNFT(canisterId)
mint.mutate([...])
```

## Mutation Arguments
- See the Typescript types for each mutation's required arg.

## Notes
- All actions require an authenticated/authorized agent context (provided by your provider/wallet integration).
- On mutation, hooks auto-invalidate all queries for live consistency.