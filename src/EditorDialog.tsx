import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  EditorModal,
  FamilyGraph,
  Gender,
  Person,
  Relationship,
  PartnerReview,
  OtherParentReview as OtherParentReviewData,
} from './types';
import {
  uid,
  TYPES,
  validateGraph,
  addConnection,
  removePerson,
  relativePosition,
} from './graph';
import { errorMessage } from './errors';
import { Cordyceps, X, Check } from './icons';
import PartnerChildrenReview from './PartnerChildrenReview';
import OtherParentReview from './OtherParentReview';
import { partnerChildOptions } from './partner-children';
import { otherParentOptions } from './other-parent';

interface Props {
  modal: Exclude<EditorModal, { kind: 'export' }>;
  graph: FamilyGraph;
  close: () => void;
  commit: (next: FamilyGraph) => void;
  setSelected: (id: string | null) => void;
  setNotice: (message: string) => void;
}

export default function EditorDialog({
  modal,
  graph,
  close,
  commit,
  setSelected,
  setNotice,
}: Props) {
  const [partnerReview, setPartnerReview] = useState<PartnerReview | null>(
    null,
  );
  const [otherParentReview, setOtherParentReview] =
    useState<OtherParentReviewData | null>(null);
  function savePartner(next: FamilyGraph) {
    commit(next);
    setSelected(partnerReview!.partnerId);
    close();
  }
  function saveOtherParent(next: FamilyGraph) {
    commit(next);
    setSelected(otherParentReview!.childId);
    close();
  }
  const source =
    modal.kind === 'relative'
      ? graph.people.find((person) => person.id === modal.source)
      : undefined;
  const existingPerson = 'person' in modal ? modal.person : undefined;
  const [name, setName] = useState(existingPerson?.name || '');
  const [born, setBorn] = useState(existingPerson?.born || '');
  const [gender, setGender] = useState<Gender>(
    existingPerson?.gender || 'unspecified',
  );
  const [notes, setNotes] = useState(existingPerson?.notes || '');
  const [type, setType] = useState<Relationship>('mother');
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const relative = modal.kind === 'relative';
  const editing = modal.kind === 'edit';
  const form = ['person', 'relative', 'edit'].includes(modal.kind);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (!form) return;
      let next: FamilyGraph;
      let id: string;
      if (relative && mode === 'existing') {
        if (!target) throw new Error('Choose a person to connect.');
        next = addConnection(graph, source!.id, target, type);
        id = target;
      } else {
        if (!name.trim()) throw new Error('Please enter a name.');
        id = editing ? modal.person.id : uid();
        const position = relative
          ? relativePosition(graph, source!, type)
          : { x: 450 + graph.people.length * 25, y: 320 };
        const p: Person = {
          id,
          name: name.trim(),
          born,
          gender: relative
            ? ['mother', 'daughter', 'wife'].includes(type)
              ? 'female'
              : 'male'
            : gender,
          notes,
          ...(editing ? { x: modal.person.x, y: modal.person.y } : position),
        };
        next = {
          ...graph,
          people: editing
            ? graph.people.map((old) => (old.id === id ? p : old))
            : [...graph.people, p],
        };
        next = relative
          ? addConnection(next, source!.id, id, type)
          : validateGraph(next);
      }
      if (relative && ['son', 'daughter'].includes(type)) {
        const options = otherParentOptions(next, id, source!.id);
        if (options.length) {
          setOtherParentReview({
            graph: next,
            childId: id,
            childName: next.people.find((person) => person.id === id)!.name,
            options,
          });
          return;
        }
      }
      if (relative && ['wife', 'husband'].includes(type)) {
        const options = partnerChildOptions(next, source!.id, id, type);
        if (options.length) {
          setPartnerReview({
            graph: next,
            partnerId: id,
            sourceName: source!.name,
            options,
          });
          return;
        }
      }
      commit(next);
      setSelected(id);
      close();
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  function confirm() {
    if (modal.kind === 'delete') {
      commit(removePerson(graph, modal.person.id));
      setSelected(null);
    } else if (modal.kind === 'disconnectFamily') {
      const ids = new Set(modal.edges.map((edge) => edge.id));
      commit({
        ...graph,
        connections: graph.connections.filter((edge) => !ids.has(edge.id)),
      });
    } else if (modal.kind === 'disconnect')
      commit({
        ...graph,
        connections: graph.connections.filter((e) => e.id !== modal.edge.id),
      });
    else if (modal.kind === 'reset') {
      commit({
        version: 1,
        title: 'My family tree',
        people: [],
        connections: [],
      });
      setSelected(null);
    } else if (modal.kind === 'import') {
      commit(modal.graph);
      setSelected(null);
      setNotice('Tree imported. Use Fit tree to see everyone.');
    }
    close();
  }
  const titles: Record<Props['modal']['kind'], string> = {
    relative: 'Grow a connection',
    edit: 'A little more about them',
    person: 'Add someone to your story',
    delete: 'Delete this person?',
    disconnectFamily: 'Remove both parent connections?',
    disconnect: 'Remove this connection?',
    import: 'Import this family tree?',
    reset: 'Clear the entire tree?',
  };
  let title = titles[modal.kind];
  if (partnerReview) title = 'Connect their children?';
  if (otherParentReview) title = 'Add another parent?';

  function dialogDescription(): string {
    switch (modal.kind) {
      case 'relative':
        return `Add family to ${source!.name}.`;
      case 'person':
      case 'edit':
        return 'The little details make a person.';
      case 'delete':
        return 'This also removes all of their connections. You can undo this.';
      case 'disconnectFamily':
        return 'This removes this child’s connections to both parents. Everyone stays in the tree. To remove only one parent connection, use the person details sidebar. You can undo this.';
      case 'disconnect':
        return 'Both people will stay in your tree. You can undo this.';
      case 'import':
        return `Replace your current tree with “${modal.graph.title}” (${modal.graph.people.length} people)? You can undo this.`;
      case 'reset':
        return `This will remove all ${graph.people.length} people and all ${graph.connections.length} connections from this device’s tree. Export a copy first if you want to keep it. You can undo this during this session.`;
    }
  }
  const description = dialogDescription();
  return (
    <dialog
      aria-labelledby="dialog-title"
      ref={dialog}
      onCancel={close}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      <div className="modal-head">
        <span className="tree-icon">
          <Cordyceps size={20} />
        </span>
        <button aria-label="Close dialog" onClick={close}>
          <X size={20} />
        </button>
      </div>
      <h2 id="dialog-title">{title}</h2>
      {otherParentReview ? (
        <OtherParentReview
          review={otherParentReview}
          onSave={saveOtherParent}
          onBack={() => setOtherParentReview(null)}
        />
      ) : partnerReview ? (
        <PartnerChildrenReview
          review={partnerReview}
          onSave={savePartner}
          onBack={() => setPartnerReview(null)}
        />
      ) : (
        <>
          <p className="modal-sub">{description}</p>
          {form ? (
            <form onSubmit={submit}>
              {relative && (
                <>
                  <label>
                    Relationship to {source!.name.split(' ')[0]}
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as Relationship)}
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t[0].toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="segmented">
                    <button
                      type="button"
                      className={mode === 'new' ? 'active' : ''}
                      onClick={() => setMode('new')}
                    >
                      New person
                    </button>
                    <button
                      type="button"
                      className={mode === 'existing' ? 'active' : ''}
                      onClick={() => setMode('existing')}
                    >
                      Existing person
                    </button>
                  </div>
                </>
              )}
              {mode === 'existing' ? (
                <label>
                  Choose a person
                  <select
                    required
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  >
                    <option value="">Select someone…</option>
                    {graph.people
                      .filter((p) => p.id !== source?.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <>
                  <label>
                    Full name
                    <input
                      autoFocus
                      required
                      maxLength={100}
                      placeholder="e.g. Skyler White"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Birthday (optional)
                      <input
                        maxLength={20}
                        placeholder="YYYY-MM-DD or year"
                        value={born}
                        onChange={(e) => setBorn(e.target.value)}
                      />
                    </label>
                    {!relative && (
                      <label>
                        Gender
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as Gender)}
                        >
                          <option value="unspecified">Unspecified</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                        </select>
                      </label>
                    )}
                  </div>
                  <label>
                    A little of their story
                    <textarea
                      maxLength={2000}
                      placeholder="A favorite memory, a place they called home…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                </>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <button className="button" type="button" onClick={close}>
                  Cancel
                </button>
                <button className="button green" type="submit">
                  <Check size={16} />
                  {editing
                    ? 'Save changes'
                    : relative
                      ? 'Add connection'
                      : 'Add person'}
                </button>
              </div>
            </form>
          ) : (
            <div className="modal-actions">
              <button className="button" onClick={close}>
                Cancel
              </button>
              <button
                className={`button ${['delete', 'disconnect', 'disconnectFamily', 'reset'].includes(modal.kind) ? 'danger' : 'green'}`}
                onClick={confirm}
              >
                {' '}
                {modal.kind === 'import'
                  ? 'Import tree'
                  : modal.kind === 'reset'
                    ? 'Clear tree'
                    : 'Remove'}
              </button>
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
