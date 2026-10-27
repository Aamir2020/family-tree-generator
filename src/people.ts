import type { FamilyGraph } from './types';

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
export function siblingDetails(graph: FamilyGraph, personId: string) {
  const parents = new Map<string, string[]>();
  for (const edge of graph.connections) {
    const parent = ['mother', 'father'].includes(edge.type)
      ? edge.to
      : ['son', 'daughter'].includes(edge.type)
        ? edge.from
        : null;
    const child = ['mother', 'father'].includes(edge.type)
      ? edge.from
      : ['son', 'daughter'].includes(edge.type)
        ? edge.to
        : null;
    if (parent && child)
      parents.set(child, [...(parents.get(child) || []), parent]);
  }
  const ownParents = new Set(parents.get(personId) || []);
  if (!ownParents.size) return [];
  return graph.people
    .filter((person) => person.id !== personId)
    .flatMap((person) => {
      const shared = (parents.get(person.id) || []).filter((parent) =>
        ownParents.has(parent),
      ).length;
      if (!shared) return [];
      const relation =
        person.gender === 'male'
          ? 'brother'
          : person.gender === 'female'
            ? 'sister'
            : 'sibling';
      return [
        {
          person,
          relation: `${shared === 1 ? 'Half ' : ''}${relation}`,
          shared,
        },
      ];
    })
    .sort((a, b) => a.person.name.localeCompare(b.person.name));
}
