import { useState, useEffect, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { 
  PublicKey, 
  Transaction
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { useAuth } from '../../../hooks/useAuth';
import { useSolana } from '../../../hooks/useSolana';
import { use99Mutations } from '../../../hooks/use99Mutations';
import { createSolanaNetwork } from '../../../types/solana';
import type { SelectedSolanaBurnNFT } from '../SolanaBurnNFTSelectionStep';
import type { SolanaBurnCosts } from './SolanaBurnCostStep';
import type { BridgeProgress } from '../../../lib/bridgeProgress';
import { updateBridgeStep } from '../../../lib/bridgeProgress';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SolanaBurnExecutionStepProps {
  selectedNFT: SelectedSolanaBurnNFT | null;
  burnCosts: SolanaBurnCosts | null;
  progress: BridgeProgress | null;
  onProgressUpdate: (progress: BridgeProgress) => void;
  onTransactionComplete: (solanaSignature: string, icTxHash: string) => void;
  onError: (error: string, stage?: string) => void;
}

interface ExecutionStatus {
  stage: 'idle' | 'transferring' | 'minting' | 'complete' | 'error';
  message: string;
  solanaSignature?: string;
  icTransactionHash?: string;
  error?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function SolanaBurnExecutionStep({
  selectedNFT,
  burnCosts,
  progress,
  onProgressUpdate,
  onTransactionComplete,
  onError,
}: SolanaBurnExecutionStepProps) {
  const { user } = useAuth();
  const { publicKey, connection, signTransaction } = useSolana();
  
  const [status, setStatus] = useState<ExecutionStatus>({
    stage: 'idle',
    message: 'Ready to begin burn process',
  });
  
  // Use ref to prevent duplicate execution in React StrictMode (development)
  const executionStartedRef = useRef(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Get orchestrator mutations
  const orchestratorCanisterId = 
    process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai';
  const mutations = use99Mutations(orchestratorCanisterId);

  // ============================================================================
  // Helper: Convert Solana mint address to Nat for tokenId
  // ============================================================================
  
  const convertMintToNat = useCallback((mintAddress: string): bigint => {
    try {
      const pubkey = new PublicKey(mintAddress);
      const mintBytes = pubkey.toBytes();
      let tokenId = 0n;
      for (let i = 0; i < mintBytes.length; i++) {
        tokenId = (tokenId << 8n) | BigInt(mintBytes[i]);
      }
      return tokenId;
    } catch (error) {
      console.error('Failed to convert mint to Nat:', error);
      throw new Error('Invalid NFT mint address');
    }
  }, []);

  // ============================================================================
  // Step 1: Transfer NFT to Approval Address on Solana
  // ============================================================================
  
  const executeTransferToApproval = useCallback(async (): Promise<string> => {
    if (!selectedNFT || !burnCosts || !publicKey || !connection || !signTransaction) {
      throw new Error('Missing required data for transfer');
    }

    console.log('🔄 Step 1: Transferring NFT to approval address...');
    setStatus({
      stage: 'transferring',
      message: 'Transferring NFT to approval address on Solana...',
    });

    // Update progress
    if (progress) {
      const updatedProgress = updateBridgeStep(progress, 'transfer-to-approval', {
        status: 'loading',
      });
      onProgressUpdate(updatedProgress);
    }

    try {
      // Derive token accounts
      const nftMint = new PublicKey(selectedNFT.mintAddress);
      const approvalAddress = new PublicKey(burnCosts.approvalAddress);
      
      // Get user's token account (source)
      const userTokenAccount = await getAssociatedTokenAddress(
        nftMint,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // Get approval address token account (destination)
      const approvalTokenAccount = await getAssociatedTokenAddress(
        nftMint,
        approvalAddress,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log('📦 Token accounts:', {
        user: userTokenAccount.toBase58(),
        approval: approvalTokenAccount.toBase58(),
      });

      // Check if approval token account exists
      const approvalAccountInfo = await connection.getAccountInfo(approvalTokenAccount);
      const needsAta = !approvalAccountInfo;

      // Build transaction
      const transaction = new Transaction();
      
      // Create ATA if needed
      if (needsAta) {
        console.log('📝 Creating ATA for approval address...');
        const createAtaIx = createAssociatedTokenAccountInstruction(
          publicKey, // payer
          approvalTokenAccount,
          approvalAddress, // owner
          nftMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        transaction.add(createAtaIx);
      }

      // Add transfer instruction
      console.log('📝 Adding transfer instruction...');
      const transferIx = createTransferInstruction(
        userTokenAccount,
        approvalTokenAccount,
        publicKey,
        1, // amount (1 NFT)
        [],
        TOKEN_PROGRAM_ID
      );
      transaction.add(transferIx);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log('✍️ Signing transaction...');
      const signed = await signTransaction(transaction);
      
      console.log('📡 Sending transaction...');
      const signature = await connection.sendRawTransaction(signed.serialize());
      
      console.log('⏳ Confirming transaction:', signature);
      await connection.confirmTransaction(signature, 'finalized');
      
      console.log('✅ Transfer complete:', signature);
      
      // Update progress
      if (progress) {
        const updatedProgress = updateBridgeStep(progress, 'transfer-to-approval', {
          status: 'completed',
          txHash: signature,
        });
        onProgressUpdate(updatedProgress);
      }

      return signature;
    } catch (error: any) {
      console.error('❌ Transfer failed:', error);
      
      // Update progress
      if (progress) {
        const updatedProgress = updateBridgeStep(progress, 'transfer-to-approval', {
          status: 'failed',
          error: error.message,
        });
        onProgressUpdate(updatedProgress);
      }
      
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }, [selectedNFT, burnCosts, publicKey, connection, signTransaction, progress, onProgressUpdate]);

  // ============================================================================
  // Step 2: Call orchestrator.mint() to Return NFT to IC
  // ============================================================================
  
  const executeMintOnIC = useCallback(async (solanaSignature: string): Promise<string> => {
    if (!selectedNFT || !burnCosts || !user) {
      throw new Error('Missing required data for mint');
    }

    console.log('🔄 Step 2: Calling orchestrator.mint() to return NFT to IC...');
    setStatus({
      stage: 'minting',
      message: 'Minting ckNFT back on Internet Computer...',
      solanaSignature,
    });

    // Update progress
    if (progress) {
      const updatedProgress = updateBridgeStep(progress, 'mint-on-ic', {
        status: 'loading',
      });
      onProgressUpdate(updatedProgress);
    }

    try {
      // Convert NFT mint to Nat for tokenId
      const tokenId = convertMintToNat(selectedNFT.mintAddress);
      
      console.log('📞 Calling orchestrator.mint()...');
      console.log('  Collection:', selectedNFT.collectionAddress);
      console.log('  Network:', selectedNFT.cluster);
      console.log('  TokenId (Nat):', tokenId);

      // Prepare mint request
      const nftPointer = {
        contract: selectedNFT.collectionAddress,
        network: createSolanaNetwork(selectedNFT.cluster),
        tokenId,
      };

      const mintToAccount = {
        owner: user.principal,
        subaccount: [],
      };

      // Payment account (user's cycles account)
      const paymentAccount = {
        owner: user.principal,
        subaccount: [],
      };

      // Call orchestrator.mint() using mintFromEVM mutation
      const mintRequest = {
        nft: nftPointer,
        resume: [] as [] | [[bigint, any]],
        mintToAccount,
        spender: [] as [] | [any],
      };

      const mintResult = await mutations.mintFromEVM.mutateAsync({
        request: mintRequest as any,
        spender: paymentAccount as any,
        skipApproval: false, // Will check and approve cycles if needed
      });

      console.log('📋 Mint result:', mintResult);

      // Extract transaction information from Result type
      if ('Ok' in mintResult) {
        const mintId = mintResult.Ok;
        console.log('✅ Mint request created:', mintId);

        // The mintFromEVM mutation handles polling internally
        // Update progress
        if (progress) {
          const updatedProgress = updateBridgeStep(progress, 'mint-on-ic', {
            status: 'completed',
            txHash: mintId.toString(),
          });
          onProgressUpdate(updatedProgress);
        }

        return mintId.toString();
      } else if ('Err' in mintResult) {
        const error = JSON.stringify(mintResult.Err);
        throw new Error(`Mint failed: ${error}`);
      } else {
        throw new Error('Mint failed with unknown error');
      }
    } catch (error: any) {
      console.error('❌ Mint failed:', error);
      
      // Update progress
      if (progress) {
        const updatedProgress = updateBridgeStep(progress, 'mint-on-ic', {
          status: 'failed',
          error: error.message,
        });
        onProgressUpdate(updatedProgress);
      }
      
      throw new Error(`Mint failed: ${error.message}`);
    }
  }, [selectedNFT, burnCosts, user, convertMintToNat, mutations.mintFromEVM, progress, onProgressUpdate]);

  // ============================================================================
  // Execute Complete Burn Flow
  // ============================================================================
  
  const executeBurn = useCallback(async () => {
    // Prevent duplicate execution (React StrictMode runs effects twice in dev)
    if (executionStartedRef.current || hasStarted) return;
    
    executionStartedRef.current = true;
    setHasStarted(true);

    try {
      // DEBUG: Log recovery mode status
      console.log('🔍 DEBUG: Starting burn execution');
      console.log('  selectedNFT:', selectedNFT);
      console.log('  isRecovery flag:', selectedNFT?.isRecovery);
      console.log('  Recovery mode active?', selectedNFT?.isRecovery === true);
      
      // Verify prerequisites
      if (progress) {
        const verifyProgress = updateBridgeStep(progress, 'verify-connection', {
          status: 'loading',
        });
        onProgressUpdate(verifyProgress);
      }

      if (!selectedNFT || !burnCosts || !publicKey || !user) {
        throw new Error('Missing required connection or data');
      }

      if (progress) {
        const verifiedProgress = updateBridgeStep(progress, 'verify-connection', {
          status: 'completed',
        });
        onProgressUpdate(verifiedProgress);
      }

      // Get approval address (already calculated in costs step)
      if (progress) {
        const approvalProgress = updateBridgeStep(progress, 'get-approval-address', {
          status: 'completed',
        });
        onProgressUpdate(approvalProgress);
      }

      // Check if this is recovery mode (NFT already at approval address)
      let solanaSignature: string;
      
      console.log('🔍 Checking recovery mode...');
      console.log('  selectedNFT.isRecovery:', selectedNFT.isRecovery);
      console.log('  Type:', typeof selectedNFT.isRecovery);
      console.log('  Strict equality check:', selectedNFT.isRecovery === true);
      
      if (selectedNFT.isRecovery) {
        console.log('🔄 Recovery mode detected - skipping transfer step');
        console.log('   NFT is already at approval address, proceeding directly to mint');
        
        setStatus({
          stage: 'minting',
          message: 'Recovery mode: NFT already transferred. Calling mint on IC...',
        });
        
        // Skip transfer, use a placeholder signature
        solanaSignature = 'recovery-mode-skip-transfer';
        
        // Mark transfer as completed (skipped)
        if (progress) {
          const transferProgress = updateBridgeStep(progress, 'transfer-to-approval', {
            status: 'completed',
          });
          onProgressUpdate(transferProgress);
        }
      } else {
        console.log('🔄 Normal mode detected - will transfer NFT');
        // Normal flow: Transfer to approval address
        solanaSignature = await executeTransferToApproval();
      }
      
      // Step 2: Call orchestrator.mint()
      const icTxHash = await executeMintOnIC(solanaSignature);
      
      // Complete!
      setStatus({
        stage: 'complete',
        message: 'Burn complete! NFT returned to IC',
        solanaSignature,
        icTransactionHash: icTxHash,
      });

      onTransactionComplete(solanaSignature, icTxHash);
    } catch (error: any) {
      console.error('❌ Burn execution failed:', error);
      setStatus({
        stage: 'error',
        message: error.message,
        error: error.message,
      });
      onError(error.message);
      // Reset execution flag on error to allow retry
      executionStartedRef.current = false;
    }
  }, [
    hasStarted,
    selectedNFT,
    burnCosts,
    publicKey,
    user,
    connection,
    progress,
    onProgressUpdate,
    executeTransferToApproval,
    executeMintOnIC,
    onTransactionComplete,
    onError,
  ]);

  // Auto-start execution when component mounts
  useEffect(() => {
    if (!hasStarted && !executionStartedRef.current) {
      executeBurn();
    }
  }, [executeBurn, hasStarted]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Status Display */}
      <div className="text-center">
        <div
          className={clsx(
            'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
            status.stage === 'idle' && 'bg-gray-100',
            status.stage === 'transferring' && 'bg-blue-100',
            status.stage === 'minting' && 'bg-purple-100',
            status.stage === 'complete' && 'bg-green-100',
            status.stage === 'error' && 'bg-red-100'
          )}
        >
          {(status.stage === 'idle' || status.stage === 'transferring' || status.stage === 'minting') && (
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          )}
          {status.stage === 'complete' && (
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status.stage === 'error' && (
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {status.stage === 'idle' && 'Starting Burn Process...'}
          {status.stage === 'transferring' && 'Transferring NFT'}
          {status.stage === 'minting' && 'Minting on IC'}
          {status.stage === 'complete' && 'Burn Complete!'}
          {status.stage === 'error' && 'Burn Failed'}
        </h3>

        <p className="text-gray-600">{status.message}</p>
      </div>

      {/* Transaction Hashes */}
      {(status.solanaSignature || status.icTransactionHash) && (
        <div className="space-y-3">
          {status.solanaSignature && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Solana Transfer Signature:</div>
              <div className="text-xs font-mono text-gray-800 break-all">
                {status.solanaSignature}
              </div>
            </div>
          )}
          {status.icTransactionHash && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">IC Transaction Hash:</div>
              <div className="text-xs font-mono text-gray-800 break-all">
                {status.icTransactionHash}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {status.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{status.error}</p>
        </div>
      )}

      {/* NFT Info */}
      {selectedNFT && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">Burning NFT:</div>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-gray-500">Mint:</span>
              <div className="font-mono text-xs break-all">{selectedNFT.mintAddress}</div>
            </div>
            <div>
              <span className="text-gray-500">Collection:</span>
              <div className="font-mono text-xs break-all">{selectedNFT.collectionAddress}</div>
            </div>
            <div>
              <span className="text-gray-500">Network:</span>
              <div className="text-xs">{selectedNFT.cluster}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
