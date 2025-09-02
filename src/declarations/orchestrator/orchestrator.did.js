export const idlFactory = ({ IDL }) => {
  const CandyShared = IDL.Rec();
  const EthSepoliaService = IDL.Variant({
    'Alchemy' : IDL.Null,
    'BlockPi' : IDL.Null,
    'PublicNode' : IDL.Null,
    'Ankr' : IDL.Null,
    'Sepolia' : IDL.Null,
  });
  const L2MainnetService = IDL.Variant({
    'Alchemy' : IDL.Null,
    'Llama' : IDL.Null,
    'BlockPi' : IDL.Null,
    'PublicNode' : IDL.Null,
    'Ankr' : IDL.Null,
  });
  const ChainId = IDL.Nat64;
  const HttpHeader = IDL.Record({ 'value' : IDL.Text, 'name' : IDL.Text });
  const RpcApi = IDL.Record({
    'url' : IDL.Text,
    'headers' : IDL.Opt(IDL.Vec(HttpHeader)),
  });
  const EthMainnetService = IDL.Variant({
    'Alchemy' : IDL.Null,
    'Llama' : IDL.Null,
    'BlockPi' : IDL.Null,
    'Cloudflare' : IDL.Null,
    'PublicNode' : IDL.Null,
    'Ankr' : IDL.Null,
  });
  const RpcServices = IDL.Variant({
    'EthSepolia' : IDL.Opt(IDL.Vec(EthSepoliaService)),
    'BaseMainnet' : IDL.Opt(IDL.Vec(L2MainnetService)),
    'Custom' : IDL.Record({
      'chainId' : ChainId,
      'services' : IDL.Vec(RpcApi),
    }),
    'OptimismMainnet' : IDL.Opt(IDL.Vec(L2MainnetService)),
    'ArbitrumOne' : IDL.Opt(IDL.Vec(L2MainnetService)),
    'EthMainnet' : IDL.Opt(IDL.Vec(EthMainnetService)),
  });
  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
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
  const ContractPointer = IDL.Record({
    'contract' : IDL.Text,
    'network' : Network,
  });
  const CastRequest = IDL.Record({
    'uri' : IDL.Text,
    'originalMinterAccount' : IDL.Opt(Account),
    'tokenId' : IDL.Nat,
    'gasPrice' : IDL.Opt(IDL.Nat),
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'remoteContract' : ContractPointer,
    'nativeContract' : ContractPointer,
    'maxPriorityFeePerGas' : IDL.Opt(IDL.Nat),
    'castId' : IDL.Nat,
    'created_at_time' : IDL.Opt(IDL.Nat),
    'gasLimit' : IDL.Opt(IDL.Nat),
    'targetOwner' : IDL.Text,
    'originalCaller' : Account,
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
  const ICRPCService = IDL.Variant({ 'Generic' : RpcApi });
  const ProviderId = IDL.Nat64;
  const RpcService = IDL.Variant({
    'EthSepolia' : EthSepoliaService,
    'BaseMainnet' : L2MainnetService,
    'Custom' : RpcApi,
    'OptimismMainnet' : L2MainnetService,
    'ArbitrumOne' : L2MainnetService,
    'EthMainnet' : EthMainnetService,
    'Provider' : ProviderId,
  });
  const SolonaRPCService = IDL.Variant({ 'Generic' : RpcApi });
  const BitcoinRPCService = IDL.Variant({ 'Generic' : RpcApi });
  const FusionRPCService__1 = IDL.Variant({
    'IC' : IDL.Record({ 'rpc' : ICRPCService, 'canisterId' : IDL.Principal }),
    'Ethereum' : IDL.Record({
      'rpc' : RpcService,
      'canisterId' : IDL.Principal,
    }),
    'Solana' : IDL.Record({
      'rpc' : SolonaRPCService,
      'canisterId' : IDL.Principal,
    }),
    'Bitcoin' : IDL.Record({
      'rpc' : BitcoinRPCService,
      'canisterId' : IDL.Principal,
    }),
    'Other' : IDL.Vec(IDL.Tuple(IDL.Text, CandyShared)),
  });
  const OrchestratorConfig = IDL.Variant({
    'SetTecdsaKeyName' : IDL.Text,
    'MapNetwork' : IDL.Record({
      'service' : FusionRPCService__1,
      'action' : IDL.Variant({ 'Add' : IDL.Null, 'Remove' : IDL.Null }),
      'network' : Network,
    }),
  });
  const OrchestratorConfigError = IDL.Variant({
    'GenericError' : IDL.Text,
    'Unauthorized' : IDL.Null,
    'MapNetwork' : IDL.Variant({ 'NotFound' : IDL.Null, 'Exists' : IDL.Null }),
  });
  const OrchestratorConfigResult = IDL.Variant({
    'Ok' : IDL.Nat,
    'Err' : OrchestratorConfigError,
  });
  const CanisterDefaults = IDL.Record({
    'logo' : IDL.Opt(IDL.Text),
    'name' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
    'symbol' : IDL.Opt(IDL.Text),
  });
  const JsonRpcError = IDL.Record({ 'code' : IDL.Int64, 'message' : IDL.Text });
  const ProviderError = IDL.Variant({
    'TooFewCycles' : IDL.Record({ 'expected' : IDL.Nat, 'received' : IDL.Nat }),
    'InvalidRpcConfig' : IDL.Text,
    'MissingRequiredProvider' : IDL.Null,
    'ProviderNotFound' : IDL.Null,
    'NoPermission' : IDL.Null,
  });
  const ValidationError = IDL.Variant({
    'Custom' : IDL.Text,
    'InvalidHex' : IDL.Text,
  });
  const RejectionCode = IDL.Variant({
    'NoError' : IDL.Null,
    'CanisterError' : IDL.Null,
    'SysTransient' : IDL.Null,
    'DestinationInvalid' : IDL.Null,
    'Unknown' : IDL.Null,
    'SysFatal' : IDL.Null,
    'CanisterReject' : IDL.Null,
  });
  const HttpOutcallError = IDL.Variant({
    'IcError' : IDL.Record({ 'code' : RejectionCode, 'message' : IDL.Text }),
    'InvalidHttpJsonRpcResponse' : IDL.Record({
      'status' : IDL.Nat16,
      'body' : IDL.Text,
      'parsingError' : IDL.Opt(IDL.Text),
    }),
  });
  const RpcError = IDL.Variant({
    'JsonRpcError' : JsonRpcError,
    'ProviderError' : ProviderError,
    'ValidationError' : ValidationError,
    'HttpOutcallError' : HttpOutcallError,
  });
  const SendRawTransactionStatus = IDL.Variant({
    'Ok' : IDL.Opt(IDL.Text),
    'NonceTooLow' : IDL.Null,
    'NonceTooHigh' : IDL.Null,
    'InsufficientFunds' : IDL.Null,
  });
  const SendRawTransactionResult = IDL.Variant({
    'Ok' : SendRawTransactionStatus,
    'Err' : RpcError,
  });
  const MultiSendRawTransactionResult = IDL.Variant({
    'Consistent' : SendRawTransactionResult,
    'Inconsistent' : IDL.Vec(IDL.Tuple(RpcService, SendRawTransactionResult)),
  });
  const CreateCanisterError = IDL.Variant({
    'RPC' : IDL.Variant({
      'Ethereum' : RpcError,
      'EthereumMultiSend' : MultiSendRawTransactionResult,
    }),
    'GenericError' : IDL.Text,
    'NoCkNFTCanister' : IDL.Null,
    'InsufficientAllowance' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'InsufficientBalance' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'InsufficientCycles' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'Unauthorized' : IDL.Null,
    'NetworkRCPNotFound' : IDL.Null,
    'NotImplemented' : IDL.Null,
  });
  const CreateCanisterResponse = IDL.Variant({
    'Ok' : IDL.Principal,
    'Err' : CreateCanisterError,
  });
  const CreateRemoteError = IDL.Variant({
    'RPC' : IDL.Variant({
      'Ethereum' : RpcError,
      'EthereumMultiSend' : MultiSendRawTransactionResult,
    }),
    'GenericError' : IDL.Text,
    'NoCkNFTCanister' : IDL.Null,
    'InsufficientAllowance' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'InsufficientBalance' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'InsufficientCycles' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'Unauthorized' : IDL.Null,
    'NetworkRCPNotFound' : IDL.Null,
    'NotImplemented' : IDL.Null,
  });
  const CreateRemoteResponse = IDL.Variant({
    'Ok' : IDL.Nat,
    'Err' : CreateRemoteError,
  });
  const ContractPointer__1 = IDL.Record({
    'contract' : IDL.Text,
    'network' : Network,
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
  const RemoteNFTPointer = IDL.Record({
    'tokenId' : IDL.Nat,
    'contract' : IDL.Text,
    'network' : Network,
  });
  const MintResumeOption = IDL.Variant({
    'StartMetadataTransfer' : IDL.Null,
    'StartMint' : IDL.Null,
    'StartOwnershipVerification' : IDL.Null,
  });
  const MintRequest = IDL.Record({
    'nft' : RemoteNFTPointer,
    'resume' : IDL.Opt(IDL.Tuple(IDL.Nat, MintResumeOption)),
    'mintToAccount' : Account,
    'spender' : IDL.Opt(Account),
  });
  const RemoteError = IDL.Variant({
    'RPC' : IDL.Variant({
      'Ethereum' : RpcError,
      'EthereumMultiSend' : MultiSendRawTransactionResult,
    }),
    'GenericError' : IDL.Text,
    'NoCkNFTCanister' : IDL.Null,
    'InsufficientAllowance' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'InsufficientBalance' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'InsufficientCycles' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'Unauthorized' : IDL.Null,
    'NetworkRCPNotFound' : IDL.Null,
    'NotImplemented' : IDL.Null,
  });
  const MintStatus = IDL.Variant({
    'Err' : IDL.Variant({
      'GenericError' : IDL.Text,
      'MintError' : IDL.Text,
      'ApprovalError' : IDL.Text,
      'InvalidTransfer' : IDL.Text,
      'OwnershipNotVerified' : IDL.Variant({
        'RemoteError' : RemoteError,
        'InvalidOwner' : IDL.Null,
        'TooManyRetries' : IDL.Nat,
      }),
      'MetadataError' : IDL.Text,
      'InvalidMetadata' : IDL.Text,
    }),
    'Transferring' : IDL.Null,
    'Minting' : IDL.Null,
    'RetrievingMetadata' : IDL.Record({
      'nextQuery' : IDL.Nat,
      'retries' : IDL.Nat,
    }),
    'Complete' : IDL.Record({
      'approvalTrx' : IDL.Opt(IDL.Nat),
      'mintTrx' : IDL.Nat,
      'approvalError' : IDL.Opt(IDL.Text),
    }),
    'CheckingOwner' : IDL.Record({
      'nextQuery' : IDL.Nat,
      'retries' : IDL.Nat,
    }),
  });
  const Network__2 = IDL.Variant({
    'IC' : IDL.Opt(IDL.Text),
    'Ethereum' : IDL.Opt(IDL.Nat),
    'Solana' : IDL.Opt(IDL.Nat),
    'Bitcoin' : IDL.Opt(IDL.Text),
    'Other' : ICRC16Map,
  });
  const ContractStateShared__1 = IDL.Record({
    'nextQuery' : IDL.Opt(IDL.Nat),
    'contractType' : IDL.Variant({
      'Remote' : IDL.Null,
      'Owned' : ContractPointer,
    }),
    'network' : IDL.Opt(Network),
    'writingContractCanisterId' : IDL.Opt(IDL.Text),
    'ckNFTCanisterId' : IDL.Opt(IDL.Nat),
    'address' : IDL.Opt(IDL.Text),
    'confirmed' : IDL.Bool,
    'deploymentTrx' : IDL.Opt(IDL.Text),
    'contractId' : IDL.Nat,
    'retries' : IDL.Opt(IDL.Nat),
  });
  const ApprovalAddressRequest = IDL.Record({
    'remoteNFTPointer' : RemoteNFTPointer,
    'account' : Account,
  });
  const Account__1 = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const GetCallResult = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : RemoteError });
  const Time = IDL.Nat;
  const ActionId = IDL.Record({ 'id' : IDL.Nat, 'time' : Time });
  const Action = IDL.Record({
    'aSync' : IDL.Opt(IDL.Nat),
    'actionType' : IDL.Text,
    'params' : IDL.Vec(IDL.Nat8),
    'retries' : IDL.Nat,
  });
  const ActionDetail = IDL.Tuple(ActionId, Action);
  const TimerId = IDL.Nat;
  const Stats__1 = IDL.Record({
    'timers' : IDL.Nat,
    'maxExecutions' : IDL.Nat,
    'minAction' : IDL.Opt(ActionDetail),
    'cycles' : IDL.Nat,
    'nextActionId' : IDL.Nat,
    'nextTimer' : IDL.Opt(TimerId),
    'expectedExecutionTime' : IDL.Opt(Time),
    'lastExecutionTime' : Time,
  });
  const Network__1 = IDL.Variant({
    'IC' : IDL.Opt(IDL.Text),
    'Ethereum' : IDL.Opt(IDL.Nat),
    'Solana' : IDL.Opt(IDL.Nat),
    'Bitcoin' : IDL.Opt(IDL.Text),
    'Other' : ICRC16Map,
  });
  const Contract = IDL.Text;
  const CkNFTCanisterStateShared = IDL.Record({
    'principal' : IDL.Principal,
    'lastCycles' : IDL.Nat,
    'network' : Network__1,
    'networkMap' : IDL.Vec(IDL.Tuple(Network__1, Contract)),
    'lastCyclesTimestamp' : IDL.Nat,
    'ckNFTCanisterId' : IDL.Nat,
    'nativeContract' : Contract,
  });
  const FusionRPCService = IDL.Variant({
    'IC' : IDL.Record({ 'rpc' : ICRPCService, 'canisterId' : IDL.Principal }),
    'Ethereum' : IDL.Record({
      'rpc' : RpcService,
      'canisterId' : IDL.Principal,
    }),
    'Solana' : IDL.Record({
      'rpc' : SolonaRPCService,
      'canisterId' : IDL.Principal,
    }),
    'Bitcoin' : IDL.Record({
      'rpc' : BitcoinRPCService,
      'canisterId' : IDL.Principal,
    }),
    'Other' : IDL.Vec(IDL.Tuple(IDL.Text, CandyShared)),
  });
  const ContractStateShared = IDL.Record({
    'nextQuery' : IDL.Opt(IDL.Nat),
    'contractType' : IDL.Variant({
      'Remote' : IDL.Null,
      'Owned' : ContractPointer,
    }),
    'network' : IDL.Opt(Network),
    'writingContractCanisterId' : IDL.Opt(IDL.Text),
    'ckNFTCanisterId' : IDL.Opt(IDL.Nat),
    'address' : IDL.Opt(IDL.Text),
    'confirmed' : IDL.Bool,
    'deploymentTrx' : IDL.Opt(IDL.Text),
    'contractId' : IDL.Nat,
    'retries' : IDL.Opt(IDL.Nat),
  });
  const Stats = IDL.Record({
    'tt' : Stats__1,
    'ckNFTCanisters' : IDL.Vec(CkNFTCanisterStateShared),
    'owner' : IDL.Principal,
    'networkMap' : IDL.Vec(IDL.Tuple(Network, IDL.Vec(FusionRPCService))),
    'contracts' : IDL.Vec(ContractStateShared),
  });
  const MintRequestId = IDL.Nat;
  const MintError = IDL.Variant({
    'RPC' : IDL.Variant({
      'Ethereum' : RpcError,
      'EthereumMultiSend' : MultiSendRawTransactionResult,
    }),
    'InvalidAccount' : IDL.Null,
    'GenericError' : IDL.Text,
    'NoCkNFTCanister' : IDL.Null,
    'InvalidMintStatus' : IDL.Null,
    'InsufficientAllowance' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'InvalidSpender' : IDL.Null,
    'InsufficientBalance' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'InvalidMintRequest' : IDL.Null,
    'InsufficientCycles' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'Unauthorized' : IDL.Null,
    'NetworkRCPNotFound' : IDL.Null,
    'NotImplemented' : IDL.Null,
    'InvalidMintRequestId' : IDL.Null,
    'InvalidRemoteNFTPointer' : IDL.Null,
    'InvalidResumeOption' : IDL.Null,
  });
  const MintResult = IDL.Variant({ 'Ok' : MintRequestId, 'Err' : MintError });
  const OrchestratorActor = IDL.Service({
    'calc_eth_call_cycles' : IDL.Func(
        [RpcServices, IDL.Nat, IDL.Text],
        [IDL.Nat],
        ['query'],
      ),
    'cast' : IDL.Func([CastRequest], [CastResult], []),
    'configure' : IDL.Func(
        [IDL.Vec(OrchestratorConfig)],
        [IDL.Vec(IDL.Opt(OrchestratorConfigResult))],
        [],
      ),
    'create_canister' : IDL.Func(
        [ContractPointer, CanisterDefaults, IDL.Opt(Account)],
        [CreateCanisterResponse],
        [],
      ),
    'create_remote' : IDL.Func(
        [ContractPointer, Network, IDL.Nat, IDL.Nat, IDL.Nat, IDL.Opt(Account)],
        [CreateRemoteResponse],
        [],
      ),
    'forceCkNFTCaniser' : IDL.Func([ContractPointer__1, IDL.Principal], [], []),
    'get_cast_status' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(IDL.Opt(CastStatus))],
        ['query'],
      ),
    'get_ck_nft_canister' : IDL.Func(
        [IDL.Vec(ContractPointer)],
        [IDL.Vec(IDL.Opt(IDL.Principal))],
        ['query'],
      ),
    'get_creation_cost' : IDL.Func([ContractPointer], [IDL.Nat], []),
    'get_icrc99_address' : IDL.Func(
        [IDL.Principal, Network],
        [IDL.Opt(IDL.Text)],
        [],
      ),
    'get_mint_cost' : IDL.Func(
        [IDL.Vec(MintRequest)],
        [IDL.Vec(IDL.Opt(IDL.Nat))],
        ['query'],
      ),
    'get_mint_status' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(IDL.Opt(MintStatus))],
        ['query'],
      ),
    'get_remote' : IDL.Func(
        [IDL.Vec(IDL.Tuple(IDL.Principal, Network__2))],
        [IDL.Vec(IDL.Opt(ContractStateShared__1))],
        ['query'],
      ),
    'get_remote_approval_address' : IDL.Func(
        [ApprovalAddressRequest, IDL.Opt(Account)],
        [IDL.Opt(IDL.Text)],
        [],
      ),
    'get_remote_cost' : IDL.Func(
        [ContractPointer, Network],
        [IDL.Nat],
        ['query'],
      ),
    'get_remote_meta' : IDL.Func(
        [IDL.Vec(RemoteNFTPointer), IDL.Vec(IDL.Nat), IDL.Opt(Account__1)],
        [IDL.Vec(IDL.Opt(GetCallResult))],
        [],
      ),
    'get_remote_owner' : IDL.Func(
        [IDL.Vec(RemoteNFTPointer), IDL.Opt(Account__1)],
        [IDL.Vec(IDL.Opt(GetCallResult))],
        [],
      ),
    'get_remote_status' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(IDL.Opt(ContractStateShared__1))],
        ['query'],
      ),
    'get_stats' : IDL.Func([], [Stats], ['query']),
    'mint' : IDL.Func([MintRequest, IDL.Opt(Account)], [MintResult], []),
    'system_upgrade' : IDL.Func([], [], []),
    'upgrade_ckNFT_canister' : IDL.Func([IDL.Principal], [], []),
  });
  return OrchestratorActor;
};
export const init = ({ IDL }) => { return []; };
