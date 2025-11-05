import { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { PublicKey, Transaction } from '@solana/web3.js';
import { 
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { useSolana } from '../../hooks/useSolana';
import { useAuth } from '../../hooks/useAuth';
import { useAuthenticatedActor, useAnonymousActor } from '../../hooks/useActor';
import { use99Mutations } from '../../hooks/use99Mutations';
import { solanaTokenIdFromMint } from '../../utils/solanaTokenId';
import { storeLocalStorageMintRequestId } from '../../services/solanaNFTDiscoveryDirect';
import type { SelectedSolanaNFT } from './SolanaNFTSelectionStep';
import { idlFactory as orchestratorIdlFactory } from '../../declarations/orchestrator/orchestrator.did.js';
import type { _SERVICE as OrchestratorService } from '../../declarations/orchestrator/orchestrator.did';
import type { SolanaCluster } from '../../types/solana';
import { createSolanaNetwork } from '../../types/solana';

/**
 * Safely stringify objects that may contain BigInt values
 * BigInt values are converted to strings with 'n' suffix for clarity
 */
function safeStringify(obj: any): string {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === 'bigint' ? value.toString() + 'n' : value
  );
}

interface SolanaBridgeExecutionStepProps {
  selectedNFTs: SelectedSolanaNFT[];
  canisterAddress: string; // Required - should be determined in Step 3
  mintCosts: bigint; // Total cycles required for minting (passed from Step 4)
  targetCluster?: SolanaCluster; // Solana network cluster (defaults to 'devnet')
  onComplete?: (result: BridgeResult) => void;
  onError?: (error: Error) => void;
}

interface BridgeResult {
  success: boolean;
  totalNFTs: number;
  successfulTransfers: number;
  failedTransfers: number;
  solanaSignatures: string[];
  icTransactionIds: string[];
  mintedTokenIds: string[];
  canisterAddress?: string;
}

interface NFTTransferStatus {
  mintAddress: string;
  name: string;
  status: 'pending' | 'transferring' | 'minting' | 'completed' | 'failed';
  solanaSignature?: string;
  icTransactionId?: string;
  error?: string;
  progress?: string;
}

interface ProgressStep {
  id: string;
  title: string;
  status: 'pending' | 'loading' | 'success' | 'failed';
  message?: string;
}

export function SolanaBridgeExecutionStep({
  selectedNFTs,
  canisterAddress,
  mintCosts,
  targetCluster = 'devnet', // Default to devnet for backward compatibility
  onComplete,
  onError,
}: SolanaBridgeExecutionStepProps) {
  const { publicKey, connection, address, sendTransaction } = useSolana();
  const { user } = useAuth();
  
  // Convert cluster to network format for orchestrator
  const targetNetwork = createSolanaNetwork(targetCluster);
  
  // Get orchestrator canister ID from environment
  const orchestratorCanisterId = import.meta.env.VITE_ICRC99_ORCHESTRATOR_CANISTER_ID || 
    'uzt4z-lp777-77774-qaabq-cai'; // Default local canister ID
    
  const mutations = use99Mutations(orchestratorCanisterId);
    
  // Anonymous actor for queries (get_remote_approval_address, get_mint_status)
  const anonymousOrchestratorActor = useAnonymousActor<OrchestratorService>(
    orchestratorCanisterId,
    orchestratorIdlFactory
  );
  
  // Authenticated actor for updates (mint)
  const orchestratorActor = useAuthenticatedActor<OrchestratorService>(
    orchestratorCanisterId,
    orchestratorIdlFactory
  );

  const [isExecuting, setIsExecuting] = useState(false);
  const [currentNFTIndex, setCurrentNFTIndex] = useState<number | null>(null);
  const [nftStatuses, setNFTStatuses] = useState<NFTTransferStatus[]>([]);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [bridgeResult, setBridgeResult] = useState<BridgeResult | null>(null);

  // Initialize NFT statuses
  useEffect(() => {
    const initialStatuses: NFTTransferStatus[] = selectedNFTs.map(nft => ({
      mintAddress: nft.mintAddress,
      name: nft.name,
      status: 'pending',
    }));
    setNFTStatuses(initialStatuses);
  }, [selectedNFTs]);

  // Initialize progress steps
  useEffect(() => {
    const steps: ProgressStep[] = [
      { id: 'get-approval', title: 'Get Orchestrator Approval Address', status: 'pending' },
      { id: 'transfer-nfts', title: 'Transfer NFTs to Bridge', status: 'pending' },
      { id: 'mint-cknfts', title: 'Mint ckNFTs on Internet Computer', status: 'pending' },
      { id: 'complete', title: 'Bridge Complete', status: 'pending' },
    ];
    setProgressSteps(steps);
  }, []);

  const updateProgressStep = (
    stepId: string,
    status: 'pending' | 'loading' | 'success' | 'failed',
    message?: string
  ) => {
    setProgressSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status, message } : step
      )
    );
  };

  const updateNFTStatus = (
    mintAddress: string,
    update: Partial<NFTTransferStatus>
  ) => {
    setNFTStatuses(prev =>
      prev.map(status =>
        status.mintAddress === mintAddress
          ? { ...status, ...update }
          : status
      )
    );
  };

  const executeBridge = async () => {
    if (!publicKey || !address || !orchestratorActor || !user) {
      throw new Error('Not ready: wallet or orchestrator not connected');
    }

    try {
      setIsExecuting(true);

      // Step 1: Get approval address from orchestrator
      console.log('🔍 Step 1: Getting orchestrator approval address...');
      console.log('   Using canister:', canisterAddress);
      updateProgressStep('get-approval', 'loading', 'Querying orchestrator...');

      // Validate that all NFTs have collection addresses and are from the same collection
      const firstNFT = selectedNFTs[0];
      if (!firstNFT.collection?.address) {
        throw new Error('NFT missing collection address - cannot determine approval address');
      }
      
      const collectionAddress = firstNFT.collection.address;
      
      // Verify all NFTs are from the same collection
      const differentCollection = selectedNFTs.find(
        nft => nft.collection?.address !== collectionAddress
      );
      if (differentCollection) {
        throw new Error(
          `All NFTs must be from the same collection. Found NFT from different collection: ${differentCollection.name}`
        );
      }
      
      console.log(`✅ All ${selectedNFTs.length} NFTs are from collection: ${collectionAddress}`);
      
      const tokenId = solanaTokenIdFromMint(firstNFT.mintAddress);

      console.log('[DEBUG] Approval address request params:', {
        collectionAddress,
        tokenId: tokenId.toString(),
        targetCluster,
        targetNetwork,
        userPrincipal: user.principal?.toText(),
      });

      const approvalRequest = {
        remoteNFTPointer: {
          tokenId,
          contract: collectionAddress, // ALWAYS use collection address, not individual NFT mint
          network: targetNetwork,
        },
        account: {
          owner: user.principal!,
          subaccount: [] as [],
        },
      };

      // LOG THE EXACT PARAMETERS BEING SENT
      console.log('🔥🔥🔥 CALLING get_remote_approval_address WITH:', {
        tokenId: tokenId.toString(),
        contract: collectionAddress,
        network: targetNetwork,
        targetCluster: targetCluster,
        rawNetwork: JSON.stringify(targetNetwork),
        userPrincipal: user.principal!.toString(),
      });

      const approvalAddressResult = await anonymousOrchestratorActor.get_remote_approval_address(
        approvalRequest,
        [] as [] // No spender
      );
      
      let approvalAddress: string;
      if (Array.isArray(approvalAddressResult) && approvalAddressResult.length > 0 && approvalAddressResult[0]) {
        approvalAddress = approvalAddressResult[0];
        console.log('✅ Approval address RECEIVED:', approvalAddress);
        updateProgressStep('get-approval', 'success', `Approval address: ${approvalAddress.slice(0, 8)}...`);
      } else {
        throw new Error('Failed to get approval address from orchestrator');
      }

      const approvalPubkey = new PublicKey(approvalAddress);

      // Step 2: Transfer NFTs to approval address (skip if already transferred)
      console.log('🚀 Step 2: Transferring NFTs to bridge...');
      
      // Separate NFTs that need transfer vs resume
      const nftsToTransfer = selectedNFTs.filter(nft => nft.ownershipState !== 'ready-to-mint');
      const nftsToResume = selectedNFTs.filter(nft => nft.ownershipState === 'ready-to-mint');
      
      console.log(`  NFTs to transfer: ${nftsToTransfer.length}`);
      console.log(`  NFTs to resume (already transferred): ${nftsToResume.length}`);
      
      updateProgressStep('transfer-nfts', 'loading', `Transferring ${nftsToTransfer.length} NFT(s)...`);

      const solanaSignatures: string[] = [];
      const failedTransfers: string[] = [];
      const skippedTransfers: string[] = []; // NFTs already at approval address or already minted

      for (let i = 0; i < selectedNFTs.length; i++) {
        const nft = selectedNFTs[i];
        setCurrentNFTIndex(i);
        
        // Skip transfer if NFT is already at approval address (recovery case)
        if (nft.ownershipState === 'ready-to-mint') {
          console.log(`⏩ Skipping transfer for NFT ${i + 1}/${selectedNFTs.length} (already at approval address):`, nft.name);
          updateNFTStatus(nft.mintAddress, { status: 'minting', progress: 'NFT already at approval address, ready to mint' });
          skippedTransfers.push(nft.mintAddress);
          continue;
        }
        
        // Skip transfer if NFT is already minted on IC
        if (nft.ownershipState === 'already-minted') {
          console.log(`⏩ Skipping transfer for NFT ${i + 1}/${selectedNFTs.length} (already minted on IC):`, nft.name);
          updateNFTStatus(nft.mintAddress, { status: 'completed', progress: 'NFT already minted on IC' });
          skippedTransfers.push(nft.mintAddress);
          continue;
        }
        
        updateNFTStatus(nft.mintAddress, { status: 'transferring', progress: 'Verifying current ownership...' });

        try {
          const mintPubkey = new PublicKey(nft.mintAddress);
          
          // COMPREHENSIVE OWNERSHIP VERIFICATION
          // Check 3 possible locations: user wallet, approval address, already minted on IC
          console.log(`🔍 Verifying ownership for NFT ${i + 1}/${selectedNFTs.length}:`, nft.name);
          
          // Location 1: Check if still in user's wallet
          const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, publicKey);
          let fromAccountInfo = await connection.getAccountInfo(fromTokenAccount, 'confirmed');
          
          let nftInUserWallet = false;
          if (fromAccountInfo) {
            const amount = fromAccountInfo.data.readBigUInt64LE(64);
            nftInUserWallet = amount === BigInt(1);
            console.log(`  User wallet: ${nftInUserWallet ? '✅ NFT present' : '❌ Empty (amount=' + amount + ')'}`);
          } else {
            console.log(`  User wallet: ❌ Account doesn't exist`);
          }
          
          // Location 2: Check if already at approval address
          let nftAtApprovalAddress = false;
          const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, approvalPubkey);
          const toAccountInfo = await connection.getAccountInfo(toTokenAccount, 'confirmed');
          if (toAccountInfo) {
            const amount = toAccountInfo.data.readBigUInt64LE(64);
            nftAtApprovalAddress = amount === BigInt(1);
            console.log(`  Approval address: ${nftAtApprovalAddress ? '✅ NFT present' : '❌ Empty (amount=' + amount + ')'}`);
          } else {
            console.log(`  Approval address: ❌ Account doesn't exist`);
          }
          
          // Location 3: Check if already minted on IC
          let nftAlreadyMintedOnIC = false;
          if (canisterAddress && canisterAddress !== 'pending') {
            try {
              const tokenId = solanaTokenIdFromMint(nft.mintAddress);
              const { Actor, HttpAgent } = await import('@dfinity/agent');
              const agent = new HttpAgent({
                host: process.env.DFX_NETWORK === 'local' ? 'http://localhost:8080' : 'https://icp0.io',
              });
              
              if (process.env.DFX_NETWORK === 'local') {
                await agent.fetchRootKey().catch(err => console.warn('Failed to fetch root key:', err));
              }
              
              // ICRC-7 IDL for owner query
              const icrc7IdlFactory = ({ IDL }: { IDL: any }) => {
                return IDL.Service({
                  icrc7_owner_of: IDL.Func(
                    [IDL.Vec(IDL.Nat)],
                    [IDL.Vec(IDL.Opt(IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) })))],
                    ['query']
                  ),
                });
              };
              
              const ckNFTActor = Actor.createActor(icrc7IdlFactory, {
                agent,
                canisterId: canisterAddress,
              }) as any;
              
              const ownerResult = await ckNFTActor.icrc7_owner_of([tokenId]);
              if (ownerResult && ownerResult.length > 0 && ownerResult[0].length > 0) {
                nftAlreadyMintedOnIC = true;
                const owner = ownerResult[0][0];
                console.log(`  IC ckNFT: ✅ Already minted (owner: ${owner.owner.toString()})`);
              } else {
                console.log(`  IC ckNFT: ❌ Not minted yet`);
              }
            } catch (icQueryError) {
              console.warn(`  IC ckNFT: ⚠️ Query failed (assuming not minted):`, icQueryError);
            }
          }
          
          // Decision logic based on ownership verification
          if (nftAlreadyMintedOnIC) {
            console.log(`⏩ NFT already minted on IC, skipping transfer and mint`);
            updateNFTStatus(nft.mintAddress, { 
              status: 'completed', 
              progress: 'NFT already minted on IC'
            });
            skippedTransfers.push(nft.mintAddress);
            continue;
          }
          
          if (nftAtApprovalAddress && !nftInUserWallet) {
            console.log(`⏩ NFT already at approval address, skipping transfer (will mint)`);
            updateNFTStatus(nft.mintAddress, { 
              status: 'minting', 
              progress: 'NFT already at approval address, ready to mint' 
            });
            skippedTransfers.push(nft.mintAddress);
            continue;
          }
          
          if (!nftInUserWallet && !nftAtApprovalAddress) {
            console.error(`❌ NFT not found in user wallet OR approval address!`);
            updateNFTStatus(nft.mintAddress, { 
              status: 'failed', 
              progress: 'NFT not in wallet or approval address - may have been transferred elsewhere',
              error: 'NFT ownership cannot be verified'
            });
            failedTransfers.push(nft.mintAddress);
            continue;
          }
          
          // If we reach here, NFT is in user wallet and needs to be transferred
          console.log(`✅ NFT verified in user wallet, proceeding with transfer`);
          updateNFTStatus(nft.mintAddress, { progress: 'Preparing transfer transaction...' });
          
          // Destination token account was already calculated in verification
          console.log('  To token account:', toTokenAccount.toString());

          // Build transaction with create ATA + transfer instructions
          updateNFTStatus(nft.mintAddress, { progress: 'Building transaction...' });
          
          // Get fresh blockhash with finalized commitment to avoid "blockhash not found" errors
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
          const transaction = new Transaction({
            blockhash,
            lastValidBlockHeight,
            feePayer: publicKey,
          });

          // Check if destination token account exists (reuse toAccountInfo from verification)
          // If it already exists with amount=1, we already handled it above (skipped transfer)
          // So here we only need to create if it doesn't exist
          if (!toAccountInfo) {
            console.log('  Creating destination token account...');
            transaction.add(
              createAssociatedTokenAccountInstruction(
                publicKey, // payer
                toTokenAccount, // associatedToken
                approvalPubkey, // owner
                mintPubkey, // mint
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
              )
            );
          }
          
          // Add transfer instruction
          transaction.add(
            createTransferInstruction(
              fromTokenAccount, // source
              toTokenAccount, // destination
              publicKey, // owner
              1, // amount (1 NFT)
              [], // multiSigners
              TOKEN_PROGRAM_ID
            )
          );

          // Send transaction to wallet for approval
          // Note: We skip simulation because it often fails for NFT transfers due to 
          // account state checks that can't be simulated accurately. The wallet will
          // validate and show any errors before signing.
          updateNFTStatus(nft.mintAddress, { progress: 'Awaiting wallet approval...' });
          console.log('  Sending transaction to wallet for approval...');
          
          const signature = await sendTransaction(transaction);
          console.log('  ✅ Transaction signed! Signature:', signature);

          updateNFTStatus(nft.mintAddress, { progress: 'Confirming transaction...' });
          
          // Wait for confirmation using HTTP polling instead of WebSocket
          // This avoids WebSocket connection issues with some RPC providers like Backpack
          console.log('  Polling for transaction confirmation...');
          let confirmed = false;
          let attempts = 0;
          const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max
          
          while (!confirmed && attempts < maxAttempts) {
            attempts++;
            
            try {
              const status = await connection.getSignatureStatus(signature);
              
              if (status?.value?.confirmationStatus === 'finalized' || 
                  status?.value?.confirmationStatus === 'confirmed') {
                confirmed = true;
                console.log(`  ✅ Transaction confirmed after ${attempts} attempts (${status.value.confirmationStatus})`);
                break;
              }
              
              if (status?.value?.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
              }
              
              // Check if block height exceeded
              const currentBlockHeight = await connection.getBlockHeight();
              if (currentBlockHeight > lastValidBlockHeight) {
                throw new Error('Transaction expired: block height exceeded');
              }
              
              // Wait 2 seconds before next poll
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (pollError) {
              console.error(`  Polling attempt ${attempts} failed:`, pollError);
              if (attempts >= maxAttempts) {
                throw pollError;
              }
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          if (!confirmed) {
            throw new Error('Transaction confirmation timeout after 2 minutes');
          }

          console.log(`✅ NFT ${i + 1} transferred successfully`);
          updateNFTStatus(nft.mintAddress, {
            status: 'transferring',
            solanaSignature: signature,
            progress: 'Transfer confirmed',
          });

          solanaSignatures.push(signature);

        } catch (transferError) {
          console.error(`❌ Failed to transfer NFT ${i + 1}:`, transferError);
          
          // Try to extract detailed error information
          let errorMessage = 'Unknown error';
          let errorLogs: string[] = [];
          
          if (transferError instanceof Error) {
            errorMessage = transferError.message;
            
            // Check if error has getLogs method (SendTransactionError)
            if ('getLogs' in transferError && typeof (transferError as any).getLogs === 'function') {
              try {
                errorLogs = await (transferError as any).getLogs(connection);
                console.error('  Transaction logs:', errorLogs);
                errorMessage = `${errorMessage}\n\nLogs:\n${errorLogs.join('\n')}`;
              } catch (logError) {
                console.error('  Failed to get logs:', logError);
              }
            }
            
            // Check if error has logs property directly
            if ('logs' in transferError && Array.isArray((transferError as any).logs)) {
              errorLogs = (transferError as any).logs;
              console.error('  Transaction logs:', errorLogs);
              if (errorLogs.length > 0) {
                errorMessage = `${errorMessage}\n\nLogs:\n${errorLogs.join('\n')}`;
              }
            }
          }
          
          updateNFTStatus(nft.mintAddress, {
            status: 'failed',
            error: `Transfer failed: ${errorMessage}`,
          });
          failedTransfers.push(nft.mintAddress);
        }
      }

      // Check if all NFTs failed (none transferred and none skipped)
      const successfulCount = solanaSignatures.length + skippedTransfers.length;
      if (successfulCount === 0) {
        throw new Error('All NFT transfers failed');
      }

      // Update progress with accurate counts
      if (skippedTransfers.length > 0) {
        updateProgressStep('transfer-nfts', 'success', 
          `${solanaSignatures.length} transferred, ${skippedTransfers.length} already at approval address`);
      } else {
        updateProgressStep('transfer-nfts', 'success', `${solanaSignatures.length}/${selectedNFTs.length} NFT(s) transferred`);
      }

      // Step 3: Check and approve cycles for minting (if needed)
      console.log('💰 Step 3: Checking cycles allowance...');
      updateProgressStep('mint-cknfts', 'loading', 'Checking cycles allowance...');
      
      try {
        // Calculate required approval amount (same as Step 4 validation)
        // mintCosts should already include: (costPerNFT * numNFTs) + (fee * numNFTs)
        // Add 20% buffer for safety (ICRC-2 transfer fees + network costs)
        const approvalAmount = (mintCosts * BigInt(120)) / BigInt(100);
        
        console.log('💰 Cycles approval details:');
        console.log(`  Base mint costs: ${mintCosts}`);
        console.log(`  Approval amount (120% buffer): ${approvalAmount}`);
        console.log(`  NFTs to mint: ${selectedNFTs.length}`);
        console.log(`  Average per NFT: ${approvalAmount / BigInt(selectedNFTs.length)}`);
        
        // Check existing allowance first
        let needsApproval = true;
        try {
          const orchestratorPrincipal = Principal.fromText(orchestratorCanisterId);
          const allowanceParams = {
            account: {
              owner: user.principal!,
              subaccount: [] as [],
            },
            spender: {
              owner: orchestratorPrincipal,
              subaccount: [] as [],
            },
          };

          // Query cycles ledger directly for current allowance
          const { Actor, HttpAgent } = await import('@dfinity/agent');
          const agent = new HttpAgent({
            host: process.env.DFX_NETWORK === 'local' ? 'http://localhost:8080' : 'https://icp0.io',
          });
          
          if (process.env.DFX_NETWORK === 'local') {
            await agent.fetchRootKey().catch(err => console.warn('Failed to fetch root key:', err));
          }
          
          // ICRC-2 IDL for allowance call
          const icrc2IdlFactory = ({ IDL }: { IDL: any }) => {
            const Account = IDL.Record({
              owner: IDL.Principal,
              subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
            });
            
            const Allowance = IDL.Record({
              allowance: IDL.Nat,
              expires_at: IDL.Opt(IDL.Nat64),
            });
            
            return IDL.Service({
              icrc2_allowance: IDL.Func(
                [IDL.Record({ account: Account, spender: Account })],
                [Allowance],
                ['query']
              ),
            });
          };
          
          const cyclesLedgerCanisterId = process.env.CYCLES_LEDGER_CANISTER_ID || 'um5iw-rqaaa-aaaaq-qaaba-cai';
          const cyclesActor = Actor.createActor(icrc2IdlFactory, {
            agent,
            canisterId: cyclesLedgerCanisterId,
          }) as any;
          
          const allowanceResult = await cyclesActor.icrc2_allowance(allowanceParams);
          console.log('Current allowance result:', allowanceResult);
          
          if (allowanceResult?.allowance) {
            console.log('Found existing allowance:', allowanceResult.allowance.toString());
            console.log('Required amount:', approvalAmount.toString());
            
            if (allowanceResult.allowance >= approvalAmount) {
              const now = BigInt(Date.now() * 1000000); // Convert to nanoseconds
              const isExpired = allowanceResult.expires_at.length > 0 && 
                              allowanceResult.expires_at[0] < now;
              
              if (!isExpired) {
                needsApproval = false;
                console.log('✅ Sufficient allowance already exists, skipping approval');
                updateProgressStep('mint-cknfts', 'loading', 'Using existing cycles allowance...');
              } else {
                console.log('⚠️ Existing allowance is expired, will re-approve');
              }
            } else {
              console.log('⚠️ Existing allowance insufficient, will approve more');
            }
          }
        } catch (allowanceError) {
          console.warn('Could not check current allowance, will approve to be safe:', allowanceError);
        }
        
        // Only approve if needed
        if (needsApproval) {
          console.log('💰 Approving cycles for minting...');
          updateProgressStep('mint-cknfts', 'loading', 'Approving cycles for minting...');
          
          await mutations.cyclesApprove.mutateAsync({
            fee: [],
            memo: [],
            from_subaccount: [],
            created_at_time: [],
            amount: approvalAmount,
            expected_allowance: [],
            expires_at: [BigInt(Date.now() * 1000000) + BigInt(24 * 60 * 60 * 1000000000)], // 1 day
            spender: {
              owner: Principal.fromText(orchestratorCanisterId),
              subaccount: []
            }
          });
          console.log(`✅ Cycles approved: ${approvalAmount} cycles (with 20% buffer) for ${selectedNFTs.length} NFT(s)`);
        }
      } catch (approvalError) {
        console.error('❌ Failed to approve cycles:', approvalError);
        throw new Error(
          `Failed to approve cycles for minting: ${
            approvalError instanceof Error ? approvalError.message : 'Unknown error'
          }`
        );
      }

      // Step 4: Mint ckNFTs on IC
      console.log('🎨 Step 4: Minting ckNFTs on Internet Computer...');
      updateProgressStep('mint-cknfts', 'loading', 'Calling orchestrator mint...');

      const icTransactionIds: string[] = [];
      const mintedTokenIds: string[] = [];

      for (let i = 0; i < selectedNFTs.length; i++) {
        const nft = selectedNFTs[i];
        
        // Skip if already minted on IC (detected during transfer verification)
        const status = nftStatuses.find(s => s.mintAddress === nft.mintAddress);
        if (status?.status === 'completed') {
          console.log(`⏭️  Skipping mint (already minted on IC): ${nft.name}`);
          continue;
        }
        
        // Skip failed transfers
        if (status?.status === 'failed') {
          console.log(`⏭️  Skipping mint for failed transfer: ${nft.name}`);
          continue;
        }

        try {
          updateNFTStatus(nft.mintAddress, { status: 'minting', progress: 'Requesting mint...' });
          console.log(`🎨 Minting ckNFT ${i + 1}:`, nft.name);

          const tokenId = solanaTokenIdFromMint(nft.mintAddress);
          const contractAddress = nft.collection?.address || nft.mintAddress;

          console.log('  Token ID:', tokenId.toString());
          console.log('  Contract:', contractAddress);

          // Call mint method
          const mintRequest = {
            nft: {
              tokenId,
              contract: contractAddress,
              network: targetNetwork,
            },
            resume: [] as [],
            mintToAccount: {
              owner: user.principal!,
              subaccount: [] as [],
            },
            spender: [] as [],
          };

          console.log('  Calling mint method...');
          // Note: Cycles are already approved via ICRC-2 allowance in Step 3
          // The orchestrator will pull from the allowance automatically
          console.log(`  Using cycles from allowance (${mintCosts} total for ${selectedNFTs.length} NFTs)`);
          
          // Second parameter is the account that approved the cycles (user's account)
          // The orchestrator uses this to check the ICRC-2 allowance
          const userAccount = user.principal ? [{
            owner: user.principal,
            subaccount: [] as []
          }] as [typeof mintRequest.mintToAccount] : [] as [];
          
          if (userAccount.length > 0) {
            console.log('  User account for allowance check:', {
              owner: userAccount[0]!.owner.toString(),
              subaccount: userAccount[0]!.subaccount
            });
          } else {
            console.warn('  No user account - cycles approval check will fail!');
          }
          
          const mintResult = await orchestratorActor.mint(mintRequest, userAccount);

          if ('Ok' in mintResult) {
            // mintResult.Ok IS the MintRequestId (bigint), not an object
            const mintRequestId = mintResult.Ok;
            console.log('  ✅ Mint request submitted. ID:', mintRequestId.toString());

            // Store mint request ID for recovery
            storeLocalStorageMintRequestId(nft.mintAddress, mintRequestId);

            // Poll for completion
            updateNFTStatus(nft.mintAddress, { progress: 'Polling mint status...' });
            
            let pollCount = 0;
            const maxPolls = 60; // 60 * 2s = 2 minutes max
            let mintCompleted = false;
            let icTransactionId: string | null = null;

            while (pollCount < maxPolls && !mintCompleted) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
              pollCount++;
              
              const statusResult = await anonymousOrchestratorActor.get_mint_status([mintRequestId]);

              if (statusResult && statusResult.length > 0) {
                const statusOpt = statusResult[0];
                
                // Handle Candid optional: [] = None, [MintStatus] = Some(MintStatus)
                if (Array.isArray(statusOpt) && statusOpt.length > 0) {
                  const latestStatus = statusOpt[0];
                  console.log(`  📊 Mint status poll ${pollCount}/${maxPolls}:`, latestStatus);
                  
                  if (!latestStatus) {
                    console.log('  ⏳ No status available yet, continuing to poll...');
                  } else if ('Complete' in latestStatus) {
                    // Extract transaction details from Complete status
                    const completeInfo = latestStatus.Complete;
                    icTransactionId = completeInfo.mintTrx.toString();
                    
                    console.log('✅ Mint completed successfully!');
                    console.log('   IC Transaction ID:', icTransactionId);
                    if (completeInfo.approvalTrx && completeInfo.approvalTrx.length > 0 && completeInfo.approvalTrx[0]) {
                      console.log('   Approval Transaction ID:', completeInfo.approvalTrx[0].toString());
                    }
                    
                    updateNFTStatus(nft.mintAddress, {
                      status: 'completed',
                      progress: 'Minted successfully',
                      icTransactionId: icTransactionId,
                    });
                    
                    if (icTransactionId) {
                      icTransactionIds.push(icTransactionId);
                    }
                    mintedTokenIds.push(tokenId.toString());
                    mintCompleted = true;
                  } else if ('Err' in latestStatus) {
                    // Mint failed with error
                    const errorDetails = latestStatus.Err;
                    throw new Error(`Mint failed: ${safeStringify(errorDetails)}`);
                  } else {
                    // Still processing - update progress with status name
                    const statusName = Object.keys(latestStatus)[0];
                    let progressMessage = `Status: ${statusName}`;
                    
                    // Add more details for certain statuses
                    if ('CheckingOwner' in latestStatus) {
                      const checkInfo = latestStatus.CheckingOwner;
                      progressMessage = `Checking ownership (query ${checkInfo.nextQuery}, retry ${checkInfo.retries})`;
                    } else if ('RetrievingMetadata' in latestStatus) {
                      const metaInfo = latestStatus.RetrievingMetadata;
                      progressMessage = `Retrieving metadata (query ${metaInfo.nextQuery}, retry ${metaInfo.retries})`;
                    } else if ('Transferring' in latestStatus) {
                      progressMessage = 'Transferring ownership...';
                    } else if ('Minting' in latestStatus) {
                      progressMessage = 'Minting on IC...';
                    }
                    
                    console.log(`  ⏳ ${progressMessage}`);
                    updateNFTStatus(nft.mintAddress, { progress: progressMessage });
                  }
                } else {
                  console.log('  ⏳ Status not yet available, continuing to poll...');
                }
              } else {
                console.log('  ⏳ No status result, continuing to poll...');
              }
            }

            if (!mintCompleted) {
              throw new Error(`Mint timeout - status polling exceeded ${maxPolls} attempts (${maxPolls * 2}s)`);
            }

          } else {
            const error = 'Err' in mintResult ? safeStringify(mintResult.Err) : 'Unknown error';
            throw new Error(`Mint failed: ${error}`);
          }

        } catch (mintError) {
          console.error(`❌ Failed to mint ckNFT for ${nft.name}:`, mintError);
          const errorMessage = mintError instanceof Error ? mintError.message : 'Unknown error';
          updateNFTStatus(nft.mintAddress, {
            status: 'failed',
            error: `Mint failed: ${errorMessage}`,
          });
        }
      }

      updateProgressStep('mint-cknfts', 'success', `${mintedTokenIds.length} ckNFT(s) minted`);

      // Step 4: Complete
      console.log('🎉 Step 4: Bridge complete!');
      updateProgressStep('complete', 'success', 'All operations complete');

      const result: BridgeResult = {
        success: true,
        totalNFTs: selectedNFTs.length,
        successfulTransfers: solanaSignatures.length,
        failedTransfers: failedTransfers.length,
        solanaSignatures,
        icTransactionIds,
        mintedTokenIds,
        canisterAddress,
      };

      setBridgeResult(result);
      
      if (onComplete) {
        onComplete(result);
      }

    } catch (error) {
      console.error('❌ Bridge execution failed:', error);
      updateProgressStep(
        progressSteps.find(s => s.status === 'loading')?.id || 'complete',
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsExecuting(false);
      setCurrentNFTIndex(null);
    }
  };

  const getStatusIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'loading':
        return '🔄';
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
    }
  };

  const getNFTStatusIcon = (status: NFTTransferStatus['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'transferring':
        return '📤';
      case 'minting':
        return '🎨';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Bridge NFTs to Internet Computer
        </h2>
        <p className="text-gray-600">
          Transfer your Solana NFTs and mint them as ckNFTs on the Internet Computer
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 mb-4">Bridge Progress</h3>
        
        {progressSteps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-3">
            <div className="text-2xl">{getStatusIcon(step.status)}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className={`font-medium ${
                  step.status === 'success' ? 'text-green-700' :
                  step.status === 'failed' ? 'text-red-700' :
                  step.status === 'loading' ? 'text-blue-700' :
                  'text-gray-500'
                }`}>
                  {index + 1}. {step.title}
                </p>
              </div>
              {step.message && (
                <p className="text-sm text-gray-600 mt-1">{step.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* NFT Transfer Status */}
      {nftStatuses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">NFT Status ({nftStatuses.length})</h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {nftStatuses.map((status, index) => (
              <div
                key={status.mintAddress}
                className={`p-4 rounded-lg border-2 ${
                  currentNFTIndex === index ? 'border-blue-300 bg-blue-50' :
                  status.status === 'completed' ? 'border-green-200 bg-green-50' :
                  status.status === 'failed' ? 'border-red-200 bg-red-50' :
                  'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{getNFTStatusIcon(status.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{status.name}</p>
                    <p className="text-xs text-gray-500 font-mono truncate">{status.mintAddress}</p>
                    
                    {status.progress && (
                      <p className="text-sm text-gray-600 mt-1">{status.progress}</p>
                    )}
                    
                    {status.solanaSignature && (
                      <a
                        href={`https://solscan.io/tx/${status.solanaSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 block"
                      >
                        View Solana TX →
                      </a>
                    )}
                    
                    {status.error && (
                      <p className="text-sm text-red-600 mt-1">{status.error}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {bridgeResult && (
        <div className={`p-6 rounded-lg border-2 ${
          bridgeResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <h3 className="text-lg font-semibold mb-3">
            {bridgeResult.success ? '🎉 Bridge Complete!' : '⚠️ Bridge Completed with Errors'}
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-600">Total NFTs</p>
              <p className="font-semibold text-gray-900">{bridgeResult.totalNFTs}</p>
            </div>
            <div>
              <p className="text-gray-600">Successful</p>
              <p className="font-semibold text-green-700">{bridgeResult.successfulTransfers}</p>
            </div>
            <div>
              <p className="text-gray-600">Failed</p>
              <p className="font-semibold text-red-700">{bridgeResult.failedTransfers}</p>
            </div>
            <div>
              <p className="text-gray-600">Minted ckNFTs</p>
              <p className="font-semibold text-green-700">{bridgeResult.mintedTokenIds.length}</p>
            </div>
          </div>

          {bridgeResult.canisterAddress && (
            <div className="pt-4 border-t border-green-300">
              <p className="text-sm text-gray-600 mb-1">ckNFT Canister</p>
              <p className="text-sm font-mono font-semibold text-green-800 break-all">
                {bridgeResult.canisterAddress}
              </p>
              <a
                href={`https://dashboard.internetcomputer.org/canister/${bridgeResult.canisterAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1 inline-block"
              >
                View on IC Dashboard →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      {!isExecuting && !bridgeResult && (
        <button
          onClick={executeBridge}
          disabled={!publicKey || !orchestratorActor || selectedNFTs.length === 0}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Start Bridge Execution
        </button>
      )}

      {isExecuting && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-600 mt-2">Processing...</p>
        </div>
      )}
    </div>
  );
}
