#!/usr/bin/env python3
"""Build Prolyte truss catalog from prolyte.com product pages.

Outputs:
  - data/prolyte-truss-catalog.json
  - data/prolyte-truss-catalog.js

Notes:
  - Extracts values directly from Prolyte product tables (no guessed load values).
  - Marks entries verified only when weight_per_m and allowable loading rows are found.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import statistics
import urllib.request
from datetime import datetime, timezone
from typing import Any


BASE_URL = "https://www.prolyte.com"
CATEGORY_PATHS = [
    "/products/aluminium-truss/ladder-truss",
    "/products/aluminium-truss/triangular-truss",
    "/products/aluminium-truss/square-truss",
    "/products/aluminium-truss/rectangular-truss",
    "/products/aluminium-truss/folding-truss",
]

USER_AGENT = "TheBaseRiggingCatalogBot/1.0 (+https://github.com/)"


def fetch_text(url: str, timeout: int = 30) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def strip_tags(value: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_decimal(value: str) -> float | None:
    if value is None:
        return None
    s = value.strip()
    if not s:
        return None
    s = s.replace("\xa0", " ")
    s = s.replace(",", ".")
    s = re.sub(r"[^0-9.\-]", "", s)
    if not s or s in {"-", ".", "-."}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def extract_links(page_html: str) -> list[str]:
    links = re.findall(r'href="(/products/aluminium-truss/[^"#?]+)', page_html)
    out: set[str] = set()
    for link in links:
        if any(
            blocked in link
            for blocked in (
                "/led-support-solutions",
                "/corners",
                "/box-corners",
                "/book-corners",
                "/accessories",
                "?page=",
            )
        ):
            continue
        out.add(link)
    return sorted(out)


def extract_tables(page_html: str) -> list[list[list[str]]]:
    """Return tables as list[table -> rows -> cells-text]."""
    tables_raw = re.findall(r"<table\b[^>]*>(.*?)</table>", page_html, flags=re.IGNORECASE | re.DOTALL)
    tables: list[list[list[str]]] = []
    for table_raw in tables_raw:
        rows_raw = re.findall(r"<tr\b[^>]*>(.*?)</tr>", table_raw, flags=re.IGNORECASE | re.DOTALL)
        rows: list[list[str]] = []
        for row_raw in rows_raw:
            cells_raw = re.findall(
                r"<(?:td|th)\b[^>]*>(.*?)</(?:td|th)>",
                row_raw,
                flags=re.IGNORECASE | re.DOTALL,
            )
            cells = [strip_tags(c) for c in cells_raw]
            if cells:
                rows.append(cells)
        if rows:
            tables.append(rows)
    return tables


def detect_series(product_name: str, path: str) -> str:
    slug = path.rsplit("/", 1)[-1].replace("-", " ").upper()
    name_u = (product_name or "").upper()
    for source in (slug, name_u):
        m = re.search(r"\b([A-Z]{1,3}\d{1,3}[A-Z]{0,4})\b", source)
        if m:
            return m.group(1)
    return path.rsplit("/", 1)[-1].upper()


def table_has_text(table: list[list[str]], needle: str) -> bool:
    n = needle.lower()
    for row in table:
        for cell in row:
            if n in cell.lower():
                return True
    return False


def parse_length_weight_table(table: list[list[str]]) -> tuple[list[float], list[float], list[str]]:
    lengths: list[float] = []
    weights: list[float] = []
    codes: list[str] = []
    for row in table:
        if len(row) < 3:
            continue
        m = parse_decimal(row[0])
        kg = parse_decimal(row[2])
        if m is None or kg is None:
            continue
        if m <= 0 or kg <= 0:
            continue
        lengths.append(m)
        weights.append(kg)
        if len(row) >= 5 and row[4]:
            codes.append(row[4].strip().upper())
    return lengths, weights, codes


def detect_series_from_codes(codes: list[str]) -> str | None:
    """Infer series from Prolyte code column, e.g. H30V-L100 -> H30V."""
    candidates: list[str] = []
    for code in codes:
        c = code.strip().upper()
        # Prefer token before -L### style suffix.
        m = re.match(r"^([A-Z]{1,3}\d{1,3}[A-Z]{0,4})-L\d+", c)
        if m:
            candidates.append(m.group(1))
            continue
        m = re.match(r"^([A-Z]{1,3}\d{1,3}[A-Z]{0,4})\b", c)
        if m:
            candidates.append(m.group(1))
    if not candidates:
        return None
    return statistics.mode(candidates)


def parse_tech_specs_table(table: list[list[str]]) -> dict[str, str]:
    specs: dict[str, str] = {}
    for row in table:
        if len(row) < 2:
            continue
        key = row[0].strip()
        val = row[1].strip()
        if key and val:
            specs[key] = val
    return specs


def parse_allowable_loading_table(table: list[list[str]]) -> list[dict[str, float | None]]:
    out: list[dict[str, float | None]] = []
    for row in table:
        if len(row) < 17:
            continue
        span_m = parse_decimal(row[0])
        udl_kg_m = parse_decimal(row[2])
        cpl_kg = parse_decimal(row[6])
        tpl_kg = parse_decimal(row[10])
        qpl_kg = parse_decimal(row[12])
        fpl_kg = parse_decimal(row[14])
        total_weight_kg = parse_decimal(row[16])
        if span_m is None or span_m <= 0:
            continue
        out.append(
            {
                "span_m": span_m,
                "udl_kg_per_m": udl_kg_m,
                "center_point_load_kg": cpl_kg,
                "third_points_load_each_kg": tpl_kg,
                "fourth_points_load_each_kg": qpl_kg,
                "fifth_points_load_each_kg": fpl_kg,
                "total_weight_kg": total_weight_kg,
            }
        )
    return out


def parse_product_page(url: str, page_html: str) -> dict[str, Any]:
    title_match = re.search(r"<title>\s*(.*?)\s*</title>", page_html, flags=re.IGNORECASE | re.DOTALL)
    page_title = strip_tags(title_match.group(1)) if title_match else ""
    name_match = re.search(
        r'<h1[^>]*class="[^"]*product-headline[^"]*"[^>]*>(.*?)</h1>',
        page_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    product_name = strip_tags(name_match.group(1)) if name_match else page_title
    path = url.replace(BASE_URL, "")
    series = detect_series(product_name, path)
    item_id = f"prolyte_{path.rsplit('/', 1)[-1].lower().replace('-', '_')}"

    datasheet_links = re.findall(
        r'href="([^"]+\.pdf(?:\.aspx)?[^"]*)"',
        page_html,
        flags=re.IGNORECASE,
    )
    datasheet_links = [link if link.startswith("http") else f"{BASE_URL}{link}" for link in datasheet_links]

    tables = extract_tables(page_html)
    lengths: list[float] = []
    weights: list[float] = []
    codes: list[str] = []
    tech_specs: dict[str, str] = {}
    loading_rows: list[dict[str, float | None]] = []

    for table in tables:
        if table_has_text(table, "Standard available lengths and codes"):
            l, w, c = parse_length_weight_table(table)
            if l and w:
                lengths = l
                weights = w
                codes = c
            continue
        if table_has_text(table, "Technical Specifications"):
            specs = parse_tech_specs_table(table)
            if specs:
                tech_specs = specs
            continue
        if table_has_text(table, "Allowable Loading") and table_has_text(table, "kg/m"):
            rows = parse_allowable_loading_table(table)
            if rows:
                loading_rows = rows

    ratios = [w / l for l, w in zip(lengths, weights) if l > 0]
    weight_per_m = statistics.median(ratios) if ratios else None
    available_lengths = sorted(set(round(v, 3) for v in lengths))
    series_from_code = detect_series_from_codes(codes)
    if series_from_code:
        series = series_from_code
    connection = (
        tech_specs.get("Coupling System")
        or tech_specs.get("Coupling system")
        or ""
    )

    verified = bool(weight_per_m is not None and loading_rows)

    notes = []
    if not verified:
        if weight_per_m is None:
            notes.append("Missing weight table values.")
        if not loading_rows:
            notes.append("Missing allowable loading rows.")
    notes.append("Loading values are static and single-span with supports at both ends (per Prolyte page notes).")

    return {
        "id": item_id,
        "manufacturer": "Prolyte",
        "series": series,
        "connection": connection,
        "height_mm": None,
        "width_mm": None,
        "weight_per_m_kg": round(weight_per_m, 3) if weight_per_m is not None else None,
        "available_lengths_m": available_lengths,
        "verified": verified,
        "notes": " ".join(notes),
        "product_name": product_name,
        "source_url": url,
        "datasheet_urls": datasheet_links,
        "load_capabilities": {
            "type": "allowable_point_loads",
            "unit": "kg",
            "rows": loading_rows,
        },
        "extracted_at_utc": datetime.now(timezone.utc).isoformat(),
    }


def crawl_product_urls() -> list[str]:
    product_urls: set[str] = set()
    for path in CATEGORY_PATHS:
        page_urls = [f"{BASE_URL}{path}"]
        seen_pages: set[str] = set()
        while page_urls:
            page_url = page_urls.pop(0)
            if page_url in seen_pages:
                continue
            seen_pages.add(page_url)
            html_text = fetch_text(page_url)

            for link in extract_links(html_text):
                product_urls.add(f"{BASE_URL}{link}")

            pagers = re.findall(r'href="(/products/aluminium-truss/[^"]+\?page=\d+)"', html_text)
            for pager in pagers:
                pager_url = f"{BASE_URL}{pager}"
                if pager_url not in seen_pages:
                    page_urls.append(pager_url)
    return sorted(product_urls)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-json", default="data/prolyte-truss-catalog.json")
    parser.add_argument("--out-js", default="data/prolyte-truss-catalog.js")
    args = parser.parse_args()

    urls = crawl_product_urls()
    rows: list[dict[str, Any]] = []
    for url in urls:
        try:
            page_html = fetch_text(url)
            row = parse_product_page(url, page_html)
            rows.append(row)
        except Exception as exc:  # noqa: BLE001
            rows.append(
                {
                    "id": f"prolyte_{url.rsplit('/', 1)[-1].lower().replace('-', '_')}",
                    "manufacturer": "Prolyte",
                    "series": url.rsplit("/", 1)[-1].upper(),
                    "connection": "",
                    "height_mm": None,
                    "width_mm": None,
                    "weight_per_m_kg": None,
                    "available_lengths_m": [],
                    "verified": False,
                    "notes": f"Extraction error: {exc}",
                    "source_url": url,
                    "datasheet_urls": [],
                    "load_capabilities": {"type": "allowable_point_loads", "unit": "kg", "rows": []},
                    "extracted_at_utc": datetime.now(timezone.utc).isoformat(),
                }
            )

    # Keep only truss-like items with actual length data or loading rows.
    filtered = [
        r
        for r in rows
        if r.get("available_lengths_m") or (r.get("load_capabilities", {}).get("rows") if isinstance(r.get("load_capabilities"), dict) else False)
    ]
    filtered.sort(key=lambda x: (x.get("series") or "", x.get("id") or ""))

    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(filtered, f, indent=2)

    with open(args.out_js, "w", encoding="utf-8") as f:
        f.write("window.THE_BASE_TRUSS_CATALOG =\n")
        f.write(json.dumps(filtered, indent=2))
        f.write("\n;\n")

    verified_count = sum(1 for r in filtered if r.get("verified"))
    print(f"Wrote {len(filtered)} truss items. Verified: {verified_count}.")
    print(f"JSON: {args.out_json}")
    print(f"JS:   {args.out_js}")


if __name__ == "__main__":
    main()
