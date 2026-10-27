import { createRouter, midpoint, pathFor } from './routing.js';

const isPartner = edge => ['wife', 'husband'].includes(edge.type);
const parentLink = edge => ['mother', 'father'].includes(edge.type)
  ? { parent: edge.to, child: edge.from, edge }
  : ['son', 'daughter'].includes(edge.type)
    ? { parent: edge.from, child: edge.to, edge }
    : null;

// Rendering groups are derived from the graph; stored parent links stay independent.
export function connectionLayout(graph) {
  const people = new Map(graph.people.map(person => [person.id, person]));
  const router = createRouter(graph.people);
  const partners = graph.connections.filter(isPartner);
  const partnerRoutes = new Map(partners.map(edge => [edge.id, router.between(people.get(edge.from), people.get(edge.to), true)]));
  const parentsByChild = new Map();
  for (const edge of graph.connections) {
    const link = parentLink(edge);
    if (link) parentsByChild.set(link.child, [...(parentsByChild.get(link.child) || []), link]);
  }
  const families = new Map();
  const grouped = new Set();
  for (const [child, links] of parentsByChild) {
    const couple = partners.find(edge => links.some(link => link.parent === edge.from)
      && links.some(link => link.parent === edge.to));
    if (!couple) continue;
    const edges = links.filter(link => [couple.from, couple.to].includes(link.parent)).map(link => link.edge);
    const family = families.get(couple.id) || { couple, children: [] };
    family.children.push({ person: people.get(child), edges });
    families.set(couple.id, family);
    edges.forEach(edge => grouped.add(edge.id));
  }
  const lines = [];
  for (const { couple, children } of families.values()) {
    const origin = midpoint(partnerRoutes.get(couple.id));
    if (!origin) continue;
    const below = children.reduce((sum, child) => sum + child.person.y + 66 - origin.y, 0) >= 0;
    const nearest = below ? Math.min(...children.map(child => child.person.y)) : Math.max(...children.map(child => child.person.y + 132));
    const junction = router.nearestFree({ x: origin.x, y: (origin.y + nearest) / 2 });
    const trunk = junction && router.route(origin, junction);
    if (!trunk) continue;
    lines.push({ id: `union-${couple.id}`, kind: 'union', path: pathFor(trunk), edges: [] });
    for (const child of children) {
      const label = child.person.gender === 'female' ? 'daughter' : child.person.gender === 'male' ? 'son' : 'child';
      // Each branch starts on the routed trunk. Routing a separate horizontal bus
      // could leave disconnected branches when a card covered one of its taps.
      lines.push({ id: `child-${couple.id}-${child.person.id}`, kind: 'child', path: pathFor(router.toPerson(junction, child.person)), label, edges: child.edges, description: `Remove parent connections for ${child.person.name}` });
    }
  }
  for (const edge of graph.connections) {
    if (grouped.has(edge.id)) continue;
    const a = people.get(edge.from), b = people.get(edge.to), partner = isPartner(edge);
    const points = partner ? partnerRoutes.get(edge.id) : router.between(a, b, false);
    lines.push({ id: edge.id, kind: partner ? 'partner' : 'parent', edges: [edge], label: edge.type,
      path: pathFor(points), description: `Delete ${edge.type} connection between ${a.name} and ${b.name}` });
  }
  return lines;
}
