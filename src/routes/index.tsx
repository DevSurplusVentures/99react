import CollectionList from "../../components/collection-list";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="space-y-8">
      {/* Hero Section with Bridge CTA */}
      <div className="text-center space-y-6 mb-12">
        <h1 className="text-4xl font-bold text-white">
          Welcome to ICRC-99 NFT Bridge
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Bridge your NFTs seamlessly between EVM chains and the Internet Computer.
          Experience fast, secure, and cost-effective cross-chain NFT transfers.
        </p>
        
        {/* Prominent Bridge Button */}
        <div className="flex justify-center gap-4 mt-8">
          <Link 
            to="/bridge" 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            🌉 Start Bridging NFTs
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">🔄 EVM ↔ IC Bridge</h3>
            <p className="text-gray-300 text-sm">
              Import your EVM NFTs to IC or export IC NFTs to EVM chains
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">⚡ Fast & Secure</h3>
            <p className="text-gray-300 text-sm">
              Powered by Internet Computer's cutting-edge blockchain technology
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">💰 Low Cost</h3>
            <p className="text-gray-300 text-sm">
              Minimal fees with transparent pricing and no hidden costs
            </p>
          </div>
        </div>
      </div>

      {/* Existing Collections */}
      <div>
        <CollectionList />
      </div>
    </div>
  );
}
