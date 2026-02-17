import json
import os
import re
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path('/Users/andrew/Documents/The Base')
INBOX = ROOT / 'assets' / 'gdtf' / 'inbox'
EXTRACTED = ROOT / 'assets' / 'gdtf' / 'extracted'
DATA_JSON = ROOT / 'data' / 'lighting-fixtures.json'
DATA_JS = ROOT / 'data' / 'lighting-fixtures.js'

EXTRACTED.mkdir(parents=True, exist_ok=True)


def safe_float(v):
    try:
        if v is None:
            return None
        s = str(v).strip().replace(',', '.')
        if not s:
            return None
        return float(s)
    except Exception:
        return None


def local_name(tag):
    if '}' in tag:
        return tag.split('}', 1)[1]
    return tag


def find_desc_xml_in_gdtf(gdtf_path: Path):
    with zipfile.ZipFile(gdtf_path, 'r') as zf:
        names = zf.namelist()
        preferred = [n for n in names if local_name(n).lower().endswith('description.xml')]
        target = preferred[0] if preferred else None
        if not target:
            xmls = [n for n in names if n.lower().endswith('.xml')]
            if not xmls:
                return None
            target = xmls[0]
        with zf.open(target, 'r') as f:
            data = f.read()
            return data


def parse_fixture_from_gdtf(gdtf_path: Path):
    data = find_desc_xml_in_gdtf(gdtf_path)
    if not data:
        return None
    try:
        root = ET.fromstring(data)
    except Exception:
        return None

    fixture_type = None
    if local_name(root.tag) == 'FixtureType':
        fixture_type = root
    else:
        for el in root.iter():
            if local_name(el.tag) == 'FixtureType':
                fixture_type = el
                break
    if fixture_type is None:
        return None

    attrs = fixture_type.attrib
    manufacturer = attrs.get('Manufacturer') or attrs.get('manufacturer') or ''
    model = attrs.get('Name') or attrs.get('LongName') or attrs.get('name') or gdtf_path.stem

    # DMX modes + channel counts
    modes = []
    dmx_modes_node = None
    for el in fixture_type.iter():
        if local_name(el.tag) == 'DMXModes':
            dmx_modes_node = el
            break
    if dmx_modes_node is not None:
        for mode_el in dmx_modes_node:
            if local_name(mode_el.tag) != 'DMXMode':
                continue
            mode_name = mode_el.attrib.get('Name') or mode_el.attrib.get('name') or 'Mode'
            channels = 0
            for child in mode_el:
                if local_name(child.tag) != 'DMXChannels':
                    continue
                channels = sum(1 for c in child if local_name(c.tag) == 'DMXChannel')
                break
            if channels > 0:
                modes.append({'name': mode_name, 'channels': int(channels)})

    if not modes:
        # fallback: count all DMXChannel in file as a single mode
        ch_count = sum(1 for el in fixture_type.iter() if local_name(el.tag) == 'DMXChannel')
        if ch_count > 0:
            modes = [{'name': 'Mode', 'channels': int(ch_count)}]

    if not modes:
        return None

    # Basic physical data
    weight_kg = None
    dimensions = {'length': None, 'width': None, 'height': None}
    power = {
        'voltage_range': '',
        'avg_w': None,
        'max_w': None,
        'avg_a': None,
        'max_a': None,
    }

    # Search likely physical nodes
    for el in fixture_type.iter():
        n = local_name(el.tag)
        if n == 'Weight' and weight_kg is None:
            w = safe_float(el.attrib.get('Value') or el.attrib.get('value') or el.text)
            if w is not None:
                weight_kg = w
        if n in ('Size', 'Dimension'):
            l = safe_float(el.attrib.get('Length') or el.attrib.get('X'))
            w = safe_float(el.attrib.get('Width') or el.attrib.get('Y'))
            h = safe_float(el.attrib.get('Height') or el.attrib.get('Z'))
            if l is not None:
                dimensions['length'] = l
            if w is not None:
                dimensions['width'] = w
            if h is not None:
                dimensions['height'] = h
        if n in ('PowerConsumption', 'Electrical', 'Power'):
            # best-effort extraction
            for k in ('Power', 'PowerW', 'Watt', 'Watts', 'MaxPowerConsumption'):
                v = safe_float(el.attrib.get(k))
                if v is not None:
                    power['max_w'] = max(power['max_w'] or 0, v)
            for k in ('Voltage', 'VoltageRange'):
                vv = el.attrib.get(k)
                if vv and not power['voltage_range']:
                    power['voltage_range'] = str(vv)

    # infer category from model naming
    m = model.lower()
    if any(x in m for x in ('profile', 'spot')):
        category = 'Spot'
    elif any(x in m for x in ('wash', 'fresnel', 'pc')):
        category = 'Wash'
    elif any(x in m for x in ('beam', 'pointe')):
        category = 'Beam'
    elif any(x in m for x in ('strobe',)):
        category = 'Strobe'
    elif any(x in m for x in ('bar', 'line', 'pixel')):
        category = 'Pixel Bar'
    else:
        category = 'Fixture'

    return {
        'manufacturer': manufacturer or 'Unknown',
        'model': model,
        'category': category,
        'modes': modes,
        'weight_kg': weight_kg,
        'dimensions_mm': dimensions,
        'brightness': {'value': None, 'unit': ''},
        'power': power,
        'connectivity': {
            'data_in': ['DMX 5-pin'],
            'data_out': ['DMX 5-pin'],
            'power_in': [],
            'power_out': []
        },
        'sources': [{'type': 'gdtf', 'ref': gdtf_path.name}],
        'notes': 'Imported from user-provided GDTF package.'
    }


def collect_gdtf_paths_from_inbox():
    gdtf_paths = []
    for outer in sorted(INBOX.glob('*.zip')):
        try:
            with zipfile.ZipFile(outer, 'r') as zf:
                for n in zf.namelist():
                    if n.lower().endswith('.gdtf'):
                        target = EXTRACTED / Path(n).name
                        # keep first occurrence
                        if target.exists():
                            continue
                        with zf.open(n, 'r') as src, open(target, 'wb') as dst:
                            dst.write(src.read())
                        gdtf_paths.append(target)
        except Exception:
            continue
    # include any direct .gdtf dropped manually
    for p in INBOX.glob('*.gdtf'):
        t = EXTRACTED / p.name
        if not t.exists():
            t.write_bytes(p.read_bytes())
            gdtf_paths.append(t)
    return sorted(set(gdtf_paths))


def dedupe(fixtures):
    best = {}
    for f in fixtures:
        key = (f['manufacturer'].strip().lower(), f['model'].strip().lower())
        prev = best.get(key)
        if not prev:
            best[key] = f
            continue
        # keep richer modes set
        if len(f.get('modes', [])) > len(prev.get('modes', [])):
            best[key] = f
    out = list(best.values())
    out.sort(key=lambda x: (x.get('manufacturer', ''), x.get('model', '')))
    return out


def main():
    # clean extracted cache for fresh import
    for p in EXTRACTED.glob('*.gdtf'):
        try:
            p.unlink()
        except Exception:
            pass

    gdtf_files = collect_gdtf_paths_from_inbox()
    fixtures = []
    for p in gdtf_files:
        f = parse_fixture_from_gdtf(p)
        if f:
            fixtures.append(f)

    fixtures = dedupe(fixtures)

    DATA_JSON.write_text(json.dumps(fixtures, indent=2), encoding='utf-8')
    DATA_JS.write_text('window.THE_BASE_LIGHTING_FIXTURES = ' + json.dumps(fixtures, ensure_ascii=False) + ';\n', encoding='utf-8')

    summary = {
        'gdtf_files_processed': len(gdtf_files),
        'fixtures_parsed': len(fixtures),
        'manufacturers': sorted({f.get('manufacturer', 'Unknown') for f in fixtures}),
    }
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
