import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { AgentProvider } from "../provider/AgentProvider";
import { SolanaWalletProvider } from "../provider/SolanaWalletProvider";
import "@nfid/identitykit/react/styles.css";
import { IdentityKitProvider } from "@nfid/identitykit/react";
import { IdentityKitAuthType } from "@nfid/identitykit";

// Create a new Tanstack Query client instance
const queryClient = new QueryClient();

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new Tanstack Router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

// Determine Solana network configuration based on environment
const solanaConfig = window.location.hostname === "localhost"
  ? {
      // For local development, connect to local test validator
      cluster: "devnet" as const, // cluster param is required but we override with endpoint
      endpoint: "http://127.0.0.1:8899",
    }
  : {
      // For production, use mainnet with a reliable public RPC
      // Using QuickNode's public proxy - better rate limits than api.mainnet-beta.solana.com
      cluster: "mainnet-beta" as const,
      endpoint: "https://solana-mainnet.rpc.extrnode.com", // Free public RPC with good rate limits
    };

console.log(
  `🔗 Solana Network Configuration:`,
  `\n  - Cluster: ${solanaConfig.cluster}`,
  `\n  - Endpoint: ${"endpoint" in solanaConfig ? solanaConfig.endpoint : "default"}`,
  `\n  - Environment: ${window.location.hostname === "localhost" ? "Local Development" : "Production"}`
);

createRoot(rootElement).render(
  <StrictMode>
    <SolanaWalletProvider {...solanaConfig}>
      <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
        <AgentProvider network={window.location.hostname === "localhost" ? "local" : "ic"}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </AgentProvider>
      </IdentityKitProvider>
    </SolanaWalletProvider>
  </StrictMode>,
);
