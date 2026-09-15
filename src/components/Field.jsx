import { Check, AlertCircle } from 'lucide-react';
export default function Field({ name, label, value, onChange, onBlur, error, touched, required = false, hint, children, ...props }) {
  const showError = touched && error;
  const showSuccess = touched && !error && Boolean(value?.trim());
  const describedBy = [hint && `${name}-hint`, showError && `${name}-error`].filter(Boolean).join(' ') || undefined;
  const inputProps = { id: name, name, value, onChange: event => onChange(name, event.target.value), onBlur: () => onBlur(name), required, 'aria-invalid': Boolean(showError), 'aria-describedby': describedBy, ...props };
  return <div className={`field ${showError ? 'field-error' : ''}`}><label htmlFor={name}>{label}{required ? <span className="required" aria-hidden="true"> *</span> : <span className="optional">Optional</span>}</label><div className="input-wrap">{children ? <select {...inputProps}>{children}</select> : <input {...inputProps} />}{showSuccess && !children && <Check className="field-check" size={16} aria-hidden="true" />}</div>{hint && <p className="field-hint" id={`${name}-hint`}>{hint}</p>}{showError && <p className="field-error-text" id={`${name}-error`}><AlertCircle size={14} aria-hidden="true" />{error}</p>}</div>;
}
