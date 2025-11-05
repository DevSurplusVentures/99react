import { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { ethers } from 'ethers';
import { Loader2, AlertCircle, CheckCircle, Wallet, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { use99Mutations, useOrchestratorAllowance } from '../../hooks/use99Mutations';
import { useFungibleToken } from '../../hooks/useFungibleToken';
import { useAuth } from '../../hooks/useAuth';
import { useMetaMask } from '../../hooks/useEVM';
import type { SelectedNFT } from './NFTSelectionStep';
import type { Network } from '../../declarations/orchestrator/orchestrator.did';

// Import the ICRC99NFT ABI for gas estimation
import { abi as ICRC99NFT_ABI } from '/Users/afat/Dropbox/development/ICDevs/projects/icrc99-orchestrator/sample-nfts/packages/hardhat/artifacts/contracts/ICRC99NFT.sol/ICRC99NFT.json';

export interface BurnCosts {
  cyclesCost: bigint;
  ethCost: bigint;
  gasEstimate: bigint;
  ckNFTCanisterId: Principal;
  burnFundingAddress: string;
  userEthBalance?: bigint;
  hasInsufficientEthBalance?: boolean;
  // For multiple NFTs
  nftDetails?: Array<{
    nft: SelectedNFT;
    cyclesCost: bigint;
    ethCost: bigint;
    gasEstimate: bigint;
    ckNFTCanisterId: Principal;
    burnFundingAddress: string;
  }>;
}

export interface BurnCostStepProps {
  selectedNFTs: SelectedNFT[];
  targetNetwork: Network | null; // This should be the REMOTE network where cast NFTs exist
  costs: BurnCosts | null;
  onCostsCalculated: (costs: BurnCosts) => void;
  compact?: boolean;
  // MetaMask connection state from parent
  isConnected?: boolean;
  activeAddress?: string | null;
}

export function BurnCostStep({
  selectedNFTs,
  targetNetwork,
  costs,
  onCostsCalculated,
  compact = false,
  isConnected,
  activeAddress: parentActiveAddress,
}: BurnCostStepProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ckNFTCanisterId, setCkNFTCanisterId] = useState<Principal | null>(null);
  const [calculationStep, setCalculationStep] = useState<string>('');
  const [cyclesBalance, setCyclesBalance] = useState<bigint | null>(null);
  const [allowanceStatus, setAllowanceStatus] = useState<{
    amount: bigint;
    isExpired: boolean;
    isSufficient: boolean;
  } | null>(null);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [approvalInProgress, setApprovalInProgress] = useState(false);
  
  const { user } = useAuth();
  const { activeAddress: hookActiveAddress, isUnlocked } = useMetaMask();
  const mutations = use99Mutations(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai');

  // Cycles ledger integration for balance and allowance tracking
  const CYCLES_LEDGER_CANISTER_ID = process.env.CYCLES_LEDGER_CANISTER_ID || 'um5iw-rqaaa-aaaaq-qaaba-cai';
  const cyclesToken = useFungibleToken(CYCLES_LEDGER_CANISTER_ID);
  
  // Get user's cycles balance
  const userAccount = user?.principal ? {
    owner: typeof user.principal === 'string' ? Principal.fromText(user.principal) : user.principal,
    subaccount: [] as []
  } : undefined;
  
  const balanceQuery = cyclesToken.useBalance(userAccount);
  
  // Get current allowance for the orchestrator
  const allowanceQuery = useOrchestratorAllowance(costs?.cyclesCost);

  // Use parent's connection state if provided, otherwise use hook
  const activeAddress = parentActiveAddress || hookActiveAddress;
  const effectiveIsConnected = isConnected !== undefined ? isConnected : (isUnlocked && !!activeAddress);

  // Utility functions for formatting
  const formatCycles = (cycles: bigint): string => {
    const trillions = Number(cycles) / 1_000_000_000_000;
    return `${trillions.toFixed(2)} T`;
  };

  const hasSufficientBalance = (requiredAmount: bigint): boolean => {
    return cyclesBalance ? cyclesBalance >= requiredAmount : false;
  };

  // Track cycles balance and allowance status
  useEffect(() => {
    if (balanceQuery.data !== undefined) {
      setCyclesBalance(balanceQuery.data);
    }
  }, [balanceQuery.data]);

  useEffect(() => {
    if (allowanceQuery.data && costs?.cyclesCost) {
      const newAllowanceStatus = {
        amount: allowanceQuery.data.allowance,
        isExpired: allowanceQuery.data.isExpired,
        isSufficient: allowanceQuery.data.allowance >= costs.cyclesCost,
      };
      
      setAllowanceStatus(newAllowanceStatus);
      
      // Auto-update payment approval status based on allowance
      const shouldBeApproved = newAllowanceStatus.isSufficient && !newAllowanceStatus.isExpired;
      setPaymentApproved(shouldBeApproved);
    }
  }, [allowanceQuery.data, costs?.cyclesCost]);

  // Check funding balance when costs are available - REMOVED for burn
  // Burn operations don't need ETH funding since they happen entirely on IC
  // useEffect(() => {
  //   if (costs?.burnFundingAddress && costs?.ethCost) {
  //     checkBurnFundingBalance();
  //   }
  // }, [costs?.burnFundingAddress, costs?.ethCost]);

  // Handle payment approval
  const handleApprovePayment = async () => {
    if (!costs?.cyclesCost || !user?.principal) {
      setError('Missing required information for payment approval');
      return;
    }

    setApprovalInProgress(true);
    setError(null);

    try {
      console.log('🧮 Approving cycles payment:', {
        cyclesCost: costs.cyclesCost.toString(),
        userPrincipal: user.principal.toString(),
      });

      // Check balance before approval
      if (cyclesBalance !== null && cyclesBalance < costs.cyclesCost) {
        throw new Error(`Insufficient cycles balance. You have ${formatCycles(cyclesBalance)} but need ${formatCycles(costs.cyclesCost)}. Please deposit more cycles to your account.`);
      }

      // Create the approval transaction
      const orchestratorPrincipal = Principal.fromText(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai');
      const expiryTime = BigInt(Date.now() * 1_000_000 + 24 * 60 * 60 * 1_000_000_000); // 24 hours from now
      
      // Approve cycles for the orchestrator to spend
      await mutations.cyclesApprove.mutateAsync({
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        amount: costs.cyclesCost,
        expected_allowance: [],
        expires_at: [expiryTime],
        spender: {
          owner: orchestratorPrincipal,
          subaccount: []
        }
      });

      console.log('✅ Cycles approval successful');
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

  // Debug logging
  console.log('🔍 BurnCostStep Debug:', {
    selectedNFTs: selectedNFTs.length,
    firstNFT: selectedNFTs[0] ? {
      contractAddress: selectedNFTs[0].contractAddress,
      tokenId: selectedNFTs[0].tokenId,
      name: selectedNFTs[0].name
    } : null,
    targetNetwork: targetNetwork ? JSON.stringify(targetNetwork, (_key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    ) : null,
    activeAddress,
    hookActiveAddress,
    parentActiveAddress,
    isUnlocked,
    isConnected,
    effectiveIsConnected,
    userPrincipal: user?.principal?.toString(),
    costs: !!costs
  });

  // Additional debug for contract address issue
  if (selectedNFTs.length > 0) {
    const firstNFT = selectedNFTs[0];
    console.log('🔍 Contract Address Analysis:', {
      'firstNFT.contractAddress': firstNFT.contractAddress,
      'is mock 0x1234...': firstNFT.contractAddress === '0x1234567890123456789012345678901234567890',
      'contractAddress type': typeof firstNFT.contractAddress,
      'contractAddress length': firstNFT.contractAddress.length,
      'first 10 chars': firstNFT.contractAddress.slice(0, 10),
      'all selectedNFTs': selectedNFTs.map(nft => ({
        contractAddress: nft.contractAddress,
        tokenId: nft.tokenId,
        name: nft.name
      }))
    });
  }

  useEffect(() => {
    if (selectedNFTs.length > 0 && targetNetwork && !costs && !isCalculating) {
      calculateBurnCosts();
    }
  }, [selectedNFTs, targetNetwork, costs]);

  const calculateBurnCosts = async () => {
    if (selectedNFTs.length === 0 || !targetNetwork || !user?.principal) {
      setError('Missing required information for cost calculation');
      return;
    }

    if (!activeAddress || !effectiveIsConnected) {
      setError('MetaMask wallet must be connected for gas estimation');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      console.log('🧮 Calculating burn costs for NFTs:', selectedNFTs.length, 'selected');
      console.log('🔥 Note: User will pay EVM gas fees from their own wallet for NFT transfers to burn addresses');

      let totalCyclesCost = BigInt(0);
      let totalEthCost = BigInt(0);
      let totalGasEstimate = BigInt(0);
      const nftDetails: Array<{
        nft: SelectedNFT;
        cyclesCost: bigint;
        ethCost: bigint;
        gasEstimate: bigint;
        ckNFTCanisterId: Principal;
        burnFundingAddress: string;
      }> = [];

      // Process each NFT
      for (let i = 0; i < selectedNFTs.length; i++) {
        const currentNFT = selectedNFTs[i];
        console.log(`🔥 Processing NFT ${i + 1}/${selectedNFTs.length}:`, currentNFT);

        // Step 1: Find the ckNFT canister for this contract
        // For burn operations, we need to find the canister using the REMOTE contract address and network
        // This is because we're burning a cast NFT that exists on the remote chain
        setCalculationStep(`Finding ckNFT canister for NFT ${i + 1}/${selectedNFTs.length}...`);
        
        // For burn, we should be using the remote contract details, not the original source
        // The currentNFT.contractAddress should be the remote contract address
        const contractPointer = {
          contract: currentNFT.contractAddress, // This should be the remote contract address
          network: targetNetwork, // This should be the remote network where the cast NFT exists
        };

        console.log('🔍 Looking for ckNFT canister with REMOTE contract pointer for burn:', contractPointer);
        
        const existingCanisters = await mutations.getCkNFTCanister.mutateAsync([contractPointer]);
        
        if (!existingCanisters || existingCanisters.length === 0 || !existingCanisters[0]) {
          // Provide more helpful error message with specific guidance
          const networkName = targetNetwork && 'Ethereum' in targetNetwork ? 'Ethereum' : 'Unknown Network';
          throw new Error(
            `No ckNFT canister found for contract ${currentNFT.contractAddress} on ${networkName}. ` +
            `This cast NFT collection needs to be imported first using the Import wizard. ` +
            `Go to the Import tab to create a ckNFT canister for this collection before burning cast NFTs.`
          );
        }

        const ckNFTCanister = existingCanisters[0];
        console.log('✅ Found ckNFT canister:', ckNFTCanister.toString());
        
        // Store the first canister ID for display
        if (i === 0) {
          setCkNFTCanisterId(ckNFTCanister);
        }

        // Step 2: Get burn funding address - ANALYSIS SHOWS THIS IS WRONG!
        // The issue: getBurnFundingAddress uses the NATIVE chain (original NFT) to generate address
        // But for BURN operations, we need the address for the TARGET/REMOTE chain (where cast NFT exists)
        setCalculationStep(`Getting burn funding address for NFT ${i + 1}/${selectedNFTs.length}...`);
        console.log('🔥 Getting burn funding address...');
        
        // Log the request parameters for debugging the address mismatch
        const burnAddressRequest = {
          ckNFTCanisterId: ckNFTCanister,
          tokenId: BigInt(currentNFT.tokenId),
        };
        
        console.log('🔍 BURN ADDRESS REQUEST DEBUG:', {
          ckNFTCanisterId: ckNFTCanister.toString(),
          tokenId: currentNFT.tokenId,
          tokenIdBigInt: burnAddressRequest.tokenId.toString(),
          currentNFT: {
            contractAddress: currentNFT.contractAddress,
            tokenId: currentNFT.tokenId,
            name: currentNFT.name
          },
          targetNetwork: targetNetwork ? JSON.stringify(targetNetwork, (_key, value) => 
            typeof value === 'bigint' ? value.toString() : value
          ) : null,
          activeUserAddress: activeAddress,
          note: 'ISSUE: This will use NATIVE chain, but we need TARGET chain for burn!'
        });
        
        // ❌ THIS IS THE PROBLEM - getBurnFundingAddress uses the NATIVE chain
        // const burnAddress = await mutations.getBurnFundingAddress.mutateAsync(burnAddressRequest);
        
        // ✅ CORRECT APPROACH: Use getApprovalAddress with TARGET network for burn operations
        console.log('🎯 Using getApprovalAddress with TARGET network for burn address...');
        const approvalAddressRequest = {
          account: {
            owner: typeof user.principal === 'string' ? Principal.fromText(user.principal) : user.principal!,
            subaccount: [] as []
          },
          remoteNFTPointer: {
            tokenId: BigInt(currentNFT.tokenId),
            contract: currentNFT.contractAddress, // Remote contract address
            network: targetNetwork!, // Target network where cast NFT exists
          },
        };
        
        console.log('🎯 APPROVAL ADDRESS REQUEST (anonymous call):', {
          account: {
            owner: approvalAddressRequest.account.owner.toString(),
            subaccount: approvalAddressRequest.account.subaccount
          },
          remoteNFTPointer: {
            tokenId: approvalAddressRequest.remoteNFTPointer.tokenId.toString(),
            contract: approvalAddressRequest.remoteNFTPointer.contract,
            network: JSON.stringify(approvalAddressRequest.remoteNFTPointer.network, (_key, value) => 
              typeof value === 'bigint' ? value.toString() : value
            )
          },
          note: 'This is an anonymous call - no wallet authorization needed'
        });
        
        const burnAddress = await mutations.getApprovalAddress.mutateAsync({
          request: approvalAddressRequest
        });

        if (!burnAddress) {
          throw new Error(`Failed to get approval address for burn operation on target network for NFT ${currentNFT.tokenId}`);
        }

        console.log('✅ Got burn/approval address for target network:', burnAddress);
        console.log('🔍 BURN ADDRESS ANALYSIS:', {
          returnedAddress: burnAddress,
          expectedFromLogs: '0xadf4de73a3dc0927bc250cd781ee889a91d27751',
          wrongAddressFromLogs: '0x28e740648dd181db11c61e3834053d08b046ea3c',
          isExpected: burnAddress.toLowerCase() === '0xadf4de73a3dc0927bc250cd781ee889a91d27751'.toLowerCase(),
          isWrongAddress: burnAddress.toLowerCase() === '0x28e740648dd181db11c61e3834053d08b046ea3c'.toLowerCase(),
          note: 'Should match expected address from logs, not the wrong one'
        });

        // Step 3: Calculate cast cost (cycles needed for burn operation)
        // This should be calculated using the REMOTE contract and network reference
        // because we're burning a cast NFT that exists on the remote chain
        setCalculationStep(`Calculating IC cast cost for remote NFT ${i + 1}/${selectedNFTs.length}...`);
        console.log('💰 Calculating cast cost for remote NFT...');
        
        // We need to call the ckNFT canister directly for cast cost
        const { Actor, HttpAgent } = await import('@dfinity/agent');
        const { idlFactory: ckNFTIdlFactory } = await import('../../declarations/ckNFT/ckNFT.did.js');
        
        // Create anonymous agent for cost queries
        const agent = new HttpAgent({ 
          host: process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://icp0.io' 
        });
        
        if (process.env.NODE_ENV === 'development') {
          await agent.fetchRootKey();
        }

        const ckNFTActor = Actor.createActor(ckNFTIdlFactory, {
          agent,
          canisterId: ckNFTCanister,
        });

        // Cast cost request should use the REMOTE contract and network for burn operations
        const castCostRequest = {
          network: targetNetwork, // Remote network where cast NFT exists
          contract: currentNFT.contractAddress, // Remote contract address
          tokenId: BigInt(currentNFT.tokenId),
        };

        console.log('📋 Cast cost request for remote NFT burn:', castCostRequest);
        const castCostResult = await (ckNFTActor as any).icrc99_cast_cost(castCostRequest);
        
        let cyclesCost: bigint;
        if (typeof castCostResult === 'bigint') {
          cyclesCost = castCostResult;
        } else if (Array.isArray(castCostResult) && castCostResult.length > 0) {
          cyclesCost = castCostResult[0];
        } else {
          throw new Error(`Invalid cast cost result format from ckNFT canister for NFT ${currentNFT.tokenId}`);
        }

        console.log('✅ Cast cost calculated:', cyclesCost.toString());

        // Step 4: Validate NFT ownership and estimate gas costs for user's wallet
        setCalculationStep(`Validating NFT ownership and estimating gas costs for NFT ${i + 1}/${selectedNFTs.length}...`);
        console.log('👤 Validating NFT ownership and estimating gas costs...');

        if (!window.ethereum) {
          throw new Error('MetaMask not found - cannot estimate gas costs');
        }

        // Create provider and get gas estimation
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Create contract instance for validation and gas estimation
        const contract = new ethers.Contract(currentNFT.contractAddress, ICRC99NFT_ABI, signer);

        // First, verify that the user owns this NFT
        try {
          const owner = await contract.ownerOf(BigInt(currentNFT.tokenId));
          if (owner.toLowerCase() !== activeAddress.toLowerCase()) {
            throw new Error(`You don't own NFT ${currentNFT.tokenId}. Current owner: ${owner.slice(0, 6)}...${owner.slice(-4)}`);
          }
          console.log('✅ NFT ownership verified');
        } catch (ownerError: any) {
          if (ownerError.message.includes("You don't own")) {
            throw ownerError;
          }
          throw new Error(`Failed to verify NFT ownership for ${currentNFT.tokenId}: ${ownerError.message}`);
        }

        // Estimate gas for safeTransferFrom transaction that user will execute
        console.log('⛽ Estimating gas costs for user wallet...');
        const gasEstimate = await contract.safeTransferFrom.estimateGas(
          activeAddress,
          burnAddress,
          BigInt(currentNFT.tokenId)
        );

        console.log('✅ Gas estimated:', gasEstimate.toString());

        // Get current gas price
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || BigInt(20000000000); // 20 gwei fallback

        // Calculate total gas cost in wei that user will need to pay
        const ethCost = gasEstimate * gasPrice;

        console.log('💰 Gas calculation (user will pay):', {
          gasEstimate: gasEstimate.toString(),
          gasPrice: gasPrice.toString(),
          totalCost: ethCost.toString(),
          costInEth: ethers.formatEther(ethCost)
        });

        // Add to totals
        totalCyclesCost += cyclesCost;
        totalEthCost += ethCost;
        totalGasEstimate += gasEstimate;

        // Store NFT details
        nftDetails.push({
          nft: currentNFT,
          cyclesCost,
          ethCost,
          gasEstimate,
          ckNFTCanisterId: ckNFTCanister,
          burnFundingAddress: burnAddress,
        });
      }

      // Check user's ETH balance to ensure they can pay for gas fees
      console.log('💰 Checking user ETH balance for gas payments...');
      const balanceProvider = new ethers.BrowserProvider(window.ethereum!);
      const userEthBalance = await balanceProvider.getBalance(activeAddress);
      const hasInsufficientEthBalance = userEthBalance < totalEthCost;

      console.log('💰 User ETH balance check:', {
        userAddress: activeAddress,
        userBalance: ethers.formatEther(userEthBalance),
        requiredForGas: ethers.formatEther(totalEthCost),
        hasSufficientBalance: !hasInsufficientEthBalance
      });

      // Use the first NFT's details for the primary interface (for compatibility)
      const firstNFT = nftDetails[0];
      
      const finalCosts: BurnCosts = {
        cyclesCost: totalCyclesCost,
        ethCost: totalEthCost,
        gasEstimate: totalGasEstimate,
        ckNFTCanisterId: firstNFT.ckNFTCanisterId,
        burnFundingAddress: firstNFT.burnFundingAddress,
        userEthBalance,
        hasInsufficientEthBalance,
        nftDetails,
      };

      console.log('✅ Final burn costs calculated for all NFTs:', {
        totalNFTs: selectedNFTs.length,
        totalCyclesCost: finalCosts.cyclesCost.toString(),
        totalEthCost: finalCosts.ethCost.toString(),
        totalGasEstimate: finalCosts.gasEstimate.toString(),
        userEthBalance: ethers.formatEther(userEthBalance),
        hasInsufficientEthBalance,
        note: 'User will pay gas fees from their own wallet',
        nftDetails: nftDetails.map(detail => ({
          tokenId: detail.nft.tokenId,
          cyclesCost: detail.cyclesCost.toString(),
          ethCost: detail.ethCost.toString(),
        }))
      });
      
      setCalculationStep('');
      onCostsCalculated(finalCosts);

    } catch (error) {
      console.error('❌ Error calculating burn costs:', error);
      let errorMessage = 'Failed to calculate burn costs';
      
      if (error instanceof Error) {
        if (error.message.includes('user rejected')) {
          errorMessage = 'Gas estimation cancelled by user';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas estimation';
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

  // Removed fundBurnAddress function - not needed for burn operations
  // Removed executeBurn function - this should be in BurnTransactionStep

  const handleRetry = () => {
    setError(null);
    calculateBurnCosts();
  };

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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Calculate Burn Costs</h3>
        <p className="text-gray-600">
          Review the costs for burning your EVM NFT and minting it on the Internet Computer.
        </p>
      </div>

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
            This may take a moment while we query the ckNFT canister and estimate gas costs
          </p>
        </div>
      )}

      {costs && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cycles Cost */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-blue-800">IC Operation Cost</span>
                <span className="text-blue-700 font-mono text-sm">
                  {(Number(costs.cyclesCost) / 1_000_000_000_000).toFixed(2)} T cycles
                </span>
              </div>
              <p className="text-xs text-blue-600">
                Required for minting ckNFT on Internet Computer
              </p>
            </div>

            {/* Gas Cost */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-green-800">EVM Gas Cost</span>
                <div className="text-right">
                  <span className="text-green-700 font-mono text-sm block">
                    {ethers.formatEther(costs.ethCost)} ETH
                  </span>
                  <span className="text-green-600 text-xs">
                    {costs.gasEstimate.toString()} gas
                  </span>
                </div>
              </div>
              <p className="text-xs text-green-600">
                Real-time gas estimate for NFT transfer to burn address
              </p>
            </div>

            {/* User ETH Balance */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-purple-800">Your ETH Balance</span>
                <div className="text-right">
                  {costs.userEthBalance !== undefined ? (
                    <span className={clsx(
                      'font-mono text-sm block',
                      !costs.hasInsufficientEthBalance
                        ? 'text-green-700'
                        : 'text-red-700'
                    )}>
                      {ethers.formatEther(costs.userEthBalance)} ETH
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm">Unknown</span>
                  )}
                </div>
              </div>
              <div className="text-xs">
                <div className="text-purple-600 mb-1">
                  Address: {activeAddress?.slice(0, 6)}...{activeAddress?.slice(-4)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-purple-600">Status:</span>
                  {costs.userEthBalance !== undefined ? (
                    <span className={clsx(
                      'font-medium',
                      !costs.hasInsufficientEthBalance
                        ? 'text-green-600'
                        : 'text-red-600'
                    )}>
                      {!costs.hasInsufficientEthBalance
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

          {/* Insufficient ETH balance warning */}
          {costs.hasInsufficientEthBalance && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="font-medium text-red-800">Insufficient ETH for Gas Fees</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                You need {ethers.formatEther(costs.ethCost)} ETH for gas fees but only have {costs.userEthBalance ? ethers.formatEther(costs.userEthBalance) : '0'} ETH.
                <br />
                <span className="text-xs text-red-600 font-mono">
                  Your Address: {activeAddress}
                </span>
                <br />
                Please deposit {costs.userEthBalance ? ethers.formatEther(costs.ethCost - costs.userEthBalance) : ethers.formatEther(costs.ethCost)} ETH to your wallet before proceeding.
              </p>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => navigator.clipboard.writeText(activeAddress || '')}
                  className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                >
                  Copy Your Address
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                >
                  Refresh Balance
                </button>
              </div>
            </div>
          )}

          {/* NFT Information */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">
              Selected NFTs ({selectedNFTs.length})
            </h4>
            <div className="space-y-3">
              {selectedNFTs.map((nft, index) => (
                <div key={`${nft.contractAddress}-${nft.tokenId}`} className="p-3 bg-white border border-gray-200 rounded-md">
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-600">NFT #{index + 1}:</span>
                      <span className="ml-2 font-medium text-gray-800">{nft.name || `Token ${nft.tokenId}`}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Contract:</span>
                      <span className="ml-2 font-mono text-gray-800">
                        {nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Token ID:</span>
                      <span className="ml-2 font-medium text-gray-800">{nft.tokenId}</span>
                    </div>
                  </div>
                </div>
              ))}
              {ckNFTCanisterId && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-sm">
                    <span className="text-gray-600">ckNFT Canister:</span>
                    <span className="ml-2 font-mono text-gray-800">{ckNFTCanisterId.toString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Approval Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Payment Approval</h4>
            
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
                    cyclesBalance !== null && cyclesBalance >= costs.cyclesCost
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
                    <span className="text-gray-900">{formatCycles(costs.cyclesCost)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Remaining after burn:</span>
                    <span className={clsx(
                      'font-medium',
                      cyclesBalance >= costs.cyclesCost ? 'text-green-600' : 'text-red-600'
                    )}>
                      {cyclesBalance >= costs.cyclesCost 
                        ? formatCycles(cyclesBalance - costs.cyclesCost)
                        : 'Insufficient Balance'
                      }
                    </span>
                  </div>
                </div>
              )}
              
              {cyclesBalance !== null && cyclesBalance < costs.cyclesCost && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">
                    ⚠️ Insufficient cycles balance. Please deposit {formatCycles(costs.cyclesCost - cyclesBalance)} more.
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
                    allowanceStatus.isSufficient && !allowanceStatus.isExpired ? 'text-green-600' : 'text-orange-600'
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
                      Authorize the orchestrator to use {formatCycles(costs.cyclesCost)} for this burn
                    </p>
                  </div>
                  <button
                    onClick={handleApprovePayment}
                    disabled={approvalInProgress || balanceQuery.isLoading || (cyclesBalance !== null && cyclesBalance < costs.cyclesCost)}
                    className={clsx(
                      'px-6 py-2 rounded-md font-medium transition-colors',
                      approvalInProgress || balanceQuery.isLoading || (cyclesBalance !== null && cyclesBalance < costs.cyclesCost)
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
                    <li>Authorize the orchestrator to spend {formatCycles(costs.cyclesCost)} from your account</li>
                    <li>Enable the burn operation to proceed</li>
                    <li>Set approval to expire in 24 hours for security</li>
                  </ul>
                </div>
                
                {cyclesBalance !== null && cyclesBalance < costs.cyclesCost && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">
                      ⚠️ Insufficient cycles balance. Please deposit more cycles before approving.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Funding Help */}
            {cyclesBalance !== null && !hasSufficientBalance(costs.cyclesCost) && (
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

          {/* Burn Execution Section - MOVED TO BurnTransactionStep */}
          {paymentApproved && !costs.hasInsufficientEthBalance && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h5 className="font-medium text-green-900">Ready to Proceed</h5>
                  <p className="text-sm text-green-600">
                    Costs calculated and payment approved. Go to the Burn tab to execute the burn for {selectedNFTs.length} NFT{selectedNFTs.length > 1 ? 's' : ''}.
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

          {/* Insufficient ETH Balance Warning */}
          {paymentApproved && costs.hasInsufficientEthBalance && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h5 className="font-medium text-red-900">Cannot Proceed - Insufficient ETH</h5>
                  <p className="text-sm text-red-600">
                    You need more ETH in your wallet to pay for gas fees before proceeding to burn.
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              
              <div className="text-sm text-red-700">
                <p className="mb-1">Required:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 ml-2">
                  <li>{ethers.formatEther(costs.ethCost)} ETH for gas fees</li>
                  <li>Your current balance: {costs.userEthBalance ? ethers.formatEther(costs.userEthBalance) : '0'} ETH</li>
                  <li>Shortfall: {costs.userEthBalance ? ethers.formatEther(costs.ethCost - costs.userEthBalance) : ethers.formatEther(costs.ethCost)} ETH</li>
                </ul>
              </div>
            </div>
          )}

          {/* Process Note */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> The burn process will transfer your cast NFT to a special burn address 
              (you pay gas fees), then remint an equivalent ckNFT on the Internet Computer using the remote 
              contract reference. This process is irreversible.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
