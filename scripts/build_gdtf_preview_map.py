import json
import re
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path("/Users/andrew/Documents/The Base")
FIXTURES_JSON = ROOT / "data" / "lighting-fixtures.json"
GDTF_EXTRACTED = ROOT / "assets" / "gdtf" / "extracted"
PREVIEW_DIR = ROOT / "assets" / "gdtf" / "previews"
OUT_JS = ROOT / "data" / "gdtf-previews.js"


def slug(value: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", str(value or "").strip().lower()).strip("-")
    return s or "x"


def fixture_key(manufacturer: str, model: str) -> str:
    return f"{manufacturer}__{model}"


def parse_dimensions_from_gdtf(gdtf_file: Path):
    try:
        with zipfile.ZipFile(gdtf_file, "r") as zf:
            desc_name = next((n for n in zf.namelist() if n.lower().endswith("description.xml")), None)
            if not desc_name:
                return {"length_m": None, "width_m": None, "height_m": None}
            root = ET.fromstring(zf.read(desc_name))
    except Exception:
        return {"length_m": None, "width_m": None, "height_m": None}

    def ln(tag):
        return tag.split("}", 1)[-1]

    max_l = 0.0
    max_w = 0.0
    max_h = 0.0
    found = False
    for el in root.iter():
        if ln(el.tag) != "Model":
            continue
        try:
            l = float(str(el.attrib.get("Length", "")).replace(",", "."))
            w = float(str(el.attrib.get("Width", "")).replace(",", "."))
            h = float(str(el.attrib.get("Height", "")).replace(",", "."))
        except Exception:
            continue
        if l <= 0 or w <= 0 or h <= 0:
            continue
        max_l = max(max_l, l)
        max_w = max(max_w, w)
        max_h = max(max_h, h)
        found = True

    if not found:
        return {"length_m": None, "width_m": None, "height_m": None}
    return {"length_m": max_l, "width_m": max_w, "height_m": max_h}


def extract_thumbnail(gdtf_file: Path, out_file: Path) -> bool:
    try:
        with zipfile.ZipFile(gdtf_file, "r") as zf:
            names = zf.namelist()
            svg = next((n for n in names if n.lower() == "thumbnail.svg"), None)
            png = next((n for n in names if n.lower() == "thumbnail.png"), None)
            # Prefer SVG to keep vector quality in 2D plan.
            target = svg or png
            if not target:
                return False
            with zf.open(target, "r") as src:
                out_file.write_bytes(src.read())
            return True
    except Exception:
        return False


def pick_best_symbol_name(zip_names):
    names = list(zip_names or [])
    thumb_png = next((n for n in names if n.lower() == "thumbnail.png"), None)
    if thumb_png:
        return (thumb_png, "thumbnail")
    return (None, "")


def main():
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    rows = json.loads(FIXTURES_JSON.read_text(encoding="utf-8"))
    mapping = {}
    extracted = 0
    missing = 0

    for row in rows:
        manufacturer = row.get("manufacturer", "")
        model = row.get("model", "")
        key = fixture_key(manufacturer, model)
        src_ref = ""
        for src in row.get("sources", []) or []:
            if str(src.get("type", "")).lower() == "gdtf" and src.get("ref"):
                src_ref = str(src.get("ref"))
                break
        if not src_ref:
            missing += 1
            continue
        gdtf_path = GDTF_EXTRACTED / src_ref
        if not gdtf_path.exists():
            missing += 1
            continue
        ext = ".svg"
        symbol_role = ""
        chosen_name = None
        try:
            with zipfile.ZipFile(gdtf_path, "r") as zf:
                chosen_name, symbol_role = pick_best_symbol_name(zf.namelist())
                if not chosen_name:
                    missing += 1
                    continue
                ext = ".svg" if str(chosen_name).lower().endswith(".svg") else ".png"
        except Exception:
            missing += 1
            continue
        out_name = f"{slug(manufacturer)}__{slug(model)}{ext}"
        out_file = PREVIEW_DIR / out_name
        if not out_file.exists():
            try:
                with zipfile.ZipFile(gdtf_path, "r") as zf:
                    with zf.open(chosen_name, "r") as src:
                        out_file.write_bytes(src.read())
            except Exception:
                missing += 1
                continue
            extracted += 1
        dims = parse_dimensions_from_gdtf(gdtf_path)
        mapping[key] = {
            "path": f"assets/gdtf/previews/{out_name}",
            "symbol_role": symbol_role or "thumbnail",
            "dimensions_m": dims
        }

    out_js = "window.THE_BASE_GDTF_PREVIEWS = " + json.dumps(mapping, ensure_ascii=False) + ";\n"
    OUT_JS.write_text(out_js, encoding="utf-8")
    print(json.dumps({
        "fixtures_total": len(rows),
        "mapped": len(mapping),
        "newly_extracted": extracted,
        "missing": missing,
        "output_js": str(OUT_JS),
    }, indent=2))


if __name__ == "__main__":
    main()
