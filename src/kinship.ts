import { createFamilyIndex, siblingKind } from './family-index';
import type { FamilyIndex } from './family-index';
import type { FamilyGraph, Gender, ParentRole } from './types';

export interface KinshipResult {
  kind: 'family' | 'connected' | 'unconnected' | 'missing';
  label: string;
  path: string[];
  detail?: string;
}

interface BloodRelation {
  up: number;
  down: number;
  half: boolean;
  uncertain: boolean;
  path: string[];
}

const gendered = (
  gender: Gender,
  male: string,
  female: string,
  neutral: string,
) => (gender === 'male' ? male : gender === 'female' ? female : neutral);

function linealTerm(
  gender: Gender,
  generations: number,
  ancestor: boolean,
): string {
  const base = ancestor
    ? gendered(gender, 'father', 'mother', 'parent')
    : gendered(gender, 'son', 'daughter', 'child');
  if (generations === 1) return base;
  const grand = ancestor
    ? `grand${base}`
    : gendered(gender, 'grandson', 'granddaughter', 'grandchild');
  if (generations === 2) return grand;
  const great = generations - 2;
  return great <= 3
    ? `${'great-'.repeat(great)}${grand}`
    : `${great}× great-${grand}`;
}

function collateralTerm(
  gender: Gender,
  generations: number,
  older: boolean,
): string {
  const prefix = 'great-'.repeat(Math.max(0, generations - 2));
  return older
    ? gendered(
        gender,
        `${prefix}uncle`,
        `${prefix}aunt`,
        `${prefix}aunt or ${prefix}uncle`,
      )
    : gendered(
        gender,
        `${prefix}nephew`,
        `${prefix}niece`,
        `${prefix}niece or ${prefix}nephew`,
      );
}

function ordinal(number: number): string {
  const words = [
    'zeroth',
    'first',
    'second',
    'third',
    'fourth',
    'fifth',
    'sixth',
    'seventh',
    'eighth',
    'ninth',
    'tenth',
  ];
  if (words[number]) return words[number];
  const lastTwo = number % 100;
  const ending =
    lastTwo >= 11 && lastTwo <= 13
      ? 'th'
      : (['th', 'st', 'nd', 'rd'][number % 10] ?? 'th');
  return `${number}${ending}`;
}

function bloodTerm(
  relation: BloodRelation,
  gender: Gender,
  parentRole?: ParentRole,
): string {
  const { up, down, half } = relation;
  if (!up && !down) return 'self';
  if (!down)
    return up === 1 && parentRole ? parentRole : linealTerm(gender, up, true);
  if (!up) return linealTerm(gender, down, false);
  const prefix = half ? 'half ' : '';
  if (up === 1 && down === 1)
    return prefix + gendered(gender, 'brother', 'sister', 'sibling');
  if (down === 1) return prefix + collateralTerm(gender, up, true);
  if (up === 1) return prefix + collateralTerm(gender, down, false);
  const degree = Math.min(up, down) - 1;
  const removed = Math.abs(up - down);
  const suffix =
    removed === 0
      ? ''
      : removed === 1
        ? ' once removed'
        : removed === 2
          ? ' twice removed'
          : ` ${removed} times removed`;
  return `${prefix}${ordinal(degree)} cousin${suffix}`;
}

// Parent distances determine cousin degree and generation removal. Partner links
// never imply shared ancestry. See https://www.familysearch.org/en/blog/cousin-chart.
export function findRelationship(
  graph: FamilyGraph,
  from: string,
  to: string,
): KinshipResult {
  const index = createFamilyIndex(graph);
  if (!index.people.has(from) || !index.people.has(to))
    return { kind: 'missing', label: '', path: [] };
  const gender = index.genders.get(to) ?? 'unspecified';
  const result = (
    label: string,
    path: string[],
    detail?: string,
  ): KinshipResult => ({ kind: 'family', label, path, detail });
  if (from === to) return result('self', [from]);
  if (index.partners.get(from)?.has(to))
    return result(gendered(gender, 'husband', 'wife', 'partner'), [from, to]);

  const ancestorCache = new Map<string, Map<string, string[]>>();
  function ancestors(id: string): Map<string, string[]> {
    const cached = ancestorCache.get(id);
    if (cached) return cached;
    const paths = new Map<string, string[]>([[id, [id]]]);
    const queue = [id];
    for (let at = 0; at < queue.length; at++) {
      const current = queue[at];
      for (const parent of index.parents.get(current) ?? []) {
        if (paths.has(parent)) continue;
        paths.set(parent, [...paths.get(current)!, parent]);
        queue.push(parent);
      }
    }
    ancestorCache.set(id, paths);
    return paths;
  }

  function blood(first: string, second: string): BloodRelation | undefined {
    const firstPaths = ancestors(first);
    const candidates: BloodRelation[] = [];
    for (const [ancestor, secondPath] of ancestors(second)) {
      const firstPath = firstPaths.get(ancestor);
      if (!firstPath) continue;
      const up = firstPath.length - 1;
      const down = secondPath.length - 1;
      const branch =
        up && down
          ? siblingKind(index, firstPath.at(-2)!, secondPath.at(-2)!)
          : 'full';
      candidates.push({
        up,
        down,
        half: branch === 'half',
        uncertain: branch === 'unknown',
        path: [...firstPath, ...secondPath.slice(0, -1).reverse()],
      });
    }
    return candidates.sort(
      (a, b) =>
        a.up + a.down - b.up - b.down ||
        Math.max(a.up, a.down) - Math.max(b.up, b.down) ||
        Number(a.half) - Number(b.half),
    )[0];
  }

  const relative = blood(from, to);
  if (relative) {
    const detail = relative.uncertain
      ? relative.up === 1 && relative.down === 1
        ? 'Only one shared parent is recorded, so full or half sibling status is unknown.'
        : 'Some parents are missing, so a possible half relationship cannot be confirmed.'
      : undefined;
    return result(
      bloodTerm(relative, gender, index.parentRoles.get(from)?.get(to)),
      relative.path,
      detail,
    );
  }

  const sharedChild = [...(index.children.get(from) ?? [])].find((child) =>
    index.children.get(to)?.has(child),
  );
  if (sharedChild) return result('co-parent', [from, sharedChild, to]);

  const marriage: KinshipResult[] = [];
  const add = (label: string, path: string[]) => {
    // A family path must not loop back through the same person.
    if (new Set(path).size === path.length) marriage.push(result(label, path));
  };
  function marriedTerm(
    relation: BloodRelation,
    partnerOfRelative: boolean,
  ): string {
    if (!relation.up || !relation.down) {
      const ancestor = !relation.down;
      const term = linealTerm(
        gender,
        ancestor ? relation.up : relation.down,
        ancestor,
      );
      const step = partnerOfRelative ? ancestor : !ancestor;
      return step
        ? Math.max(relation.up, relation.down) === 1
          ? `step${term}`
          : `step-${term}`
        : `${term}-in-law`;
    }
    if (relation.up === 1 && relation.down === 1)
      return gendered(
        gender,
        'brother-in-law',
        'sister-in-law',
        'sibling-in-law',
      );
    return `${bloodTerm(relation, gender)} by marriage`;
  }

  for (const partner of index.partners.get(from) ?? []) {
    const related = blood(partner, to);
    if (related) add(marriedTerm(related, false), [from, ...related.path]);
    for (const otherPartner of index.partners.get(to) ?? []) {
      const relatedPartners = blood(partner, otherPartner);
      if (relatedPartners?.up === 1 && relatedPartners.down === 1) {
        add(
          gendered(gender, 'brother-in-law', 'sister-in-law', 'sibling-in-law'),
          [from, ...relatedPartners.path, to],
        );
      }
    }
  }
  for (const partner of index.partners.get(to) ?? []) {
    const related = blood(from, partner);
    if (related) add(marriedTerm(related, true), [...related.path, to]);
  }
  for (const parent of index.parents.get(from) ?? []) {
    for (const otherParent of index.parents.get(to) ?? []) {
      if (index.partners.get(parent)?.has(otherParent)) {
        add(gendered(gender, 'stepbrother', 'stepsister', 'stepsibling'), [
          from,
          parent,
          otherParent,
          to,
        ]);
      }
    }
  }
  const closestMarriage = marriage.sort(
    (a, b) => a.path.length - b.path.length,
  )[0];
  if (closestMarriage) return closestMarriage;

  const path = connectionPath(index, from, to);
  return path
    ? {
        kind: 'connected',
        label: 'family connection',
        path,
        detail:
          'These people are connected, but this path has no single common relationship name.',
      }
    : { kind: 'unconnected', label: '', path: [] };
}

function connectionPath(
  index: FamilyIndex,
  from: string,
  to: string,
): string[] | null {
  const previous = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  for (let at = 0; at < queue.length; at++) {
    const current = queue[at];
    if (current === to) {
      const path: string[] = [];
      for (
        let id: string | null = to;
        id !== null;
        id = previous.get(id) ?? null
      )
        path.push(id);
      return path.reverse();
    }
    for (const neighbor of index.neighbors.get(current) ?? []) {
      if (previous.has(neighbor)) continue;
      previous.set(neighbor, current);
      queue.push(neighbor);
    }
  }
  return null;
}
