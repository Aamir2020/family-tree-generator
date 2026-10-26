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

function blocked(x1, y1, x2, y2, obstacles) {
  return obstacles.some(rect => x1 === x2
    ? x1 > rect.left && x1 < rect.right && Math.max(Math.min(y1, y2), rect.top) < Math.min(Math.max(y1, y2), rect.bottom)
    : y1 > rect.top && y1 < rect.bottom && Math.max(Math.min(x1, x2), rect.left) < Math.min(Math.max(x1, x2), rect.right));
}

function routeAround(start, end, graph, ignored = []) {
  const ignoredIds = new Set(ignored);
  const bounds = {
    left: Math.min(start.x, end.x) - 260, right: Math.max(start.x, end.x) + 260,
    top: Math.min(start.y, end.y) - 260, bottom: Math.max(start.y, end.y) + 260,
  };
  const obstacles = graph.people.filter(person => !ignoredIds.has(person.id)
    && person.x < bounds.right && person.x + 220 > bounds.left
    && person.y < bounds.bottom && person.y + 132 > bounds.top)
    .map(person => ({ left: person.x - 14, right: person.x + 234, top: person.y - 14, bottom: person.y + 146 }));
  if ((start.x === end.x || start.y === end.y) && !blocked(start.x, start.y, end.x, end.y, obstacles)) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

  const xs = [...new Set([start.x, end.x, ...obstacles.flatMap(rect => [rect.left, rect.right])])].sort((a, b) => a - b);
  const ys = [...new Set([start.y, end.y, ...obstacles.flatMap(rect => [rect.top, rect.bottom])])].sort((a, b) => a - b);
  const nodes = [];
  const byPoint = new Map();
  for (const y of ys) for (const x of xs) {
    if (obstacles.some(rect => x > rect.left && x < rect.right && y > rect.top && y < rect.bottom)) continue;
    const index = nodes.length;
    nodes.push({ x, y });
    byPoint.set(`${x},${y}`, index);
  }
  const source = byPoint.get(`${start.x},${start.y}`), target = byPoint.get(`${end.x},${end.y}`);
  if (source === undefined || target === undefined) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  const adjacency = nodes.map(() => []);
  for (const y of ys) {
    const row = xs.map(x => byPoint.get(`${x},${y}`)).filter(index => index !== undefined);
    for (let i = 1; i < row.length; i++) {
      const a = nodes[row[i - 1]], b = nodes[row[i]];
      if (!blocked(a.x, a.y, b.x, b.y, obstacles)) {
        const distance = Math.abs(b.x - a.x);
        adjacency[row[i - 1]].push([row[i], distance]); adjacency[row[i]].push([row[i - 1], distance]);
      }
    }
  }
  for (const x of xs) {
    const column = ys.map(y => byPoint.get(`${x},${y}`)).filter(index => index !== undefined);
    for (let i = 1; i < column.length; i++) {
      const a = nodes[column[i - 1]], b = nodes[column[i]];
      if (!blocked(a.x, a.y, b.x, b.y, obstacles)) {
        const distance = Math.abs(b.y - a.y);
        adjacency[column[i - 1]].push([column[i], distance]); adjacency[column[i]].push([column[i - 1], distance]);
      }
    }
  }
  // Dijkstra keeps the router dependency free.
  const distances = new Array(nodes.length).fill(Infinity), previous = new Array(nodes.length).fill(-1);
  const queue = [[0, source]]; distances[source] = 0;
  while (queue.length) {
    queue.sort((a, b) => b[0] - a[0]);
    const [distance, current] = queue.pop();
    if (distance !== distances[current]) continue;
    if (current === target) break;
    for (const [next, cost] of adjacency[current]) if (distance + cost < distances[next]) {
      distances[next] = distance + cost; previous[next] = current; queue.push([distances[next], next]);
    }
  }
  if (!Number.isFinite(distances[target])) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  const route = [];
  for (let at = target; at !== -1; at = previous[at]) route.push(nodes[at]);
  route.reverse();
  return route.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
}

function curveHitsPerson(start, control1, control2, end, graph, ignored) {
  const ignoredIds = new Set(ignored);
  return graph.people.some(person => !ignoredIds.has(person.id) && Array.from({ length: 25 }, (_, index) => {
    const t = index / 24, u = 1 - t;
    const x = u ** 3 * start.x + 3 * u ** 2 * t * control1.x + 3 * u * t ** 2 * control2.x + t ** 3 * end.x;
    const y = u ** 3 * start.y + 3 * u ** 2 * t * control1.y + 3 * u * t ** 2 * control2.y + t ** 3 * end.y;
    return x > person.x - 8 && x < person.x + 228 && y > person.y - 8 && y < person.y + 140;
  }).some(Boolean));
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
    const coupleIds = [couple.from, couple.to];
    const trunk = routeAround({ x, y }, { x, y: busY }, graph, coupleIds);
    const bus = routeAround({ x: Math.min(...xs), y: busY }, { x: Math.max(...xs), y: busY }, graph);
    lines.push({ id: `union-${couple.id}`, kind: 'union', path: `${trunk} ${bus}`, edges: [] });
    for (const child of targets) {
      const label = child.person.gender === 'female' ? 'daughter' : child.person.gender === 'male' ? 'son' : 'child';
      lines.push({ id: `child-${couple.id}-${child.person.id}`, kind: 'child', path: routeAround({ x: child.x, y: busY }, { x: child.x, y: child.y }, graph, [child.person.id]), label, labelX: child.x, labelY: (busY + child.y) / 2, edges: child.edges, description: `Remove parent connections for ${child.person.name}` });
    }
  }
  for (const edge of graph.connections) {
    if (grouped.has(edge.id)) continue;
    const a = people.get(edge.from), b = people.get(edge.to), partner = isPartner(edge);
    const { sx, sy, tx, ty } = endpoints(a, b, partner);
    const midY = (sy + ty) / 2, t = edge.type === 'mother' ? .6 : .3;
    const start = { x: sx, y: sy }, end = { x: tx, y: ty };
    const control1 = partner ? { x: (sx + tx) / 2, y: sy } : { x: sx, y: midY };
    const control2 = partner ? { x: (sx + tx) / 2, y: ty } : { x: tx, y: midY };
    const curve = `M ${sx} ${sy} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${tx} ${ty}`;
    const path = curveHitsPerson(start, control1, control2, end, graph, [a.id, b.id])
      ? routeAround(start, end, graph, [a.id, b.id]) : curve;
    lines.push({
      id: edge.id, kind: partner ? 'partner' : 'parent', edges: [edge], label: edge.type,
      path,
      labelX: partner ? (sx + tx) / 2 : sx + (tx - sx) * (3 * t * t - 2 * t * t * t),
      labelY: partner ? midY : (1 - t) ** 3 * sy + 3 * (1 - t) ** 2 * t * midY + 3 * (1 - t) * t * t * midY + t ** 3 * ty,
      description: `Delete ${edge.type} connection between ${a.name} and ${b.name}`,
    });
  }
  return lines;
}
