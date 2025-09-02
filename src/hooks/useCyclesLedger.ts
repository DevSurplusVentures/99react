import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAnonymousActor, useAuthenticatedActor } from './useActor';
import { useAuth } from './useAuth';
import { Principal } from '@dfinity/principal';

// Use the standard ICRC-1 Account format
export interface Account {
  owner: Principal;
  subaccount: [] | [Uint8Array];
}

export interface Allowance {
  allowance: bigint;
  expires_at?: bigint;
}

export interface AllowanceArgs {
  account: Account;
  spender: Account;
}

export interface ApproveArgs {
  spender: Account;
  amount: bigint;
  expires_at?: bigint;
  fee?: bigint;
  memo?: Uint8Array;
  created_at_time?: bigint;
}

export type ApproveResult = 
  | { Ok: bigint }  // Transaction index
  | { Err: any };

// Cycles Ledger IDL - minimal definition for balance and allowance
const cyclesLedgerIdl = ({ IDL }: any) => {
  const Account = IDL.Record({ 
    owner: IDL.Principal, 
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) 
  });
  
  const Allowance = IDL.Record({
    allowance: IDL.Nat,
    expires_at: IDL.Opt(IDL.Nat64),
  });
  
  const AllowanceArgs = IDL.Record({
    account: Account,
    spender: Account,
  });

  const ApproveArgs = IDL.Record({
    spender: Account,
    amount: IDL.Nat,
    expires_at: IDL.Opt(IDL.Nat64),
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });

  const ApproveError = IDL.Variant({
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
    Expired: IDL.Record({ ledger_time: IDL.Nat64 }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
  });

  const ApproveResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: ApproveError,
  });

  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
    icrc2_allowance: IDL.Func([AllowanceArgs], [Allowance], ['query']),
    icrc2_approve: IDL.Func([ApproveArgs], [ApproveResult], []),
    icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
    icrc1_symbol: IDL.Func([], [IDL.Text], ['query']),
    icrc1_name: IDL.Func([], [IDL.Text], ['query']),
  });
};

export interface CyclesLedgerActor {
  icrc1_balance_of: (account: Account) => Promise<bigint>;
  icrc2_allowance: (args: AllowanceArgs) => Promise<Allowance>;
  icrc2_approve: (args: ApproveArgs) => Promise<ApproveResult>;
  icrc1_decimals: () => Promise<number>;
  icrc1_symbol: () => Promise<string>;
  icrc1_name: () => Promise<string>;
}

// Default Cycles Ledger canister ID - this should be configurable
const CYCLES_LEDGER_CANISTER_ID = process.env.CYCLES_LEDGER_CANISTER_ID || 'um5iw-rqaaa-aaaaq-qaaba-cai';

/**
 * Hook for interacting with the Cycles Ledger
 */
export function useCyclesLedger() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const actor = useAnonymousActor<CyclesLedgerActor>(CYCLES_LEDGER_CANISTER_ID, cyclesLedgerIdl);
  const authenticatedActor = useAuthenticatedActor<CyclesLedgerActor>(CYCLES_LEDGER_CANISTER_ID, cyclesLedgerIdl);
  
  console.log('useCyclesLedger: Initializing', {
    user,
    principal: user?.principal?.toString(),
    canisterId: CYCLES_LEDGER_CANISTER_ID,
    actor: !!actor
  });
  
  const principal = user?.principal;
  
  /**
   * Get the cycles balance for the current user
   */
  const balanceQuery = useQuery({
    queryKey: ['cycles-balance', principal?.toString()],
    queryFn: async () => {
      console.log('useCyclesLedger: Starting balance query', {
        actor: !!actor,
        principal: principal?.toString(),
        canisterId: CYCLES_LEDGER_CANISTER_ID
      });
      
      if (!actor || !principal) {
        const error = new Error('Actor or principal not available');
        console.error('useCyclesLedger: Query failed', { actor: !!actor, principal: !!principal });
        throw error;
      }
      
      const account: Account = {
        owner: principal,
        subaccount: [], // Use empty array for default subaccount
      };
      
      console.log('useCyclesLedger: Calling icrc1_balance_of', account);
      
      try {
        const balance = await actor.icrc1_balance_of(account);
        console.log('useCyclesLedger: Balance result', balance);
        return balance;
      } catch (error) {
        console.error('useCyclesLedger: Balance query failed', error);
        throw error;
      }
    },
    enabled: !!actor && !!principal,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  /**
   * Get the allowance for a specific spender
   */
  const getAllowance = async (spender: Principal): Promise<Allowance | null> => {
    if (!actor || !principal) return null;
    
    try {
      const allowanceArgs: AllowanceArgs = {
        account: {
          owner: principal,
          subaccount: [],
        },
        spender: {
          owner: spender,
          subaccount: [],
        },
      };
      
      return await actor.icrc2_allowance(allowanceArgs);
    } catch (error) {
      console.error('Error getting allowance:', error);
      return null;
    }
  };

  /**
   * Get token information
   */
  const tokenInfoQuery = useQuery({
    queryKey: ['cycles-token-info'],
    queryFn: async () => {
      if (!actor) {
        throw new Error('Actor not available');
      }
      
      const [name, symbol, decimals] = await Promise.all([
        actor.icrc1_name(),
        actor.icrc1_symbol(),
        actor.icrc1_decimals(),
      ]);
      
      return { name, symbol, decimals };
    },
    enabled: !!actor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Format cycles amount for display
   */
  const formatCycles = (amount: bigint, decimals?: number): string => {
    const tokenDecimals = decimals ?? tokenInfoQuery.data?.decimals ?? 12;
    const divisor = BigInt(10 ** tokenDecimals);
    const whole = amount / divisor;
    const fraction = amount % divisor;
    
    if (fraction === BigInt(0)) {
      return whole.toString();
    }
    
    const fractionStr = fraction.toString().padStart(tokenDecimals, '0');
    const trimmed = fractionStr.replace(/0+$/, '');
    
    return `${whole}.${trimmed}`;
  };

  /**
   * Check if user has sufficient balance for a given amount
   */
  const hasSufficientBalance = (requiredAmount: bigint): boolean => {
    if (!balanceQuery.data) return false;
    return balanceQuery.data >= requiredAmount;
  };

  /**
   * Check if user has sufficient allowance for a spender and amount
   */
  const checkAllowance = async (spender: Principal, requiredAmount: bigint): Promise<boolean> => {
    const allowance = await getAllowance(spender);
    if (!allowance) return false;
    
    // Check if allowance has expired
    if (allowance.expires_at) {
      const now = BigInt(Date.now() * 1000000); // Convert to nanoseconds
      if (allowance.expires_at < now) return false;
    }
    
    return allowance.allowance >= requiredAmount;
  };

  /**
   * Approve a spender to spend cycles on behalf of the user
   */
  const approveMutation = useMutation({
    mutationFn: async (params: {
      spender: Principal;
      amount: bigint;
      expires_at?: bigint;
    }): Promise<ApproveResult> => {
      if (!authenticatedActor || !principal) {
        throw new Error('Authentication required for approve');
      }

      const approveArgs: ApproveArgs = {
        spender: {
          owner: params.spender,
          subaccount: [],
        },
        amount: params.amount,
        expires_at: params.expires_at,
        fee: undefined, // Let the ledger calculate the fee
        memo: undefined,
        created_at_time: undefined,
      };

      const result = await authenticatedActor.icrc2_approve(approveArgs);
      
      if ('Err' in result) {
        throw new Error(`Approval failed: ${JSON.stringify(result.Err)}`);
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate allowance-related queries
      queryClient.invalidateQueries({ queryKey: ['cycles-allowance'] });
    },
  });

  return {
    // Queries
    balance: balanceQuery.data,
    balanceQuery,
    tokenInfo: tokenInfoQuery.data,
    tokenInfoQuery,
    
    // Functions
    getAllowance,
    formatCycles,
    hasSufficientBalance,
    checkAllowance,
    
    // Mutations
    approveMutation,
    
    // Loading states
    isLoadingBalance: balanceQuery.isLoading,
    isLoadingTokenInfo: tokenInfoQuery.isLoading,
    isLoadingApprove: approveMutation.isPending,
    
    // Error states
    balanceError: balanceQuery.error,
    tokenInfoError: tokenInfoQuery.error,
    approveError: approveMutation.error,
  };
}

/**
 * Utility function to convert ICP to cycles (rough estimate)
 * This should be replaced with actual exchange rate from NNS
 */
export function icpToCycles(icpAmount: number): bigint {
  // Rough estimate: 1 ICP ≈ 1 trillion cycles
  // This should be replaced with real exchange rate
  const cyclesPerICP = BigInt(1_000_000_000_000); // 1T cycles
  const icpBigInt = BigInt(Math.floor(icpAmount * 100_000_000)); // ICP has 8 decimals
  return (icpBigInt * cyclesPerICP) / BigInt(100_000_000);
}

/**
 * Utility function to convert cycles to ICP (rough estimate)
 */
export function cyclesToICP(cyclesAmount: bigint): number {
  const cyclesPerICP = BigInt(1_000_000_000_000); // 1T cycles
  const icpBigInt = (cyclesAmount * BigInt(100_000_000)) / cyclesPerICP;
  return Number(icpBigInt) / 100_000_000;
}
