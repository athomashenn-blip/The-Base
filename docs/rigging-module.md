# Rigging Module (Current Build)

## Run locally
- Open `/Users/andrew/Documents/The Base/index.html` in browser.
- Go to **Engineering -> Rigging**.

## What is implemented
- Prolyte truss catalog loader (`data/prolyte-truss-catalog.js`)
- Motor catalog loader (`data/motor-catalog.js`)
- Sample project loader (`data/rigging-sample-project.js`)
- Node / Span / Pickup builders
- Fixture placements from Lighting fixture library
- Static beam reactions per span (`Rl`, `Rr`) with UDL + point loads
- Aggregated per-node and per-pickup loads
- Safety factor raw vs factored output
- Warnings and blockers for missing data / unsupported nodes / overloads / invalid geometry
- CSV point-load export
- Printable HTML report export

## Import Prolyte web catalog (weights + load tables)
Use:

```bash
cd "/Users/andrew/Documents/The Base"
python3 scripts/import_prolyte_web_catalog.py
```

This writes both:
- `data/prolyte-truss-catalog.json`
- `data/prolyte-truss-catalog.js`

## Import custom CSV/JSON catalog
If you have your own Prolyte export file:

```bash
cd "/Users/andrew/Documents/The Base"
python3 scripts/import_prolyte_catalog.py /path/to/prolyte_catalog.csv
```

## Notes
- Truss `kg/m` is catalog-driven only (no manual per-span override).
- Unverified truss catalog items block final calculations.
- Missing fixture/motor weights block calculations.
