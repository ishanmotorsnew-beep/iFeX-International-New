import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const SERVICE_OPTIONS = [
  'Website Development',
  'ERP Solutions',
  'Mobile App Development',
  'AI & Business Automation',
  'Cloud Solutions',
  'Cybersecurity',
  'API Integration',
  'UI/UX Design',
  'Something Else',
];

const BUDGET_OPTIONS = [
  'Under $5,000',
  '$5,000 – $15,000',
  '$15,000 – $50,000',
  '$50,000 – $150,000',
  '$150,000+',
  'Not sure yet',
];

const INITIAL_STATE = {
  name: '',
  email: '',
  phone: '',
  company: '',
  service: '',
  budget: '',
  message: '',
};

const WEB3FORMS_ACCESS_KEY = 'de238b20-623f-4602-a6f8-9c6dd50eb1da';

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Name is required.';
  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!values.service) errors.service = 'Please select a service.';
  if (!values.message.trim()) {
    errors.message = 'Tell us a bit about your project.';
  } else if (values.message.trim().length < 20) {
    errors.message = 'Please provide at least 20 characters.';
  }
  return errors;
}

const fieldClass =
  'w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 transition-colors duration-200 focus:border-cyan/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

const labelClass = 'text-xs font-semibold uppercase tracking-widest text-white/50 mb-2 block';

export default function ContactForm() {
  const [values, setValues] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [serverMessage, setServerMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus('loading');
    setServerMessage('');

    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      formData.append('access_key', WEB3FORMS_ACCESS_KEY);

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Something went wrong. Please try again.');
      }

      setStatus('success');
      setValues(INITIAL_STATE);
    } catch (err) {
      setStatus('error');
      setServerMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  const isLoading = status === 'loading';

  return (
    <motion.form
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onSubmit={handleSubmit}
      noValidate
      className="glass-panel rounded-3xl p-8 sm:p-10 flex flex-col gap-6"
    >
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">Start your project</h3>
        <p className="text-white/55 text-sm leading-relaxed">
          Fill in the details below — the more context you give us, the faster we can scope it.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className={labelClass}>Full Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            value={values.name}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="Jane Doe"
            className={fieldClass}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && <p id="name-error" className="text-xs text-red-400 mt-1.5">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>Email *</label>
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="jane@company.com"
            className={fieldClass}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && <p id="email-error" className="text-xs text-red-400 mt-1.5">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>Phone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="+1 (555) 000-0000"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="company" className={labelClass}>Company Name</label>
          <input
            id="company"
            name="company"
            type="text"
            value={values.company}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="Acme Inc."
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="service" className={labelClass}>Service Needed *</label>
          <select
            id="service"
            name="service"
            value={values.service}
            onChange={handleChange}
            disabled={isLoading}
            className={fieldClass}
            aria-invalid={!!errors.service}
          >
            <option value="" disabled>Select a service</option>
            {SERVICE_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="bg-navy">{opt}</option>
            ))}
          </select>
          {errors.service && <p className="text-xs text-red-400 mt-1.5">{errors.service}</p>}
        </div>

        <div>
          <label htmlFor="budget" className={labelClass}>Budget Range</label>
          <select
            id="budget"
            name="budget"
            value={values.budget}
            onChange={handleChange}
            disabled={isLoading}
            className={fieldClass}
          >
            <option value="" disabled>Select a range</option>
            {BUDGET_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="bg-navy">{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>Project Details *</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={values.message}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="Tell us what you're building, your timeline, and any technical requirements..."
          className={`${fieldClass} resize-none`}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
        />
        {errors.message && <p id="message-error" className="text-xs text-red-400 mt-1.5">{errors.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-electric to-cyan px-6 py-3.5 text-sm font-semibold text-white shadow-glow-blue transition-all duration-300 hover:shadow-glow-cyan hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending...
          </>
        ) : (
          'Send Message'
        )}
      </button>

      <AnimatePresence mode="wait">
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="status"
            className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            Thanks — your message has been sent. We&rsquo;ll be in touch within one business day.
          </motion.div>
        )}
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300"
          >
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            {serverMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
