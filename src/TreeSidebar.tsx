import type { EditorModal, FamilyGraph } from './types';
import {
  Cordyceps,
  Plus,
  Upload,
  Download,
  Trash2,
  PanelRightClose,
  ChevronRight,
  X,
  Leaf,
} from './icons';
import { initials, siblingDetails } from './people';

interface Props {
  graph: FamilyGraph;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpenModal: (modal: EditorModal) => void;
  onImport: () => void;
}

export default function TreeSidebar({
  graph,
  selectedId,
  onSelect,
  onOpenModal,
  onImport,
}: Props) {
  const person = graph.people.find((person) => person.id === selectedId);
  const connections = graph.connections.filter(
    (edge) => edge.from === selectedId || edge.to === selectedId,
  );
  const siblings = selectedId ? siblingDetails(graph, selectedId) : [];
  return (
    <aside className="details" aria-label="Tree tools and person details">
      <div className="sidebar-actions">
        <div className="panel-title">TREE TOOLS</div>
        <button
          className="button green full"
          onClick={() => onOpenModal({ kind: 'person' })}
        >
          <Plus size={17} />
          Add person
        </button>
        <div className="file-actions">
          <button className="button" onClick={onImport}>
            <Upload size={15} />
            Import tree
          </button>
          <button
            className="button dark"
            onClick={() => onOpenModal({ kind: 'export' })}
          >
            <Download size={15} />
            Export tree
          </button>
        </div>
        <button
          className="button clear-tree full"
          disabled={!graph.people.length}
          onClick={() => onOpenModal({ kind: 'reset' })}
        >
          <Trash2 size={15} />
          Clear tree
        </button>
      </div>
      <div className="person-panel">
        {person ? (
          <>
            <div className="panel-title">
              PERSON DETAILS
              <button aria-label="Close details" onClick={() => onSelect(null)}>
                <PanelRightClose size={17} />
              </button>
            </div>
            <div className={`detail-avatar ${person.gender}`}>
              {initials(person.name)}
            </div>
            <h2>{person.name}</h2>
            {person.born && <p className="detail-sub">Born {person.born}</p>}
            <button
              className="button full"
              onClick={() => onOpenModal({ kind: 'edit', person })}
            >
              Edit person
              <ChevronRight size={15} />
            </button>
            <div className="section-label">THEIR STORY</div>
            <p className="story">
              {person.notes ||
                'Every person has a story. Add a note to remember the little things.'}
            </p>
            <div className="section-label">
              CONNECTIONS <span>{connections.length + siblings.length}</span>
            </div>
            <div className="relation-list">
              {connections.map((e) => {
                const other = graph.people.find(
                  (p) => p.id === (e.from === selectedId ? e.to : e.from),
                );
                if (!other) return null;
                return (
                  <div className="relation" key={e.id}>
                    <span className={`mini-avatar ${other.gender}`}>
                      {initials(other.name)}
                    </span>
                    <div>
                      <b>{other.name}</b>
                      <small>
                        {e.from === selectedId
                          ? `Their ${e.type}`
                          : `${person.name.split(' ')[0]} is their ${e.type}`}
                      </small>
                    </div>
                    <button
                      aria-label={`Remove connection to ${other.name}`}
                      onClick={() =>
                        onOpenModal({ kind: 'disconnect', edge: e })
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
              {siblings.map(({ person: sibling, relation }) => (
                <div className="relation" key={`sibling-${sibling.id}`}>
                  <span className={`mini-avatar ${sibling.gender}`}>
                    {initials(sibling.name)}
                  </span>
                  <div>
                    <b>{sibling.name}</b>
                    <small>{relation}</small>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="button full dashed"
              onClick={() =>
                onOpenModal({ kind: 'relative', source: person.id })
              }
            >
              <Plus size={16} />
              Add a connection
            </button>
            <button
              className="delete-person"
              onClick={() => onOpenModal({ kind: 'delete', person })}
            >
              <Trash2 size={14} />
              Delete person
            </button>
          </>
        ) : (
          <>
            <div className="panel-title">
              A LITTLE GUIDANCE
              <Leaf size={16} />
            </div>
            <div className="guide-art">
              <Cordyceps size={47} />
              <span className="art-dot one" />
              <span className="art-dot two" />
              <span className="art-dot three" />
            </div>
            <h2>
              A family is a<br />
              beautiful connection.
            </h2>
            <p className="guide-copy">
              Start with someone you know.
              <br />
              Let the story grow from there.
            </p>
            <div className="guide-steps">
              <div>
                <span>01</span>
                <p>
                  <b>Add your people</b>Start fresh or explore this example.
                </p>
              </div>
              <div>
                <span>02</span>
                <p>
                  <b>Make a connection</b>Click + on a person to add family.
                </p>
              </div>
              <div>
                <span>03</span>
                <p>
                  <b>Make it your own</b>Drag people. Keep their stories.
                </p>
              </div>
            </div>
            <div className="privacy">
              <Leaf size={17} />
              <p>
                <b>Your family stays yours.</b>Saved only in this browser.
                Export a copy to keep it safe.
              </p>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
