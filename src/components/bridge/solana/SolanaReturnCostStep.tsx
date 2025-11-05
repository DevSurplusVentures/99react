import { useState, useEffect, useMemo } from 'react';
import { Principal } from '@dfinity/principal';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, SendOptions } from '@solana/web3.js';
import { Loader2, AlertCircle, CheckCircle2, Info, Wallet, AlertTriangle, Zap, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { use99Mutations } from '../../../hooks/use99Mutations';
import { useFungibleToken } from '../../../hooks/useFungibleToken';
import { useAuth } from '../../../hooks/useAuth';
// import { createSolanaNetwork } from '../../../types/solana';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory as ckNFTIdlFactory } from '../../../declarations/ckNFT/ckNFT.did.js';

// ============================================================================
// Shared Types (re-export for use in this component)
// ============================================================================

export interface SelectedICNFT {
  canisterId: string;
  tokenId: bigint;
  metadata: Array<[string, { Nat: bigint } | { Int: bigint } | { Text: string } | { Blob: Uint8Array }]>;
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface SolanaReturnCosts {
  // IC cycles costs for cast operation
  castCycleCost: bigint; // Cycles for calling icrc99_cast on ckNFT canister
  
  // Solana transaction costs
  solanaTransferFee: bigint; // SOL needed for transferring NFT from custody back to user
  castSignerFundingRequired: bigint; // SOL needed to fund the cast signer address
  totalSolCost: bigint; // Total SOL required
  
  // Cast signer address information
  castSignerAddress: string; // Solana address that will execute the cast
  castSignerBalance?: bigint; // Current balance of cast signer in lamports
  needsCastSignerFunding: boolean; // Whether cast signer needs funding
  
  // ckNFT information
  ckNFTCanisterId: Principal; // Source ckNFT canister on IC
  tokenId: bigint; // Token ID of the ckNFT being returned
  
  // Native chain information
  nativeChain?: { Solana: [{ Custom: string } | { Mainnet: null } | { Devnet: null } | { Testnet: null }] };
  nativeContract?: string; // Original Solana collection address
}

export interface SolanaReturnCostStepProps {
  selectedNFT: SelectedICNFT | null; // Single ckNFT for return
  costs: SolanaReturnCosts | null;
  onCostsCalculated: (costs: SolanaReturnCosts) => void;
  compact?: boolean;
  // Solana wallet connection state from parent
  isConnected?: boolean;
  walletPublicKey?: string | null;
  connection?: Connection | null;
  sendTransaction?: (transaction: Transaction, options?: SendOptions) => Promise<string>; // Match useSolana signature
  targetSolanaAddress?: string; // Where the user wants to receive the NFT on Solana
}

// ============================================================================
// Constants
// ============================================================================

const LAMPORTS_PER_SOL_CONST = BigInt(LAMPORTS_PER_SOL);

// Solana fee estimates (in lamports)
// Base transaction fee on Solana is 5000 lamports per signature
// This is the standard fee for all transactions on Solana
const TRANSFER_FEE_ESTIMATE = 5000n; // ~0.000005 SOL for transfer signature
// Fund cast signer with 0.01 SOL (10M lamports) to cover:
// - Base signature fee (5000 lamports)
// - Compute unit fees (1000-5000 lamports)
// - Priority fees (optional, varies on mainnet)
// - Multiple attempts if needed
const CAST_SIGNER_FUNDING_ESTIMATE = 10_000_000n; // ~0.01 SOL for cast signer rent + fees

// Cycles cost estimate for cast operation
// This should be queried from ckNFT canister via icrc99_cast_cost
const CAST_CYCLES_ESTIMATE = 2_500_000_000_000n; // 2.5T cycles (from PIC test)

// ============================================================================
// Main Component
// ============================================================================

export function SolanaReturnCostStep({
  selectedNFT,
  costs,
  onCostsCalculated,
  compact = false,
  isConnected,
  walletPublicKey: parentWalletPublicKey,
  connection: parentConnection,
  sendTransaction,
  targetSolanaAddress,
}: SolanaReturnCostStepProps) {
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculationStep, setCalculationStep] = useState<string>('');
  const [cyclesBalance, setCyclesBalance] = useState<bigint | null>(null);
  const [allowanceStatus, setAllowanceStatus] = useState<{
    amount: bigint;
    isExpired: boolean;
    isSufficient: boolean;
  } | null>(null);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [approvalInProgress, setApprovalInProgress] = useState(false);
  const [isFundingCastSigner, setIsFundingCastSigner] = useState(false);
  const [fundingTxSignature, setFundingTxSignature] = useState<string | null>(null);
  const [fundingError, setFundingError] = useState<string | null>(null);
  
  // ============================================================================
  // Hooks
  // ============================================================================
  
  const { user } = useAuth();
  const mutations = use99Mutations(
    process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai'
  );

  // Cycles ledger integration for balance and allowance tracking
  const CYCLES_LEDGER_CANISTER_ID = 
    process.env.CYCLES_LEDGER_CANISTER_ID || 'um5iw-rqaaa-aaaaq-qaaba-cai';
  const cyclesToken = useFungibleToken(CYCLES_LEDGER_CANISTER_ID);
  
  // Get user's cycles balance
  const userAccount = user?.principal ? {
    owner: typeof user.principal === 'string' 
      ? Principal.fromText(user.principal) 
      : user.principal,
    subaccount: [] as []
  } : undefined;
  
  const balanceQuery = cyclesToken.useBalance(userAccount);
  
  // CRITICAL: For cast operations, allowance is to the ckNFT CANISTER, not orchestrator
  // Build allowance query parameters for the ckNFT canister
  const allowanceParams = useMemo(() => {
    if (!user?.principal || !costs?.ckNFTCanisterId) return undefined;
    
    return {
      account: { owner: user.principal, subaccount: [] as [] },
      spender: { owner: costs.ckNFTCanisterId, subaccount: [] as [] }
    };
  }, [user?.principal, costs?.ckNFTCanisterId]);
  
  const allowanceQuery = cyclesToken.useAllowance(allowanceParams);

  // ============================================================================
  // Utility Functions
  // ============================================================================
  
  const formatCycles = (cycles: bigint): string => {
    const trillions = Number(cycles) / 1_000_000_000_000;
    return `${trillions.toFixed(2)} T`;
  };

  const formatSOL = (lamports: bigint): string => {
    const sol = Number(lamports) / Number(LAMPORTS_PER_SOL_CONST);
    return `${sol.toFixed(6)} SOL`;
  };

  // const hasSufficientCyclesBalance = (requiredAmount: bigint): boolean => {
  //   return cyclesBalance ? cyclesBalance >= requiredAmount : false;
  // };

  // ============================================================================
  // Track Cycles Balance and Allowance
  // ============================================================================
  
  useEffect(() => {
    if (balanceQuery.data !== undefined) {
      setCyclesBalance(balanceQuery.data);
    }
  }, [balanceQuery.data]);

  useEffect(() => {
    if (allowanceQuery.data && costs?.castCycleCost) {
      // Calculate expiry status
      const now = BigInt(Date.now() * 1000000);
      const isExpired = allowanceQuery.data.expires_at.length > 0 && allowanceQuery.data.expires_at[0] ? 
        allowanceQuery.data.expires_at[0] < now : false;
      
      const newAllowanceStatus = {
        amount: allowanceQuery.data.allowance,
        isExpired,
        isSufficient: allowanceQuery.data.allowance >= costs.castCycleCost,
      };
      
      setAllowanceStatus(newAllowanceStatus);
      
      // Auto-update payment approval status based on allowance
      const shouldBeApproved = newAllowanceStatus.isSufficient && !newAllowanceStatus.isExpired;
      setPaymentApproved(shouldBeApproved);
    }
  }, [allowanceQuery.data, costs?.castCycleCost]);

  // ============================================================================
  // Payment Approval Handler
  // ============================================================================
  
  const handleApprovePayment = async () => {
    if (!costs?.castCycleCost || !costs?.ckNFTCanisterId || !user?.principal) {
      setError('Missing required information for payment approval');
      return;
    }

    setApprovalInProgress(true);
    setError(null);

    try {
      console.log('🧮 Approving cycles payment for Solana return/cast:', {
        castCycleCost: costs.castCycleCost.toString(),
        ckNFTCanisterId: costs.ckNFTCanisterId.toString(),
        userPrincipal: user.principal.toString(),
      });

      // Check balance before approval
      if (cyclesBalance !== null && cyclesBalance < costs.castCycleCost) {
        throw new Error(
          `Insufficient cycles balance. You have ${formatCycles(cyclesBalance)} ` +
          `but need ${formatCycles(costs.castCycleCost)}. ` +
          `Please deposit more cycles to your account.`
        );
      }

      // CRITICAL: For cast operations, approve the ckNFT CANISTER, not orchestrator
      const ckNFTCanisterPrincipal = costs.ckNFTCanisterId;
      const expiryTime = BigInt(
        Date.now() * 1_000_000 + 24 * 60 * 60 * 1_000_000_000
      ); // 24 hours from now
      
      console.log('🔑 Approving cycles for ckNFT canister (NOT orchestrator):', ckNFTCanisterPrincipal.toString());
      
      // Approve cycles for the ckNFT canister to spend
      await mutations.cyclesApprove.mutateAsync({
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        amount: costs.castCycleCost,
        expected_allowance: [],
        expires_at: [expiryTime],
        spender: {
          owner: ckNFTCanisterPrincipal,
          subaccount: []
        }
      });

      console.log('✅ Cycles approval successful for Solana return/cast');
      setPaymentApproved(true);
      
      // Refresh allowance data
      await allowanceQuery.refetch();

    } catch (error) {
      console.error('❌ Error approving cycles payment:', error);
      let errorMessage = 'Failed to approve cycles payment';
      
      if (error instanceof Error) {
        if (error.message.includes('user rejected')) {
          errorMessage = 'Payment approval cancelled by user';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient cycles for approval transaction';
        } else if (error.message.includes('Insufficient cycles balance')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setApprovalInProgress(false);
    }
  };

  // ============================================================================
  // Cast Signer Funding Handler
  // ============================================================================
  
  const handleFundCastSigner = async () => {
    if (!costs?.castSignerAddress || !sendTransaction || !parentConnection || !parentWalletPublicKey || !isConnected) {
      setError('Missing required information for funding cast signer');
      return;
    }

    setIsFundingCastSigner(true);
    setFundingError(null);

    try {
      console.log('💰 Funding cast signer address:', {
        address: costs.castSignerAddress,
        amount: formatSOL(CAST_SIGNER_FUNDING_ESTIMATE),
        from: parentWalletPublicKey,
      });

      // Build transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(parentWalletPublicKey),
          toPubkey: new PublicKey(costs.castSignerAddress),
          lamports: Number(CAST_SIGNER_FUNDING_ESTIMATE),
        })
      );

      // Get recent blockhash
      const { blockhash } = await parentConnection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(parentWalletPublicKey);

      // Send transaction (sendTransaction from useSolana already has connection)
      const signature = await sendTransaction(transaction);
      console.log('📤 Transaction sent:', signature);

      // Wait for confirmation
      await parentConnection.confirmTransaction(signature, 'confirmed');
      console.log('✅ Transaction confirmed:', signature);

      setFundingTxSignature(signature);

      // Refresh cast signer balance
      const newBalance = await parentConnection.getBalance(
        new PublicKey(costs.castSignerAddress)
      );

      // Update costs with new balance
      onCostsCalculated({
        ...costs,
        castSignerBalance: BigInt(newBalance),
        needsCastSignerFunding: BigInt(newBalance) < CAST_SIGNER_FUNDING_ESTIMATE,
      });

      console.log('💰 Cast signer balance updated:', formatSOL(BigInt(newBalance)));

    } catch (err) {
      console.error('❌ Failed to fund cast signer:', err);
      let errorMessage = 'Failed to fund cast signer address';
      
      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          errorMessage = 'Funding transaction cancelled by user';
        } else {
          errorMessage = err.message;
        }
      }
      
      setFundingError(errorMessage);
    } finally {
      setIsFundingCastSigner(false);
    }
  };

  // ============================================================================
  // Cost Calculation
  // ============================================================================
  
  useEffect(() => {
    if (selectedNFT && !costs && !isCalculating) {
      calculateReturnCosts();
    }
  }, [selectedNFT, costs, targetSolanaAddress]);

  const calculateReturnCosts = async () => {
    if (!selectedNFT || !user?.principal) {
      setError('Missing required information for cost calculation');
      return;
    }

    if (!parentWalletPublicKey || !isConnected) {
      setError('Solana wallet must be connected for cost calculation');
      return;
    }

    if (!parentConnection) {
      setError('Solana connection not available');
      return;
    }

    if (!targetSolanaAddress) {
      setError('Target Solana address must be specified');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      console.log('🧮 Calculating return costs for ckNFT:', selectedNFT);

      // ============================================================================
      // STEP 1: Get native chain information from ckNFT canister
      // ============================================================================
      
      setCalculationStep('Querying native chain information from ckNFT canister...');
      
      const ckNFTCanisterId = Principal.fromText(selectedNFT.canisterId);
      const tokenId = BigInt(selectedNFT.tokenId);

      console.log('📖 Querying ckNFT canister:', {
        canisterId: ckNFTCanisterId.toString(),
        tokenId: tokenId.toString(),
      });

      // Create agent for querying ckNFT canister
      const agent = new HttpAgent({ 
        host: process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://icp0.io' 
      });
      
      if (process.env.NODE_ENV === 'development') {
        await agent.fetchRootKey();
      }

      // Create actor to query ckNFT canister
      const ckNFTActor = Actor.createActor(ckNFTIdlFactory, {
        agent,
        canisterId: ckNFTCanisterId,
      }) as any;

      // Query native chain information using icrc99_native_chain
      const nativeChainPointer = await ckNFTActor.icrc99_native_chain();
      
      if (!nativeChainPointer) {
        throw new Error('Failed to retrieve native chain information from ckNFT canister');
      }

      console.log('� Native chain pointer:', nativeChainPointer);

      // Extract network and contract from the RemoteContractPointer
      const nativeChain = nativeChainPointer.network;
      const nativeContract = nativeChainPointer.contract;

      if (!nativeChain) {
        throw new Error('Native chain network not found in RemoteContractPointer');
      }

      if (!nativeContract) {
        throw new Error(
          'Native contract address not found in RemoteContractPointer. ' +
          'This ckNFT may not be a wrapped Solana NFT.'
        );
      }

      console.log('✅ Native chain information:', { nativeChain, nativeContract });

      // ============================================================================
      // STEP 2: Query cast cost from ckNFT canister
      // ============================================================================
      
      setCalculationStep('Querying cast cost from ckNFT canister...');
      console.log('💰 Querying cast cost...');

      let castCycleCost = CAST_CYCLES_ESTIMATE;
      
      try {
        // Query icrc99_cast_cost from ckNFT canister
        const castCostResult = await ckNFTActor.icrc99_cast_cost({
          contract: nativeContract,
          network: nativeChain,
          tokenId: tokenId,
        });

        if (castCostResult) {
          castCycleCost = BigInt(castCostResult);
          console.log('✅ Cast cost from canister:', formatCycles(castCycleCost));
        }
      } catch (costError) {
        console.warn('⚠️ Failed to query cast cost, using estimate:', costError);
      }

      // ============================================================================
      // STEP 3: Get burn funding address (cast signer) from orchestrator
      // ============================================================================
      
      setCalculationStep('Getting burn funding address from orchestrator...');
      console.log('🔑 Getting burn funding address for cast operation...');

      let castSignerAddress: string | undefined = undefined;
      let castSignerBalance: bigint | undefined = undefined;
      
      try {
        // Query burn funding address from orchestrator (same pattern as EVM return)
        // This is the Solana address that will execute the cast operation
        // It needs SOL funding to pay for the transfer transaction fees
        const burnFundingResult = await mutations.getBurnFundingAddress.mutateAsync({
          ckNFTCanisterId,
          tokenId,
        });
        
        console.log('📋 Burn funding address result:', burnFundingResult);
        
        if (burnFundingResult) {
          castSignerAddress = burnFundingResult;
          console.log('✅ Burn funding address from orchestrator:', castSignerAddress);
        }
      } catch (signerError) {
        console.warn('⚠️ Failed to get burn funding address from orchestrator:', signerError);
      }

      if (!castSignerAddress) {
        throw new Error(
          'Failed to get burn funding address from orchestrator. ' +
          'This Solana address is required to execute the cast (return) operation.'
        );
      }

      // Now castSignerAddress is guaranteed to be defined - check balance
      try {
        const signerPubkey = new PublicKey(castSignerAddress);
        const balance = await parentConnection.getBalance(signerPubkey);
        castSignerBalance = BigInt(balance);
        console.log('💰 Cast signer balance:', formatSOL(castSignerBalance));
      } catch (balanceError) {
        console.warn('⚠️ Failed to get cast signer balance:', balanceError);
      }

      // ============================================================================
      // STEP 4: Calculate Solana costs
      // ============================================================================
      
      setCalculationStep('Calculating Solana transaction costs...');
      console.log('💰 Calculating Solana costs...');

      const solanaTransferFee = TRANSFER_FEE_ESTIMATE;
      
      // Determine if cast signer needs funding
      const minRequiredBalance = CAST_SIGNER_FUNDING_ESTIMATE;
      const needsCastSignerFunding = !castSignerBalance || castSignerBalance < minRequiredBalance;
      const castSignerFundingRequired = needsCastSignerFunding 
        ? minRequiredBalance - (castSignerBalance || 0n)
        : 0n;

      const totalSolCost = solanaTransferFee + castSignerFundingRequired;

      console.log('💰 SOL cost breakdown:', {
        transferFee: formatSOL(solanaTransferFee),
        castSignerFunding: formatSOL(castSignerFundingRequired),
        needsCastSignerFunding,
        totalCost: formatSOL(totalSolCost),
      });

      // ============================================================================
      // STEP 5: Return final costs
      // ============================================================================
      
      const finalCosts: SolanaReturnCosts = {
        castCycleCost,
        solanaTransferFee,
        castSignerFundingRequired,
        totalSolCost,
        castSignerAddress,
        castSignerBalance,
        needsCastSignerFunding,
        ckNFTCanisterId,
        tokenId,
        nativeChain,
        nativeContract,
      };

      console.log('✅ Final return costs calculated:', {
        castCycleCost: formatCycles(finalCosts.castCycleCost),
        totalSolCost: formatSOL(finalCosts.totalSolCost),
        needsCastSignerFunding: finalCosts.needsCastSignerFunding,
      });
      
      setCalculationStep('');
      onCostsCalculated(finalCosts);

    } catch (error) {
      console.error('❌ Error calculating return costs:', error);
      let errorMessage = 'Failed to calculate return costs';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setCalculationStep('');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    calculateReturnCosts();
  };

  // ============================================================================
  // Compact View
  // ============================================================================
  
  if (compact && costs) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
          <span className="text-sm font-medium text-green-800">Return costs calculated</span>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Full View Render
  // ============================================================================
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Calculate Return Costs</h3>
        <p className="text-gray-600">
          Review the costs for returning your ckNFT back to its original Solana chain.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={handleRetry}
                className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculation Loading */}
      {isCalculating && (
        <div className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-gray-600">Calculating return costs...</p>
          {calculationStep && (
            <p className="text-sm text-blue-600 mt-1 font-medium">
              {calculationStep}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            This may take a moment while we query the ckNFT canister and Solana network
          </p>
        </div>
      )}

      {/* Costs Display */}
      {costs && (
        <div className="space-y-4">
          {/* Important: Cast Approval Information */}
          <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-2">Cast Operation</h4>
                <p className="text-sm text-blue-800">
                  <strong>Important:</strong> For return operations, you approve the <strong>ckNFT canister</strong> 
                  (not the orchestrator) to spend cycles. The ckNFT canister will burn your ckNFT and trigger 
                  the transfer of the original NFT back to your Solana wallet.
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  ckNFT Canister: <span className="font-mono">{costs.ckNFTCanisterId.toString()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Cost Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* IC Cast Cost */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-blue-800">IC Cast Cost</span>
                <span className="text-blue-700 font-mono text-sm">
                  {formatCycles(costs.castCycleCost)}
                </span>
              </div>
              <p className="text-xs text-blue-600">
                Cycles for burning ckNFT and unlocking original NFT on Solana
              </p>
            </div>

            {/* Solana Transfer Cost */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-purple-800">Solana Costs</span>
                <span className="text-purple-700 font-mono text-sm">
                  {formatSOL(costs.totalSolCost)}
                </span>
              </div>
              <div className="text-xs text-purple-600 space-y-1">
                <div className="flex justify-between">
                  <span>Transfer Fee:</span>
                  <span className="font-mono">{formatSOL(costs.solanaTransferFee)}</span>
                </div>
                {costs.needsCastSignerFunding && (
                  <div className="flex justify-between">
                    <span>Cast Signer Funding:</span>
                    <span className="font-mono">{formatSOL(costs.castSignerFundingRequired)}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-purple-600 mt-2">
                SOL fees for executing the return transaction
              </p>
            </div>
          </div>

          {/* Cast Signer Information */}
          {costs.castSignerAddress && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3">Cast Signer Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Signer Address:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {costs.castSignerAddress.slice(0, 8)}...{costs.castSignerAddress.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Balance:</span>
                  <span className={clsx(
                    'font-mono text-xs',
                    costs.needsCastSignerFunding ? 'text-red-700' : 'text-green-700'
                  )}>
                    {costs.castSignerBalance !== undefined 
                      ? formatSOL(costs.castSignerBalance)
                      : 'Unknown'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Funding Status:</span>
                  <span className={clsx(
                    'font-medium text-xs',
                    costs.needsCastSignerFunding ? 'text-red-700' : 'text-green-700'
                  )}>
                    {costs.needsCastSignerFunding 
                      ? `Needs ${formatSOL(costs.castSignerFundingRequired)}` 
                      : 'Sufficient'
                    }
                  </span>
                </div>
              </div>
              
              {/* Cast Signer Funding Warning/Action */}
              {costs.needsCastSignerFunding && !fundingTxSignature && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800 mb-3">
                    The cast signer address needs {formatSOL(CAST_SIGNER_FUNDING_ESTIMATE)} SOL 
                    to execute the return transaction. You can pre-fund this address now to ensure 
                    the transaction will succeed.
                  </p>
                  <button
                    onClick={handleFundCastSigner}
                    disabled={isFundingCastSigner || !isConnected || !sendTransaction}
                    className={clsx(
                      "w-full px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      "flex items-center justify-center space-x-2",
                      isFundingCastSigner || !isConnected || !sendTransaction
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-yellow-600 text-white hover:bg-yellow-700"
                    )}
                  >
                    {isFundingCastSigner ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Funding...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Fund Cast Signer ({formatSOL(CAST_SIGNER_FUNDING_ESTIMATE)} SOL)</span>
                      </>
                    )}
                  </button>
                  {fundingError && (
                    <p className="mt-2 text-xs text-red-600">{fundingError}</p>
                  )}
                </div>
              )}
              
              {/* Funding Success Message */}
              {fundingTxSignature && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-green-800 font-medium mb-1">
                        ✅ Cast signer funded successfully!
                      </p>
                      <a
                        href={`https://explorer.solana.com/tx/${fundingTxSignature}?cluster=custom`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 underline break-all"
                      >
                        View transaction
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NFT Information */}
          {selectedNFT && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3">Selected ckNFT</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Token ID:</span>
                  <span className="font-mono text-gray-800 text-xs">{selectedNFT.tokenId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ckNFT Canister:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {selectedNFT.canisterId.slice(0, 8)}...{selectedNFT.canisterId.slice(-8)}
                  </span>
                </div>
                {costs.nativeContract && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Native Collection:</span>
                    <span className="font-mono text-gray-800 text-xs">
                      {costs.nativeContract.slice(0, 8)}...{costs.nativeContract.slice(-8)}
                    </span>
                  </div>
                )}
                {targetSolanaAddress && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Return To:</span>
                    <span className="font-mono text-gray-800 text-xs">
                      {targetSolanaAddress.slice(0, 8)}...{targetSolanaAddress.slice(-8)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Approval Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Cycles Payment Approval</h4>
            
            {/* Cycles Balance Information */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Wallet className="w-5 h-5 text-gray-600 mr-2" />
                  <h5 className="font-medium text-gray-900">Your Cycles Balance</h5>
                </div>
                {balanceQuery.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                ) : (
                  <span className={clsx(
                    'font-medium',
                    cyclesBalance !== null && cyclesBalance >= costs.castCycleCost
                      ? 'text-green-600'
                      : 'text-red-600'
                  )}>
                    {cyclesBalance !== null ? formatCycles(cyclesBalance) : 'Unknown'}
                  </span>
                )}
              </div>
              
              {cyclesBalance !== null && (
                <div className="text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-600">Required:</span>
                    <span className="text-gray-900">{formatCycles(costs.castCycleCost)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Remaining after return:</span>
                    <span className={clsx(
                      'font-medium',
                      cyclesBalance >= costs.castCycleCost ? 'text-green-600' : 'text-red-600'
                    )}>
                      {cyclesBalance >= costs.castCycleCost 
                        ? formatCycles(cyclesBalance - costs.castCycleCost)
                        : 'Insufficient Balance'
                      }
                    </span>
                  </div>
                </div>
              )}
              
              {cyclesBalance !== null && cyclesBalance < costs.castCycleCost && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">
                    ⚠️ Insufficient cycles balance. Please deposit{' '}
                    {formatCycles(costs.castCycleCost - cyclesBalance)} more.
                  </p>
                </div>
              )}
            </div>

            {/* Current Allowance Status */}
            {allowanceStatus && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-blue-600 mr-2" />
                    <h5 className="font-medium text-blue-900">Current Allowance (to ckNFT Canister)</h5>
                  </div>
                  <span className={clsx(
                    'font-medium',
                    allowanceStatus.isSufficient && !allowanceStatus.isExpired 
                      ? 'text-green-600' 
                      : 'text-orange-600'
                  )}>
                    {formatCycles(allowanceStatus.amount)}
                  </span>
                </div>
                
                <div className="text-sm space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-600">Status:</span>
                    <span className={clsx(
                      'font-medium',
                      allowanceStatus.isSufficient && !allowanceStatus.isExpired 
                        ? 'text-green-600' 
                        : 'text-orange-600'
                    )}>
                      {allowanceStatus.isExpired 
                        ? 'Expired' 
                        : allowanceStatus.isSufficient 
                          ? 'Sufficient' 
                          : 'Insufficient'
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Approval Button or Success */}
            {paymentApproved ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Payment Approved</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Cycles approved for cast operation. You can now proceed with the return.
                </p>
              </div>
            ) : (
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h5 className="font-medium text-gray-900">Approve Cycles Payment to ckNFT Canister</h5>
                    <p className="text-sm text-gray-600">
                      Authorize the ckNFT canister to use {formatCycles(costs.castCycleCost)} for this return
                    </p>
                  </div>
                  <button
                    onClick={handleApprovePayment}
                    disabled={
                      approvalInProgress || 
                      balanceQuery.isLoading || 
                      (cyclesBalance !== null && cyclesBalance < costs.castCycleCost)
                    }
                    className={clsx(
                      'px-6 py-2 rounded-md font-medium transition-colors whitespace-nowrap',
                      approvalInProgress || 
                      balanceQuery.isLoading || 
                      (cyclesBalance !== null && cyclesBalance < costs.castCycleCost)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    )}
                  >
                    {approvalInProgress ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Approving...
                      </div>
                    ) : (
                      'Approve Payment'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ready to Proceed */}
          {paymentApproved && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h5 className="font-medium text-green-900">Ready to Proceed</h5>
                  <p className="text-sm text-green-600">
                    Costs calculated and payment approved. Go to the Return tab to execute the cast operation.
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
          )}

          {/* Return Process Note */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 mr-2 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-800">
                  <strong>Return Process:</strong> The ckNFT canister will burn your ckNFT on IC and 
                  transfer the original NFT from custody back to your Solana wallet. This operation is 
                  irreversible and the ckNFT will be destroyed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
