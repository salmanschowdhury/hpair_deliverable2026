import { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, X, LoaderCircle } from 'lucide-react';
import { inspectCv } from '../lib/form.js';
export default function CvUpload({ file, setFile, error, setError, onBusy }) {
  const [dragging, setDragging] = useState(false);
  const [checking, setChecking] = useState(false);
  const input = useRef(null);
  const selection = useRef(0);
  async function choose(files) {
    if (!files?.length) return;
    const current = ++selection.current;
    if (files.length > 1) { setError('Choose one CV at a time.'); return; }
    setChecking(true); onBusy(true);
    try { const next = files[0]; const issue = await inspectCv(next); if (selection.current !== current) return; if (issue) { setError(issue); setFile(null); } else { setFile(next); setError(''); } }
    catch { setFile(null); setError('We could not read that file. Please choose it again.'); }
    finally { if (selection.current === current) { setChecking(false); onBusy(false); } }
  }
  return <div className="cv-field"><label htmlFor="cv">Your CV <span className="required">*</span></label><p className="field-hint" id="cv-hint">A little context about the experience you bring.</p><div className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!checking) choose(event.dataTransfer.files); }}><input ref={input} id="cv" type="file" accept=".pdf,application/pdf" aria-label="Upload your CV" aria-describedby={`cv-hint${error ? ' cv-error' : ''}`} aria-invalid={Boolean(error)} disabled={checking} onChange={event => { choose(event.target.files); event.target.value = ''; }} />{checking ? <><LoaderCircle className="spin" size={28}/><strong>Checking your PDF…</strong></> : file ? <><FileText size={29}/><strong className="file-name">{file.name}</strong><span>{Math.ceil(file.size / 1024)} KB · Ready to save <CheckCircle2 size={14}/></span><button className="remove-file" type="button" aria-label="Remove CV" onClick={() => { setFile(null); setError(''); }}><X size={16}/></button></> : <><UploadCloud size={28}/><strong><span className="upload-link">Choose a file</span> or drop it here</strong><span>PDF only · up to 5 MB</span></>}</div>{error && <p className="field-error-text" id="cv-error" role="alert">{error}</p>}<p className="file-privacy">Your CV stays in this browser. Drafts do not include files.</p></div>;
}
