import { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle, Loader2, CreditCard, Zap, ArrowRight, Wallet, Clock } from 'lucide-react';
import { Principal } from '@dfinity/principal';
import type { Network, ContractPointer, SolanaCluster } from '../../declarations/orchestrator/orchestrator.did';
import { use99Mutations } from '../../hooks/use99Mutations';
import { useFungibleToken } from '../../hooks/useFungibleToken';
import { useAuth } from '../../hooks/useAuth';
import { useSolana } from '../../hooks/useSolana';
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

// Solana Priority Fee Presets
// Priority fee = (computeUnitLimit × computeUnitPrice) / 1,000,000 lamports
interface PriorityFeePreset {
  name: string;
  description: string;
  computeUnitPrice: number; // micro-lamports per compute unit
  computeUnitLimit: number; // max compute units
}

const SOLANA_PRIORITY_PRESETS: PriorityFeePreset[] = [
  {
    name: 'None',
    description: 'No priority fee (may be slower during congestion)',
    computeUnitPrice: 0,
    computeUnitLimit: 200_000, // Default
  },
  {
    name: 'Low',
    description: 'Minimal priority (~0.0002 SOL)',
    computeUnitPrice: 1_000, // 1,000 micro-lamports/CU
    computeUnitLimit: 200_000,
  },
  {
    name: 'Medium',
    description: 'Standard priority (~0.003 SOL)',
    computeUnitPrice: 10_000, // 10,000 micro-lamports/CU
    computeUnitLimit: 300_000,
  },
  {
    name: 'High',
    description: 'Fast priority (~0.015 SOL)',
    computeUnitPrice: 50_000, // 50,000 micro-lamports/CU
    computeUnitLimit: 300_000,
  },
];

export interface SelectedICNFT {
  tokenId: string;
  canisterId: string;
  owner: Principal;
  image?: string;
  name?: string;
  description?: string;
}

export interface SolanaNetworkInfo {
  name: string;
  endpoint: string;
  deployed: boolean; // Whether the collection is already deployed on Solana
  collectionAddress?: string; // Solana collection mint address if already deployed
}

export interface SolanaExportCostStepProps {
  /** Selected NFTs to export */
  selectedNFTs: SelectedICNFT[];
  /** Target Solana network */
  targetNetwork: SolanaNetworkInfo | null;
  /** Source contract pointer (IC canister) */
  sourceContractPointer: ContractPointer | null;
  /** Callback when costs are calculated */
  onCostsCalculated: (costs: bigint) => void;
  /** Callback when collection deployment completes (with collection address) */
  onDeploymentComplete?: (collectionAddress: string) => void;
  /** Callback when ready state changes (both SOL funded and cycles approved) */
  onReadyStateChange?: (isReady: boolean) => void;
}

interface CostBreakdown {
  collectionDeployment?: bigint; // Cost to deploy new Metaplex collection
  nftMinting: bigint; // Cost to mint NFTs on Solana
  solanaRentFees: string; // SOL needed for rent-exempt accounts (not cycles)
  total: bigint; // Total cycles needed
}

interface SolanaFeeInfo {
  network: string;
  lamportsPerSignature: number; // Current fee per transaction signature
  solPrice: string; // Estimated SOL price
  estimatedConfirmationTime: string;
}

export function SolanaExportCostStep({
  selectedNFTs,
  targetNetwork,
  sourceContractPointer,
  onCostsCalculated,
  onDeploymentComplete,
  onReadyStateChange,
}: SolanaExportCostStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [solanaFeeInfo, setSolanaFeeInfo] = useState<SolanaFeeInfo | null>(null);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [approvalInProgress, setApprovalInProgress] = useState(false);
  const [cyclesBalance, setCyclesBalance] = useState<bigint | null>(null);
  const [solBalance, setSolBalance] = useState<string | null>(null);
  const [estimatedRentSOL, setEstimatedRentSOL] = useState<string | null>(null);
  const [fundingAddress, setFundingAddress] = useState<string | null>(null);
  const [isReExport, setIsReExport] = useState(false); // Whether this is a re-export (NFT was burned back)
  const [deploymentInProgress, setDeploymentInProgress] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<{ address: string; txHash?: string } | null>(null);
  const [allowanceStatus, setAllowanceStatus] = useState<{
    amount: bigint;
    isExpired: boolean;
    isSufficient: boolean;
  } | null>(null);
  // const [ckNFTAllowanceStatus, setCkNFTAllowanceStatus] = useState<{
  //   amount: bigint;
  //   isExpired: boolean;
  //   isSufficient: boolean;
  // } | null>(null);
  const [selectedPriorityFee, setSelectedPriorityFee] = useState<PriorityFeePreset>(SOLANA_PRIORITY_PRESETS[0]); // Default: None

  // Use the 99 mutations hook for orchestrator queries
  const mutations = use99Mutations(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai');
  
  // Get user authentication state
  const { user } = useAuth();
  
  // Solana wallet integration
  const { publicKey, sendTransaction } = useSolana();
  const [fundingInProgress, setFundingInProgress] = useState(false);
  
  // Cycles ledger integration for balance and allowance tracking
  const CYCLES_LEDGER_CANISTER_ID = process.env.CYCLES_LEDGER_CANISTER_ID || 'um5iw-rqaaa-aaaaq-qaaba-cai';
  const cyclesToken = useFungibleToken(CYCLES_LEDGER_CANISTER_ID);
  
  // Get user's cycles balance
  const userAccount = user?.principal ? {
    owner: typeof user.principal === 'string' ? Principal.fromText(user.principal) : user.principal,
    subaccount: [] as []
  } : undefined;
  
  const balanceQuery = cyclesToken.useBalance(userAccount);
  
  // Get current allowance for the ckNFT canister (the actual spender for IC-native NFTs)
  const ckNFTCanisterId = selectedNFTs.length > 0 ? selectedNFTs[0]?.canisterId : undefined;
  const ckNFTAllowanceParams = ckNFTCanisterId && userAccount ? {
    account: userAccount,
    spender: {
      owner: Principal.fromText(ckNFTCanisterId),
      subaccount: [] as [],
    },
  } : undefined;
  const ckNFTAllowanceQuery = cyclesToken.useAllowance(ckNFTAllowanceParams);
  
  // Track cycles balance and allowance status
  useEffect(() => {
    if (balanceQuery.data !== undefined) {
      setCyclesBalance(balanceQuery.data);
    }
  }, [balanceQuery.data]);
  
  // Track ckNFT canister allowance (used for casting)
  useEffect(() => {
    console.log('🔍 Solana Export - ckNFT allowance status update:', {
      hasAllowanceData: !!ckNFTAllowanceQuery.data,
      allowanceAmount: ckNFTAllowanceQuery.data?.allowance?.toString(),
      isExpired: ckNFTAllowanceQuery.data?.expires_at,
      costBreakdownCasting: costBreakdown?.nftMinting?.toString(),
    });
    
    if (ckNFTAllowanceQuery.data && costBreakdown?.nftMinting) {
      const now = BigInt(Date.now() * 1000000); // Current time in nanoseconds
      const expiresAt = ckNFTAllowanceQuery.data.expires_at?.[0];
      const isExpired = expiresAt !== undefined && expiresAt < now;
      
      const requiredWithBuffer = (costBreakdown.nftMinting * BigInt(120)) / BigInt(100);
      const newAllowanceStatus = {
        amount: ckNFTAllowanceQuery.data.allowance,
        isExpired,
        isSufficient: ckNFTAllowanceQuery.data.allowance >= requiredWithBuffer && !isExpired,
      };
      
      console.log('🔍 Setting ckNFT allowance status:', newAllowanceStatus);
      setAllowanceStatus(newAllowanceStatus);
      
      // Auto-update payment approval status based on allowance
      setPaymentApproved(newAllowanceStatus.isSufficient);
    }
  }, [ckNFTAllowanceQuery.data, costBreakdown?.nftMinting]);

  // Track ready state and notify parent (both cycles approved AND SOL funded)
  useEffect(() => {
    const hasSufficientSOL = solBalance && estimatedRentSOL && 
      parseFloat(solBalance) >= (parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee));
    
    const isReady = paymentApproved && hasSufficientSOL;
    
    console.log('🔍 Ready state check:', {
      paymentApproved,
      solBalance,
      estimatedRentSOL,
      priorityFeeSOL: calculatePriorityFeeSOL(selectedPriorityFee),
      hasSufficientSOL,
      isReady,
    });
    
    if (onReadyStateChange) {
      onReadyStateChange(!!isReady);
    }
  }, [paymentApproved, solBalance, estimatedRentSOL, selectedPriorityFee, onReadyStateChange]);

  const networkName = useMemo(() => {
    if (!targetNetwork) return 'Unknown';
    return targetNetwork.name;
  }, [targetNetwork]);

  // Helper to convert network name to SolanaCluster variant
  const getSolanaCluster = (networkName: string): SolanaCluster => {
    switch (networkName.toLowerCase()) {
      case 'mainnet-beta':
      case 'mainnet':
        return { Mainnet: null };
      case 'devnet':
        return { Devnet: null };
      case 'testnet':
        return { Testnet: null };
      case 'localnet':
      case 'localhost':
        // Use Custom with the RPC URL as identifier
        // The orchestrator must have MapNetwork configured for this Custom network
        return { Custom: "http://127.0.0.1:8899" };
      default:
        // For unknown custom networks, use the network name as identifier
        // The orchestrator must have MapNetwork configured for this Custom network
        return { Custom: networkName };
    }
  };

  // Calculate export costs for Solana
  useEffect(() => {
    const calculateCosts = async () => {
      if (!selectedNFTs.length || !targetNetwork || !sourceContractPointer) {
        setCostBreakdown(null);
        onCostsCalculated(0n);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('🔍 Calculating Solana export costs for:', {
          nftCount: selectedNFTs.length,
          network: networkName,
          collectionDeployed: targetNetwork.deployed,
          sourceContract: sourceContractPointer,
        });

        let collectionDeployment: bigint | undefined;
        let nftMinting: bigint = 0n;

        // 1. Calculate collection deployment cost (if needed) - NO FALLBACKS
        if (!targetNetwork.deployed) {
          console.log('📊 Getting Solana collection deployment cost...');
          // Create Solana network variant for orchestrator
          const solanaCluster = getSolanaCluster(targetNetwork.name);
          const solanaNetwork: Network = { Solana: [solanaCluster] };
          
          // Query orchestrator for remote deployment cost
          const deploymentCost = await mutations.getRemoteCost.mutateAsync({
            pointer: sourceContractPointer,
            network: solanaNetwork,
          });
          
          if (deploymentCost === undefined || deploymentCost === null) {
            throw new Error('Failed to get deployment cost from orchestrator');
          }
          
          collectionDeployment = BigInt(deploymentCost);
          console.log('💰 Collection deployment cost:', collectionDeployment.toString());
        }

        // 2. Calculate NFT minting costs
        try {
          console.log('📊 Getting Solana NFT minting costs...');
          
          // Get the ckNFT canister for the source contract
          const ckNFTCanisters = await mutations.getCkNFTCanister.mutateAsync([sourceContractPointer]);
          const ckNFTCanisterId = ckNFTCanisters[0];
          
          if (ckNFTCanisterId) {
            console.log(`🔍 Using ckNFT canister ${ckNFTCanisterId.toString()} for cast cost calculations`);
            
            // Get the Solana funding address from orchestrator
            // This is the address that needs SOL to pay for transactions and rent
            try {
              console.log('🔑 Getting Solana funding address from orchestrator...');
              const solanaCluster = getSolanaCluster(targetNetwork.name);
              const solanaNetwork: Network = { Solana: [solanaCluster] };
              
              const addressResult = await mutations.getICRC99Address.mutateAsync({
                canister: ckNFTCanisterId,
                network: solanaNetwork,
              });
              
              if (addressResult) {
                const solanaAddress = addressResult;
                console.log('🔑 Solana funding address:', solanaAddress);
                setFundingAddress(solanaAddress);
                
                // Check SOL balance at this address
                try {
                  const connection = new Connection(targetNetwork.endpoint, 'confirmed');
                  const publicKey = new PublicKey(solanaAddress);
                  const balance = await connection.getBalance(publicKey);
                  const solAmount = (balance / LAMPORTS_PER_SOL).toFixed(4);
                  console.log(`💰 Current SOL balance at funding address: ${solAmount} SOL`);
                  setSolBalance(solAmount);
                } catch (balanceError) {
                  console.error('Failed to fetch SOL balance:', balanceError);
                  setSolBalance('0.0000');
                }
              } else {
                console.warn('No funding address returned from orchestrator');
                setFundingAddress(null);
              }
            } catch (addressError) {
              console.error('Failed to get funding address:', addressError);
              setFundingAddress(null);
            }
            
            // Call icrc99_cast_cost to get accurate casting costs - NO FALLBACKS
            console.log("📊 Calling icrc99_cast_cost for accurate Solana NFT minting costs...");
            
            // Create the ckNFT actor to call icrc99_cast_cost (uses anonymous agent for query)
            const { createActor } = await import("../../declarations/ckNFT");
            const ckNFTActor = createActor(ckNFTCanisterId.toString());
            
            // Create network variant for the cost query
            const solanaCluster = getSolanaCluster(targetNetwork.name);
            const ckNFTNetwork = { Solana: [solanaCluster] };
            
            // Build CastCostRequest (RemoteNFTPointer) with network, contract, and tokenId
            // We use a sample tokenId since cost is per-NFT and doesn't depend on specific token
            const castCostRequest = {
              network: ckNFTNetwork,
              contract: targetNetwork.collectionAddress || '', // Collection address (if deployed)
              tokenId: BigInt(0), // Sample token ID - cost doesn't vary by token
            };
            
            console.log('📊 Cast cost request:', castCostRequest);
            
            // Call icrc99_cast_cost with the RemoteNFTPointer
            const costResult = await (ckNFTActor as any).icrc99_cast_cost(castCostRequest);
            console.log("💰 icrc99_cast_cost result:", costResult);
            
            // Parse the cost result - it's returned directly as a Nat (BigInt)
            if (costResult === undefined || costResult === null) {
              throw new Error("No cost returned from icrc99_cast_cost - this should never happen");
            }
            
            // costResult is already a BigInt, no need to convert
            const costPerNFT = typeof costResult === 'bigint' ? costResult : BigInt(costResult);
            nftMinting = costPerNFT * BigInt(selectedNFTs.length);
            console.log(`💰 Cast cost: ${costPerNFT.toString()} cycles per NFT × ${selectedNFTs.length} NFTs = ${nftMinting.toString()} total`);
          } else {
            throw new Error('No ckNFT canister ID available - cannot calculate cast costs');
          }
          
        } catch (castError) {
          console.error('❌ Failed to get cast costs:', castError);
          throw new Error(`Failed to calculate NFT casting costs: ${castError instanceof Error ? castError.message : String(castError)}`);
        }

        // 3. Calculate Solana rent fees (in SOL, not cycles)
        let solanaRentFees: string = '0.000';
        let solanFundingAddress: string | null = null;
        // let isReExport = false;
        
        try {
          console.log('🔍 Getting Solana funding address for export operations...');
          console.log('🔍 Source contract:', sourceContractPointer.contract);
          console.log('🔍 Target network:', networkName);
          console.log('🔍 NFT TokenId:', selectedNFTs[0]);
          
          const solanaCluster = getSolanaCluster(targetNetwork.name);
          const solanaNetwork: Network = { Solana: [solanaCluster] };
          
          // Extract canister principal from contract string
          let canisterPrincipal: Principal;
          try {
            canisterPrincipal = Principal.fromText(sourceContractPointer.contract);
          } catch (e) {
            console.error('Failed to parse canister principal:', sourceContractPointer.contract);
            throw new Error('Invalid canister principal');
          }

          // Step 1: Check if this is a re-export (NFT was burned back to IC)
          // Call icrc99_cast_fund_address to see if there's an approval address holding the NFT
          console.log('🔍 Checking if NFT needs re-export funding (icrc99_cast_fund_address)...');
          const castFundResult = await mutations.getCastFundAddress.mutateAsync({
            ckNFTCanisterId: canisterPrincipal,
            tokenId: BigInt(selectedNFTs[0].tokenId),
          });

          if (castFundResult) {
            // Re-export: NFT exists on Solana and was burned back to IC
            // It's currently at an approval address that needs SOL for transfer
            setIsReExport(true);
            solanFundingAddress = castFundResult.address;
            console.log('✅ Re-export detected - NFT at approval address:', solanFundingAddress);
            console.log('🔍 This address needs SOL to transfer the NFT');
          } else {
            // Fresh export: NFT hasn't been minted to Solana yet (or hasn't been burned back)
            // Use the canister's main ICRC99 address for collection deployment + minting
            setIsReExport(false);
            console.log('🔍 Fresh export - getting canister ICRC99 address...');
            solanFundingAddress = await mutations.getICRC99Address.mutateAsync({
              canister: canisterPrincipal,
              network: solanaNetwork,
            });
            console.log('✅ Got canister ICRC99 address (payer):', solanFundingAddress);
          }
          
          if (solanFundingAddress) {
            setFundingAddress(solanFundingAddress);
            console.log('✅ Got Solana ICRC99 address (payer):', solanFundingAddress);
            
            // Calculate actual rent costs based on Solana RPC
            try {
              const connection = new Connection(targetNetwork.endpoint, 'confirmed');
              
              // Estimate rent for accounts with accurate sizes
              // Reference: Metaplex Token Metadata program account sizes
              // - Mint account: 82 bytes (SPL Token)
              // - Token account (ATA): 165 bytes
              // - Metadata account: ~679 bytes base + variable (name, symbol, URI)
              // - Master Edition: 282 bytes
              
              let totalRentLamports = 0;
              
              if (!targetNetwork.deployed) {
                // Collection deployment requires:
                // 1. Mint account (82 bytes)
                const collectionMintRent = await connection.getMinimumBalanceForRentExemption(82);
                // 2. Associated Token Account for holding the NFT (165 bytes)
                const collectionAtaRent = await connection.getMinimumBalanceForRentExemption(165);
                // 3. Metadata PDA (use larger size to account for name/symbol/URI - 800 bytes)
                const collectionMetadataRent = await connection.getMinimumBalanceForRentExemption(800);
                // 4. Master Edition PDA (282 bytes)
                const collectionMasterRent = await connection.getMinimumBalanceForRentExemption(282);
                
                totalRentLamports += collectionMintRent + collectionAtaRent + collectionMetadataRent + collectionMasterRent;
                
                console.log('💰 Collection rent breakdown:', {
                  mintRent: collectionMintRent,
                  ataRent: collectionAtaRent,
                  metadataRent: collectionMetadataRent,
                  masterRent: collectionMasterRent,
                  total: collectionMintRent + collectionAtaRent + collectionMetadataRent + collectionMasterRent,
                });
              }
              
              // Each NFT requires the same 4 accounts
              const nftMintRent = await connection.getMinimumBalanceForRentExemption(82);
              const nftAtaRent = await connection.getMinimumBalanceForRentExemption(165);
              const nftMetadataRent = await connection.getMinimumBalanceForRentExemption(800);
              const nftMasterRent = await connection.getMinimumBalanceForRentExemption(282);
              const perNFTRent = nftMintRent + nftAtaRent + nftMetadataRent + nftMasterRent;
              totalRentLamports += perNFTRent * selectedNFTs.length;
              
              // Add transaction fees (5000 lamports per signature)
              // Collection: 6 instructions = ~6 signatures
              // Each NFT: 6 instructions = ~6 signatures
              const estimatedSignatures = (targetNetwork.deployed ? 0 : 6) + (selectedNFTs.length * 6);
              totalRentLamports += estimatedSignatures * 5000;
              
              // Add recipient ATA creation if needed (~0.002 SOL per NFT)
              totalRentLamports += selectedNFTs.length * 2_000_000; // 0.002 SOL in lamports
              
              // Add 50% safety margin for:
              // - Account size variations
              // - Priority fees (can be significant)
              // - Additional ATAs or PDAs that might be needed
              // - Network congestion
              totalRentLamports = Math.ceil(totalRentLamports * 1.5);
              
              solanaRentFees = (totalRentLamports / LAMPORTS_PER_SOL).toFixed(6);
              setEstimatedRentSOL(solanaRentFees);
              
              console.log('💰 Solana rent calculation:', {
                totalRentLamports,
                solanaRentFees,
                nftCount: selectedNFTs.length,
                collectionDeployed: targetNetwork.deployed,
              });
              
              // Check SOL balance of funding address
              console.log('🔍 Checking SOL balance at funding address:', solanFundingAddress);
              const fundingPubkey = new PublicKey(solanFundingAddress);
              console.log('🔍 Created PublicKey:', fundingPubkey.toBase58());
              
              const balanceLamports = await connection.getBalance(fundingPubkey);
              console.log('🔍 Balance in lamports:', balanceLamports);
              
              const balanceSOL = (balanceLamports / LAMPORTS_PER_SOL).toFixed(6);
              setSolBalance(balanceSOL);
              
              console.log('✅ SOL balance check complete:', {
                address: solanFundingAddress,
                balanceLamports,
                balanceSOL,
                requiredSOL: solanaRentFees,
                hasSufficient: parseFloat(balanceSOL) >= parseFloat(solanaRentFees),
              });
              
            } catch (solanaError) {
              console.warn('Failed to get Solana rent estimates:', solanaError);
              // Fallback estimation
              const estimatedSOL = targetNetwork.deployed 
                ? 0.01 * selectedNFTs.length // 0.01 SOL per NFT mint
                : 0.05 + (0.01 * selectedNFTs.length); // 0.05 for collection + 0.01 per NFT
              solanaRentFees = estimatedSOL.toFixed(6);
              setEstimatedRentSOL(solanaRentFees);
            }
          } else {
            console.warn('💰 No funding address returned from orchestrator');
            setFundingAddress(null);
          }
          
        } catch (fundingAddressError) {
          console.error('❌ Failed to get Solana funding address:', fundingAddressError);
          throw new Error(`Failed to get funding address and calculate SOL rent: ${fundingAddressError instanceof Error ? fundingAddressError.message : String(fundingAddressError)}`);
        }

        // 4. Calculate total cycles needed (rent is paid separately in SOL)
        const total = (collectionDeployment || 0n) + nftMinting;

        const breakdown: CostBreakdown = {
          collectionDeployment,
          nftMinting,
          solanaRentFees,
          total,
        };

        console.log('💰 Final Solana cost breakdown:', {
          collectionDeployment: breakdown.collectionDeployment?.toString(),
          nftMinting: breakdown.nftMinting.toString(),
          solanaRentFees: breakdown.solanaRentFees,
          total: breakdown.total.toString(),
        });

        setCostBreakdown(breakdown);
        onCostsCalculated(total);

      } catch (err) {
        console.error('Error calculating Solana export costs:', err);
        setError(err instanceof Error ? err.message : 'Failed to calculate export costs');
        setCostBreakdown(null);
        onCostsCalculated(0n);
      } finally {
        setLoading(false);
      }
    };

    calculateCosts();
  }, [selectedNFTs, targetNetwork, sourceContractPointer, networkName]); // Removed mutations and onCostsCalculated to prevent infinite loop

  // Fetch Solana fee information
  useEffect(() => {
    const fetchSolanaFees = async () => {
      if (!targetNetwork || solanaFeeInfo) return;

      try {
        console.log('⛽ Fetching Solana fee data for:', targetNetwork.name);
        
        const connection = new Connection(targetNetwork.endpoint, 'confirmed');
        
        // Get recent fees
        const recentBlockhash = await connection.getLatestBlockhash();
        const fees = await connection.getFeeForMessage(
          new (await import('@solana/web3.js')).TransactionMessage({
            payerKey: new PublicKey('11111111111111111111111111111111'),
            recentBlockhash: recentBlockhash.blockhash,
            instructions: [],
          }).compileToV0Message()
        );
        
        const lamportsPerSignature = fees.value || 5000;
        
        setSolanaFeeInfo({
          network: targetNetwork.name,
          lamportsPerSignature,
          solPrice: '$0.03', // Rough estimate, could enhance with price API
          estimatedConfirmationTime: targetNetwork.name === 'mainnet-beta' ? '10-20 seconds' : '1-5 seconds',
        });
        
        console.log('⛽ Solana fees fetched:', {
          lamportsPerSignature,
          network: targetNetwork.name,
        });
        
      } catch (error) {
        console.error('Error fetching Solana fees:', error);
        // Fallback
        setSolanaFeeInfo({
          network: targetNetwork.name,
          lamportsPerSignature: 5000,
          solPrice: '$0.03',
          estimatedConfirmationTime: '10-20 seconds',
        });
      }
    };

    fetchSolanaFees();
  }, [targetNetwork, solanaFeeInfo]);

  // Format cycles to TCycles (accounting for 12 decimals)
  const formatCycles = (cycles: bigint): string => {
    const decimals = 12;
    const divisor = BigInt(10 ** decimals);
    const whole = cycles / divisor;
    const fraction = cycles % divisor;
    const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 3);
    return `${whole.toLocaleString()}.${fractionStr} TC`;
  };

  // Calculate priority fee in SOL
  const calculatePriorityFeeSOL = (preset: PriorityFeePreset): number => {
    // Priority fee = (computeUnitLimit × computeUnitPrice) / 1,000,000 lamports
    const priorityFeeLamports = (preset.computeUnitLimit * preset.computeUnitPrice) / 1_000_000;
    return priorityFeeLamports / LAMPORTS_PER_SOL;
  };

  // Approve payment with 120% buffer
  // This needs TWO separate approvals:
  // 1. Approval to orchestrator for collection deployment (if needed)
  // 2. Approval to ckNFT canister for NFT casting
  const handleApprovePayment = async () => {
    if (!costBreakdown || !user?.principal) return;

    setApprovalInProgress(true);
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Approving cycles payment for Solana export...', {
        totalCost: costBreakdown.total.toString(),
        deploymentCost: costBreakdown.collectionDeployment?.toString() || '0',
        castingCost: costBreakdown.nftMinting.toString(),
        userBalance: cyclesBalance?.toString() || 'unknown',
        needsDeployment: !!costBreakdown.collectionDeployment,
      });

      // Check if user has sufficient balance
      const requiredWithBuffer = (costBreakdown.total * BigInt(120)) / BigInt(100);
      if (cyclesBalance !== null && cyclesBalance < requiredWithBuffer) {
        throw new Error(`Insufficient cycles balance. You have ${formatCycles(cyclesBalance)} but need ${formatCycles(requiredWithBuffer)} (including 120% buffer).`);
      }

      const oneDayInNanoseconds = BigInt(24 * 60 * 60 * 1000000000);
      const expiryTime = BigInt(Date.now() * 1000000) + oneDayInNanoseconds;

      // APPROVAL 1: Approve orchestrator for collection deployment (if needed)
      if (costBreakdown.collectionDeployment && costBreakdown.collectionDeployment > 0n) {
        const deploymentApprovalAmount = (costBreakdown.collectionDeployment * BigInt(120)) / BigInt(100);
        console.log('📝 Submitting cycles approval to ORCHESTRATOR for collection deployment...', {
          approvalAmount: deploymentApprovalAmount.toString(),
          originalAmount: costBreakdown.collectionDeployment.toString(),
          expiryTime: expiryTime.toString(),
          spender: process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai',
        });

        await mutations.cyclesApprove.mutateAsync({
          fee: [],
          memo: [],
          from_subaccount: [],
          created_at_time: [],
          amount: deploymentApprovalAmount,
          expected_allowance: [],
          expires_at: [expiryTime],
          spender: {
            owner: Principal.fromText(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai'),
            subaccount: []
          }
        });
        console.log('✅ Orchestrator approval complete for deployment');
      }

      // APPROVAL 2: Approve ckNFT canister for NFT casting
      // The ckNFT canister will call the orchestrator on behalf of the user
      const ckNFTCanisterId = selectedNFTs[0]?.canisterId;
      if (!ckNFTCanisterId) {
        throw new Error('No ckNFT canister ID available for approval');
      }

      const castingApprovalAmount = (costBreakdown.nftMinting * BigInt(120)) / BigInt(100);
      console.log('📝 Submitting cycles approval to ckNFT CANISTER for NFT casting...', {
        approvalAmount: castingApprovalAmount.toString(),
        originalAmount: costBreakdown.nftMinting.toString(),
        expiryTime: expiryTime.toString(),
        spender: ckNFTCanisterId,
      });

      await mutations.cyclesApprove.mutateAsync({
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        amount: castingApprovalAmount,
        expected_allowance: [],
        expires_at: [expiryTime],
        spender: {
          owner: Principal.fromText(ckNFTCanisterId),
          subaccount: []
        }
      });

      console.log('✅ Cycles approval successful!');
      
      // Force refresh of allowance data
      await ckNFTAllowanceQuery.refetch();
      await balanceQuery.refetch();
      
      setPaymentApproved(true);
      
    } catch (err) {
      console.error('❌ Error approving cycles payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve cycles payment');
      setPaymentApproved(false);
    } finally {
      setApprovalInProgress(false);
      setLoading(false);
    }
  };

  // Transfer SOL to funding address
  const handleFundAddress = async () => {
    if (!fundingAddress || !targetNetwork || !publicKey || !sendTransaction || !estimatedRentSOL) return;

    setFundingInProgress(true);
    setError(null);
    
    try {
      console.log('💸 Transferring SOL to funding address...', {
        from: publicKey.toBase58(),
        to: fundingAddress,
        amount: estimatedRentSOL,
      });

      // Create connection to Solana network
      const connection = new Connection(targetNetwork.endpoint, 'confirmed');
      
      // Convert SOL amount to lamports and add a small buffer for fees
      const amountLamports = Math.ceil(parseFloat(estimatedRentSOL) * LAMPORTS_PER_SOL * 1.05); // 5% buffer for tx fees
      
      // Create transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(fundingAddress),
          lamports: amountLamports,
        })
      );
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      console.log('📤 Sending transaction...');
      
      // Send transaction using wallet adapter (connection is already bound in useSolana)
      const signature = await sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      
      console.log('⏳ Confirming transaction...', signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log('✅ SOL transfer successful!', signature);
      
      // Refresh SOL balance
      const newBalance = await connection.getBalance(new PublicKey(fundingAddress));
      const newBalanceSOL = (newBalance / LAMPORTS_PER_SOL).toFixed(6);
      setSolBalance(newBalanceSOL);
      
      alert(`Successfully transferred ${(amountLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL!\nTransaction: ${signature}`);
      
    } catch (err) {
      console.error('❌ Error transferring SOL:', err);
      setError(err instanceof Error ? err.message : 'Failed to transfer SOL');
    } finally {
      setFundingInProgress(false);
    }
  };

  // Deploy collection to Solana
  const handleDeployCollection = async () => {
    if (!sourceContractPointer || !targetNetwork || !user?.principal) return;

    setDeploymentInProgress(true);
    setError(null);
    
    try {
      console.log('🚀 Deploying collection to Solana...', {
        sourceContract: sourceContractPointer.contract,
        targetNetwork: networkName,
      });

      // Convert to orchestrator Network type
      const solanaCluster = getSolanaCluster(networkName);
      const orchestratorNetwork: Network = { Solana: [solanaCluster] };

      // STEP 1: Call create_remote to initiate deployment (returns { Ok: remoteId } or { Err })
      // Pass selected priority fee parameters for Solana compute budget instructions
      const createResult = await mutations.createRemoteContract.mutateAsync({
        pointer: sourceContractPointer,
        network: orchestratorNetwork,
        gasPrice: BigInt(selectedPriorityFee.computeUnitPrice), // micro-lamports per compute unit
        gasLimit: BigInt(selectedPriorityFee.computeUnitLimit), // max compute units
        maxPriorityFeePerGas: 0n, // Not used for Solana
        spender: {
          owner: user.principal,
          subaccount: []
        }
      });

      // Extract remoteId from Result
      if (!('Ok' in createResult)) {
        throw new Error('Failed to initiate deployment: ' + JSON.stringify(createResult));
      }
      
      const remoteId = createResult.Ok;
      console.log('✅ Collection deployment initiated with remoteId:', remoteId);
      
      // STEP 2: Poll for deployment status
      console.log('⏳ Polling for deployment completion...');
      const maxAttempts = 60; // 60 attempts x 5 seconds = 5 minutes max
      let attempts = 0;
      let deployed = false;
      
      while (attempts < maxAttempts && !deployed) {
        attempts++;
        console.log(`🔍 Checking deployment status (attempt ${attempts}/${maxAttempts})...`);
        
        // Wait 5 seconds between polls
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Query status
        const statusResult = await mutations.getRemoteStatus.mutateAsync([remoteId]);
        
        if (statusResult && statusResult.length > 0 && statusResult[0]) {
          const status = statusResult[0];
          console.log('📊 Deployment status:', {
            confirmed: status.confirmed,
            address: status.address,
            txHash: status.deploymentTrx,
          });
          
          if (status.confirmed && status.address) {
            // Deployment complete!
            console.log('✅ Collection deployed successfully!');
            setDeploymentResult({
              address: status.address,
              txHash: status.deploymentTrx,
            });
            deployed = true;
            
            // Notify parent component that deployment is complete
            if (onDeploymentComplete) {
              onDeploymentComplete(status.address);
            }
          } else {
            console.log('⏳ Deployment still pending...');
          }
        } else {
          console.log('⚠️ No status found for remoteId:', remoteId);
        }
      }
      
      if (!deployed) {
        throw new Error('Deployment timed out after 5 minutes. Please check the orchestrator logs.');
      }
      
    } catch (err) {
      console.error('❌ Error deploying collection:', err);
      setError(err instanceof Error ? err.message : 'Failed to deploy collection');
    } finally {
      setDeploymentInProgress(false);
    }
  };

  if (loading && !costBreakdown) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 text-cyan-600 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Calculating Solana Export Costs</h3>
        <p className="text-gray-600">
          Estimating costs for {selectedNFTs.length} NFT{selectedNFTs.length !== 1 ? 's' : ''}
          {targetNetwork?.deployed ? '' : ' and collection deployment'}...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Calculating Costs</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!costBreakdown) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Calculate Costs</h3>
        <p className="text-gray-600">Please check your export configuration and try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Solana Export Costs</h3>
        <p className="text-gray-600">
          Review the costs for exporting your {selectedNFTs.length} NFT{selectedNFTs.length !== 1 ? 's' : ''} to {networkName}.
        </p>
      </div>

      {/* Export Summary */}
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <h4 className="font-medium text-cyan-800 mb-3">Export Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-cyan-600">NFTs:</span>
            <span className="ml-2 font-medium text-cyan-800">
              {selectedNFTs.length} token{selectedNFTs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div>
            <span className="text-cyan-600">Target Network:</span>
            <span className="ml-2 font-medium text-cyan-800">{networkName}</span>
          </div>
          <div>
            <span className="text-cyan-600">Collection:</span>
            <span className="ml-2 font-medium text-cyan-800">
              {targetNetwork?.deployed ? 'Existing' : 'New Deployment'}
            </span>
          </div>
          <div>
            <span className="text-cyan-600">Operation:</span>
            <span className="ml-2 font-medium text-cyan-800">Cast to Solana</span>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Cost Breakdown</h4>
        
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {/* NFT Minting */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="w-5 h-5 text-cyan-600 mr-3" />
              <div>
                <h5 className="font-medium text-gray-900">NFT Minting</h5>
                <p className="text-sm text-gray-600">
                  Mint {selectedNFTs.length} NFT{selectedNFTs.length !== 1 ? 's' : ''} on {networkName}
                </p>
              </div>
            </div>
            <span className="font-medium text-gray-900">{formatCycles(costBreakdown.nftMinting)}</span>
          </div>

          {/* Collection Deployment */}
          {costBreakdown.collectionDeployment && (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <h5 className="font-medium text-gray-900">Collection Deployment</h5>
                  <p className="text-sm text-gray-600">Deploy new Metaplex collection on {networkName}</p>
                </div>
              </div>
              <span className="font-medium text-gray-900">{formatCycles(costBreakdown.collectionDeployment)}</span>
            </div>
          )}

          {/* Solana Rent Fees */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <ArrowRight className="w-5 h-5 text-purple-600 mr-3" />
              <div>
                <h5 className="font-medium text-gray-900">Solana Rent & Priority Fees</h5>
                <p className="text-sm text-gray-600">
                  Mint + ATA + Metadata + Master Edition accounts (10% safety margin)
                </p>
                {solBalance && estimatedRentSOL && (
                  <p className="text-xs text-gray-500 mt-1">
                    Balance: {parseFloat(solBalance).toFixed(4)} SOL
                    {fundingAddress && (
                      <span className="text-gray-400 ml-1">({fundingAddress.slice(0, 6)}...{fundingAddress.slice(-4)})</span>
                    )}
                    {parseFloat(solBalance) < (parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee)) && (
                      <span className="text-red-600 ml-1">⚠️ Insufficient</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="font-medium text-gray-900">
                {(parseFloat(costBreakdown.solanaRentFees) + calculatePriorityFeeSOL(selectedPriorityFee)).toFixed(6)} SOL
              </span>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>Rent: {costBreakdown.solanaRentFees} SOL</div>
                <div>Priority: {calculatePriorityFeeSOL(selectedPriorityFee).toFixed(6)} SOL</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Solana Fee Information */}
      {solanaFeeInfo && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-800 mb-2">Current Solana Fees</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-purple-600">Network:</span>
              <span className="ml-2 font-medium text-purple-800">{solanaFeeInfo.network}</span>
            </div>
            <div>
              <span className="text-purple-600">Fee per Signature:</span>
              <span className="ml-2 font-medium text-purple-800">{solanaFeeInfo.lamportsPerSignature} lamports</span>
            </div>
            <div>
              <span className="text-purple-600">SOL Price:</span>
              <span className="ml-2 font-medium text-purple-800">{solanaFeeInfo.solPrice}</span>
            </div>
            <div>
              <span className="text-purple-600">Confirmation:</span>
              <span className="ml-2 font-medium text-purple-800">{solanaFeeInfo.estimatedConfirmationTime}</span>
            </div>
          </div>
        </div>
      )}

      {/* Priority Fee Selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Priority Fee</h4>
          <span className="text-sm text-gray-600">
            Optional: speed up transaction confirmation
          </span>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SOLANA_PRIORITY_PRESETS.map((preset) => {
              const priorityFeeSOL = calculatePriorityFeeSOL(preset);
              const isSelected = selectedPriorityFee.name === preset.name;
              
              return (
                <button
                  key={preset.name}
                  onClick={() => setSelectedPriorityFee(preset)}
                  className={clsx(
                    'p-3 rounded-lg border-2 transition-all text-left',
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={clsx(
                      'font-medium',
                      isSelected ? 'text-cyan-800' : 'text-gray-900'
                    )}>
                      {preset.name}
                    </span>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-cyan-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {preset.description}
                  </p>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fee:</span>
                      <span className={clsx(
                        'font-medium',
                        isSelected ? 'text-cyan-700' : 'text-gray-700'
                      )}>
                        {priorityFeeSOL.toFixed(6)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Compute Units:</span>
                      <span className={clsx(
                        'font-medium',
                        isSelected ? 'text-cyan-700' : 'text-gray-700'
                      )}>
                        {(preset.computeUnitLimit / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Priority Fee Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-600">Selected Priority Fee:</span>
                <span className="ml-2 font-medium text-gray-900">{selectedPriorityFee.name}</span>
              </div>
              <span className="font-medium text-gray-900">
                {calculatePriorityFeeSOL(selectedPriorityFee).toFixed(6)} SOL
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This fee is added per transaction to prioritize your operations during network congestion.
            </p>
          </div>
        </div>
      </div>

      {/* Funding Address Information */}
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <h4 className="font-medium text-cyan-800 mb-3">
          {isReExport ? 'Approval Address (NFT Holder)' : "Canister's Solana Address (Transaction Payer)"}
        </h4>
        <p className="text-xs text-gray-600 mb-3">
          {isReExport 
            ? 'This NFT was previously burned back to IC and is held at an approval address. Fund this address with SOL to transfer the NFT.'
            : "This is the canister's ICRC99 signing address that will pay for Solana transactions. Fund this address with SOL to enable collection deployment and NFT minting."
          }
        </p>
        <div className="bg-white border border-cyan-200 rounded-lg p-3">
          {fundingAddress ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">Address Balance</span>
                {solBalance !== null ? (
                  <span className={`text-sm font-medium ${
                    estimatedRentSOL && parseFloat(solBalance) >= parseFloat(estimatedRentSOL)
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {parseFloat(solBalance).toFixed(6)} SOL
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">Loading...</span>
                )}
              </div>
              <p className="text-xs text-gray-600 font-mono break-all mb-2">
                {fundingAddress}
              </p>
              
              {solBalance !== null && estimatedRentSOL && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Required for rent:</span>
                    <span>{parseFloat(estimatedRentSOL).toFixed(6)} SOL</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Priority fee:</span>
                    <span>{calculatePriorityFeeSOL(selectedPriorityFee).toFixed(6)} SOL</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-gray-900 mb-2">
                    <span>Total required:</span>
                    <span>{(parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee)).toFixed(6)} SOL</span>
                  </div>
                  
                  {parseFloat(solBalance) < (parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee)) ? (
                    <div className="p-2 bg-red-50 border border-red-200 rounded">
                      <div className="flex items-center">
                        <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                        <span className="text-sm text-red-700 font-medium">
                          Insufficient SOL balance
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">
                        Need {(parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee) - parseFloat(solBalance)).toFixed(6)} more SOL
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm text-green-700 font-medium">
                          Sufficient SOL balance
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Ready for rent + priority fee payment
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Funding Actions */}
              <div className="mt-3 space-y-2">
                {publicKey ? (
                  <>
                    <button
                      onClick={handleFundAddress}
                      disabled={fundingInProgress || !estimatedRentSOL || parseFloat(solBalance || '0') >= (parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee))}
                      className={clsx(
                        'w-full px-4 py-2 rounded-md transition-colors text-sm font-medium',
                        fundingInProgress || !estimatedRentSOL || parseFloat(solBalance || '0') >= (parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee))
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-cyan-600 text-white hover:bg-cyan-700'
                      )}
                    >
                      {fundingInProgress ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Transferring SOL...
                        </div>
                      ) : parseFloat(solBalance || '0') >= (parseFloat(estimatedRentSOL || '0') + calculatePriorityFeeSOL(selectedPriorityFee)) ? (
                        '✓ Funded'
                      ) : (
                        `Transfer ${(parseFloat(estimatedRentSOL || '0') + calculatePriorityFeeSOL(selectedPriorityFee)).toFixed(4)} SOL from Wallet`
                      )}
                    </button>
                    <p className="text-xs text-gray-500 text-center">
                      Connected: {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(fundingAddress);
                        alert('Address copied to clipboard!');
                      }}
                      className="w-full px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-sm font-medium"
                    >
                      Copy Address to Fund
                    </button>
                    <p className="text-xs text-yellow-600 text-center">
                      ⚠️ Connect Solana wallet to transfer directly
                    </p>
                  </>
                )}
                
                {targetNetwork?.name === 'localnet' && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-700 font-medium mb-1">Or use CLI:</p>
                    <code className="text-xs text-blue-800 font-mono break-all block">
                      solana airdrop 10 {fundingAddress} --url {targetNetwork.endpoint}
                    </code>
                  </div>
                )}
                
                {(targetNetwork?.name === 'devnet' || targetNetwork?.name === 'testnet') && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-700 font-medium mb-1">Testnet Funding:</p>
                    <p className="text-xs text-blue-800">
                      Visit{' '}
                      <a 
                        href={`https://faucet.solana.com`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-900"
                      >
                        Solana Faucet
                      </a>
                      {' '}and paste the address above
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">
                  No Funding Address Available
                </span>
              </div>
              <p className="text-xs text-gray-600">
                No ckNFT canister found for this source contract
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Approval */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Cycles Payment Approval</h4>
        
        {/* Cycles Balance */}
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
                cyclesBalance !== null && costBreakdown && cyclesBalance >= (costBreakdown.total * BigInt(120) / BigInt(100))
                  ? 'text-green-600'
                  : 'text-red-600'
              )}>
                {cyclesBalance !== null ? formatCycles(cyclesBalance) : 'Unknown'}
              </span>
            )}
          </div>
          
          {cyclesBalance !== null && costBreakdown && (
            <div className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Required (with 120% buffer):</span>
                <span className="text-gray-900">{formatCycles((costBreakdown.total * BigInt(120)) / BigInt(100))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Remaining after export:</span>
                <span className={clsx(
                  'font-medium',
                  cyclesBalance >= (costBreakdown.total * BigInt(120) / BigInt(100)) ? 'text-green-600' : 'text-red-600'
                )}>
                  {cyclesBalance >= (costBreakdown.total * BigInt(120) / BigInt(100))
                    ? formatCycles(cyclesBalance - (costBreakdown.total * BigInt(120) / BigInt(100)))
                    : 'Insufficient Balance'
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Current Allowance */}
        {allowanceStatus && (
          <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-cyan-600 mr-2" />
                <h5 className="font-medium text-cyan-900">Current Allowance</h5>
              </div>
              <span className={clsx(
                'font-medium',
                allowanceStatus.isSufficient && !allowanceStatus.isExpired ? 'text-green-600' : 'text-orange-600'
              )}>
                {formatCycles(allowanceStatus.amount)}
              </span>
            </div>
            
            <div className="text-sm">
              <div className="flex justify-between items-center">
                <span className="text-cyan-600">Status:</span>
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
        
        {/* Approval Button */}
        {paymentApproved ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-medium text-green-800">Cycles Approved</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              {costBreakdown?.collectionDeployment && costBreakdown.collectionDeployment > 0n && (
                <span className="block">✓ Orchestrator approved for collection deployment ({formatCycles((costBreakdown.collectionDeployment * BigInt(120)) / BigInt(100))})</span>
              )}
              <span className="block">✓ ckNFT canister approved for NFT casting ({costBreakdown ? formatCycles((costBreakdown.nftMinting * BigInt(120)) / BigInt(100)) : '...'})</span>
            </p>
          </div>
        ) : (
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="font-medium text-gray-900">Approve Cycles Payment</h5>
                <p className="text-sm text-gray-600">
                  Two approvals required:
                </p>
                <ul className="text-sm text-gray-600 mt-1 ml-4 list-disc">
                  {costBreakdown?.collectionDeployment && costBreakdown.collectionDeployment > 0n && (
                    <li>Orchestrator for deployment: {formatCycles((costBreakdown.collectionDeployment * BigInt(120)) / BigInt(100))}</li>
                  )}
                  <li>ckNFT canister for casting: {costBreakdown ? formatCycles((costBreakdown.nftMinting * BigInt(120)) / BigInt(100)) : '...'}</li>
                </ul>
              </div>
              <button
                onClick={handleApprovePayment}
                disabled={
                  approvalInProgress || 
                  balanceQuery.isLoading || 
                  !costBreakdown || 
                  (cyclesBalance !== null && cyclesBalance < (costBreakdown.total * BigInt(120) / BigInt(100)))
                }
                className={clsx(
                  'px-6 py-2 rounded-md font-medium transition-colors',
                  approvalInProgress || balanceQuery.isLoading || !costBreakdown || 
                  (cyclesBalance !== null && cyclesBalance < (costBreakdown.total * BigInt(120) / BigInt(100)))
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-cyan-600 text-white hover:bg-cyan-700'
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

      {/* Collection Deployment */}
      {!targetNetwork?.deployed && paymentApproved && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Collection Deployment</h4>
          
          {deploymentResult ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800">Collection Deployed</span>
              </div>
              <p className="text-sm text-green-700 mb-2">
                Collection successfully deployed to Solana
              </p>
              <div className="bg-white border border-green-200 rounded p-2">
                <p className="text-xs text-gray-600 mb-1">Collection Address:</p>
                <code className="text-xs font-mono text-green-800 break-all">{deploymentResult.address}</code>
              </div>
              {deploymentResult.txHash && (
                <div className="bg-white border border-green-200 rounded p-2 mt-2">
                  <p className="text-xs text-gray-600 mb-1">Transaction Hash:</p>
                  <code className="text-xs font-mono text-green-800 break-all">{deploymentResult.txHash}</code>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h5 className="font-medium text-gray-900">Deploy Collection to Solana</h5>
                  <p className="text-sm text-gray-600">
                    Create the NFT collection on {networkName} before minting NFTs
                  </p>
                </div>
                <button
                  onClick={handleDeployCollection}
                  disabled={
                    deploymentInProgress || 
                    !paymentApproved || 
                    !solBalance || 
                    !estimatedRentSOL || 
                    parseFloat(solBalance) < (parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee))
                  }
                  className={clsx(
                    'px-6 py-2 rounded-md font-medium transition-colors',
                    deploymentInProgress || !paymentApproved || !solBalance || !estimatedRentSOL || 
                    parseFloat(solBalance) < (parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee))
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  )}
                >
                  {deploymentInProgress ? (
                    <div className="flex items-center">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Deploying...
                    </div>
                  ) : (
                    'Deploy Collection'
                  )}
                </button>
              </div>
              
              {!paymentApproved && (
                <p className="text-xs text-yellow-600">
                  ⚠️ Please approve cycles payment first
                </p>
              )}
              {paymentApproved && solBalance && estimatedRentSOL && parseFloat(solBalance) < (parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee)) && (
                <p className="text-xs text-red-600">
                  ⚠️ Insufficient SOL balance for deployment. Please fund the address above.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ready indicator */}
      {paymentApproved && solBalance && estimatedRentSOL && parseFloat(solBalance) >= (parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee)) && (
        <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-cyan-600 mr-2" />
            <span className="font-medium text-cyan-800">Ready to Export</span>
          </div>
          <p className="text-sm text-cyan-700 mt-1">
            All requirements met. Click "Start Export" to begin the Solana bridging process.
          </p>
        </div>
      )}

      {/* Warnings */}
      {solBalance && estimatedRentSOL && parseFloat(solBalance) < (parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee)) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="font-medium text-red-800">Insufficient SOL for Rent + Priority Fees</span>
          </div>
          <p className="text-sm text-red-700 mt-1">
            The funding address needs {(parseFloat(estimatedRentSOL) + calculatePriorityFeeSOL(selectedPriorityFee)).toFixed(4)} SOL (rent + priority fee) but only has {parseFloat(solBalance).toFixed(4)} SOL.
            {fundingAddress && (
              <>
                <br />
                <span className="text-xs text-red-600">Address: {fundingAddress}</span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
