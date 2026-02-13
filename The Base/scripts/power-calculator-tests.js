#!/usr/bin/env node
"use strict";

const assert = require("assert");
const power = require("../data/power-calculator.js");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log("PASS", name);
  } catch (err) {
    console.error("FAIL", name);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

test("watts->amps conversion with PF", () => {
  const row = power.normalizeLoadItem({
    id: "w1",
    name: "Load W",
    department: "Video",
    quantity: 2,
    watts_avg: 950,
    watts_max: 1140,
    pf: 0.95
  });
  assert.ok(Math.abs(row.unit.VA_avg - 1000) < 0.001);
  assert.ok(Math.abs(row.unit.A_avg - (1000 / 230)) < 0.001);
  assert.ok(Math.abs(row.totals.A_max - ((1140 / 0.95 / 230) * 2)) < 0.002);
});

test("amps->watts conversion with PF", () => {
  const row = power.normalizeLoadItem({
    id: "a1",
    name: "Load A",
    department: "Audio",
    quantity: 1,
    amps_avg: 10,
    amps_max: 12,
    pf: 0.9
  });
  assert.ok(Math.abs(row.unit.VA_avg - 2300) < 0.001);
  assert.ok(Math.abs(row.unit.W_avg - 2070) < 0.001);
  assert.ok(Math.abs(row.unit.W_max - (12 * 230 * 0.9)) < 0.001);
});

test("balancing deterministic outcome", () => {
  const loads = [
    { id: "l1", name: "A", department: "Lighting", quantity: 1, watts_max: 2300, pf: 1 },
    { id: "l2", name: "B", department: "Lighting", quantity: 1, watts_max: 2300, pf: 1 },
    { id: "l3", name: "C", department: "Audio", quantity: 1, watts_max: 2300, pf: 1 },
    { id: "l4", name: "D", department: "Video", quantity: 1, watts_max: 1150, pf: 1 }
  ].map((x) => power.normalizeLoadItem(x));
  const first = power.balanceThreePhase(loads, {});
  const second = power.balanceThreePhase(loads, {});
  assert.deepStrictEqual(first.assignments, second.assignments);
});

test("socapex mapping correctness", () => {
  const loads = [
    power.normalizeLoadItem({
      id: "s1",
      name: "Soca Fixed",
      department: "Lighting",
      quantity: 1,
      amps_max: 8,
      preferred_connection: "socapex_head",
      socapex: { loom_id: "SOCA-A", head: 4 }
    })
  ];
  const soca = power.computeSocapex(loads, {});
  assert.strictEqual(soca.assignments.length, 1);
  assert.strictEqual(soca.assignments[0].phase, "L1");
  assert.strictEqual(soca.assignments[0].head, 4);
});

test("PASS/WARN/FAIL thresholds", () => {
  const loads = [
    power.normalizeLoadItem({ id: "x1", name: "Heavy", department: "Other", quantity: 1, amps_max: 260 }),
    power.normalizeLoadItem({ id: "x2", name: "Mid", department: "Other", quantity: 1, amps_max: 10 }),
    power.normalizeLoadItem({ id: "x3", name: "Low", department: "Other", quantity: 1, amps_max: 10 })
  ];
  const bal = power.balanceThreePhase(loads, {});
  const circuits = power.recommendCircuits(bal.phase_totals, {});
  const compliance = power.evaluateCompliance({
    phase_totals: bal.phase_totals,
    circuit_plan: circuits,
    department_phase_va: bal.department_phase_va,
    department_totals_va: bal.department_totals_va
  }, {});
  const incomer = compliance.checks.find((x) => x.id === "incomer_250a");
  assert.ok(incomer);
  assert.strictEqual(incomer.status, "FAIL");
});

console.log("All tests passed:", passed);
