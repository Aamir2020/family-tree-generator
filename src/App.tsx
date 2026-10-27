import { useEffect, useRef, useState } from 'react';
import {
  Cordyceps,
  Plus,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo2,
  Move,
  Sun,
  Moon,
  Scan,
} from './icons';
import { demo, preloadTree, validateGraph } from './graph';
import FamilyConnections from './FamilyConnections';
import { selectionRectangle, peopleInRectangle, movePeople } from './selection';
import ExportDialog from './ExportDialog';
import EditorDialog from './EditorDialog';
import PersonCard from './PersonCard';
import TreeSidebar from './TreeSidebar';
import { errorMessage } from './errors';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { EditorModal, FamilyGraph, Point, Rectangle } from './types';

type DragState =
  | (Point & { type: 'marquee'; endX: number; endY: number; extend: boolean })
  | (Point & {
      type: 'cards' | 'pan';
      ids: string[];
      startX: number;
      startY: number;
      snapshot: FamilyGraph | null;
      positions: Map<string, Point>;
      moved: boolean;
    });

const KEY = 'kindred-tree-v1';
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return preloadTree(raw ? validateGraph(JSON.parse(raw)) : null);
  } catch {
    return structuredClone(demo);
  }
}
export default function App() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || 'light',
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (themeColor)
      themeColor.content = theme === 'dark' ? '#191f1b' : '#f5f3ed';
    try {
      localStorage.setItem('zermander-theme', theme);
    } catch {
      /* Theme still works when storage is unavailable. */
    }
  }, [theme]);
  const [graph, setGraph] = useState(load);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<Rectangle | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState<EditorModal | null>(null);
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 15 });
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState<FamilyGraph[]>([]);
  const [storageError, setStorageError] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(graph));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [graph]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    function clearSelection(event: KeyboardEvent) {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]'))
        return;
      if (!selectMode && selectedIds.length === 0 && !marquee) return;
      drag.current = null;
      setMarquee(null);
      setSelectedIds([]);
      setSelectMode(false);
    }
    window.addEventListener('keydown', clearSelection);
    return () => window.removeEventListener('keydown', clearSelection);
  }, [selectMode, selectedIds.length, marquee]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    function wheelZoom(event: WheelEvent) {
      event.preventDefault();
      const rect = element!.getBoundingClientRect();
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const nextZoom = Math.max(
        0.15,
        Math.min(2, zoom * Math.exp(-event.deltaY * unit * 0.0015)),
      );
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const ratio = nextZoom / zoom;
      setPan({ x: x - (x - pan.x) * ratio, y: y - (y - pan.y) * ratio });
      setZoom(nextZoom);
    }
    element.addEventListener('wheel', wheelZoom, { passive: false });
    return () => element.removeEventListener('wheel', wheelZoom);
  }, [zoom, pan]);
  function commit(next: FamilyGraph) {
    setSelectedIds((ids) =>
      ids.filter((id) => next.people.some((person) => person.id === id)),
    );
    setHistory((h) => [...h.slice(-29), structuredClone(graph)]);
    setGraph(next);
  }
  function undo() {
    const previous = history.at(-1);
    if (previous) {
      setGraph(previous);
      setHistory((h) => h.slice(0, -1));
    }
  }
  function fit() {
    if (!graph.people.length) {
      setPan({ x: 0, y: 0 });
      setZoom(0.85);
      return;
    }
    const rect = canvas.current!.getBoundingClientRect();
    const xs = graph.people.map((p) => p.x);
    const ys = graph.people.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const width = Math.max(...xs) - minX + 220;
    const height = Math.max(...ys) - minY + 132;
    const scale = Math.min(
      1,
      (rect.width - 100) / width,
      (rect.height - 100) / height,
    );
    setZoom(Math.max(0.15, scale));
    setPan({
      x: (rect.width - width * scale) / 2 - minX * scale,
      y: (rect.height - height * scale) / 2 - minY * scale,
    });
  }
  useEffect(() => {
    fit();
    // Frame the initial tree once; later edits and drags preserve the viewport.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function pointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    id: string | null,
  ) {
    if (
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest('button'))
    )
      return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!id && selectMode) {
      const rect = canvas.current!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      drag.current = {
        type: 'marquee',
        x,
        y,
        endX: x,
        endY: y,
        extend: event.shiftKey,
      };
      setMarquee(selectionRectangle(x, y, x, y));
      return;
    }
    const ids = id
      ? selectMode && selectedIds.includes(id)
        ? selectedIds
        : [id]
      : [];
    if (id && selectMode && !selectedIds.includes(id)) setSelectedIds([id]);
    drag.current = {
      type: id ? 'cards' : 'pan',
      ids,
      startX: event.clientX,
      startY: event.clientY,
      x: pan.x,
      y: pan.y,
      snapshot: id ? structuredClone(graph) : null,
      positions: new Map(
        graph.people
          .filter((person) => ids.includes(person.id))
          .map((person) => [person.id, { x: person.x, y: person.y }]),
      ),
      moved: false,
    };
    if (id) setSelected(id);
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    if (d.type === 'marquee') {
      const rect = canvas.current!.getBoundingClientRect();
      d.endX = event.clientX - rect.left;
      d.endY = event.clientY - rect.top;
      setMarquee(selectionRectangle(d.x, d.y, d.endX, d.endY));
      return;
    }
    const dx = event.clientX - d.startX;
    const dy = event.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.type === 'cards')
      setGraph((current) => ({
        ...current,
        people: movePeople(current.people, d.ids, d.positions, dx, dy, zoom),
      }));
    else setPan({ x: d.x + dx, y: d.y + dy });
  }
  function pointerUp() {
    const d = drag.current;
    if (!d) return;
    if (d.type === 'marquee') {
      const rectangle = selectionRectangle(d.x, d.y, d.endX, d.endY);
      const ids = peopleInRectangle(graph.people, rectangle, pan, zoom);
      setSelectedIds((previous) =>
        d.extend ? [...new Set([...previous, ...ids])] : ids,
      );
      setMarquee(null);
    } else if (d.type === 'cards' && d.moved && d.snapshot)
      setHistory((history) => [...history.slice(-29), d.snapshot!]);
    drag.current = null;
  }
  function exportTree(filename: string) {
    const blob = new Blob([JSON.stringify(graph, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Your family tree has been exported.');
  }
  async function importTree(event: ChangeEvent<HTMLInputElement>) {
    const uploaded = event.target.files?.[0];
    event.target.value = '';
    if (!uploaded) return;
    try {
      if (uploaded.size > 5000000)
        throw new Error('Please choose a file smaller than 5 MB.');
      const next = validateGraph(JSON.parse(await uploaded.text()));
      setModal({ kind: 'import', graph: next });
    } catch (error) {
      setNotice(
        error instanceof SyntaxError
          ? 'This file is not valid JSON.'
          : errorMessage(error),
      );
    }
  }

  return (
    <div className="app">
      <div className="workspace">
        <header>
          <div className="brand">
            <Cordyceps size={34} className="brand-fungus" />
            Zermanzer<span className="brand-dot">.</span>
          </div>
          <div className="header-actions">
            <button
              className="button theme-toggle"
              aria-label={
                theme === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
              title={
                theme === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <span className={`save-status ${storageError ? 'error' : ''}`}>
              <span />
              {storageError ? 'Export to save' : 'Saved on this device'}
            </span>
            <input
              ref={file}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={importTree}
            />
          </div>
        </header>
        <main>
          <div className="editor">
            <div className="editor-top">
              <div className="tree-title">
                <span className="tree-icon">
                  <Cordyceps size={19} />
                </span>
                <input
                  aria-label="Family tree name"
                  value={graph.title}
                  maxLength={80}
                  onChange={(e) =>
                    setGraph({ ...graph, title: e.target.value })
                  }
                />
                <span className="count">{graph.people.length} people</span>
              </div>
              <label className="search">
                <Search size={16} />
                <input
                  aria-label="Find a person"
                  placeholder="Find someone…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setQuery('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
            </div>
            <div className="editor-body">
              <div
                ref={canvas}
                className={`canvas ${selectMode ? 'select-mode' : ''}`}
                onPointerDown={(e) => {
                  if (
                    e.target instanceof Element &&
                    !e.target.closest(
                      '.person-card,.canvas-controls,.canvas-note,.connection-hit',
                    )
                  )
                    pointerDown(e, null);
                }}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={pointerUp}
              >
                <div className="canvas-note">
                  <span className="live-dot" /> YOUR FAMILY TREE
                  <span className="note-divider" />
                  Drag to make it yours
                </div>
                <div
                  className="world"
                  style={{
                    transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                  }}
                >
                  <FamilyConnections
                    graph={graph}
                    onRemove={(edges) =>
                      setModal(
                        edges.length === 1
                          ? { kind: 'disconnect', edge: edges[0] }
                          : { kind: 'disconnectFamily', edges },
                      )
                    }
                  />
                  {graph.people.map((person) => (
                    <PersonCard
                      key={person.id}
                      person={person}
                      isSelected={selected === person.id}
                      isMultiSelected={selectedIds.includes(person.id)}
                      isMuted={Boolean(
                        query &&
                        !person.name
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )}
                      onPointerDown={pointerDown}
                      onSelect={setSelected}
                      onOpenModal={setModal}
                    />
                  ))}
                </div>
                {!graph.people.length && (
                  <div className="empty">
                    <Cordyceps size={44} />
                    <h2>Every story starts with someone.</h2>
                    <p>Add the first person to grow your family tree.</p>
                    <button
                      className="button green"
                      onClick={() => setModal({ kind: 'person' })}
                    >
                      <Plus size={16} />
                      Add your first person
                    </button>
                  </div>
                )}
                {marquee && (
                  <div
                    className="selection-marquee"
                    style={{
                      left: marquee.x,
                      top: marquee.y,
                      width: marquee.width,
                      height: marquee.height,
                    }}
                  />
                )}
                <div className="canvas-controls">
                  <button
                    className={`selection-toggle ${selectMode ? 'active' : ''}`}
                    title="Select multiple people"
                    aria-label="Select multiple people"
                    aria-pressed={selectMode}
                    onClick={() => {
                      setSelectMode((mode) => !mode);
                      setSelectedIds([]);
                      setMarquee(null);
                    }}
                  >
                    <Scan size={16} />
                    {selectMode ? `${selectedIds.length} selected` : 'Select'}
                  </button>
                  <span />
                  <button
                    title="Undo"
                    aria-label="Undo"
                    disabled={!history.length}
                    onClick={undo}
                  >
                    <Undo2 size={17} />
                  </button>
                  <span />
                  <button
                    title="Zoom out"
                    aria-label="Zoom out"
                    onClick={() => setZoom((z) => Math.max(0.15, z - 0.1))}
                  >
                    <ZoomOut size={17} />
                  </button>
                  <b>{Math.round(zoom * 100)}%</b>
                  <button
                    title="Zoom in"
                    aria-label="Zoom in"
                    onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                  >
                    <ZoomIn size={17} />
                  </button>
                  <span />
                  <button title="Fit tree" aria-label="Fit tree" onClick={fit}>
                    <Maximize size={16} />
                  </button>
                </div>
                <div className="canvas-legend">
                  <i />
                  Parent & child
                  <span />
                  <i className="pink" />
                  Partners
                </div>
              </div>
              <TreeSidebar
                graph={graph}
                selectedId={selected}
                onSelect={setSelected}
                onOpenModal={setModal}
                onImport={() => file.current?.click()}
              />
            </div>
            <div className="editor-footer">
              <span>
                <Move size={13} />
                Drag people to rearrange · Select to group and move · Scroll to
                zoom
              </span>
            </div>
          </div>
        </main>
      </div>
      {notice && (
        <div role="status" className="toast">
          {notice}
          <button aria-label="Dismiss message" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal?.kind === 'export' ? (
        <ExportDialog
          title={graph.title}
          close={() => setModal(null)}
          onExport={(filename) => {
            exportTree(filename);
            setModal(null);
          }}
        />
      ) : (
        modal && (
          <EditorDialog
            modal={modal}
            graph={graph}
            close={() => setModal(null)}
            commit={commit}
            setSelected={setSelected}
            setNotice={setNotice}
          />
        )
      )}
    </div>
  );
}
