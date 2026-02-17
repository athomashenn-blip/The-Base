import json
import re
import zipfile
from pathlib import Path

ROOT = Path("/Users/andrew/Documents/The Base")
FIXTURES_JSON = ROOT / "data" / "lighting-fixtures.json"
GDTF_EXTRACTED = ROOT / "assets" / "gdtf" / "extracted"
MODEL_DIR = ROOT / "assets" / "gdtf" / "models"
OUT_JS = ROOT / "data" / "gdtf-models.js"


def slug(value: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", str(value or "").strip().lower()).strip("-")
    return s or "x"


def fixture_key(manufacturer: str, model: str) -> str:
    return f"{manufacturer}__{model}"

def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def pick_model_name(names):
    # Prefer .glb in models/gltf over high-detail, and prefer non-helper files.
    glb = [n for n in names if n.lower().endswith(".glb")]
    if not glb:
        return None
    def score(name):
        low = name.lower()
        s = 0
        if "/models/gltf/" in low:
            s += 50
        if "/models/gltf_high/" in low:
            s += 20
        if any(k in low for k in ["base", "yoke", "head", "arm", "bracket", "wheel"]):
            s -= 10
        if any(k in low for k in ["fixture", "body", "main", "whole", "full"]):
            s += 8
        return s
    glb = sorted(glb, key=lambda n: (score(n), len(n)), reverse=True)
    return glb[0]


def main():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    rows = json.loads(FIXTURES_JSON.read_text(encoding="utf-8"))
    mapping = {}
    extracted = 0
    missing = 0
    already = 0

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
        try:
            with zipfile.ZipFile(gdtf_path, "r") as zf:
                chosen = pick_model_name(zf.namelist())
                if not chosen:
                    missing += 1
                    continue
                out_name = f"{slug(manufacturer)}__{slug(model)}.glb"
                out_path = MODEL_DIR / out_name
                if out_path.exists():
                    already += 1
                else:
                    with zf.open(chosen, "r") as src, open(out_path, "wb") as dst:
                        dst.write(src.read())
                    extracted += 1
                out_rel = f"assets/gdtf/models/{out_name}"
                mapping[key] = out_rel
                nkey = f"{normalize(manufacturer)}::{normalize(model)}"
                if nkey and "::" in nkey:
                    mapping[nkey] = out_rel
        except Exception:
            missing += 1
            continue

    out_js = "window.THE_BASE_GDTF_MODELS = " + json.dumps(mapping, ensure_ascii=False) + ";\n"
    OUT_JS.write_text(out_js, encoding="utf-8")
    print(json.dumps({
        "fixtures_total": len(rows),
        "mapped_models": len(mapping),
        "newly_extracted": extracted,
        "already_present": already,
        "missing": missing,
        "output_js": str(OUT_JS),
    }, indent=2))


if __name__ == "__main__":
    main()
