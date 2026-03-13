# Analyze Stock VCP Pattern

A command to analyze VCP (Volatility Contraction Pattern) for a specific stock using our backend analysis engine.

## Usage

Run this command and provide a **stock code** or **stock name** when prompted.

Examples:
- By code: `600233`, `600884`, `000001`
- By name: `圆通速递`, `杉杉股份`, `平安银行`

## What it does

1. **Loads stock data** from SQLite database
2. **Analyzes VCP pattern** using our algorithm:
   - Detects contraction stages (收缩阶段)
   - Identifies pullback phases (回调阶段)
   - Calculates trend template checks
   - Evaluates volume behavior
3. **Generates detailed report** including:
   - VCP validity (有效/无效)
   - Contraction count and percentages
   - Volume dry-up status
   - Recent pullback analysis
   - Last 10 days K-line data

## Command

```bash
cd /Users/youxingzhi/ayou/money-free/backend && \
PATH="/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin:$PATH" \
npx ts-node src/scripts/analyze-stock-vcp.ts {{STOCK_CODE_OR_NAME}}
```

**Supports both stock code and stock name:**
- `npx ts-node src/scripts/analyze-stock-vcp.ts 600233`
- `npx ts-node src/scripts/analyze-stock-vcp.ts 圆通速递`

## Example Output

**Example 1: Valid VCP (using code)**
```bash
npx ts-node src/scripts/analyze-stock-vcp.ts 600233
```
Output:
- ✅ VCP形态: 有效
- 收缩次数: 5
- 最后收缩幅度: 7.43%
- 成交量萎缩: 是

**Example 2: Invalid VCP (using name)**
```bash
npx ts-node src/scripts/analyze-stock-vcp.ts 杉杉股份
```
Output:
- ❌ VCP形态: 无效
- 收缩次数: 8
- 最后收缩幅度: 16.15% (过大)
- 成交量萎缩: 否

## Requirements

- Node.js 20.x (backend requirement)
- Stock must have K-line data in database
- Stock must have technical indicators calculated

## Related Scripts

- `calculate-vcp.ts` - Batch scan all stocks
- `show-all-vcp.ts` - Show all valid VCP stocks
- `export-all-vcp.ts` - Export VCP results to file

## Quick Start

**Using stock code:**
```bash
cd backend
npx ts-node src/scripts/analyze-stock-vcp.ts 600233
```

**Using stock name (partial match supported):**
```bash
cd backend
npx ts-node src/scripts/analyze-stock-vcp.ts 圆通
# Will find "圆通速递"
```

## Tips

1. **Name search is flexible**: Partial name matching is supported (e.g., "圆通" will find "圆通速递")
2. **Check data availability first**: Ensure the stock has sufficient historical data (at least 252 days)
3. **Run after market close**: For most accurate daily analysis
4. **Compare with manual analysis**: Use this as a starting point, not final decision
5. **Focus on key metrics**:
   - Contraction count: ≥2 (more is better)
   - Last contraction %: <10% (tighter is better)
   - Volume dry-up: Yes (confirms pattern)
   - RS Rating: >70 (relative strength)

## Interpretation Guide

### Valid VCP Indicators
- ✅ Contractions progressively tighten (e.g., 20% → 15% → 10% → 7%)
- ✅ Volume decreases during contractions
- ✅ Stock maintains structure above MA50/MA150/MA200
- ✅ Recent pullback shallow (<10%)

### Invalid VCP Signals
- ❌ Contractions increase or stay large (e.g., 15% → 20%)
- ❌ Volume expands during contractions
- ❌ Price breaks below key moving averages
- ❌ Deep pullbacks (>15%)

## Troubleshooting

**Error: "Cannot find module"**
- Solution: Run `npm run build` first or use `ts-node` instead

**Error: "Stock not found"**
- Solution: 
  - Check if stock code format is correct (e.g., 600233 not 600233.SH)
  - For stock names, ensure it matches database records (partial match supported)
  - Try both code and name if one doesn't work

**Error: "Insufficient data"**
- Solution: Stock needs at least 252 days of K-line data
