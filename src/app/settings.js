      const logo = document.getElementById("brandLogo");
      const fallback = document.getElementById("brandFallback");
      if (logo && fallback) {
        logo.addEventListener("error", () => {
          logo.style.display = "none";
          fallback.style.display = "grid";
        });
      }
      function applyDeptTheme(dept) {
        const mapped = dept || "Video";
        document.body.setAttribute("data-dept", mapped);
        localStorage.setItem("thebase.activeDept", mapped);
      }
      const storedDept = localStorage.getItem("thebase.activeDept") || "Video";
      applyDeptTheme(storedDept);

      const SETTINGS_TABS = ["Video", "Lighting", "Audio", "Rigging", "Power", "Venue"];
      const seedDefaults = {
        departments: {
          Video: { equipment: [] },
          Lighting: { equipment: [] },
          Audio: { equipment: [] },
          Rigging: { equipment: [{ manufacturer: "Generic", name: "PA", weight_kg: 150, power_use: { watts: null, amps: null }, notes: "Additional", enabled: true }, { manufacturer: "Generic", name: "Projector", weight_kg: 25, power_use: { watts: null, amps: null }, notes: "Additional", enabled: true }] },
          Power: { equipment: [] },
          Venue: { equipment: [] }
        }
      };

      let settingsState = TheBaseSettings.loadSettings(seedDefaults);
      let activeSettingsTab = "Video";
      let editingEquipmentId = "";
      const SETTINGS_UI_TABS = ["General", "Signal / Routing", "Power", "Network", "Physical", "Notes"];
      const settingsSidebar = document.getElementById("settingsSidebar");
      const settingsPropertyTabs = document.getElementById("settingsPropertyTabs");
      const settingsPropertyBody = document.getElementById("settingsPropertyBody");
      const settingsPropObject = document.getElementById("settingsPropObject");
      const settingsStatusPill = document.getElementById("settingsStatusPill");
      const settingsStatusText = document.getElementById("settingsStatusText");
      const MODULE_MENU = [
        { id: "Video", label: "Video", iconKey: "video", color: "#57b36a" },
        { id: "Lighting", label: "Lighting", iconKey: "lighting", color: "#e25555" },
        { id: "Audio", label: "Audio", iconKey: "audio", color: "#4f82ff" },
        { id: "Rigging", label: "Rigging", iconKey: "rigging", color: "#f08a3c" },
        { id: "Power", label: "Power", iconKey: "power", color: "#8b5cff" },
        { id: "Venue", label: "Venue", iconKey: "venue3d", color: "#35bdb0" }
      ];
      let settingsPropertyTab = "General";

      const ui = {
        title: document.getElementById("settingsSectionTitle"),
        subtitle: document.getElementById("settingsSectionSubtitle"),
        table: document.getElementById("settingsEquipmentTable"),
        search: document.getElementById("settingsSearch"),
        showDisabled: document.getElementById("settingsShowDisabled"),
        formTitle: document.getElementById("equipmentFormTitle"),
        manufacturer: document.getElementById("eqManufacturer"),
        name: document.getElementById("eqName"),
        weight: document.getElementById("eqWeight"),
        powerW: document.getElementById("eqPowerW"),
        powerA: document.getElementById("eqPowerA"),
        notes: document.getElementById("eqNotes"),
        formError: document.getElementById("equipmentFormError"),
        rulesJson: document.getElementById("deptRulesJson"),
        rulesError: document.getElementById("deptRulesError"),
        globalDistance: document.getElementById("globalDistanceUnit"),
        globalWeight: document.getElementById("globalWeightUnit"),
        globalPower: document.getElementById("globalPowerUnit"),
        globalCurrent: document.getElementById("globalCurrentUnit"),
        globalRigSafety: document.getElementById("globalRigSafety"),
        globalElecSafety: document.getElementById("globalElecSafety")
      };

      function saveSettingsState() {
        settingsState = TheBaseSettings.saveSettings(settingsState);
      }

      function getActiveEquipment() {
        return settingsState.departments[activeSettingsTab]?.equipment || [];
      }

      function resetForm() {
        editingEquipmentId = "";
        ui.formTitle.textContent = "Add Equipment";
        ui.manufacturer.value = "";
        ui.name.value = "";
        ui.weight.value = "";
        ui.powerW.value = "";
        ui.powerA.value = "";
        ui.notes.value = "";
        ui.formError.textContent = "";
      }

      function fillFormForEdit(item) {
        editingEquipmentId = item.id;
        ui.formTitle.textContent = "Edit Equipment";
        ui.manufacturer.value = item.manufacturer || "";
        ui.name.value = item.name || "";
        ui.weight.value = item.weight_kg ?? "";
        ui.powerW.value = item.power_use?.watts ?? "";
        ui.powerA.value = item.power_use?.amps ?? "";
        ui.notes.value = item.notes || "";
        ui.formError.textContent = "";
      }

      function renderEquipmentTable() {
        const rows = getActiveEquipment();
        const q = String(ui.search.value || "").trim().toLowerCase();
        const showDisabled = ui.showDisabled.checked;
        const filtered = rows.filter((r) => {
          if (!showDisabled && r.enabled === false) return false;
          if (!q) return true;
          return `${r.manufacturer} ${r.name} ${r.notes}`.toLowerCase().includes(q);
        });
        ui.table.innerHTML = filtered.map((item) => `
          <tr>
            <td>${item.manufacturer || "-"}</td>
            <td>${item.name || "-"}</td>
            <td>${item.weight_kg ?? "-"}</td>
            <td>${item.power_use?.watts ?? "-"}W / ${item.power_use?.amps ?? "-"}A</td>
            <td>${item.notes || "-"}</td>
            <td>${item.enabled === false ? "<span class='pill'>Disabled</span>" : "<span class='pill'>Enabled</span>"}</td>
            <td>
              <div class="actions">
                <button class="btn" data-eq-edit="${item.id}">Edit</button>
                <button class="btn" data-eq-toggle="${item.id}">${item.enabled === false ? "Enable" : "Disable"}</button>
                <button class="btn" data-eq-delete="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `).join("") || `<tr><td colspan="7" class="muted">No equipment for this section.</td></tr>`;
        ui.table.querySelectorAll("[data-eq-edit]").forEach((b) => {
          b.addEventListener("click", () => {
            const id = b.dataset.eqEdit;
            const item = getActiveEquipment().find((x) => x.id === id);
            if (item) fillFormForEdit(item);
          });
        });
        ui.table.querySelectorAll("[data-eq-toggle]").forEach((b) => {
          b.addEventListener("click", () => {
            const id = b.dataset.eqToggle;
            const item = getActiveEquipment().find((x) => x.id === id);
            if (!item) return;
            const updated = { ...item, enabled: item.enabled === false };
            settingsState = TheBaseSettings.upsertEquipment(settingsState, activeSettingsTab, updated);
            saveSettingsState();
            renderSettingsView();
          });
        });
        ui.table.querySelectorAll("[data-eq-delete]").forEach((b) => {
          b.addEventListener("click", () => {
            const id = b.dataset.eqDelete;
            if (!id) return;
            settingsState = TheBaseSettings.removeEquipment(settingsState, activeSettingsTab, id, true);
            saveSettingsState();
            renderSettingsView();
          });
        });
      }

      function renderRules() {
        ui.rulesJson.disabled = false;
        document.getElementById("deptRulesSaveBtn").disabled = false;
        ui.rulesJson.value = JSON.stringify(settingsState.departments[activeSettingsTab]?.rules || {}, null, 2);
        ui.rulesError.textContent = "";
      }

      function renderGlobals() {
        const g = settingsState.global || {};
        ui.globalDistance.value = g.units?.distance || "m";
        ui.globalWeight.value = g.units?.weight || "kg";
        ui.globalPower.value = g.units?.power || "W";
        ui.globalCurrent.value = g.units?.current || "A";
        ui.globalRigSafety.value = g.safety_factors?.rigging ?? 1.2;
        ui.globalElecSafety.value = g.safety_factors?.electrical ?? 0.8;
      }

      function renderSidebar() {
        if (!settingsSidebar) return;
        const iconSvg = (key) => {
          const icons = {
            video: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="14" height="10" rx="2"></rect><path d="M17.5 8.5L21 6.8v7.4l-3.5-1.7z"></path><path d="M6 18.5h9"></path><path d="M10.5 15.5v3"></path></svg>',
            lighting: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4.5h10"></path><path d="M8.5 4.5v4l3.5 4v3"></path><path d="M15.5 4.5v4l-3.5 4"></path><path d="M9.5 18h5"></path><path d="M10.5 20h3"></path></svg>',
            audio: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 14h3l4.5 3.5V6.5L6.5 10h-3z"></path><path d="M14.5 10.2a4.2 4.2 0 0 1 0 3.6"></path><path d="M17.5 8a7.4 7.4 0 0 1 0 8"></path><path d="M20 5.5a11 11 0 0 1 0 13"></path></svg>',
            rigging: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5h16"></path><path d="M6.5 6.5l5.5 10 5.5-10"></path><path d="M9.2 11.4h5.6"></path><path d="M12 16.5v4"></path><circle cx="12" cy="21" r="1.4"></circle></svg>',
            power: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 4v6"></path><path d="M15.5 4v6"></path><path d="M6 10h12v4a6 6 0 0 1-12 0z"></path></svg>',
            venue3d: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"></path><path d="M12 12l8-4.5"></path><path d="M12 12v9"></path><path d="M12 12L4 7.5"></path></svg>',
            outputs: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3.5" width="13" height="17" rx="2"></rect><path d="M8 8h5"></path><path d="M8 12h5"></path><path d="M8 16h3"></path><path d="M17 8.5h3.5"></path><path d="M18.8 6.8l1.7 1.7-1.7 1.7"></path></svg>',
            projects: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="8" height="6" rx="1.5"></rect><rect x="13" y="5" width="8" height="6" rx="1.5"></rect><rect x="8" y="13" width="8" height="6" rx="1.5"></rect><path d="M11 8h2"></path><path d="M12 11v2"></path></svg>',
            settings: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="2"></circle><circle cx="16" cy="12" r="2"></circle><circle cx="10" cy="17" r="2"></circle><path d="M10 7h10"></path><path d="M3.5 7H6"></path><path d="M3.5 12H14"></path><path d="M18 12h2.5"></path><path d="M3.5 17H8"></path><path d="M12 17h8.5"></path></svg>'
          };
          return icons[key] || icons.settings;
        };
        settingsSidebar.innerHTML = MODULE_MENU.map((m) => `
          <button data-settings-dept="${m.id}" class="${m.id === activeSettingsTab ? "active" : ""}" title="${m.label}">
            <span class="nav-icon" style="border-color:${m.color};color:${m.color};">${iconSvg(m.iconKey)}</span>
            <span class="nav-label">${m.label}</span>
          </button>
        `).join("");
        settingsSidebar.querySelectorAll("button[data-settings-dept]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const next = String(btn.getAttribute("data-settings-dept") || "Video");
            if (!SETTINGS_TABS.includes(next)) return;
            activeSettingsTab = next;
            editingEquipmentId = "";
            renderSettingsView();
          });
        });
      }

      function getPropertyRows() {
        const tab = String(settingsPropertyTab || "General");
        if (tab === "General") {
          return [
            { k: "Section", v: activeSettingsTab },
            { k: "Equipment Rows", v: String(getActiveEquipment().length) },
            { k: "Search", v: ui.search.value ? "Filtered" : "All rows" }
          ];
        }
        if (tab === "Power") {
          const rows = getActiveEquipment();
          const totalW = rows.reduce((s, r) => s + (Number(r?.power_use?.watts) || 0), 0);
          const totalA = rows.reduce((s, r) => s + (Number(r?.power_use?.amps) || 0), 0);
          return [
            { k: "Total Watts", v: `${totalW.toFixed(1)} W` },
            { k: "Total Amps", v: `${totalA.toFixed(2)} A` },
            { k: "Rows with Power", v: String(rows.filter((r) => Number.isFinite(Number(r?.power_use?.watts)) || Number.isFinite(Number(r?.power_use?.amps))).length) }
          ];
        }
        if (tab === "Physical") {
          const rows = getActiveEquipment();
          const totalKg = rows.reduce((s, r) => s + (Number(r?.weight_kg) || 0), 0);
          return [
            { k: "Total Weight", v: `${totalKg.toFixed(1)} kg` },
            { k: "Weighted Rows", v: String(rows.filter((r) => Number.isFinite(Number(r?.weight_kg))).length) },
            { k: "Unit", v: settingsState.global?.units?.weight || "kg" }
          ];
        }
        if (tab === "Notes") {
          return [
            { k: "Rules Editor", v: "Department JSON rules active" },
            { k: "Data Source", v: "Local Settings Store" },
            { k: "Sync", v: "Engineering reads from this page" }
          ];
        }
        return [
          { k: "Category", v: tab },
          { k: "Status", v: "Configured" }
        ];
      }

      function renderPropertyPanel() {
        if (!settingsPropertyTabs || !settingsPropertyBody || !settingsPropObject) return;
        settingsPropObject.textContent = activeSettingsTab.toLowerCase();
        settingsPropertyTabs.innerHTML = SETTINGS_UI_TABS.map((tab) => `<button data-prop-tab="${tab}" class="${tab === settingsPropertyTab ? "active" : ""}">${tab}</button>`).join("");
        const rows = getPropertyRows();
        settingsPropertyBody.innerHTML = rows.map((r) => `
          <div class="property-row">
            <div class="property-key">${r.k}</div>
            <div class="property-val">${r.v}</div>
          </div>
        `).join("");
        settingsPropertyTabs.querySelectorAll("[data-prop-tab]").forEach((btn) => {
          btn.addEventListener("click", () => {
            settingsPropertyTab = btn.getAttribute("data-prop-tab") || "General";
            renderPropertyPanel();
          });
        });
      }

      function renderSettingsStatus() {
        if (!settingsStatusPill || !settingsStatusText) return;
        const eq = getActiveEquipment();
        const missing = eq.filter((r) => !String(r.manufacturer || "").trim() || !String(r.name || "").trim());
        const warn = eq.filter((r) => !Number.isFinite(Number(r?.weight_kg)) || (!Number.isFinite(Number(r?.power_use?.watts)) && !Number.isFinite(Number(r?.power_use?.amps))));
        let level = "READY";
        let text = "Settings ready";
        if (missing.length) {
          level = "ERROR";
          text = `${missing.length} row(s) missing required identity fields`;
        } else if (warn.length) {
          level = "WARN";
          text = `${warn.length} row(s) missing weight or power values`;
        }
        settingsStatusPill.textContent = level;
        settingsStatusPill.className = `status-pill ${level === "ERROR" ? "error" : (level === "WARN" ? "warn" : "ready")}`;
        settingsStatusText.textContent = text;
      }

      function renderSettingsView() {
        renderSidebar();
        const themeDeptMap = {
          Video: "Video",
          Lighting: "Lighting",
          Audio: "Sound",
          Rigging: "Rigging",
          Power: "Power",
          Venue: "Venue"
        };
        applyDeptTheme(themeDeptMap[activeSettingsTab] || "Power");
        ui.title.textContent = `${activeSettingsTab} Settings`;
        ui.subtitle.textContent = `Manage ${activeSettingsTab} equipment and rules.`;
        ui.search.disabled = false;
        ui.showDisabled.disabled = false;
        ["manufacturer", "name", "weight", "powerW", "powerA", "notes"].forEach((k) => { ui[k].disabled = false; });
        document.getElementById("equipmentSaveBtn").disabled = false;
        document.getElementById("equipmentCancelBtn").disabled = false;
        renderEquipmentTable();
        renderRules();
        renderGlobals();
        renderPropertyPanel();
        renderSettingsStatus();
      }

      function validateEquipmentInput() {
        const manufacturer = String(ui.manufacturer.value || "").trim();
        const name = String(ui.name.value || "").trim();
        const weight = ui.weight.value === "" ? null : Number(ui.weight.value);
        const watts = ui.powerW.value === "" ? null : Number(ui.powerW.value);
        const amps = ui.powerA.value === "" ? null : Number(ui.powerA.value);
        if (!manufacturer) return { ok: false, message: "Manufacturer is required." };
        if (!name) return { ok: false, message: "Name is required." };
        if (weight !== null && (!Number.isFinite(weight) || weight < 0)) return { ok: false, message: "Weight must be >= 0." };
        if (watts !== null && (!Number.isFinite(watts) || watts < 0)) return { ok: false, message: "Power watts must be >= 0." };
        if (amps !== null && (!Number.isFinite(amps) || amps < 0)) return { ok: false, message: "Power amps must be >= 0." };
        return { ok: true, value: { manufacturer, name, weight, watts, amps, notes: String(ui.notes.value || "").trim() } };
      }

      document.getElementById("equipmentSaveBtn")?.addEventListener("click", () => {
        const v = validateEquipmentInput();
        if (!v.ok) {
          ui.formError.textContent = v.message;
          return;
        }
        const existing = getActiveEquipment().find((x) => x.id === editingEquipmentId);
        const next = {
          id: existing?.id || TheBaseSettings.uid(`eq_${activeSettingsTab.toLowerCase()}`),
          manufacturer: v.value.manufacturer,
          name: v.value.name,
          weight_kg: v.value.weight,
          power_use: { watts: v.value.watts, amps: v.value.amps },
          notes: v.value.notes,
          enabled: existing?.enabled !== false,
          meta: existing?.meta || {}
        };
        settingsState = TheBaseSettings.upsertEquipment(settingsState, activeSettingsTab, next);
        saveSettingsState();
        resetForm();
        renderSettingsView();
      });

      document.getElementById("equipmentCancelBtn")?.addEventListener("click", () => {
        resetForm();
      });

      document.getElementById("deptRulesSaveBtn")?.addEventListener("click", () => {
        try {
          const parsed = JSON.parse(String(ui.rulesJson.value || "{}"));
          settingsState.departments[activeSettingsTab].rules = parsed && typeof parsed === "object" ? parsed : {};
          saveSettingsState();
          ui.rulesError.textContent = "";
        } catch (err) {
          ui.rulesError.textContent = `Invalid JSON: ${err.message}`;
        }
      });

      document.getElementById("globalSaveBtn")?.addEventListener("click", () => {
        settingsState.global.units.distance = String(ui.globalDistance.value || "m").trim() || "m";
        settingsState.global.units.weight = String(ui.globalWeight.value || "kg").trim() || "kg";
        settingsState.global.units.power = String(ui.globalPower.value || "W").trim() || "W";
        settingsState.global.units.current = String(ui.globalCurrent.value || "A").trim() || "A";
        settingsState.global.safety_factors.rigging = Math.max(0.1, Number(ui.globalRigSafety.value || 1.2));
        settingsState.global.safety_factors.electrical = Math.max(0.1, Number(ui.globalElecSafety.value || 0.8));
        saveSettingsState();
        renderSettingsView();
      });

      ui.search?.addEventListener("input", renderEquipmentTable);
      ui.showDisabled?.addEventListener("change", renderEquipmentTable);

      document.getElementById("settingsExportBtn")?.addEventListener("click", () => {
        const json = TheBaseSettings.exportSettingsJson(settingsState);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "the-base-settings.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
      document.getElementById("settingsImportFile")?.addEventListener("change", (ev) => {
        const target = ev.target;
        if (!(target instanceof HTMLInputElement) || !target.files?.length) return;
        const file = target.files[0];
        file.text().then((text) => {
          try {
            settingsState = TheBaseSettings.importSettingsJson(text, seedDefaults);
            saveSettingsState();
            resetForm();
            renderSettingsView();
          } catch (err) {
            alert(`Import failed: ${err.message}`);
          } finally {
            target.value = "";
          }
        });
      });

      renderSettingsView();
