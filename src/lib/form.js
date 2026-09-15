import { isValidPhoneNumber } from 'libphonenumber-js';
export const MAX_CV_SIZE = 5 * 1024 * 1024;
export const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', nationality: '', language: '', address: '', city: '', region: '', postalCode: '', country: '', institution: '', hasLinkedIn: false, linkedIn: '', interests: [], introduction: '', consent: false };
export const STEPS = [
  { title: 'A little about you', short: 'About you', description: 'Every great connection starts with an introduction.', fields: ['firstName', 'lastName', 'email', 'nationality', 'language'] },
  { title: 'Where you call home', short: 'Your world', description: 'Different places. Shared possibilities.', fields: ['phone', 'address', 'city', 'country', 'region', 'postalCode'] },
  { title: 'What makes you, you', short: 'Your story', description: 'Bring your experience, your curiosity, and your perspective.', fields: ['institution', 'linkedIn', 'cv', 'introduction'] },
  { title: 'Your next chapter starts here', short: 'Review', description: 'Take a moment to check your details before you finish.', fields: ['consent'] },
];
export const INTERESTS = ['Technology & innovation', 'Climate & sustainability', 'Business & entrepreneurship', 'Public policy', 'Arts & culture', 'Global health'];
const required = { firstName: 'Enter your first name.', lastName: 'Enter your last name.', email: 'Enter your email address.', nationality: 'Enter your nationality.', language: 'Choose your preferred language.', address: 'Enter your street address.', city: 'Enter your city.', country: 'Enter your country or territory.', phone: 'Enter your phone number with a country code.' };
export function validateField(name, value, data) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required[name] && !text) return required[name];
  if (typeof value === 'string' && value.length > (name === 'introduction' ? 500 : 200)) return `Keep this under ${name === 'introduction' ? 500 : 200} characters.`;
  if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return 'Enter a valid email, like you@example.com.';
  if (name === 'phone' && !isValidPhoneNumber(text)) return 'Include a valid country code and number, like +1 202 555 0123.';
  if (name === 'linkedIn' && data.hasLinkedIn) {
    try { const url = new URL(text); if (url.protocol !== 'https:' || !['linkedin.com', 'www.linkedin.com'].includes(url.hostname) || !/^\/in\/[^/]+\/?$/.test(url.pathname) || url.username || url.password) throw new Error(); }
    catch { return 'Enter a LinkedIn profile URL, like https://www.linkedin.com/in/your-name.'; }
  }
  if (name === 'consent' && value !== true) return 'Please confirm that these details are ready to save.';
  return '';
}
export function validateCv(file) {
  if (!file) return 'Add your CV as a PDF.';
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) return 'Choose a PDF file. You can export your CV as PDF.';
  if (!file.size) return 'This file is empty. Choose another PDF.';
  if (file.size > MAX_CV_SIZE) return 'Your CV must be 5 MB or smaller.';
  return '';
}
export async function inspectCv(file) {
  const error = validateCv(file);
  if (error) return error;
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...header) === '%PDF-' ? '' : 'This file does not appear to be a PDF. Please export it again.';
}
export function validateForm(data, file) {
  return Object.fromEntries([...Object.keys(EMPTY_FORM).map(key => [key, validateField(key, data[key], data)]), ['cv', validateCv(file)]].filter(([, value]) => value));
}
export function cleanForm(data) {
  const clean = Object.fromEntries(Object.entries(EMPTY_FORM).map(([key, fallback]) => [key, typeof fallback === 'string' ? String(data[key] ?? '').trim() : data[key] ?? fallback]));
  clean.linkedIn = clean.hasLinkedIn ? clean.linkedIn : '';
  clean.interests = INTERESTS.filter(interest => data.interests?.includes(interest));
  return clean;
}
export function progressOf(data, file) {
  const fields = [...STEPS.slice(0, 3).flatMap(step => step.fields)].filter(key => !['region', 'postalCode', 'institution', 'introduction'].includes(key) && (key !== 'linkedIn' || data.hasLinkedIn));
  return Math.round(100 * fields.filter(key => key === 'cv' ? !validateCv(file) : !validateField(key, data[key], data)).length / fields.length);
}
