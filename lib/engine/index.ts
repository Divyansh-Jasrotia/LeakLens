// Full pipeline: inbox.json -> parser -> resolver -> recurrence -> sensors
// -> score -> actions. Pure functions only — UI consumes this output.

import { parseInbox, type InboxEvent } from "./parser";
import { resolveEntities, type Entity } from "./resolver";
import { computeRecurrence, type RecurrenceInfo } from "./recurrence";
import { computeSensorReading, type SensorReading } from "./sensors";
import { computeScore, type ScoreResult } from "./score";
import { computeAction, computeTotalRecovery, type EntityAction } from "./actions";

export * from "./parser";
export * from "./resolver";
export * from "./recurrence";
export * from "./sensors";
export * from "./score";
export * from "./actions";

export interface EntityAnalysis {
  entity: Entity;
  recurrence: RecurrenceInfo;
  sensor: SensorReading;
  score: ScoreResult;
  action: EntityAction;
}

export interface AnalysisResult {
  entities: EntityAnalysis[];
  unresolved: Entity[];
  promosIgnored: number;
  referenceTimestamp: string;
  totalRecoverable: number;
}

function latestTimestamp(events: InboxEvent[]): string {
  return events.reduce(
    (latest, event) => (new Date(event.ts).getTime() > new Date(latest).getTime() ? event.ts : latest),
    events[0]?.ts ?? new Date(0).toISOString()
  );
}

export function analyzeInbox(events: InboxEvent[]): AnalysisResult {
  const parsed = parseInbox(events);
  const promosIgnored = parsed.filter((e) => e.type === "promo").length;

  const { entities, unresolved } = resolveEntities(parsed);
  const referenceTimestamp = latestTimestamp(events);

  const recurrenceByEntity = new Map<string, RecurrenceInfo>();
  for (const entity of entities) {
    recurrenceByEntity.set(entity.id, computeRecurrence(entity.transactions));
  }

  const totalAnnualizedSpend = [...recurrenceByEntity.values()].reduce(
    (sum, r) => sum + r.annualizedSpend,
    0
  );

  const entityAnalyses: EntityAnalysis[] = entities.map((entity) => {
    const recurrence = recurrenceByEntity.get(entity.id)!;
    const sensor = computeSensorReading(entity, referenceTimestamp);
    const score = computeScore(recurrence, sensor, totalAnnualizedSpend);
    const action = computeAction(entity.rail, score.verdict, recurrence);
    return { entity, recurrence, sensor, score, action };
  });

  const totalRecoverable = computeTotalRecovery(entityAnalyses.map((a) => a.action));

  return { entities: entityAnalyses, unresolved, promosIgnored, referenceTimestamp, totalRecoverable };
}
