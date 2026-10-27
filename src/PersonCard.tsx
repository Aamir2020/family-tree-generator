import type { PointerEvent } from 'react';
import type { EditorModal, Person } from './types';
import { Pencil, Trash2, Plus } from './icons';
import { initials } from './people';

interface Props {
  person: Person;
  isSelected: boolean;
  isMultiSelected: boolean;
  isMuted: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>, id: string) => void;
  onSelect: (id: string) => void;
  onOpenModal: (modal: EditorModal) => void;
}

export default function PersonCard({
  person,
  isSelected,
  isMultiSelected,
  isMuted,
  onPointerDown,
  onSelect,
  onOpenModal,
}: Props) {
  const className = [
    'person-card',
    person.gender,
    isSelected && 'selected',
    isMultiSelected && 'multi-selected',
    isMuted && 'muted',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View details for ${person.name}`}
      className={className}
      style={{ left: person.x, top: person.y }}
      onPointerDown={(e) => onPointerDown(e, person.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget)
          onSelect(person.id);
      }}
    >
      <div className="card-top">
        <span className="avatar">{initials(person.name)}</span>
        <span className="gender-symbol">
          {person.gender === 'female'
            ? '♀'
            : person.gender === 'male'
              ? '♂'
              : '◌'}
        </span>
        <div className="card-actions">
          <button
            className="card-menu"
            title="Edit person"
            aria-label={`Edit ${person.name}`}
            onClick={() => {
              onSelect(person.id);
              onOpenModal({ kind: 'edit', person });
            }}
          >
            <Pencil size={13} />
          </button>
          <button
            className="card-menu card-delete"
            title="Delete person"
            aria-label={`Delete ${person.name}`}
            onClick={() => onOpenModal({ kind: 'delete', person })}
          >
            <Trash2 size={13} />
          </button>
          <button
            className="card-menu"
            title="Add a relative"
            aria-label={`Add a relative to ${person.name}`}
            onClick={() => {
              onSelect(person.id);
              onOpenModal({ kind: 'relative', source: person.id });
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="person-name">{person.name}</div>
      <div className="person-meta">
        {person.born && (
          <>
            {`b. ${person.born}`}
            <span>•</span>
          </>
        )}
        {person.gender === 'unspecified'
          ? 'Person'
          : person.gender === 'female'
            ? 'Female'
            : 'Male'}
      </div>
      <span className="card-handle" />
    </div>
  );
}
