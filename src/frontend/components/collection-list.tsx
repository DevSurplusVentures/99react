//import { useState } from "react";
import { useRouter } from '@tanstack/react-router';
import CollectionExplorer from "../../components/CollectionExplorer";

export default function CollectionList() {
  // List of canister IDs for the NFT collections
  const canisterIds = [
    "umunu-kh777-77774-qaaca-cai",
    "ulvla-h7777-77774-qaacq-cai",
    "ucwa4-rx777-77774-qaada-cai"
  ];
  const router = useRouter();

  return (
    <div className="flex flex-col bg-[#522785] p-10 rounded-xl items-center text-xl text-white gap-5">
      <div className="mb-6">NFT Collections</div>
      <CollectionExplorer
        canisterIds={canisterIds}
        onSelectCollection={(canisterId) => {
          router.navigate({
            to: `/collection_detail/${canisterId}`,
            params: { canisterId },
          });
        }}
      />
    </div>
  );
}
