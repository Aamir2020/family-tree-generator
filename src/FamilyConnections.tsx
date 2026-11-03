import type { FamilyGraph, Connection } from './types';
interface Props {
  graph: FamilyGraph;
  highlight: PathHighlight | null;
  onRemove: (edges: Connection[]) => void;
}
import { connectionLayout, connectionHighlights } from './connections';
import type { PathHighlight } from './path-highlight';

export default function FamilyConnections({
  graph,
  highlight,
  onRemove,
}: Props) {
  const lines = connectionLayout(graph);
  const strokes = highlight
    ? connectionHighlights(lines, highlight.connectionIds)
    : [];
  return (
    <svg className="connections" aria-label="Family connections">
      {lines.map((line) => (
        <g
          key={line.id}
          data-connection-kind={line.kind}
          className={highlight ? 'relationship-muted' : undefined}
        >
          <path
            d={line.path}
            className={line.kind === 'partner' ? 'spouse-line' : 'parent-line'}
          />
          {line.edges.length > 0 && (
            <path
              d={line.path}
              className="connection-hit"
              role="button"
              tabIndex={0}
              aria-label={line.description}
              onClick={() => onRemove(line.edges)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRemove(line.edges);
                }
              }}
            />
          )}
        </g>
      ))}
      <g className="relationship-overlay" aria-hidden="true">
        {strokes.map((stroke) => (
          <path
            key={stroke.id}
            data-connection-id={stroke.connectionId}
            d={stroke.path}
            className={`relationship-path-line ${stroke.kind === 'partner' ? 'relationship-partner-line' : ''}`}
          />
        ))}
      </g>
    </svg>
  );
}
