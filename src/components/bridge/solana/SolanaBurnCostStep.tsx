import { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { Connection, PublicKey } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { Loader2, AlertCircle, CheckCircle, Wallet, Clock, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { use99Mutations, useOrchestratorAllowance } from '../../../hooks/use99Mutations';
import { useFungibleToken } from '../../../hooks/useFungibleToken';
import { useAuth } from '../../../hooks/useAuth';
import type { SelectedSolanaBurnNFT } from '../SolanaBurnNFTSelectionStep';
import { createSolanaNetwork } from '../../../types/solana';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SolanaBurnCosts {
  // SOL costs for Solana blockchain operations
  solTransferFee: bigint; // SOL needed for NFT transfer to approval address
  solAtaCreationFee: bigint; // SOL needed for creating associated token account (if needed)
  totalSolCost: bigint; // Total SOL required (transfer + ATA creation)
  
  // IC cycles costs for orchestrator operations
  icMintCost: bigint; // Cycles for calling orchestrator.mint()
  
  // Approval address where NFT must be sent
  approvalAddress: string; // Solana address derived from user account + NFT pointer
  
  // User balance information
  userSolBalance?: bigint; // User's SOL balance in lamports
  hasInsufficientSolBalance?: boolean; // Whether user has enough SOL
  
  // ckNFT canister information
  ckNFTCanisterId: Principal; // Destination ckNFT canister on IC
  
  // NFT mint address
  nftMintAddress: string; // Solana NFT mint address (SPL Token)
}

export interface SolanaBurnCostStepProps {
  selectedNFT: SelectedSolanaBurnNFT | null; // Single NFT for burn (not batch)
  costs: SolanaBurnCosts | null;
  onCostsCalculated: (costs: SolanaBurnCosts) => void;
  compact?: boolean;
  // Solana wallet connection state from parent
  isConnected?: boolean;
  walletPublicKey?: string | null;
  connection?: Connection | null;
}

// ============================================================================
// Constants
// ============================================================================

const LAMPORTS_PER_SOL = 1_000_000_000n;

// Solana fee estimates (in lamports)
const TRANSFER_FEE_ESTIMATE = 5000n; // ~0.000005 SOL for transfer signature
const ATA_CREATION_FEE_ESTIMATE = 2_040_000n; // ~0.00204 SOL for rent-exempt ATA

// Cycles cost estimate for mint operation (from PIC test analysis)
// This should be queried from orchestrator, but we use an estimate for now
const MINT_CYCLES_ESTIMATE = 100_000_000_000n; // 100B cycles (~0.1T cycles)

// ============================================================================
// Main Component
// ============================================================================

export function SolanaBurnCostStep({
  selectedNFT,
  costs,
  onCostsCalculated,
  compact = false,
  isConnected,
  walletPublicKey: parentWalletPublicKey,
  connection: parentConnection,
}: SolanaBurnCostStepProps) {
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
  
  // Get current allowance for the orchestrator
  const allowanceQuery = useOrchestratorAllowance(costs?.icMintCost);

  // ============================================================================
  // Utility Functions
  // ============================================================================
  
  const formatCycles = (cycles: bigint): string => {
    const trillions = Number(cycles) / 1_000_000_000_000;
    return `${trillions.toFixed(2)} T`;
  };

  const formatSOL = (lamports: bigint): string => {
    const sol = Number(lamports) / Number(LAMPORTS_PER_SOL);
    return `${sol.toFixed(6)} SOL`;
  };

  const hasSufficientCyclesBalance = (requiredAmount: bigint): boolean => {
    return cyclesBalance ? cyclesBalance >= requiredAmount : false;
  };

  // ============================================================================
  // Track Cycles Balance and Allowance
  // ============================================================================
  
  useEffect(() => {
    if (balanceQuery.data !== undefined) {
      setCyclesBalance(balanceQuery.data);
    }
  }, [balanceQuery.data]);

  useEffect(() => {
    if (allowanceQuery.data && costs?.icMintCost) {
      const newAllowanceStatus = {
        amount: allowanceQuery.data.allowance,
        isExpired: allowanceQuery.data.isExpired,
        isSufficient: allowanceQuery.data.allowance >= costs.icMintCost,
      };
      
      setAllowanceStatus(newAllowanceStatus);
      
      // Auto-update payment approval status based on allowance
      const shouldBeApproved = newAllowanceStatus.isSufficient && !newAllowanceStatus.isExpired;
      setPaymentApproved(shouldBeApproved);
    }
  }, [allowanceQuery.data, costs?.icMintCost]);

  // ============================================================================
  // Payment Approval Handler
  // ============================================================================
  
  const handleApprovePayment = async () => {
    if (!costs?.icMintCost || !user?.principal) {
      setError('Missing required information for payment approval');
      return;
    }

    setApprovalInProgress(true);
    setError(null);

    try {
      console.log('🧮 Approving cycles payment for Solana burn:', {
        icMintCost: costs.icMintCost.toString(),
        userPrincipal: user.principal.toString(),
      });

      // Check balance before approval
      if (cyclesBalance !== null && cyclesBalance < costs.icMintCost) {
        throw new Error(
          `Insufficient cycles balance. You have ${formatCycles(cyclesBalance)} ` +
          `but need ${formatCycles(costs.icMintCost)}. ` +
          `Please deposit more cycles to your account.`
        );
      }

      // Create the approval transaction
      const orchestratorPrincipal = Principal.fromText(
        process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai'
      );
      const expiryTime = BigInt(
        Date.now() * 1_000_000 + 24 * 60 * 60 * 1_000_000_000
      ); // 24 hours from now
      
      // Approve cycles for the orchestrator to spend
      await mutations.cyclesApprove.mutateAsync({
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        amount: costs.icMintCost,
        expected_allowance: [],
        expires_at: [expiryTime],
        spender: {
          owner: orchestratorPrincipal,
          subaccount: []
        }
      });

      console.log('✅ Cycles approval successful for Solana burn');
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
  // Cost Calculation
  // ============================================================================
  
  useEffect(() => {
    if (selectedNFT && !costs && !isCalculating) {
      calculateBurnCosts();
    }
  }, [selectedNFT, costs]);

  const calculateBurnCosts = async () => {
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

    setIsCalculating(true);
    setError(null);

    try {
      console.log('🧮 Calculating burn costs for Solana NFT:', selectedNFT);

      // ============================================================================
      // STEP 1: Find the ckNFT canister for this Solana collection
      // ============================================================================
      
      setCalculationStep('Finding ckNFT canister for Solana collection...');
      
      const contractPointer = {
        contract: selectedNFT.collectionAddress,
        network: createSolanaNetwork(selectedNFT.cluster),
      };

      console.log('🔍 Looking for ckNFT canister with contract pointer:', contractPointer);
      
      const existingCanisters = await mutations.getCkNFTCanister.mutateAsync([contractPointer]);
      
      if (!existingCanisters || existingCanisters.length === 0 || !existingCanisters[0]) {
        throw new Error(
          `No ckNFT canister found for Solana collection ${selectedNFT.collectionAddress}. ` +
          `This collection needs to be imported first using the Import wizard. ` +
          `Go to the Import tab to create a ckNFT canister for this collection before burning NFTs.`
        );
      }

      const ckNFTCanister = existingCanisters[0];
      console.log('✅ Found ckNFT canister:', ckNFTCanister.toString());

      // ============================================================================
      // STEP 2: Get approval address for this NFT + user account
      // ============================================================================
      
      setCalculationStep('Getting approval address for burn operation...');
      console.log('🔑 Getting approval address...');
      
      // Convert Solana NFT mint address to Nat for tokenId
      // The mint address is the unique identifier for this NFT on Solana
      const mintAddressBytes = new PublicKey(selectedNFT.mintAddress).toBytes();
      let nftMintAsNat = 0n;
      for (let i = 0; i < mintAddressBytes.length; i++) {
        nftMintAsNat = (nftMintAsNat << 8n) | BigInt(mintAddressBytes[i]);
      }
      
      console.log('🔢 Converting NFT mint to tokenId for approval address...');
      console.log('   NFT mint address:', selectedNFT.mintAddress);
      console.log('   As Nat tokenId:', nftMintAsNat);
      
      const approvalAddressRequest = {
        account: {
          owner: typeof user.principal === 'string' 
            ? Principal.fromText(user.principal) 
            : user.principal!,
          subaccount: [] as []
        },
        remoteNFTPointer: {
          tokenId: nftMintAsNat,
          contract: selectedNFT.collectionAddress,
          network: createSolanaNetwork(selectedNFT.cluster),
        },
      };
      
      const approvalAddress = await mutations.getApprovalAddress.mutateAsync({
        request: approvalAddressRequest
      });

      if (!approvalAddress) {
        throw new Error('Failed to get approval address for burn operation');
      }

      console.log('✅ Got approval address for burn:', approvalAddress);

      // ============================================================================
      // STEP 3: Calculate Solana transfer costs
      // ============================================================================
      
      setCalculationStep('Calculating SOL transfer costs...');
      console.log('💰 Calculating SOL transfer costs...');

      // Check if approval address already has an associated token account for this NFT
      const userWalletPubkey = new PublicKey(parentWalletPublicKey);
      const nftMintPubkey = new PublicKey(selectedNFT.mintAddress);
      const approvalAddressPubkey = new PublicKey(approvalAddress);

      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        nftMintPubkey,
        userWalletPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Get approval address's token account
      const approvalTokenAccount = await getAssociatedTokenAddress(
        nftMintPubkey,
        approvalAddressPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Check if approval address token account exists
      const approvalAccountInfo = await parentConnection.getAccountInfo(approvalTokenAccount);
      const needsAtaCreation = !approvalAccountInfo;

      console.log('📦 Token account analysis:', {
        userTokenAccount: userTokenAccount.toBase58(),
        approvalTokenAccount: approvalTokenAccount.toBase58(),
        approvalAccountExists: !!approvalAccountInfo,
        needsAtaCreation,
      });

      // Calculate fees
      const solTransferFee = TRANSFER_FEE_ESTIMATE;
      const solAtaCreationFee = needsAtaCreation ? ATA_CREATION_FEE_ESTIMATE : 0n;
      const totalSolCost = solTransferFee + solAtaCreationFee;

      console.log('💰 SOL cost breakdown:', {
        transferFee: formatSOL(solTransferFee),
        ataCreationFee: formatSOL(solAtaCreationFee),
        totalCost: formatSOL(totalSolCost),
      });

      // ============================================================================
      // STEP 4: Get user's SOL balance
      // ============================================================================
      
      setCalculationStep('Checking SOL balance...');
      console.log('💰 Checking user SOL balance...');

      const userSolBalance = BigInt(
        await parentConnection.getBalance(userWalletPubkey)
      );
      const hasInsufficientSolBalance = userSolBalance < totalSolCost;

      console.log('💰 User SOL balance check:', {
        userAddress: parentWalletPublicKey,
        userBalance: formatSOL(userSolBalance),
        requiredForTransfer: formatSOL(totalSolCost),
        hasSufficientBalance: !hasInsufficientSolBalance,
      });

      // ============================================================================
      // STEP 5: Calculate IC mint cost
      // ============================================================================
      
      setCalculationStep('Calculating IC mint cost...');
      console.log('💰 Calculating IC mint cost...');

      // TODO: Query actual mint cost from orchestrator
      // For now, use estimate
      const icMintCost = MINT_CYCLES_ESTIMATE;

      console.log('✅ IC mint cost estimated:', formatCycles(icMintCost));

      // ============================================================================
      // STEP 6: Return final costs
      // ============================================================================
      
      const finalCosts: SolanaBurnCosts = {
        solTransferFee,
        solAtaCreationFee,
        totalSolCost,
        icMintCost,
        approvalAddress,
        userSolBalance,
        hasInsufficientSolBalance,
        ckNFTCanisterId: ckNFTCanister,
        nftMintAddress: selectedNFT.mintAddress,
      };

      console.log('✅ Final burn costs calculated:', {
        totalSolCost: formatSOL(finalCosts.totalSolCost),
        icMintCost: formatCycles(finalCosts.icMintCost),
        approvalAddress: finalCosts.approvalAddress,
        hasInsufficientSolBalance: finalCosts.hasInsufficientSolBalance,
      });
      
      setCalculationStep('');
      onCostsCalculated(finalCosts);

    } catch (error) {
      console.error('❌ Error calculating burn costs:', error);
      let errorMessage = 'Failed to calculate burn costs';
      
      if (error instanceof Error) {
        if (error.message.includes('user rejected')) {
          errorMessage = 'Cost calculation cancelled by user';
        } else if (error.message.includes('No ckNFT canister found')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setCalculationStep('');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    calculateBurnCosts();
  };

  // ============================================================================
  // Compact View
  // ============================================================================
  
  if (compact && costs) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
          <span className="text-sm font-medium text-green-800">Burn costs calculated</span>
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Calculate Burn Costs</h3>
        <p className="text-gray-600">
          Review the costs for returning your Solana NFT back to the Internet Computer.
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
          <p className="text-gray-600">Calculating burn costs...</p>
          {calculationStep && (
            <p className="text-sm text-blue-600 mt-1 font-medium">
              {calculationStep}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            This may take a moment while we query the orchestrator and Solana network
          </p>
        </div>
      )}

      {/* Costs Display */}
      {costs && (
        <div className="space-y-4">
          {/* Cost Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SOL Transfer Cost */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-purple-800">SOL Transfer Cost</span>
                <span className="text-purple-700 font-mono text-sm">
                  {formatSOL(costs.totalSolCost)}
                </span>
              </div>
              <div className="text-xs text-purple-600 space-y-1">
                <div className="flex justify-between">
                  <span>Transfer Fee:</span>
                  <span className="font-mono">{formatSOL(costs.solTransferFee)}</span>
                </div>
                {costs.solAtaCreationFee > 0n && (
                  <div className="flex justify-between">
                    <span>ATA Creation:</span>
                    <span className="font-mono">{formatSOL(costs.solAtaCreationFee)}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-purple-600 mt-2">
                SOL fees for transferring NFT to approval address
              </p>
            </div>

            {/* IC Mint Cost */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-blue-800">IC Mint Cost</span>
                <span className="text-blue-700 font-mono text-sm">
                  {formatCycles(costs.icMintCost)}
                </span>
              </div>
              <p className="text-xs text-blue-600">
                Cycles for reminting ckNFT on Internet Computer
              </p>
            </div>

            {/* User SOL Balance */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-green-800">Your SOL Balance</span>
                <div className="text-right">
                  {costs.userSolBalance !== undefined ? (
                    <span className={clsx(
                      'font-mono text-sm block',
                      !costs.hasInsufficientSolBalance
                        ? 'text-green-700'
                        : 'text-red-700'
                    )}>
                      {formatSOL(costs.userSolBalance)}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm">Unknown</span>
                  )}
                </div>
              </div>
              <div className="text-xs">
                <div className="text-green-600 mb-1">
                  Address: {parentWalletPublicKey?.slice(0, 4)}...{parentWalletPublicKey?.slice(-4)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-600">Status:</span>
                  {costs.userSolBalance !== undefined ? (
                    <span className={clsx(
                      'font-medium',
                      !costs.hasInsufficientSolBalance
                        ? 'text-green-600'
                        : 'text-red-600'
                    )}>
                      {!costs.hasInsufficientSolBalance
                        ? 'Sufficient'
                        : 'Insufficient'
                      }
                    </span>
                  ) : (
                    <span className="text-gray-500">Checking...</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Insufficient SOL Balance Warning */}
          {costs.hasInsufficientSolBalance && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="font-medium text-red-800">Insufficient SOL for Transfer Fees</span>
              </div>
              <p className="text-sm text-red-700">
                You need {formatSOL(costs.totalSolCost)} SOL for transfer fees but only have{' '}
                {costs.userSolBalance ? formatSOL(costs.userSolBalance) : '0 SOL'}.
                <br />
                <span className="text-xs text-red-600 font-mono block mt-1">
                  Your Address: {parentWalletPublicKey}
                </span>
                <br />
                Please deposit{' '}
                {costs.userSolBalance 
                  ? formatSOL(costs.totalSolCost - costs.userSolBalance) 
                  : formatSOL(costs.totalSolCost)
                }{' '}
                SOL to your wallet before proceeding.
              </p>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => navigator.clipboard.writeText(parentWalletPublicKey || '')}
                  className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                >
                  Copy Your Address
                </button>
                <button
                  onClick={() => handleRetry()}
                  className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                >
                  Refresh Balance
                </button>
              </div>
            </div>
          )}

          {/* NFT Information */}
          {selectedNFT && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3">Selected NFT</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-800">
                    {selectedNFT.name || 'Unknown NFT'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Collection:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {selectedNFT.collectionAddress.slice(0, 4)}...
                    {selectedNFT.collectionAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mint Address:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {selectedNFT.mintAddress.slice(0, 4)}...
                    {selectedNFT.mintAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ckNFT Canister:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {costs.ckNFTCanisterId.toString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Approval Address:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {costs.approvalAddress.slice(0, 4)}...
                    {costs.approvalAddress.slice(-4)}
                  </span>
                </div>
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
                    cyclesBalance !== null && cyclesBalance >= costs.icMintCost
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
                    <span className="text-gray-900">{formatCycles(costs.icMintCost)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Remaining after burn:</span>
                    <span className={clsx(
                      'font-medium',
                      cyclesBalance >= costs.icMintCost ? 'text-green-600' : 'text-red-600'
                    )}>
                      {cyclesBalance >= costs.icMintCost 
                        ? formatCycles(cyclesBalance - costs.icMintCost)
                        : 'Insufficient Balance'
                      }
                    </span>
                  </div>
                </div>
              )}
              
              {cyclesBalance !== null && cyclesBalance < costs.icMintCost && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">
                    ⚠️ Insufficient cycles balance. Please deposit{' '}
                    {formatCycles(costs.icMintCost - cyclesBalance)} more.
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
                    <h5 className="font-medium text-blue-900">Current Allowance</h5>
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
                  {allowanceStatus.isExpired && (
                    <p className="text-orange-700 text-xs">
                      Your previous allowance has expired. A new approval is required.
                    </p>
                  )}
                  {!allowanceStatus.isSufficient && !allowanceStatus.isExpired && (
                    <p className="text-orange-700 text-xs">
                      Your current allowance is insufficient for this burn operation.
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Approval Button or Success */}
            {paymentApproved ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Payment Approved</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Cycles approved for burn operation. You can now proceed with the burn.
                </p>
                <div className="mt-2 text-xs text-green-600">
                  Approved: {allowanceStatus ? formatCycles(allowanceStatus.amount) : 'Unknown amount'}
                </div>
              </div>
            ) : (
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h5 className="font-medium text-gray-900">Approve Cycles Payment</h5>
                    <p className="text-sm text-gray-600">
                      Authorize the orchestrator to use {formatCycles(costs.icMintCost)} for this burn
                    </p>
                  </div>
                  <button
                    onClick={handleApprovePayment}
                    disabled={
                      approvalInProgress || 
                      balanceQuery.isLoading || 
                      (cyclesBalance !== null && cyclesBalance < costs.icMintCost)
                    }
                    className={clsx(
                      'px-6 py-2 rounded-md font-medium transition-colors',
                      approvalInProgress || 
                      balanceQuery.isLoading || 
                      (cyclesBalance !== null && cyclesBalance < costs.icMintCost)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    )}
                  >
                    {approvalInProgress ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Approving...
                      </div>
                    ) : balanceQuery.isLoading ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Checking Balance...
                      </div>
                    ) : (
                      'Approve Payment'
                    )}
                  </button>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p className="mb-1">This will:</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5 ml-2">
                    <li>Authorize the orchestrator to spend {formatCycles(costs.icMintCost)} from your account</li>
                    <li>Enable the burn operation to proceed</li>
                    <li>Set approval to expire in 24 hours for security</li>
                  </ul>
                </div>
                
                {cyclesBalance !== null && cyclesBalance < costs.icMintCost && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">
                      ⚠️ Insufficient cycles balance. Please deposit more cycles before approving.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Funding Help */}
            {cyclesBalance !== null && !hasSufficientCyclesBalance(costs.icMintCost) && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Need more cycles?</strong> You can top up your cycles balance by:
                </p>
                <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                  <li>Converting ICP to cycles using the NNS dapp</li>
                  <li>Using the cycles faucet (if available)</li>
                  <li>Purchasing cycles directly from the Network Nervous System</li>
                </ul>
              </div>
            )}
          </div>

          {/* Ready to Proceed */}
          {paymentApproved && !costs.hasInsufficientSolBalance && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h5 className="font-medium text-green-900">Ready to Proceed</h5>
                  <p className="text-sm text-green-600">
                    Costs calculated and payment approved. Go to the Burn tab to execute the burn.
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <div className="text-sm text-green-600">
                <p className="mb-1">Next steps:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 ml-2">
                  <li>Navigate to the Burn Transaction tab</li>
                  <li>Review the transaction details</li>
                  <li>Execute the burn operation</li>
                </ul>
              </div>
            </div>
          )}

          {/* Burn Process Note */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 mr-2 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-800">
                  <strong>Burn Process:</strong> You will transfer your Solana NFT to an approval address 
                  (paying SOL gas fees), then the orchestrator will detect the transfer and remint your 
                  ckNFT on the Internet Computer. This process is irreversible.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
