# Internet Computer Deployment Guide

## Overview
This guide explains how to build and deploy your Vite + React app to the Internet Computer.

## Build Process

### 1. Standard Build (Development)
```bash
npm run build
```
This creates a static site in `src/frontend/dist/` that works for local IC deployment.

### 2. Production Build for IC Mainnet
For production deployment, ensure you're using the correct environment:

```bash
# Build for mainnet
DFX_NETWORK=ic npm run build
```

## Deployment Steps

### Local Deployment (Testing)

```bash
# 1. Start local replica
dfx start --clean --background

# 2. Build your app
npm run build

# 3. Deploy
dfx deploy frontend

# 4. Get the canister URL
echo "http://$(dfx canister id frontend).localhost:4943"
```

### Mainnet Deployment

```bash
# 1. Build for production
DFX_NETWORK=ic npm run build

# 2. Deploy to mainnet (requires cycles)
dfx deploy --network ic frontend

# 3. Get the canister URL
echo "https://$(dfx canister id frontend --network ic).icp0.io"
# Alternative raw URL:
echo "https://$(dfx canister id frontend --network ic).raw.icp0.io"
```

## Important Configuration Notes

### 1. Asset Canister Configuration
The `frontend` canister in `dfx.json` is configured as an assets canister:
- **Type**: `assets` - Serves static files
- **Source**: `src/frontend/dist` - Where Vite outputs built files

### 2. Routing Considerations
For client-side routing (TanStack Router), the IC asset canister automatically handles:
- Serving `index.html` for routes that don't match files
- Proper MIME types for assets
- Gzip compression for text files

### 3. Environment Variables
Environment variables are injected at build time via the `vite-plugin-environment`:
- `CANISTER_*` - Canister IDs
- `DFX_*` - DFX network info
- `ICRC99_*` - Custom orchestrator config
- `CYCLES_LEDGER_*` - Cycles ledger config

These are available via `process.env.VARIABLE_NAME` in your code.

## Build Output Structure

After `npm run build`, you should see:
```
src/frontend/dist/
├── index.html          # Entry point
├── assets/             # Bundled JS, CSS, and assets
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── ...
```

## Troubleshooting

### Issue: 404 errors on routes
**Solution**: The IC asset canister should handle this automatically. If not, ensure you're accessing via the `.icp0.io` or `.raw.icp0.io` domain.

### Issue: Large bundle size
**Solution**: 
1. Enable tree-shaking by using named imports
2. Consider lazy loading routes
3. Use dynamic imports for large libraries

### Issue: Environment variables not working
**Solution**: 
1. Ensure variables are prefixed with allowed prefixes
2. Rebuild after changing `.env` files
3. Check that `vite-plugin-environment` is properly configured

### Issue: Assets not loading
**Solution**:
1. Check that paths are relative (start with `./` or `/`)
2. Verify `src/frontend/dist` has all necessary files
3. Clear browser cache

## Performance Optimization

### 1. Chunking Strategy
The current config uses default chunking. For IC optimization:
- Keep vendor chunks separate
- Use code splitting for routes
- Consider manual chunks for large dependencies

### 2. Compression
IC asset canisters automatically gzip text files. Ensure:
- Large JSON/JS files are properly compressed
- Images are pre-optimized before deployment

### 3. Caching
IC canisters support HTTP caching headers:
- Hashed assets get long cache times automatically
- `index.html` gets short cache times

## Advanced Configuration

### Custom Base Path (if needed)
If you need to serve from a subdirectory:

```typescript
// vite.config.ts
export default defineConfig({
  base: process.env.DFX_NETWORK === 'ic' ? '/' : '/',
  // ... rest of config
})
```

### Multiple Frontends
You can deploy multiple frontend canisters by adding more to `dfx.json`:

```json
{
  "canisters": {
    "frontend": { ... },
    "admin-frontend": {
      "source": ["src/admin/dist"],
      "type": "assets"
    }
  }
}
```

## Deployment Checklist

- [ ] All environment variables set correctly
- [ ] Run `npm run build` successfully
- [ ] Test locally with `dfx deploy` first
- [ ] Verify all routes work locally
- [ ] Check bundle size is reasonable
- [ ] Deploy to mainnet with `dfx deploy --network ic`
- [ ] Test production URL
- [ ] Verify all external calls work (Solana, EVM, etc.)
- [ ] Check browser console for errors

## Continuous Deployment

Consider setting up GitHub Actions for automated deployment:

```yaml
name: Deploy to IC
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: dfinity/setup-dfx@main
      - run: dfx deploy --network ic
        env:
          DFX_IDENTITY: ${{ secrets.DFX_IDENTITY }}
```

## Cost Considerations

- **Storage**: ~$5/GB/year for asset storage
- **Compute**: Minimal for static sites (mostly free)
- **Bandwidth**: ~$0.50/GB for downloads

For a typical React SPA (2-5MB), expect ~$0.50-1.00/year in storage costs.

## Support

- [IC Developer Docs](https://internetcomputer.org/docs)
- [Vite Deploy Guide](https://vitejs.dev/guide/static-deploy.html)
- [DFX Documentation](https://internetcomputer.org/docs/current/developer-docs/setup/deploy-mainnet)
