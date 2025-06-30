import React from 'react';
import ProductCard from './ProductCard';
import { Header } from './Header';
import { MarketLeaderBoardRow } from './MarketLeaderBoard.stories';
import { MarketplaceTableListRow } from './MarketplaceTableList.stories';
import { TraitsGroup } from './TraitsExplorer.stories';
import { OwnedNFTCard } from './OwnedNFTs.stories';

export default {
  title: 'Showcase/AllObjects',
  parameters: { layout: 'fullscreen' },
};

// Demo data
const leaderboard = [
  { rank: 1, name: 'Ape Club', volume: '1,320 ICP', floor: '2.1 ICP', change: '+12%' },
  { rank: 2, name: 'Pixel Artifacts', volume: '258 ICP', floor: '0.23 ICP', change: '-2%' },
  { rank: 3, name: 'Crypto Frogs', volume: '980 ICP', floor: '6 ICP', change: '+5%' },
];
const nfts = [
  { id: '1', name: 'Bored Ape', price: '2.1 ICP', owner: 'aa...', lastSale: '2.3 ICP' },
  { id: '2', name: 'Crypto Frog', price: '0.6 ICP', owner: 'bb...', lastSale: '0.64 ICP' },
  { id: '3', name: 'Pixel Artifact', price: '5.5 ICP', owner: 'cc...', lastSale: '4.9 ICP' },
];
const collections = [
  { name: 'Ape Club', id: 'cl1', items: 1234, floor: '2.1 ICP', volume: '1.3k ICP' },
  { name: 'Pixel Artifacts', id: 'cl2', items: 408, floor: '0.23 ICP', volume: '258 ICP' },
  { name: 'Crypto Frogs', id: 'cl3', items: 5000, floor: '6 ICP', volume: '3.2k ICP' },
];
const traitGroups = [
  { label: 'Background', options: [{ name: 'Blue', count: 42 }, { name: 'Pink', count: 31 }] },
  { label: 'Eyes', options: [{ name: 'Laser', count: 10 }, { name: 'Closed', count: 12 }, { name: 'Open', count: 50 }] },
  { label: 'Hat', options: [{ name: 'Cap', count: 24 }, { name: 'Crown', count: 6 }] }
];
const ownedNFTs = [
  { name: 'My NFT 1', id: '001', status: 'owned' },
  { name: 'My NFT 2', id: '002', status: 'listed' },
];

// Add a local CollectionCard component for demo purposes
const CollectionCard = ({ name, id, items, floor, volume, className = '', style = {} }) => (
  <div
    className={`p-5 bg-white rounded-xl border shadow flex flex-col gap-2 ${className}`}
    style={style}
  >
    <div className="font-bold text-lg text-gray-800">{name}</div>
    <div className="text-xs text-gray-400 mb-1">ID: {id}</div>
    <div className="flex gap-3 text-sm text-gray-600">
      <span>Items: <b>{items}</b></span>
      <span>Floor: <b>{floor}</b></span>
      <span>Vol: <b>{volume}</b></span>
    </div>
  </div>
);

export const Flat = () => (
  <div className="bg-gray-50 min-h-screen p-8">
    <Header user={{ name: 'Jane Doe' }} onLogin={() => {}} onLogout={() => {}} onCreateAccount={() => {}} />
    <h1 className="font-bold text-3xl my-8">Marketplace Flat Demo</h1>
    <div className="flex gap-8 flex-wrap mb-10">
      <ProductCard
        title="Wireless Headphones"
        price={99.99}
        image="/globe.svg"
        onAddToCart={() => {}}
      />
      <ProductCard
        title="Premium Sneakers"
        price={150}
        image="/globe.svg"
        onAddToCart={() => {}}
        className="rounded-lg shadow-lg border border-gray-300"
      >
        <span className="text-gray-400 text-xs">Limited Edition</span>
      </ProductCard>
    </div>
    <div className="mb-10">
      <section className="p-8 bg-gray-100 rounded-lg">
        <h2>NFTs (List View)</h2>
        <table className="w-full border-collapse bg-transparent">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Owner</th>
              <th>Price</th>
              <th>Last Sale</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {nfts.map((nft) => (
              <MarketplaceTableListRow key={nft.id} {...nft} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
    <div className="mb-10">
      <main className="p-8 bg-blue-50 rounded-lg">
        <h2>Explore NFT Collections</h2>
        <div className="grid grid-cols-auto-fit gap-7">
          {collections.map((col, idx) => (
            <CollectionCard key={idx} {...col} />
          ))}
        </div>
      </main>
    </div>
    <div className="mb-10">
      <section className="p-8 bg-gray-50 rounded-lg">
        <h3>Top NFT Collections</h3>
        <table className="w-full border-collapse bg-transparent">
          <thead>
            <tr className="bg-blue-100">
              <th className="text-left p-2">#</th>
              <th className="text-left p-2">Collection</th>
              <th className="text-left p-2">Vol</th>
              <th className="text-left p-2">Floor</th>
              <th className="text-left p-2">7d Change</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <MarketLeaderBoardRow key={row.rank} {...row} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
    <div className="mb-10">
      <aside className="border border-gray-400 rounded-lg p-6 bg-blue-50 min-w-[260px] max-w-[310px]">
        <h3 className="mb-4">Filter by Traits</h3>
        {traitGroups.map((group, gidx) => (
          <TraitsGroup key={gidx} {...group} />
        ))}
      </aside>
    </div>
    <div className="mb-10">
      <main className="p-8">
        <h2>Your NFTs</h2>
        <div className="flex gap-6 flex-wrap">
          {ownedNFTs.map((nft, idx) => (
            <OwnedNFTCard key={idx} {...nft} />
          ))}
        </div>
      </main>
    </div>
  </div>
);

export const Futuristic = () => (
  <div style={{
    background: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)',
    minHeight: '100vh',
    padding: 32,
    color: '#fff',
    fontFamily: 'Nunito Sans, sans-serif',
  }}>
    <Header user={{ name: 'Jane Doe' }} onLogin={() => {}} onLogout={() => {}} onCreateAccount={() => {}} />
    <h1 style={{ fontWeight: 900, fontSize: 40, margin: '32px 0 16px', letterSpacing: 2, textShadow: '0 2px 16px #00eaff55' }}>
      Marketplace Futuristic Demo
    </h1>
    <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 40 }}>
      <ProductCard
        title="Quantum Headphones"
        price={299.99}
        image="/globe.svg"
        onAddToCart={() => {}}
        className="futuristic-card"
      >
        <span style={{ color: '#00eaff', fontSize: 14, fontWeight: 700 }}>AI Powered</span>
      </ProductCard>
      <ProductCard
        title="Cyber Sneakers"
        price={420}
        image="/globe.svg"
        onAddToCart={() => {}}
        className="futuristic-card"
      >
        <span style={{ color: '#ff00cc', fontSize: 14, fontWeight: 700 }}>Limited Drop</span>
      </ProductCard>
    </div>
    <div style={{ marginBottom: 40 }}>
      <section style={{ padding: 32, background: 'rgba(20,40,80,0.7)', borderRadius: 10 }}>
        <h2 style={{ color: '#00eaff' }}>NFTs (List View)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'transparent' }}>
          <thead>
            <tr style={{ color: '#00eaff' }}>
              <th></th>
              <th>Name</th>
              <th>Owner</th>
              <th>Price</th>
              <th>Last Sale</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {nfts.map((nft) => (
              <MarketplaceTableListRow
                key={nft.id}
                {...nft}
                className="border-b border-blue-400"
                style={{ color: '#fff' }}
              />
            ))}
          </tbody>
        </table>
      </section>
    </div>
    <div style={{ marginBottom: 40 }}>
      <main style={{ padding: 32, background: 'rgba(20,40,80,0.7)', borderRadius: 10 }}>
        <h2 style={{ color: '#00eaff' }}>Explore NFT Collections</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 28 }}>
          {collections.map((col, idx) => (
            <CollectionCard
              key={idx}
              {...col}
              className="rounded-lg shadow-lg border border-blue-400"
              style={{ background: '#0e2233', color: '#fff' }}
            />
          ))}
        </div>
      </main>
    </div>
    <div style={{ marginBottom: 40 }}>
      <section style={{ padding: 32, background: 'rgba(20,40,80,0.7)', borderRadius: 10 }}>
        <h3 style={{ color: '#00eaff' }}>Top NFT Collections</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'transparent' }}>
          <thead>
            <tr style={{ color: '#00eaff' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>#</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Collection</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Vol</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Floor</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>7d Change</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <MarketLeaderBoardRow
                key={row.rank}
                {...row}
                className="border-b border-blue-400"
                style={{ color: '#fff' }}
              />
            ))}
          </tbody>
        </table>
      </section>
    </div>
    <div style={{ marginBottom: 40 }}>
      <aside style={{ border: '1px solid #00eaff', borderRadius: 8, padding: 22, background: '#0e2233', minWidth: 260, maxWidth: 310 }}>
        <h3 style={{ marginBottom: 14, color: '#00eaff' }}>Filter by Traits (Styled)</h3>
        {traitGroups.map((group, gidx) => (
          <TraitsGroup
            key={gidx}
            {...group}
            className="rounded-lg border border-blue-400"
            style={{ color: '#fff' }}
          />
        ))}
      </aside>
    </div>
    <div style={{ marginBottom: 40 }}>
      <main style={{ padding: 32, background: 'rgba(20,40,80,0.7)', borderRadius: 10 }}>
        <h2 style={{ color: '#fff' }}>Your NFTs (Styled)</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {ownedNFTs.map((nft, idx) => (
            <OwnedNFTCard
              key={idx}
              {...nft}
              className="rounded-lg border border-blue-400"
              style={{ background: '#0e2233', color: '#fff' }}
            />
          ))}
        </div>
      </main>
    </div>
    <style>{`
      .futuristic-card {
        background: rgba(20,40,80,0.85);
        border: 1.5px solid #00eaff;
        box-shadow: 0 4px 32px #00eaff33, 0 1.5px 0 #ff00cc;
        border-radius: 18px;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .futuristic-card:hover {
        transform: scale(1.04) rotate(-1deg);
        box-shadow: 0 8px 48px #00eaff77, 0 2px 0 #ff00cc;
      }
    `}</style>
  </div>
);
