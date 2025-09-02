export const idlFactory = ({ IDL }) => {
  const ArchivedTransactionResponse = IDL.Rec();
  const CandyShared = IDL.Rec();
  const Value = IDL.Rec();
  const Value__2 = IDL.Rec();
  const ArgList = IDL.Record({
    'deployer' : IDL.Principal,
    'max_approvals' : IDL.Opt(IDL.Nat),
    'max_approvals_per_token_or_collection' : IDL.Opt(IDL.Nat),
    'settle_to_approvals' : IDL.Opt(IDL.Nat),
    'max_revoke_approvals' : IDL.Opt(IDL.Nat),
    'collection_approval_requires_token' : IDL.Opt(IDL.Bool),
  });
  const InitArgs = IDL.Opt(ArgList);
  const IndexType = IDL.Variant({
    'Stable' : IDL.Null,
    'StableTyped' : IDL.Null,
    'Managed' : IDL.Null,
  });
  const BlockType = IDL.Record({ 'url' : IDL.Text, 'block_type' : IDL.Text });
  const InitArgs__1 = IDL.Record({
    'maxRecordsToArchive' : IDL.Nat,
    'archiveIndexType' : IndexType,
    'maxArchivePages' : IDL.Nat,
    'settleToRecords' : IDL.Nat,
    'archiveCycles' : IDL.Nat,
    'maxActiveRecords' : IDL.Nat,
    'maxRecordsInArchiveInstance' : IDL.Nat,
    'archiveControllers' : IDL.Opt(IDL.Opt(IDL.Vec(IDL.Principal))),
    'supportedBlocks' : IDL.Vec(BlockType),
  });
  const Subaccount = IDL.Vec(IDL.Nat8);
  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(Subaccount),
  });
  const SupportedStandards = IDL.Vec(
    IDL.Record({ 'url' : IDL.Text, 'name' : IDL.Text })
  );
  const ArgList__1 = IDL.Record({
    'deployer' : IDL.Principal,
    'allow_transfers' : IDL.Opt(IDL.Bool),
    'supply_cap' : IDL.Opt(IDL.Nat),
    'tx_window' : IDL.Opt(IDL.Nat),
    'burn_account' : IDL.Opt(Account),
    'default_take_value' : IDL.Opt(IDL.Nat),
    'logo' : IDL.Opt(IDL.Text),
    'permitted_drift' : IDL.Opt(IDL.Nat),
    'name' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
    'max_take_value' : IDL.Opt(IDL.Nat),
    'max_update_batch_size' : IDL.Opt(IDL.Nat),
    'max_query_batch_size' : IDL.Opt(IDL.Nat),
    'max_memo_size' : IDL.Opt(IDL.Nat),
    'supported_standards' : IDL.Opt(SupportedStandards),
    'symbol' : IDL.Opt(IDL.Text),
  });
  const InitArgs__2 = IDL.Opt(ArgList__1);
  const PropertyShared = IDL.Record({
    'value' : CandyShared,
    'name' : IDL.Text,
    'immutable' : IDL.Bool,
  });
  CandyShared.fill(
    IDL.Variant({
      'Int' : IDL.Int,
      'Map' : IDL.Vec(IDL.Tuple(IDL.Text, CandyShared)),
      'Nat' : IDL.Nat,
      'Set' : IDL.Vec(CandyShared),
      'Nat16' : IDL.Nat16,
      'Nat32' : IDL.Nat32,
      'Nat64' : IDL.Nat64,
      'Blob' : IDL.Vec(IDL.Nat8),
      'Bool' : IDL.Bool,
      'Int8' : IDL.Int8,
      'Ints' : IDL.Vec(IDL.Int),
      'Nat8' : IDL.Nat8,
      'Nats' : IDL.Vec(IDL.Nat),
      'Text' : IDL.Text,
      'Bytes' : IDL.Vec(IDL.Nat8),
      'Int16' : IDL.Int16,
      'Int32' : IDL.Int32,
      'Int64' : IDL.Int64,
      'Option' : IDL.Opt(CandyShared),
      'Floats' : IDL.Vec(IDL.Float64),
      'Float' : IDL.Float64,
      'Principal' : IDL.Principal,
      'Array' : IDL.Vec(CandyShared),
      'ValueMap' : IDL.Vec(IDL.Tuple(CandyShared, CandyShared)),
      'Class' : IDL.Vec(PropertyShared),
    })
  );
  const ICRC16Map = IDL.Vec(IDL.Tuple(IDL.Text, CandyShared));
  const Network = IDL.Variant({
    'IC' : IDL.Opt(IDL.Text),
    'Ethereum' : IDL.Opt(IDL.Nat),
    'Solana' : IDL.Opt(IDL.Nat),
    'Bitcoin' : IDL.Opt(IDL.Text),
    'Other' : ICRC16Map,
  });
  const RemoteContractPointer = IDL.Record({
    'contract' : IDL.Text,
    'network' : Network,
  });
  const InitArgsList = IDL.Record({
    'service' : IDL.Opt(IDL.Principal),
    'nativeChain' : RemoteContractPointer,
  });
  const InitArgs__3 = IDL.Opt(InitArgsList);
  const Account__1 = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(Subaccount),
  });
  const Account__5 = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const RemoteContractPointer__1 = IDL.Record({
    'contract' : IDL.Text,
    'network' : Network,
  });
  const Account__2 = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const RemoteOwner__1 = IDL.Variant({
    'remote' : IDL.Record({
      'contract' : RemoteContractPointer__1,
      'owner' : IDL.Text,
      'timestamp' : IDL.Nat,
    }),
    'local' : Account__2,
  });
  const Stats__1 = IDL.Record({
    'service' : IDL.Opt(IDL.Principal),
    'originalMinterMap' : IDL.Vec(IDL.Tuple(IDL.Nat, Account__5)),
    'nextCastId' : IDL.Nat,
    'orchestrator' : IDL.Principal,
    'cycleSettings' : IDL.Record({
      'amountPerETHCast' : IDL.Nat,
      'cycleLedgerCanister' : IDL.Principal,
      'amountPerBitcoinOwnerRequest' : IDL.Nat,
      'amountPerOtherOwnerRequest' : IDL.Nat,
      'amountPerICOwnerRequest' : IDL.Nat,
      'amountPerSolanaOwnerRequest' : IDL.Nat,
      'amountPerEthOwnerRequest' : IDL.Nat,
      'amountBasePerOwnerRequest' : IDL.Nat,
    }),
    'nativeChain' : RemoteContractPointer,
    'remoteOwnerMap' : IDL.Vec(IDL.Tuple(IDL.Nat, RemoteOwner__1)),
  });
  const LedgerInfoShared = IDL.Record({
    'allow_transfers' : IDL.Bool,
    'supply_cap' : IDL.Opt(IDL.Nat),
    'tx_window' : IDL.Nat,
    'burn_account' : IDL.Opt(Account),
    'default_take_value' : IDL.Nat,
    'logo' : IDL.Opt(IDL.Text),
    'permitted_drift' : IDL.Nat,
    'name' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
    'max_take_value' : IDL.Nat,
    'max_update_batch_size' : IDL.Nat,
    'max_query_batch_size' : IDL.Nat,
    'max_memo_size' : IDL.Nat,
    'symbol' : IDL.Opt(IDL.Text),
  });
  const Stats = IDL.Record({
    'owner' : IDL.Principal,
    'nft_count' : IDL.Nat,
    'ledger_info' : LedgerInfoShared,
    'indexes' : IDL.Record({
      'owner_to_nfts_count' : IDL.Nat,
      'nft_to_owner_count' : IDL.Nat,
      'recent_transactions_count' : IDL.Nat,
    }),
    'supported_standards' : SupportedStandards,
    'ledger_count' : IDL.Nat,
  });
  const Tip = IDL.Record({
    'last_block_index' : IDL.Vec(IDL.Nat8),
    'hash_tree' : IDL.Vec(IDL.Nat8),
    'last_block_hash' : IDL.Vec(IDL.Nat8),
  });
  const SupportedStandards__1 = IDL.Vec(
    IDL.Record({ 'url' : IDL.Text, 'name' : IDL.Text })
  );
  const Subaccount__1 = IDL.Vec(IDL.Nat8);
  const Account__4 = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(Subaccount__1),
  });
  const ApprovalInfo = IDL.Record({
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
    'expires_at' : IDL.Opt(IDL.Nat64),
    'spender' : Account__4,
  });
  const ApproveCollectionArg = IDL.Record({ 'approval_info' : ApprovalInfo });
  const ApproveCollectionError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'InvalidSpender' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'GenericBatchError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TooOld' : IDL.Null,
  });
  const ApproveCollectionResult = IDL.Variant({
    'Ok' : IDL.Nat,
    'Err' : ApproveCollectionError,
  });
  const ApproveTokenArg = IDL.Record({
    'token_id' : IDL.Nat,
    'approval_info' : ApprovalInfo,
  });
  const ApproveTokenError__1 = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'InvalidSpender' : IDL.Null,
    'NonExistingTokenId' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'GenericBatchError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TooOld' : IDL.Null,
  });
  const ApproveTokenResult__1 = IDL.Variant({
    'Ok' : IDL.Nat,
    'Err' : ApproveTokenError__1,
  });
  const CollectionApproval = IDL.Record({
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
    'expires_at' : IDL.Opt(IDL.Nat64),
    'spender' : Account__4,
  });
  const TokenApproval = IDL.Record({
    'token_id' : IDL.Nat,
    'approval_info' : ApprovalInfo,
  });
  const IsApprovedArg = IDL.Record({
    'token_id' : IDL.Nat,
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'spender' : Account__4,
  });
  const RevokeCollectionApprovalArg = IDL.Record({
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
    'spender' : IDL.Opt(Account__4),
  });
  const RevokeCollectionApprovalError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'Unauthorized' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'ApprovalDoesNotExist' : IDL.Null,
    'GenericBatchError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TooOld' : IDL.Null,
  });
  const RevokeCollectionApprovalResult = IDL.Variant({
    'Ok' : IDL.Nat,
    'Err' : RevokeCollectionApprovalError,
  });
  const RevokeTokenApprovalArg = IDL.Record({
    'token_id' : IDL.Nat,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
    'spender' : IDL.Opt(Account__4),
  });
  const RevokeTokenApprovalError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'NonExistingTokenId' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'ApprovalDoesNotExist' : IDL.Null,
    'GenericBatchError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TooOld' : IDL.Null,
  });
  const RevokeTokenApprovalResult = IDL.Variant({
    'Ok' : IDL.Nat,
    'Err' : RevokeTokenApprovalError,
  });
  const TransferFromArg = IDL.Record({
    'to' : Account__4,
    'spender_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'token_id' : IDL.Nat,
    'from' : Account__4,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
  });
  const TransferFromError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'NonExistingTokenId' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'InvalidRecipient' : IDL.Null,
    'GenericBatchError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TooOld' : IDL.Null,
  });
  const TransferFromResult = IDL.Variant({
    'Ok' : IDL.Nat,
    'Err' : TransferFromError,
  });
  const GetArchivesArgs = IDL.Record({ 'from' : IDL.Opt(IDL.Principal) });
  const GetArchivesResultItem = IDL.Record({
    'end' : IDL.Nat,
    'canister_id' : IDL.Principal,
    'start' : IDL.Nat,
  });
  const GetArchivesResult = IDL.Vec(GetArchivesResultItem);
  const TransactionRange = IDL.Record({
    'start' : IDL.Nat,
    'length' : IDL.Nat,
  });
  Value__2.fill(
    IDL.Variant({
      'Int' : IDL.Int,
      'Map' : IDL.Vec(IDL.Tuple(IDL.Text, Value__2)),
      'Nat' : IDL.Nat,
      'Blob' : IDL.Vec(IDL.Nat8),
      'Text' : IDL.Text,
      'Array' : IDL.Vec(Value__2),
    })
  );
  const TransactionRange__1 = IDL.Record({
    'start' : IDL.Nat,
    'length' : IDL.Nat,
  });
  const GetTransactionsResult__1 = IDL.Record({
    'log_length' : IDL.Nat,
    'blocks' : IDL.Vec(IDL.Record({ 'id' : IDL.Nat, 'block' : Value__2 })),
    'archived_blocks' : IDL.Vec(ArchivedTransactionResponse),
  });
  const GetTransactionsFn = IDL.Func(
      [IDL.Vec(TransactionRange__1)],
      [GetTransactionsResult__1],
      ['query'],
    );
  ArchivedTransactionResponse.fill(
    IDL.Record({
      'args' : IDL.Vec(TransactionRange__1),
      'callback' : GetTransactionsFn,
    })
  );
  const GetTransactionsResult = IDL.Record({
    'log_length' : IDL.Nat,
    'blocks' : IDL.Vec(IDL.Record({ 'id' : IDL.Nat, 'block' : Value__2 })),
    'archived_blocks' : IDL.Vec(ArchivedTransactionResponse),
  });
  const DataCertificate = IDL.Record({
    'certificate' : IDL.Vec(IDL.Nat8),
    'hash_tree' : IDL.Vec(IDL.Nat8),
  });
  const BlockType__1 = IDL.Record({
    'url' : IDL.Text,
    'block_type' : IDL.Text,
  });
  const Account__3 = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const BalanceOfRequest = IDL.Vec(Account__3);
  const BalanceOfResponse = IDL.Vec(IDL.Nat);
  Value.fill(
    IDL.Variant({
      'Int' : IDL.Int,
      'Map' : IDL.Vec(IDL.Tuple(IDL.Text, Value)),
      'Nat' : IDL.Nat,
      'Blob' : IDL.Vec(IDL.Nat8),
      'Text' : IDL.Text,
      'Array' : IDL.Vec(Value),
    })
  );
  const Value__1 = IDL.Variant({
    'Int' : IDL.Int,
    'Map' : IDL.Vec(IDL.Tuple(IDL.Text, Value)),
    'Nat' : IDL.Nat,
    'Blob' : IDL.Vec(IDL.Nat8),
    'Text' : IDL.Text,
    'Array' : IDL.Vec(Value),
  });
  const OwnerOfRequest = IDL.Vec(IDL.Nat);
  const OwnerOfResponse = IDL.Vec(IDL.Opt(Account__3));
  const TransferArgs = IDL.Record({
    'to' : Account__3,
    'token_id' : IDL.Nat,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
  });
  const TransferError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'NonExistingTokenId' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'InvalidRecipient' : IDL.Null,
    'GenericBatchError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TooOld' : IDL.Null,
  });
  const TransferResult = IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : TransferError });
  const Network__1 = IDL.Variant({
    'IC' : IDL.Opt(IDL.Text),
    'Ethereum' : IDL.Opt(IDL.Nat),
    'Solana' : IDL.Opt(IDL.Nat),
    'Bitcoin' : IDL.Opt(IDL.Text),
    'Other' : ICRC16Map,
  });
  const CastRequest = IDL.Record({
    'tokenId' : IDL.Nat,
    'gasPrice' : IDL.Opt(IDL.Nat),
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'fromSubaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'remoteContract' : RemoteContractPointer__1,
    'maxPriorityFeePerGas' : IDL.Opt(IDL.Nat),
    'created_at_time' : IDL.Opt(IDL.Nat),
    'gasLimit' : IDL.Opt(IDL.Nat),
    'targetOwner' : IDL.Text,
  });
  const CastError = IDL.Variant({
    'GenericError' : IDL.Text,
    'NoCkNFTCanister' : IDL.Null,
    'NetworkError' : IDL.Text,
    'ExistingCast' : IDL.Nat,
    'InsufficientAllowance' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'InvalidTransaction' : IDL.Text,
    'InsufficientBalance' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'NotFound' : IDL.Null,
    'InsufficientCycles' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'TransferNotVerified' : IDL.Variant({
      'TooManyRetries' : IDL.Nat,
      'NoConsensus' : IDL.Null,
    }),
    'MintNotVerified' : IDL.Variant({
      'TooManyRetries' : IDL.Nat,
      'NoConsensus' : IDL.Null,
    }),
    'Unauthorized' : IDL.Null,
    'ContractNotVerified' : IDL.Variant({
      'TooManyRetries' : IDL.Nat,
      'NoConsensus' : IDL.Null,
    }),
    'InvalidContract' : IDL.Null,
  });
  const CastResult = IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : CastError });
  const CastCostRequest = IDL.Record({
    'tokenId' : IDL.Nat,
    'contract' : IDL.Text,
    'network' : Network,
  });
  const CastStatus__1 = IDL.Variant({
    'Error' : CastError,
    'WaitingOnContract' : IDL.Record({ 'transaction' : IDL.Text }),
    'RemoteFinalized' : IDL.Text,
    'SubmittedToOrchestrator' : IDL.Record({
      'localCastId' : IDL.Nat,
      'remoteCastId' : IDL.Nat,
    }),
    'WaitingOnMint' : IDL.Record({ 'transaction' : IDL.Text }),
    'WaitingOnTransfer' : IDL.Record({ 'transaction' : IDL.Text }),
    'Created' : IDL.Null,
    'Completed' : IDL.Nat,
    'SubmittingToOrchestrator' : IDL.Nat,
  });
  const CastStateShared = IDL.Record({
    'startTime' : IDL.Nat,
    'status' : CastStatus__1,
    'history' : IDL.Vec(IDL.Tuple(CastStatus__1, IDL.Nat)),
    'castId' : IDL.Nat,
    'originalRequest' : CastRequest,
  });
  const RemoteOwner = IDL.Variant({
    'remote' : IDL.Record({
      'contract' : RemoteContractPointer__1,
      'owner' : IDL.Text,
      'timestamp' : IDL.Nat,
    }),
    'local' : Account__2,
  });
  const RemoteNFTPointer = IDL.Record({
    'tokenId' : IDL.Nat,
    'contract' : IDL.Text,
    'network' : Network,
  });
  const RequestRemoteOwnerRequest = IDL.Record({
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'createdAtTime' : IDL.Opt(IDL.Nat),
    'remoteNFTPointer' : RemoteNFTPointer,
  });
  const RemoteOwnershipUpdateError = IDL.Variant({
    'GenericError' : IDL.Text,
    'InsufficientAllowance' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'InsufficientBalance' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'NotFound' : IDL.Null,
    'InsufficientCycles' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'Unauthorized' : IDL.Null,
    'FoundLocally' : Account__2,
    'QueryError' : IDL.Text,
  });
  const RemoteOwnerResult = IDL.Variant({
    'Ok' : RemoteOwner,
    'Err' : RemoteOwnershipUpdateError,
  });
  const BurnNFTRequest = IDL.Record({
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'tokens' : IDL.Vec(IDL.Nat),
    'created_at_time' : IDL.Opt(IDL.Nat64),
  });
  const BurnNFTError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'NonExistingTokenId' : IDL.Null,
    'InvalidBurn' : IDL.Null,
  });
  const BurnNFTResult = IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : BurnNFTError });
  const BurnNFTItemResponse = IDL.Record({
    'result' : BurnNFTResult,
    'token_id' : IDL.Nat,
  });
  const BurnNFTBatchError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Unauthorized' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'TooOld' : IDL.Null,
  });
  const BurnNFTBatchResponse = IDL.Variant({
    'Ok' : IDL.Vec(BurnNFTItemResponse),
    'Err' : BurnNFTBatchError,
  });
  const NFTMap = IDL.Vec(IDL.Tuple(IDL.Text, Value));
  const MintNFTArgs = IDL.Record({
    'token_id' : IDL.Nat,
    'owner' : Account__1,
    'metadata' : NFTMap,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
    'spender' : IDL.Opt(Account__1),
  });
  const SetNFTError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TokenExists' : IDL.Null,
    'NonExistingTokenId' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'TooOld' : IDL.Null,
  });
  const SetNFTResult = IDL.Variant({
    'Ok' : IDL.Opt(IDL.Nat),
    'Err' : SetNFTError,
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
  });
  const ApproveTokenError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'InvalidSpender' : IDL.Null,
    'NonExistingTokenId' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'GenericBatchError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TooOld' : IDL.Null,
  });
  const ApproveTokenResult = IDL.Variant({
    'Ok' : IDL.Nat,
    'Err' : ApproveTokenError,
  });
  const CastStatus = IDL.Variant({
    'Error' : CastError,
    'WaitingOnContract' : IDL.Record({ 'transaction' : IDL.Text }),
    'RemoteFinalized' : IDL.Text,
    'SubmittedToOrchestrator' : IDL.Record({
      'localCastId' : IDL.Nat,
      'remoteCastId' : IDL.Nat,
    }),
    'WaitingOnMint' : IDL.Record({ 'transaction' : IDL.Text }),
    'WaitingOnTransfer' : IDL.Record({ 'transaction' : IDL.Text }),
    'Created' : IDL.Null,
    'Completed' : IDL.Nat,
    'SubmittingToOrchestrator' : IDL.Nat,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const CKNFTActor = IDL.Service({
    'assign' : IDL.Func([IDL.Nat, Account__1], [IDL.Nat], []),
    'get_stats' : IDL.Func(
        [],
        [IDL.Record({ 'icrc99' : Stats__1, 'icrc7' : Stats })],
        ['query'],
      ),
    'get_tip' : IDL.Func([], [Tip], ['query']),
    'icrc10_supported_standards' : IDL.Func(
        [],
        [SupportedStandards__1],
        ['query'],
      ),
    'icrc37_approve_collection' : IDL.Func(
        [IDL.Vec(ApproveCollectionArg)],
        [IDL.Vec(IDL.Opt(ApproveCollectionResult))],
        [],
      ),
    'icrc37_approve_tokens' : IDL.Func(
        [IDL.Vec(ApproveTokenArg)],
        [IDL.Vec(IDL.Opt(ApproveTokenResult__1))],
        [],
      ),
    'icrc37_get_collection_approvals' : IDL.Func(
        [Account__1, IDL.Opt(CollectionApproval), IDL.Opt(IDL.Nat)],
        [IDL.Vec(CollectionApproval)],
        ['query'],
      ),
    'icrc37_get_token_approvals' : IDL.Func(
        [IDL.Vec(IDL.Nat), IDL.Opt(TokenApproval), IDL.Opt(IDL.Nat)],
        [IDL.Vec(TokenApproval)],
        ['query'],
      ),
    'icrc37_is_approved' : IDL.Func(
        [IDL.Vec(IsApprovedArg)],
        [IDL.Vec(IDL.Bool)],
        ['query'],
      ),
    'icrc37_max_approvals_per_token_or_collection' : IDL.Func(
        [],
        [IDL.Opt(IDL.Nat)],
        ['query'],
      ),
    'icrc37_max_revoke_approvals' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc37_revoke_collection_approvals' : IDL.Func(
        [IDL.Vec(RevokeCollectionApprovalArg)],
        [IDL.Vec(IDL.Opt(RevokeCollectionApprovalResult))],
        [],
      ),
    'icrc37_revoke_token_approvals' : IDL.Func(
        [IDL.Vec(RevokeTokenApprovalArg)],
        [IDL.Vec(IDL.Opt(RevokeTokenApprovalResult))],
        [],
      ),
    'icrc37_transfer_from' : IDL.Func(
        [IDL.Vec(TransferFromArg)],
        [IDL.Vec(IDL.Opt(TransferFromResult))],
        [],
      ),
    'icrc3_get_archives' : IDL.Func(
        [GetArchivesArgs],
        [GetArchivesResult],
        ['query'],
      ),
    'icrc3_get_blocks' : IDL.Func(
        [IDL.Vec(TransactionRange)],
        [GetTransactionsResult],
        ['query'],
      ),
    'icrc3_get_tip_certificate' : IDL.Func(
        [],
        [IDL.Opt(DataCertificate)],
        ['query'],
      ),
    'icrc3_supported_block_types' : IDL.Func(
        [],
        [IDL.Vec(BlockType__1)],
        ['query'],
      ),
    'icrc7_atomic_batch_transfers' : IDL.Func(
        [],
        [IDL.Opt(IDL.Bool)],
        ['query'],
      ),
    'icrc7_balance_of' : IDL.Func(
        [BalanceOfRequest],
        [BalanceOfResponse],
        ['query'],
      ),
    'icrc7_collection_metadata' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, Value__1))],
        ['query'],
      ),
    'icrc7_default_take_value' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_description' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'icrc7_logo' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'icrc7_max_memo_size' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_max_query_batch_size' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_max_take_value' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_max_update_batch_size' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_name' : IDL.Func([], [IDL.Text], ['query']),
    'icrc7_owner_of' : IDL.Func([OwnerOfRequest], [OwnerOfResponse], ['query']),
    'icrc7_permitted_drift' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_supply_cap' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_symbol' : IDL.Func([], [IDL.Text], ['query']),
    'icrc7_token_metadata' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, Value__1))))],
        ['query'],
      ),
    'icrc7_tokens' : IDL.Func(
        [IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
        [IDL.Vec(IDL.Nat)],
        ['query'],
      ),
    'icrc7_tokens_of' : IDL.Func(
        [Account__1, IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
        [IDL.Vec(IDL.Nat)],
        ['query'],
      ),
    'icrc7_total_supply' : IDL.Func([], [IDL.Nat], ['query']),
    'icrc7_transfer' : IDL.Func(
        [IDL.Vec(TransferArgs)],
        [IDL.Vec(IDL.Opt(TransferResult))],
        [],
      ),
    'icrc7_tx_window' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc99_burn_fund_address' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(IDL.Tuple(IDL.Text, Network__1))],
        [],
      ),
    'icrc99_cast' : IDL.Func(
        [IDL.Vec(CastRequest), IDL.Opt(Account__1)],
        [IDL.Vec(IDL.Opt(CastResult))],
        [],
      ),
    'icrc99_cast_cost' : IDL.Func([CastCostRequest], [IDL.Nat], []),
    'icrc99_cast_status' : IDL.Func(
        [IDL.Vec(IDL.Nat), IDL.Opt(Account__1)],
        [IDL.Vec(IDL.Opt(CastStateShared))],
        [],
      ),
    'icrc99_native_chain' : IDL.Func([], [RemoteContractPointer__1], ['query']),
    'icrc99_remote_owner_of' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(IDL.Opt(RemoteOwner))],
        ['query'],
      ),
    'icrc99_request_remote_owner_status' : IDL.Func(
        [IDL.Vec(RequestRemoteOwnerRequest), IDL.Opt(Account__1)],
        [IDL.Vec(IDL.Opt(RemoteOwnerResult))],
        [],
      ),
    'icrcX_burn' : IDL.Func([BurnNFTRequest], [BurnNFTBatchResponse], []),
    'mint_ck_nft' : IDL.Func(
        [MintNFTArgs],
        [SetNFTResult, IDL.Opt(ApproveTokenResult)],
        [],
      ),
    'update_cast_status' : IDL.Func([IDL.Nat, CastStatus], [Result], []),
  });
  return CKNFTActor;
};
export const init = ({ IDL }) => {
  const CandyShared = IDL.Rec();
  const ArgList = IDL.Record({
    'deployer' : IDL.Principal,
    'max_approvals' : IDL.Opt(IDL.Nat),
    'max_approvals_per_token_or_collection' : IDL.Opt(IDL.Nat),
    'settle_to_approvals' : IDL.Opt(IDL.Nat),
    'max_revoke_approvals' : IDL.Opt(IDL.Nat),
    'collection_approval_requires_token' : IDL.Opt(IDL.Bool),
  });
  const InitArgs = IDL.Opt(ArgList);
  const IndexType = IDL.Variant({
    'Stable' : IDL.Null,
    'StableTyped' : IDL.Null,
    'Managed' : IDL.Null,
  });
  const BlockType = IDL.Record({ 'url' : IDL.Text, 'block_type' : IDL.Text });
  const InitArgs__1 = IDL.Record({
    'maxRecordsToArchive' : IDL.Nat,
    'archiveIndexType' : IndexType,
    'maxArchivePages' : IDL.Nat,
    'settleToRecords' : IDL.Nat,
    'archiveCycles' : IDL.Nat,
    'maxActiveRecords' : IDL.Nat,
    'maxRecordsInArchiveInstance' : IDL.Nat,
    'archiveControllers' : IDL.Opt(IDL.Opt(IDL.Vec(IDL.Principal))),
    'supportedBlocks' : IDL.Vec(BlockType),
  });
  const Subaccount = IDL.Vec(IDL.Nat8);
  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(Subaccount),
  });
  const SupportedStandards = IDL.Vec(
    IDL.Record({ 'url' : IDL.Text, 'name' : IDL.Text })
  );
  const ArgList__1 = IDL.Record({
    'deployer' : IDL.Principal,
    'allow_transfers' : IDL.Opt(IDL.Bool),
    'supply_cap' : IDL.Opt(IDL.Nat),
    'tx_window' : IDL.Opt(IDL.Nat),
    'burn_account' : IDL.Opt(Account),
    'default_take_value' : IDL.Opt(IDL.Nat),
    'logo' : IDL.Opt(IDL.Text),
    'permitted_drift' : IDL.Opt(IDL.Nat),
    'name' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
    'max_take_value' : IDL.Opt(IDL.Nat),
    'max_update_batch_size' : IDL.Opt(IDL.Nat),
    'max_query_batch_size' : IDL.Opt(IDL.Nat),
    'max_memo_size' : IDL.Opt(IDL.Nat),
    'supported_standards' : IDL.Opt(SupportedStandards),
    'symbol' : IDL.Opt(IDL.Text),
  });
  const InitArgs__2 = IDL.Opt(ArgList__1);
  const PropertyShared = IDL.Record({
    'value' : CandyShared,
    'name' : IDL.Text,
    'immutable' : IDL.Bool,
  });
  CandyShared.fill(
    IDL.Variant({
      'Int' : IDL.Int,
      'Map' : IDL.Vec(IDL.Tuple(IDL.Text, CandyShared)),
      'Nat' : IDL.Nat,
      'Set' : IDL.Vec(CandyShared),
      'Nat16' : IDL.Nat16,
      'Nat32' : IDL.Nat32,
      'Nat64' : IDL.Nat64,
      'Blob' : IDL.Vec(IDL.Nat8),
      'Bool' : IDL.Bool,
      'Int8' : IDL.Int8,
      'Ints' : IDL.Vec(IDL.Int),
      'Nat8' : IDL.Nat8,
      'Nats' : IDL.Vec(IDL.Nat),
      'Text' : IDL.Text,
      'Bytes' : IDL.Vec(IDL.Nat8),
      'Int16' : IDL.Int16,
      'Int32' : IDL.Int32,
      'Int64' : IDL.Int64,
      'Option' : IDL.Opt(CandyShared),
      'Floats' : IDL.Vec(IDL.Float64),
      'Float' : IDL.Float64,
      'Principal' : IDL.Principal,
      'Array' : IDL.Vec(CandyShared),
      'ValueMap' : IDL.Vec(IDL.Tuple(CandyShared, CandyShared)),
      'Class' : IDL.Vec(PropertyShared),
    })
  );
  const ICRC16Map = IDL.Vec(IDL.Tuple(IDL.Text, CandyShared));
  const Network = IDL.Variant({
    'IC' : IDL.Opt(IDL.Text),
    'Ethereum' : IDL.Opt(IDL.Nat),
    'Solana' : IDL.Opt(IDL.Nat),
    'Bitcoin' : IDL.Opt(IDL.Text),
    'Other' : ICRC16Map,
  });
  const RemoteContractPointer = IDL.Record({
    'contract' : IDL.Text,
    'network' : Network,
  });
  const InitArgsList = IDL.Record({
    'service' : IDL.Opt(IDL.Principal),
    'nativeChain' : RemoteContractPointer,
  });
  const InitArgs__3 = IDL.Opt(InitArgsList);
  return [
    IDL.Opt(
      IDL.Record({
        'icrc37args' : InitArgs,
        'icrc3args' : IDL.Opt(InitArgs__1),
        'icrc7args' : InitArgs__2,
        'defaults' : IDL.Record({
          'logo' : IDL.Opt(IDL.Text),
          'name' : IDL.Opt(IDL.Text),
          'description' : IDL.Opt(IDL.Text),
          'symbol' : IDL.Opt(IDL.Text),
        }),
        'icrc99args' : InitArgs__3,
      })
    ),
  ];
};
