export type Workload = {
  monthlyUsers: number;
  dailyActivePct: number;
  requestsPerUser: number;
  peakMultiplier: number;
  readPct: number;
  responseKb: number;
  storageKb: number;
  retentionMonths: number;
  regions: number;
  availability: "standard" | "high" | "critical";
};

export type Estimate = {
  dailyActiveUsers: number;
  averageRps: number;
  peakRps: number;
  readRps: number;
  writeRps: number;
  egressGbMonth: number;
  storageGb: number;
  appInstances: number;
  databaseReplicas: number;
  cacheMemoryGb: number;
  monthlyCost: number;
  complexity: "Lean" | "Moderate" | "Advanced";
  warnings: string[];
};

export const defaults: Workload = {
  monthlyUsers: 250_000,
  dailyActivePct: 18,
  requestsPerUser: 42,
  peakMultiplier: 5,
  readPct: 82,
  responseKb: 18,
  storageKb: 6,
  retentionMonths: 18,
  regions: 2,
  availability: "high",
};

export function estimate(input: Workload): Estimate {
  const dailyActiveUsers = input.monthlyUsers * input.dailyActivePct / 100;
  const dailyRequests = dailyActiveUsers * input.requestsPerUser;
  const averageRps = dailyRequests / 86_400;
  const peakRps = averageRps * input.peakMultiplier;
  const readRps = peakRps * input.readPct / 100;
  const writeRps = peakRps - readRps;
  const egressGbMonth = dailyRequests * input.responseKb * 30 / 1_048_576;
  const storageGb = input.monthlyUsers * input.storageKb * input.retentionMonths / 1_048_576;
  const availabilityFactor = {standard: 1, high: 1.5, critical: 2.4}[input.availability];
  const appInstances = Math.max(input.regions, Math.ceil(peakRps / 180) * input.regions);
  const databaseReplicas = input.availability === "standard" ? 1 : input.availability === "high" ? 2 : Math.max(3, input.regions + 1);
  const cacheMemoryGb = Math.max(1, Math.ceil(readRps * .012));
  const monthlyCost = Math.round(
    appInstances * 38 + databaseReplicas * (85 + storageGb * .12) +
    cacheMemoryGb * 19 + egressGbMonth * .075 + input.regions * 24
  );
  const score = peakRps / 200 + storageGb / 500 + input.regions + availabilityFactor;
  const warnings = [];
  if (input.readPct >= 75 && readRps > 100) warnings.push("A read-through cache can remove repeated database work.");
  if (writeRps > 250) warnings.push("Partition write-heavy tables before a single primary becomes the ceiling.");
  if (input.regions > 1 && input.availability === "critical") warnings.push("Define consistency boundaries before enabling multi-region writes.");
  if (input.responseKb > 64) warnings.push("Response payload size dominates egress; measure compression and pagination.");
  if (input.peakMultiplier >= 8) warnings.push("Sharp traffic bursts need queue-based load shedding and admission control.");
  return {
    dailyActiveUsers, averageRps, peakRps, readRps, writeRps, egressGbMonth,
    storageGb, appInstances, databaseReplicas, cacheMemoryGb, monthlyCost,
    complexity: score > 14 ? "Advanced" : score > 6 ? "Moderate" : "Lean", warnings,
  };
}

export function compact(value: number) {
  return Intl.NumberFormat("en", {notation: "compact", maximumFractionDigits: 1}).format(value);
}

export function money(value: number) {
  return new Intl.NumberFormat("en", {style: "currency", currency: "USD", maximumFractionDigits: 0}).format(value);
}
