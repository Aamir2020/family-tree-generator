const isPartner = edge => ['wife', 'husband'].includes(edge.type);
const parentLink = edge => ['mother', 'father'].includes(edge.type)
  ? { parent: edge.to, child: edge.from, edge }
  : ['son', 'daughter'].includes(edge.type)
    ? { parent: edge.from, child: edge.to, edge }
    : null;

function endpoints(a, b, partner) {
  const ax = a.x + 110, ay = a.y + 66, bx = b.x + 110, by = b.y + 66;
  return partner
    ? { sx: ax + (bx > ax ? 110 : -110), sy: ay, tx: bx + (bx > ax ? -110 : 110), ty: by }
    : { sx: ax, sy: ay + (by > ay ? 66 : -66), tx: bx, ty: by + (by > ay ? -66 : 66) };
}

// Rendering groups are derived from the graph; stored parent links stay independent.
export function connectionLayout(graph) {
  const people = new Map(graph.people.map(person => [person.id, person]));
  const partners = graph.connections.filter(isPartner);
  const parentsByChild = new Map();
  for (const edge of graph.connections) {
    const link = parentLink(edge);
    if (link) parentsByChild.set(link.child, [...(parentsByChild.get(link.child) || []), link]);
  }
  const families = new Map();
  const grouped = new Set();
  for (const [child, links] of parentsByChild) {
    // Only merge explicitly recorded co-parents who have a partner connection.
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
    const { sx, sy, tx, ty } = endpoints(people.get(couple.from), people.get(couple.to), true);
    // A symmetric cubic partner curve passes through this exact midpoint.
    const x = (sx + tx) / 2, y = (sy + ty) / 2;
    const below = children.reduce((sum, child) => sum + child.person.y + 66 - y, 0) >= 0;
    const targets = children.map(child => ({ ...child, x: child.person.x + 110, y: child.person.y + (below ? 0 : 132) }));
    const nearest = below ? Math.min(...targets.map(child => child.y)) : Math.max(...targets.map(child => child.y));
    const busY = (y + nearest) / 2;
    const xs = [x, ...targets.map(child => child.x)];
    lines.push({ id: `union-${couple.id}`, kind: 'union', path: `M ${x} ${y} V ${busY} M ${Math.min(...xs)} ${busY} H ${Math.max(...xs)}`, edges: [] });
    for (const child of targets) {
      const label = child.person.gender === 'female' ? 'daughter' : child.person.gender === 'male' ? 'son' : 'child';
      lines.push({ id: `child-${couple.id}-${child.person.id}`, kind: 'child', path: `M ${child.x} ${busY} V ${child.y}`, label, labelX: child.x, labelY: (busY + child.y) / 2, edges: child.edges, description: `Remove parent connections for ${child.person.name}` });
    }
  }
  for (const edge of graph.connections) {
    if (grouped.has(edge.id)) continue;
    const a = people.get(edge.from), b = people.get(edge.to), partner = isPartner(edge);
    const { sx, sy, tx, ty } = endpoints(a, b, partner);
    const midY = (sy + ty) / 2, t = edge.type === 'mother' ? .6 : .3;
    lines.push({
      id: edge.id, kind: partner ? 'partner' : 'parent', edges: [edge], label: edge.type,
      path: partner ? `M ${sx} ${sy} C ${(sx + tx) / 2} ${sy}, ${(sx + tx) / 2} ${ty}, ${tx} ${ty}` : `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`,
      labelX: partner ? (sx + tx) / 2 : sx + (tx - sx) * (3 * t * t - 2 * t * t * t),
      labelY: partner ? midY : (1 - t) ** 3 * sy + 3 * (1 - t) ** 2 * t * midY + 3 * (1 - t) * t * t * midY + t ** 3 * ty,
      description: `Delete ${edge.type} connection between ${a.name} and ${b.name}`,
    });
  }
  return lines;
}
