import { Operation, OperationArgsMap } from '../types/job.js';
import { Resource } from '../types/resources.js';

/**
 * Helper to check if a value is a spread marker
 */
export const isResourceSpreadMarker = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && '__spread__' in v;

/**
 * Extracts concrete Resource objects from operation args, filtering out
 * any SpreadMarker placeholders (which should be resolved by transformCollections).
 */
export const getResources = (op: Operation<'container/run'>): Resource[] => {
  const resources = (op.args as OperationArgsMap['container/run']).resources;

  if (!resources || !Array.isArray(resources)) return [];

  const out: Resource[] = [];
  for (const r of resources) {
    // Skip spread markers (should already be resolved at runtime)
    if (isResourceSpreadMarker(r)) continue;
    
    // Add concrete resource
    out.push(r as Resource);
  }

  return out;
};

