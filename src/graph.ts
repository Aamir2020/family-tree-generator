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
export const legacyDemo: FamilyGraph = {
  version: 1,
  title: 'The Bennett family',
  people: [
    {
      id: '1',
      name: 'Arthur Bennett',
      gender: 'male',
      born: '1946',
      notes: 'A gardener with a story for every season.',
      x: 430,
      y: 130,
    },
    {
      id: '2',
      name: 'Eleanor Bennett',
      gender: 'female',
      born: '1948',
      notes: 'The heart of every family gathering.',
      x: 730,
      y: 130,
    },
    {
      id: '3',
      name: 'James Bennett',
      gender: 'male',
      born: '1974',
      notes: 'Always planning the next family adventure.',
      x: 430,
      y: 355,
    },
    {
      id: '4',
      name: 'Sophie Bennett',
      gender: 'female',
      born: '1977',
      notes: 'Collector of recipes and little moments.',
      x: 730,
      y: 355,
    },
    {
      id: '5',
      name: 'Oliver Bennett',
      gender: 'male',
      born: '2004',
      notes: '',
      x: 300,
      y: 580,
    },
    {
      id: '6',
      name: 'Emma Bennett',
      gender: 'female',
      born: '2008',
      notes: '',
      x: 570,
      y: 580,
    },
  ],
  connections: [
    { id: 'a', from: '1', to: '2', type: 'wife' },
    { id: 'b', from: '3', to: '1', type: 'father' },
    { id: 'c', from: '3', to: '2', type: 'mother' },
    { id: 'd', from: '3', to: '4', type: 'wife' },
    { id: 'e', from: '3', to: '5', type: 'son' },
    { id: 'f', from: '3', to: '6', type: 'daughter' },
  ],
};

// Fictional example; birthday details intentionally left optional.
export const demo: FamilyGraph = {
  version: 1,
  title: 'The White family · Breaking Bad',
  people: [
    {
      id: 'walter',
      name: 'Walter White',
      gender: 'male',
      born: '',
      notes:
        'Chemistry teacher in Albuquerque. Husband of Skyler and father of Walter Jr. and Holly.',
      x: 320,
      y: 160,
    },
    {
      id: 'skyler',
      name: 'Skyler White',
      gender: 'female',
      born: '',
      notes: 'Wife of Walter and mother of Walter Jr. and Holly.',
      x: 680,
      y: 160,
    },
    {
      id: 'flynn',
      name: 'Walter White Jr.',
      gender: 'male',
      born: '',
      notes: 'Also known as Flynn. Son of Walter and Skyler.',
      x: 320,
      y: 470,
    },
    {
      id: 'holly',
      name: 'Holly White',
      gender: 'female',
      born: '',
      notes: 'Daughter of Walter and Skyler; younger sister of Walter Jr.',
      x: 680,
      y: 470,
    },
  ],
  connections: [
    { id: 'white-marriage', from: 'walter', to: 'skyler', type: 'wife' },
    { id: 'flynn-father', from: 'flynn', to: 'walter', type: 'father' },
    { id: 'flynn-mother', from: 'flynn', to: 'skyler', type: 'mother' },
    { id: 'holly-father', from: 'holly', to: 'walter', type: 'father' },
    { id: 'holly-mother', from: 'holly', to: 'skyler', type: 'mother' },
  ],
};

export function preloadTree(saved: FamilyGraph | null): FamilyGraph {
  if (!saved) return structuredClone(demo);
  const isBennettExample =
    saved.title === legacyDemo.title &&
    saved.people.length === legacyDemo.people.length &&
    saved.people.every((person) =>
      legacyDemo.people.some(
        (original) =>
          original.id === person.id && original.name === person.name,
      ),
    ) &&
    saved.connections.length === legacyDemo.connections.length &&
    saved.connections.every((edge) =>
      legacyDemo.connections.some(
        (original) =>
          original.from === edge.from &&
          original.to === edge.to &&
          original.type === edge.type,
      ),
    );
  return isBennettExample ? structuredClone(demo) : saved;
}
