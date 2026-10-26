import React from 'react';
import { connectionLayout } from './connections';

export default function FamilyConnections({ graph, onRemove }) {
  return <svg className="connections" aria-label="Family connections">
    {connectionLayout(graph).map(line => <g key={line.id} data-connection-kind={line.kind}>
      <path d={line.path} className={line.kind === 'partner' ? 'spouse-line' : 'parent-line'}/>
      {line.label && <g className="edge-label" role="button" tabIndex={0}
        aria-label={line.description} transform={`translate(${line.labelX},${line.labelY})`}
        onClick={() => onRemove(line.edges)} onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRemove(line.edges); }
        }}>
        <rect x="-37" y="-12" width="74" height="24" rx="12"/>
        <text textAnchor="middle" dy="4">{line.label}</text>
      </g>}
    </g>)}
  </svg>;
}
