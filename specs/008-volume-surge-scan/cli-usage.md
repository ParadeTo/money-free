# Volume Surge Scan CLI Usage

Command-line interface for the Volume Surge Scanner.

## Installation

```bash
cd backend
npm install
```

## Commands

### 1. Run a New Scan

```bash
# Auto mode (automatically detect reference date)
npm run vss:scan

# Manual mode (specify reference date)
npm run vss:scan -- --mode manual --date 2026-03-02

# With export
npm run vss:scan -- --export markdown
npm run vss:scan -- --mode manual --date 2026-03-02 --export csv
```

**Options:**
- `--mode, -m`: `auto` (default) or `manual`
- `--date, -d`: Reference date for manual mode (YYYY-MM-DD)
- `--export, -e`: Export format: `csv` or `markdown`

**Example Output:**
```
🚀 Starting Volume Surge Scan...

✅ Scan completed successfully
   Scan ID: abc123de-f456-7890-ghij-klmnopqrstuv

📊 Summary:
   Total Stocks: 3000
   Matched Stocks: 42
   Duration: 8.5s
```

---

### 2. List Recent Scans

```bash
# Show last 20 scans
npm run vss:list

# Show last 50 scans
npm run vss:list -- --limit 50

# Filter by status
npm run vss:list -- --status COMPLETED
```

**Options:**
- `--limit, -l`: Number of scans to show (default: 20)
- `--status, -s`: Filter by status (`RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`)

**Example Output:**
```
📋 Recent Scans (showing 3):

✅ abc123de | 2026-03-18 | 42/3000 matched
✅ def456gh | 2026-03-15 | 38/2980 matched
🔄 ghi789jk | 2026-03-14 | 0/3000 matched
```

---

### 3. Export Scan Results

```bash
# Export as Markdown (default)
npm run vss:export <scanId>

# Export as CSV
npm run vss:export <scanId> -- --format csv

# Specify output path
npm run vss:export <scanId> -- --format markdown --output reports/scan-results.md

# Export all results (including unmatched)
npm run vss:export <scanId> -- --filter all
```

**Options:**
- `--format, -f`: `csv` or `markdown` (default: markdown)
- `--output, -o`: Output file path
- `--filter`: `matched` (default) or `all`

**Example:**
```bash
npm run vss:export abc123de-f456-7890-ghij-klmnopqrstuv -- --format csv --output reports/2026-03-18-scan.csv
```

**Example Output:**
```
📥 Exporting scan results: abc123de...

✅ Exported successfully to: /path/to/reports/2026-03-18-scan.csv
```

---

### 4. Compare Two Scans

```bash
# Compare two scans
npm run vss:compare <scan1-id> <scan2-id>

# Save comparison report
npm run vss:compare <scan1-id> <scan2-id> -- --output reports/comparison.md
```

**Options:**
- `--output, -o`: Save comparison report to file

**Example:**
```bash
npm run vss:compare abc123de-f456-7890-ghij-klmnopqrstuv def456gh-i789-0123-jklm-nopqrstuvwxy -- --output comparison-report.md
```

**Example Output:**
```
🔍 Comparing scans: abc123de vs def456gh...

📊 Comparison Summary:
   Persistent Stocks: 28
   Only in Scan 1: 14
   Only in Scan 2: 10

🎯 Persistent Stocks:

   ↗ SH600111 - 北方稀土
      Ratio: 2.00 → 2.15
   ↘ SH600519 - 贵州茅台
      Ratio: 1.85 → 1.72
   → SH601318 - 中国平安
      Ratio: 1.65 → 1.68

✅ Comparison report saved to: /path/to/comparison-report.md
```

---

## Common Workflows

### Quick Daily Scan
```bash
npm run vss:scan -- --export markdown
```

### Historical Analysis
```bash
# List all completed scans
npm run vss:list -- --status COMPLETED --limit 100

# Compare last two scans
npm run vss:compare <recent-scan-id> <older-scan-id> -- --output daily-comparison.md
```

### Custom Date Analysis
```bash
# Scan with specific reference date
npm run vss:scan -- --mode manual --date 2026-03-02 --export csv

# Export the scan
npm run vss:export <scan-id> -- --format markdown --output analysis-report.md
```

---

## Troubleshooting

### Command Not Found
Ensure you're in the `backend` directory:
```bash
cd backend
npm run vss:scan
```

### Database Connection Error
Verify that the database file exists:
```bash
ls data/*.db
```

### No Results Found
- Check that K-line data is up to date
- Verify the reference date is valid
- Try adjusting the scan mode (auto vs manual)

---

## Exit Codes

- `0`: Success
- `1`: Error (scan failed, export failed, comparison failed, etc.)
