import { createFileRoute } from "@tanstack/react-router";
import { EVMImportWizard, ImportResult } from "../../components/bridge/EVMImportWizard";
import { EVMExportWizard, ExportResult } from "../../components/bridge/EVMExportWizard";
import { EVMBurnWizard, BurnResult } from "../../components/bridge/EVMBurnWizard";
import { ICReturnWizard, ReturnResult } from "../../components/bridge/ICReturnWizard";
import { useState } from "react";

export const Route = createFileRoute("/bridge")({
  component: Bridge,
});

function Bridge() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBurnModal, setShowBurnModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [activeWizard, setActiveWizard] = useState<'import' | 'export' | 'burn' | 'return' | null>(null);
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);
  const [lastExportResult, setLastExportResult] = useState<ExportResult | null>(null);
  const [lastBurnResult, setLastBurnResult] = useState<BurnResult | null>(null);
  const [lastReturnResult, setLastReturnResult] = useState<ReturnResult | null>(null);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showBurnSuccess, setShowBurnSuccess] = useState(false);
  const [showReturnSuccess, setShowReturnSuccess] = useState(false);

  // Note: Authentication is handled within individual wizards as needed
  // No global auth requirement for the bridge page

  const handleImportComplete = (result: ImportResult) => {
    console.log("Import completed:", result);
    setLastImportResult(result);
    
    if (result.success) {
      // Show success state instead of alert
      setShowImportSuccess(true);
      console.log('🎉 NFT successfully imported!', {
        evmTx: result.evmTransactionHash,
        icTx: result.icTransactionHash,
        canister: result.canisterAddress,
        tokenId: result.tokenId
      });
    } else {
      console.error('❌ Import failed:', result.error);
    }
  };

  const handleExportComplete = (result: ExportResult) => {
    console.log("Export completed:", result);
    setLastExportResult(result);
    
    if (result.success) {
      setShowExportSuccess(true);
      console.log('🎉 NFT successfully exported!', {
        evmTx: result.evmTransactionHash,
        icTx: result.icTransactionHash,
        contract: result.remoteContractAddress,
        tokenId: result.tokenId
      });
    } else {
      console.error('❌ Export failed:', result.error);
    }
  };

  const handleBurnComplete = (result: BurnResult) => {
    console.log("Burn completed:", result);
    setLastBurnResult(result);
    
    if (result.success) {
      setShowBurnSuccess(true);
      console.log('🔥 NFT successfully burned and ckNFT minted!', {
        icTx: result.icTransactionHash,
        canister: result.ckNFTCanisterId,
        tokenId: result.tokenId
      });
    } else {
      console.error('❌ Burn failed:', result.error);
    }
  };

  const handleReturnComplete = (result: ReturnResult) => {
    console.log("Return completed:", result);
    setLastReturnResult(result);
    
    if (result.success) {
      setShowReturnSuccess(true);
      console.log('↩️ ckNFT successfully returned to EVM!', {
        evmTx: result.evmTransactionHash,
        chainId: result.targetChainId,
        contract: result.targetContractAddress,
        tokenId: result.tokenId
      });
    } else {
      console.error('❌ Return failed:', result.error);
    }
  };

  // Note: Authentication is handled within individual wizards as needed
  // No global auth requirement for the bridge page

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            ICRC-99 NFT Bridge
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Complete bidirectional NFT bridging between EVM chains and Internet Computer
          </p>
          <p className="text-lg text-gray-400">
            Import • Export • Burn • Return
          </p>
        </div>

        {/* Bridge Options */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* EVM → IC Import */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🔵</div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Import
              </h2>
              <p className="text-blue-200 text-sm mb-4">EVM → IC</p>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Lock your NFTs on EVM chains and mint corresponding ckNFTs on IC.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setActiveWizard('import')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Start Import
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Import (Modal)
              </button>
            </div>
          </div>

          {/* IC → EVM Export */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🟢</div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Export
              </h2>
              <p className="text-green-200 text-sm mb-4">IC → EVM (New)</p>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Lock ckNFTs and deploy new EVM contracts with fresh deployments.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setActiveWizard('export')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Start Export
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Export (Modal)
              </button>
            </div>
          </div>

          {/* EVM Burn → IC */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🔴</div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Burn
              </h2>
              <p className="text-red-200 text-sm mb-4">EVM Burn → IC</p>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Permanently burn EVM NFTs and mint corresponding ckNFTs on IC.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setActiveWizard('burn')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Start Burn
              </button>
              <button
                onClick={() => setShowBurnModal(true)}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Burn (Modal)
              </button>
            </div>
          </div>

          {/* IC → EVM Return */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🟣</div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Return
              </h2>
              <p className="text-purple-200 text-sm mb-4">IC → EVM (Source)</p>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Burn ckNFTs and return NFTs to their original EVM chains.<br/><br/>
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setActiveWizard('return')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Start Return
              </button>
              <button
                onClick={() => setShowReturnModal(true)}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Return (Modal)
              </button>
            </div>
          </div>
        </div>

        {/* Import Error Screen */}
        {showImportSuccess && lastImportResult && !lastImportResult.success && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Failed</h2>
                <p className="text-gray-600 mb-4">
                  There was an issue importing your NFT. Please try again.
                </p>
                
                {lastImportResult.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left mb-6">
                    <h3 className="font-semibold text-red-900 mb-2">Error Details:</h3>
                    <p className="text-sm text-red-700">{lastImportResult.error}</p>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setShowImportSuccess(false);
                    setLastImportResult(null);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Success Screen */}
        {showImportSuccess && lastImportResult?.success && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Successful!</h2>
                <p className="text-gray-600 mb-6">
                  Your NFT has been successfully imported to the Internet Computer.
                </p>
                
                {/* Transaction Details */}
                <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Transaction Details:</h3>
                  <div className="space-y-1 text-sm">
                    {lastImportResult.evmTransactionHash && (
                      <div>
                        <span className="text-gray-500">EVM Transaction:</span>
                        <div className="font-mono text-xs break-all">{lastImportResult.evmTransactionHash}</div>
                      </div>
                    )}
                    {lastImportResult.icTransactionHash && (
                      <div>
                        <span className="text-gray-500">IC Reference:</span>
                        <div className="font-mono text-xs break-all">{lastImportResult.icTransactionHash}</div>
                      </div>
                    )}
                    {lastImportResult.canisterAddress && (
                      <div>
                        <span className="text-gray-500">Canister:</span>
                        <div className="font-mono text-xs break-all">{lastImportResult.canisterAddress}</div>
                      </div>
                    )}
                    {lastImportResult.tokenId && (
                      <div>
                        <span className="text-gray-500">Token ID:</span>
                        <div className="font-mono text-xs">{lastImportResult.tokenId}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setShowImportSuccess(false);
                    setLastImportResult(null);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Error Screen */}
        {showExportSuccess && lastExportResult && !lastExportResult.success && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Failed</h2>
                <p className="text-gray-600 mb-4">
                  There was an issue exporting your NFT. Please try again.
                </p>
                
                {lastExportResult.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left mb-6">
                    <h3 className="font-semibold text-red-900 mb-2">Error Details:</h3>
                    <p className="text-sm text-red-700">{lastExportResult.error}</p>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setShowExportSuccess(false);
                    setLastExportResult(null);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Success Screen */}
        {showExportSuccess && lastExportResult?.success && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Successful!</h2>
                <p className="text-gray-600 mb-6">
                  Your NFT has been successfully exported to the EVM blockchain.
                </p>
                
                {/* Transaction Details */}
                <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Transaction Details:</h3>
                  <div className="space-y-1 text-sm">
                    {lastExportResult.evmTransactionHash && (
                      <div>
                        <span className="text-gray-500">EVM Transaction:</span>
                        <div className="font-mono text-xs break-all">{lastExportResult.evmTransactionHash}</div>
                      </div>
                    )}
                    {lastExportResult.icTransactionHash && (
                      <div>
                        <span className="text-gray-500">IC Transaction:</span>
                        <div className="font-mono text-xs break-all">{lastExportResult.icTransactionHash}</div>
                      </div>
                    )}
                    {lastExportResult.remoteContractAddress && (
                      <div>
                        <span className="text-gray-500">Contract Address:</span>
                        <div className="font-mono text-xs break-all">{lastExportResult.remoteContractAddress}</div>
                      </div>
                    )}
                    {lastExportResult.tokenId && (
                      <div>
                        <span className="text-gray-500">Token ID:</span>
                        <div className="font-mono text-xs">{lastExportResult.tokenId}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setShowExportSuccess(false);
                    setLastExportResult(null);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Burn Error Screen */}
        {showBurnSuccess && lastBurnResult && !lastBurnResult.success && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Burn Failed</h2>
                <p className="text-gray-600 mb-4">
                  There was an issue burning your NFT. Please try again.
                </p>
                
                {lastBurnResult.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left mb-6">
                    <h3 className="font-semibold text-red-900 mb-2">Error Details:</h3>
                    <p className="text-sm text-red-700">{lastBurnResult.error}</p>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setShowBurnSuccess(false);
                    setLastBurnResult(null);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Burn Success Screen */}
        {showBurnSuccess && lastBurnResult?.success && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Burn Successful!</h2>
                <p className="text-gray-600 mb-6">
                  Your EVM NFT has been burned and a ckNFT has been minted on the Internet Computer.
                </p>
                
                {/* Transaction Details */}
                <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Transaction Details:</h3>
                  <div className="space-y-1 text-sm">
                    {lastBurnResult.icTransactionHash && (
                      <div>
                        <span className="text-gray-500">IC Transaction:</span>
                        <div className="font-mono text-xs break-all">{lastBurnResult.icTransactionHash}</div>
                      </div>
                    )}
                    {lastBurnResult.ckNFTCanisterId && (
                      <div>
                        <span className="text-gray-500">ckNFT Canister:</span>
                        <div className="font-mono text-xs break-all">{lastBurnResult.ckNFTCanisterId}</div>
                      </div>
                    )}
                    {lastBurnResult.tokenId && (
                      <div>
                        <span className="text-gray-500">Token ID:</span>
                        <div className="font-mono text-xs">{lastBurnResult.tokenId}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setShowBurnSuccess(false);
                    setLastBurnResult(null);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Return Error Screen */}
        {showReturnSuccess && lastReturnResult && !lastReturnResult.success && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Return Failed</h2>
                <p className="text-gray-600 mb-4">
                  There was an issue returning your ckNFT. Please try again.
                </p>
                
                {lastReturnResult.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left mb-6">
                    <h3 className="font-semibold text-red-900 mb-2">Error Details:</h3>
                    <p className="text-sm text-red-700">{lastReturnResult.error}</p>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setShowReturnSuccess(false);
                    setLastReturnResult(null);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Return Success Screen */}
        {showReturnSuccess && lastReturnResult?.success && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Return Successful!</h2>
                <p className="text-gray-600 mb-6">
                  Your ckNFT has been returned to the EVM blockchain.
                </p>
                
                {/* Transaction Details */}
                <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Transaction Details:</h3>
                  <div className="space-y-1 text-sm">
                    {lastReturnResult.evmTransactionHash && (
                      <div>
                        <span className="text-gray-500">EVM Transaction:</span>
                        <div className="font-mono text-xs break-all">{lastReturnResult.evmTransactionHash}</div>
                      </div>
                    )}
                    {lastReturnResult.targetChainId && (
                      <div>
                        <span className="text-gray-500">Target Chain:</span>
                        <div className="font-mono text-xs">Chain {lastReturnResult.targetChainId}</div>
                      </div>
                    )}
                    {lastReturnResult.targetContractAddress && (
                      <div>
                        <span className="text-gray-500">Contract Address:</span>
                        <div className="font-mono text-xs break-all">{lastReturnResult.targetContractAddress}</div>
                      </div>
                    )}
                    {lastReturnResult.tokenId && (
                      <div>
                        <span className="text-gray-500">Token ID:</span>
                        <div className="font-mono text-xs">{lastReturnResult.tokenId}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setShowReturnSuccess(false);
                    setLastReturnResult(null);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inline Import Wizard */}
        {activeWizard === 'import' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Import from EVM</h3>
              <button
                onClick={() => setActiveWizard(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <EVMImportWizard
              canisterId="umunu-kh777-77774-qaaca-cai"
              supportedNetworks={['ethereum', 'polygon', 'bsc', 'optimism', 'base', 'arbitrum', 'hardhat', 'hardhat-2']}
              onComplete={handleImportComplete}
              onCancel={() => setActiveWizard(null)}
            />
          </div>
        )}

        {/* Inline Export Wizard */}
        {activeWizard === 'export' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Export to EVM</h3>
              <button
                onClick={() => setActiveWizard(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <EVMExportWizard
              sourceCanisterId="umunu-kh777-77774-qaaca-cai"
              supportedNetworks={['ethereum', 'polygon', 'bsc', 'optimism', 'base', 'arbitrum', 'hardhat', 'hardhat-2']}
              onComplete={handleExportComplete}
              onCancel={() => setActiveWizard(null)}
            />
          </div>
        )}

        {/* Inline Burn Wizard */}
        {activeWizard === 'burn' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Burn EVM NFT</h3>
              <button
                onClick={() => setActiveWizard(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <EVMBurnWizard
              // Let the user select their own NFT instead of using mock values
              // sourceChainId="1"
              // sourceContractAddress="0x1234567890123456789012345678901234567890" 
              // sourceTokenId="123"
              onComplete={handleBurnComplete}
              onCancel={() => setActiveWizard(null)}
              modal={false}
            />
          </div>
        )}

        {/* Inline Return Wizard */}
        {activeWizard === 'return' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Return ckNFT</h3>
              <button
                onClick={() => setActiveWizard(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ICReturnWizard
              onComplete={handleReturnComplete}
              onCancel={() => setActiveWizard(null)}
              modal={false}
            />
          </div>
        )}

        {/* Modal Import Wizard */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <EVMImportWizard
                canisterId="rrkah-fqaaa-aaaaa-aaaaq-cai"
                supportedNetworks={['ethereum', 'polygon', 'bsc', 'optimism', 'base', 'arbitrum', 'hardhat', 'hardhat-2']}
                modal={true}
                onComplete={(result: ImportResult) => {
                  handleImportComplete(result);
                  setShowImportModal(false);
                  // Success/error screen will show automatically based on showImportSuccess state
                }}
                onCancel={() => setShowImportModal(false)}
              />
            </div>
          </div>
        )}

        {/* Modal Export Wizard */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <EVMExportWizard
                sourceCanisterId="rrkah-fqaaa-aaaaa-aaaaq-cai"
                supportedNetworks={['ethereum', 'polygon', 'bsc', 'optimism', 'base', 'arbitrum', 'hardhat', 'hardhat-2']}
                modal={true}
                onComplete={(result: ExportResult) => {
                  handleExportComplete(result);
                  setShowExportModal(false);
                  // Success/error screen will show automatically based on showExportSuccess state
                }}
                onCancel={() => setShowExportModal(false)}
              />
            </div>
          </div>
        )}

        {/* Modal Burn Wizard */}
        {showBurnModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <EVMBurnWizard
                // Let the user select their own NFT instead of using mock values
                // sourceChainId="1"
                // sourceContractAddress="0x1234567890123456789012345678901234567890"
                // sourceTokenId="123"
                modal={true}
                onComplete={(result: BurnResult) => {
                  handleBurnComplete(result);
                  setShowBurnModal(false);
                  // Success/error screen will show automatically based on showBurnSuccess state
                }}
                onCancel={() => setShowBurnModal(false)}
              />
            </div>
          </div>
        )}

        {/* Modal Return Wizard */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <ICReturnWizard
                modal={true}
                onComplete={(result: ReturnResult) => {
                  handleReturnComplete(result);
                  setShowReturnModal(false);
                  // Success/error screen will show automatically based on showReturnSuccess state
                }}
                onCancel={() => setShowReturnModal(false)}
              />
            </div>
          </div>
        )}

        {/* Last Results Display */}
        {(lastImportResult || lastExportResult || lastBurnResult || lastReturnResult) && (
          <div className="mt-8 space-y-4">
            {lastImportResult && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">Last Import Result:</h3>
                <pre className="bg-black/30 rounded-lg p-4 text-sm text-green-300 overflow-auto">
                  {JSON.stringify(lastImportResult, null, 2)}
                </pre>
              </div>
            )}
            {lastExportResult && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">Last Export Result:</h3>
                <pre className="bg-black/30 rounded-lg p-4 text-sm text-green-300 overflow-auto">
                  {JSON.stringify(lastExportResult, null, 2)}
                </pre>
              </div>
            )}
            {lastBurnResult && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">Last Burn Result:</h3>
                <pre className="bg-black/30 rounded-lg p-4 text-sm text-red-300 overflow-auto">
                  {JSON.stringify(lastBurnResult, null, 2)}
                </pre>
              </div>
            )}
            {lastReturnResult && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">Last Return Result:</h3>
                <pre className="bg-black/30 rounded-lg p-4 text-sm text-purple-300 overflow-auto">
                  {JSON.stringify(lastReturnResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
