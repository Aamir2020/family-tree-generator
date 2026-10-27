import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectionRectangle,
  peopleInRectangle,
  movePeople,
} from '../src/selection';
const people = [
  { id: 'one', x: 100, y: 100 },
  { id: 'two', x: 450, y: 100 },
  { id: 'three', x: 800, y: 500 },
];
test('marquee selects only intersecting cards, regardless of drag direction', () => {
  const forward = selectionRectangle(90, 90, 700, 250);
  const reverse = selectionRectangle(700, 250, 90, 90);
  assert.deepEqual(forward, reverse);
  assert.deepEqual(peopleInRectangle(people, forward, { x: 0, y: 0 }, 1), [
    'one',
    'two',
  ]);
  assert.deepEqual(
    peopleInRectangle(
      people,
      selectionRectangle(0, 0, 1, 1),
      { x: 0, y: 0 },
      1,
    ),
    [],
  );
});
test('selection respects pan and zoom', () => {
  const rectangle = selectionRectangle(10, 10, 150, 150);
  assert.deepEqual(
    peopleInRectangle(people, rectangle, { x: -100, y: -90 }, 0.5),
    ['one', 'two'],
  );
  assert.deepEqual(
    peopleInRectangle(people, rectangle, { x: 500, y: 500 }, 0.5),
    [],
  );
});
test('moving a group preserves spacing and leaves unselected people untouched', () => {
  const original = new Map(people.map((p) => [p.id, { x: p.x, y: p.y }]));
  const moved = movePeople(people, ['one', 'two'], original, 80, -40, 0.5);
  assert.deepEqual(
    moved.map((p) => [p.x, p.y]),
    [
      [260, 20],
      [610, 20],
      [800, 500],
    ],
  );
  assert.deepEqual(
    people.map((p) => [p.x, p.y]),
    [
      [100, 100],
      [450, 100],
      [800, 500],
    ],
  );
  assert.equal(moved[2], people[2]);
});
