import test from 'node:test';
import assert from 'node:assert/strict';
import { demo, legacyDemo, preloadTree, validateGraph, addConnection, removePerson, relativePosition } from '../src/graph.js';
const person = (id, gender = 'unspecified') => ({id,name:id,gender,born:'',notes:'',x:0,y:0});
const graph = () => ({version:1,title:'Test',people:[person('a','male'),person('b','female'),person('c','male'),person('d','female')],connections:[]});
test('example is a valid portable graph',()=>assert.equal(validateGraph(demo),demo));
test('one mother and one father per person',()=>{let g=addConnection(graph(),'a','b','mother');assert.throws(()=>addConnection(g,'a','d','mother'),/one mother/);g=addConnection(g,'a','c','father');assert.equal(g.connections.length,2);});
test('inverse child edges also occupy parent slots',()=>{const g=addConnection(graph(),'b','a','son');assert.throws(()=>addConnection(g,'a','d','mother'),/one mother/);});
test('multiple children and partners are allowed',()=>{let g=addConnection(graph(),'a','b','wife');g=addConnection(g,'a','d','wife');g=addConnection(g,'a','c','son');assert.equal(g.connections.length,3);});
test('cycles, self links, dangling links, and reverse duplicates are rejected',()=>{const g=addConnection(graph(),'a','b','mother');assert.throws(()=>addConnection(g,'b','a','son'),/already/);assert.throws(()=>addConnection(g,'a','a','father'),/invalid/);assert.throws(()=>addConnection(g,'a','missing','father'),/invalid/);const chain=addConnection(g,'b','c','father');assert.throws(()=>addConnection(chain,'c','a','father'),/cycle/);});
test('removing a person removes incident edges only',()=>{let g=addConnection(graph(),'a','b','mother');g=addConnection(g,'c','d','wife');g=removePerson(g,'a');assert.equal(g.people.length,3);assert.equal(g.connections.length,1);assert.equal(g.connections[0].from,'c');});
test('imports reject malformed positions and duplicate identifiers',()=>{const g=graph();g.people[0].x=Infinity;assert.throws(()=>validateGraph(g),/invalid/);const h=graph();h.people.push(h.people[0]);assert.throws(()=>validateGraph(h),/duplicate/);assert.throws(()=>validateGraph({}),/valid Zermanzer/);});
test('JSON roundtrip retains relationships and positions',()=>assert.deepEqual(validateGraph(JSON.parse(JSON.stringify(demo))),demo));
test('new relatives are positioned in the appropriate generation',()=>{const g=graph(),p=g.people[0];assert.ok(relativePosition(g,p,'mother').y<p.y);assert.ok(relativePosition(g,p,'son').y>p.y);assert.equal(relativePosition(g,p,'wife').y,p.y);});
test('birthdays may be blank or omitted on import',()=>{const g=graph();delete g.people[0].born;const imported=validateGraph(g);assert.equal(imported.people[0].born,'');assert.equal(imported.people[1].born,'');assert.doesNotThrow(()=>validateGraph(JSON.parse(JSON.stringify(imported))));});

test('new browsers preload the White family',()=>assert.deepEqual(preloadTree(null),demo));
test('saved Bennett sample migrates despite dragging, reordered cards, or edited notes',()=>{const saved=structuredClone(legacyDemo);saved.people.reverse();saved.people[0].x+=300;saved.people[0].notes='Exploring the example';assert.deepEqual(preloadTree(saved),demo);});
test('custom trees and cleared trees are preserved on startup',()=>{const custom=structuredClone(legacyDemo);custom.people[0].name='My own relative';assert.equal(preloadTree(custom),custom);const empty={version:1,title:'My family tree',people:[],connections:[]};assert.equal(preloadTree(empty),empty);});
