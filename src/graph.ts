import { bennettExample, royalExample, whiteExample } from './sample-families';
export {
  bennettExample as legacyDemo,
  royalExample as demo,
} from './sample-families';
import type { FamilyGraph, Person, Point, Relationship } from './types';
export const TYPES: Relationship[] = [
  'mother',
  'father',
  'son',
  'daughter',
  'wife',
  'husband',
];
export const uid = () => crypto.randomUUID();
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPerson(value: unknown): value is Person {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Boolean(value.name.trim()) &&
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y) &&
    (value.gender === 'female' ||
      value.gender === 'male' ||
      value.gender === 'unspecified') &&
    typeof value.born === 'string' &&
    typeof value.notes === 'string'
  );
}

export function validateGraph(input: unknown): FamilyGraph {
  if (
    !isRecord(input) ||
    input.version !== 1 ||
    typeof input.title !== 'string' ||
    !Array.isArray(input.people) ||
    !Array.isArray(input.connections)
  ) {
    throw new Error('Choose a valid Zermanzer JSON file (version 1).');
  }
  if (input.people.length > 1000 || input.connections.length > 5000) {
    throw new Error(
      'This file is too large (maximum 1,000 people and 5,000 connections).',
    );
  }
  const people: Person[] = input.people.map((value: unknown) => {
    const person = isRecord(value)
      ? { ...value, born: value.born === undefined ? '' : value.born }
      : value;
    if (!isPerson(person))
      throw new Error('The file contains an invalid or duplicate person.');
    return person;
  });
  const connections = input.connections.map((value: unknown) => {
    if (
      !isRecord(value) ||
      typeof value.id !== 'string' ||
      typeof value.from !== 'string' ||
      typeof value.to !== 'string' ||
      typeof value.type !== 'string' ||
      !TYPES.includes(value.type as Relationship)
    ) {
      throw new Error('The file contains an invalid connection.');
    }
    return {
      id: value.id,
      from: value.from,
      to: value.to,
      type: value.type as Relationship,
    };
  });
  const graph: FamilyGraph = {
    version: 1,
    title: input.title,
    people,
    connections,
  };
  const ids = new Set<string>();
  for (const person of graph.people) {
    if (ids.has(person.id))
      throw new Error('The file contains an invalid or duplicate person.');
    ids.add(person.id);
  }
  const edgeIds = new Set<string>();
  const parentSlots = new Set<string>();
  const pairs = new Set<string>();
  const ancestry = new Map<string, string[]>();
  for (const e of graph.connections) {
    if (
      !e ||
      typeof e.id !== 'string' ||
      edgeIds.has(e.id) ||
      !ids.has(e.from) ||
      !ids.has(e.to) ||
      e.from === e.to ||
      !TYPES.includes(e.type)
    )
      throw new Error('The file contains an invalid connection.');
    edgeIds.add(e.id);
    const pair = [e.from, e.to].sort().join(':');
    if (pairs.has(pair))
      throw new Error('These people already have a connection.');
    pairs.add(pair);
    const parent = ['mother', 'father'].includes(e.type)
      ? e.to
      : ['son', 'daughter'].includes(e.type)
        ? e.from
        : null;
    const child = parent === e.to ? e.from : e.to;
    // Child relationships also occupy the corresponding parent slot.
    const role = ['mother', 'father'].includes(e.type)
      ? e.type
      : graph.people.find((p) => p.id === parent)?.gender === 'female'
        ? 'mother'
        : graph.people.find((p) => p.id === parent)?.gender === 'male'
          ? 'father'
          : null;
    if (parent) {
      if (role) {
        const slot = `${child}:${role}`;
        if (parentSlots.has(slot))
          throw new Error(`A person can only have one ${role}.`);
        parentSlots.add(slot);
      }
      ancestry.set(parent, [...(ancestry.get(parent) || []), child]);
    }
  }
  const visiting = new Set<string>();
  const done = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id))
      throw new Error('A parent connection would create an ancestry cycle.');
    if (done.has(id)) return;
    visiting.add(id);
    for (const child of ancestry.get(id) || []) visit(child);
    visiting.delete(id);
    done.add(id);
  }
  for (const id of ids) visit(id);
  const needsNormalization = input.people.some(
    (value: unknown) => isRecord(value) && value.born === undefined,
  );
  // The input has passed all shape and relationship checks. Preserve identity
  // for in-memory edits; only legacy imports with missing birthdays need a copy.
  return needsNormalization ? graph : (input as unknown as FamilyGraph);
}
export function addConnection(
  graph: FamilyGraph,
  from: string,
  to: string,
  type: Relationship,
): FamilyGraph {
  return validateGraph({
    ...graph,
    connections: [...graph.connections, { id: uid(), from, to, type }],
  });
}
export function removePerson(graph: FamilyGraph, id: string): FamilyGraph {
  return {
    ...graph,
    people: graph.people.filter((p) => p.id !== id),
    connections: graph.connections.filter((e) => e.from !== id && e.to !== id),
  };
}
export function relativePosition(
  graph: FamilyGraph,
  person: Person,
  type: Relationship,
): Point {
  const partner = ['wife', 'husband'].includes(type);
  if (partner) {
    // Keep partners beside the source. If the preferred side is occupied,
    // check the opposite side before moving farther away.
    for (let distance = 250; distance <= 5000; distance += 50) {
      for (const side of [1, -1]) {
        const x = person.x + side * distance;
        const y = person.y;
        const occupied = graph.people.some(
          (p) => Math.abs(p.x - x) < 230 && Math.abs(p.y - y) < 150,
        );
        if (!occupied) return { x, y };
      }
    }
  }
  const direction = ['mother', 'father'].includes(type)
    ? -1
    : ['son', 'daughter'].includes(type)
      ? 1
      : 0;
  let x =
    person.x +
    (direction
      ? type === 'mother'
        ? -130
        : type === 'father'
          ? 130
          : 0
      : 270);
  const y = person.y + direction * 210;
  while (
    graph.people.some((p) => Math.abs(p.x - x) < 230 && Math.abs(p.y - y) < 150)
  )
    x += 250;
  return { x, y };
}
function matchesExample(
  saved: FamilyGraph,
  example: FamilyGraph,
  compareDetails: boolean,
): boolean {
  return (
    saved.title === example.title &&
    saved.people.length === example.people.length &&
    saved.people.every((person) =>
      example.people.some(
        (original) =>
          original.id === person.id &&
          original.name === person.name &&
          (!compareDetails ||
            (original.gender === person.gender &&
              original.born === person.born &&
              original.notes === person.notes)),
      ),
    ) &&
    saved.connections.length === example.connections.length &&
    saved.connections.every((edge) =>
      example.connections.some(
        (original) =>
          original.from === edge.from &&
          original.to === edge.to &&
          original.type === edge.type,
      ),
    )
  );
}

export function preloadTree(saved: FamilyGraph | null): FamilyGraph {
  if (!saved) return structuredClone(royalExample);
  // Keep the existing Bennett migration, but preserve edited White-family details.
  // Card positions and array order do not turn an otherwise unchanged sample into a custom tree.
  const oldExample =
    matchesExample(saved, bennettExample, false) ||
    matchesExample(saved, whiteExample, true);
  return oldExample ? structuredClone(royalExample) : saved;
}
