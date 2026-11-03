import type { FamilyGraph } from './types';

export interface PathHighlight {
  personIds: Set<string>;
  connectionIds: Set<string>;
  sourceId: string;
  targetId: string;
}

const pairKey = (a: string, b: string) => JSON.stringify([a, b].sort());

export function pathHighlight(
  graph: FamilyGraph,
  path: string[],
): PathHighlight | null {
  if (path.length < 2) return null;
  const people = new Set(graph.people.map((person) => person.id));
  if (path.some((id) => !people.has(id))) return null;
  const edges = new Map(
    graph.connections.map((edge) => [pairKey(edge.from, edge.to), edge.id]),
  );
  const connectionIds = new Set<string>();
  for (let index = 1; index < path.length; index++) {
    const edgeId = edges.get(pairKey(path[index - 1], path[index]));
    if (!edgeId) return null;
    connectionIds.add(edgeId);
  }
  return {
    personIds: new Set(path),
    connectionIds,
    sourceId: path[0],
    targetId: path.at(-1)!,
  };
}
