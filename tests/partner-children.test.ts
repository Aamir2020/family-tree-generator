import type { FamilyGraph, Person, Gender } from '../src/types';
import test from 'node:test';
import assert from 'node:assert/strict';
import { addConnection, validateGraph } from '../src/graph';
import {
  partnerChildOptions,
  connectPartnerChildren,
} from '../src/partner-children';
import { connectionLayout } from '../src/connections';
const person = (id: string, gender: Gender): Person => ({
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
    title: 'Test',
    people: [
      person('parent', 'male'),
      person('partner', 'female'),
      person('son', 'male'),
      person('daughter', 'female'),
      person('mother', 'female'),
    ],
    connections: [
      { id: 'son-link', from: 'parent', to: 'son', type: 'son' },
      { id: 'daughter-link', from: 'daughter', to: 'parent', type: 'father' },
      { id: 'couple', from: 'parent', to: 'partner', type: 'wife' },
    ],
  };
}
test('finds children from either connection direction and connects selected children', () => {
  const graph = family();
  const options = partnerChildOptions(graph, 'parent', 'partner', 'wife');
  assert.deepEqual(
    options.map((o) => o.child.id),
    ['son', 'daughter'],
  );
  assert.ok(options.every((o) => !o.reason));
  const next = connectPartnerChildren(graph, 'partner', options, ['son']);
  assert.equal(next.connections.length, 4);
  assert.equal(graph.connections.length, 3);
  assert.equal(next.connections.at(-1)!.type, 'mother');
  assert.equal(
    connectionLayout(next).filter((line) => line.kind === 'child').length,
    1,
  );
  assert.doesNotThrow(() => validateGraph(next));
});
test('skipping leaves only the partner connection', () => {
  const graph = family();
  assert.equal(
    connectPartnerChildren(
      graph,
      'partner',
      partnerChildOptions(graph, 'parent', 'partner', 'wife'),
      [],
    ),
    graph,
  );
});
test('existing mother slots are disabled without replacing their relationship', () => {
  const graph = addConnection(family(), 'son', 'mother', 'mother');
  const options = partnerChildOptions(graph, 'parent', 'partner', 'wife');
  assert.match(options.find((o) => o.child.id === 'son')!.reason, /one mother/);
  assert.throws(
    () => connectPartnerChildren(graph, 'partner', options, ['son']),
    /cannot/,
  );
  assert.equal(graph.connections.length, 4);
});
test('already connected children are not offered again', () => {
  const graph = addConnection(family(), 'son', 'partner', 'mother');
  assert.deepEqual(
    partnerChildOptions(graph, 'parent', 'partner', 'wife').map(
      (o) => o.child.id,
    ),
    ['daughter'],
  );
});
test('husband connections add father relationships', () => {
  const graph = family();
  graph.people[0].gender = 'female';
  graph.people[1].gender = 'male';
  graph.connections[1].type = 'mother';
  graph.connections[2].type = 'husband';
  const options = partnerChildOptions(graph, 'parent', 'partner', 'husband');
  const next = connectPartnerChildren(graph, 'partner', options, [
    'son',
    'daughter',
  ]);
  assert.ok(next.connections.slice(-2).every((edge) => edge.type === 'father'));
});
test('non-partner relations and people with no children do not prompt', () => {
  assert.deepEqual(
    partnerChildOptions(family(), 'parent', 'partner', 'son'),
    [],
  );
  assert.deepEqual(
    partnerChildOptions(family(), 'mother', 'partner', 'wife'),
    [],
  );
});
test('ancestry cycles are unavailable and unknown selections are rejected', () => {
  let graph = family();
  graph = addConnection(graph, 'son', 'partner', 'daughter');
  const options = partnerChildOptions(graph, 'parent', 'partner', 'wife');
  assert.throws(
    () => connectPartnerChildren(graph, 'partner', options, ['missing']),
    /cannot/,
  );
  graph = addConnection(family(), 'son', 'mother', 'daughter');
  graph = addConnection(graph, 'mother', 'partner', 'daughter');
  const candidate = partnerChildOptions(
    graph,
    'parent',
    'partner',
    'wife',
  ).find((o) => o.child.id === 'son');
  assert.ok(candidate);
  assert.match(candidate.reason, /cycle/);
});
