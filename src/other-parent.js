import { addConnection } from './graph.js';

const parentId = edge => edge.type === 'mother' || edge.type === 'father' ? edge.to
  : edge.type === 'son' || edge.type === 'daughter' ? edge.from : null;
const childId = edge => edge.type === 'mother' || edge.type === 'father' ? edge.from
  : edge.type === 'son' || edge.type === 'daughter' ? edge.to : null;

export function otherParentOptions(graph, child, source) {
  const currentParents = new Set(graph.connections.filter(edge => childId(edge) === child).map(parentId));
  return graph.people.filter(person => person.id !== child && person.id !== source && !currentParents.has(person.id))
    .flatMap(person => {
      const roles = person.gender === 'female' ? ['mother'] : person.gender === 'male' ? ['father'] : ['mother', 'father'];
      return roles.flatMap(role => {
        try {
          addConnection(graph, child, person.id, role);
          return [{ person, role }];
        } catch {
          return [];
        }
      });
    });
}

export function connectOtherParent(graph, option) {
  return addConnection(graph, option.childId, option.person.id, option.role);
}
