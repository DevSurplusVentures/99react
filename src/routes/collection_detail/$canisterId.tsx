import { createFileRoute, useParams } from "@tanstack/react-router";
import CollectionDetail from "../../../components/CollectionDetail";
import { CollectionNFTList } from '../../../components/CollectionNFTList';
import { useNFTCollection } from '../../../hooks/useNFTCollection';

export const Route = createFileRoute("/collection_detail/$canisterId")({
  component: CollectionDetailPage,
});

function CollectionDetailPage() {
  const { canisterId } = useParams({ strict: false });
  if (!canisterId) {
    return <div className="text-red-500">Invalid collection ID</div>;
  }
  // Use useNFTCollection to get metadata and all tokenIds
  const {  tokenIds, loading, error } = useNFTCollection(canisterId);
  return (
    <div className="flex flex-col bg-[#522785] p-10 rounded-xl items-center text-xl text-white gap-5">
      <CollectionDetail canisterId={canisterId} />
      <div className="w-full">
        <CollectionNFTList canisterId={canisterId} tokenIds={tokenIds} loading={loading} error={error} />
      </div>
    </div>
  );
}
