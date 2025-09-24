import React from "react";
import { NFTCard, NFTCardProps } from "../components/NFTCard";

// Helper to mock the useNFTMetadata hook for each story
function mockUseNFTMetadata(variant: "icrc97" | "string" | "array" | "loading" | "error"): any {
  switch (variant) {
    case "icrc97":
      return {
        loading: false,
        error: null,
        metadata: {
          allMetadata: [],
          parsedMetadata: {
            icrc97raw: '{"name":"Story NFT","description":"A beautiful NFT.","image":"/globe.svg","attributes":[{"trait_type":"Background","value":"Blue"}]}',
            icrc97: {
              name: "Story NFT",
              description: "A beautiful NFT.",
              image: "/globe.svg",
              animation_url: "",
              external_url: "",
              attributes: [
                { trait_type: "Background", value: "Blue" },
              ],
            },
          },
          tokenId: 1n,
        },
      };
    case "string":
      return {
        loading: false,
        error: null,
        metadata: {
          allMetadata: [],
          parsedMetadata: {
            icrc97raw: "Just a string, not JSON",
            icrc97: {
              name: "",
              description: "",
              image: "",
              animation_url: "",
              external_url: "",
              attributes: [],
            },
          },
          tokenId: 2n,
        },
      };
    case "array":
      return {
        loading: false,
        error: null,
        metadata: {
          allMetadata: [["icrc97:metadata", { Array: [{ Text: '{"foo":"bar","baz":123}' }] }]],
          parsedMetadata: {
            icrc97raw: '{"foo":"bar","baz":123}',
            icrc97: {
              name: "",
              description: "",
              image: "",
              animation_url: "",
              external_url: "",
              attributes: [],
            },
          },
          tokenId: 3n,
        },
      };
    case "loading":
      return {
        loading: true,
        error: null,
        metadata: null,
      };
    case "error":
      return {
        loading: false,
        error: "Failed to load",
        metadata: null,
      };
    default:
      return {};
  }
}

export default {
  title: "NFT/NFTCard",
  component: NFTCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
## NFTCard Component

A versatile NFT card component that displays NFT metadata, images, and interactive features.

### Features
- **ICRC97 Metadata Support**: Automatic parsing and display of ICRC97 metadata standards
- **Responsive Design**: Adapts to different screen sizes and container widths
- **Loading States**: Skeleton loading for better UX during data fetching
- **Error Handling**: Graceful degradation when metadata fails to load
- **Interactive Features**: Click handlers, selection states, and hover effects
- **Trait Display**: Supports attribute/trait visualization from metadata

### Use Cases
- Collection listings and galleries
- NFT marketplace displays
- User portfolio views
- Selection interfaces for bridging/trading
        `,
      },
    },
  },
  argTypes: {
    canisterId: { 
      control: "text",
      description: "The canister ID of the NFT collection"
    },
    tokenId: { 
      control: "number",
      description: "The token ID of the specific NFT"
    },
    variant: {
      control: { type: "select" },
      options: ["icrc97", "string", "array", "loading", "error"],
      description: "Mock variant for testing different metadata states"
    }
  },
};

const Template = (args: NFTCardProps & { variant: "icrc97" | "string" | "array" | "loading" | "error" }) => (
  <NFTCard {...args} nftMetadata={mockUseNFTMetadata(args.variant)} />
);

export const ICRC97Filled = Template.bind({});
ICRC97Filled.args = { canisterId: "aaaaa-aa", tokenId: 1n, variant: "icrc97" };

export const StringData = Template.bind({});
StringData.args = { canisterId: "aaaaa-aa", tokenId: 2n, variant: "string" };

export const ArrayData = Template.bind({});
ArrayData.args = { canisterId: "aaaaa-aa", tokenId: 3n, variant: "array" };

export const Loading = Template.bind({});
Loading.args = { canisterId: "aaaaa-aa", tokenId: 4n, variant: "loading" };

export const Error = Template.bind({});
Error.args = { canisterId: "aaaaa-aa", tokenId: 5n, variant: "error" };
