import test from 'node:test';
import assert from 'node:assert/strict';
import { demo } from '../src/graph.js';
import { connectionLayout } from '../src/connections.js';

test('shared children branch from one partner midpoint without duplicate parent lines', () => {
  const before = JSON.stringify(demo), layout = connectionLayout(demo);
  assert.equal(layout.filter(line => line.kind === 'union').length, 1);
  assert.equal(layout.filter(line => line.kind === 'child').length, 2);
  assert.equal(layout.filter(line => line.kind === 'parent').length, 0);
  assert.ok(layout.find(line => line.kind === 'union').path.startsWith('M 610 226 V'));
  assert.deepEqual(layout.filter(line => line.kind === 'child').map(line => line.label), ['son', 'daughter']);
  assert.equal(JSON.stringify(demo), before);
});
test('removing a partner or parent link restores direct connections', () => {
  const unpaired = { ...demo, connections: demo.connections.filter(edge => edge.type !== 'wife') };
  assert.equal(connectionLayout(unpaired).filter(line => line.kind === 'parent').length, 4);
  const single = { ...demo, connections: demo.connections.filter(edge => edge.id !== 'flynn-mother') };
  const layout = connectionLayout(single);
  assert.equal(layout.filter(line => line.kind === 'child').length, 1);
  assert.equal(layout.find(line => line.kind === 'parent').edges[0].id, 'flynn-father');
});
test('inverse son and daughter links group identically', () => {
  const graph = structuredClone(demo);
  graph.connections = graph.connections.map(edge => edge.type === 'wife' ? edge : {
    ...edge, from: edge.to, to: edge.from, type: edge.from === 'flynn' ? 'son' : 'daughter',
  });
  assert.equal(connectionLayout(graph).filter(line => line.kind === 'child').length, 2);
});
test('dragging either parent recomputes the exact partner midpoint', () => {
  const graph = structuredClone(demo); graph.people[1].x += 100; graph.people[1].y += 50;
  const union = connectionLayout(graph).find(line => line.kind === 'union');
  assert.notEqual(union.path, connectionLayout(demo).find(line => line.kind === 'union').path);
  assertAvoidsCards(graph);
  assert.ok(connectionLayout(graph).every(line => !line.path.includes('NaN')));
});
test('separate couples do not share child branches', () => {
  const graph = structuredClone(demo);
  graph.people.push({ id: 'other', name: 'Other partner', gender: 'female', born: '', notes: '', x: 1100, y: 160 });
  graph.connections.push({ id: 'other-marriage', from: 'walter', to: 'other', type: 'wife' });
  graph.connections = graph.connections.map(edge => edge.id === 'holly-mother' ? { ...edge, to: 'other' } : edge);
  const layout = connectionLayout(graph);
  assert.equal(layout.filter(line => line.kind === 'union').length, 2);
  assert.ok(layout.filter(line => line.kind === 'child').every(line => line.edges.length === 2));
});

function pointsOf(path) {
  const tokens = path.match(/[MHV]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) || [];
  const points = [];
  for (let index = 0; index < tokens.length;) {
    const command = tokens[index++], previous = points.at(-1);
    if (command === 'M') points.push({ x: Number(tokens[index++]), y: Number(tokens[index++]) });
    else if (command === 'H') points.push({ x: Number(tokens[index++]), y: previous.y });
    else if (command === 'V') points.push({ x: previous.x, y: Number(tokens[index++]) });
    else throw new Error(`Unexpected path command ${command}`);
  }
  return points;
}

function assertAvoidsCards(graph) {
  const layout = connectionLayout(graph);
  for (const line of layout) {
    const points = pointsOf(line.path);
    assert.ok(points.length, `${line.id} must remain visible`);
    for (let index = 1; index < points.length; index++) {
      const a = points[index - 1], b = points[index];
      for (const person of graph.people) {
        const intersects = a.x === b.x
          ? a.x > person.x && a.x < person.x + 220 && Math.max(Math.min(a.y, b.y), person.y) < Math.min(Math.max(a.y, b.y), person.y + 132)
          : a.y > person.y && a.y < person.y + 132 && Math.max(Math.min(a.x, b.x), person.x) < Math.min(Math.max(a.x, b.x), person.x + 220);
        assert.ok(!intersects, `${line.id} crosses ${person.name}: ${line.path}`);
      }
    }
  }
  return layout;
}
const personAt = (id, x, y) => ({ id, name: id, gender: 'unspecified', born: '', notes: '', x, y });

test('a card dragged over a direct parent line forces a continuous detour', () => {
  const graph = { people: [personAt('parent', 0, 0), personAt('child', 0, 600), personAt('blocker', 400, 280)],
    connections: [{ id: 'parent-child', from: 'parent', to: 'child', type: 'son' }] };
  const before = connectionLayout(graph)[0].path;
  graph.people[2].x = 0;
  const after = assertAvoidsCards(graph)[0].path;
  assert.notEqual(after, before);
  graph.people[2].x = 400;
  assert.equal(connectionLayout(graph)[0].path, before);
});

test('a card covering the former family bus junction cannot disable routing', () => {
  const graph = structuredClone(demo);
  graph.people.push(personAt('junction blocker', 500, 290));
  const layout = assertAvoidsCards(graph);
  const trunk = pointsOf(layout.find(line => line.kind === 'union').path);
  for (const child of layout.filter(line => line.kind === 'child')) {
    assert.deepEqual(pointsOf(child.path)[0], trunk.at(-1), 'children must still join the trunk');
  }
});

test('children join the actual partner line after it detours around a card', () => {
  const graph = structuredClone(demo);
  graph.people[1].x = 1050;
  graph.people.push(personAt('partner blocker', 650, 160));
  const layout = assertAvoidsCards(graph);
  const origin = pointsOf(layout.find(line => line.kind === 'union').path)[0];
  const partner = pointsOf(layout.find(line => line.kind === 'partner').path);
  assert.ok(partner.slice(1).some((b, index) => {
    const a = partner[index];
    return (a.x === b.x && origin.x === a.x && origin.y >= Math.min(a.y, b.y) && origin.y <= Math.max(a.y, b.y))
      || (a.y === b.y && origin.y === a.y && origin.x >= Math.min(a.x, b.x) && origin.x <= Math.max(a.x, b.x));
  }), 'the family trunk must start on the visible partner line');
});

test('routing can detour around multiple cards without crossing either endpoint', () => {
  const graph = { people: [personAt('parent', 0, 0), personAt('child', 350, 650),
    personAt('first blocker', -10, 220), personAt('second blocker', 250, 410)],
    connections: [{ id: 'parent-child', from: 'parent', to: 'child', type: 'daughter' }] };
  assertAvoidsCards(graph);
});
