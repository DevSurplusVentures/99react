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
export interface Action {
  'aSync' : [] | [bigint],
  'actionType' : string,
  'params' : Uint8Array | number[],
  'retries' : bigint,
}
export interface ActionId { 'id' : bigint, 'time' : Time }
export interface ActionResult {
  'id' : bigint,
  'actions' : Array<TokenSpecResult>,
}
export type Balance = bigint;
export interface Escrow {
  'target_intent_id' : [] | [bigint],
  'owner' : Account__1,
  'kind' : { 'intent' : Array<[] | [TokenSpec]> } |
    { 'settlement' : Array<[] | [TokenSpec]> },
  'counterparty' : [] | [Account__1],
  'lock_to_date' : [] | [bigint],
}
export interface GenericError { 'message' : string, 'error_code' : bigint }
export interface ICRC8IntentMarketplaceCanister {
  'hello' : ActorMethod<[], string>,
  'icrc8_balance_of' : ActorMethod<
    [[] | [Account__1], [] | [Escrow], [] | [bigint]],
    Array<Escrow>
  >,
  'icrc8_escrow_account' : ActorMethod<
    [Array<Escrow>],
    Array<{ 'tokens' : [] | [Array<TokenSpec>], 'account' : Account__1 }>
  >,
  'icrc8_manage_market' : ActorMethod<
    [Array<[] | [ManageMarketRequest]>],
    Array<[] | [ManageMarketResponse]>
  >,
  'icrc8_market_info' : ActorMethod<
    [[] | [Array<IntentFilter>], [] | [bigint], [] | [bigint]],
    Array<IntentStatus>
  >,
  'icrc8_metadata' : ActorMethod<
    [],
    Array<{ 'value' : Value__1, 'text' : string }>
  >,
  'icrc8_supported_tokens' : ActorMethod<[], [] | [Array<TokenSpec>]>,
  'icrc8_validate_intents' : ActorMethod<
    [Array<bigint>, Array<Array<IntentFeature>>],
    ValidateIntentsResponse
  >,
  'mint_fake_tokens' : ActorMethod<
    [Principal, Account, bigint],
    TransferResult
  >,
}
export type ICRCStandards = { 'ICRC1' : null } |
  { 'ICRC2' : null } |
  { 'ICRC4' : null } |
  { 'ICRC7' : null } |
  { 'ICRC37' : null } |
  { 'ICRC80' : [] | [Uint8Array | number[]] };
export interface InitArgList {
  'nextCycleActionId' : [] | [bigint],
  'maxExecutions' : [] | [bigint],
  'nextActionId' : bigint,
  'lastActionIdReported' : [] | [bigint],
  'lastCycleReport' : [] | [bigint],
  'initialTimers' : Array<[ActionId, Action]>,
  'expectedExecutionTime' : Time,
  'lastExecutionTime' : Time,
}
export type InitArgs = {};
export type IntentFeature = { 'allow_partial' : null } |
  { 'memo' : Uint8Array | number[] } |
  { 'created_at' : bigint } |
  { 'start_date' : bigint } |
  { 'allow_list' : Array<Account__1> } |
  { 'satisfying_tokens' : Array<Array<TokenSpec>> } |
  { 'intent_tokens' : Array<Escrow> } |
  { 'namespace' : string } |
  {
    'ending' : { 'date' : bigint } |
      { 'perpetual' : null } |
      { 'immediate' : null } |
      { 'timeout' : bigint }
  };
export type IntentFeatureStatus = { 'participants' : Array<Principal> } |
  { 'actions' : Array<TokenSpecResult> } |
  { 'allow_list' : Array<Principal> } |
  { 'escrow' : Array<Escrow> } |
  { 'namespace' : string };
export type IntentFilter = { 'participant_accounts' : Array<Account__1> } |
  { 'owner_accounts' : Array<Account__1> } |
  { 'statuses' : Array<IntentStatusType> } |
  { 'owner_principals' : Array<Principal> } |
  { 'satisfying_tokens' : Array<TokenSpec> } |
  { 'participant_principals' : Array<Principal> } |
  { 'intent_ids' : Array<bigint> } |
  { 'listed_tokens' : Array<TokenSpec> };
export interface IntentStatus {
  'status' : IntentStatusType,
  'original_config' : Array<[] | [IntentFeature]>,
  'owner' : Account__1,
  'feature_status' : Array<[] | [IntentFeatureStatus]>,
  'current_config' : [] | [Array<[] | [IntentFeature]>],
  'intent_id' : bigint,
  'settled_at' : [] | [[Principal, bigint]],
}
export type IntentStatusType = { 'pending' : null } |
  { 'fulfilled' : [] | [bigint] } |
  { 'open' : null } |
  { 'withdrawn_settling' : [] | [bigint] } |
  { 'error' : [] | [string] } |
  { 'settling' : null } |
  { 'withdrawn' : [] | [bigint] } |
  { 'encumbered' : [] | [Principal] };
export type Inventory = { 'tokenIds' : Array<bigint> } |
  { 'quantity' : bigint };
export type ManageMarketRequest = { 'withdraw_escrow' : Escrow } |
  {
    'execute_intent' : {
      'satisfying_intent' : Array<[] | [IntentFeature]>,
      'intent_ids' : Array<bigint>,
    }
  } |
  { 'distribute_intent' : bigint } |
  { 'withdraw_settlement' : Escrow } |
  { 'end_intent' : bigint } |
  { 'list_intent' : Array<[] | [IntentFeature]> };
export type ManageMarketResponse = {
    'withdraw_escrow' : { 'Ok' : ActionResult } |
      { 'Err' : GenericError }
  } |
  { 'execute_intent' : { 'Ok' : ActionResult } | { 'Err' : GenericError } } |
  { 'distribute_intent' : { 'Ok' : ActionResult } | { 'Err' : GenericError } } |
  {
    'withdraw_settlement' : { 'Ok' : ActionResult } |
      { 'Err' : GenericError }
  } |
  { 'end_intent' : { 'Ok' : ActionResult } | { 'Err' : GenericError } } |
  { 'list_intent' : { 'Ok' : ActionResult } | { 'Err' : GenericError } };
export type Subaccount = Uint8Array | number[];
export type Time = bigint;
export type Timestamp = bigint;
export type TokenMeta = { 'decimals' : bigint } |
  { 'transfer_from_fee' : bigint } |
  { 'transfer_fee' : bigint } |
  { 'standards' : Array<ICRCStandards> } |
  { 'external_fee' : TokenSpec } |
  { 'approval_fee' : bigint };
export interface TokenSpec {
  'token_pointer' : [] | [Uint8Array | number[]],
  'meta' : [] | [Array<TokenMeta>],
  'inventory' : [] | [Inventory],
  'canister' : Principal,
}
export interface TokenSpecResult {
  'token_pointer' : [] | [Uint8Array | number[]],
  'result' : { 'Ok' : Array<bigint> } |
    { 'Err' : string },
  'meta' : [] | [Array<TokenMeta>],
  'inventory' : [] | [Inventory],
  'receiving_account' : Account__1,
  'sending_account' : Account__1,
  'canister' : Principal,
  'namespace' : [] | [string],
  'intent_id' : [] | [bigint],
}
export type TransferError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'TemporarilyUnavailable' : null } |
  { 'BadBurn' : { 'min_burn_amount' : Balance } } |
  { 'Duplicate' : { 'duplicate_of' : TxIndex } } |
  { 'BadFee' : { 'expected_fee' : Balance } } |
  { 'CreatedInFuture' : { 'ledger_time' : Timestamp } } |
  { 'TooOld' : null } |
  { 'InsufficientFunds' : { 'balance' : Balance } };
export type TransferResult = { 'Ok' : TxIndex } |
  { 'Err' : TransferError };
export type TxIndex = bigint;
export type ValidateIntentsResponse = {
    'Ok' : {
        'execution' : { 'full' : Array<TokenSpecResult> } |
          { 'partial' : Array<TokenSpecResult> }
      } |
      {
        'temporary' : { 'full' : Array<TokenSpecResult> } |
          { 'partial' : Array<TokenSpecResult> }
      }
  } |
  { 'Error' : ValidationErrors };
export type ValidationErrors = { 'Generic' : string } |
  { 'NoExecution' : null };
export type Value__1 = { 'Map' : Array<[string, Value__1]> } |
  { 'Nat' : bigint } |
  { 'Blob' : Uint8Array | number[] } |
  { 'Text' : string } |
  { 'Array' : Array<Value__1> };
export interface _SERVICE extends ICRC8IntentMarketplaceCanister {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
