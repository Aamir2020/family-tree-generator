import type { Connection, FamilyGraph, Person, Point } from './types';

export interface HighlightStroke {
  id: string;
  connectionId: string;
  kind: 'parent' | 'partner';
  path: string;
}

export interface ConnectionLine {
  id: string;
  kind: 'partner' | 'parent' | 'union' | 'child';
  path: string;
  edges: Connection[];
  label?: string;
  description?: string;
  highlightStrokes?: HighlightStroke[];
}

const isPartner = (edge: Connection) => ['wife', 'husband'].includes(edge.type);
const parentLink = (edge: Connection) =>
  ['mother', 'father'].includes(edge.type)
    ? { parent: edge.to, child: edge.from, edge }
    : ['son', 'daughter'].includes(edge.type)
      ? { parent: edge.from, child: edge.to, edge }
      : null;

function endpoints(a: Person, b: Person, partner: boolean) {
  const ax = a.x + 110;
  const ay = a.y + 66;
  const bx = b.x + 110;
  const by = b.y + 66;
  return partner
    ? {
        sx: ax + (bx > ax ? 110 : -110),
        sy: ay,
        tx: bx + (bx > ax ? -110 : 110),
        ty: by,
      }
    : {
        sx: ax,
        sy: ay + (by > ay ? 66 : -66),
        tx: bx,
        ty: by + (by > ay ? -66 : 66),
      };
}

// The first half of the symmetric partner Bezier, split exactly at t = 0.5.
// Starting at either endpoint gives that parent's half of the visible line.
function halfPartnerPath(start: Point, end: Point): string {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const control1X = (start.x + midX) / 2;
  const control2X = (start.x + 3 * midX) / 4;
  const control2Y = (3 * start.y + end.y) / 4;
  return `M ${start.x} ${start.y} C ${control1X} ${start.y}, ${control2X} ${control2Y}, ${midX} ${midY}`;
}

export function connectionHighlights(
  lines: ConnectionLine[],
  connectionIds: Set<string>,
): HighlightStroke[] {
  return lines.flatMap((line) =>
    line.highlightStrokes
      ? line.highlightStrokes.filter((stroke) =>
          connectionIds.has(stroke.connectionId),
        )
      : line.edges
          .filter((edge) => connectionIds.has(edge.id))
          .map((edge) => ({
            id: edge.id,
            connectionId: edge.id,
            kind:
              line.kind === 'partner'
                ? ('partner' as const)
                : ('parent' as const),
            path: line.path,
          })),
  );
}

// Rendering groups are derived from the graph; stored parent links stay independent.
export function connectionLayout(graph: FamilyGraph): ConnectionLine[] {
  const people = new Map(graph.people.map((person) => [person.id, person]));
  const partners = graph.connections.filter(isPartner);
  const parentsByChild = new Map<
    string,
    NonNullable<ReturnType<typeof parentLink>>[]
  >();
  for (const edge of graph.connections) {
    const link = parentLink(edge);
    if (link)
      parentsByChild.set(link.child, [
        ...(parentsByChild.get(link.child) || []),
        link,
      ]);
  }
  const families = new Map<
    string,
    { couple: Connection; children: { person: Person; edges: Connection[] }[] }
  >();
  const grouped = new Set<string>();
  for (const [child, links] of parentsByChild) {
    // Only merge explicitly recorded co-parents who have a partner connection.
    const couple = partners.find(
      (edge) =>
        links.some((link) => link.parent === edge.from) &&
        links.some((link) => link.parent === edge.to),
    );
    if (!couple) continue;
    const edges = links
      .filter((link) => [couple.from, couple.to].includes(link.parent))
      .map((link) => link.edge);
    const family = families.get(couple.id) || { couple, children: [] };
    family.children.push({ person: people.get(child)!, edges });
    families.set(couple.id, family);
    edges.forEach((edge) => grouped.add(edge.id));
  }
  const lines: ConnectionLine[] = [];
  for (const { couple, children } of families.values()) {
    const { sx, sy, tx, ty } = endpoints(
      people.get(couple.from)!,
      people.get(couple.to)!,
      true,
    );
    // A symmetric cubic partner curve passes through this exact midpoint.
    const x = (sx + tx) / 2;
    const y = (sy + ty) / 2;
    const below =
      children.reduce((sum, child) => sum + child.person.y + 66 - y, 0) >= 0;
    const targets = children.map((child) => ({
      ...child,
      x: child.person.x + 110,
      y: child.person.y + (below ? 0 : 132),
    }));
    const nearest = below
      ? Math.min(...targets.map((child) => child.y))
      : Math.max(...targets.map((child) => child.y));
    const busY = (y + nearest) / 2;
    const xs = [x, ...targets.map((child) => child.x)];
    lines.push({
      id: `union-${couple.id}`,
      kind: 'union',
      path: `M ${x} ${y} V ${busY} M ${Math.min(...xs)} ${busY} H ${Math.max(...xs)}`,
      edges: [],
    });
    for (const child of targets) {
      const label =
        child.person.gender === 'female'
          ? 'daughter'
          : child.person.gender === 'male'
            ? 'son'
            : 'child';
      lines.push({
        id: `child-${couple.id}-${child.person.id}`,
        kind: 'child',
        path: `M ${child.x} ${busY} V ${child.y}`,
        label,
        edges: child.edges,
        highlightStrokes: child.edges.flatMap((edge) => {
          const parent = parentLink(edge)!.parent;
          const start =
            parent === couple.from ? { x: sx, y: sy } : { x: tx, y: ty };
          const end =
            parent === couple.from ? { x: tx, y: ty } : { x: sx, y: sy };
          // Trace just this parent and child's part of the shared family lines.
          // Drawing the whole union would also light up unrelated siblings.
          return [
            {
              id: `${edge.id}-partner-half`,
              connectionId: edge.id,
              kind: 'partner' as const,
              path: halfPartnerPath(start, end),
            },
            {
              id: `${edge.id}-branch`,
              connectionId: edge.id,
              kind: 'parent' as const,
              path: `M ${x} ${y} V ${busY} H ${child.x} V ${child.y}`,
            },
          ];
        }),
        description: `Remove parent connections for ${child.person.name}`,
      });
    }
  }
  for (const edge of graph.connections) {
    if (grouped.has(edge.id)) continue;
    const a = people.get(edge.from)!;
    const b = people.get(edge.to)!;
    const partner = isPartner(edge);
    const { sx, sy, tx, ty } = endpoints(a, b, partner);
    const midY = (sy + ty) / 2;
    lines.push({
      id: edge.id,
      kind: partner ? 'partner' : 'parent',
      edges: [edge],
      label: edge.type,
      path: partner
        ? `M ${sx} ${sy} C ${(sx + tx) / 2} ${sy}, ${(sx + tx) / 2} ${ty}, ${tx} ${ty}`
        : `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`,
      description: `Delete ${edge.type} connection between ${a.name} and ${b.name}`,
    });
  }
  return lines;
}
