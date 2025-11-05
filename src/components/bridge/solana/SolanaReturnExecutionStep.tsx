import { useEffect, useCallback, useState, useRef } from 'react';
// import { Principal } from '@dfinity/principal';
import { Actor } from '@dfinity/agent';
import { useAgent } from '../../../provider/AgentProvider';
import { useAuth } from '../../../hooks/useAuth';
import { idlFactory as ckNFTIdlFactory } from '../../../declarations/ckNFT/ckNFT.did.js';
import type { _SERVICE as CkNFTService, CastRequest as CkNFTCastRequest } from '../../../declarations/ckNFT/ckNFT.did';
import type { BridgeProgress } from '../../../lib/bridgeProgress';
import { updateBridgeStep } from '../../../lib/bridgeProgress';
import type { SolanaReturnCosts } from './SolanaReturnCostStep';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SolanaReturnExecutionStepProps {
  /** Selected ckNFT to return */
  selectedNFT: {
    canisterId: string;
    tokenId: bigint;
  };
  /** Calculated return costs */
  returnCosts: SolanaReturnCosts;
  /** Target Solana address to receive NFT */
  targetSolanaAddress: string;
  /** Bridge progress tracker */
  progress: BridgeProgress | null;
  /** Progress update callback */
  onProgressUpdate: (progress: BridgeProgress) => void;
  /** Success callback */
  onComplete: (solanaSignature?: string) => void;
  /** Error callback */
  onError: (error: string, stage?: string) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function SolanaReturnExecutionStep({
  selectedNFT,
  returnCosts,
  targetSolanaAddress,
  progress,
  onProgressUpdate,
  onComplete,
  onError,
}: SolanaReturnExecutionStepProps) {
  const { user } = useAuth();
  const authenticatedAgent = useAgent();
  const [isExecuting, setIsExecuting] = useState(false);
  const hasExecutedRef = useRef(false); // Track if execution has started

  // ============================================================================
  // Execute Return (Cast) Operation
  // ============================================================================

  const executeReturn = useCallback(async () => {
    // Prevent double execution (especially in React Strict Mode)
    if (hasExecutedRef.current || isExecuting || !authenticatedAgent || !user) {
      console.log('⏸️ Skipping return execution:', { 
        hasExecuted: hasExecutedRef.current,
        isExecuting, 
        hasAgent: !!authenticatedAgent, 
        hasUser: !!user 
      });
      return;
    }

    hasExecutedRef.current = true; // Mark as executed immediately
    setIsExecuting(true);
    console.log('🚀 Starting Solana return execution...');

    try {
      // ============================================================================
      // STEP 1: Create ckNFT Actor
      // ============================================================================

      if (progress) {
        const updatedProgress = updateBridgeStep(progress, 'verify-connection', {
          status: 'loading',
        });
        onProgressUpdate(updatedProgress);
      }

      const ckNFTActor = Actor.createActor(ckNFTIdlFactory, {
        agent: authenticatedAgent,
        canisterId: selectedNFT.canisterId,
      }) as CkNFTService;

      console.log('✅ Created ckNFT actor for canister:', selectedNFT.canisterId);

      if (progress) {
        const updatedProgress = updateBridgeStep(progress, 'verify-connection', {
          status: 'completed',
        });
        onProgressUpdate(updatedProgress);
      }

      // ============================================================================
      // STEP 2: Prepare Cast Request
      // ============================================================================

      if (progress) {
        const updatedProgress = updateBridgeStep(progress, 'prepare-cast', {
          status: 'loading',
        });
        onProgressUpdate(updatedProgress);
      }

      const castRequest: CkNFTCastRequest = {
        tokenId: selectedNFT.tokenId,
        fromSubaccount: [],
        remoteContract: {
          network: returnCosts.nativeChain!,
          contract: returnCosts.nativeContract!
        },
        targetOwner: targetSolanaAddress,
        memo: [],
        created_at_time: [],
        gasPrice: [],
        gasLimit: [],
        maxPriorityFeePerGas: []
      };

      console.log('📋 Cast request prepared:', castRequest);

      if (progress) {
        const updatedProgress = updateBridgeStep(progress, 'prepare-cast', {
          status: 'completed',
        });
        onProgressUpdate(updatedProgress);
      }

      // ============================================================================
      // STEP 3: Execute Cast
      // ============================================================================

      if (progress) {
        const updatedProgress = updateBridgeStep(progress, 'execute-cast', {
          status: 'loading',
        });
        onProgressUpdate(updatedProgress);
      }

      const castResult = await ckNFTActor.icrc99_cast([castRequest], [{
        owner: user.principal,
        subaccount: []
      }]);

      console.log('🎯 Cast executed:', castResult);

      // Check cast result
      if (!castResult || castResult.length === 0 || !castResult[0] || castResult[0].length === 0 || !castResult[0][0]) {
        throw new Error('Cast request failed: No result returned');
      }

      const firstResult = castResult[0][0];
      if ('Err' in firstResult) {
        throw new Error(`Cast request failed: ${JSON.stringify(firstResult.Err)}`);
      }

      const castRequestId = firstResult.Ok;
      console.log('✅ Cast request ID:', castRequestId);

      if (progress) {
        const updatedProgress = updateBridgeStep(progress, 'execute-cast', {
          status: 'completed',
        });
        onProgressUpdate(updatedProgress);
      }

      // ============================================================================
      // STEP 4: Monitor Cast Status
      // ============================================================================

      if (progress) {
        const updatedProgress = updateBridgeStep(progress, 'monitor-status', {
          status: 'loading',
        });
        onProgressUpdate(updatedProgress);
      }

      let castCompleted = false;
      let attempts = 0;
      const maxAttempts = 30;
      let solanaSignature: string | undefined;

      while (!castCompleted && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;

        console.log(`⏳ Checking cast status (attempt ${attempts}/${maxAttempts})...`);

        try {
          const statusResult = await ckNFTActor.icrc99_cast_status([castRequestId], []);
          
          if (statusResult && statusResult.length > 0) {
            // Handle Candid optional: [] | [CastStateShared]
            const castStateOption = statusResult[0];
            const castState = castStateOption && castStateOption[0];
            
            if (castState) {
              console.log('📊 Cast state:', castState);
              
              const status = castState.status;
              
              if (status && 'Completed' in status) {
                console.log('🎉 Cast completed successfully!', status.Completed);
                castCompleted = true;
                
                // Extract Solana signature from cast state history
                // Look for WaitingOnTransfer status in history which contains the transaction hash
                if (castState.history) {
                  for (const historyEntry of castState.history) {
                    const [historyStatus] = historyEntry;
                    if (historyStatus && 'WaitingOnTransfer' in historyStatus) {
                      solanaSignature = historyStatus.WaitingOnTransfer?.transaction;
                      if (solanaSignature) {
                        console.log('📝 Solana transaction signature:', solanaSignature);
                        break;
                      }
                    }
                  }
                }
                
                break;
              } else if (status && ('Error' in status || 'Failed' in status)) {
                let errorDetails = 'Unknown error';
                if ('Error' in status) {
                  const errorObj = status.Error as any;
                  if (errorObj && 'GenericError' in errorObj) {
                    errorDetails = `GenericError: ${errorObj.GenericError}`;
                  } else {
                    errorDetails = JSON.stringify(errorObj);
                  }
                } else if ('Failed' in status) {
                  errorDetails = String(status.Failed);
                }
                throw new Error(`Cast failed: ${errorDetails}`);
              } else {
                console.log('⏳ Cast still in progress, current status:', Object.keys(status)[0]);
              }
            }
          }
        } catch (statusError) {
          console.warn('⚠️ Error checking cast status:', statusError);
        }
      }

      if (!castCompleted) {
        throw new Error(`Cast did not complete after ${maxAttempts} attempts (${maxAttempts * 10} seconds)`);
      }

      if (progress) {
        const updatedProgress = updateBridgeStep(progress, 'monitor-status', {
          status: 'completed',
          txHash: solanaSignature,
        });
        onProgressUpdate(updatedProgress);
      }

      // ============================================================================
      // STEP 5: Success
      // ============================================================================

      console.log('🎉 Return completed successfully!');
      onComplete(solanaSignature);
      setIsExecuting(false);

    } catch (error) {
      console.error('❌ Return execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      onError(errorMessage, 'execute-cast');
      setIsExecuting(false);
    }
  }, [
    isExecuting,
    authenticatedAgent,
    user,
    selectedNFT,
    returnCosts,
    targetSolanaAddress,
    progress,
    onProgressUpdate,
    onComplete,
    onError,
  ]);

  // ============================================================================
  // Auto-Execute on Mount
  // ============================================================================

  useEffect(() => {
    if (!isExecuting) {
      executeReturn();
    }
  }, []); // Only run once on mount

  // ============================================================================
  // Render (this is a headless component)
  // ============================================================================

  return null;
}
