import type { Person, Point } from './types';

type Side = 'top' | 'bottom' | 'left' | 'right';
interface SearchState {
  x: number;
  y: number;
  direction: string;
}
interface QueueEntry extends SearchState {
  cost: number;
  score: number;
}

const WIDTH = 220;
const HEIGHT = 132;
const GAP = 16;
const key = (point: Point) => `${point.x},${point.y}`;
const distance = (a: Point, b: Point) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function simplify(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    if (result.length && distance(result.at(-1)!, point) === 0) continue;
    while (result.length > 1) {
      const a = result.at(-2)!;
      const b = result.at(-1)!;
      if ((a.x === b.x && b.x === point.x) || (a.y === b.y && b.y === point.y))
        result.pop();
      else break;
    }
    result.push(point);
  }
  return result;
}

export function pathFor(points: Point[]): string {
  return simplify(points)
    .map((point, index, route) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : route[index - 1].x === point.x
          ? `V ${point.y}`
          : `H ${point.x}`,
    )
    .join(' ');
}

export function midpoint(points: Point[]): Point | undefined {
  let remaining =
    points
      .slice(1)
      .reduce((sum, point, index) => sum + distance(points[index], point), 0) /
    2;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1];
    const b = points[index];
    const length = distance(a, b);
    if (length >= remaining && length)
      return {
        x: a.x + ((b.x - a.x) * remaining) / length,
        y: a.y + ((b.y - a.y) * remaining) / length,
      };
    remaining -= length;
  }
  return points[0];
}

// A binary heap keeps the search responsive while cards are dragged.
class Queue {
  entries: QueueEntry[] = [];
  push(entry: QueueEntry) {
    let index = this.entries.length;
    this.entries.push(entry);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.entries[parent].score <= entry.score) break;
      this.entries[index] = this.entries[parent];
      index = parent;
    }
    this.entries[index] = entry;
  }
  pop(): QueueEntry {
    const first = this.entries[0];
    const last = this.entries.pop()!;
    if (this.entries.length) {
      let index = 0;
      while (index * 2 + 1 < this.entries.length) {
        let child = index * 2 + 1;
        if (
          child + 1 < this.entries.length &&
          this.entries[child + 1].score < this.entries[child].score
        )
          child++;
        if (this.entries[child].score >= last.score) break;
        this.entries[index] = this.entries[child];
        index = child;
      }
      this.entries[index] = last;
    }
    return first;
  }
}

export function createRouter(people: Person[]) {
  const obstacles = people.map((person) => ({
    left: person.x - GAP,
    right: person.x + WIDTH + GAP,
    top: person.y - GAP,
    bottom: person.y + HEIGHT + GAP,
  }));
  const free = (point: Point) =>
    !obstacles.some(
      (rect) =>
        point.x > rect.left &&
        point.x < rect.right &&
        point.y > rect.top &&
        point.y < rect.bottom,
    );
  const clear = (a: Point, b: Point) =>
    !obstacles.some((rect) =>
      a.x === b.x
        ? a.x > rect.left &&
          a.x < rect.right &&
          Math.max(Math.min(a.y, b.y), rect.top) <
            Math.min(Math.max(a.y, b.y), rect.bottom)
        : a.y > rect.top &&
          a.y < rect.bottom &&
          Math.max(Math.min(a.x, b.x), rect.left) <
            Math.min(Math.max(a.x, b.x), rect.right),
    );

  function route(
    start: Point,
    end: Point,
    horizontalFirst = false,
  ): Point[] | null {
    if (!free(start) || !free(end)) return null;
    if ((start.x === end.x || start.y === end.y) && clear(start, end))
      return simplify([start, end]);
    const elbows = horizontalFirst
      ? [
          { x: end.x, y: start.y },
          { x: start.x, y: end.y },
        ]
      : [
          { x: start.x, y: end.y },
          { x: end.x, y: start.y },
        ];
    for (const elbow of elbows)
      if (free(elbow) && clear(start, elbow) && clear(elbow, end))
        return simplify([start, elbow, end]);

    // Search lazily on card boundaries. Every segment checks all cards, including
    // the two people being connected; only the final attachment stubs touch them.
    const xs = [
      ...new Set([
        start.x,
        end.x,
        ...obstacles.flatMap((rect) => [rect.left, rect.right]),
      ]),
    ].sort((a, b) => a - b);
    const ys = [
      ...new Set([
        start.y,
        end.y,
        ...obstacles.flatMap((rect) => [rect.top, rect.bottom]),
      ]),
    ].sort((a, b) => a - b);
    const initial = {
      x: xs.indexOf(start.x),
      y: ys.indexOf(start.y),
      direction: '',
    };
    const stateKey = (state: SearchState) =>
      `${state.x}:${state.y}:${state.direction}`;
    const queue = new Queue();
    const costs = new Map<string, number>();
    const previous = new Map<string, SearchState>();
    costs.set(stateKey(initial), 0);
    queue.push({ ...initial, cost: 0, score: distance(start, end) });
    while (queue.entries.length) {
      const state = queue.pop();
      const stateId = stateKey(state);
      const point = { x: xs[state.x], y: ys[state.y] };
      if (state.cost !== costs.get(stateId)) continue;
      if (key(point) === key(end)) {
        const points = [point];
        for (let at = stateId; previous.has(at);) {
          const ancestor = previous.get(at)!;
          points.push({ x: xs[ancestor.x], y: ys[ancestor.y] });
          at = stateKey(ancestor);
        }
        return simplify(points.reverse());
      }
      for (const [dx, dy, direction] of [
        [1, 0, 'h'],
        [-1, 0, 'h'],
        [0, 1, 'v'],
        [0, -1, 'v'],
      ] as const) {
        const next = { x: state.x + dx, y: state.y + dy, direction };
        if (
          next.x < 0 ||
          next.x >= xs.length ||
          next.y < 0 ||
          next.y >= ys.length
        )
          continue;
        const nextPoint = { x: xs[next.x], y: ys[next.y] };
        if (!free(nextPoint) || !clear(point, nextPoint)) continue;
        const cost =
          state.cost +
          distance(point, nextPoint) +
          (state.direction && state.direction !== direction ? 12 : 0);
        const nextKey = stateKey(next);
        if (cost >= (costs.get(nextKey) ?? Infinity)) continue;
        costs.set(nextKey, cost);
        previous.set(nextKey, state);
        queue.push({ ...next, cost, score: cost + distance(nextPoint, end) });
      }
    }
    return null;
  }

  function nearestFree(point: Point): Point | undefined {
    if (free(point)) return point;
    // Move virtual family junctions out of cards instead of routing from inside one.
    const candidates = obstacles.flatMap((rect) => [
      { x: point.x, y: rect.top },
      { x: point.x, y: rect.bottom },
      { x: rect.left, y: point.y },
      { x: rect.right, y: point.y },
    ]);
    return candidates
      .filter(free)
      .sort((a, b) => distance(a, point) - distance(b, point))[0];
  }

  function ports(person: Person, preferred: Side): [Point, Point][] {
    const x = person.x;
    const y = person.y;
    const choices: Record<Side, [Point, Point]> = {
      top: [
        { x: x + WIDTH / 2, y },
        { x: x + WIDTH / 2, y: y - GAP },
      ],
      bottom: [
        { x: x + WIDTH / 2, y: y + HEIGHT },
        { x: x + WIDTH / 2, y: y + HEIGHT + GAP },
      ],
      left: [
        { x, y: y + HEIGHT / 2 },
        { x: x - GAP, y: y + HEIGHT / 2 },
      ],
      right: [
        { x: x + WIDTH, y: y + HEIGHT / 2 },
        { x: x + WIDTH + GAP, y: y + HEIGHT / 2 },
      ],
    };
    return [
      preferred,
      ...(['top', 'bottom', 'left', 'right'] as Side[]).filter(
        (side) => side !== preferred,
      ),
    ]
      .map((side) => choices[side])
      .filter(([, gate]) => free(gate));
  }

  function between(a: Person, b: Person, partner: boolean): Point[] {
    const forward = partner ? b.x > a.x : b.y > a.y;
    const sourceSide = partner
      ? forward
        ? 'right'
        : 'left'
      : forward
        ? 'bottom'
        : 'top';
    const targetSide = partner
      ? forward
        ? 'left'
        : 'right'
      : forward
        ? 'top'
        : 'bottom';
    for (const [source, sourceGate] of ports(a, sourceSide))
      for (const [target, targetGate] of ports(b, targetSide)) {
        const points = route(sourceGate, targetGate, partner);
        if (points) return simplify([source, ...points, target]);
      }
    return [];
  }

  function toPerson(start: Point, person: Person): Point[] {
    const side = person.y + HEIGHT / 2 >= start.y ? 'top' : 'bottom';
    for (const [target, gate] of ports(person, side)) {
      const points = route(start, gate, true);
      if (points) return simplify([...points, target]);
    }
    return [];
  }
  return { route, nearestFree, between, toPerson };
}
