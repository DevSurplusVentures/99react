export const idlFactory = ({ IDL }) => {
  const TokenSpec = IDL.Rec();
  const Value__1 = IDL.Rec();
  const Time = IDL.Nat;
  const ActionId = IDL.Record({ 'id' : IDL.Nat, 'time' : Time });
  const Action = IDL.Record({
    'aSync' : IDL.Opt(IDL.Nat),
    'actionType' : IDL.Text,
    'params' : IDL.Vec(IDL.Nat8),
    'retries' : IDL.Nat,
  });
  const InitArgList = IDL.Record({
    'nextCycleActionId' : IDL.Opt(IDL.Nat),
    'maxExecutions' : IDL.Opt(IDL.Nat),
    'nextActionId' : IDL.Nat,
    'lastActionIdReported' : IDL.Opt(IDL.Nat),
    'lastCycleReport' : IDL.Opt(IDL.Nat),
    'initialTimers' : IDL.Vec(IDL.Tuple(ActionId, Action)),
    'expectedExecutionTime' : Time,
    'lastExecutionTime' : Time,
  });
  const InitArgs = IDL.Record({});
  const Account__1 = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const ICRCStandards = IDL.Variant({
    'ICRC1' : IDL.Null,
    'ICRC2' : IDL.Null,
    'ICRC4' : IDL.Null,
    'ICRC7' : IDL.Null,
    'ICRC37' : IDL.Null,
    'ICRC80' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const TokenMeta = IDL.Variant({
    'decimals' : IDL.Nat,
    'transfer_from_fee' : IDL.Nat,
    'transfer_fee' : IDL.Nat,
    'standards' : IDL.Vec(ICRCStandards),
    'external_fee' : TokenSpec,
    'approval_fee' : IDL.Nat,
  });
  const Inventory = IDL.Variant({
    'tokenIds' : IDL.Vec(IDL.Nat),
    'quantity' : IDL.Nat,
  });
  TokenSpec.fill(
    IDL.Record({
      'token_pointer' : IDL.Opt(IDL.Vec(IDL.Nat8)),
      'meta' : IDL.Opt(IDL.Vec(TokenMeta)),
      'inventory' : IDL.Opt(Inventory),
      'canister' : IDL.Principal,
    })
  );
  const Escrow = IDL.Record({
    'target_intent_id' : IDL.Opt(IDL.Nat),
    'owner' : Account__1,
    'kind' : IDL.Variant({
      'intent' : IDL.Vec(IDL.Opt(TokenSpec)),
      'settlement' : IDL.Vec(IDL.Opt(TokenSpec)),
    }),
    'counterparty' : IDL.Opt(Account__1),
    'lock_to_date' : IDL.Opt(IDL.Nat),
  });
  const IntentFeature = IDL.Variant({
    'allow_partial' : IDL.Null,
    'memo' : IDL.Vec(IDL.Nat8),
    'created_at' : IDL.Nat,
    'start_date' : IDL.Nat,
    'allow_list' : IDL.Vec(Account__1),
    'satisfying_tokens' : IDL.Vec(IDL.Vec(TokenSpec)),
    'intent_tokens' : IDL.Vec(Escrow),
    'namespace' : IDL.Text,
    'ending' : IDL.Variant({
      'date' : IDL.Nat,
      'perpetual' : IDL.Null,
      'immediate' : IDL.Null,
      'timeout' : IDL.Nat,
    }),
  });
  const ManageMarketRequest = IDL.Variant({
    'withdraw_escrow' : Escrow,
    'execute_intent' : IDL.Record({
      'satisfying_intent' : IDL.Vec(IDL.Opt(IntentFeature)),
      'intent_ids' : IDL.Vec(IDL.Nat),
    }),
    'distribute_intent' : IDL.Nat,
    'withdraw_settlement' : Escrow,
    'end_intent' : IDL.Nat,
    'list_intent' : IDL.Vec(IDL.Opt(IntentFeature)),
  });
  const TokenSpecResult = IDL.Record({
    'token_pointer' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'result' : IDL.Variant({ 'Ok' : IDL.Vec(IDL.Nat), 'Err' : IDL.Text }),
    'meta' : IDL.Opt(IDL.Vec(TokenMeta)),
    'inventory' : IDL.Opt(Inventory),
    'receiving_account' : Account__1,
    'sending_account' : Account__1,
    'canister' : IDL.Principal,
    'namespace' : IDL.Opt(IDL.Text),
    'intent_id' : IDL.Opt(IDL.Nat),
  });
  const ActionResult = IDL.Record({
    'id' : IDL.Nat,
    'actions' : IDL.Vec(TokenSpecResult),
  });
  const GenericError = IDL.Record({
    'message' : IDL.Text,
    'error_code' : IDL.Nat,
  });
  const ManageMarketResponse = IDL.Variant({
    'withdraw_escrow' : IDL.Variant({
      'Ok' : ActionResult,
      'Err' : GenericError,
    }),
    'execute_intent' : IDL.Variant({
      'Ok' : ActionResult,
      'Err' : GenericError,
    }),
    'distribute_intent' : IDL.Variant({
      'Ok' : ActionResult,
      'Err' : GenericError,
    }),
    'withdraw_settlement' : IDL.Variant({
      'Ok' : ActionResult,
      'Err' : GenericError,
    }),
    'end_intent' : IDL.Variant({ 'Ok' : ActionResult, 'Err' : GenericError }),
    'list_intent' : IDL.Variant({ 'Ok' : ActionResult, 'Err' : GenericError }),
  });
  const IntentStatusType = IDL.Variant({
    'pending' : IDL.Null,
    'fulfilled' : IDL.Opt(IDL.Nat),
    'open' : IDL.Null,
    'withdrawn_settling' : IDL.Opt(IDL.Nat),
    'error' : IDL.Opt(IDL.Text),
    'settling' : IDL.Null,
    'withdrawn' : IDL.Opt(IDL.Nat),
    'encumbered' : IDL.Opt(IDL.Principal),
  });
  const IntentFilter = IDL.Variant({
    'participant_accounts' : IDL.Vec(Account__1),
    'owner_accounts' : IDL.Vec(Account__1),
    'statuses' : IDL.Vec(IntentStatusType),
    'owner_principals' : IDL.Vec(IDL.Principal),
    'satisfying_tokens' : IDL.Vec(TokenSpec),
    'participant_principals' : IDL.Vec(IDL.Principal),
    'intent_ids' : IDL.Vec(IDL.Nat),
    'listed_tokens' : IDL.Vec(TokenSpec),
  });
  const IntentFeatureStatus = IDL.Variant({
    'participants' : IDL.Vec(IDL.Principal),
    'actions' : IDL.Vec(TokenSpecResult),
    'allow_list' : IDL.Vec(IDL.Principal),
    'escrow' : IDL.Vec(Escrow),
    'namespace' : IDL.Text,
  });
  const IntentStatus = IDL.Record({
    'status' : IntentStatusType,
    'original_config' : IDL.Vec(IDL.Opt(IntentFeature)),
    'owner' : Account__1,
    'feature_status' : IDL.Vec(IDL.Opt(IntentFeatureStatus)),
    'current_config' : IDL.Opt(IDL.Vec(IDL.Opt(IntentFeature))),
    'intent_id' : IDL.Nat,
    'settled_at' : IDL.Opt(IDL.Tuple(IDL.Principal, IDL.Nat)),
  });
  Value__1.fill(
    IDL.Variant({
      'Map' : IDL.Vec(IDL.Tuple(IDL.Text, Value__1)),
      'Nat' : IDL.Nat,
      'Blob' : IDL.Vec(IDL.Nat8),
      'Text' : IDL.Text,
      'Array' : IDL.Vec(Value__1),
    })
  );
  const ValidationErrors = IDL.Variant({
    'Generic' : IDL.Text,
    'NoExecution' : IDL.Null,
  });
  const ValidateIntentsResponse = IDL.Variant({
    'Ok' : IDL.Variant({
      'execution' : IDL.Variant({
        'full' : IDL.Vec(TokenSpecResult),
        'partial' : IDL.Vec(TokenSpecResult),
      }),
      'temporary' : IDL.Variant({
        'full' : IDL.Vec(TokenSpecResult),
        'partial' : IDL.Vec(TokenSpecResult),
      }),
    }),
    'Error' : ValidationErrors,
  });
  const Subaccount = IDL.Vec(IDL.Nat8);
  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(Subaccount),
  });
  const TxIndex = IDL.Nat;
  const Balance = IDL.Nat;
  const Timestamp = IDL.Nat64;
  const TransferError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TemporarilyUnavailable' : IDL.Null,
    'BadBurn' : IDL.Record({ 'min_burn_amount' : Balance }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : TxIndex }),
    'BadFee' : IDL.Record({ 'expected_fee' : Balance }),
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : Timestamp }),
    'TooOld' : IDL.Null,
    'InsufficientFunds' : IDL.Record({ 'balance' : Balance }),
  });
  const TransferResult = IDL.Variant({ 'Ok' : TxIndex, 'Err' : TransferError });
  const ICRC8IntentMarketplaceCanister = IDL.Service({
    'hello' : IDL.Func([], [IDL.Text], []),
    'icrc8_balance_of' : IDL.Func(
        [IDL.Opt(Account__1), IDL.Opt(Escrow), IDL.Opt(IDL.Nat)],
        [IDL.Vec(Escrow)],
        ['query'],
      ),
    'icrc8_escrow_account' : IDL.Func(
        [IDL.Vec(Escrow)],
        [
          IDL.Vec(
            IDL.Record({
              'tokens' : IDL.Opt(IDL.Vec(TokenSpec)),
              'account' : Account__1,
            })
          ),
        ],
        ['query'],
      ),
    'icrc8_manage_market' : IDL.Func(
        [IDL.Vec(IDL.Opt(ManageMarketRequest))],
        [IDL.Vec(IDL.Opt(ManageMarketResponse))],
        [],
      ),
    'icrc8_market_info' : IDL.Func(
        [IDL.Opt(IDL.Vec(IntentFilter)), IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
        [IDL.Vec(IntentStatus)],
        ['query'],
      ),
    'icrc8_metadata' : IDL.Func(
        [],
        [IDL.Vec(IDL.Record({ 'value' : Value__1, 'text' : IDL.Text }))],
        ['query'],
      ),
    'icrc8_supported_tokens' : IDL.Func(
        [],
        [IDL.Opt(IDL.Vec(TokenSpec))],
        ['query'],
      ),
    'icrc8_validate_intents' : IDL.Func(
        [IDL.Vec(IDL.Nat), IDL.Vec(IDL.Vec(IntentFeature))],
        [ValidateIntentsResponse],
        ['query'],
      ),
    'mint_fake_tokens' : IDL.Func(
        [IDL.Principal, Account, IDL.Nat],
        [TransferResult],
        [],
      ),
  });
  return ICRC8IntentMarketplaceCanister;
};
export const init = ({ IDL }) => {
  const Time = IDL.Nat;
  const ActionId = IDL.Record({ 'id' : IDL.Nat, 'time' : Time });
  const Action = IDL.Record({
    'aSync' : IDL.Opt(IDL.Nat),
    'actionType' : IDL.Text,
    'params' : IDL.Vec(IDL.Nat8),
    'retries' : IDL.Nat,
  });
  const InitArgList = IDL.Record({
    'nextCycleActionId' : IDL.Opt(IDL.Nat),
    'maxExecutions' : IDL.Opt(IDL.Nat),
    'nextActionId' : IDL.Nat,
    'lastActionIdReported' : IDL.Opt(IDL.Nat),
    'lastCycleReport' : IDL.Opt(IDL.Nat),
    'initialTimers' : IDL.Vec(IDL.Tuple(ActionId, Action)),
    'expectedExecutionTime' : Time,
    'lastExecutionTime' : Time,
  });
  const InitArgs = IDL.Record({});
  return [
    IDL.Opt(
      IDL.Record({
        'ttArgs' : IDL.Opt(InitArgList),
        'icrc8intentmarketplaceArgs' : IDL.Opt(InitArgs),
      })
    ),
  ];
};
