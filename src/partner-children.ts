import type { FamilyGraph, PartnerChildOption, Relationship } from './types';
import { errorMessage } from './errors';
import { addConnection } from './graph';

// Normalize both supported directions without inferring parenthood from marriage.
export function partnerChildOptions(
  graph: FamilyGraph,
  sourceId: string,
  partnerId: string,
  partnerType: Relationship,
): PartnerChildOption[] {
  if (!['wife', 'husband'].includes(partnerType)) return [];
  const children = new Set<string>();
  for (const edge of graph.connections) {
    if (edge.from === sourceId && ['son', 'daughter'].includes(edge.type))
      children.add(edge.to);
    if (edge.to === sourceId && ['mother', 'father'].includes(edge.type))
      children.add(edge.from);
  }
  const role: 'mother' | 'father' =
    partnerType === 'wife' ? 'mother' : 'father';
  return [...children].flatMap((id) => {
    const child = graph.people.find((person) => person.id === id);
    const connected = graph.connections.some(
      (edge) =>
        (edge.from === id && edge.to === partnerId) ||
        (edge.from === partnerId && edge.to === id),
    );
    // An existing relation is never duplicated or replaced.
    if (connected || !child) return [];
    let reason = '';
    try {
      addConnection(graph, id, partnerId, role);
    } catch (error) {
      reason = errorMessage(error);
    }
    return [{ child, role, reason }];
  });
}

export function connectPartnerChildren(
  graph: FamilyGraph,
  partnerId: string,
  options: PartnerChildOption[],
  selectedIds: string[],
): FamilyGraph {
  let next = graph;
  for (const id of selectedIds) {
    const option = options.find((item) => item.child.id === id);
    if (!option || option.reason)
      throw new Error('This child cannot be connected to the partner.');
    next = addConnection(next, id, partnerId, option.role);
  }
  return next;
}
