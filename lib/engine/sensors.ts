// Joins usage pings to a merchant entity to estimate how stale the
// subscription is, weighted by how reliable that sensor type is as a
// proxy for real usage. Pure functions only.

import type { Entity, SensorType } from "./resolver";

export const SENSOR_RELIABILITY: Record<SensorType, number | null> = {
  receipt: 1.0,
  delivery: 1.0,
  otp: 0.7,
  login: 0.7,
  none: null,
};

export interface SensorReading {
  sensorType: SensorType;
  reliability: number | null;
  lastPingTimestamp: string | null;
  daysSinceLastPing: number | null;
}

function daysBetween(aIso: string, bIso: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return (new Date(bIso).getTime() - new Date(aIso).getTime()) / msPerDay;
}

export function computeSensorReading(entity: Entity, referenceTimestamp: string): SensorReading {
  const reliability = SENSOR_RELIABILITY[entity.sensorType];

  if (entity.sensorType === "none") {
    return { sensorType: "none", reliability: null, lastPingTimestamp: null, daysSinceLastPing: null };
  }

  if (entity.usagePings.length === 0) {
    return { sensorType: entity.sensorType, reliability, lastPingTimestamp: null, daysSinceLastPing: null };
  }

  const lastPing = [...entity.usagePings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

  return {
    sensorType: entity.sensorType,
    reliability,
    lastPingTimestamp: lastPing.timestamp,
    daysSinceLastPing: Math.round(daysBetween(lastPing.timestamp, referenceTimestamp)),
  };
}
