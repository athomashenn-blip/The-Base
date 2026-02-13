(function (global) {
  const STORAGE_KEY = "thebase.settings.v1";
  const VERSION = 1;
  const DEPARTMENTS = ["Video", "Lighting", "Audio", "Rigging", "Power", "Venue"];

  function nowIso() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function normalizePowerUse(input) {
    const watts = Number(input?.watts);
    const amps = Number(input?.amps);
    return {
      watts: Number.isFinite(watts) && watts >= 0 ? watts : null,
      amps: Number.isFinite(amps) && amps >= 0 ? amps : null
    };
  }

  function normalizeEquipmentItem(item, department, fallbackCreatedAt) {
    const createdAt = String(item?.created_at || fallbackCreatedAt || nowIso());
    return {
      id: String(item?.id || uid(`eq_${department.toLowerCase()}`)),
      department,
      manufacturer: String(item?.manufacturer || "").trim(),
      name: String(item?.name || "").trim(),
      weight_kg: Number.isFinite(Number(item?.weight_kg)) ? Number(item.weight_kg) : null,
      power_use: normalizePowerUse(item?.power_use),
      notes: String(item?.notes || "").trim(),
      enabled: item?.enabled !== false,
      created_at: createdAt,
      updated_at: String(item?.updated_at || nowIso()),
      meta: item?.meta && typeof item.meta === "object" ? item.meta : {}
    };
  }

  function normalizeDepartmentBlock(dept, block) {
    const equipment = Array.isArray(block?.equipment) ? block.equipment : [];
    const rules = block?.rules && typeof block.rules === "object" ? block.rules : {};
    return {
      equipment: equipment.map((item) => normalizeEquipmentItem(item, dept)),
      rules
    };
  }

  function createDefaultSettings(seed) {
    const base = {
      version: VERSION,
      updated_at: nowIso(),
      global: {
        units: {
          distance: "m",
          weight: "kg",
          power: "W",
          current: "A"
        },
        safety_factors: {
          rigging: 1.2,
          electrical: 0.8
        },
        naming: {
          project_prefix: "",
          auto_ids: true
        },
        export_preferences: {
          include_notes: true,
          include_warnings: true
        }
      },
      departments: {
        Video: { equipment: [], rules: {} },
        Lighting: { equipment: [], rules: {} },
        Audio: { equipment: [], rules: {} },
        Rigging: { equipment: [], rules: {} },
        Power: { equipment: [], rules: {} },
        Venue: { equipment: [], rules: {} }
      }
    };
    if (!seed || typeof seed !== "object") return base;
    const merged = {
      ...base,
      ...seed,
      global: {
        ...base.global,
        ...(seed.global || {}),
        units: { ...base.global.units, ...(seed.global?.units || {}) },
        safety_factors: { ...base.global.safety_factors, ...(seed.global?.safety_factors || {}) },
        naming: { ...base.global.naming, ...(seed.global?.naming || {}) },
        export_preferences: { ...base.global.export_preferences, ...(seed.global?.export_preferences || {}) }
      },
      departments: { ...base.departments, ...(seed.departments || {}) }
    };
    DEPARTMENTS.forEach((dept) => {
      merged.departments[dept] = normalizeDepartmentBlock(dept, merged.departments[dept]);
    });
    merged.version = VERSION;
    merged.updated_at = nowIso();
    return merged;
  }

  function normalizeSettings(settings, seed) {
    return createDefaultSettings({
      ...(seed || {}),
      ...(settings || {})
    });
  }

  function loadSettings(seed) {
    let parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (_) {
      parsed = null;
    }
    const normalized = normalizeSettings(parsed, seed);
    return normalized;
  }

  function saveSettings(settings) {
    const normalized = normalizeSettings(settings);
    normalized.updated_at = nowIso();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function upsertEquipment(settings, department, equipmentInput) {
    const next = normalizeSettings(settings);
    if (!DEPARTMENTS.includes(department)) return next;
    const block = next.departments[department];
    const existing = (block.equipment || []).find((x) => x.id === equipmentInput.id);
    const createdAt = existing?.created_at || nowIso();
    const normalized = normalizeEquipmentItem(equipmentInput, department, createdAt);
    const idx = block.equipment.findIndex((x) => x.id === normalized.id);
    if (idx >= 0) block.equipment[idx] = normalized;
    else block.equipment.push(normalized);
    next.updated_at = nowIso();
    return next;
  }

  function removeEquipment(settings, department, id, hardDelete) {
    const next = normalizeSettings(settings);
    if (!DEPARTMENTS.includes(department)) return next;
    const block = next.departments[department];
    if (hardDelete) {
      block.equipment = block.equipment.filter((x) => x.id !== id);
    } else {
      block.equipment = block.equipment.map((x) => (x.id === id ? { ...x, enabled: false, updated_at: nowIso() } : x));
    }
    next.updated_at = nowIso();
    return next;
  }

  function exportSettingsJson(settings) {
    return JSON.stringify(normalizeSettings(settings), null, 2);
  }

  function importSettingsJson(text, seed) {
    const parsed = JSON.parse(String(text || "{}"));
    return normalizeSettings(parsed, seed);
  }

  global.TheBaseSettings = {
    STORAGE_KEY,
    VERSION,
    DEPARTMENTS,
    uid,
    nowIso,
    createDefaultSettings,
    normalizeSettings,
    loadSettings,
    saveSettings,
    upsertEquipment,
    removeEquipment,
    exportSettingsJson,
    importSettingsJson
  };
})(window);
