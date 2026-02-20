      const logo = document.getElementById("brandLogo");
      const fallback = document.getElementById("brandFallback");
      if (logo && fallback) {
        logo.addEventListener("error", () => {
          logo.style.display = "none";
          fallback.style.display = "grid";
        });
      }
      const reportThemeMap = { All: "Power", Video: "Video", Lighting: "Lighting", Audio: "Sound", Rigging: "Rigging", Power: "Power", Venue: "Venue" };
      const APP_MEMORY_KEY = "thebase.app.memory.v1";
      function applyDeptTheme(dept) {
        const mapped = reportThemeMap[dept] || "Video";
        document.body.setAttribute("data-dept", mapped);
        localStorage.setItem("thebase.activeDept", mapped);
      }
      const departments = ["Video", "Lighting", "Audio", "Rigging", "Power", "Venue"];
      let activeTab = "Video";
      const reportsSidebar = document.getElementById("reportsSidebar");
      const reportsPropertyTabs = document.getElementById("reportsPropertyTabs");
      const reportsPropertyBody = document.getElementById("reportsPropertyBody");
      const reportsPropObject = document.getElementById("reportsPropObject");
      const reportsStatusPill = document.getElementById("reportsStatusPill");
      const reportsStatusText = document.getElementById("reportsStatusText");
      const REPORT_PROP_TABS = ["General", "Signal / Routing", "Power", "Network", "Physical", "Notes"];
      let reportPropertyTab = "General";
      const MODULE_MENU = [
        { jumpTo: "Video", label: "Video", iconKey: "video", color: "#57b36a", active: true },
        { jumpTo: "Lighting", label: "Lighting", iconKey: "lighting", color: "#e25555" },
        { jumpTo: "Audio", label: "Audio", iconKey: "audio", color: "#4f82ff" },
        { jumpTo: "Rigging", label: "Rigging", iconKey: "rigging", color: "#f08a3c" },
        { jumpTo: "Power", label: "Power", iconKey: "power", color: "#8b5cff" },
        { jumpTo: "Venue", label: "Venue", iconKey: "venue3d", color: "#35bdb0" }
      ];

      function renderReportsSidebar() {
        if (!reportsSidebar) return;
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
        reportsSidebar.innerHTML = MODULE_MENU.map((m) => {
          if (m.jumpTo) {
            return `
            <button class="${m.active ? "active" : ""}" title="${m.label}" data-report-jump="${m.jumpTo}">
                <span class="nav-icon" style="border-color:${m.color};color:${m.color};">${iconSvg(m.iconKey)}</span>
                <span class="nav-label">${m.label}</span>
              </button>
            `;
          }
          return `
            <a href="${m.href}" style="text-decoration:none;">
              <button title="${m.label}">
                <span class="nav-icon" style="border-color:${m.color};color:${m.color};">${iconSvg(m.iconKey)}</span>
                <span class="nav-label">${m.label}</span>
              </button>
            </a>
          `;
        }).join("");

        reportsSidebar.querySelectorAll("button[data-report-jump]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const dept = String(btn.getAttribute("data-report-jump") || "");
            reportsSidebar.querySelectorAll("button[data-report-jump]").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            activeTab = dept;
            renderReports();
          });
        });
      }

      function getReportPropertyRows() {
        const data = buildReports();
        const tab = String(reportPropertyTab || "General");
        if (tab === "General") {
          const activeRows = data.byDept?.[activeTab]?.rows || [];
          return [
            { k: "View", v: activeTab },
            { k: "Rows", v: String(activeRows.length) },
            { k: "Departments", v: String(departments.length) }
          ];
        }
        if (tab === "Power") {
          const totalKw = departments.reduce((s, d) => s + Number(data.byDept?.[d]?.kpis?.find((k) => k.label === "Power (kW)")?.value || 0), 0);
          return [
            { k: "Total Power", v: `${totalKw.toFixed(2)} kW` },
            { k: "Power Graph", v: "Visible in Power report section" },
            { k: "Status", v: "Planning-grade summary" }
          ];
        }
        if (tab === "Physical") {
          const totalKg = departments.reduce((s, d) => s + Number(data.byDept?.[d]?.kpis?.find((k) => k.label === "Weight (kg)")?.value || 0), 0);
          return [
            { k: "Total Weight", v: `${totalKg.toFixed(1)} kg` },
            { k: "Rigging Graph", v: "Visible in Rigging report section" }
          ];
        }
        return [{ k: "Category", v: tab }, { k: "Mode", v: "Structured report output" }];
      }

      function renderReportsProperties() {
        if (!reportsPropertyTabs || !reportsPropertyBody || !reportsPropObject) return;
        reportsPropObject.textContent = (activeTab || "all").toLowerCase();
        reportsPropertyTabs.innerHTML = REPORT_PROP_TABS.map((tab) => `<button data-report-prop-tab="${tab}" class="${tab === reportPropertyTab ? "active" : ""}">${tab}</button>`).join("");
        reportsPropertyBody.innerHTML = getReportPropertyRows().map((r) => `
          <div class="property-row">
            <div class="property-key">${r.k}</div>
            <div class="property-val">${r.v}</div>
          </div>
        `).join("");
        reportsPropertyTabs.querySelectorAll("[data-report-prop-tab]").forEach((btn) => {
          btn.addEventListener("click", () => {
            reportPropertyTab = btn.getAttribute("data-report-prop-tab") || "General";
            renderReportsProperties();
          });
        });
      }

      function renderReportsStatus() {
        if (!reportsStatusPill || !reportsStatusText) return;
        const data = buildReports();
        const warnCount = (data?.all?.diagnostics || []).length;
        let level = "READY";
        let text = "Report pack ready";
        if (warnCount > 0) {
          level = warnCount > 8 ? "ERROR" : "WARN";
          text = `${warnCount} diagnostics flagged in report data`;
        }
        reportsStatusPill.textContent = level;
        reportsStatusPill.className = `status-pill ${level === "ERROR" ? "error" : (level === "WARN" ? "warn" : "ready")}`;
        reportsStatusText.textContent = text;
      }

      function loadSettings() {
        if (!window.TheBaseSettings) return null;
        return TheBaseSettings.loadSettings();
      }
      function loadAppMemorySnapshot() {
        try {
          const raw = localStorage.getItem(APP_MEMORY_KEY);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" ? parsed : null;
        } catch (_) {
          return null;
        }
      }
      function getAudioIoRows() {
        const snap = loadAppMemorySnapshot();
        const audio = snap?.audioState && typeof snap.audioState === "object" ? snap.audioState : null;
        const inputs = Array.isArray(audio?.console?.inputs) ? audio.console.inputs : [];
        const outputs = Array.isArray(audio?.console?.outputs) ? audio.console.outputs : [];
        const inRows = inputs.map((row, idx) => ({
          dir: "Input",
          ch: Math.max(1, Number(row?.patchChannel || idx + 1)),
          name: String(row?.name || ""),
          type: String(row?.sourceType || "wired"),
          location: String(row?.stageLocation === "desk" ? "Desk" : "Stage Box")
        }));
        const outRows = outputs.map((row, idx) => ({
          dir: "Output",
          ch: Math.max(1, Number(row?.patchChannel || idx + 1)),
          name: String(row?.name || ""),
          type: String(row?.sourceType || "wired"),
          location: String(row?.stageLocation === "desk" ? "Desk" : "Stage Box")
        }));
        return [...inRows, ...outRows].sort((a, b) => (a.dir === b.dir ? a.ch - b.ch : (a.dir === "Input" ? -1 : 1)));
      }
      function fmt(value, digits = 1) {
        const n = Number(value);
        if (!Number.isFinite(n)) return "0";
        return n.toFixed(digits);
      }
      function buildReports() {
        const settings = loadSettings();
        const byDept = Object.fromEntries(departments.map((d) => [d, { rows: [], kpis: [] }]));
        const allEquip = [];
        departments.forEach((dept) => {
          const equip = (settings?.departments?.[dept]?.equipment || []).filter((x) => x && x.enabled !== false);
          equip.forEach((e) => allEquip.push({ ...e, department: dept }));
        });

        departments.forEach((dept) => {
          const rows = allEquip.filter((x) => x.department === dept);
          const powerW = rows.reduce((s, r) => s + (Number(r?.power_use?.watts) || 0), 0);
          const weightKg = rows.reduce((s, r) => s + (Number(r?.weight_kg) || 0), 0);
          byDept[dept].kpis = [
            { label: "Equipment", value: String(rows.length) },
            { label: "Weight (kg)", value: fmt(weightKg, 1) },
            { label: "Power (kW)", value: fmt(powerW / 1000, 2) }
          ];
          byDept[dept].rows = rows.map((r) => ({
            item: `${r.manufacturer || "-"} ${r.name || "-"}`.trim(),
            value: `${r.weight_kg ?? "-"}kg | ${r?.power_use?.watts ?? "-"}W / ${r?.power_use?.amps ?? "-"}A`,
            notes: r.notes || ""
          }));
        });

        const allWarnings = [];
        allEquip.forEach((e) => {
          if (!(Number(e.weight_kg) >= 0)) allWarnings.push(`${e.department}: ${e.name || e.id} missing weight.`);
          if (!Number.isFinite(Number(e?.power_use?.watts)) && !Number.isFinite(Number(e?.power_use?.amps))) {
            allWarnings.push(`${e.department}: ${e.name || e.id} missing power use.`);
          }
        });

        const totalWeight = allEquip.reduce((s, r) => s + (Number(r.weight_kg) || 0), 0);
        const totalPowerW = allEquip.reduce((s, r) => s + (Number(r?.power_use?.watts) || 0), 0);
        const allReport = {
          kpis: [
            { label: "Departments", value: String(departments.length) },
            { label: "Equipment Total", value: String(allEquip.length) },
            { label: "Total Weight (kg)", value: fmt(totalWeight, 1) },
            { label: "Total Power (kW)", value: fmt(totalPowerW / 1000, 2) },
            { label: "Warnings", value: String(allWarnings.length) }
          ],
          rows: departments.flatMap((dept) => byDept[dept].rows.map((r) => ({ ...r, dept }))),
          diagnostics: allWarnings
        };

        return { all: allReport, byDept };
      }

      function renderTopKpis(report, isAll) {
        if (isAll) {
          return `
            <div class="grid">
              ${report.kpis.map((k) => `<div class="kpi"><div class="muted">${k.label}</div><b>${k.value}</b></div>`).join("")}
            </div>
          `;
        }
        return `
          <div class="grid">
            ${report.kpis.map((k) => `<div class="kpi"><div class="muted">${k.label}</div><b>${k.value}</b></div>`).join("")}
          </div>
        `;
      }

      function renderSection(dept, report) {
        const showAudioPdfPreview = dept === "Audio";
        let graphHtml = "";
        if (dept === "Rigging") graphHtml = renderRiggingGraph();
        if (dept === "Power") graphHtml = renderPowerGraph();
        const audioIoRows = dept === "Audio" ? getAudioIoRows() : [];
        const audioInputs = audioIoRows.filter((r) => r.dir === "Input");
        const audioOutputs = audioIoRows.filter((r) => r.dir === "Output");
        const chunkRows = (rows, size = 26) => {
          const out = [];
          for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
          return out.length ? out : [[]];
        };
        const inputPages = chunkRows(audioInputs, 26);
        const outputPages = chunkRows(audioOutputs, 26);
        const totalPages = Math.max(inputPages.length, outputPages.length);
        const audioIoHtml = showAudioPdfPreview ? `
          <div class="pdf-viewer">
            <div class="pdf-viewer-toolbar">
              <b>Audio Patch Sheet (Preview)</b>
              <span class="muted">${totalPages} page${totalPages === 1 ? "" : "s"} | Inputs ${audioInputs.length} | Outputs ${audioOutputs.length}</span>
            </div>
            <div class="pdf-viewer-pages">
              ${Array.from({ length: totalPages }, (_, pageIndex) => {
                const inRows = inputPages[pageIndex] || [];
                const outRows = outputPages[pageIndex] || [];
                return `
                  <div class="audio-print-page">
                    <div class="toolbar">
                      <h4>Audio Patch Sheet - Page ${pageIndex + 1} of ${totalPages}</h4>
                      <span class="badge">A4</span>
                    </div>
                    <div class="audio-sheet-grid">
                      <div class="audio-sheet-card">
                        <div class="toolbar">
                          <h4>Audio Inputs ${totalPages > 1 ? `(Part ${pageIndex + 1})` : ""}</h4>
                          <span class="badge">${inRows.length} rows</span>
                        </div>
                        <div class="table-wrap">
                          <table>
                            <thead><tr><th>Channel</th><th>Name</th><th>Type</th><th>Location</th></tr></thead>
                            <tbody>
                              ${inRows.map((r) => `<tr><td>${r.ch}</td><td>${r.name || "-"}</td><td>${r.type}</td><td>${r.location}</td></tr>`).join("") || '<tr><td colspan="4" class="muted">No input rows on this page.</td></tr>'}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div class="audio-sheet-card">
                        <div class="toolbar">
                          <h4>Audio Outputs ${totalPages > 1 ? `(Part ${pageIndex + 1})` : ""}</h4>
                          <span class="badge">${outRows.length} rows</span>
                        </div>
                        <div class="table-wrap">
                          <table>
                            <thead><tr><th>Channel</th><th>Name</th><th>Type</th><th>Location</th></tr></thead>
                            <tbody>
                              ${outRows.map((r) => `<tr><td>${r.ch}</td><td>${r.name || "-"}</td><td>${r.type}</td><td>${r.location}</td></tr>`).join("") || '<tr><td colspan="4" class="muted">No output rows on this page.</td></tr>'}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        ` : "";
        if (dept === "Audio") {
          return `
            <section class="section" id="report-section-audio">
              <div class="toolbar">
                <h3>Audio</h3>
                <span class="badge">Patch Preview</span>
              </div>
              <div class="muted" style="margin-top:0.45rem;">Preview the patch sheet below before exporting PDF.</div>
              ${renderTopKpis(report, false)}
              ${audioIoHtml}
            </section>
          `;
        }
        return `
          <section class="section" id="report-section-${String(dept).toLowerCase()}">
            <div class="toolbar">
              <h3>${dept}</h3>
              <span class="badge">${report.rows.length} rows</span>
            </div>
            ${renderTopKpis(report, false)}
            ${graphHtml}
            ${audioIoHtml}
            <div class="table-wrap">
              <table>
                <thead><tr><th>Category</th><th>Item</th><th>Value</th><th>Notes / Warnings</th></tr></thead>
                <tbody>
                  ${report.rows.map((r) => `<tr><td>${dept}</td><td>${r.item}</td><td>${r.value}</td><td>${r.notes || ""}</td></tr>`).join("") || '<tr><td colspan="4" class="muted">No rows.</td></tr>'}
                </tbody>
              </table>
            </div>
          </section>
        `;
      }

      function renderRiggingGraph() {
        const settings = loadSettings();
        const rig = (settings?.departments?.Rigging?.equipment || []).filter((x) => x && x.enabled !== false);
        const weights = rig
          .map((x) => ({ name: `${x.manufacturer || ""} ${x.name || ""}`.trim() || "Item", w: Number(x.weight_kg || 0) }))
          .filter((x) => x.w > 0)
          .sort((a, b) => b.w - a.w)
          .slice(0, 10);
        if (!weights.length) {
          return `<div class="muted" style="margin-top:0.6rem;">No rigging weight data to graph.</div>`;
        }
        const W = 860;
        const H = 180;
        const padL = 46;
        const padR = 16;
        const padT = 16;
        const padB = 30;
        const maxW = Math.max(...weights.map((x) => x.w), 1);
        const barGap = 8;
        const barW = ((W - padL - padR) - (barGap * (weights.length - 1))) / weights.length;
        const bars = weights.map((row, i) => {
          const h = ((H - padT - padB) * (row.w / maxW));
          const x = padL + (i * (barW + barGap));
          const y = (H - padB) - h;
          return `
            <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" fill="#f2b84b88" stroke="#ffcf7b" stroke-width="1"/>
            <text x="${(x + (barW / 2)).toFixed(2)}" y="${(y - 4).toFixed(2)}" text-anchor="middle" fill="#f7e3bf" font-size="8">${row.w.toFixed(1)}kg</text>
            <text x="${(x + (barW / 2)).toFixed(2)}" y="${(H - 12).toFixed(2)}" text-anchor="middle" fill="#c6ccdb" font-size="8">${`R${i + 1}`}</text>
          `;
        }).join("");
        return `
          <div style="margin-top:0.65rem;">
            <div class="muted" style="margin-bottom:0.3rem;">Rigging Weight Distribution (top 10 items)</div>
            <svg viewBox="0 0 ${W} ${H}" style="width:100%;border:1px solid var(--line);border-radius:10px;background:#161b25;">
              <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="var(--line-2)" stroke-width="1"/>
              <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="var(--line-2)" stroke-width="1"/>
              <text x="8" y="${(padT + 6)}" fill="#c6ccdb" font-size="8">${maxW.toFixed(1)}kg</text>
              <text x="8" y="${(H - padB + 4)}" fill="#c6ccdb" font-size="8">0</text>
              ${bars}
            </svg>
          </div>
        `;
      }

      function buildPowerGraphData() {
        const settings = loadSettings();
        const departmentsForLoads = ["Video", "Lighting", "Audio", "Rigging", "Power", "Venue"];
        const loads = [];
        departmentsForLoads.forEach((dept) => {
          const mappedDepartment = (dept === "Video" || dept === "Lighting" || dept === "Audio") ? dept : "Other";
          (settings?.departments?.[dept]?.equipment || [])
            .filter((x) => x && x.enabled !== false)
            .forEach((eq, idx) => {
              const watts = Number(eq?.power_use?.watts);
              const amps = Number(eq?.power_use?.amps);
              if (!Number.isFinite(watts) && !Number.isFinite(amps)) return;
              loads.push({
                id: `rpt_${dept}_${eq.id || idx}`,
                name: `${eq.manufacturer || ""} ${eq.name || ""}`.trim() || `${dept} Item`,
                department: mappedDepartment,
                quantity: 1,
                watts_avg: Number.isFinite(watts) ? watts : null,
                watts_max: Number.isFinite(watts) ? watts : null,
                amps_avg: Number.isFinite(amps) ? amps : null,
                amps_max: Number.isFinite(amps) ? amps : null,
                preferred_connection: "single_phase"
              });
            });
        });
        if (!window.PowerCalculator || typeof window.PowerCalculator.computePowerPlan !== "function") return null;
        if (!loads.length) return null;
        const defaultSettings = window.PowerCalculator.POWER_DEFAULTS || {};
        const powerRules = settings?.departments?.Power?.rules && typeof settings.departments.Power.rules === "object"
          ? settings.departments.Power.rules
          : {};
        return window.PowerCalculator.computePowerPlan(loads, { ...defaultSettings, ...powerRules });
      }

      function renderPowerGraph() {
        const plan = buildPowerGraphData();
        if (!plan?.phase_totals) {
          return `<div class="muted" style="margin-top:0.6rem;">No power data to graph.</div>`;
        }
        const phases = ["L1", "L2", "L3"].map((p) => ({
          phase: p,
          amps: Number(plan.phase_totals?.[p]?.A_max || 0)
        }));
        const W = 860;
        const H = 190;
        const padL = 46;
        const padR = 16;
        const padT = 16;
        const padB = 34;
        const warnA = Number(plan?.settings?.incomer?.per_phase_a || 250) * Number(plan?.settings?.continuous_derate || 0.8);
        const failA = Number(plan?.settings?.incomer?.per_phase_a || 250);
        const yMax = Math.max(failA, ...phases.map((x) => x.amps), 10);
        const barGap = 24;
        const barW = ((W - padL - padR) - (barGap * 2)) / 3;
        const y = (amps) => (H - padB) - ((amps / yMax) * (H - padT - padB));
        const bars = phases.map((row, i) => {
          const x = padL + (i * (barW + barGap));
          const yy = y(row.amps);
          const h = (H - padB) - yy;
          const color = row.amps > failA ? "#ef5353" : (row.amps > warnA ? "#f2b84b" : "#6de2a8");
          return `
            <rect x="${x.toFixed(2)}" y="${yy.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" fill="${color}88" stroke="${color}" stroke-width="1"/>
            <text x="${(x + (barW / 2)).toFixed(2)}" y="${(yy - 4).toFixed(2)}" text-anchor="middle" fill="#e8ecf4" font-size="9">${row.amps.toFixed(1)}A</text>
            <text x="${(x + (barW / 2)).toFixed(2)}" y="${(H - 12).toFixed(2)}" text-anchor="middle" fill="#c6ccdb" font-size="9">${row.phase}</text>
          `;
        }).join("");
        return `
          <div style="margin-top:0.65rem;">
            <div class="muted" style="margin-bottom:0.3rem;">Power Phase Load (A) with WARN/FAIL thresholds</div>
            <svg viewBox="0 0 ${W} ${H}" style="width:100%;border:1px solid var(--line);border-radius:10px;background:#161b25;">
              <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="var(--line-2)" stroke-width="1"/>
              <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="var(--line-2)" stroke-width="1"/>
              <line x1="${padL}" y1="${y(warnA).toFixed(2)}" x2="${W - padR}" y2="${y(warnA).toFixed(2)}" stroke="#f2b84b" stroke-width="1" stroke-dasharray="4 3"/>
              <line x1="${padL}" y1="${y(failA).toFixed(2)}" x2="${W - padR}" y2="${y(failA).toFixed(2)}" stroke="#ef5353" stroke-width="1" stroke-dasharray="4 3"/>
              <text x="8" y="${(y(failA) + 3).toFixed(2)}" fill="#efb2b2" font-size="8">FAIL ${failA.toFixed(0)}A</text>
              <text x="8" y="${(y(warnA) + 3).toFixed(2)}" fill="#f6dcad" font-size="8">WARN ${warnA.toFixed(0)}A</text>
              ${bars}
            </svg>
          </div>
        `;
      }

      function renderReports() {
        const root = document.getElementById("reportContent");
        const badge = document.getElementById("reportCountBadge");
        const exportPdfBtn = document.getElementById("exportPdfBtn");
        if (!root || !badge) return;
        if (exportPdfBtn) exportPdfBtn.style.display = activeTab === "Audio" ? "inline-block" : "none";
        const data = buildReports();
        const report = data.byDept[activeTab] || { rows: [], kpis: [] };
        badge.textContent = `${report.rows.length} report rows`;
        applyDeptTheme(activeTab);
        root.innerHTML = renderSection(activeTab, report);
        renderReportsProperties();
        renderReportsStatus();
      }

      function exportRowsAsCsv() {
        const data = buildReports();
        const rows = (activeTab === "All")
          ? data.all.rows.map((r) => ({ category: r.dept, ...r }))
          : (data.byDept[activeTab]?.rows || []).map((r) => ({ category: activeTab, ...r }));
        const header = ["Category", "Item", "Value", "Notes"];
        const body = rows.map((r) => [
          r.category,
          String(r.item || "").replaceAll("\"", "\"\""),
          String(r.value || "").replaceAll("\"", "\"\""),
          String(r.notes || "").replaceAll("\"", "\"\"")
        ]);
        const csv = [header.join(","), ...body.map((r) => `"${r[0]}","${r[1]}","${r[2]}","${r[3]}"`)].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `the-base-reports-${activeTab.toLowerCase()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      function exportRowsAsJson() {
        const data = buildReports();
        const payload = activeTab === "All" ? data : { [activeTab]: data.byDept[activeTab] };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `the-base-reports-${activeTab.toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      function exportAudioPatchPdf() {
        const audioIoRows = getAudioIoRows();
        const inputs = audioIoRows.filter((r) => r.dir === "Input").sort((a, b) => a.ch - b.ch);
        const outputs = audioIoRows.filter((r) => r.dir === "Output").sort((a, b) => a.ch - b.ch);
        const now = new Date();
        const stamp = now.toLocaleString();
        const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>The Base - Audio Patch List</title>
  </head>
  <body>
    <section class="sheet">
      <div class="head">
        <h1>THE BASE - AUDIO PATCH LIST</h1>
        <div class="meta">Generated: ${stamp}</div>
      </div>
      <div class="block">
        <h2>Inputs (${inputs.length})</h2>
        <table>
          <thead><tr><th>Channel</th><th>Name</th><th>Type</th><th>Location</th></tr></thead>
          <tbody>
            ${inputs.map((r) => `<tr><td>${r.ch}</td><td>${r.name || "-"}</td><td>${r.type || "-"}</td><td>${r.location || "-"}</td></tr>`).join("") || `<tr><td colspan="4">No input channels.</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="block">
        <h2>Outputs (${outputs.length})</h2>
        <table>
          <thead><tr><th>Channel</th><th>Name</th><th>Type</th><th>Location</th></tr></thead>
          <tbody>
            ${outputs.map((r) => `<tr><td>${r.ch}</td><td>${r.name || "-"}</td><td>${r.type || "-"}</td><td>${r.location || "-"}</td></tr>`).join("") || `<tr><td colspan="4">No output channels.</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="muted">Planning-grade patch output from current project memory.</div>
    </section>
  </body>
</html>
        `;
        const frame = document.createElement("iframe");
        frame.style.position = "fixed";
        frame.style.right = "0";
        frame.style.bottom = "0";
        frame.style.width = "0";
        frame.style.height = "0";
        frame.style.border = "0";
        frame.setAttribute("aria-hidden", "true");
        document.body.appendChild(frame);
        const doc = frame.contentWindow?.document;
        if (!doc || !frame.contentWindow) {
          frame.remove();
          alert("Unable to generate PDF preview.");
          return;
        }
        frame.onload = () => {
          try {
            frame.contentWindow.focus();
            frame.contentWindow.print();
          } finally {
            setTimeout(() => frame.remove(), 1500);
          }
        };
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          if (document.body.contains(frame)) {
            try {
              frame.contentWindow.focus();
              frame.contentWindow.print();
            } finally {
              setTimeout(() => frame.remove(), 1500);
            }
          }
        }, 300);
      }

      function initReports() {
        renderReportsSidebar();
        activeTab = "Video";

        const now = new Date();
        const iso = now.toISOString().slice(0, 10);
        const from = new Date(now.getTime() - (7 * 24 * 3600 * 1000)).toISOString().slice(0, 10);
        const dFrom = document.getElementById("reportDateFrom");
        const dTo = document.getElementById("reportDateTo");
        if (dFrom) dFrom.value = from;
        if (dTo) dTo.value = iso;
        document.getElementById("exportPdfBtn")?.addEventListener("click", exportAudioPatchPdf);
        renderReports();
      }

      initReports();
