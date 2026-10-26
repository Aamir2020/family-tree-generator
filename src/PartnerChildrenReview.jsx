import React, { useState } from 'react';
import { Check } from './icons';
import { connectPartnerChildren } from './partner-children';

export default function PartnerChildrenReview({ review, onSave, onBack }) {
  const { graph, partnerId, sourceName, options } = review;
  const partner = graph.people.find(person => person.id === partnerId);
  const [selected, setSelected] = useState(() => options.filter(option => !option.reason).map(option => option.child.id));
  const [error, setError] = useState('');
  function save(event) {
    event.preventDefault();
    try { onSave(connectPartnerChildren(graph, partnerId, options, selected)); }
    catch (error) { setError(error.message); }
  }
  return <>
    <p className="modal-sub">{sourceName} already has children. Should {partner.name} also be connected as their {options[0].role}? Select the children to connect. Existing parent relationships will be kept.</p>
    <form onSubmit={save}>
      <fieldset className="children-picker"><legend>Children to connect</legend>
        {options.map(({ child, reason }) => <label key={child.id} className={`child-option ${reason ? 'unavailable' : ''}`}>
          <input type="checkbox" checked={selected.includes(child.id)} disabled={Boolean(reason)} onChange={event => setSelected(ids => event.target.checked ? [...ids, child.id] : ids.filter(id => id !== child.id))}/>
          <span><b>{child.name}</b>{reason && <small>{reason}</small>}</span>
        </label>)}
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions partner-actions">
        <button className="button" type="button" onClick={onBack}>Back</button>
        <button className="button" type="button" onClick={() => onSave(graph)}>Only add partner</button>
        <button className="button green" type="submit" disabled={!selected.length}><Check size={16}/>Connect selected</button>
      </div>
    </form>
  </>;
}
