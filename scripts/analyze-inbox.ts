import { analyzeInbox, type InboxEvent } from "../lib/engine/index.ts";
import inbox from "../data/inbox.json";

const result = analyzeInbox(inbox as InboxEvent[]);

console.log(`Reference date: ${result.referenceTimestamp}`);
console.log(`Promos ignored: ${result.promosIgnored}`);
console.log(`Unresolved merchants: ${result.unresolved.length}`);
console.log("");

for (const { entity, recurrence, sensor, score, action } of result.entities) {
  console.log(`${entity.name} [${entity.sensorType} / ${entity.rail}]`);
  console.log(`  cadence: ${recurrence.cadence} (median gap ${recurrence.medianGapDays ?? "n/a"}d)`);
  console.log(`  latest amount: Rs ${recurrence.latestAmount} | annualized: Rs ${recurrence.annualizedSpend}`);
  console.log(`  daysSinceLastPing: ${sensor.daysSinceLastPing ?? "never"}`);
  console.log(
    `  score: staleness=${score.components.staleness} priceDrift=${score.components.priceDrift} share=${score.components.shareOfRecurringSpend} total=${score.total}`
  );
  console.log(`  verdict: ${score.verdict}`);
  console.log(`  recoverable: Rs ${action.recoverableAmount}`);
  console.log("");
}

console.log(`TOTAL RECOVERABLE: Rs ${result.totalRecoverable}`);
