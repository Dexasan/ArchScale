import test from "node:test";
import assert from "node:assert/strict";
import {defaults, estimate} from "./model.ts";

test("derives peak throughput from active users and traffic shape", () => {
  const result = estimate({...defaults, monthlyUsers: 100_000, dailyActivePct: 10, requestsPerUser: 86.4, peakMultiplier: 4});
  assert.equal(result.dailyActiveUsers, 10_000);
  assert.equal(result.averageRps, 10);
  assert.equal(result.peakRps, 40);
});

test("read and write throughput reconcile to peak throughput", () => {
  const result = estimate(defaults);
  assert.ok(Math.abs(result.readRps + result.writeRps - result.peakRps) < .001);
});

test("critical availability provisions additional database replicas", () => {
  const standard = estimate({...defaults, availability: "standard"});
  const critical = estimate({...defaults, availability: "critical"});
  assert.ok(critical.databaseReplicas > standard.databaseReplicas);
  assert.ok(critical.monthlyCost > standard.monthlyCost);
});

test("high read pressure produces a cache recommendation", () => {
  const result = estimate({...defaults, monthlyUsers: 10_000_000, readPct: 95});
  assert.ok(result.warnings.some(warning => warning.includes("cache")));
});
