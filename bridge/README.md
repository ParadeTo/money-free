# Python Bridge

Python bridge for technical indicator calculations and AkShare data source.

## Setup

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Scripts

- `calculate_kdj.py` - KDJ indicator calculation
- `akshare_fetcher.py` - AkShare data retrieval

## Usage

All scripts accept JSON input via command line and output JSON via stdout.

Example:
```bash
python calculate_kdj.py '{"high":[10,11,12],"low":[9,10,11],"close":[9.5,10.5,11.5]}'
```
