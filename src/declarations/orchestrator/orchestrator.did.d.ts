import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Account {
  'owner' : Principal,
  'subaccount' : [] | [Uint8Array | number[]],
}
export interface Action {
  'aSync' : [] | [bigint],
  'actionType' : string,
  'params' : Uint8Array | number[],
  'retries' : bigint,
}
export type ActionDetail = [ActionId, Action];
export interface ActionId { 'id' : bigint, 'time' : Time }
export interface ApprovalAddressRequest {
  'remoteNFTPointer' : RemoteNFTPointer,
  'account' : Account,
}
export type BitcoinRPCService = { 'Generic' : RpcApi };
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
export interface CanisterDefaults {
  'logo' : [] | [string],
  'name' : [] | [string],
  'description' : [] | [string],
  'symbol' : [] | [string],
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
  'uri' : string,
  'originalMinterAccount' : [] | [Account],
  'tokenId' : bigint,
  'gasPrice' : [] | [bigint],
  'memo' : [] | [Uint8Array | number[]],
  'remoteContract' : ContractPointer,
  'nativeContract' : ContractPointer,
  'maxPriorityFeePerGas' : [] | [bigint],
  'castId' : bigint,
  'created_at_time' : [] | [bigint],
  'gasLimit' : [] | [bigint],
  'targetOwner' : string,
  'originalCaller' : Account,
}
export type CastResult = { 'Ok' : bigint } |
  { 'Err' : CastError };
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
export type ChainId = bigint;
export interface CkNFTCanisterStateShared {
  'principal' : Principal,
  'lastCycles' : bigint,
  'network' : Network,
  'networkMap' : Array<[Network, Contract]>,
  'lastCyclesTimestamp' : bigint,
  'ckNFTCanisterId' : bigint,
  'nativeContract' : Contract,
}
export type Contract = string;
export interface ContractPointer { 'contract' : string, 'network' : Network }
export interface ContractStateShared {
  'nextQuery' : [] | [bigint],
  'contractType' : { 'Remote' : null } |
    { 'Owned' : ContractPointer },
  'network' : [] | [Network],
  'writingContractCanisterId' : [] | [string],
  'ckNFTCanisterId' : [] | [bigint],
  'address' : [] | [string],
  'confirmed' : boolean,
  'deploymentTrx' : [] | [string],
  'contractId' : bigint,
  'retries' : [] | [bigint],
}
export type CreateCanisterError = {
    'RPC' : { 'Ethereum' : RpcError } |
      {
        'Solana' : { 'NetworkError' : string } |
          { 'MetadataNotFound' : string } |
          { 'ParseError' : string } |
          { 'InvalidMint' : string } |
          { 'TokenAccountNotFound' : string }
      } |
      { 'EthereumMultiSend' : MultiSendRawTransactionResult }
  } |
  { 'GenericError' : string } |
  { 'NoCkNFTCanister' : null } |
  { 'InsufficientAllowance' : [bigint, bigint] } |
  { 'InsufficientBalance' : [bigint, bigint] } |
  { 'InsufficientCycles' : [bigint, bigint] } |
  { 'Unauthorized' : null } |
  { 'NetworkRCPNotFound' : null } |
  { 'NotImplemented' : null };
export type CreateCanisterResponse = { 'Ok' : Principal } |
  { 'Err' : CreateCanisterError };
export type CreateRemoteError = {
    'RPC' : { 'Ethereum' : RpcError } |
      {
        'Solana' : { 'NetworkError' : string } |
          { 'MetadataNotFound' : string } |
          { 'ParseError' : string } |
          { 'InvalidMint' : string } |
          { 'TokenAccountNotFound' : string }
      } |
      { 'EthereumMultiSend' : MultiSendRawTransactionResult }
  } |
  { 'GenericError' : string } |
  { 'NoCkNFTCanister' : null } |
  { 'InsufficientAllowance' : [bigint, bigint] } |
  { 'InsufficientBalance' : [bigint, bigint] } |
  { 'InsufficientCycles' : [bigint, bigint] } |
  { 'Unauthorized' : null } |
  { 'NetworkRCPNotFound' : null } |
  { 'NotImplemented' : null };
export type CreateRemoteResponse = { 'Ok' : bigint } |
  { 'Err' : CreateRemoteError };
export type EthMainnetService = { 'Alchemy' : null } |
  { 'Llama' : null } |
  { 'BlockPi' : null } |
  { 'Cloudflare' : null } |
  { 'PublicNode' : null } |
  { 'Ankr' : null };
export type EthSepoliaService = { 'Alchemy' : null } |
  { 'BlockPi' : null } |
  { 'PublicNode' : null } |
  { 'Ankr' : null } |
  { 'Sepolia' : null };
export type FusionRPCService = {
    'IC' : { 'rpc' : ICRPCService, 'canisterId' : Principal }
  } |
  { 'Ethereum' : { 'rpc' : RpcService, 'canisterId' : Principal } } |
  { 'Solana' : { 'rpc' : SolanaRPCService, 'canisterId' : Principal } } |
  { 'Bitcoin' : { 'rpc' : BitcoinRPCService, 'canisterId' : Principal } } |
  { 'Other' : Array<[string, CandyShared]> };
export type GetCallResult = { 'Ok' : string } |
  { 'Err' : RemoteError };
export interface HttpHeader { 'value' : string, 'name' : string }
export type HttpOutcallError = {
    'IcError' : { 'code' : RejectionCode, 'message' : string }
  } |
  {
    'InvalidHttpJsonRpcResponse' : {
      'status' : number,
      'body' : string,
      'parsingError' : [] | [string],
    }
  };
export type ICRC16Map = Array<[string, CandyShared]>;
export type ICRPCService = { 'Generic' : RpcApi };
export interface JsonRpcError { 'code' : bigint, 'message' : string }
export type L2MainnetService = { 'Alchemy' : null } |
  { 'Llama' : null } |
  { 'BlockPi' : null } |
  { 'PublicNode' : null } |
  { 'Ankr' : null };
export type MintError = {
    'RPC' : { 'Ethereum' : RpcError } |
      {
        'Solana' : { 'NetworkError' : string } |
          { 'MetadataNotFound' : string } |
          { 'ParseError' : string } |
          { 'InvalidMint' : string } |
          { 'TokenAccountNotFound' : string }
      } |
      { 'EthereumMultiSend' : MultiSendRawTransactionResult }
  } |
  { 'InvalidAccount' : null } |
  { 'GenericError' : string } |
  { 'NoCkNFTCanister' : null } |
  { 'InvalidMintStatus' : null } |
  { 'InsufficientAllowance' : [bigint, bigint] } |
  { 'InvalidSpender' : null } |
  { 'InsufficientBalance' : [bigint, bigint] } |
  { 'InvalidMintRequest' : null } |
  { 'InsufficientCycles' : [bigint, bigint] } |
  { 'Unauthorized' : null } |
  { 'NetworkRCPNotFound' : null } |
  { 'NotImplemented' : null } |
  { 'InvalidMintRequestId' : null } |
  { 'InvalidRemoteNFTPointer' : null } |
  { 'InvalidResumeOption' : null };
export interface MintRequest {
  'nft' : RemoteNFTPointer,
  'resume' : [] | [[bigint, MintResumeOption]],
  'mintToAccount' : Account,
  'spender' : [] | [Account],
}
export type MintRequestId = bigint;
export type MintResult = { 'Ok' : MintRequestId } |
  { 'Err' : MintError };
export type MintResumeOption = { 'StartMetadataTransfer' : null } |
  { 'StartMint' : null } |
  { 'StartOwnershipVerification' : null };
export type MintStatus = {
    'Err' : { 'GenericError' : string } |
      { 'MintError' : string } |
      { 'ApprovalError' : string } |
      { 'InvalidTransfer' : string } |
      {
        'OwnershipNotVerified' : { 'RemoteError' : RemoteError } |
          { 'InvalidOwner' : null } |
          { 'TooManyRetries' : bigint }
      } |
      { 'MetadataError' : string } |
      { 'InvalidMetadata' : string }
  } |
  { 'Transferring' : null } |
  { 'Minting' : null } |
  { 'RetrievingMetadata' : { 'nextQuery' : bigint, 'retries' : bigint } } |
  {
    'Complete' : {
      'approvalTrx' : [] | [bigint],
      'mintTrx' : bigint,
      'approvalError' : [] | [string],
    }
  } |
  { 'CheckingOwner' : { 'nextQuery' : bigint, 'retries' : bigint } };
export type MultiSendRawTransactionResult = {
    'Consistent' : SendRawTransactionResult
  } |
  { 'Inconsistent' : Array<[RpcService, SendRawTransactionResult]> };
export type Network = { 'IC' : [] | [string] } |
  { 'Ethereum' : [] | [bigint] } |
  { 'Solana' : [] | [SolanaCluster] } |
  { 'Bitcoin' : [] | [string] } |
  { 'Other' : ICRC16Map };
export interface OrchestratorActor {
  'add_approved_wasm_hash' : ActorMethod<[Uint8Array | number[]], Result_1>,
  'calc_eth_call_cycles' : ActorMethod<[RpcServices, bigint, string], bigint>,
  'cast' : ActorMethod<[CastRequest], CastResult>,
  'configure' : ActorMethod<
    [Array<OrchestratorConfig>],
    Array<[] | [OrchestratorConfigResult]>
  >,
  'create_canister' : ActorMethod<
    [ContractPointer, CanisterDefaults, [] | [Account]],
    CreateCanisterResponse
  >,
  'create_remote' : ActorMethod<
    [ContractPointer, Network, bigint, bigint, bigint, [] | [Account]],
    CreateRemoteResponse
  >,
  'forceCkNFTCaniser' : ActorMethod<[ContractPointer, Principal], undefined>,
  'forceNonceForApprovalHash' : ActorMethod<
    [Principal, RemoteNFTPointer, Account, bigint],
    undefined
  >,
  'forceNonceForIcrc99Canister' : ActorMethod<
    [Principal, Network, bigint],
    undefined
  >,
  'get_approved_wasm_hashes' : ActorMethod<[], Array<Uint8Array | number[]>>,
  'get_cast_status' : ActorMethod<[Array<bigint>], Array<[] | [CastStatus]>>,
  'get_ck_nft_canister' : ActorMethod<
    [Array<ContractPointer>],
    Array<[] | [Principal]>
  >,
  'get_collection_name' : ActorMethod<
    [Array<RemoteNFTPointer>, [] | [Account]],
    Array<[] | [GetCallResult]>
  >,
  'get_collection_symbol' : ActorMethod<
    [Array<RemoteNFTPointer>, [] | [Account]],
    Array<[] | [GetCallResult]>
  >,
  'get_creation_cost' : ActorMethod<[ContractPointer], bigint>,
  'get_icrc99_address' : ActorMethod<[Principal, Network], [] | [string]>,
  'get_mint_cost' : ActorMethod<[Array<MintRequest>], Array<[] | [bigint]>>,
  'get_mint_status' : ActorMethod<[Array<bigint>], Array<[] | [MintStatus]>>,
  'get_remote' : ActorMethod<
    [Array<[Principal, Network]>],
    Array<[] | [ContractStateShared]>
  >,
  'get_remote_approval_address' : ActorMethod<
    [ApprovalAddressRequest, [] | [Account]],
    [] | [string]
  >,
  'get_remote_cost' : ActorMethod<[ContractPointer, Network], bigint>,
  'get_remote_meta' : ActorMethod<
    [Array<RemoteNFTPointer>, Array<bigint>, [] | [Account]],
    Array<[] | [GetCallResult]>
  >,
  'get_remote_owner' : ActorMethod<
    [Array<RemoteNFTPointer>, [] | [Account]],
    Array<[] | [GetCallResult]>
  >,
  'get_remote_status' : ActorMethod<
    [Array<bigint>],
    Array<[] | [ContractStateShared]>
  >,
  'get_stats' : ActorMethod<[], Stats>,
  'mint' : ActorMethod<[MintRequest, [] | [Account]], MintResult>,
  'register_ic_native_canister' : ActorMethod<[Principal], Result_1>,
  'remove_approved_wasm_hash' : ActorMethod<[Uint8Array | number[]], Result_1>,
  'send_balance' : ActorMethod<
    [Principal, bigint, string, Network, bigint, bigint, bigint],
    Result
  >,
  'system_upgrade' : ActorMethod<[], undefined>,
  'test_schnorr' : ActorMethod<[], string>,
  'upgrade_ckNFT_canister' : ActorMethod<[Principal], undefined>,
}
export type OrchestratorConfig = { 'SetEthTecdsaKeyName' : string } |
  { 'SetSolanaSchnorrKeyName' : string } |
  {
    'MapNetwork' : {
      'service' : FusionRPCService,
      'action' : { 'Add' : null } |
        { 'Remove' : null },
      'network' : Network,
    }
  };
export type OrchestratorConfigError = { 'GenericError' : string } |
  { 'Unauthorized' : null } |
  { 'MapNetwork' : { 'NotFound' : null } | { 'Exists' : null } };
export type OrchestratorConfigResult = { 'Ok' : bigint } |
  { 'Err' : OrchestratorConfigError };
export interface PropertyShared {
  'value' : CandyShared,
  'name' : string,
  'immutable' : boolean,
}
export type ProviderError = {
    'TooFewCycles' : { 'expected' : bigint, 'received' : bigint }
  } |
  { 'InvalidRpcConfig' : string } |
  { 'MissingRequiredProvider' : null } |
  { 'ProviderNotFound' : null } |
  { 'NoPermission' : null };
export type ProviderId = bigint;
export type RejectionCode = { 'NoError' : null } |
  { 'CanisterError' : null } |
  { 'SysTransient' : null } |
  { 'DestinationInvalid' : null } |
  { 'Unknown' : null } |
  { 'SysFatal' : null } |
  { 'CanisterReject' : null };
export type RemoteError = {
    'RPC' : { 'Ethereum' : RpcError } |
      {
        'Solana' : { 'NetworkError' : string } |
          { 'MetadataNotFound' : string } |
          { 'ParseError' : string } |
          { 'InvalidMint' : string } |
          { 'TokenAccountNotFound' : string }
      } |
      { 'EthereumMultiSend' : MultiSendRawTransactionResult }
  } |
  { 'GenericError' : string } |
  { 'NoCkNFTCanister' : null } |
  { 'InsufficientAllowance' : [bigint, bigint] } |
  { 'InsufficientBalance' : [bigint, bigint] } |
  { 'InsufficientCycles' : [bigint, bigint] } |
  { 'Unauthorized' : null } |
  { 'NetworkRCPNotFound' : null } |
  { 'NotImplemented' : null };
export interface RemoteNFTPointer {
  'tokenId' : bigint,
  'contract' : string,
  'network' : Network,
}
export type Result = { 'ok' : string } |
  { 'err' : RemoteError };
export type Result_1 = { 'ok' : null } |
  { 'err' : string };
export interface RpcApi { 'url' : string, 'headers' : [] | [Array<HttpHeader>] }
export type RpcError = { 'JsonRpcError' : JsonRpcError } |
  { 'ProviderError' : ProviderError } |
  { 'ValidationError' : ValidationError } |
  { 'HttpOutcallError' : HttpOutcallError };
export type RpcService = { 'EthSepolia' : EthSepoliaService } |
  { 'BaseMainnet' : L2MainnetService } |
  { 'Custom' : RpcApi } |
  { 'OptimismMainnet' : L2MainnetService } |
  { 'ArbitrumOne' : L2MainnetService } |
  { 'EthMainnet' : EthMainnetService } |
  { 'Provider' : ProviderId };
export type RpcServices = { 'EthSepolia' : [] | [Array<EthSepoliaService>] } |
  { 'BaseMainnet' : [] | [Array<L2MainnetService>] } |
  { 'Custom' : { 'chainId' : ChainId, 'services' : Array<RpcApi> } } |
  { 'OptimismMainnet' : [] | [Array<L2MainnetService>] } |
  { 'ArbitrumOne' : [] | [Array<L2MainnetService>] } |
  { 'EthMainnet' : [] | [Array<EthMainnetService>] };
export type SendRawTransactionResult = { 'Ok' : SendRawTransactionStatus } |
  { 'Err' : RpcError };
export type SendRawTransactionStatus = { 'Ok' : [] | [string] } |
  { 'NonceTooLow' : null } |
  { 'NonceTooHigh' : null } |
  { 'InsufficientFunds' : null };
export type SolanaCluster = { 'Mainnet' : null } |
  { 'Custom' : string } |
  { 'Testnet' : null } |
  { 'Devnet' : null };
export type SolanaRPCService = {
    'Custom' : { 'url' : string, 'headers' : [] | [Array<[string, string]>] }
  } |
  { 'Provider' : bigint };
export interface Stats {
  'tt' : Stats__1,
  'ckNFTCanisters' : Array<CkNFTCanisterStateShared>,
  'owner' : Principal,
  'networkMap' : Array<[Network, Array<FusionRPCService>]>,
  'contracts' : Array<ContractStateShared>,
}
export interface Stats__1 {
  'timers' : bigint,
  'maxExecutions' : bigint,
  'minAction' : [] | [ActionDetail],
  'cycles' : bigint,
  'nextActionId' : bigint,
  'nextTimer' : [] | [TimerId],
  'expectedExecutionTime' : [] | [Time],
  'lastExecutionTime' : Time,
}
export type Time = bigint;
export type TimerId = bigint;
export type ValidationError = { 'Custom' : string } |
  { 'InvalidHex' : string };
export interface _SERVICE extends OrchestratorActor {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
