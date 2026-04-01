# Quickstart: Volume Surge Scanner Frontend Integration

**Feature**: 009-volume-surge-frontend
**Date**: 2026-04-01

## Prerequisites

- Node.js 18+ (frontend)
- Node.js 20.x (backend — already running)
- Backend running on port 3000 with Volume Surge module active

## Setup

```bash
# 1. Switch to feature branch
cd /Users/youxingzhi/ayou/money-free
git checkout 009-volume-surge-frontend

# 2. Start backend (if not already running)
cd backend
PATH="/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin:$PATH"
npm run start:dev

# 3. Start frontend (separate terminal)
cd frontend
npm run dev
```

## Verify Backend API

Before making frontend changes, confirm the actual backend routes:

```bash
# Test the scan list endpoint (adjust path if needed)
curl -s http://localhost:3000/api/v1/api/volume-surge/scans | head -c 200

# If 404, try without double api:
curl -s http://localhost:3000/api/v1/volume-surge/scans | head -c 200
```

Use whichever path returns a valid JSON response — this determines the correct relative path for the shared API client.

## Development Workflow

### Run tests
```bash
cd frontend
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm run test:ui             # Vitest UI
```

### Run specific test file
```bash
cd frontend
npx vitest run tests/pages/VolumeSurgeScanPage.test.tsx
```

### Key files to modify

| File | Purpose |
|------|---------|
| `src/components/Layout/MainLayout.tsx` | Add nav menu item |
| `src/services/volumeSurgeScanApi.ts` | Migrate to shared API client |
| `src/types/scan.types.ts` | Fix type alignment |
| `src/pages/VolumeSurgeScan/index.tsx` | Polling, error states, scan gating |
| `src/pages/VolumeSurgeScan/components/ScanTrigger.tsx` | Disable during active scan |
| `src/pages/VolumeSurgeScan/components/ResultsViewer.tsx` | Stock names, chart links, sort |
| `src/pages/VolumeSurgeScan/components/ScanHistory.tsx` | Fix data access, empty states |
| `src/pages/VolumeSurgeScan/components/ComparisonView.tsx` | Fix import, types, links |

### Verify changes

1. Open browser at `http://localhost:5173`
2. Check navigation bar shows "Volume Surge" menu item
3. Click "Volume Surge" — page should load without errors
4. Try triggering a scan and viewing results
5. Run full test suite: `npm test`
