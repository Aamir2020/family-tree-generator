import test from 'node:test';
import assert from 'node:assert/strict';
import { demo } from '../src/graph';
import { connectionLayout } from '../src/connections';

test('shared children branch from one partner midpoint without duplicate parent lines', () => {
  const before = JSON.stringify(demo);
  const layout = connectionLayout(demo);
  assert.equal(layout.filter((line) => line.kind === 'union').length, 1);
  assert.equal(layout.filter((line) => line.kind === 'child').length, 2);
  assert.equal(layout.filter((line) => line.kind === 'parent').length, 0);
  assert.ok(
    layout
      .find((line) => line.kind === 'union')!
      .path.startsWith('M 610 226 V'),
  );
  assert.deepEqual(
    layout.filter((line) => line.kind === 'child').map((line) => line.label),
    ['son', 'daughter'],
  );
  assert.equal(JSON.stringify(demo), before);
});
test('removing a partner or parent link restores direct connections', () => {
  const unpaired = {
    ...demo,
    connections: demo.connections.filter((edge) => edge.type !== 'wife'),
  };
  assert.equal(
    connectionLayout(unpaired).filter((line) => line.kind === 'parent').length,
    4,
  );
  const single = {
    ...demo,
    connections: demo.connections.filter((edge) => edge.id !== 'flynn-mother'),
  };
  const layout = connectionLayout(single);
  assert.equal(layout.filter((line) => line.kind === 'child').length, 1);
  assert.equal(
    layout.find((line) => line.kind === 'parent')!.edges[0].id,
    'flynn-father',
  );
});
test('inverse son and daughter links group identically', () => {
  const graph = structuredClone(demo);
  graph.connections = graph.connections.map((edge) =>
    edge.type === 'wife'
      ? edge
      : {
          ...edge,
          from: edge.to,
          to: edge.from,
          type: edge.from === 'flynn' ? 'son' : 'daughter',
        },
  );
  assert.equal(
    connectionLayout(graph).filter((line) => line.kind === 'child').length,
    2,
  );
});
test('dragging either parent recomputes the exact partner midpoint', () => {
  const graph = structuredClone(demo);
  graph.people[1].x += 100;
  graph.people[1].y += 50;
  const union = connectionLayout(graph).find((line) => line.kind === 'union');
  assert.ok(union!.path.startsWith('M 660 251 V'));
  assert.ok(
    connectionLayout(graph).every((line) => !line.path.includes('NaN')),
  );
});
test('separate couples do not share child branches', () => {
  const graph = structuredClone(demo);
  graph.people.push({
    id: 'other',
    name: 'Other partner',
    gender: 'female',
    born: '',
    notes: '',
    x: 1100,
    y: 160,
  });
  graph.connections.push({
    id: 'other-marriage',
    from: 'walter',
    to: 'other',
    type: 'wife',
  });
  graph.connections = graph.connections.map((edge) =>
    edge.id === 'holly-mother' ? { ...edge, to: 'other' } : edge,
  );
  const layout = connectionLayout(graph);
  assert.equal(layout.filter((line) => line.kind === 'union').length, 2);
  assert.ok(
    layout
      .filter((line) => line.kind === 'child')
      .every((line) => line.edges.length === 2),
  );
});

test('unrelated cards do not alter connection paths', () => {
  const graph = structuredClone(demo);
  const original = connectionLayout(graph).map((line) => line.path);
  graph.people.push({
    id: 'overlapping-card',
    name: 'Unrelated person',
    gender: 'unspecified',
    born: '',
    notes: '',
    x: 500,
    y: 290,
  });
  assert.deepEqual(
    connectionLayout(graph).map((line) => line.path),
    original,
  );
});
