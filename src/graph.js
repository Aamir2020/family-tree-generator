export const TYPES = ['mother', 'father', 'son', 'daughter', 'wife', 'husband'];
export const uid = () => crypto.randomUUID();
export function validateGraph(graph) {
  if (!graph || graph.version !== 1 || typeof graph.title !== 'string' || !Array.isArray(graph.people) || !Array.isArray(graph.connections)) throw new Error('Choose a valid Zermander JSON file (version 1).');
  if (graph.people.length > 1000 || graph.connections.length > 5000) throw new Error('This file is too large (maximum 1,000 people and 5,000 connections).');
  const ids = new Set();
  for (const p of graph.people) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || typeof p.x !== 'number' || typeof p.y !== 'number' || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !['female', 'male', 'unspecified'].includes(p.gender) || (p.born !== undefined && typeof p.born !== 'string') || typeof p.notes !== 'string') throw new Error('The file contains an invalid or duplicate person.');
    ids.add(p.id);
  }
  const edgeIds = new Set(); const parentSlots = new Set(); const pairs = new Set(); const ancestry = new Map();
  for (const e of graph.connections) {
    if (!e || typeof e.id !== 'string' || edgeIds.has(e.id) || !ids.has(e.from) || !ids.has(e.to) || e.from === e.to || !TYPES.includes(e.type)) throw new Error('The file contains an invalid connection.');
    edgeIds.add(e.id);
    const pair = [e.from, e.to].sort().join(':');
    if (pairs.has(pair)) throw new Error('These people already have a connection.');
    pairs.add(pair);
    const parent = ['mother', 'father'].includes(e.type) ? e.to : ['son', 'daughter'].includes(e.type) ? e.from : null;
    const child = parent === e.to ? e.from : e.to;
    // Child relationships also occupy the corresponding parent slot.
    const role = ['mother', 'father'].includes(e.type) ? e.type : graph.people.find(p => p.id === parent)?.gender === 'female' ? 'mother' : graph.people.find(p => p.id === parent)?.gender === 'male' ? 'father' : null;
    if (parent) {
      if (role) { const slot = `${child}:${role}`; if (parentSlots.has(slot)) throw new Error(`A person can only have one ${role}.`); parentSlots.add(slot); }
      ancestry.set(parent, [...(ancestry.get(parent) || []), child]);
    }
  }
  const visiting = new Set(); const done = new Set();
  function visit(id) { if (visiting.has(id)) throw new Error('A parent connection would create an ancestry cycle.'); if (done.has(id)) return; visiting.add(id); for (const child of ancestry.get(id) || []) visit(child); visiting.delete(id); done.add(id); }
  for (const id of ids) visit(id);
  return graph.people.some(p => p.born === undefined) ? { ...graph, people: graph.people.map(p => ({ ...p, born: p.born ?? '' })) } : graph;
}
export function addConnection(graph, from, to, type) {
  return validateGraph({ ...graph, connections: [...graph.connections, { id: uid(), from, to, type }] });
}
export function removePerson(graph, id) { return { ...graph, people: graph.people.filter(p => p.id !== id), connections: graph.connections.filter(e => e.from !== id && e.to !== id) }; }
export function relativePosition(graph, person, type) {
  const direction = ['mother', 'father'].includes(type) ? -1 : ['son', 'daughter'].includes(type) ? 1 : 0;
  let x = person.x + (direction ? (type === 'mother' ? -130 : type === 'father' ? 130 : 0) : 270);
  const y = person.y + direction * 210;
  while (graph.people.some(p => Math.abs(p.x - x) < 230 && Math.abs(p.y - y) < 150)) x += 250;
  return { x, y };
}
export const demo = {version: 1, title: 'The Bennett family', people: [
  {id:'1',name:'Arthur Bennett',gender:'male',born:'1946',notes:'A gardener with a story for every season.',x:430,y:130},
  {id:'2',name:'Eleanor Bennett',gender:'female',born:'1948',notes:'The heart of every family gathering.',x:730,y:130},
  {id:'3',name:'James Bennett',gender:'male',born:'1974',notes:'Always planning the next family adventure.',x:430,y:355},
  {id:'4',name:'Sophie Bennett',gender:'female',born:'1977',notes:'Collector of recipes and little moments.',x:730,y:355},
  {id:'5',name:'Oliver Bennett',gender:'male',born:'2004',notes:'',x:300,y:580},
  {id:'6',name:'Emma Bennett',gender:'female',born:'2008',notes:'',x:570,y:580}
], connections:[{id:'a',from:'1',to:'2',type:'wife'},{id:'b',from:'3',to:'1',type:'father'},{id:'c',from:'3',to:'2',type:'mother'},{id:'d',from:'3',to:'4',type:'wife'},{id:'e',from:'3',to:'5',type:'son'},{id:'f',from:'3',to:'6',type:'daughter'}]};
