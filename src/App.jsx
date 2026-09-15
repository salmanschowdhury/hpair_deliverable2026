import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, Check, CheckCircle2, LockKeyhole, Globe2, X, Download, LoaderCircle, ShieldCheck, RotateCcw, Sparkles, CircleHelp } from 'lucide-react';
import Field from './components/Field.jsx';
import Passport from './components/Passport.jsx';
import CvUpload from './components/CvUpload.jsx';
import Review from './components/Review.jsx';
import { EMPTY_FORM, STEPS, INTERESTS, validateField, validateForm, progressOf } from './lib/form.js';
import { readDraft, saveDraft, clearDraft, submitProfile, downloadSummary, deleteSubmission } from './lib/storage.js';

export default function App() {
  const [restored] = useState(() => readDraft());
  const [data, setData] = useState(() => restored || { ...EMPTY_FORM, interests: [] });
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState(0);
  const [touched, setTouched] = useState({});
  const [cv, setCv] = useState(null);
  const [cvError, setCvError] = useState('');
  const [checkingCv, setCheckingCv] = useState(false);
  const [remember, setRemember] = useState(Boolean(restored));
  const [draftStatus, setDraftStatus] = useState(restored ? 'Draft restored. Please reattach your CV.' : '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [deleted, setDeleted] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const submissionId = useRef(crypto.randomUUID());
  const inFlight = useRef(false);
  const heading = useRef(null);
  const dialog = useRef(null);
  const privacyTrigger = useRef(null);
  const progress = progressOf(data, cv);
  const errors = validateForm(data, cv);
  const canSubmit = !Object.keys(errors).length && !cvError && !checkingCv;

  useEffect(() => {
    if (!remember || receipt) return;
    const timer = setTimeout(() => { try { saveDraft(data); setDraftStatus('Draft saved on this device'); } catch { setDraftStatus('Draft could not be saved. Keep this tab open.'); } }, 600);
    return () => clearTimeout(timer);
  }, [data, remember, receipt]);
  useEffect(() => { if (showPrivacy) dialog.current?.showModal(); }, [showPrivacy]);
  function change(name, value) { setData(previous => ({ ...previous, [name]: value, ...(name === 'hasLinkedIn' && !value ? { linkedIn: '' } : {}) })); setSubmitError(''); }
  function blur(name) { setTouched(previous => ({ ...previous, [name]: true })); }
  function navigate(next) { setStep(next); setVisited(previous => Math.max(previous, next)); setSubmitError(''); requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' }); }); }
  function field(name, label, props = {}) { return <Field key={name} name={name} label={label} value={data[name]} onChange={change} onBlur={blur} touched={touched[name]} error={validateField(name, data[name], data)} {...props}/>; }
  async function advance(event) {
    event.preventDefault();
    if (inFlight.current || checkingCv) return;
    const relevant = STEPS[step].fields;
    setTouched(previous => ({ ...previous, ...Object.fromEntries(relevant.map(name => [name, true])) }));
    if (step === 2 && !cv) setCvError('Add your CV as a PDF.');
    const invalid = relevant.find(name => errors[name]);
    if (invalid || (step === 2 && cvError)) { requestAnimationFrame(() => document.getElementById(invalid || 'cv')?.focus()); return; }
    if (step < 3) { navigate(step + 1); return; }
    if (!canSubmit) { const first = STEPS.findIndex(section => section.fields.some(name => errors[name])); navigate(Math.max(0, first)); return; }
    inFlight.current = true; setSubmitting(true); setSubmitError('');
    try {
      const result = await submitProfile(data, cv, submissionId.current);
      setReceipt(result); setRemember(false);
      try { clearDraft(); } catch { /* Saving succeeded even if draft cleanup is blocked. */ }
      requestAnimationFrame(() => heading.current?.focus());
    } catch (error) { setSubmitError(error.message || 'We could not save your profile. Please try again.'); }
    finally { inFlight.current = false; setSubmitting(false); }
  }
  function toggleRemember(value) {
    setRemember(value);
    if (!value) { try { clearDraft(); setDraftStatus('Draft removed from this device'); } catch { setDraftStatus('Could not remove the draft. Clear site data in browser settings.'); } }
  }
  function reset() {
    try { clearDraft(); } catch { setDraftStatus('Could not remove the saved draft. Clear site data in browser settings.'); return; }
    setData({ ...EMPTY_FORM, interests: [] }); setCv(null); setCvError(''); setTouched({}); setReceipt(null); setDeleted(false); setRemember(false); setDraftStatus(''); setShowReset(false); setVisited(0); submissionId.current = crypto.randomUUID(); navigate(0);
  }
  async function eraseProfile() {
    setSubmitting(true); setSubmitError('');
    try { await deleteSubmission(receipt.id); setDeleted(true); } catch(error) { setSubmitError(error.message); }
    finally { setSubmitting(false); }
  }
  return <>
    <a className="skip-link" href="#main">Skip to form</a>
    <header className="site-header"><a className="brand" href="/" aria-label="HPAIR delegate passport home"><span className="brand-symbol">H</span><span className="brand-name">HPAIR<span>HARVARD PROJECT FOR ASIAN & INTERNATIONAL RELATIONS</span></span></a><div className="header-right"><span className="edition">THE NEXT GENERATION OF IDEAS</span><span className="year-badge">2026 / 27</span></div></header>
    <main id="main" className="page-shell">
      <div className="intro"><div><p className="eyebrow"><span/>MANY PERSPECTIVES. ONE COMMUNITY.</p><h1>A world of ideas.<br className="mobile-break"/> <em>Starting with you.</em></h1><p>Tell us a little about yourself. Let’s make meaningful connections.</p></div><div className="intro-note"><Globe2 size={18}/><span>Different backgrounds.<br/><strong>Limitless possibilities.</strong></span></div></div>
      <div className="workspace">
        <div className="form-column">
          <nav className="stepper" aria-label="Form progress"><ol>{STEPS.map((section, index) => <li key={section.short} className={`${step === index ? 'active' : ''} ${index < step || receipt ? 'complete' : ''}`}><button type="button" disabled={index > visited || submitting || Boolean(receipt)} aria-current={step === index && !receipt ? 'step' : undefined} onClick={() => navigate(index)}><span className="step-number">{index < step || receipt ? <Check size={14}/> : `0${index + 1}`}</span><span>{section.short}</span></button></li>)}</ol></nav>
          <section className={`form-card ${receipt ? 'success-card' : ''}`} aria-labelledby="section-heading">
            {receipt ? <div className="success-content"><div className="success-icon"><CheckCircle2 size={34}/></div><p className="eyebrow">INTRODUCTION, COMPLETE.</p><h2 id="section-heading" ref={heading} tabIndex={-1}>Looking good, {data.firstName}.</h2><p>Your delegate profile {deleted ? 'has been deleted from' : 'was successfully saved in'} this browser.</p><div className="receipt-box"><span>YOUR LOCAL REFERENCE</span><strong>{receipt.id.slice(0, 8).toUpperCase()}</strong><p>{deleted ? 'Your information remains on this screen until you start again or close the tab.' : 'This is an interview demo. Nothing was sent to HPAIR. Download a copy for your records.'}</p></div><button className="button primary" onClick={() => downloadSummary(receipt)}><Download size={17}/>Download your summary</button><button className="button secondary" onClick={reset}>Create another profile <ArrowRight size={17}/></button>{!deleted && <button className="text-button delete-button" disabled={submitting} onClick={eraseProfile}>{submitting ? 'Deleting…' : 'Delete this saved demo profile'}</button>}{submitError && <p role="alert" className="submission-error">{submitError}</p>}</div> : <>
              <div className="section-top"><span className="eyebrow">YOUR DELEGATE PASSPORT</span><span className="step-count">STEP {step + 1} OF 4</span></div><h2 ref={heading} tabIndex={-1} id="section-heading">{STEPS[step].title}</h2><p className="section-description">{STEPS[step].description}</p>
              <form onSubmit={advance} noValidate>
                <fieldset disabled={submitting} className="form-fields"><legend className="sr-only">{STEPS[step].short}</legend>
                {step === 0 && <><div className="form-grid">{field('firstName', 'First name', {required:true, autoComplete:'given-name', placeholder:'e.g. Alex', maxLength:200})}{field('lastName', 'Last name', {required:true, autoComplete:'family-name', placeholder:'e.g. Chen', maxLength:200})}</div>{field('email', 'Email address', {required:true, autoComplete:'email', type:'email', placeholder:'you@example.com', hint:'The email you prefer to be reached at.', maxLength:200})}<div className="form-grid">{field('nationality', 'Nationality', {required:true, placeholder:'e.g. Singaporean', maxLength:200, hint:'Multiple nationalities? Add them here.'})}{field('language', 'Preferred language', {required:true, children:<><option value="">Select a language</option>{['English','Arabic','Bengali','Chinese (Mandarin)','French','German','Hindi','Indonesian','Japanese','Korean','Malay','Portuguese','Spanish','Tamil','Thai','Urdu','Vietnamese','Other'].map(language => <option key={language}>{language}</option>)}</>})}</div><div className="callout"><Sparkles size={19}/><p><strong>A small introduction. A bigger conversation.</strong><br/>Your perspective is what makes this community richer.</p></div></>}
                {step === 1 && <>{field('phone', 'Phone number', {required:true,type:'tel',autoComplete:'tel',placeholder:'+1 202 555 0123',hint:'Include your country calling code.',maxLength:40})}{field('address', 'Street address', {required:true,autoComplete:'street-address',placeholder:'Street and building or apartment',maxLength:200})}<div className="form-grid">{field('city', 'City', {required:true,autoComplete:'address-level2',placeholder:'City or locality',maxLength:200})}{field('country', 'Country / territory', {required:true,autoComplete:'country-name',placeholder:'Country or territory',maxLength:200})}</div><div className="form-grid">{field('region', 'State / province / region', {autoComplete:'address-level1',maxLength:200})}{field('postalCode', 'Postal code', {autoComplete:'postal-code',maxLength:30})}</div><p className="quiet-note"><Globe2 size={16}/>No postal code where you live? You can leave it blank.</p></>}
                {step === 2 && <>{field('institution', 'University / organization', {autoComplete:'organization',placeholder:'Where you study, work, or create',maxLength:200})}<CvUpload file={cv} setFile={setCv} error={cvError} setError={setCvError} onBusy={setCheckingCv}/><label className="checkbox-row linkedin-toggle"><input type="checkbox" checked={data.hasLinkedIn} onChange={event => change('hasLinkedIn', event.target.checked)}/><span>I’d like to share my LinkedIn profile</span></label>{data.hasLinkedIn && field('linkedIn', 'LinkedIn profile', {required:true,type:'url',placeholder:'https://www.linkedin.com/in/your-name',maxLength:200})}<fieldset className="interest-field"><legend>What sparks your curiosity? <span className="optional">Optional</span></legend><p className="field-hint">Pick the conversations you’d love to be part of.</p><div className="interest-chips">{INTERESTS.map(interest => <label className={data.interests.includes(interest) ? 'selected' : ''} key={interest}><input type="checkbox" checked={data.interests.includes(interest)} onChange={event => change('interests', event.target.checked ? [...data.interests, interest] : data.interests.filter(item => item !== interest))}/>{data.interests.includes(interest) && <Check size={12}/>}<span>{interest}</span></label>)}</div></fieldset><div className="field"><label htmlFor="introduction">One thing we should know about you <span className="optional">Optional</span></label><textarea id="introduction" value={data.introduction} maxLength={500} rows={3} placeholder="An idea you’re exploring. A cause you care about. A story that’s yours." onChange={event => change('introduction', event.target.value)} aria-describedby="intro-count"/><p className="character-count" id="intro-count">{data.introduction.length} / 500</p></div></>}
                {step === 3 && <><Review data={data} file={cv} edit={navigate}/><div className="review-notice"><ShieldCheck size={21}/><p><strong>You’re in control of your information.</strong><br/>This demo saves your profile and CV only in this browser. It does not submit an HPAIR application.</p></div><label className="checkbox-row consent"><input id="consent" type="checkbox" checked={data.consent} onChange={event => change('consent', event.target.checked)} aria-describedby="consent-note"/><span>I’ve reviewed my details and agree to save this demo profile on this device.</span></label><p className="field-hint" id="consent-note">You can download a summary or delete the saved profile after saving.</p></>}
                </fieldset>
                {submitError && <div className="submission-error" role="alert"><strong>Your profile hasn’t been saved.</strong><p>{submitError}</p></div>}
                <div className="form-navigation"><span className="required-note">{step < 3 ? <><span>*</span> Required fields</> : 'Ready when you are.'}</span><div>{step > 0 && <button type="button" className="back-button" disabled={submitting || checkingCv} onClick={() => navigate(step - 1)}><ArrowLeft size={16}/>Back</button>}<button type="submit" className="button primary" disabled={submitting || checkingCv || (step === 3 && !canSubmit)}>{submitting ? <><LoaderCircle size={17} className="spin"/>Saving profile…</> : step === 3 ? <>Save my profile<Check size={17}/></> : <>Continue<ArrowRight size={17}/></>}</button></div></div>
              </form>
            </>}
          </section>
          {!receipt && <div className="draft-row"><div><label className="checkbox-row"><input type="checkbox" checked={remember} onChange={event => toggleRemember(event.target.checked)}/><span>Remember my progress on this device</span></label><p role="status">{draftStatus || 'Optional · saves your details for 7 days, excluding your CV.'}</p></div><button className="text-button reset-trigger" type="button" onClick={() => setShowReset(true)}><RotateCcw size={13}/>Start over</button></div>}
          {showReset && <div className="reset-confirm" role="alert"><p>Clear all current details and your saved draft?</p><button className="text-button" onClick={() => setShowReset(false)}>Keep editing</button><button className="button secondary" onClick={reset}>Clear and start over</button></div>}
        </div>
        <Passport data={data} progress={receipt ? 100 : progress}/>
      </div>
      <footer className="site-footer"><span><LockKeyhole size={13}/>Thoughtfully collected. Always in your control.</span><button ref={privacyTrigger} type="button" onClick={() => setShowPrivacy(true)}><CircleHelp size={14}/>About this demo</button><span className="footer-project">HPAIR TECHNOLOGY · INTERVIEW DELIVERABLE</span></footer>
    </main>
    {showPrivacy && <dialog ref={dialog} onCancel={() => { setShowPrivacy(false); privacyTrigger.current?.focus(); }} onClose={() => { setShowPrivacy(false); privacyTrigger.current?.focus(); }}><button className="dialog-close" aria-label="Close about this demo" onClick={() => dialog.current.close()}><X size={19}/></button><ShieldCheck size={30}/><h2>A little clarity.</h2><p>This is a personal information form built for the HPAIR technology interview. It is not an official application portal.</p><h3>Where does my information go?</h3><p>Nowhere outside this browser. Choosing “Remember my progress” saves text on this device for up to 7 days. Saving your finished profile stores your details and PDF in this browser’s IndexedDB.</p><h3>What can I control?</h3><p>Turn off draft saving to remove the draft, or use “Start over.” After saving, download a text summary or delete that saved demo profile. Clearing this site’s browser data removes all stored profiles. Avoid saving on a shared device.</p><h3>Does this send an email?</h3><p>No. No email or external database service is connected. Your downloaded summary gives you a copy without transmitting personal details.</p><button className="button primary" onClick={() => dialog.current.close()}>Got it<Check size={16}/></button></dialog>}
  </>;
}
