

/**
 * useFungibleToken
 * Enhanced hook for ICRC-1/ICRC-2 fungible tokens with balance, allowance, and approval functionality
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { useAnonAgent, useAuthenticatedAgent } from '../provider/AgentProvider';
import { useAuth } from './useAuth';

// ICRC-1/ICRC-2 Types
export interface Account {
  owner: Principal;
  subaccount: [] | [Uint8Array];
}

export interface AllowanceArgs {
  account: Account;
  spender: Account;
}

export interface Allowance {
  allowance: bigint;
  expires_at: [] | [bigint];
}

export interface ApproveArgs {
  fee: [] | [bigint];
  memo: [] | [Uint8Array];
  from_subaccount: [] | [Uint8Array];
  created_at_time: [] | [bigint];
  amount: bigint;
  expected_allowance: [] | [bigint];
  expires_at: [] | [bigint];
  spender: Account;
}

export type ApproveResult = 
  | { Ok: bigint }
  | { 
      Err: 
        | { BadFee: { expected_fee: bigint } }
        | { InsufficientFunds: { balance: bigint } }
        | { AllowanceChanged: { current_allowance: bigint } }
        | { Expired: { ledger_time: bigint } }
        | { TooOld: null }
        | { CreatedInFuture: { ledger_time: bigint } }
        | { Duplicate: { duplicate_of: bigint } }
        | { TemporarilyUnavailable: null }
        | { GenericError: { error_code: bigint; message: string } }
    };

// Enhanced IDL for ICRC-1/ICRC-2 tokens  

// Create the interface factory function that Actor.createActor expects
const icrcInterfaceFactory = ({ IDL }: { IDL: any }) => {
  const AccountType = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  const AllowanceArgsType = IDL.Record({
    account: AccountType,
    spender: AccountType,
  });

  const AllowanceType = IDL.Record({
    allowance: IDL.Nat,
    expires_at: IDL.Opt(IDL.Nat64),
  });

  const ApproveArgsType = IDL.Record({
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    amount: IDL.Nat,
    expected_allowance: IDL.Opt(IDL.Nat),
    expires_at: IDL.Opt(IDL.Nat64),
    spender: AccountType,
  });

  const ApproveResultType = IDL.Variant({
    Ok: IDL.Nat,
    Err: IDL.Variant({
      BadFee: IDL.Record({ expected_fee: IDL.Nat }),
      InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
      AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
      Expired: IDL.Record({ ledger_time: IDL.Nat64 }),
      TooOld: IDL.Null,
      CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
      Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
      TemporarilyUnavailable: IDL.Null,
      GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
    })
  });

  return IDL.Service({
    icrc1_symbol: IDL.Func([], [IDL.Text], ['query']),
    icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
    icrc1_fee: IDL.Func([], [IDL.Nat], ['query']),
    icrc1_name: IDL.Func([], [IDL.Text], ['query']),
    icrc1_balance_of: IDL.Func([AccountType], [IDL.Nat], ['query']),
    icrc2_allowance: IDL.Func([AllowanceArgsType], [AllowanceType], ['query']),
    icrc2_approve: IDL.Func([ApproveArgsType], [ApproveResultType], []),
  });
};

export interface FungibleTokenInfo {
  symbol: string;
  decimals: number;
  fee: bigint;
  name: string;
}

export interface FungibleTokenHookResult {
  data: FungibleTokenInfo | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  
  // Balance operations
  useBalance: (account?: Account) => {
    data: bigint | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
  
  // Allowance operations  
  useAllowance: (args?: AllowanceArgs) => {
    data: Allowance | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
  
  // Approve mutation - returns the actual UseMutationResult
  useApprove: () => {
    mutate: (args: ApproveArgs) => void;
    mutateAsync: (args: ApproveArgs) => Promise<void>;
    isPending: boolean;
    error: Error | null;
    isSuccess: boolean;
    reset: () => void;
  };
}

export const useFungibleToken = (canisterId: string | Principal): FungibleTokenHookResult => {
  const { user } = useAuth();
  const anonAgent = useAnonAgent();
  const queryClient = useQueryClient();
  
  const principalId = typeof canisterId === 'string' ? Principal.fromText(canisterId) : canisterId;
  
  // Token metadata query
  const tokenInfoQuery = useQuery({
    queryKey: ['fungible-token', principalId.toString()],
    queryFn: async () => {
      if (!anonAgent) throw new Error('Agent not available');
      
      const actor = Actor.createActor(icrcInterfaceFactory, {
        agent: anonAgent,
        canisterId: principalId,
      });

      const [symbol, decimals, fee, name] = await Promise.all([
        actor.icrc1_symbol(),
        actor.icrc1_decimals(),
        actor.icrc1_fee(),
        actor.icrc1_name(),
      ]);

      return {
        symbol: symbol as string,
        decimals: Number(decimals),
        fee: fee as bigint,
        name: name as string,
      };
    },
    enabled: !!anonAgent,
  });

  // Balance query hook
  const useBalance = (account?: Account) => {
    return useQuery({
      queryKey: ['fungible-token-balance', principalId.toString(), account?.owner.toString(), account?.subaccount],
      queryFn: async () => {
        if (!account || !anonAgent) return BigInt(0);
        
        const actor = Actor.createActor(icrcInterfaceFactory, {
          agent: anonAgent,
          canisterId: principalId,
        });

        const balance = await actor.icrc1_balance_of(account);
        return balance as bigint;
      },
      enabled: !!account && !!anonAgent,
    });
  };

  // Allowance query hook
  const useAllowance = (args?: AllowanceArgs) => {
    return useQuery({
      queryKey: ['fungible-token-allowance', principalId.toString(), args?.account.owner.toString(), args?.spender.owner.toString()],
      queryFn: async () => {
        if (!args || !anonAgent) throw new Error('Allowance args and agent required');
        
        const actor = Actor.createActor(icrcInterfaceFactory, {
          agent: anonAgent,
          canisterId: principalId,
        });

        const allowance = await actor.icrc2_allowance(args);
        return allowance as Allowance;
      },
      enabled: !!args && !!anonAgent,
    });
  };

  // Approve mutation hook
  const useApprove = () => {
    const authAgent = useAuthenticatedAgent(); // Get auth agent for mutations
    
    return useMutation({
      mutationFn: async (args: ApproveArgs) => {
        if (!user?.principal) {
          throw new Error('Must be authenticated to approve');
        }

        const actor = Actor.createActor(icrcInterfaceFactory, {
          agent: authAgent,
          canisterId: principalId,
        });

        const result = await actor.icrc2_approve(args) as ApproveResult;
        
        if ('Err' in result) {
          const error = result.Err;
          if ('BadFee' in error) {
            throw new Error(`Bad fee: expected ${error.BadFee.expected_fee}`);
          } else if ('InsufficientFunds' in error) {
            throw new Error(`Insufficient funds: balance ${error.InsufficientFunds.balance}`);
          } else if ('AllowanceChanged' in error) {
            throw new Error(`Allowance changed: current ${error.AllowanceChanged.current_allowance}`);
          } else if ('GenericError' in error) {
            throw new Error(`Generic error: ${error.GenericError.message}`);
          } else {
            throw new Error(`Approval failed: ${JSON.stringify(error)}`);
          }
        }
      },
      onSuccess: () => {
        // Invalidate related queries
        queryClient.invalidateQueries({ 
          queryKey: ['fungible-token-allowance', principalId.toString()] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['fungible-token-balance', principalId.toString()] 
        });
      },
    });
  };

  return {
    data: tokenInfoQuery.data,
    isLoading: tokenInfoQuery.isLoading,
    error: tokenInfoQuery.error,
    refetch: tokenInfoQuery.refetch,
    useBalance,
    useAllowance,
    useApprove,
  };
};
