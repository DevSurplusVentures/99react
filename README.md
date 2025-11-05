# 99React


> [!NOTE]
> **📚 Comprehensive Storybook Documentation Available**
> 
> This project includes extensive Storybook documentation covering components, hooks, bridge flows, and architecture patterns. See the [Storybook Documentation](#storybook-documentation) section below for setup and navigation instructions.

[![MIT License][license-shield]](LICENSE)



### Frontend

Dependencies:

- [React 19](https://react.dev): The long awaited upgrade brings form actions, optimistic UI updates while mutating, etc etc.
- [Vite 6](https://vite.dev/): The most significant major release since Vite 2, featuring a new Environment API for enhanced flexibility, extended framework support, and streamlined performance for modern web development.
- [Tailwind 4](https://tailwindcss.com/docs/v4-beta): The new version of Tailwind CSS is a ground-up rewrite of the framework, providing faster builds, great new CSS classes and better performance.
- [Tanstack Query 5](https://tanstack.com/query/latest): The template uses Tanstack Query for data fetching, caching and loading state management.
- [Tanstack Router](https://tanstack.com/router/latest): Modern and scalable routing for React and Solid applications
- [SWC](https://swc.rs/): The Rust based compiler and bundler that provides up to 70x faster build times than Babel.
- [Eslint 9](https://eslint.org/): The latest release of Eslint introduces the flat configuration API along with new rules and bug fixes.
- [shadcn/ui](https://ui.shadcn.com/): Yes, shadcn support for Tailwind 4 is finally here!

### Solana Integration

The project includes comprehensive support for bridging NFTs between the Internet Computer and Solana using the **ICRC-99 cross-chain NFT protocol**. Key Solana integrations:

#### 🔗 Wallet Support
- **[@solana/wallet-adapter](https://github.com/solana-labs/wallet-adapter)** (v0.15.39): Industry-standard multi-wallet integration
  - **Phantom** - Most popular Solana wallet
  - **Backpack** - Developer-friendly with custom RPC support
  - **Solflare** - Feature-rich with hardware wallet support
  - Auto-detection of installed wallets
  - Unified connection/signing interface

#### 🎨 NFT Standards  
- **[@metaplex-foundation/js](https://github.com/metaplex-foundation/js)** (v0.20.1): Solana NFT metadata and discovery
  - Token Metadata Program integration
  - Automatic NFT discovery by wallet
  - Collection support and verification
  - Compressed NFT (Bubblegum) support
  - On-chain and off-chain metadata resolution

#### 🌐 Network Flexibility
- **Multi-cluster support**: mainnet-beta, devnet, testnet, custom RPC
- **Local validator integration**: Full support for solana-test-validator
- **Custom RPC detection**: Automatically detects and uses wallet-configured RPC endpoints
- **Network mapping**: Seamless coordination between IC and Solana networks

#### 🔄 Bridge Features
- **Bidirectional transfers**: Import from Solana → IC, Export from IC → Solana
- **Burn-and-mint architecture**: Secure cross-chain NFT transfers
- **ICRC-99 protocol**: Source pointer tracking, cast operations, dual approval system
- **Cost transparency**: Clear breakdown of cycles (IC) and SOL (Solana) costs
- **Priority fee support**: 4 preset levels for Solana transaction speed

#### 📚 Documentation
- **Architecture docs** in `.plan/architecture/`:
  - [`custom-rpc-support.md`](.plan/architecture/custom-rpc-support.md) - Custom RPC and local validator setup
  - [`metaplex-integration.md`](.plan/architecture/metaplex-integration.md) - NFT metadata and discovery
  - [`solana-wallet-adapter.md`](.plan/architecture/solana-wallet-adapter.md) - Wallet integration patterns
  - [`solana-bridge-flow.md`](.plan/architecture/solana-bridge-flow.md) - Complete bridge workflows
- **Quick start guide**: [`SOLANA_QUICKSTART.md`](SOLANA_QUICKSTART.md)
- **Storybook stories**: Complete component and workflow documentation (see below)

## Setup, dev environment

There are two main ways to set up the dev environment:

### 1. Using a VS Code Dev Container

The dev containers extension lets you use a Docker container as a full-featured
development environment. This repository includes a dev container configuration
that you can use to open the project with all the necessary tools and
dependencies pre-installed.

Pre-requisites:

- [Docker](https://www.docker.com/products/docker-desktop)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Dev Containers Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

Once Docker, Visual Studio Code and the Dev Containers Extension are installed,
you can open the project in a container by clicking the button below:

[![Open locally in Dev Containers](https://img.shields.io/static/v1?label=Dev%20Containers&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/kristoferlund/ic-vite-react-next)

### 2. Setup manually

Pre-requisites:

- [Local Internet Computer dev environment](https://internetcomputer.org/docs/current/developer-docs/backend/rust/dev-env)
- [pnpm](https://pnpm.io/installation)

Once you have the prerequisites installed, you can clone this repository and run
the project.

## Running the project

### 1. Start the Internet Computer

```bash
dfx start --background
```

### 2. Install dependencies

```
pnpm install
```

### 3. Deploy the canisters

```
dfx deploy
```

## Develop

During development, you can run the frontend with hot reloading using Vite.

```bash
pnpm run dev
```

## Storybook Documentation

This project includes comprehensive Storybook documentation covering all components, hooks, architecture patterns, and bridge flows.

### 🚀 Quick Start

**Run Storybook in development mode:**
```bash
pnpm run storybook
```
This will start Storybook at `http://localhost:6006`

**Build Storybook for production:**
```bash
pnpm run build-storybook
```
This generates a static build in the `storybook-static/` directory.

### 📖 Documentation Structure

The Storybook documentation is organized into the following sections:

#### 🏗️ **System Documentation**
- **Architecture Overview** - System architecture, data flow, and component patterns
- **Component Design System** - Design tokens, composition patterns, and UI guidelines  
- **Hook Usage Patterns** - Comprehensive hook documentation with real-world examples
- **Bridge Flow Documentation** - Complete bridge system workflows and testing strategies

#### 🧩 **Component Stories**
- **UI Components** - Basic UI building blocks (Button, Card, etc.)
- **NFT Components** - NFT-specific components (NFTCard, CollectionDetail, etc.)
- **Bridge Components** - Cross-chain bridge wizards and steps
- **Market Components** - Marketplace and trading components

#### 🌐 **Solana Bridge Stories** (New!)
Complete documentation for Solana ↔ IC bridging:

**Hooks:**
- `SolanaHooks` - useSolana() hook with wallet connection, balance, signing (6 variants)

**Import Wizard (Solana → IC):**
- `SolanaConnectionStep` - Wallet connection and cluster selection (30+ variants)
- `SolanaNetworkSelectionStep` - Network targeting and RPC configuration (23 variants)
- `SolanaNFTSelectionStep` - NFT discovery via Metaplex, collection browsing (24 variants)
- `SolanaImportWizard` - Complete 6-step import flow (17 variants)

**Export Wizard (IC → Solana):**
- `SolanaExportCostStep` - Cost calculation, dual approval, priority fees (27 variants)
- `SolanaExportWizard` - Complete 4-step export flow with ICRC-99 cast (16 variants)

**Total: 7 story files, 127+ documented variants**

#### 🪝 **Hook Stories**
- **Authentication Hooks** - User authentication and identity management
- **NFT Hooks** - NFT metadata, collections, and ownership
- **Bridge Hooks** - Cross-chain bridging functionality
- **Market Hooks** - Marketplace operations and pricing
- **Utility Hooks** - Helper hooks and common patterns

### 🧭 Navigation Guide

#### **Getting Started**
1. **Start with Architecture** (`Docs > Architecture`) - Understand the overall system design
2. **Review Component Patterns** (`Docs > Component Design System`) - Learn design principles
3. **Explore Hook Patterns** (`Docs > Hook Usage Patterns`) - See real implementation examples

#### **Component Development**
- Browse `Components` section for interactive component examples
- Each component story includes:
  - **Usage examples** with live previews
  - **Props documentation** with interactive controls
  - **Design variants** (loading, error, success states)
  - **Real data integration** examples

#### **Hook Development**  
- Explore `Hooks` section for comprehensive hook documentation
- Features include:
  - **Live hook examples** with actual API calls
  - **Error handling patterns** 
  - **Loading state management**
  - **Integration examples** showing hook composition

#### **Bridge System**
- Review `Docs > Bridge Flow Documentation` for complete bridge workflows
- **NEW: Solana Bridge** - Complete Solana ↔ IC bridging documentation:
  - `Stories > Solana Hooks` - useSolana() hook usage
  - `Stories > Bridge > Solana*` - All Solana bridge components
  - See architecture docs in `.plan/architecture/` for technical details
- Check bridge component stories for step-by-step wizards
- Test different bridge scenarios (Export, Import, Burn, Return)

### 🔧 Development Workflow

**For Component Development:**
1. Run `pnpm run storybook`
2. Navigate to your component's story
3. Use the interactive controls to test different props
4. Check all variant states (loading, error, success)
5. Verify responsive behavior using viewport controls

**For Hook Development:**
1. Check existing hook patterns in `Hooks` stories
2. Review similar hooks for implementation patterns
3. Test error scenarios using story variants
4. Verify integration with provider patterns

**For Bridge Development:**
1. Start with `Docs > Bridge Flow Documentation`
2. Review relevant bridge component stories
3. Test complete workflows end-to-end
4. Verify error handling and edge cases

### 📱 Key Features

- **Live Component Preview** - Interactive component testing with real props
- **Real Data Integration** - Stories use actual API calls and data
- **Responsive Testing** - Built-in viewport controls for mobile/desktop testing
- **Error Scenario Testing** - Stories include error states and edge cases
- **Documentation-First** - Comprehensive guides for system understanding
- **Search Functionality** - Quickly find components, hooks, or documentation

### 🎯 Best Practices

- **Always check Storybook first** when working with existing components
- **Update stories** when adding new component variants or props  
- **Test all states** - success, loading, error, and edge cases
- **Use story variants** to document different use cases
- **Follow naming conventions** established in existing stories

### 🔗 Useful Links
- **Local Storybook**: `http://localhost:6006` (when running)
- **Architecture Docs**: Navigate to `Docs > Architecture` in Storybook
- **Component Patterns**: `Docs > Component Design System`
- **Hook Examples**: `Docs > Hook Usage Patterns`

