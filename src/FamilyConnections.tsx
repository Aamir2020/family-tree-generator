import type { FamilyGraph, Connection } from './types';
interface Props {
  graph: FamilyGraph;
  onRemove: (edges: Connection[]) => void;
}
import { connectionLayout } from './connections';

export default function FamilyConnections({ graph, onRemove }: Props) {
  return (
    <svg className="connections" aria-label="Family connections">
      {connectionLayout(graph).map((line) => (
        <g key={line.id} data-connection-kind={line.kind}>
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
    </svg>
  );
}
