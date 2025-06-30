import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

// --- Atomic NFT Attribute Editor ---
interface NFTAttribute {
  key: string;
  value: string;
  children?: NFTAttribute[];
}

const AttributeEditor: React.FC<{
  attributes: NFTAttribute[];
  onChange: (attrs: NFTAttribute[]) => void;
}> = ({ attributes, onChange }) => {
  const updateAttr = (idx: number, attr: Partial<NFTAttribute>) => {
    const updated = attributes.map((a: NFTAttribute, i: number) => (i === idx ? { ...a, ...attr } : a));
    onChange(updated);
  };
  const addAttr = () => onChange([...attributes, { key: '', value: '', children: [] }]);
  const removeAttr = (idx: number) => onChange(attributes.filter((_, i: number) => i !== idx));
  return (
    <div className="ml-0 mt-2 w-full">
      {attributes.map((attr: NFTAttribute, idx: number) => (
        <div key={idx} className="flex items-start gap-2 mb-2 bg-blue-50 rounded-lg p-2.5 shadow-sm flex-wrap">
          <div className="flex flex-col flex-1 min-w-0">
            <input
              placeholder="Key"
              value={attr.key}
              onChange={e => updateAttr(idx, { key: e.target.value })}
              className="w-full min-w-[80px] max-w-[180px] mb-1.5 p-1.5 rounded border border-blue-200"
            />
            <input
              placeholder="Value"
              value={attr.value}
              onChange={e => updateAttr(idx, { value: e.target.value })}
              className="w-full min-w-[120px] max-w-[220px] p-1.5 rounded border border-blue-200"
            />
          </div>
          <div className="flex flex-col gap-1">
            <button onClick={() => removeAttr(idx)} title="Remove" className="text-red-600 border-none bg-none text-lg cursor-pointer p-0.5">✕</button>
            <button onClick={() => updateAttr(idx, { children: attr.children ? [...attr.children, { key: '', value: '' }] : [{ key: '', value: '' }] })} title="Add Sub-Attribute" className="text-blue-600 border-none bg-none text-lg cursor-pointer p-0.5">＋</button>
          </div>
          {attr.children && attr.children.length > 0 && (
            <div className="basis-full ml-6 mt-2">
              <AttributeEditor attributes={attr.children} onChange={children => updateAttr(idx, { children })} />
            </div>
          )}
        </div>
      ))}
      <button onClick={addAttr} className="text-sm text-blue-600 border border-blue-200 bg-blue-50 rounded mt-2 px-3 py-1 cursor-pointer">+ Add Attribute</button>
    </div>
  );
};

// --- NFT Minting UI ---
export interface NFTMintingProps {
  className?: string;
  style?: React.CSSProperties;
  initialCollections?: Collection[];
  initialSelectedCollection?: Collection | null;
  initialSelectedNFT?: NFTItem | null;
}

interface NFTItem {
  name: string;
  resources: any[];
  attributes: NFTAttribute[];
}

interface Collection {
  name: string;
  nfts: NFTItem[];
}

const NFTMinting: React.FC<NFTMintingProps> = ({ className = '', style = {}, initialCollections = [], initialSelectedCollection = null, initialSelectedNFT = null }) => {
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(initialSelectedCollection);
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(initialSelectedNFT);

  const addCollection = () => {
    const newCollection: Collection = { name: `Collection #${collections.length + 1}`, nfts: [] };
    setCollections([...collections, newCollection]);
    setSelectedCollection(newCollection);
  };

  const addNFT = () => {
    if (!selectedCollection) return;
    const newNFT: NFTItem = { name: `NFT #${selectedCollection.nfts.length + 1}`, resources: [], attributes: [] };
    const updatedCollection: Collection = { ...selectedCollection, nfts: [...selectedCollection.nfts, newNFT] };
    setCollections(collections.map((c: Collection) => (c === selectedCollection ? updatedCollection : c)));
    setSelectedCollection(updatedCollection);
    setSelectedNFT(newNFT);
  };

  const updateNFTAttributes = (attributes: NFTAttribute[]) => {
    if (!selectedCollection || !selectedNFT) return;
    const updatedNFT: NFTItem = { ...selectedNFT, attributes };
    const updatedCollection: Collection = {
      ...selectedCollection,
      nfts: selectedCollection.nfts.map((nft: NFTItem) => (nft === selectedNFT ? updatedNFT : nft)),
    };
    setCollections(collections.map((c: Collection) => (c === selectedCollection ? updatedCollection : c)));
    setSelectedCollection(updatedCollection);
    setSelectedNFT(updatedNFT);
  };

  return (
    <section
      className={className}
      style={{ minWidth: 400, ...style }}
    >
      <div className="border border-gray-300 rounded-xl p-8 bg-gray-50">
        <h2 className="text-2xl font-bold mb-4">NFT Minting</h2>
        {!selectedCollection && (
          <div>
            <button onClick={addCollection} className="mb-6 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition">Add Collection</button>
            <button className="ml-3 mb-6 px-4 py-2 rounded bg-green-700 text-white font-semibold" style={{ border: 'none' }}>Publish</button>
            <div className="flex flex-col gap-4">
              {collections.map((collection: Collection, idx: number) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-lg p-4 bg-white cursor-pointer"
                  onClick={() => setSelectedCollection(collection)}
                >
                  <div className="font-semibold">{collection.name}</div>
                  <div className="text-sm text-gray-500">NFTs: {collection.nfts.length}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {selectedCollection && !selectedNFT && (
          <div>
            <button onClick={addNFT} className="mb-6 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition">Add NFT</button>
            <div className="flex flex-col gap-4">
              {selectedCollection.nfts.map((nft: NFTItem, idx: number) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-lg p-4 bg-white cursor-pointer"
                  onClick={() => setSelectedNFT(nft)}
                >
                  <div className="font-semibold">{nft.name}</div>
                  <div className="text-sm text-gray-500">Resources: {nft.resources.length} | Attributes: {nft.attributes.length}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedCollection(null)} className="mt-6 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition">Back to Collections</button>
          </div>
        )}
        {selectedNFT && (
          <div>
            <h3 className="text-lg font-bold mb-2">{selectedNFT.name}</h3>
            {/* File upload area for NFT resources */}
            <div className="my-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
              <label className="block font-medium mb-2">Upload NFT Media/Resource</label>
              <input type="file" multiple className="mx-auto block" />
              <div className="text-sm text-gray-500 mt-1">
                Supported: images, video, audio, or other files
              </div>
            </div>
            <AttributeEditor attributes={selectedNFT.attributes} onChange={updateNFTAttributes} />
            <button onClick={() => setSelectedNFT(null)} className="mt-6 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition">Back to NFTs</button>
          </div>
        )}
      </div>
    </section>
  );
};

const meta: Meta = {
  title: 'Marketplace/NFT Minting',
  component: NFTMinting,
  parameters: { layout: 'centered' },
  tags: ['autodocs', 'wireframe'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <NFTMinting className="storybook-section" />,
};

// --- Storybook Demo States ---

// Show the collection list with demo collections
export const CollectionList: Story = {
  render: () => (
    <NFTMinting
      className="storybook-section"
      initialCollections={[
        { name: 'Demo Collection 1', nfts: [] },
        { name: 'Demo Collection 2', nfts: [] },
      ]}
    />
  ),
};

// Show the NFT list for a selected collection
export const NFTList: Story = {
  render: () => {
    const collections = [
      {
        name: 'Demo Collection',
        nfts: [
          { name: 'NFT #1', resources: [], attributes: [] },
          { name: 'NFT #2', resources: [], attributes: [] },
        ],
      },
    ];
    return (
      <NFTMinting
        className="storybook-section"
        initialCollections={collections}
        initialSelectedCollection={collections[0]}
      />
    );
  },
};

// Show the NFT editing screen for a selected NFT
export const NFTEditing: Story = {
  render: () => {
    const collections = [
      {
        name: 'Demo Collection',
        nfts: [
          { name: 'NFT #1', resources: [], attributes: [
            { key: 'trait_type', value: 'Background', children: [ { key: 'color', value: 'Blue' } ] }
          ] },
          { name: 'NFT #2', resources: [], attributes: [] },
        ],
      },
    ];
    const selectedCollection = collections[0];
    const selectedNFT = selectedCollection.nfts[0];
    return (
      <NFTMinting
        className="storybook-section"
        initialCollections={collections}
        initialSelectedCollection={selectedCollection}
        initialSelectedNFT={selectedNFT}
      />
    );
  },
};
