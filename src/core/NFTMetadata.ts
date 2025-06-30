// import { parse } from "path"; // Currently unused
import { Value__1  } from "../declarations/nft/nft.did.d";

export interface ICRC97 {
    icrc97raw: string;
    icrc97: {
      name: string;
      description: string;
      image: string;
      animation_url: string;
      external_url: string;
      attributes: { trait_type: string; value: string }[];
    };
  };

//declare the NFT metadata interface
export interface NFTMetadata {
  allMetadata: [string, Value__1][];
  parsedMetadata: {
    icrc97raw: string;
    icrc97: {
      name: string;
      description: string;
      image: string;
      animation_url: string;
      external_url: string;
      attributes: {
        trait_type: string;
        value: string;
      }[];
    };
  };
  tokenId: bigint;  
};

function parseJSON(json: string): ICRC97{
  console.log("parseJSON called with json:", json);
  try {
    const parsed = JSON.parse(json);
    return {
      icrc97raw: json,
      icrc97: {
        name: parsed.name || "",
        description: parsed.description || "",
        image: parsed.image || "",
        animation_url: parsed.animation_url || "",
        external_url: parsed.external_url || "",
        attributes: parsed.attributes || [],
      },
    };
  } catch (e) {
    console.error("Failed to parse JSON in parseJSON:", e);
    return {
      icrc97raw: json,
      icrc97: {
        name: "",
        description: "",
        image: "",
        animation_url: "",
        external_url: "",
        attributes: [],
      },
    };
  }
}


export async function parseNFTMetadata(tokenId: bigint, metadata: [string, Value__1][]):  Promise<NFTMetadata> {
  console.log("parseNFTMetadata called with tokenId:", tokenId, "metadata:", metadata);
  const allMetadata: [string, Value__1][] = metadata;
  let parsedMetadata: ICRC97 = {
    icrc97raw: "",
    icrc97: {
      name: "",
      description: "",
      image: "",
      animation_url: "",
      external_url: "",
      attributes: [],
    },
  };


  for (const entry of allMetadata){
    console.log("Processing metadata entry:", entry, entry[0], entry[0][0], entry[0][0] =="icrc97:metadata");
    if(entry[0][0] === "icrc97:metadata" || entry[0][0] === "icrc97:metadata_v1") {
      const key = entry[0][0];
      const value = entry[0][1];

        //this is an icrc97 metadata entry
        //find the first parsable or discoverable value
        console.log("Parsing metadata for tokenId:", tokenId, "key:", key, "value:", value);

        // Check if value is an array type (assuming Value__1 uses a discriminated union like { Array: [...] })
        if (typeof value === "object" && value !== null && "Array" in value && Array.isArray((value as any).Array)) {
          console.log("Found Array in value:", (value as any).Array);
          for (const val of (value as any).Array) {
            if ("Text" in val) {
              console.log("Found Text value in Array:", val.Text);
              // data uri
              if(val.Text.startsWith("data:text/json") ){
                //todo: how do we make string safe to parse?
                const raw = JSON.parse(val.Text.substring(val.Text.indexOf(";") + 1));              
                
                parsedMetadata = parseJSON(raw);
                break;
              };
              if(val.Text.startsWith("https://") || val.Text.startsWith("http://")) {
                //fetch the url
                let response = await fetch(val.Text);
                console.log("Fetched URL response:", response);
                if (response.ok) {
                  const text = await response.text();
                  console.log("Fetched URL text:", text);
                  parsedMetadata = parseJSON(text);
                  break;
                } else {
                  console.error("Failed to fetch URL:", val.Text);
                  parsedMetadata = {
                    icrc97raw: val.Text,
                    icrc97: {
                      name: "",
                      description: "",
                      image: "",
                      animation_url: "",
                      external_url: "",
                      attributes: [],
                    },
                  };
                };

                parsedMetadata = parseJSON(val.Text);
                break;
              };
              //todo: ipfs
            };
          };
        } else if (typeof value === "string") {
          parsedMetadata.icrc97raw = value;
        } else {
          parsedMetadata.icrc97raw = JSON.stringify(value);
        };

   
      //todo: handle other metadata types
    };
  };

  return {
    allMetadata,
    parsedMetadata,
    tokenId,
  };
}