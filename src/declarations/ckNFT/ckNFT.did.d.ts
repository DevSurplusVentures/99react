import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Account {
  'owner' : Principal,
  'subaccount' : [] | [Subaccount],
}
export interface Account__1 {
  'owner' : Principal,
  'subaccount' : [] | [Subaccount],
}
export interface Account__2 {
  'owner' : Principal,
  'subaccount' : [] | [Uint8Array | number[]],
}
export interface Account__3 {
  'owner' : Principal,
  'subaccount' : [] | [Uint8Array | number[]],
}
export interface Account__4 {
  'owner' : Principal,
  'subaccount' : [] | [Subaccount__1],
}
export interface Account__5 {
  'owner' : Principal,
  'subaccount' : [] | [Uint8Array | number[]],
}
export interface ApprovalInfo {
  'memo' : [] | [Uint8Array | number[]],
  'from_subaccount' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
  'expires_at' : [] | [bigint],
  'spender' : Account__4,
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
export type ApproveTokenError__1 = {
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
export type ApproveTokenResult__1 = { 'Ok' : bigint } |
  { 'Err' : ApproveTokenError__1 };
export interface ArchivedTransactionResponse {
  'args' : Array<TransactionRange__1>,
  'callback' : GetTransactionsFn,
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
export type BalanceOfRequest = Array<Account__3>;
export type BalanceOfResponse = Array<bigint>;
export interface BlockType { 'url' : string, 'block_type' : string }
export interface BlockType__1 { 'url' : string, 'block_type' : string }
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
  'assign' : ActorMethod<[bigint, Account__1], bigint>,
  'get_stats' : ActorMethod<[], { 'icrc99' : Stats__1, 'icrc7' : Stats }>,
  'get_tip' : ActorMethod<[], Tip>,
  'icrc10_supported_standards' : ActorMethod<[], SupportedStandards__1>,
  'icrc37_approve_collection' : ActorMethod<
    [Array<ApproveCollectionArg>],
    Array<[] | [ApproveCollectionResult]>
  >,
  'icrc37_approve_tokens' : ActorMethod<
    [Array<ApproveTokenArg>],
    Array<[] | [ApproveTokenResult__1]>
  >,
  'icrc37_get_collection_approvals' : ActorMethod<
    [Account__1, [] | [CollectionApproval], [] | [bigint]],
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
    GetTransactionsResult
  >,
  'icrc3_get_tip_certificate' : ActorMethod<[], [] | [DataCertificate]>,
  'icrc3_supported_block_types' : ActorMethod<[], Array<BlockType__1>>,
  'icrc7_atomic_batch_transfers' : ActorMethod<[], [] | [boolean]>,
  'icrc7_balance_of' : ActorMethod<[BalanceOfRequest], BalanceOfResponse>,
  'icrc7_collection_metadata' : ActorMethod<[], Array<[string, Value__1]>>,
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
    Array<[] | [Array<[string, Value__1]>]>
  >,
  'icrc7_tokens' : ActorMethod<[[] | [bigint], [] | [bigint]], Array<bigint>>,
  'icrc7_tokens_of' : ActorMethod<
    [Account__1, [] | [bigint], [] | [bigint]],
    Array<bigint>
  >,
  'icrc7_total_supply' : ActorMethod<[], bigint>,
  'icrc7_transfer' : ActorMethod<
    [Array<TransferArgs>],
    Array<[] | [TransferResult]>
  >,
  'icrc7_tx_window' : ActorMethod<[], [] | [bigint]>,
  'icrc99_burn_fund_address' : ActorMethod<
    [bigint],
    [] | [[string, Network__1]]
  >,
  'icrc99_cast' : ActorMethod<
    [Array<CastRequest>, [] | [Account__1]],
    Array<[] | [CastResult]>
  >,
  'icrc99_cast_cost' : ActorMethod<[CastCostRequest], bigint>,
  'icrc99_cast_status' : ActorMethod<
    [Array<bigint>, [] | [Account__1]],
    Array<[] | [CastStateShared]>
  >,
  'icrc99_native_chain' : ActorMethod<[], RemoteContractPointer__1>,
  'icrc99_remote_owner_of' : ActorMethod<
    [Array<bigint>],
    Array<[] | [RemoteOwner]>
  >,
  'icrc99_request_remote_owner_status' : ActorMethod<
    [Array<RequestRemoteOwnerRequest>, [] | [Account__1]],
    Array<[] | [RemoteOwnerResult]>
  >,
  'icrcX_burn' : ActorMethod<[BurnNFTRequest], BurnNFTBatchResponse>,
  'mint_ck_nft' : ActorMethod<
    [MintNFTArgs],
    [SetNFTResult, [] | [ApproveTokenResult]]
  >,
  'update_cast_status' : ActorMethod<[bigint, CastStatus], Result>,
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
  'remoteContract' : RemoteContractPointer__1,
  'maxPriorityFeePerGas' : [] | [bigint],
  'created_at_time' : [] | [bigint],
  'gasLimit' : [] | [bigint],
  'targetOwner' : string,
}
export type CastResult = { 'Ok' : bigint } |
  { 'Err' : CastError };
export interface CastStateShared {
  'startTime' : bigint,
  'status' : CastStatus__1,
  'history' : Array<[CastStatus__1, bigint]>,
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
export type CastStatus__1 = { 'Error' : CastError } |
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
  'spender' : Account__4,
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
  [Array<TransactionRange__1>],
  GetTransactionsResult__1
>;
export interface GetTransactionsResult {
  'log_length' : bigint,
  'blocks' : Array<{ 'id' : bigint, 'block' : Value__2 }>,
  'archived_blocks' : Array<ArchivedTransactionResponse>,
}
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
  'spender' : Account__4,
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
  'owner' : Account__1,
  'metadata' : NFTMap,
  'memo' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
  'spender' : [] | [Account__1],
}
export type NFTMap = Array<[string, Value]>;
export type Network = { 'IC' : [] | [string] } |
  { 'Ethereum' : [] | [bigint] } |
  { 'Solana' : [] | [bigint] } |
  { 'Bitcoin' : [] | [string] } |
  { 'Other' : ICRC16Map };
export type Network__1 = { 'IC' : [] | [string] } |
  { 'Ethereum' : [] | [bigint] } |
  { 'Solana' : [] | [bigint] } |
  { 'Bitcoin' : [] | [string] } |
  { 'Other' : ICRC16Map };
export type OwnerOfRequest = Array<bigint>;
export type OwnerOfResponse = Array<[] | [Account__3]>;
export interface PropertyShared {
  'value' : CandyShared,
  'name' : string,
  'immutable' : boolean,
}
export interface RemoteContractPointer {
  'contract' : string,
  'network' : Network,
}
export interface RemoteContractPointer__1 {
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
      'contract' : RemoteContractPointer__1,
      'owner' : string,
      'timestamp' : bigint,
    }
  } |
  { 'local' : Account__2 };
export type RemoteOwnerResult = { 'Ok' : RemoteOwner } |
  { 'Err' : RemoteOwnershipUpdateError };
export type RemoteOwner__1 = {
    'remote' : {
      'contract' : RemoteContractPointer__1,
      'owner' : string,
      'timestamp' : bigint,
    }
  } |
  { 'local' : Account__2 };
export type RemoteOwnershipUpdateError = { 'GenericError' : string } |
  { 'InsufficientAllowance' : [bigint, bigint] } |
  { 'InsufficientBalance' : [bigint, bigint] } |
  { 'NotFound' : null } |
  { 'InsufficientCycles' : [bigint, bigint] } |
  { 'Unauthorized' : null } |
  { 'FoundLocally' : Account__2 } |
  { 'QueryError' : string };
export interface RequestRemoteOwnerRequest {
  'memo' : [] | [Uint8Array | number[]],
  'createdAtTime' : [] | [bigint],
  'remoteNFTPointer' : RemoteNFTPointer,
}
export type Result = { 'ok' : null } |
  { 'err' : string };
export interface RevokeCollectionApprovalArg {
  'memo' : [] | [Uint8Array | number[]],
  'from_subaccount' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
  'spender' : [] | [Account__4],
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
  'spender' : [] | [Account__4],
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
  'originalMinterMap' : Array<[bigint, Account__5]>,
  'nextCastId' : bigint,
  'orchestrator' : Principal,
  'cycleSettings' : {
    'amountPerETHCast' : bigint,
    'cycleLedgerCanister' : Principal,
    'amountPerBitcoinOwnerRequest' : bigint,
    'amountPerOtherOwnerRequest' : bigint,
    'amountPerICOwnerRequest' : bigint,
    'amountPerSolanaOwnerRequest' : bigint,
    'amountPerEthOwnerRequest' : bigint,
    'amountBasePerOwnerRequest' : bigint,
  },
  'nativeChain' : RemoteContractPointer,
  'remoteOwnerMap' : Array<[bigint, RemoteOwner__1]>,
}
export type Subaccount = Uint8Array | number[];
export type Subaccount__1 = Uint8Array | number[];
export type SupportedStandards = Array<{ 'url' : string, 'name' : string }>;
export type SupportedStandards__1 = Array<{ 'url' : string, 'name' : string }>;
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
export interface TransactionRange__1 { 'start' : bigint, 'length' : bigint }
export interface TransferArgs {
  'to' : Account__3,
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
  'to' : Account__4,
  'spender_subaccount' : [] | [Uint8Array | number[]],
  'token_id' : bigint,
  'from' : Account__4,
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
export type Value__1 = { 'Int' : bigint } |
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
