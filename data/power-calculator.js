(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PowerCalculator = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PHASES = ["L1", "L2", "L3"];
  var SOCA_HEAD_PHASE = { 1: "L1", 2: "L2", 3: "L3", 4: "L1", 5: "L2", 6: "L3" };
  var GEN_SIZES_KVA = [20, 30, 40, 60, 80, 100, 150, 200, 250, 300, 400, 500];

  var POWER_DEFAULTS = {
    frequency_hz: 50,
    voltage_single_phase: 230,
    voltage_three_phase_ll: 400,
    pf_by_department: {
      Lighting: 0.95,
      Audio: 0.9,
      Video: 0.95,
      Other: 0.9
    },
    continuous_derate: 0.8,
    incomer: {
      label: "Powerlock 250A 3-phase",
      per_phase_a: 250
    },
    outgoing_breakers: [15, 16, 32, 63],
    imbalance_warn_ratio: 0.2,
    department_phase_warn_ratio: 0.5,
    generator: {
      base_headroom: 1.25,
      led_or_inrush_headroom: 1.3,
      inrush_extra: 1.1,
      sizes_kva: GEN_SIZES_KVA.slice()
    },
    balance: {
      department_penalty_weight: 0.22
    },
    socapex: {
      head_rating_a: 16,
      phase_feed_limit_a: null
    }
  };

  function isFiniteNumber(v) {
    return Number.isFinite(Number(v));
  }
  function n(v, fallback) {
    var x = Number(v);
    return Number.isFinite(x) ? x : fallback;
  }
  function round3(v) {
    return Math.round(Number(v || 0) * 1000) / 1000;
  }
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }
  function ensureDepartment(v) {
    var d = String(v || "Other");
    if (d === "Lighting" || d === "Audio" || d === "Video" || d === "Other") return d;
    return "Other";
  }
  function safePf(v, fallback) {
    var pf = Number(v);
    if (!Number.isFinite(pf) || pf <= 0) return fallback;
    return clamp(pf, 0.1, 1);
  }
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  function mergeDefaults(settings) {
    var out = deepClone(POWER_DEFAULTS);
    if (!settings || typeof settings !== "object") return out;
    Object.keys(settings).forEach(function (k) {
      if (settings[k] === undefined) return;
      if (settings[k] && typeof settings[k] === "object" && !Array.isArray(settings[k]) && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) {
        Object.assign(out[k], settings[k]);
      } else {
        out[k] = settings[k];
      }
    });
    return out;
  }

  function normalizeLoadItem(item, settings) {
    var cfg = mergeDefaults(settings);
    var department = ensureDepartment(item && item.department);
    var pf = safePf(item && item.pf, safePf(cfg.pf_by_department[department], 0.9));
    var qty = Math.max(1, Math.round(n(item && item.quantity, 1)));
    var voltage = n(cfg.voltage_single_phase, 230);
    var inrush = Math.max(1, n(item && item.inrush_multiplier, 1));
    var conn = String((item && item.preferred_connection) || "single_phase");
    var wattsAvg = isFiniteNumber(item && item.watts_avg) ? Number(item.watts_avg) : null;
    var wattsMax = isFiniteNumber(item && item.watts_max) ? Number(item.watts_max) : null;
    var ampsAvg = isFiniteNumber(item && item.amps_avg) ? Number(item.amps_avg) : null;
    var ampsMax = isFiniteNumber(item && item.amps_max) ? Number(item.amps_max) : null;
    var mode = wattsAvg !== null || wattsMax !== null ? "watts" : (ampsAvg !== null || ampsMax !== null ? "amps" : "unknown");

    var wAvgUnit = null;
    var vaAvgUnit = null;
    var aAvgUnit = null;
    var wMaxUnit = null;
    var vaMaxUnit = null;
    var aMaxUnit = null;
    var warnings = [];

    if (mode === "watts") {
      if (wattsAvg === null && wattsMax !== null) wattsAvg = wattsMax;
      if (wattsMax === null && wattsAvg !== null) wattsMax = wattsAvg;
      wAvgUnit = wattsAvg;
      wMaxUnit = wattsMax;
      vaAvgUnit = wAvgUnit / pf;
      vaMaxUnit = wMaxUnit / pf;
      aAvgUnit = vaAvgUnit / voltage;
      aMaxUnit = vaMaxUnit / voltage;
    } else if (mode === "amps") {
      if (ampsAvg === null && ampsMax !== null) ampsAvg = ampsMax;
      if (ampsMax === null && ampsAvg !== null) ampsMax = ampsAvg;
      aAvgUnit = ampsAvg;
      aMaxUnit = ampsMax;
      vaAvgUnit = voltage * aAvgUnit;
      vaMaxUnit = voltage * aMaxUnit;
      wAvgUnit = vaAvgUnit * pf;
      wMaxUnit = vaMaxUnit * pf;
    } else {
      warnings.push("Missing power input (need watts or amps).");
    }

    if (wAvgUnit !== null && wAvgUnit < 0) warnings.push("Average power is negative.");
    if (wMaxUnit !== null && wMaxUnit < 0) warnings.push("Max power is negative.");
    if (aAvgUnit !== null && aAvgUnit < 0) warnings.push("Average current is negative.");
    if (aMaxUnit !== null && aMaxUnit < 0) warnings.push("Max current is negative.");

    if (wAvgUnit !== null && wMaxUnit !== null && wMaxUnit < wAvgUnit) wMaxUnit = wAvgUnit;
    if (vaAvgUnit !== null && vaMaxUnit !== null && vaMaxUnit < vaAvgUnit) vaMaxUnit = vaAvgUnit;
    if (aAvgUnit !== null && aMaxUnit !== null && aMaxUnit < aAvgUnit) aMaxUnit = aAvgUnit;

    return {
      id: String((item && item.id) || ("load_" + Math.random().toString(36).slice(2, 8))),
      name: String((item && item.name) || "Unnamed Load"),
      department: department,
      quantity: qty,
      pf: pf,
      inrush_multiplier: inrush,
      preferred_connection: conn,
      grouping_key: item && item.grouping_key ? String(item.grouping_key) : "",
      socapex: item && item.socapex ? {
        loom_id: String(item.socapex.loom_id || "SOCA-1"),
        head: isFiniteNumber(item.socapex.head) ? clamp(Math.round(Number(item.socapex.head)), 1, 6) : null
      } : null,
      source: item && item.source ? String(item.source) : "",
      mode: mode,
      warnings: warnings,
      unit: {
        W_avg: wAvgUnit === null ? null : round3(wAvgUnit),
        VA_avg: vaAvgUnit === null ? null : round3(vaAvgUnit),
        A_avg: aAvgUnit === null ? null : round3(aAvgUnit),
        W_max: wMaxUnit === null ? null : round3(wMaxUnit),
        VA_max: vaMaxUnit === null ? null : round3(vaMaxUnit),
        A_max: aMaxUnit === null ? null : round3(aMaxUnit)
      },
      totals: {
        W_avg: wAvgUnit === null ? null : round3(wAvgUnit * qty),
        VA_avg: vaAvgUnit === null ? null : round3(vaAvgUnit * qty),
        A_avg: aAvgUnit === null ? null : round3(aAvgUnit * qty),
        W_max: wMaxUnit === null ? null : round3(wMaxUnit * qty),
        VA_max: vaMaxUnit === null ? null : round3(vaMaxUnit * qty),
        A_max: aMaxUnit === null ? null : round3(aMaxUnit * qty)
      }
    };
  }

  function computeTotals(items) {
    var totals = {
      avg: { W: 0, VA: 0, A: 0 },
      max: { W: 0, VA: 0, A: 0 },
      byDepartment: {}
    };
    ["Lighting", "Audio", "Video", "Other"].forEach(function (d) {
      totals.byDepartment[d] = { avg: { W: 0, VA: 0, A: 0 }, max: { W: 0, VA: 0, A: 0 }, count: 0 };
    });
    (items || []).forEach(function (it) {
      var d = ensureDepartment(it.department);
      var t = totals.byDepartment[d];
      var wa = n(it.totals && it.totals.W_avg, 0);
      var vaa = n(it.totals && it.totals.VA_avg, 0);
      var aa = n(it.totals && it.totals.A_avg, 0);
      var wm = n(it.totals && it.totals.W_max, wa);
      var vam = n(it.totals && it.totals.VA_max, vaa);
      var am = n(it.totals && it.totals.A_max, aa);
      totals.avg.W += wa;
      totals.avg.VA += vaa;
      totals.avg.A += aa;
      totals.max.W += wm;
      totals.max.VA += vam;
      totals.max.A += am;
      t.avg.W += wa;
      t.avg.VA += vaa;
      t.avg.A += aa;
      t.max.W += wm;
      t.max.VA += vam;
      t.max.A += am;
      t.count += Number(it.quantity || 0);
    });
    totals.avg.W = round3(totals.avg.W);
    totals.avg.VA = round3(totals.avg.VA);
    totals.avg.A = round3(totals.avg.A);
    totals.max.W = round3(totals.max.W);
    totals.max.VA = round3(totals.max.VA);
    totals.max.A = round3(totals.max.A);
    Object.keys(totals.byDepartment).forEach(function (d) {
      var t = totals.byDepartment[d];
      t.avg.W = round3(t.avg.W);
      t.avg.VA = round3(t.avg.VA);
      t.avg.A = round3(t.avg.A);
      t.max.W = round3(t.max.W);
      t.max.VA = round3(t.max.VA);
      t.max.A = round3(t.max.A);
    });
    return totals;
  }

  function initPhaseTotals(base) {
    var out = {
      L1: { W_max: 0, VA_max: 0, A_max: 0 },
      L2: { W_max: 0, VA_max: 0, A_max: 0 },
      L3: { W_max: 0, VA_max: 0, A_max: 0 }
    };
    if (!base) return out;
    PHASES.forEach(function (p) {
      out[p].W_max = n(base[p] && base[p].W_max, 0);
      out[p].VA_max = n(base[p] && base[p].VA_max, 0);
      out[p].A_max = n(base[p] && base[p].A_max, 0);
    });
    return out;
  }

  function balanceThreePhase(items, settings, options) {
    var cfg = mergeDefaults(settings);
    var opts = options || {};
    var excluded = new Set(opts.exclude_item_ids || []);
    var assignments = [];
    var phaseTotals = initPhaseTotals(opts.base_phase_totals);
    var deptTotalsVA = { Lighting: 0, Audio: 0, Video: 0, Other: 0 };
    var deptPhaseVA = {
      L1: { Lighting: 0, Audio: 0, Video: 0, Other: 0 },
      L2: { Lighting: 0, Audio: 0, Video: 0, Other: 0 },
      L3: { Lighting: 0, Audio: 0, Video: 0, Other: 0 }
    };

    var grouped = {};
    var unitBlocks = [];

    (items || []).forEach(function (it) {
      if (!it || excluded.has(it.id)) return;
      var d = ensureDepartment(it.department);
      var wTotal = n(it.totals && it.totals.W_max, 0);
      var vaTotal = n(it.totals && it.totals.VA_max, 0);
      var aTotal = n(it.totals && it.totals.A_max, 0);
      deptTotalsVA[d] += vaTotal;

      if (it.preferred_connection === "three_phase_balanced") {
        PHASES.forEach(function (p) {
          phaseTotals[p].W_max += wTotal / 3;
          phaseTotals[p].VA_max += vaTotal / 3;
          phaseTotals[p].A_max += aTotal / 3;
          deptPhaseVA[p][d] += vaTotal / 3;
        });
        assignments.push({
          block_id: "blk_3p_" + it.id,
          item_ids: [it.id],
          item_name: it.name,
          phase: "L1/L2/L3",
          department: d,
          W_max: round3(wTotal),
          VA_max: round3(vaTotal),
          A_max: round3(aTotal),
          quantity: Number(it.quantity || 1),
          split: "three_phase_balanced"
        });
        return;
      }

      if (it.preferred_connection === "socapex_head") {
        return;
      }

      var qty = Math.max(1, Math.round(n(it.quantity, 1)));
      var unit = {
        itemId: it.id,
        itemName: it.name,
        department: d,
        W_max: wTotal / qty,
        VA_max: vaTotal / qty,
        A_max: aTotal / qty,
        quantity: 1
      };
      if (it.grouping_key) {
        var gk = String(it.grouping_key);
        if (!grouped[gk]) {
          grouped[gk] = {
            id: "grp_" + gk,
            itemIds: [],
            itemName: it.name,
            department: d,
            W_max: 0,
            VA_max: 0,
            A_max: 0,
            quantity: 0
          };
        }
        grouped[gk].itemIds.push(it.id);
        grouped[gk].W_max += wTotal;
        grouped[gk].VA_max += vaTotal;
        grouped[gk].A_max += aTotal;
        grouped[gk].quantity += qty;
      } else {
        for (var i = 0; i < qty; i += 1) {
          unitBlocks.push({
            id: "blk_" + it.id + "_" + (i + 1),
            itemIds: [it.id],
            itemName: it.name,
            department: d,
            W_max: unit.W_max,
            VA_max: unit.VA_max,
            A_max: unit.A_max,
            quantity: 1
          });
        }
      }
    });

    Object.keys(grouped).forEach(function (k) {
      var g = grouped[k];
      unitBlocks.push({
        id: g.id,
        itemIds: g.itemIds.slice().sort(),
        itemName: g.itemName + " [" + k + "]",
        department: g.department,
        W_max: g.W_max,
        VA_max: g.VA_max,
        A_max: g.A_max,
        quantity: g.quantity
      });
    });

    unitBlocks.sort(function (a, b) {
      if (b.VA_max !== a.VA_max) return b.VA_max - a.VA_max;
      if (a.department !== b.department) return a.department.localeCompare(b.department);
      return a.id.localeCompare(b.id);
    });

    function phaseScore(phase, block) {
      var totals = {
        L1: phaseTotals.L1.A_max + (phase === "L1" ? block.A_max : 0),
        L2: phaseTotals.L2.A_max + (phase === "L2" ? block.A_max : 0),
        L3: phaseTotals.L3.A_max + (phase === "L3" ? block.A_max : 0)
      };
      var maxA = Math.max(totals.L1, totals.L2, totals.L3);
      var minA = Math.min(totals.L1, totals.L2, totals.L3);
      var imbalance = maxA - minA;

      var dept = block.department;
      var deptTotal = Math.max(0.001, deptTotalsVA[dept]);
      var deptPhase = deptPhaseVA[phase][dept] + block.VA_max;
      var share = deptPhase / deptTotal;
      var deptPenalty = Math.pow(Math.max(0, share - (1 / 3)), 2) * 100;
      var weight = n(cfg.balance && cfg.balance.department_penalty_weight, 0.22);
      return imbalance + (deptPenalty * weight);
    }

    unitBlocks.forEach(function (block) {
      var best = null;
      PHASES.forEach(function (p) {
        var score = phaseScore(p, block);
        if (!best || score < best.score - 1e-9 || (Math.abs(score - best.score) <= 1e-9 && PHASES.indexOf(p) < PHASES.indexOf(best.phase))) {
          best = { phase: p, score: score };
        }
      });
      if (!best) return;
      var phase = best.phase;
      phaseTotals[phase].W_max += block.W_max;
      phaseTotals[phase].VA_max += block.VA_max;
      phaseTotals[phase].A_max += block.A_max;
      deptPhaseVA[phase][block.department] += block.VA_max;
      assignments.push({
        block_id: block.id,
        item_ids: block.itemIds.slice(),
        item_name: block.itemName,
        phase: phase,
        department: block.department,
        W_max: round3(block.W_max),
        VA_max: round3(block.VA_max),
        A_max: round3(block.A_max),
        quantity: block.quantity
      });
    });

    PHASES.forEach(function (p) {
      phaseTotals[p].W_max = round3(phaseTotals[p].W_max);
      phaseTotals[p].VA_max = round3(phaseTotals[p].VA_max);
      phaseTotals[p].A_max = round3(phaseTotals[p].A_max);
      Object.keys(deptPhaseVA[p]).forEach(function (d) {
        deptPhaseVA[p][d] = round3(deptPhaseVA[p][d]);
      });
    });

    return {
      assignments: assignments,
      phase_totals: phaseTotals,
      department_phase_va: deptPhaseVA,
      department_totals_va: Object.keys(deptTotalsVA).reduce(function (acc, d) {
        acc[d] = round3(deptTotalsVA[d]);
        return acc;
      }, {})
    };
  }

  function computeSocapex(items, settings) {
    var cfg = mergeDefaults(settings);
    var headRating = n(cfg.socapex && cfg.socapex.head_rating_a, 16);
    var derate = n(cfg.continuous_derate, 0.8);
    var phaseFeedLimit = isFiniteNumber(cfg.socapex && cfg.socapex.phase_feed_limit_a) ? Number(cfg.socapex.phase_feed_limit_a) : null;
    var looms = {};
    var assignments = [];
    var warnings = [];
    var excludedIds = [];

    function ensureLoom(id) {
      if (!looms[id]) {
        looms[id] = {
          loom_id: id,
          heads: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          phase_a: { L1: 0, L2: 0, L3: 0 }
        };
      }
      return looms[id];
    }

    function bestHead(loom) {
      var candidates = [1, 2, 3, 4, 5, 6];
      candidates.sort(function (a, b) {
        var pa = SOCA_HEAD_PHASE[a];
        var pb = SOCA_HEAD_PHASE[b];
        var phaseDelta = loom.phase_a[pa] - loom.phase_a[pb];
        if (Math.abs(phaseDelta) > 1e-9) return phaseDelta;
        var headDelta = loom.heads[a] - loom.heads[b];
        if (Math.abs(headDelta) > 1e-9) return headDelta;
        return a - b;
      });
      return candidates[0];
    }

    (items || []).forEach(function (it) {
      if (!it) return;
      if (it.preferred_connection !== "socapex_head" && !it.socapex) return;
      excludedIds.push(it.id);
      var qty = Math.max(1, Math.round(n(it.quantity, 1)));
      var unitA = n(it.unit && it.unit.A_max, 0);
      var unitVA = n(it.unit && it.unit.VA_max, 0);
      var unitW = n(it.unit && it.unit.W_max, 0);
      var loomId = String((it.socapex && it.socapex.loom_id) || "SOCA-1");
      var loom = ensureLoom(loomId);
      for (var i = 0; i < qty; i += 1) {
        var head = isFiniteNumber(it.socapex && it.socapex.head)
          ? clamp(Math.round(Number(it.socapex.head)), 1, 6)
          : bestHead(loom);
        var phase = SOCA_HEAD_PHASE[head];
        loom.heads[head] += unitA;
        loom.phase_a[phase] += unitA;
        assignments.push({
          item_id: it.id,
          item_name: it.name,
          loom_id: loomId,
          head: head,
          phase: phase,
          A_max: round3(unitA),
          VA_max: round3(unitVA),
          W_max: round3(unitW),
          department: it.department
        });
      }
    });

    var phaseTotals = { L1: { W_max: 0, VA_max: 0, A_max: 0 }, L2: { W_max: 0, VA_max: 0, A_max: 0 }, L3: { W_max: 0, VA_max: 0, A_max: 0 } };
    var loomReports = Object.keys(looms).sort().map(function (loomId) {
      var loom = looms[loomId];
      var headRows = [1, 2, 3, 4, 5, 6].map(function (h) {
        var headA = round3(loom.heads[h] || 0);
        var status = headA > headRating ? "FAIL" : (headA > (headRating * derate) ? "WARN" : "PASS");
        if (status !== "PASS") warnings.push("Socapex " + loomId + " head " + h + " at " + headA.toFixed(2) + "A (" + status + ").");
        return { head: h, phase: SOCA_HEAD_PHASE[h], A_max: headA, status: status };
      });
      ["L1", "L2", "L3"].forEach(function (p) {
        var a = round3(loom.phase_a[p] || 0);
        if (phaseFeedLimit !== null && a > phaseFeedLimit) warnings.push("Socapex " + loomId + " " + p + " exceeds feed limit at " + a.toFixed(2) + "A.");
      });
      var phaseRows = ["L1", "L2", "L3"].map(function (p) {
        var a = round3(loom.phase_a[p] || 0);
        phaseTotals[p].A_max += a;
        return { phase: p, A_max: a, status: phaseFeedLimit === null ? "PASS" : (a > phaseFeedLimit ? "FAIL" : "PASS") };
      });
      return {
        loom_id: loomId,
        heads: headRows,
        phase_totals: phaseRows
      };
    });

    return {
      assignments: assignments,
      looms: loomReports,
      phase_totals: phaseTotals,
      warnings: warnings,
      excluded_item_ids: excludedIds
    };
  }

  function recommendCircuits(phaseTotals, settings) {
    var cfg = mergeDefaults(settings);
    var derate = n(cfg.continuous_derate, 0.8);
    var breakers = (cfg.outgoing_breakers || [15, 16, 32, 63]).map(Number).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
    var perPhase = {};
    PHASES.forEach(function (phase) {
      var aNeed = n(phaseTotals && phaseTotals[phase] && phaseTotals[phase].A_max, 0);
      var options = breakers.map(function (b) {
        var cont = b * derate;
        var circuits = cont > 0 ? Math.ceil(aNeed / cont) : 0;
        var planned = circuits > 0 ? (aNeed / circuits) : 0;
        return {
          breaker_a: b,
          continuous_limit_a: round3(cont),
          circuits_needed: circuits,
          planned_a_per_circuit: round3(planned),
          status: planned > b ? "FAIL" : (planned > cont ? "WARN" : "PASS")
        };
      });
      var best = options.slice().sort(function (a, b) {
        if (a.circuits_needed !== b.circuits_needed) return a.circuits_needed - b.circuits_needed;
        var capA = a.continuous_limit_a * Math.max(1, a.circuits_needed);
        var capB = b.continuous_limit_a * Math.max(1, b.circuits_needed);
        var spareA = capA - aNeed;
        var spareB = capB - aNeed;
        if (Math.abs(spareA - spareB) > 1e-9) return spareA - spareB;
        return b.breaker_a - a.breaker_a;
      })[0] || null;
      perPhase[phase] = {
        required_a: round3(aNeed),
        options: options,
        best_fit: best
      };
    });
    return { per_phase: perPhase };
  }

  function evaluateCompliance(inputs, settings) {
    var cfg = mergeDefaults(settings);
    var checks = [];
    var phaseTotals = inputs.phase_totals || { L1: { A_max: 0 }, L2: { A_max: 0 }, L3: { A_max: 0 } };
    var circuits = inputs.circuit_plan || { per_phase: {} };
    var deptPhase = inputs.department_phase_va || { L1: {}, L2: {}, L3: {} };
    var deptTotals = inputs.department_totals_va || {};

    var incomerA = n(cfg.incomer && cfg.incomer.per_phase_a, 250);
    var incomerWarn = incomerA * n(cfg.continuous_derate, 0.8);
    var phaseStatuses = PHASES.map(function (p) {
      var a = n(phaseTotals[p] && phaseTotals[p].A_max, 0);
      if (a > incomerA) return { phase: p, status: "FAIL", a: a };
      if (a > incomerWarn) return { phase: p, status: "WARN", a: a };
      return { phase: p, status: "PASS", a: a };
    });
    var incomerStatus = phaseStatuses.some(function (x) { return x.status === "FAIL"; })
      ? "FAIL"
      : (phaseStatuses.some(function (x) { return x.status === "WARN"; }) ? "WARN" : "PASS");
    checks.push({
      id: "incomer_250a",
      status: incomerStatus,
      detail: phaseStatuses.map(function (x) { return x.phase + " " + x.a.toFixed(1) + "A"; }).join(", ")
    });

    var circuitRows = [];
    PHASES.forEach(function (p) {
      var best = circuits.per_phase && circuits.per_phase[p] ? circuits.per_phase[p].best_fit : null;
      if (!best) return;
      var st = best.status || "PASS";
      circuitRows.push({ phase: p, status: st, detail: p + ": " + best.circuits_needed + "x" + best.breaker_a + "A @ " + best.planned_a_per_circuit.toFixed(1) + "A each" });
    });
    var circuitStatus = circuitRows.some(function (x) { return x.status === "FAIL"; })
      ? "FAIL"
      : (circuitRows.some(function (x) { return x.status === "WARN"; }) ? "WARN" : "PASS");
    checks.push({
      id: "outgoing_circuits",
      status: circuitStatus,
      detail: circuitRows.map(function (x) { return x.detail; }).join(" | ")
    });

    var amps = PHASES.map(function (p) { return n(phaseTotals[p] && phaseTotals[p].A_max, 0); });
    var avgA = (amps[0] + amps[1] + amps[2]) / 3;
    var imbalance = avgA > 0.001 ? ((Math.max.apply(null, amps) - Math.min.apply(null, amps)) / avgA) : 0;
    checks.push({
      id: "phase_imbalance",
      status: imbalance > n(cfg.imbalance_warn_ratio, 0.2) ? "WARN" : "PASS",
      detail: "Imbalance " + (imbalance * 100).toFixed(1) + "%"
    });

    var depWarns = [];
    Object.keys(deptTotals).forEach(function (dep) {
      var depTotal = n(deptTotals[dep], 0);
      if (depTotal <= 0.001) return;
      PHASES.forEach(function (p) {
        var share = n(deptPhase[p] && deptPhase[p][dep], 0) / depTotal;
        if (share > n(cfg.department_phase_warn_ratio, 0.5)) {
          depWarns.push(dep + " on " + p + " is " + (share * 100).toFixed(1) + "%");
        }
      });
    });
    checks.push({
      id: "department_balance",
      status: depWarns.length ? "WARN" : "PASS",
      detail: depWarns.length ? depWarns.join(" | ") : "Balanced by department threshold"
    });

    var overall = checks.some(function (c) { return c.status === "FAIL"; })
      ? "FAIL"
      : (checks.some(function (c) { return c.status === "WARN"; }) ? "WARN" : "PASS");
    return { overall: overall, checks: checks };
  }

  function recommendGenerator(items, totals, settings) {
    var cfg = mergeDefaults(settings);
    var runningKva = n(totals && totals.max && totals.max.VA, 0) / 1000;
    var maxItemKva = 0;
    var maxInrush = 1;
    var ledLikeKva = 0;
    (items || []).forEach(function (it) {
      var kva = n(it.totals && it.totals.VA_max, 0) / 1000;
      if (kva > maxItemKva) maxItemKva = kva;
      maxInrush = Math.max(maxInrush, n(it.inrush_multiplier, 1));
      if (it.department === "Lighting" || it.department === "Video") ledLikeKva += kva;
    });
    var ledHeavy = runningKva > 0.001 ? (ledLikeKva / runningKva) >= 0.6 : false;
    var headroom = (ledHeavy || maxInrush > 1) ? n(cfg.generator.led_or_inrush_headroom, 1.3) : n(cfg.generator.base_headroom, 1.25);
    var inrushKva = Math.max(runningKva, (maxItemKva * maxInrush) + Math.max(0, runningKva - maxItemKva));
    var withHeadroom = runningKva * headroom;
    var withInrush = inrushKva * n(cfg.generator.inrush_extra, 1.1);
    var rec = Math.max(withHeadroom, withInrush);
    var sizes = (cfg.generator.sizes_kva || GEN_SIZES_KVA).map(Number).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
    var rounded = sizes.find(function (x) { return x >= rec; }) || sizes[sizes.length - 1];
    var utilPct = rounded > 0 ? (runningKva / rounded) * 100 : 0;
    return {
      running_kva: round3(runningKva),
      inrush_kva: round3(inrushKva),
      headroom_factor: round3(headroom),
      recommended_kva_raw: round3(rec),
      recommended_kva_rounded: rounded,
      estimated_utilisation_pct: round3(utilPct),
      led_heavy: ledHeavy,
      has_inrush: maxInrush > 1
    };
  }

  function generateDiagnostics(ctx) {
    var messages = [];
    var phaseTotals = ctx.phase_totals || {};
    var compliance = ctx.compliance || { checks: [] };
    var assignments = ctx.assignments || [];
    var cfg = mergeDefaults(ctx.settings || {});
    var derate = n(cfg.continuous_derate, 0.8);
    var incomerA = n(cfg.incomer && cfg.incomer.per_phase_a, 250);
    var contA = incomerA * derate;
    PHASES.forEach(function (p) {
      var a = n(phaseTotals[p] && phaseTotals[p].A_max, 0);
      if (a > contA) {
        messages.push(p + " exceeds continuous incomer limit by " + (a - contA).toFixed(1) + "A.");
      }
      if (a > incomerA) {
        messages.push(p + " exceeds absolute incomer limit by " + (a - incomerA).toFixed(1) + "A.");
      }
    });

    var maxPhase = PHASES.slice().sort(function (a, b) { return n(phaseTotals[b] && phaseTotals[b].A_max, 0) - n(phaseTotals[a] && phaseTotals[a].A_max, 0); })[0];
    var minPhase = PHASES.slice().sort(function (a, b) { return n(phaseTotals[a] && phaseTotals[a].A_max, 0) - n(phaseTotals[b] && phaseTotals[b].A_max, 0); })[0];
    var mover = assignments
      .filter(function (a) { return a.phase === maxPhase && a.phase !== "L1/L2/L3"; })
      .sort(function (a, b) { return n(b.A_max, 0) - n(a.A_max, 0); })[0];
    if (mover && maxPhase && minPhase && maxPhase !== minPhase) {
      messages.push("Move " + mover.item_name + " (" + n(mover.A_max, 0).toFixed(1) + "A) from " + maxPhase + " to " + minPhase + " to improve balance.");
    }

    var failedChecks = (compliance.checks || []).filter(function (c) { return c.status === "FAIL"; });
    var warnChecks = (compliance.checks || []).filter(function (c) { return c.status === "WARN"; });
    failedChecks.forEach(function (c) { messages.push("FAIL: " + c.id + " - " + c.detail); });
    warnChecks.forEach(function (c) { messages.push("WARN: " + c.id + " - " + c.detail); });
    return messages;
  }

  function computePowerPlan(loadItems, settings) {
    var cfg = mergeDefaults(settings);
    var normalized = (loadItems || []).map(function (x) { return normalizeLoadItem(x, cfg); });
    var totals = computeTotals(normalized);
    var soca = computeSocapex(normalized, cfg);
    var balance = balanceThreePhase(normalized, cfg, {
      exclude_item_ids: soca.excluded_item_ids,
      base_phase_totals: soca.phase_totals
    });
    var circuitPlan = recommendCircuits(balance.phase_totals, cfg);
    var compliance = evaluateCompliance({
      phase_totals: balance.phase_totals,
      circuit_plan: circuitPlan,
      department_phase_va: balance.department_phase_va,
      department_totals_va: balance.department_totals_va
    }, cfg);
    var generator = recommendGenerator(normalized, totals, cfg);
    var diagnostics = generateDiagnostics({
      settings: cfg,
      phase_totals: balance.phase_totals,
      assignments: balance.assignments,
      compliance: compliance
    });
    return {
      settings: cfg,
      normalized_items: normalized,
      totals: totals,
      phase_totals: balance.phase_totals,
      phase_assignments: balance.assignments,
      department_phase_va: balance.department_phase_va,
      department_totals_va: balance.department_totals_va,
      socapex: soca,
      circuit_plan: circuitPlan,
      compliance: compliance,
      diagnostics: diagnostics,
      generator: generator
    };
  }

  return {
    POWER_DEFAULTS: POWER_DEFAULTS,
    normalizeLoadItem: normalizeLoadItem,
    computeTotals: computeTotals,
    balanceThreePhase: balanceThreePhase,
    computeSocapex: computeSocapex,
    evaluateCompliance: evaluateCompliance,
    recommendCircuits: recommendCircuits,
    recommendGenerator: recommendGenerator,
    generateDiagnostics: generateDiagnostics,
    computePowerPlan: computePowerPlan,
    _internals: {
      SOCA_HEAD_PHASE: SOCA_HEAD_PHASE
    }
  };
});
