import { useId } from 'react';
import type { FamilyGraph, Person } from './types';
import type { KinshipResult } from './kinship';

interface Props {
  graph: FamilyGraph;
  person: Person;
  targetId: string;
  result: KinshipResult | null;
  onTargetChange: (id: string) => void;
}

export default function RelationshipFinder({
  graph,
  person,
  targetId,
  result,
  onTargetChange,
}: Props) {
  const selectId = useId();
  const helpId = useId();
  const target = graph.people.find((candidate) => candidate.id === targetId);
  const options = graph.people
    .filter((candidate) => candidate.id !== person.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="relationship-finder" aria-label="Relationship finder">
      <div className="section-label">FIND RELATIONSHIP</div>
      <p id={helpId} className="relationship-help">
        How is someone related to {person.name}?
      </p>
      <label htmlFor={selectId}>Compare with</label>
      <select
        id={selectId}
        value={target?.id ?? ''}
        aria-describedby={helpId}
        disabled={!options.length}
        onChange={(event) => onTargetChange(event.target.value)}
      >
        <option value="">
          {options.length ? 'Choose a person…' : 'Add another person first'}
        </option>
        {options.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name}
          </option>
        ))}
      </select>
      <div role="status" aria-live="polite" aria-atomic="true">
        {target && result && (
          <div className="relationship-result">
            {result.kind === 'unconnected' ? (
              <p>
                No recorded connection between {person.name} and {target.name}.
              </p>
            ) : result.kind === 'connected' ? (
              <p>
                {person.name} and {target.name} are connected through the tree.
              </p>
            ) : (
              <p>
                <strong>{target.name}</strong> is <strong>{person.name}</strong>
                ’s <strong>{result.label}</strong>.
              </p>
            )}
            {result.detail && (
              <p className="relationship-note">{result.detail}</p>
            )}
            {result.path.length > 1 && (
              <p className="relationship-note">
                The connection is highlighted on the tree.
              </p>
            )}
            {result.path.length > 1 && (
              <details>
                <summary>Show connection path</summary>
                <ol aria-label="Connection path">
                  {result.path.map((id) => (
                    <li key={id}>
                      {
                        graph.people.find((candidate) => candidate.id === id)
                          ?.name
                      }
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <button
              type="button"
              className="button relationship-clear"
              onClick={() => onTargetChange('')}
            >
              Clear comparison
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
