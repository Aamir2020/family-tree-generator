import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Cordyceps, Plus, Upload, Download, Search, X, Trash2, ZoomIn, ZoomOut, Maximize, Leaf, Users, ChevronRight, Undo2, Link, Check, Move, PanelRightClose, Sun, Moon, Pencil, Scan } from './icons.jsx';
import { demo, preloadTree, uid, TYPES, validateGraph, addConnection, removePerson, relativePosition } from './graph';
import './style.css';
import FamilyConnections from './FamilyConnections';
import PartnerChildrenReview from './PartnerChildrenReview';
import { selectionRectangle, peopleInRectangle, movePeople } from './selection';
import { partnerChildOptions } from './partner-children';
const KEY = 'kindred-tree-v1';
function load() { try { const raw = localStorage.getItem(KEY); return preloadTree(raw ? validateGraph(JSON.parse(raw)) : null); } catch { return structuredClone(demo); } }
const initials = name => name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('');
function App() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => { document.documentElement.dataset.theme = theme; document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#191f1b' : '#f5f3ed'; try { localStorage.setItem('zermander-theme', theme); } catch { /* Theme still works when storage is unavailable. */ } }, [theme]);
  const [graph, setGraph] = useState(load); const [selectMode, setSelectMode] = useState(false); const [selectedIds, setSelectedIds] = useState([]); const [marquee, setMarquee] = useState(null); const [selected, setSelected] = useState(null); const [modal, setModal] = useState(null); const [query, setQuery] = useState(''); const [zoom, setZoom] = useState(.85); const [pan, setPan] = useState({ x: 0, y: 15 }); const [notice, setNotice] = useState(''); const [history, setHistory] = useState([]); const [storageError, setStorageError] = useState(false);
  const file = useRef(); const canvas = useRef(); const drag = useRef(null); const person = graph.people.find(p => p.id === selected);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(graph)); setStorageError(false); } catch { setStorageError(true); } }, [graph]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    function clearSelection(event) {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
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
    function wheelZoom(event) {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const nextZoom = Math.max(.15, Math.min(2, zoom * Math.exp(-event.deltaY * unit * .0015)));
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      const ratio = nextZoom / zoom;
      setPan({ x: x - (x - pan.x) * ratio, y: y - (y - pan.y) * ratio });
      setZoom(nextZoom);
    }
    element.addEventListener('wheel', wheelZoom, { passive: false });
    return () => element.removeEventListener('wheel', wheelZoom);
  }, [zoom, pan]);
  function commit(next) { setSelectedIds(ids => ids.filter(id => next.people.some(person => person.id === id))); setHistory(h => [...h.slice(-29), structuredClone(graph)]); setGraph(next); }
  function undo() { const previous = history.at(-1); if (previous) { setGraph(previous); setHistory(h => h.slice(0, -1)); } }
  function fit() { if (!graph.people.length) { setPan({x:0,y:0}); setZoom(.85); return; } const rect = canvas.current.getBoundingClientRect(); const xs = graph.people.map(p => p.x), ys = graph.people.map(p => p.y); const minX = Math.min(...xs), minY = Math.min(...ys); const width = Math.max(...xs) - minX + 220, height = Math.max(...ys) - minY + 132; const scale = Math.min(1, (rect.width - 100) / width, (rect.height - 100) / height); setZoom(Math.max(.15, scale)); setPan({x:(rect.width-width*scale)/2-minX*scale,y:(rect.height-height*scale)/2-minY*scale}); }
  useEffect(() => { fit(); }, []); // Initial framing; manual drags keep their positions.
  function pointerDown(event, id) {
    if (event.button !== 0 || event.target.closest('button')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!id && selectMode) {
      const rect = canvas.current.getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      drag.current = { type: 'marquee', x, y, endX: x, endY: y, extend: event.shiftKey };
      setMarquee(selectionRectangle(x, y, x, y));
      return;
    }
    const ids = id ? (selectMode && selectedIds.includes(id) ? selectedIds : [id]) : [];
    if (id && selectMode && !selectedIds.includes(id)) setSelectedIds([id]);
    drag.current = {
      type: id ? 'cards' : 'pan', ids, startX: event.clientX, startY: event.clientY,
      x: pan.x, y: pan.y, snapshot: id ? structuredClone(graph) : null,
      positions: new Map(graph.people.filter(person => ids.includes(person.id)).map(person => [person.id, { x: person.x, y: person.y }])),
      moved: false,
    };
    if (id) setSelected(id);
  }
  function pointerMove(event) {
    const d = drag.current;
    if (!d) return;
    if (d.type === 'marquee') {
      const rect = canvas.current.getBoundingClientRect();
      d.endX = event.clientX - rect.left;
      d.endY = event.clientY - rect.top;
      setMarquee(selectionRectangle(d.x, d.y, d.endX, d.endY));
      return;
    }
    const dx = event.clientX - d.startX, dy = event.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.type === 'cards') setGraph(current => ({ ...current, people: movePeople(current.people, d.ids, d.positions, dx, dy, zoom) }));
    else setPan({ x: d.x + dx, y: d.y + dy });
  }
  function pointerUp() {
    const d = drag.current;
    if (!d) return;
    if (d.type === 'marquee') {
      const rectangle = selectionRectangle(d.x, d.y, d.endX, d.endY);
      const ids = peopleInRectangle(graph.people, rectangle, pan, zoom);
      setSelectedIds(previous => d.extend ? [...new Set([...previous, ...ids])] : ids);
      setMarquee(null);
    } else if (d.type === 'cards' && d.moved) setHistory(history => [...history.slice(-29), d.snapshot]);
    drag.current = null;
  }
  function exportTree(filename) { const blob = new Blob([JSON.stringify(graph,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); setNotice('Your family tree has been exported.'); }
  async function importTree(event) { const uploaded=event.target.files[0]; event.target.value=''; if (!uploaded) return; try { if (uploaded.size>5000000) throw new Error('Please choose a file smaller than 5 MB.'); const next=validateGraph(JSON.parse(await uploaded.text())); setModal({kind:'import',graph:next}); } catch(error) { setNotice(error instanceof SyntaxError ? 'This file is not valid JSON.' : error.message); } }
  const connections = graph.connections.filter(e=>e.from===selected || e.to===selected);
  return <div className="app">

    <div className="workspace"><header><div className="brand"><Cordyceps size={34} className="brand-fungus"/>Zermanzer<span className="brand-dot">.</span></div><div className="header-actions"><button className="button theme-toggle" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={theme === 'dark'} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button><span className={`save-status ${storageError?'error':''}`}><span/>{storageError?'Export to save': 'Saved on this device'}</span><input ref={file} type="file" accept=".json,application/json" hidden onChange={importTree}/></div></header>
    <main>
    <div className="editor"><div className="editor-top"><div className="tree-title"><span className="tree-icon"><Cordyceps size={19}/></span><input aria-label="Family tree name" value={graph.title} maxLength={80} onChange={e=>setGraph({...graph,title:e.target.value})}/><span className="count">{graph.people.length} people</span></div><label className="search"><Search size={16}/><input aria-label="Find a person" placeholder="Find someone…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={14}/></button>}</label></div>
    <div className="editor-body"><div ref={canvas} className={`canvas ${selectMode?'select-mode':''}`} onPointerDown={e=>{if(!e.target.closest('.person-card,.canvas-controls,.canvas-note,.connection-hit'))pointerDown(e,null);}} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
    <div className="canvas-note"><span className="live-dot"/> YOUR FAMILY TREE<span className="note-divider"/>Drag to make it yours</div>
    <div className="world" style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}><FamilyConnections graph={graph} onRemove={edges=>setModal(edges.length===1?{kind:'disconnect',edge:edges[0]}:{kind:'disconnectFamily',edges})}/>
    {graph.people.map(p=><div key={p.id} role="button" tabIndex={0} aria-label={`View details for ${p.name}`} className={`person-card ${p.gender} ${selected===p.id?'selected':''} ${selectedIds.includes(p.id)?'multi-selected':''} ${query&&!p.name.toLowerCase().includes(query.toLowerCase())?'muted':''}`} style={{left:p.x,top:p.y}} onPointerDown={e=>pointerDown(e,p.id)} onKeyDown={e=>{if(e.key==='Enter'&&e.target===e.currentTarget)setSelected(p.id);}}><div className="card-top"><span className="avatar">{initials(p.name)}</span><span className="gender-symbol">{p.gender==='female'?'♀':p.gender==='male'?'♂':'◌'}</span><div className="card-actions"><button className="card-menu" title="Edit person" aria-label={`Edit ${p.name}`} onClick={()=>{setSelected(p.id);setModal({kind:'edit',person:p});}}><Pencil size={13}/></button><button className="card-menu card-delete" title="Delete person" aria-label={`Delete ${p.name}`} onClick={()=>setModal({kind:'delete',person:p})}><Trash2 size={13}/></button><button className="card-menu" title="Add a relative" aria-label={`Add a relative to ${p.name}`} onClick={()=>{setSelected(p.id);setModal({kind:'relative',source:p.id});}}><Plus size={16}/></button></div></div><div className="person-name">{p.name}</div><div className="person-meta">{p.born&&<>{`b. ${p.born}`}<span>•</span></>}{p.gender==='unspecified'?'Person':p.gender==='female'?'Female':'Male'}</div><span className="card-handle"/></div>)}
    </div>
    {!graph.people.length&&<div className="empty"><Cordyceps size={44}/><h2>Every story starts with someone.</h2><p>Add the first person to grow your family tree.</p><button className="button green" onClick={()=>setModal({kind:'person'})}><Plus size={16}/>Add your first person</button></div>}
    {marquee&&<div className="selection-marquee" style={{left:marquee.x,top:marquee.y,width:marquee.width,height:marquee.height}}/>}
    <div className="canvas-controls"><button className={`selection-toggle ${selectMode?'active':''}`} title="Select multiple people" aria-label="Select multiple people" aria-pressed={selectMode} onClick={()=>{setSelectMode(mode=>!mode);setSelectedIds([]);setMarquee(null);}}><Scan size={16}/>{selectMode?`${selectedIds.length} selected`:'Select'}</button><span/><button title="Undo" aria-label="Undo" disabled={!history.length} onClick={undo}><Undo2 size={17}/></button><span/><button title="Zoom out" aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.15,z-.1))}><ZoomOut size={17}/></button><b>{Math.round(zoom*100)}%</b><button title="Zoom in" aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(2,z+.1))}><ZoomIn size={17}/></button><span/><button title="Fit tree" aria-label="Fit tree" onClick={fit}><Maximize size={16}/></button></div><div className="canvas-legend"><i/>Parent & child<span/><i className="pink"/>Partners</div>
    </div>
    <aside className="details" aria-label="Tree tools and person details"><div className="sidebar-actions"><div className="panel-title">TREE TOOLS</div><button className="button green full" onClick={()=>setModal({kind:'person'})}><Plus size={17}/>Add person</button><div className="file-actions"><button className="button" onClick={()=>file.current.click()}><Upload size={15}/>Import tree</button><button className="button dark" onClick={()=>setModal({kind:'export'})}><Download size={15}/>Export tree</button></div><button className="button clear-tree full" disabled={!graph.people.length} onClick={()=>setModal({kind:'reset'})}><Trash2 size={15}/>Clear tree</button></div><div className="person-panel">{person?<><div className="panel-title">PERSON DETAILS<button aria-label="Close details" onClick={()=>setSelected(null)}><PanelRightClose size={17}/></button></div><div className={`detail-avatar ${person.gender}`}>{initials(person.name)}</div><h2>{person.name}</h2>{person.born&&<p className="detail-sub">Born {person.born}</p>}<button className="button full" onClick={()=>setModal({kind:'edit',person})}>Edit person<ChevronRight size={15}/></button><div className="section-label">THEIR STORY</div><p className="story">{person.notes||'Every person has a story. Add a note to remember the little things.'}</p><div className="section-label">CONNECTIONS <span>{connections.length}</span></div><div className="relation-list">{connections.map(e=>{const other=graph.people.find(p=>p.id===(e.from===selected?e.to:e.from)); return <div className="relation" key={e.id}><span className={`mini-avatar ${other.gender}`}>{initials(other.name)}</span><div><b>{other.name}</b><small>{e.from===selected?`Their ${e.type}`:`${person.name.split(' ')[0]} is their ${e.type}`}</small></div><button aria-label={`Remove connection to ${other.name}`} onClick={()=>setModal({kind:'disconnect',edge:e})}><X size={14}/></button></div>;})}</div><button className="button full dashed" onClick={()=>setModal({kind:'relative',source:selected})}><Plus size={16}/>Add a connection</button><button className="delete-person" onClick={()=>setModal({kind:'delete',person})}><Trash2 size={14}/>Delete person</button></>:<><div className="panel-title">A LITTLE GUIDANCE<Leaf size={16}/></div><div className="guide-art"><Cordyceps size={47}/><span className="art-dot one"/><span className="art-dot two"/><span className="art-dot three"/></div><h2>A family is a<br/>beautiful connection.</h2><p className="guide-copy">Start with someone you know.<br/>Let the story grow from there.</p><div className="guide-steps"><div><span>01</span><p><b>Add your people</b>Start fresh or explore this example.</p></div><div><span>02</span><p><b>Make a connection</b>Click + on a person to add family.</p></div><div><span>03</span><p><b>Make it your own</b>Drag people. Keep their stories.</p></div></div><div className="privacy"><Leaf size={17}/><p><b>Your family stays yours.</b>Saved only in this browser. Export a copy to keep it safe.</p></div></> }</div></aside></div>
    <div className="editor-footer"><span><Move size={13}/>Drag people to rearrange · Select to group and move · Scroll to zoom</span></div></div></main></div>
    {notice&&<div role="status" className="toast">{notice}<button aria-label="Dismiss message" onClick={()=>setNotice('')}><X size={16}/></button></div>}
    {modal?.kind==='export'?<ExportDialog title={graph.title} close={()=>setModal(null)} onExport={filename=>{exportTree(filename);setModal(null);}}/>:modal&&<Modal modal={modal} graph={graph} close={()=>setModal(null)} commit={commit} setSelected={setSelected} setNotice={setNotice}/>}
  </div>;
}

function ExportDialog({ title, close, onExport }) {
  const dialog = useRef();
  const [filename, setFilename] = useState(title.trim().replace(/[<>:"/\\|?*]/g, '-') || 'family-tree');
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  function submit(event) {
    event.preventDefault();
    const name = filename.trim().replace(/(\.json)+$/i, '').trim();
    if (!name || /^[. ]+$/.test(name)) { setError('Please enter a file name.'); return; }
    if (/[<>:"/\\|?*]/.test(name) || [...name].some(character => character.charCodeAt(0) < 32)) { setError('Use a file name without these characters: < > : " / \\ | ? *'); return; }
    onExport(name + '.json');
  }
  return <dialog ref={dialog} aria-labelledby="export-title" onCancel={close} onClick={event => { if (event.target === dialog.current) close(); }}>
    <div className="modal-head"><span className="tree-icon"><Download size={20}/></span><button aria-label="Close dialog" onClick={close}><X size={20}/></button></div>
    <h2 id="export-title">Export your tree</h2>
    <p className="modal-sub" id="export-help">Choose a name for your backup. The .json extension is added automatically.</p>
    <form onSubmit={submit}>
      <label>File name<input autoFocus required maxLength={150} value={filename} aria-describedby="export-help" onChange={event => { setFilename(event.target.value); setError(''); }}/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="button" onClick={close}>Cancel</button><button type="submit" className="button green"><Download size={16}/>Download JSON</button></div>
    </form>
  </dialog>;
}

function Modal({modal,graph,close,commit,setSelected,setNotice}) {
  const [partnerReview, setPartnerReview] = useState(null);
  function savePartner(next) { commit(next); setSelected(partnerReview.partnerId); close(); }
  const source=graph.people.find(p=>p.id===modal.source); const [name,setName]=useState(modal.person?.name||''); const [born,setBorn]=useState(modal.person?.born||''); const [gender,setGender]=useState(modal.person?.gender||'unspecified'); const [notes,setNotes]=useState(modal.person?.notes||''); const [type,setType]=useState('mother'); const [mode,setMode]=useState('new'); const [target,setTarget]=useState(''); const [error,setError]=useState(''); const dialog=useRef();
  useEffect(()=>{dialog.current.showModal();},[]);
  const relative=modal.kind==='relative'; const editing=modal.kind==='edit'; const form=['person','relative','edit'].includes(modal.kind);
  function submit(event) { event.preventDefault(); try { if (!form) return; let next; let id;
    if(relative&&mode==='existing') { if(!target)throw new Error('Choose a person to connect.'); next=addConnection(graph,source.id,target,type); id=target; }
    else { if(!name.trim())throw new Error('Please enter a name.'); id=editing?modal.person.id:uid(); const position=relative?relativePosition(graph,source,type):{x:450+graph.people.length*25,y:320}; const p={id,name:name.trim(),born,gender:relative?['mother','daughter','wife'].includes(type)?'female':'male':gender,notes,...(editing?{x:modal.person.x,y:modal.person.y}:position)}; next={...graph,people:editing?graph.people.map(old=>old.id===id?p:old):[...graph.people,p]}; next=relative?addConnection(next,source.id,id,type):validateGraph(next); }
    if (relative && ['wife','husband'].includes(type)) {
      const options = partnerChildOptions(next, source.id, id, type);
      if (options.length) { setPartnerReview({ graph: next, partnerId: id, sourceName: source.name, options }); return; }
    }
    commit(next); setSelected(id); close();
  } catch(err) { setError(err.message); } }
  function confirm() { if(modal.kind==='delete'){commit(removePerson(graph,modal.person.id));setSelected(null);} else if(modal.kind==='disconnectFamily'){const ids=new Set(modal.edges.map(edge=>edge.id));commit({...graph,connections:graph.connections.filter(edge=>!ids.has(edge.id))});}else if(modal.kind==='disconnect')commit({...graph,connections:graph.connections.filter(e=>e.id!==modal.edge.id)});else if(modal.kind==='reset'){commit({version:1,title:'My family tree',people:[],connections:[]});setSelected(null);}else if(modal.kind==='import'){commit(modal.graph);setSelected(null);setNotice('Tree imported. Use Fit tree to see everyone.');} close(); }
  return <dialog aria-labelledby="dialog-title" ref={dialog} onCancel={close} onClick={e=>{if(e.target===dialog.current)close();}}><div className="modal-head"><span className="tree-icon"><Cordyceps size={20}/></span><button aria-label="Close dialog" onClick={close}><X size={20}/></button></div><h2 id="dialog-title">{partnerReview?'Connect their children?':relative?'Grow a connection':editing?'A little more about them':modal.kind==='person'?'Add someone to your story':modal.kind==='delete'?'Delete this person?':modal.kind==='disconnectFamily'?'Remove both parent connections?':modal.kind==='disconnect'?'Remove this connection?':modal.kind==='import'?'Import this family tree?':'Clear the entire tree?'}</h2>{partnerReview?<PartnerChildrenReview review={partnerReview} onSave={savePartner} onBack={()=>setPartnerReview(null)}/>:<><p className="modal-sub">{relative?`Add family to ${source.name}.`:form?'The little details make a person.':modal.kind==='delete'?'This also removes all of their connections. You can undo this.':modal.kind==='disconnectFamily'?'This removes this child’s connections to both parents. Everyone stays in the tree. To remove only one parent connection, use the person details sidebar. You can undo this.':modal.kind==='disconnect'?'Both people will stay in your tree. You can undo this.':modal.kind==='import'?`Replace your current tree with “${modal.graph.title}” (${modal.graph.people.length} people)? You can undo this.`:`This will remove all ${graph.people.length} people and all ${graph.connections.length} connections from this device’s tree. Export a copy first if you want to keep it. You can undo this during this session.`}</p>
  {form?<form onSubmit={submit}>{relative&&<><label>Relationship to {source.name.split(' ')[0]}<select value={type} onChange={e=>setType(e.target.value)}>{TYPES.map(t=><option key={t} value={t}>{t[0].toUpperCase()+t.slice(1)}</option>)}</select></label><div className="segmented"><button type="button" className={mode==='new'?'active':''} onClick={()=>setMode('new')}>New person</button><button type="button" className={mode==='existing'?'active':''} onClick={()=>setMode('existing')}>Existing person</button></div></>}
  {mode==='existing'?<label>Choose a person<select required value={target} onChange={e=>setTarget(e.target.value)}><option value="">Select someone…</option>{graph.people.filter(p=>p.id!==source?.id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>:<><label>Full name<input autoFocus required maxLength={100} placeholder="e.g. Skyler White" value={name} onChange={e=>setName(e.target.value)}/></label><div className="form-row"><label>Birthday (optional)<input maxLength={20} placeholder="YYYY-MM-DD or year" value={born} onChange={e=>setBorn(e.target.value)}/></label>{!relative&&<label>Gender<select value={gender} onChange={e=>setGender(e.target.value)}><option value="unspecified">Unspecified</option><option value="female">Female</option><option value="male">Male</option></select></label>}</div><label>A little of their story<textarea maxLength={2000} placeholder="A favorite memory, a place they called home…" value={notes} onChange={e=>setNotes(e.target.value)}/></label></>}{error&&<p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button className="button" type="button" onClick={close}>Cancel</button><button className="button green" type="submit"><Check size={16}/>{editing?'Save changes':relative?'Add connection':'Add person'}</button></div></form>:<div className="modal-actions"><button className="button" onClick={close}>Cancel</button><button className={`button ${['delete','disconnect','disconnectFamily','reset'].includes(modal.kind)?'danger':'green'}`} onClick={confirm}> {modal.kind==='import'?'Import tree':modal.kind==='reset'?'Clear tree':'Remove'}</button></div>}</>}</dialog>;
}
createRoot(document.getElementById('root')).render(<App/>);
