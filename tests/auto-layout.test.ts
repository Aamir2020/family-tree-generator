import test from 'node:test';
import assert from 'node:assert/strict';
import { autoArrange } from '../src/auto-layout';
import { validateGraph } from '../src/graph';
import type { FamilyGraph, Person, Gender } from '../src/types';

const person = (id: string, gender: Gender = 'unspecified'): Person => ({
  id,
  name: id,
  gender,
  born: '',
  notes: '',
  x: 0,
  y: 0,
});
function family(): FamilyGraph {
  return {
    version: 1,
    title: 'Synthetic family',
    people: [
      person('grandpa', 'male'),
      person('grandma', 'female'),
      person('father', 'male'),
      person('mother', 'female'),
      person('son', 'male'),
      person('daughter', 'female'),
      person('partner', 'female'),
      person('grandchild', 'female'),
    ],
    connections: [
      { id: 'grandparents', from: 'grandpa', to: 'grandma', type: 'wife' },
      { id: 'father-dad', from: 'father', to: 'grandpa', type: 'father' },
      { id: 'father-mom', from: 'father', to: 'grandma', type: 'mother' },
      { id: 'parents', from: 'father', to: 'mother', type: 'wife' },
      { id: 'son-dad', from: 'son', to: 'father', type: 'father' },
      { id: 'son-mom', from: 'son', to: 'mother', type: 'mother' },
      { id: 'daughter-dad', from: 'daughter', to: 'father', type: 'father' },
      { id: 'daughter-mom', from: 'daughter', to: 'mother', type: 'mother' },
      { id: 'son-partner', from: 'son', to: 'partner', type: 'wife' },
      { id: 'grandchild-dad', from: 'grandchild', to: 'son', type: 'father' },
      {
        id: 'grandchild-mom',
        from: 'grandchild',
        to: 'partner',
        type: 'mother',
      },
    ],
  };
}

function assertLayout(graph: FamilyGraph, alignPartners = true) {
  const people = new Map(graph.people.map((person) => [person.id, person]));
  for (const person of graph.people) {
    assert.ok(Number.isFinite(person.x) && Number.isFinite(person.y));
    assert.ok(person.x >= 0 && person.y >= 0);
  }
  for (const edge of graph.connections) {
    const a = people.get(edge.from)!;
    const b = people.get(edge.to)!;
    if (edge.type === 'mother' || edge.type === 'father')
      assert.ok(b.y + 132 < a.y, `${b.id} must be above ${a.id}`);
    else if (edge.type === 'son' || edge.type === 'daughter')
      assert.ok(a.y + 132 < b.y, `${a.id} must be above ${b.id}`);
    else if (alignPartners)
      assert.equal(a.y, b.y, 'partners share a generation');
  }
  for (let i = 0; i < graph.people.length; i++)
    for (let j = i + 1; j < graph.people.length; j++) {
      const a = graph.people[i];
      const b = graph.people[j];
      assert.ok(
        Math.abs(a.x - b.x) >= 240 || Math.abs(a.y - b.y) >= 152,
        `${a.id} and ${b.id} need room between cards`,
      );
    }
}
const positions = (graph: FamilyGraph) =>
  Object.fromEntries(
    graph.people.map((person) => [person.id, { x: person.x, y: person.y }]),
  );

test('arranges parents, partners, siblings, and descendants without overlap', () => {
  const graph = family();
  validateGraph(graph);
  const result = autoArrange(graph);
  assertLayout(result);
  const people = new Map(result.people.map((person) => [person.id, person]));
  assert.equal(people.get('son')!.y, people.get('daughter')!.y);
  assert.equal(people.get('grandpa')!.y, people.get('grandma')!.y);
});

test('changes only coordinates and preserves the graph for Undo', () => {
  const graph = family();
  graph.people[0].notes = 'Keep this note';
  graph.people[0].born = '1950';
  const before = structuredClone(graph);
  const result = autoArrange(graph);
  assert.deepEqual(graph, before);
  assert.notEqual(result, graph);
  assert.equal(result.connections, graph.connections);
  assert.equal(result.title, graph.title);
  assert.deepEqual(
    result.people.map(({ x: _x, y: _y, ...person }) => person),
    graph.people.map(({ x: _x, y: _y, ...person }) => person),
  );
  assert.equal(validateGraph(result), result);
});

test('repeated arrangement is stable and does not require another Undo entry', () => {
  const arranged = autoArrange(family());
  assert.equal(autoArrange(arranged), arranged);
});

test('layout does not depend on imported array order or previous dragged positions', () => {
  const graph = family();
  const expected = positions(autoArrange(graph));
  graph.people.reverse();
  graph.connections.reverse();
  graph.people.forEach((person, i) => {
    person.x = 900 - i * 83;
    person.y = -400 + i * 17;
  });
  assert.deepEqual(positions(autoArrange(graph)), expected);
});

test('normalizes parent and child connection directions', () => {
  const graph = family();
  const expected = positions(autoArrange(graph));
  graph.connections = graph.connections.map((edge) =>
    edge.type === 'father' || edge.type === 'mother'
      ? {
          ...edge,
          from: edge.to,
          to: edge.from,
          type:
            graph.people.find((person) => person.id === edge.from)!.gender ===
            'female'
              ? 'daughter'
              : 'son',
        }
      : edge,
  );
  const result = autoArrange(graph);
  assert.deepEqual(positions(result), expected);
  assertLayout(result);
});

test('aligns co-parents without inventing a partner connection', () => {
  const graph = family();
  graph.connections = graph.connections.filter((edge) => edge.id !== 'parents');
  const result = autoArrange(graph);
  assertLayout(result);
  assert.equal(
    result.people.find((person) => person.id === 'father')!.y,
    result.people.find((person) => person.id === 'mother')!.y,
  );
  assert.equal(result.connections, graph.connections);
});

test('multiple partners and half siblings are spaced out on their generations', () => {
  const graph = family();
  graph.people.push(
    person('second-partner', 'female'),
    person('half-sibling', 'male'),
  );
  graph.connections.push(
    { id: 'second-couple', from: 'father', to: 'second-partner', type: 'wife' },
    { id: 'half-dad', from: 'half-sibling', to: 'father', type: 'father' },
    {
      id: 'half-mom',
      from: 'half-sibling',
      to: 'second-partner',
      type: 'mother',
    },
  );
  const result = autoArrange(graph);
  assertLayout(result);
  assert.equal(
    result.people.find((person) => person.id === 'son')!.y,
    result.people.find((person) => person.id === 'half-sibling')!.y,
  );
});

test('disconnected families occupy separate bounding boxes', () => {
  const graph = family();
  const second = family();
  graph.people.push(
    ...second.people.map((person) => ({
      ...person,
      id: 'other-' + person.id,
      name: 'Other ' + person.name,
    })),
  );
  graph.connections.push(
    ...second.connections.map((edge) => ({
      ...edge,
      id: 'other-' + edge.id,
      from: 'other-' + edge.from,
      to: 'other-' + edge.to,
    })),
  );
  graph.people.push(person('isolated'));
  const result = autoArrange(graph);
  assertLayout(result);
  const bounds = (group: Person[]) => ({
    left: Math.min(...group.map((p) => p.x)),
    right: Math.max(...group.map((p) => p.x)) + 220,
    top: Math.min(...group.map((p) => p.y)),
    bottom: Math.max(...group.map((p) => p.y)) + 132,
  });
  const firstBounds = bounds(
    result.people.filter(
      (p) => !p.id.startsWith('other-') && p.id !== 'isolated',
    ),
  );
  const secondBounds = bounds(
    result.people.filter((p) => p.id.startsWith('other-')),
  );
  assert.ok(
    firstBounds.right < secondBounds.left ||
      secondBounds.right < firstBounds.left ||
      firstBounds.bottom < secondBounds.top ||
      secondBounds.bottom < firstBounds.top,
  );
});

test('packs many unconnected people into rows rather than one endless line', () => {
  const graph: FamilyGraph = {
    version: 1,
    title: 'Unconnected',
    people: Array.from({ length: 30 }, (_, i) => person(`Person ${i}`)),
    connections: [],
  };
  const result = autoArrange(graph);
  assertLayout(result);
  assert.ok(new Set(result.people.map((person) => person.y)).size > 1);
});

test('conflicting partner generations cannot reverse an ancestor relationship', () => {
  const graph: FamilyGraph = {
    version: 1,
    title: 'Conflicting generations',
    people: [
      person('a', 'male'),
      person('b', 'female'),
      person('c', 'female'),
      person('d', 'male'),
    ],
    connections: [
      { id: 'a-b', from: 'b', to: 'a', type: 'father' },
      { id: 'c-d', from: 'd', to: 'c', type: 'mother' },
      { id: 'a-d', from: 'a', to: 'd', type: 'husband' },
      { id: 'c-b', from: 'c', to: 'b', type: 'wife' },
    ],
  };
  validateGraph(graph);
  const arranged = autoArrange(graph);
  assertLayout(arranged, false);
  assert.equal(autoArrange(arranged), arranged);
});

test('empty and single-person trees are supported', () => {
  const empty: FamilyGraph = {
    version: 1,
    title: 'Empty',
    people: [],
    connections: [],
  };
  assert.equal(autoArrange(empty), empty);
  const single = { ...empty, people: [person('one')] };
  assertLayout(autoArrange(single));
});

test('a large branching tree finishes with finite non-overlapping positions', () => {
  const graph: FamilyGraph = {
    version: 1,
    title: 'Large tree',
    people: [],
    connections: [],
  };
  for (let i = 0; i < 1000; i++) {
    graph.people.push(
      person(String(i).padStart(4, '0'), i % 2 ? 'female' : 'male'),
    );
    if (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      graph.connections.push({
        id: `link-${i}`,
        from: String(i).padStart(4, '0'),
        to: String(parent).padStart(4, '0'),
        type: parent % 2 ? 'mother' : 'father',
      });
    }
  }
  assertLayout(autoArrange(graph));
});

test('keeps spouses aligned with their own ancestry instead of crossing branches', () => {
  const graph: FamilyGraph = {
    version: 1,
    title: 'Two ancestral branches',
    people: [
      person('a-grandparent'),
      person('z-grandparent'),
      person('z-parent'),
      person('a-parent'),
      person('child'),
    ],
    connections: [
      { id: 'left', from: 'z-parent', to: 'a-grandparent', type: 'father' },
      { id: 'right', from: 'a-parent', to: 'z-grandparent', type: 'mother' },
      { id: 'couple', from: 'z-parent', to: 'a-parent', type: 'wife' },
      { id: 'dad', from: 'child', to: 'z-parent', type: 'father' },
      { id: 'mom', from: 'child', to: 'a-parent', type: 'mother' },
    ],
  };
  const arranged = autoArrange(graph);
  assertLayout(arranged);
  const p = new Map(arranged.people.map((person) => [person.id, person]));
  assert.ok(p.get('a-grandparent')!.x < p.get('z-grandparent')!.x);
  assert.ok(p.get('z-parent')!.x < p.get('a-parent')!.x);
  assert.equal(autoArrange(arranged), arranged);
  graph.people.reverse();
  graph.connections.reverse();
  assert.deepEqual(positions(autoArrange(graph)), positions(arranged));
});

test('places the descendant toward their parent when an outside spouse joins', () => {
  for (const descendant of ['a-descendant', 'z-descendant']) {
    const graph: FamilyGraph = {
      version: 1,
      title: 'Outside spouse',
      people: [
        person('a-parent'),
        person('z-parent'),
        person(descendant),
        person('m-spouse'),
        person('child'),
      ],
      connections: [
        { id: 'parents', from: 'a-parent', to: 'z-parent', type: 'wife' },
        { id: 'ancestor', from: descendant, to: 'a-parent', type: 'father' },
        { id: 'couple', from: descendant, to: 'm-spouse', type: 'wife' },
        { id: 'dad', from: 'child', to: descendant, type: 'father' },
        { id: 'mom', from: 'child', to: 'm-spouse', type: 'mother' },
      ],
    };
    const arranged = autoArrange(graph);
    assertLayout(arranged);
    const p = new Map(arranged.people.map((person) => [person.id, person]));
    assert.ok(p.get(descendant)!.x < p.get('m-spouse')!.x);
    assert.equal(autoArrange(arranged), arranged);
  }
});
