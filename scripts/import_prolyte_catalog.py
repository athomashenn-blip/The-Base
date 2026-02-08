#!/usr/bin/env python3
"""Import Prolyte catalog CSV/JSON into data/prolyte-truss-catalog.json.

CSV columns:
  id,manufacturer,series,connection,height_mm,width_mm,weight_per_m_kg,available_lengths_m,verified,notes

available_lengths_m may be semicolon/comma separated (e.g. "0.5;1;2;3").
"""

import argparse
import csv
import json
from pathlib import Path


def parse_lengths(value: str):
    if value is None:
        return []
    value = str(value).strip()
    if not value:
        return []
    parts = [p.strip() for p in value.replace(",", ";").split(";")]
    out = []
    for p in parts:
      try:
        n = float(p)
      except ValueError:
        continue
      if n > 0:
        out.append(n)
    return out


def parse_bool(value):
    s = str(value or "").strip().lower()
    return s in {"1", "true", "yes", "y"}


def normalize_item(item):
    return {
        "id": item.get("id") or f"prolyte_{str(item.get('series', 'truss')).lower()}",
        "manufacturer": item.get("manufacturer") or "Prolyte",
        "series": item.get("series") or "Unknown",
        "connection": item.get("connection") or "",
        "height_mm": int(float(item["height_mm"])) if str(item.get("height_mm", "")).strip() else None,
        "width_mm": int(float(item["width_mm"])) if str(item.get("width_mm", "")).strip() else None,
        "weight_per_m_kg": float(item["weight_per_m_kg"]) if str(item.get("weight_per_m_kg", "")).strip() else None,
        "available_lengths_m": parse_lengths(item.get("available_lengths_m")),
        "verified": parse_bool(item.get("verified")),
        "notes": item.get("notes") or "",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="Path to CSV or JSON file")
    parser.add_argument(
        "--out",
        default="data/prolyte-truss-catalog.json",
        help="Output catalog JSON path",
    )
    args = parser.parse_args()

    in_path = Path(args.input)
    out_path = Path(args.out)
    if not in_path.exists():
        raise SystemExit(f"Input not found: {in_path}")

    if in_path.suffix.lower() == ".json":
        rows = json.loads(in_path.read_text())
        if not isinstance(rows, list):
            raise SystemExit("JSON input must be an array")
    else:
        with in_path.open(newline="") as f:
            rows = list(csv.DictReader(f))

    normalized = [normalize_item(r) for r in rows]
    normalized.sort(key=lambda x: (x["manufacturer"], x["series"], x["id"]))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(normalized, indent=2))
    print(f"Wrote {len(normalized)} truss items to {out_path}")


if __name__ == "__main__":
    main()
