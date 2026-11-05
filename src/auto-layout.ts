import { createFamilyIndex } from './family-index';
import type { FamilyGraph, Person, Point } from './types';

const CARD_WIDTH = 220;
const CARD_HEIGHT = 132;
const PARTNER_GAP = 64;
const FAMILY_GAP = 100;
const ROW_HEIGHT = 260;
const COMPONENT_GAP = 180;
const MARGIN = 80;

interface Unit {
  id: string;
  people: Person[];
  parents: Set<string>;
  children: Set<string>;
  level: number;
  width: number;
  center: number;
}

interface FamilyLayout {
  units: Unit[];
  width: number;
  height: number;
  firstLevel: number;
}

interface Segment {
  from: number;
  to: number;
}

// Count reversed endpoint orders in O(n log n). Shared starts and shared ends
// are junctions, not crossings; sorting equal starts by end handles both.
function crossingCount(segments: Segment[]): number {
  const ends = [...segments]
    .sort((a, b) => a.from - b.from || a.to - b.to)
    .map((segment) => segment.to);
  const buffer = [...ends];
  function merge(start: number, end: number): number {
    if (end - start < 2) return 0;
    const middle = Math.floor((start + end) / 2);
    let count = merge(start, middle) + merge(middle, end);
    let left = start;
    let right = middle;
    for (let at = start; at < end; at++) {
      if (left < middle && (right >= end || ends[left] <= ends[right]))
        buffer[at] = ends[left++];
      else {
        buffer[at] = ends[right++];
        count += middle - left;
      }
    }
    for (let at = start; at < end; at++) ends[at] = buffer[at];
    return count;
  }
  return merge(0, ends.length);
}

// Layout changes only coordinates. Family relationships and manual editing stay
// independent of the temporary partner/co-parent groups used for positioning.
export function autoArrange(graph: FamilyGraph): FamilyGraph {
  if (!graph.people.length) return graph;
  const index = createFamilyIndex(graph);
  const comparePeople = (a: Person, b: Person) =>
    a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  const people = [...graph.people].sort(comparePeople);
  const roots = new Map(people.map((person) => [person.id, person.id]));
  const members = new Map(
    people.map((person) => [person.id, new Set([person.id])]),
  );

  function root(id: string): string {
    const chain: string[] = [];
    while (roots.get(id) !== id) {
      chain.push(id);
      id = roots.get(id)!;
    }
    for (const member of chain) roots.set(member, id);
    return id;
  }

  function reaches(from: string, to: string): boolean {
    const queue = [from];
    const seen = new Set([from]);
    for (let at = 0; at < queue.length; at++) {
      for (const member of members.get(queue[at])!) {
        for (const child of index.children.get(member) ?? []) {
          const next = root(child);
          if (next === to) return true;
          if (!seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
    }
    return false;
  }

  function align(a: string, b: string) {
    let first = root(a);
    let second = root(b);
    if (first === second) return;
    // Some valid graphs have partners in different ancestral generations. In
    // that case, prioritize keeping every parent above their children.
    if (reaches(first, second) || reaches(second, first)) return;
    if (first > second) [first, second] = [second, first];
    roots.set(second, first);
    for (const member of members.get(second)!) members.get(first)!.add(member);
    members.delete(second);
  }

  const pairKey = (a: string, b: string) => JSON.stringify([a, b].sort());
  const partners = new Map<string, [string, string]>();
  for (const [person, matches] of index.partners) {
    for (const partner of matches)
      partners.set(pairKey(person, partner), [person, partner]);
  }
  for (const [, [a, b]] of [...partners].sort(([a], [b]) => a.localeCompare(b)))
    align(a, b);
  const coParents = new Map<string, [string, string]>();
  for (const parents of index.parents.values()) {
    const ordered = [...parents].sort();
    for (const parent of ordered.slice(1))
      coParents.set(pairKey(ordered[0], parent), [ordered[0], parent]);
  }
  for (const [, [a, b]] of [...coParents].sort(([a], [b]) =>
    a.localeCompare(b),
  ))
    align(a, b);

  const units = new Map<string, Unit>();
  for (const [id, ids] of members) {
    const ordered = [...ids]
      .map((person) => index.people.get(person)!)
      .sort(comparePeople);
    // Place the member with ancestry/children near the middle of larger groups.
    const anchor = [...ordered].sort(
      (a, b) =>
        (index.parents.get(b.id)?.size ?? 0) -
          (index.parents.get(a.id)?.size ?? 0) ||
        (index.children.get(b.id)?.size ?? 0) -
          (index.children.get(a.id)?.size ?? 0) ||
        (index.partners.get(b.id)?.size ?? 0) -
          (index.partners.get(a.id)?.size ?? 0) ||
        comparePeople(a, b),
    )[0];
    const peers = ordered.filter((person) => person.id !== anchor.id);
    peers.splice(Math.floor((ordered.length - 1) / 2), 0, anchor);
    units.set(id, {
      id,
      people: peers,
      parents: new Set(),
      children: new Set(),
      level: 0,
      width: peers.length * CARD_WIDTH + (peers.length - 1) * PARTNER_GAP,
      center: 0,
    });
  }
  for (const [child, parents] of index.parents) {
    for (const parent of parents) {
      const parentUnit = units.get(root(parent))!;
      const childUnit = units.get(root(child))!;
      parentUnit.children.add(childUnit.id);
      childUnit.parents.add(parentUnit.id);
    }
  }
  const compareUnits = (a: Unit, b: Unit) =>
    comparePeople(a.people[0], b.people[0]);
  const personX = (id: string) => {
    const unit = units.get(root(id))!;
    return (
      unit.center -
      unit.width / 2 +
      unit.people.findIndex((person) => person.id === id) *
        (CARD_WIDTH + PARTNER_GAP) +
      CARD_WIDTH / 2
    );
  };
  // Match the renderer: partnered co-parents share a midpoint; other parent
  // connections attach to the individual card, rather than the group's center.
  const parentX = (parent: string, child: string) => {
    const partner = [...(index.parents.get(child) ?? [])]
      .sort()
      .find((id) => index.partners.get(parent)?.has(id));
    return partner ? (personX(parent) + personX(partner)) / 2 : personX(parent);
  };
  const sorted = [...units.values()].sort(compareUnits);
  const remaining = new Map(sorted.map((unit) => [unit.id, unit.parents.size]));
  const ready = sorted.filter((unit) => !unit.parents.size);
  for (let at = 0; at < ready.length; at++) {
    const parent = ready[at];
    for (const id of parent.children) {
      const child = units.get(id)!;
      child.level = Math.max(child.level, parent.level + 1);
      remaining.set(id, remaining.get(id)! - 1);
      if (!remaining.get(id)) ready.push(child);
    }
  }

  // Arrange each disconnected family separately so unrelated branches cannot
  // interleave. A shelf layout below also handles many isolated people.
  const seen = new Set<string>();
  const families: FamilyLayout[] = [];
  for (const start of sorted) {
    if (seen.has(start.id)) continue;
    const component = [start];
    seen.add(start.id);
    for (let at = 0; at < component.length; at++) {
      for (const person of component[at].people) {
        for (const neighbor of index.neighbors.get(person.id) ?? []) {
          const id = root(neighbor);
          if (!seen.has(id)) {
            seen.add(id);
            component.push(units.get(id)!);
          }
        }
      }
    }
    // Count generations relative to relatives, not just from the oldest known
    // ancestor. One branch may have more recorded history than the other.
    const generations = new Map<string, number>([[start.id, 0]]);
    const queue = [start];
    let consistent = true;
    for (let at = 0; at < queue.length; at++) {
      const unit = queue[at];
      for (const [neighbors, step] of [
        [unit.parents, -1],
        [unit.children, 1],
      ] as const) {
        for (const id of neighbors) {
          const level = generations.get(unit.id)! + step;
          if (!generations.has(id)) {
            generations.set(id, level);
            queue.push(units.get(id)!);
          } else if (generations.get(id) !== level) consistent = false;
        }
      }
    }
    // Cross-generation partnerships can make equal generation spacing
    // impossible. Keep the ancestry-safe topological levels in that case.
    if (consistent) {
      const first = Math.min(...generations.values());
      for (const unit of component)
        unit.level = generations.get(unit.id)! - first;
    }
    const rows = new Map<number, Unit[]>();
    for (const unit of component)
      rows.set(unit.level, [...(rows.get(unit.level) ?? []), unit]);
    const levels = [...rows.keys()].sort((a, b) => a - b);
    const rowWidth = (row: Unit[]) =>
      row.reduce((total, unit) => total + unit.width, 0) +
      (row.length - 1) * FAMILY_GAP;
    const width = Math.max(...[...rows.values()].map(rowWidth));
    function positionRows() {
      for (const row of rows.values()) {
        let x = (width - rowWidth(row)) / 2;
        for (const unit of row) {
          unit.center = x + unit.width / 2;
          x += unit.width + FAMILY_GAP;
        }
      }
    }
    for (const row of rows.values()) row.sort(compareUnits);
    positionRows();
    // Alternate parent and child barycenters to bring related branches together.
    // Ordering uses relationships and stable names/IDs, never old coordinates.
    for (let pass = 0; pass < 4; pass++) {
      const direction = pass % 2 === 0 ? 'parents' : 'children';
      const sequence = direction === 'parents' ? levels : [...levels].reverse();
      for (const level of sequence) {
        const row = rows.get(level)!;
        const score = (unit: Unit) => {
          const targets = unit.people.flatMap((person) =>
            [...(index[direction].get(person.id) ?? [])].map((neighbor) =>
              direction === 'parents'
                ? parentX(neighbor, person.id) -
                  (personX(person.id) - unit.center)
                : personX(neighbor) -
                  (parentX(person.id, neighbor) - unit.center),
            ),
          );
          return targets.length
            ? targets.reduce((sum, target) => sum + target, 0) / targets.length
            : unit.center;
        };
        const scores = new Map(row.map((unit) => [unit.id, score(unit)]));
        row.sort(
          (a, b) => scores.get(a.id)! - scores.get(b.id)! || compareUnits(a, b),
        );
        positionRows();
        if (direction === 'parents') {
          for (const unit of row) {
            // A spouse without recorded ancestry takes the outside position.
            // When both spouses have parents, their order follows those branches
            // instead of alphabetically swapping them and crossing the lines.
            const targets = new Map(
              unit.people.map((person) => {
                const parents = [...(index.parents.get(person.id) ?? [])];
                return [
                  person.id,
                  parents.length
                    ? parents.reduce(
                        (sum, parent) => sum + parentX(parent, person.id),
                        0,
                      ) / parents.length
                    : unit.center,
                ];
              }),
            );
            unit.people.sort((a, b) => targets.get(a.id)! - targets.get(b.id)!);
          }
        }
      }
    }
    const parentLinks = component.flatMap((unit) =>
      unit.people.flatMap((child) =>
        [...(index.parents.get(child.id) ?? [])].map((parent) => ({
          parent,
          child: child.id,
          first: units.get(root(parent))!.level,
          last: unit.level,
        })),
      ),
    );
    function cost() {
      const boundaries = new Map<number, Segment[]>();
      let length = 0;
      for (const link of parentLinks) {
        const from = parentX(link.parent, link.child);
        const to = personX(link.child);
        length += (to - from) ** 2;
        for (let level = link.first; level < link.last; level++) {
          const fraction = (level - link.first) / (link.last - link.first);
          const nextFraction =
            (level + 1 - link.first) / (link.last - link.first);
          const segment = {
            from: from + (to - from) * fraction,
            to: from + (to - from) * nextFraction,
          };
          const segments = boundaries.get(level) ?? [];
          segments.push(segment);
          boundaries.set(level, segments);
        }
      }
      return {
        crossings: [...boundaries.values()].reduce(
          (sum, segments) => sum + crossingCount(segments),
          0,
        ),
        length,
      };
    }
    // Barycenters provide a starting order, but cannot detect when an aunt or
    // uncle falls between another family's parents. Refine whole family blocks
    // and their members against actual endpoint crossings before shortening lines.
    let best = cost();
    function trySwap<T>(items: T[], at: number, reposition: boolean) {
      [items[at], items[at + 1]] = [items[at + 1], items[at]];
      if (reposition) positionRows();
      const candidate = cost();
      if (
        candidate.crossings < best.crossings ||
        (candidate.crossings === best.crossings &&
          candidate.length < best.length - 0.01)
      ) {
        best = candidate;
        return true;
      }
      [items[at], items[at + 1]] = [items[at + 1], items[at]];
      if (reposition) positionRows();
      return false;
    }
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      for (const level of pass % 2 ? [...levels].reverse() : levels) {
        const row = rows.get(level)!;
        for (let at = 0; at < row.length - 1; at++)
          changed = trySwap(row, at, true) || changed;
        for (const unit of row)
          for (let at = 0; at < unit.people.length - 1; at++)
            changed = trySwap(unit.people, at, false) || changed;
      }
      if (!changed) break;
    }
    const firstLevel = Math.min(...levels);
    families.push({
      units: component,
      width,
      height: (Math.max(...levels) - firstLevel) * ROW_HEIGHT + CARD_HEIGHT,
      firstLevel,
    });
  }

  const area = families.reduce(
    (sum, family) =>
      sum + (family.width + COMPONENT_GAP) * (family.height + COMPONENT_GAP),
    0,
  );
  const shelfWidth = Math.max(
    1200,
    Math.sqrt(area) * 1.4,
    ...families.map((family) => family.width),
  );
  const positions = new Map<string, Point>();
  let x = 0;
  let y = 0;
  let shelfHeight = 0;
  for (const family of families) {
    if (x > 0 && x + family.width > shelfWidth) {
      x = 0;
      y += shelfHeight + COMPONENT_GAP;
      shelfHeight = 0;
    }
    for (const unit of family.units) {
      const left = x + unit.center - unit.width / 2;
      unit.people.forEach((person, order) =>
        positions.set(person.id, {
          x: MARGIN + left + order * (CARD_WIDTH + PARTNER_GAP),
          y: MARGIN + y + (unit.level - family.firstLevel) * ROW_HEIGHT,
        }),
      );
    }
    x += family.width + COMPONENT_GAP;
    shelfHeight = Math.max(shelfHeight, family.height);
  }
  if (
    graph.people.every((person) => {
      const point = positions.get(person.id)!;
      return person.x === point.x && person.y === point.y;
    })
  )
    return graph;
  return {
    ...graph,
    people: graph.people.map((person) => ({
      ...person,
      ...positions.get(person.id)!,
    })),
  };
}
