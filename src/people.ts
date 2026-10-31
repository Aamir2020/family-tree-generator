import { createFamilyIndex, siblingKind } from './family-index';
import type { FamilyGraph } from './types';

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
export function siblingDetails(graph: FamilyGraph, personId: string) {
  const index = createFamilyIndex(graph);
  return graph.people
    .filter((person) => person.id !== personId)
    .flatMap((person) => {
      const kind = siblingKind(index, personId, person.id);
      if (kind === 'none') return [];
      const gender = index.genders.get(person.id);
      const relation =
        gender === 'male'
          ? 'brother'
          : gender === 'female'
            ? 'sister'
            : 'sibling';
      return [
        { person, relation: `${kind === 'half' ? 'Half ' : ''}${relation}` },
      ];
    })
    .sort((a, b) => a.person.name.localeCompare(b.person.name));
}
