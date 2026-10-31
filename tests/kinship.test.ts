import test from 'node:test';
import assert from 'node:assert/strict';
import { findRelationship } from '../src/kinship';
import { siblingDetails } from '../src/people';
import { validateGraph } from '../src/graph';
import type { FamilyGraph, Gender } from '../src/types';

function family() {
  const graph: FamilyGraph = {
    version: 1,
    title: 'Synthetic family',
    people: [],
    connections: [],
  };
  function person(id: string, gender: Gender = 'unspecified') {
    graph.people.push({
      id,
      name: id,
      gender,
      born: '',
      notes: '',
      x: 0,
      y: 0,
    });
  }
  function parent(child: string, adult: string, role: 'mother' | 'father') {
    graph.connections.push({
      id: `${child}-${adult}`,
      from: child,
      to: adult,
      type: role,
    });
  }
  function couple(a: string, b: string) {
    graph.connections.push({
      id: `${a}-${b}`,
      from: a,
      to: b,
      type:
        graph.people.find((p) => p.id === b)?.gender === 'male'
          ? 'husband'
          : 'wife',
    });
  }
  for (const id of [
    'otto',
    'henry',
    'pat',
    'sam',
    'alex',
    'hugo',
    'ben',
    'chris',
    'leo',
    'eli',
    'dan-father',
    'nick',
  ])
    person(id, 'male');
  for (const id of [
    'opal',
    'grace',
    'taylor',
    'ruth',
    'zoe',
    'morgan',
    'bea',
    'cora',
    'dana',
    'ivy',
    'nina',
    'cara',
    'clara',
    'ava',
    'belle',
    'celia',
    'hazel',
    'half-niece',
    'ella',
    'dan-mother',
  ])
    person(id, 'female');
  person('outsider');
  parent('henry', 'otto', 'father');
  parent('henry', 'opal', 'mother');
  parent('hazel', 'otto', 'father');
  parent('hazel', 'opal', 'mother');
  parent('pat', 'henry', 'father');
  parent('pat', 'grace', 'mother');
  parent('taylor', 'henry', 'father');
  parent('taylor', 'grace', 'mother');
  for (const id of ['alex', 'bea']) {
    parent(id, 'pat', 'father');
    parent(id, 'ruth', 'mother');
  }
  parent('hugo', 'pat', 'father');
  parent('hugo', 'zoe', 'mother');
  parent('half-niece', 'hugo', 'father');
  parent('cora', 'taylor', 'mother');
  parent('cora', 'sam', 'father');
  for (const id of ['ivy', 'leo']) {
    parent(id, 'alex', 'father');
    parent(id, 'dana', 'mother');
  }
  parent('nina', 'bea', 'mother');
  parent('nina', 'ben', 'father');
  parent('cara', 'cora', 'mother');
  parent('cara', 'chris', 'father');
  parent('clara', 'cara', 'mother');
  parent('ava', 'ivy', 'mother');
  parent('belle', 'ava', 'mother');
  parent('celia', 'clara', 'mother');
  for (const id of ['dana', 'ella']) {
    parent(id, 'dan-father', 'father');
    parent(id, 'dan-mother', 'mother');
  }
  couple('alex', 'dana');
  couple('pat', 'morgan');
  couple('bea', 'ben');
  couple('cora', 'chris');
  couple('taylor', 'sam');
  couple('ella', 'eli');
  couple('nina', 'nick');
  validateGraph(graph);
  return { graph, person, parent, couple };
}

const terms = [
  ['alex', 'pat', 'father'],
  ['alex', 'ruth', 'mother'],
  ['pat', 'alex', 'son'],
  ['pat', 'bea', 'daughter'],
  ['alex', 'henry', 'grandfather'],
  ['henry', 'alex', 'grandson'],
  ['grace', 'bea', 'granddaughter'],
  ['alex', 'grace', 'grandmother'],
  ['alex', 'otto', 'great-grandfather'],
  ['otto', 'ivy', 'great-great-granddaughter'],
  ['alex', 'bea', 'sister'],
  ['bea', 'alex', 'brother'],
  ['alex', 'hugo', 'half brother'],
  ['alex', 'taylor', 'aunt'],
  ['cora', 'pat', 'uncle'],
  ['alex', 'nina', 'niece'],
  ['taylor', 'alex', 'nephew'],
  ['ivy', 'taylor', 'great-aunt'],
  ['hazel', 'ivy', 'great-great-niece'],
  ['alex', 'half-niece', 'half niece'],
  ['ivy', 'half-niece', 'half first cousin'],
  ['alex', 'cora', 'first cousin'],
  ['alex', 'cara', 'first cousin once removed'],
  ['cara', 'alex', 'first cousin once removed'],
  ['alex', 'clara', 'first cousin twice removed'],
  ['ivy', 'cara', 'second cousin'],
  ['ava', 'clara', 'third cousin'],
  ['belle', 'celia', 'fourth cousin'],
  ['alex', 'dana', 'wife'],
  ['dana', 'alex', 'husband'],
  ['alex', 'morgan', 'stepmother'],
  ['morgan', 'alex', 'stepson'],
  ['morgan', 'bea', 'stepdaughter'],
  ['dana', 'pat', 'father-in-law'],
  ['alex', 'dan-mother', 'mother-in-law'],
  ['dan-father', 'alex', 'son-in-law'],
  ['pat', 'dana', 'daughter-in-law'],
  ['alex', 'ben', 'brother-in-law'],
  ['alex', 'ella', 'sister-in-law'],
  ['alex', 'eli', 'brother-in-law'],
  ['alex', 'sam', 'uncle by marriage'],
  ['alex', 'nick', 'nephew by marriage'],
  ['alex', 'chris', 'first cousin by marriage'],
  ['dana', 'henry', 'grandfather-in-law'],
  ['ruth', 'pat', 'co-parent'],
] as const;
for (const [from, to, label] of terms) {
  test(`${to} is ${from}'s ${label}`, () => {
    const { graph } = family();
    const before = JSON.stringify(graph);
    const result = findRelationship(graph, from, to);
    assert.equal(result.kind, 'family');
    assert.equal(result.label, label);
    assert.equal(result.path[0], from);
    assert.equal(result.path.at(-1), to);
    assert.equal(new Set(result.path).size, result.path.length);
    for (let index = 1; index < result.path.length; index++) {
      const a = result.path[index - 1];
      const b = result.path[index];
      assert.ok(
        graph.connections.some(
          (edge) =>
            (edge.from === a && edge.to === b) ||
            (edge.from === b && edge.to === a),
        ),
        'every path step must be recorded',
      );
    }
    assert.equal(JSON.stringify(graph), before);
  });
}

test('parent-to-child edge directions give the same family terms', () => {
  const { graph } = family();
  const reversed: FamilyGraph = {
    ...graph,
    connections: graph.connections.map((edge) => {
      if (edge.type !== 'mother' && edge.type !== 'father') return edge;
      return {
        ...edge,
        from: edge.to,
        to: edge.from,
        type:
          graph.people.find((p) => p.id === edge.from)?.gender === 'female'
            ? 'daughter'
            : 'son',
      };
    }),
  };
  for (const [from, to, label] of terms)
    assert.equal(findRelationship(reversed, from, to).label, label);
});

test('one shared parent does not prove half siblings when other parents are unknown', () => {
  const { graph } = family();
  graph.connections = graph.connections.filter(
    (edge) => edge.id !== 'hugo-zoe',
  );
  const result = findRelationship(graph, 'alex', 'hugo');
  assert.equal(result.label, 'brother');
  assert.match(result.detail ?? '', /unknown/);
  assert.equal(
    siblingDetails(graph, 'alex').find((entry) => entry.person.id === 'hugo')
      ?.relation,
    'brother',
  );
});

test('stepsiblings require a partner link between the parents', () => {
  const { graph, person, parent } = family();
  person('step-sister', 'female');
  parent('step-sister', 'morgan', 'mother');
  assert.equal(
    findRelationship(graph, 'alex', 'step-sister').label,
    'stepsister',
  );
  assert.equal(
    findRelationship(graph, 'step-sister', 'alex').label,
    'stepbrother',
  );
  graph.connections = graph.connections.filter(
    (edge) => edge.id !== 'pat-morgan',
  );
  assert.equal(
    findRelationship(graph, 'alex', 'step-sister').kind,
    'unconnected',
  );
});

test('gender-neutral people get neutral terms and explicit parent roles still apply', () => {
  const { graph, person, parent } = family();
  person('neutral-child');
  parent('neutral-child', 'pat', 'father');
  parent('neutral-child', 'ruth', 'mother');
  assert.equal(
    findRelationship(graph, 'alex', 'neutral-child').label,
    'sibling',
  );
  assert.equal(
    findRelationship(graph, 'henry', 'neutral-child').label,
    'grandchild',
  );
  graph.people.find((p) => p.id === 'pat')!.gender = 'unspecified';
  assert.equal(findRelationship(graph, 'alex', 'pat').label, 'father');
});

test('a partner connection does not invent a shared parent or ancestry', () => {
  const { graph } = family();
  assert.equal(findRelationship(graph, 'alex', 'zoe').kind, 'connected');
  assert.notEqual(findRelationship(graph, 'alex', 'zoe').label, 'stepmother');
  assert.equal(
    findRelationship(graph, 'ivy', 'morgan').label,
    'step-grandmother',
  );
});

test('blood relations are preferred over a longer path through marriage', () => {
  const { graph, couple } = family();
  couple('cora', 'ben');
  assert.equal(findRelationship(graph, 'alex', 'cora').label, 'first cousin');
});

test('handles disconnected people, missing people, self and changes to the tree', () => {
  const { graph } = family();
  assert.equal(findRelationship(graph, 'alex', 'outsider').kind, 'unconnected');
  assert.equal(findRelationship(graph, 'alex', 'missing').kind, 'missing');
  assert.equal(findRelationship(graph, 'alex', 'alex').label, 'self');
  graph.connections = graph.connections.filter(
    (edge) => edge.id !== 'alex-dana',
  );
  assert.equal(findRelationship(graph, 'alex', 'dana').label, 'co-parent');
});
