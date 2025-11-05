import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Account {
  'owner' : Principal,
  'subaccount' : [] | [Subaccount],
}
export interface Account__1 {
  'owner' : Principal,
  'subaccount' : [] | [Uint8Array | number[]],
}
export interface ApprovalInfo {
  'memo' : [] | [Uint8Array | number[]],
  'from_subaccount' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
  'expires_at' : [] | [bigint],
  'spender' : Account,
}
export interface ApproveCollectionArg { 'approval_info' : ApprovalInfo }
export type ApproveCollectionError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'InvalidSpender' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'GenericBatchError' : { 'message' : string, 'error_code' : bigint } } |
  { 'TooOld' : null };
export type ApproveCollectionResult = { 'Ok' : bigint } |
  { 'Err' : ApproveCollectionError };
export interface ApproveTokenArg {
  'token_id' : bigint,
  'approval_info' : ApprovalInfo,
}
export type ApproveTokenError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'InvalidSpender' : null } |
  { 'NonExistingTokenId' : null } |
  { 'Unauthorized' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'GenericBatchError' : { 'message' : string, 'error_code' : bigint } } |
  { 'TooOld' : null };
export type ApproveTokenResult = { 'Ok' : bigint } |
  { 'Err' : ApproveTokenError };
export interface ArchivedTransactionResponse {
  'args' : Array<TransactionRange>,
  'callback' : [Principal, string],
}
export interface ArgList {
  'deployer' : Principal,
  'max_approvals' : [] | [bigint],
  'max_approvals_per_token_or_collection' : [] | [bigint],
  'settle_to_approvals' : [] | [bigint],
  'max_revoke_approvals' : [] | [bigint],
  'collection_approval_requires_token' : [] | [boolean],
}
export interface ArgList__1 {
  'deployer' : Principal,
  'allow_transfers' : [] | [boolean],
  'supply_cap' : [] | [bigint],
  'tx_window' : [] | [bigint],
  'burn_account' : [] | [Account],
  'default_take_value' : [] | [bigint],
  'logo' : [] | [string],
  'permitted_drift' : [] | [bigint],
  'name' : [] | [string],
  'description' : [] | [string],
  'max_take_value' : [] | [bigint],
  'max_update_batch_size' : [] | [bigint],
  'max_query_batch_size' : [] | [bigint],
  'max_memo_size' : [] | [bigint],
  'supported_standards' : [] | [SupportedStandards],
  'symbol' : [] | [string],
}
export type BalanceOfRequest = Array<Account__1>;
export type BalanceOfResponse = Array<bigint>;
export interface BlockType { 'url' : string, 'block_type' : string }
export type BurnNFTBatchError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'Unauthorized' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'TooOld' : null };
export type BurnNFTBatchResponse = { 'Ok' : Array<BurnNFTItemResponse> } |
  { 'Err' : BurnNFTBatchError };
export type BurnNFTError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'NonExistingTokenId' : null } |
  { 'InvalidBurn' : null };
export interface BurnNFTItemResponse {
  'result' : BurnNFTResult,
  'token_id' : bigint,
}
export interface BurnNFTRequest {
  'memo' : [] | [Uint8Array | number[]],
  'tokens' : Array<bigint>,
  'created_at_time' : [] | [bigint],
}
export type BurnNFTResult = { 'Ok' : bigint } |
  { 'Err' : BurnNFTError };
export interface CKNFTActor {
  'assign' : ActorMethod<
    [
      bigint,
      Account,
      [] | [string],
      [] | [Network],
      [] | [Uint8Array | number[]],
      [] | [Account__1],
      [] | [string],
    ],
    bigint
  >,
  /**
   * / Get list of authorized minters (owner-only)
   */
  'get_minters' : ActorMethod<[], Result_2>,
  'get_stats' : ActorMethod<[], { 'icrc99' : Stats__1, 'icrc7' : Stats }>,
  'get_tip' : ActorMethod<[], Tip>,
  'icrc10_supported_standards' : ActorMethod<[], SupportedStandards>,
  'icrc37_approve_collection' : ActorMethod<
    [Array<ApproveCollectionArg>],
    Array<[] | [ApproveCollectionResult]>
  >,
  'icrc37_approve_tokens' : ActorMethod<
    [Array<ApproveTokenArg>],
    Array<[] | [ApproveTokenResult]>
  >,
  'icrc37_get_collection_approvals' : ActorMethod<
    [Account, [] | [CollectionApproval], [] | [bigint]],
    Array<CollectionApproval>
  >,
  'icrc37_get_token_approvals' : ActorMethod<
    [Array<bigint>, [] | [TokenApproval], [] | [bigint]],
    Array<TokenApproval>
  >,
  'icrc37_is_approved' : ActorMethod<[Array<IsApprovedArg>], Array<boolean>>,
  'icrc37_max_approvals_per_token_or_collection' : ActorMethod<
    [],
    [] | [bigint]
  >,
  'icrc37_max_revoke_approvals' : ActorMethod<[], [] | [bigint]>,
  'icrc37_revoke_collection_approvals' : ActorMethod<
    [Array<RevokeCollectionApprovalArg>],
    Array<[] | [RevokeCollectionApprovalResult]>
  >,
  'icrc37_revoke_token_approvals' : ActorMethod<
    [Array<RevokeTokenApprovalArg>],
    Array<[] | [RevokeTokenApprovalResult]>
  >,
  'icrc37_transfer_from' : ActorMethod<
    [Array<TransferFromArg>],
    Array<[] | [TransferFromResult]>
  >,
  'icrc3_get_archives' : ActorMethod<[GetArchivesArgs], GetArchivesResult>,
  'icrc3_get_blocks' : ActorMethod<
    [Array<TransactionRange>],
    GetTransactionsResult__1
  >,
  'icrc3_get_tip_certificate' : ActorMethod<[], [] | [DataCertificate]>,
  'icrc3_supported_block_types' : ActorMethod<[], Array<BlockType>>,
  'icrc7_atomic_batch_transfers' : ActorMethod<[], [] | [boolean]>,
  'icrc7_balance_of' : ActorMethod<[BalanceOfRequest], BalanceOfResponse>,
  'icrc7_collection_metadata' : ActorMethod<[], Array<[string, Value]>>,
  'icrc7_default_take_value' : ActorMethod<[], [] | [bigint]>,
  'icrc7_description' : ActorMethod<[], [] | [string]>,
  'icrc7_logo' : ActorMethod<[], [] | [string]>,
  'icrc7_max_memo_size' : ActorMethod<[], [] | [bigint]>,
  'icrc7_max_query_batch_size' : ActorMethod<[], [] | [bigint]>,
  'icrc7_max_take_value' : ActorMethod<[], [] | [bigint]>,
  'icrc7_max_update_batch_size' : ActorMethod<[], [] | [bigint]>,
  'icrc7_name' : ActorMethod<[], string>,
  'icrc7_owner_of' : ActorMethod<[OwnerOfRequest], OwnerOfResponse>,
  'icrc7_permitted_drift' : ActorMethod<[], [] | [bigint]>,
  'icrc7_supply_cap' : ActorMethod<[], [] | [bigint]>,
  'icrc7_symbol' : ActorMethod<[], string>,
  'icrc7_token_metadata' : ActorMethod<
    [Array<bigint>],
    Array<[] | [Array<[string, Value]>]>
  >,
  'icrc7_tokens' : ActorMethod<[[] | [bigint], [] | [bigint]], Array<bigint>>,
  'icrc7_tokens_of' : ActorMethod<
    [Account, [] | [bigint], [] | [bigint]],
    Array<bigint>
  >,
  'icrc7_total_supply' : ActorMethod<[], bigint>,
  'icrc7_transfer' : ActorMethod<
    [Array<TransferArgs>],
    Array<[] | [TransferResult]>
  >,
  'icrc7_tx_window' : ActorMethod<[], [] | [bigint]>,
  'icrc99_burn_fund_address' : ActorMethod<[bigint], [] | [[string, Network]]>,
  'icrc99_cast' : ActorMethod<
    [Array<CastRequest>, [] | [Account]],
    Array<[] | [CastResult]>
  >,
  'icrc99_cast_cost' : ActorMethod<[CastCostRequest], bigint>,
  /**
   * / Get the approval address that needs funding for re-export (cast) operations
   * / Returns the address where the NFT is held after burn-back to IC
   * / This address needs SOL to pay for the transfer transaction
   */
  'icrc99_cast_fund_address' : ActorMethod<[bigint], [] | [[string, Network]]>,
  'icrc99_cast_status' : ActorMethod<
    [Array<bigint>, [] | [Account]],
    Array<[] | [CastStateShared]>
  >,
  /**
   * / Get remote addresses (e.g., Solana mint addresses) for IC token IDs
   * / This is a query function for efficient lookups without inter-canister calls
   * / Returns complete RemoteAddressInfo including derivation paths
   */
  'icrc99_get_remote_addresses' : ActorMethod<
    [Array<bigint>],
    Array<[] | [RemoteAddressInfo]>
  >,
  'icrc99_native_chain' : ActorMethod<[], RemoteContractPointer>,
  'icrc99_remote_owner_of' : ActorMethod<
    [Array<bigint>],
    Array<[] | [RemoteOwner]>
  >,
  'icrc99_request_remote_owner_status' : ActorMethod<
    [Array<RequestRemoteOwnerRequest>, [] | [Account]],
    Array<[] | [RemoteOwnerResult]>
  >,
  'icrcX_burn' : ActorMethod<[BurnNFTRequest], BurnNFTBatchResponse>,
  /**
   * / Query if a principal is an authorized minter
   */
  'is_minter' : ActorMethod<[Principal], boolean>,
  'mint_ck_nft' : ActorMethod<
    [MintNFTArgs],
    [SetNFTResult, [] | [ApproveTokenResult]]
  >,
  /**
   * / Set or remove a principal as an authorized minter
   * / ONLY works for IC-native canisters (nativeChain.network = IC)
   * / Only callable by the owner
   */
  'set_minter' : ActorMethod<
    [Principal, { 'Add' : null } | { 'Remove' : null }],
    Result_1
  >,
  'update_cast_status' : ActorMethod<[bigint, CastStatus], Result>,
  /**
   * / Update the remote address for an NFT (called by orchestrator after cast completes or burn back to IC)
   * / Includes network, derivation path, optional account that controls approval address, and optional alternative address
   */
  'update_nft_remote_address' : ActorMethod<
    [
      bigint,
      string,
      Network,
      Uint8Array | number[],
      [] | [Account__1],
      [] | [string],
    ],
    { 'ok' : null } |
      { 'err' : string }
  >,
}
export type CandyShared = { 'Int' : bigint } |
  { 'Map' : Array<[string, CandyShared]> } |
  { 'Nat' : bigint } |
  { 'Set' : Array<CandyShared> } |
  { 'Nat16' : number } |
  { 'Nat32' : number } |
  { 'Nat64' : bigint } |
  { 'Blob' : Uint8Array | number[] } |
  { 'Bool' : boolean } |
  { 'Int8' : number } |
  { 'Ints' : Array<bigint> } |
  { 'Nat8' : number } |
  { 'Nats' : Array<bigint> } |
  { 'Text' : string } |
  { 'Bytes' : Uint8Array | number[] } |
  { 'Int16' : number } |
  { 'Int32' : number } |
  { 'Int64' : bigint } |
  { 'Option' : [] | [CandyShared] } |
  { 'Floats' : Array<number> } |
  { 'Float' : number } |
  { 'Principal' : Principal } |
  { 'Array' : Array<CandyShared> } |
  { 'ValueMap' : Array<[CandyShared, CandyShared]> } |
  { 'Class' : Array<PropertyShared> };
export interface CastCostRequest {
  'tokenId' : bigint,
  'contract' : string,
  'network' : Network,
}
export type CastError = { 'GenericError' : string } |
  { 'NoCkNFTCanister' : null } |
  { 'NetworkError' : string } |
  { 'ExistingCast' : bigint } |
  { 'InsufficientAllowance' : [bigint, bigint] } |
  { 'InvalidTransaction' : string } |
  { 'InsufficientBalance' : [bigint, bigint] } |
  { 'NotFound' : null } |
  { 'InsufficientCycles' : [bigint, bigint] } |
  {
    'TransferNotVerified' : { 'TooManyRetries' : bigint } |
      { 'NoConsensus' : null }
  } |
  {
    'MintNotVerified' : { 'TooManyRetries' : bigint } |
      { 'NoConsensus' : null }
  } |
  { 'Unauthorized' : null } |
  {
    'ContractNotVerified' : { 'TooManyRetries' : bigint } |
      { 'NoConsensus' : null }
  } |
  { 'InvalidContract' : null };
export interface CastRequest {
  'tokenId' : bigint,
  'gasPrice' : [] | [bigint],
  'memo' : [] | [Uint8Array | number[]],
  'fromSubaccount' : [] | [Uint8Array | number[]],
  'remoteContract' : RemoteContractPointer,
  'maxPriorityFeePerGas' : [] | [bigint],
  'created_at_time' : [] | [bigint],
  'gasLimit' : [] | [bigint],
  'targetOwner' : string,
}
export type CastResult = { 'Ok' : bigint } |
  { 'Err' : CastError };
export interface CastStateShared {
  'startTime' : bigint,
  'status' : CastStatus,
  'history' : Array<[CastStatus, bigint]>,
  'castId' : bigint,
  'originalRequest' : CastRequest,
}
export type CastStatus = { 'Error' : CastError } |
  { 'WaitingOnContract' : { 'transaction' : string } } |
  { 'RemoteFinalized' : string } |
  {
    'SubmittedToOrchestrator' : {
      'localCastId' : bigint,
      'remoteCastId' : bigint,
    }
  } |
  { 'WaitingOnMint' : { 'transaction' : string } } |
  { 'WaitingOnTransfer' : { 'transaction' : string } } |
  { 'Created' : null } |
  { 'Completed' : bigint } |
  { 'SubmittingToOrchestrator' : bigint };
export interface CollectionApproval {
  'memo' : [] | [Uint8Array | number[]],
  'from_subaccount' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
  'expires_at' : [] | [bigint],
  'spender' : Account,
}
export interface DataCertificate {
  'certificate' : Uint8Array | number[],
  'hash_tree' : Uint8Array | number[],
}
export interface GetArchivesArgs { 'from' : [] | [Principal] }
export type GetArchivesResult = Array<GetArchivesResultItem>;
export interface GetArchivesResultItem {
  'end' : bigint,
  'canister_id' : Principal,
  'start' : bigint,
}
export type GetTransactionsFn = ActorMethod<
  [Array<TransactionRange>],
  GetTransactionsResult__1
>;
export interface GetTransactionsResult__1 {
  'log_length' : bigint,
  'blocks' : Array<{ 'id' : bigint, 'block' : Value__2 }>,
  'archived_blocks' : Array<ArchivedTransactionResponse>,
}
export type ICRC16Map = Array<[string, CandyShared]>;
export type IndexType = { 'Stable' : null } |
  { 'StableTyped' : null } |
  { 'Managed' : null };
export type InitArgs = [] | [ArgList];
export interface InitArgsList {
  'service' : [] | [Principal],
  'nativeChain' : RemoteContractPointer,
}
export interface InitArgs__1 {
  'maxRecordsToArchive' : bigint,
  'archiveIndexType' : IndexType,
  'maxArchivePages' : bigint,
  'settleToRecords' : bigint,
  'archiveCycles' : bigint,
  'maxActiveRecords' : bigint,
  'maxRecordsInArchiveInstance' : bigint,
  'archiveControllers' : [] | [[] | [Array<Principal>]],
  'supportedBlocks' : Array<BlockType>,
}
export type InitArgs__2 = [] | [ArgList__1];
export type InitArgs__3 = [] | [InitArgsList];
export interface IsApprovedArg {
  'token_id' : bigint,
  'from_subaccount' : [] | [Uint8Array | number[]],
  'spender' : Account,
}
export interface LedgerInfoShared {
  'allow_transfers' : boolean,
  'supply_cap' : [] | [bigint],
  'tx_window' : bigint,
  'burn_account' : [] | [Account],
  'default_take_value' : bigint,
  'logo' : [] | [string],
  'permitted_drift' : bigint,
  'name' : [] | [string],
  'description' : [] | [string],
  'max_take_value' : bigint,
  'max_update_batch_size' : bigint,
  'max_query_batch_size' : bigint,
  'max_memo_size' : bigint,
  'symbol' : [] | [string],
}
export interface MintNFTArgs {
  'token_id' : bigint,
  'owner' : Account,
  'metadata' : NFTMap,
  'memo' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
  'spender' : [] | [Account],
}
export type NFTMap = Array<[string, Value]>;
export type Network = { 'IC' : [] | [string] } |
  { 'Ethereum' : [] | [bigint] } |
  { 'Solana' : [] | [SolanaCluster] } |
  { 'Bitcoin' : [] | [string] } |
  { 'Other' : ICRC16Map };
export type OwnerOfRequest = Array<bigint>;
export type OwnerOfResponse = Array<[] | [Account__1]>;
export interface PropertyShared {
  'value' : CandyShared,
  'name' : string,
  'immutable' : boolean,
}
export interface RemoteAddressInfo {
  'altAddress' : [] | [string],
  'contract' : string,
  'network' : Network,
  'atRestAccount' : [] | [Account__1],
  'atRestDerivation' : [] | [Uint8Array | number[]],
}
export interface RemoteContractPointer {
  'contract' : string,
  'network' : Network,
}
export interface RemoteNFTPointer {
  'tokenId' : bigint,
  'contract' : string,
  'network' : Network,
}
export type RemoteOwner = {
    'remote' : {
      'contract' : RemoteContractPointer,
      'owner' : string,
      'timestamp' : bigint,
    }
  } |
  { 'local' : Account__1 };
export type RemoteOwnerResult = { 'Ok' : RemoteOwner } |
  { 'Err' : RemoteOwnershipUpdateError };
export type RemoteOwnershipUpdateError = { 'GenericError' : string } |
  { 'InsufficientAllowance' : [bigint, bigint] } |
  { 'InsufficientBalance' : [bigint, bigint] } |
  { 'NotFound' : null } |
  { 'InsufficientCycles' : [bigint, bigint] } |
  { 'Unauthorized' : null } |
  { 'FoundLocally' : Account__1 } |
  { 'QueryError' : string };
export interface RequestRemoteOwnerRequest {
  'memo' : [] | [Uint8Array | number[]],
  'createdAtTime' : [] | [bigint],
  'remoteNFTPointer' : RemoteNFTPointer,
}
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : boolean } |
  { 'err' : string };
export type Result_2 = { 'ok' : Array<Principal> } |
  { 'err' : string };
export interface RevokeCollectionApprovalArg {
  'memo' : [] | [Uint8Array | number[]],
  'from_subaccount' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
  'spender' : [] | [Account],
}
export type RevokeCollectionApprovalError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'Unauthorized' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'ApprovalDoesNotExist' : null } |
  { 'GenericBatchError' : { 'message' : string, 'error_code' : bigint } } |
  { 'TooOld' : null };
export type RevokeCollectionApprovalResult = { 'Ok' : bigint } |
  { 'Err' : RevokeCollectionApprovalError };
export interface RevokeTokenApprovalArg {
  'token_id' : bigint,
  'memo' : [] | [Uint8Array | number[]],
  'from_subaccount' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
  'spender' : [] | [Account],
}
export type RevokeTokenApprovalError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'NonExistingTokenId' : null } |
  { 'Unauthorized' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'ApprovalDoesNotExist' : null } |
  { 'GenericBatchError' : { 'message' : string, 'error_code' : bigint } } |
  { 'TooOld' : null };
export type RevokeTokenApprovalResult = { 'Ok' : bigint } |
  { 'Err' : RevokeTokenApprovalError };
export type SetNFTError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'TokenExists' : null } |
  { 'NonExistingTokenId' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'TooOld' : null };
export type SetNFTResult = { 'Ok' : [] | [bigint] } |
  { 'Err' : SetNFTError } |
  { 'GenericError' : { 'message' : string, 'error_code' : bigint } };
export type SolanaCluster = { 'Mainnet' : null } |
  { 'Custom' : string } |
  { 'Testnet' : null } |
  { 'Devnet' : null };
export interface Stats {
  'owner' : Principal,
  'nft_count' : bigint,
  'ledger_info' : LedgerInfoShared,
  'indexes' : {
    'owner_to_nfts_count' : bigint,
    'nft_to_owner_count' : bigint,
    'recent_transactions_count' : bigint,
  },
  'supported_standards' : SupportedStandards,
  'ledger_count' : bigint,
}
export interface Stats__1 {
  'service' : [] | [Principal],
  'originalMinterMap' : Array<[bigint, Account__1]>,
  'solanaMintAddressMap' : Array<[bigint, RemoteAddressInfo]>,
  'nextCastId' : bigint,
  'orchestrator' : Principal,
  'cycleSettings' : {
    'amountPerETHCast' : bigint,
    'cycleLedgerCanister' : Principal,
    'amountPerBitcoinOwnerRequest' : bigint,
    'amountPerSolanaCast' : bigint,
    'amountPerOtherOwnerRequest' : bigint,
    'amountPerICOwnerRequest' : bigint,
    'amountPerSolanaOwnerRequest' : bigint,
    'amountPerEthOwnerRequest' : bigint,
    'amountBasePerOwnerRequest' : bigint,
  },
  'nativeChain' : RemoteContractPointer,
  'remoteOwnerMap' : Array<[bigint, RemoteOwner]>,
}
export type Subaccount = Uint8Array | number[];
export type SupportedStandards = Array<{ 'url' : string, 'name' : string }>;
export interface Tip {
  'last_block_index' : Uint8Array | number[],
  'hash_tree' : Uint8Array | number[],
  'last_block_hash' : Uint8Array | number[],
}
export interface TokenApproval {
  'token_id' : bigint,
  'approval_info' : ApprovalInfo,
}
export interface TransactionRange { 'start' : bigint, 'length' : bigint }
export interface TransferArgs {
  'to' : Account__1,
  'token_id' : bigint,
  'memo' : [] | [Uint8Array | number[]],
  'from_subaccount' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
}
export type TransferError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'NonExistingTokenId' : null } |
  { 'Unauthorized' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'InvalidRecipient' : null } |
  { 'GenericBatchError' : { 'message' : string, 'error_code' : bigint } } |
  { 'TooOld' : null };
export interface TransferFromArg {
  'to' : Account,
  'spender_subaccount' : [] | [Uint8Array | number[]],
  'token_id' : bigint,
  'from' : Account,
  'memo' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
}
export type TransferFromError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'NonExistingTokenId' : null } |
  { 'Unauthorized' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'InvalidRecipient' : null } |
  { 'GenericBatchError' : { 'message' : string, 'error_code' : bigint } } |
  { 'TooOld' : null };
export type TransferFromResult = { 'Ok' : bigint } |
  { 'Err' : TransferFromError };
export type TransferResult = { 'Ok' : bigint } |
  { 'Err' : TransferError };
export type Value = { 'Int' : bigint } |
  { 'Map' : Array<[string, Value]> } |
  { 'Nat' : bigint } |
  { 'Blob' : Uint8Array | number[] } |
  { 'Text' : string } |
  { 'Array' : Array<Value> };
export type Value__2 = { 'Int' : bigint } |
  { 'Map' : Array<[string, Value__2]> } |
  { 'Nat' : bigint } |
  { 'Blob' : Uint8Array | number[] } |
  { 'Text' : string } |
  { 'Array' : Array<Value__2> };
export interface _SERVICE extends CKNFTActor {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
