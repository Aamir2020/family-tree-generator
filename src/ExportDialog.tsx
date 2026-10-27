import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Download, X } from './icons';
interface Props {
  title: string;
  close: () => void;
  onExport: (filename: string) => void;
}

export default function ExportDialog({ title, close, onExport }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [filename, setFilename] = useState(
    title.trim().replace(/[<>:"/\\|?*]/g, '-') || 'family-tree',
  );
  const [error, setError] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = filename
      .trim()
      .replace(/(\.json)+$/i, '')
      .trim();
    if (!name || /^[. ]+$/.test(name)) {
      setError('Please enter a file name.');
      return;
    }
    if (
      /[<>:"/\\|?*]/.test(name) ||
      [...name].some((character) => character.charCodeAt(0) < 32)
    ) {
      setError('Use a file name without these characters: < > : " / \\ | ? *');
      return;
    }
    onExport(name + '.json');
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="export-title"
      onCancel={close}
      onClick={(event) => {
        if (event.target === dialog.current) close();
      }}
    >
      <div className="modal-head">
        <span className="tree-icon">
          <Download size={20} />
        </span>
        <button aria-label="Close dialog" onClick={close}>
          <X size={20} />
        </button>
      </div>
      <h2 id="export-title">Export your tree</h2>
      <p className="modal-sub" id="export-help">
        Choose a name for your backup. The .json extension is added
        automatically.
      </p>
      <form onSubmit={submit}>
        <label>
          File name
          <input
            autoFocus
            required
            maxLength={150}
            value={filename}
            aria-describedby="export-help"
            onChange={(event) => {
              setFilename(event.target.value);
              setError('');
            }}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="button green">
            <Download size={16} />
            Download JSON
          </button>
        </div>
      </form>
    </dialog>
  );
}
