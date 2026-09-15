import { EMPTY_FORM, cleanForm, inspectCv, validateForm } from './form.js';
const DRAFT_KEY = 'hpair-passport-draft-v1';
const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
export function readDraft(storage = localStorage) {
  try {
    const draft = JSON.parse(storage.getItem(DRAFT_KEY));
    if (!draft || draft.version !== 1 || !Number.isFinite(draft.updatedAt) || Date.now() - draft.updatedAt > DRAFT_TTL || !draft.data || typeof draft.data !== 'object') { storage.removeItem(DRAFT_KEY); return null; }
    const data = { ...EMPTY_FORM };
    for (const key of Object.keys(data)) if (typeof draft.data[key] === typeof data[key] && key !== 'interests') data[key] = draft.data[key];
    data.interests = Array.isArray(draft.data.interests) ? draft.data.interests : [];
    data.consent = false;
    return cleanForm(data);
  } catch { return null; }
}
export function saveDraft(data, storage = localStorage) { storage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, updatedAt: Date.now(), data: { ...cleanForm(data), consent: false } })); }
export function clearDraft(storage = localStorage) { storage.removeItem(DRAFT_KEY); }
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hpair-passport-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('submissions', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Browser storage is unavailable. Allow storage in your browser and try again.'));
    request.onblocked = () => reject(new Error('Close other passport tabs and try again.'));
  });
}
export async function submitProfile(data, cv, id) {
  if (Object.keys(validateForm(data, cv)).length || await inspectCv(cv)) throw new Error('Some details need attention. Return to the form and check your CV and required fields.');
  const receipt = { id, submittedAt: new Date().toISOString(), data: cleanForm(data), cv: { name: cv.name, size: cv.size, type: cv.type || 'application/pdf' } };
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('submissions', 'readwrite');
      // A stable ID makes retries replace the same receipt rather than duplicate it.
      tx.objectStore('submissions').put({ ...receipt, file: cv });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(new Error('We could not save your profile. Check available browser storage and try again.'));
      tx.onabort = () => reject(new Error('Saving was interrupted. Your form is still here; please try again.'));
    });
    return receipt;
  } finally { db.close(); }
}
export async function deleteSubmission(id) {
  const db = await openDatabase();
  try { await new Promise((resolve, reject) => { const tx = db.transaction('submissions', 'readwrite'); tx.objectStore('submissions').delete(id); tx.oncomplete = resolve; tx.onerror = () => reject(new Error('Could not delete this local profile. Please try again.')); tx.onabort = tx.onerror; }); }
  finally { db.close(); }
}
export function summaryText(receipt) {
  const d = receipt.data;
  return ['HPAIR · Delegate passport', 'Local demo receipt — not sent to HPAIR', `Reference: ${receipt.id}`, `Saved: ${new Date(receipt.submittedAt).toLocaleString()}`, '', `Name: ${d.firstName} ${d.lastName}`, `Email: ${d.email}`, `Phone: ${d.phone}`, `Nationality: ${d.nationality}`, `Preferred language: ${d.language}`, `Address: ${[d.address, d.city, d.region, d.postalCode, d.country].filter(Boolean).join(', ')}`, `University / organization: ${d.institution || 'Not provided'}`, `LinkedIn: ${d.hasLinkedIn ? d.linkedIn : 'Not provided'}`, `Interests: ${d.interests.join(', ') || 'Not provided'}`, `Introduction: ${d.introduction || 'Not provided'}`, `CV: ${receipt.cv.name} (${Math.ceil(receipt.cv.size / 1024)} KB)`, '', 'Your CV is stored in this browser. This summary contains its filename, not its contents.'].join('\n');
}
export function downloadSummary(receipt) {
  const url = URL.createObjectURL(new Blob([summaryText(receipt)], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `hpair-passport-${receipt.id.slice(0, 8)}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
