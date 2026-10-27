import { useState } from 'react';
import type { FormEvent } from 'react';
import type { FamilyGraph, OtherParentReview as ReviewData } from './types';
import { errorMessage } from './errors';
interface Props {
  review: ReviewData;
  onSave: (next: FamilyGraph) => void;
  onBack: () => void;
}
import { Check } from './icons';
import { connectOtherParent } from './other-parent';

export default function OtherParentReview({ review, onSave, onBack }: Props) {
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const option = review.options.find(
      (item) => `${item.person.id}:${item.role}` === selected,
    );
    if (!option) {
      setError('Choose an existing person, or skip this step.');
      return;
    }
    try {
      onSave(
        connectOtherParent(review.graph, {
          ...option,
          childId: review.childId,
        }),
      );
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  return (
    <>
      <p className="modal-sub">
        Would you like to add an existing person as {review.childName}’s other
        parent?
      </p>
      <form onSubmit={save}>
        <fieldset className="children-picker">
          <legend>Other parent</legend>
          {review.options.map((option) => {
            const value = `${option.person.id}:${option.role}`;
            return (
              <label key={value} className="child-option">
                <input
                  type="radio"
                  name="other-parent"
                  value={value}
                  checked={selected === value}
                  onChange={() => {
                    setSelected(value);
                    setError('');
                  }}
                />
                <span>
                  <b>{option.person.name}</b>
                  <small>
                    {option.role[0].toUpperCase() + option.role.slice(1)}
                  </small>
                </span>
              </label>
            );
          })}
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions partner-actions">
          <button className="button" type="button" onClick={onBack}>
            Back
          </button>
          <button
            className="button"
            type="button"
            onClick={() => onSave(review.graph)}
          >
            No, thanks
          </button>
          <button className="button green" type="submit" disabled={!selected}>
            <Check size={16} />
            Add other parent
          </button>
        </div>
      </form>
    </>
  );
}
