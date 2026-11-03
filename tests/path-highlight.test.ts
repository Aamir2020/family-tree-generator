import test from 'node:test';
import assert from 'node:assert/strict';
import { demo } from '../src/graph';
import { findRelationship } from '../src/kinship';
import { pathHighlight } from '../src/path-highlight';
import { connectionLayout, connectionHighlights } from '../src/connections';
import type { Point } from '../src/types';

const ancestorPath = ['george', 'william', 'charles', 'elizabeth'];

test('a relationship highlights exactly its recorded people and edges in either direction', () => {
  const relationship = findRelationship(demo, 'george', 'elizabeth');
  assert.deepEqual(relationship.path, ancestorPath);
  const highlight = pathHighlight(demo, relationship.path)!;
  assert.deepEqual([...highlight.personIds], ancestorPath);
  assert.deepEqual(
    [...highlight.connectionIds],
    ['george-father', 'william-father', 'charles-mother'],
  );
  assert.equal(highlight.sourceId, 'george');
  assert.equal(highlight.targetId, 'elizabeth');
  const reverse = pathHighlight(demo, [...ancestorPath].reverse())!;
  assert.deepEqual(
    [...reverse.connectionIds].sort(),
    [...highlight.connectionIds].sort(),
  );
  assert.equal(reverse.sourceId, 'elizabeth');
  assert.equal(reverse.targetId, 'george');
});

test('empty, disconnected, missing and broken paths cannot fade the tree', () => {
  assert.equal(pathHighlight(demo, []), null);
  assert.equal(pathHighlight(demo, ['george']), null);
  assert.equal(pathHighlight(demo, ['missing', 'george']), null);
  assert.equal(pathHighlight(demo, ['george', 'elizabeth']), null);
  const disconnected = { ...demo, connections: [] };
  assert.equal(
    pathHighlight(
      disconnected,
      findRelationship(disconnected, 'george', 'elizabeth').path,
    ),
    null,
  );
  const changed = {
    ...demo,
    connections: demo.connections.filter(
      (edge) => edge.id !== 'william-father',
    ),
  };
  assert.equal(pathHighlight(changed, ancestorPath), null);
  assert.ok(
    pathHighlight(demo, ancestorPath),
    'restoring a connection makes the path valid again',
  );
});

test('a shared family highlights only the relevant parent half and child branch', () => {
  const before = JSON.stringify(demo);
  const lines = connectionLayout(demo);
  const highlights = connectionHighlights(lines, new Set(['george-father']));
  assert.equal(highlights.length, 2);
  assert.ok(
    highlights.every((stroke) => stroke.connectionId === 'george-father'),
  );
  assert.equal(
    highlights.find((stroke) => stroke.kind === 'parent')!.path,
    'M 730 626 V 748 H 370 V 870',
  );
  assert.ok(
    highlights.every(
      (stroke) =>
        !stroke.id.includes('louis') && !stroke.id.includes('charlotte'),
    ),
  );
  assert.equal(JSON.stringify(demo), before);
});

test('sibling paths cover their two branches without lighting up the third child', () => {
  const result = findRelationship(demo, 'george', 'charlotte');
  const highlight = pathHighlight(demo, result.path)!;
  const strokes = connectionHighlights(
    connectionLayout(demo),
    highlight.connectionIds,
  );
  assert.equal(strokes.length, 4);
  assert.deepEqual(
    [...new Set(strokes.map((stroke) => stroke.connectionId))].sort(),
    ['charlotte-father', 'george-father'],
  );
  assert.ok(!highlight.personIds.has('louis'));
  assert.ok(!highlight.personIds.has('catherine'));
  assert.ok(strokes.every((stroke) => !stroke.path.includes('H 1090')));
});

test('a direct partner path highlights the original partner curve without the children', () => {
  const highlight = pathHighlight(
    demo,
    findRelationship(demo, 'william', 'catherine').path,
  )!;
  const lines = connectionLayout(demo);
  const strokes = connectionHighlights(lines, highlight.connectionIds);
  assert.equal(strokes.length, 1);
  assert.equal(strokes[0].connectionId, 'royal-marriage');
  assert.equal(strokes[0].kind, 'partner');
  assert.equal(
    strokes[0].path,
    lines.find((line) => line.id === 'royal-marriage')!.path,
  );
});

test('single-parent curves are highlighted without adding or rerouting connections', () => {
  const graph = {
    ...demo,
    connections: demo.connections.filter(
      (edge) => edge.id !== 'royal-marriage',
    ),
  };
  const lines = connectionLayout(graph);
  const strokes = connectionHighlights(lines, new Set(['george-father']));
  assert.equal(strokes.length, 1);
  assert.equal(
    strokes[0].path,
    lines.find((line) => line.id === 'george-father')!.path,
  );
});

function bezierPoint(path: string, t: number): Point {
  const values = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  assert.equal(values.length, 8);
  const u = 1 - t;
  return {
    x:
      u ** 3 * values[0] +
      3 * u ** 2 * t * values[2] +
      3 * u * t ** 2 * values[4] +
      t ** 3 * values[6],
    y:
      u ** 3 * values[1] +
      3 * u ** 2 * t * values[3] +
      3 * u * t ** 2 * values[5] +
      t ** 3 * values[7],
  };
}

test('highlight halves stay exactly on the partner curve after either parent is moved', () => {
  const graph = structuredClone(demo);
  const catherine = graph.people.find((person) => person.id === 'catherine')!;
  catherine.x += 80;
  catherine.y += 90;
  const lines = connectionLayout(graph);
  const partner = lines.find((line) => line.id === 'royal-marriage')!;
  for (const [edgeId, reversed] of [
    ['george-father', false],
    ['george-mother', true],
  ] as const) {
    const half = connectionHighlights(lines, new Set([edgeId])).find(
      (stroke) => stroke.kind === 'partner',
    )!;
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const actual = bezierPoint(half.path, t);
      const expected = bezierPoint(partner.path, reversed ? 1 - t / 2 : t / 2);
      assert.ok(Math.abs(actual.x - expected.x) < 1e-8);
      assert.ok(Math.abs(actual.y - expected.y) < 1e-8);
    }
  }
});

test('people IDs containing separators do not select unrelated connections', () => {
  const graph = structuredClone(demo);
  graph.people[0].id = 'a:b';
  graph.people[1].id = 'c';
  graph.people[2].id = 'a';
  graph.people[3].id = 'b:c';
  graph.connections = [
    { id: 'wanted', from: 'a:b', to: 'c', type: 'wife' },
    { id: 'other', from: 'a', to: 'b:c', type: 'wife' },
  ];
  assert.deepEqual(
    [...pathHighlight(graph, ['a:b', 'c'])!.connectionIds],
    ['wanted'],
  );
});
