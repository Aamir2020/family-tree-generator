import type { FamilyGraph, Gender, ParentRole, Person } from './types';

export interface FamilyIndex {
  people: Map<string, Person>;
  parents: Map<string, Set<string>>;
  children: Map<string, Set<string>>;
  partners: Map<string, Set<string>>;
  neighbors: Map<string, Set<string>>;
  parentRoles: Map<string, Map<string, ParentRole>>;
  genders: Map<string, Gender>;
}

function connect(map: Map<string, Set<string>>, from: string, to: string) {
  const links = map.get(from) ?? new Set<string>();
  links.add(to);
  map.set(from, links);
}

export function createFamilyIndex(graph: FamilyGraph): FamilyIndex {
  const index: FamilyIndex = {
    people: new Map(graph.people.map((person) => [person.id, person])),
    parents: new Map(),
    children: new Map(),
    partners: new Map(),
    neighbors: new Map(),
    parentRoles: new Map(),
    genders: new Map(),
  };
  const hints = new Map<string, Set<Gender>>();
  for (const edge of graph.connections) {
    connect(index.neighbors, edge.from, edge.to);
    connect(index.neighbors, edge.to, edge.from);
    const hint: Gender = ['mother', 'daughter', 'wife'].includes(edge.type)
      ? 'female'
      : 'male';
    const genders = hints.get(edge.to) ?? new Set<Gender>();
    genders.add(hint);
    hints.set(edge.to, genders);
    if (edge.type === 'wife' || edge.type === 'husband') {
      connect(index.partners, edge.from, edge.to);
      connect(index.partners, edge.to, edge.from);
      continue;
    }
    const explicitParent = edge.type === 'mother' || edge.type === 'father';
    const parent = explicitParent ? edge.to : edge.from;
    const child = explicitParent ? edge.from : edge.to;
    connect(index.parents, child, parent);
    connect(index.children, parent, child);
    if (edge.type === 'mother' || edge.type === 'father') {
      const roles =
        index.parentRoles.get(child) ?? new Map<string, ParentRole>();
      roles.set(parent, edge.type);
      index.parentRoles.set(child, roles);
    }
  }
  for (const person of graph.people) {
    const candidates = hints.get(person.id);
    const inferred =
      candidates?.size === 1 ? [...candidates][0] : 'unspecified';
    index.genders.set(
      person.id,
      person.gender === 'unspecified' ? inferred : person.gender,
    );
  }
  return index;
}

export function siblingKind(
  index: FamilyIndex,
  first: string,
  second: string,
): 'full' | 'half' | 'unknown' | 'none' {
  const a = index.parents.get(first) ?? new Set<string>();
  const b = index.parents.get(second) ?? new Set<string>();
  const shared = [...a].filter((parent) => b.has(parent)).length;
  if (shared >= 2) return 'full';
  if (!shared) return 'none';
  return a.size >= 2 && b.size >= 2 ? 'half' : 'unknown';
}
