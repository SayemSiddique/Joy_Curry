import { useState } from 'react';
import { ChevronDown, Phone, Mail, MapPin, Clock } from 'lucide-react';

const API_BASE = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api';

const SUBJECTS = [
  'Order issue',
  'Dietary & allergen question',
  'Delivery question',
  'Halal certification',
  'Payment question',
  'Catering inquiry',
  'General feedback',
  'Other',
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is Joy Curry & Tandoor Halal certified?',
    a: 'Yes. All of our meats are sourced from certified Halal suppliers. We have been proudly serving Halal food since 1994.',
  },
  {
    q: 'Do you offer delivery?',
    a: 'Yes, we deliver within our local delivery zone. Enter your address at checkout and we will confirm availability. Orders outside our zone may be dispatched via a courier partner.',
  },
  {
    q: 'What is the minimum order for delivery?',
    a: 'The minimum order for delivery is $15. Free delivery is available on orders over $30 within our in-house delivery zone.',
  },
  {
    q: 'Do you have vegetarian or vegan options?',
    a: 'Yes, we have a dedicated vegetarian section on our menu. Many dishes can also be prepared vegan — please note your preference in the Special Instructions field or call us to confirm.',
  },
  {
    q: 'I have a food allergy. What should I do?',
    a: 'Please include your allergy details in the Special Instructions field at checkout. For severe allergies, we strongly recommend calling us directly before ordering so we can take every precaution.',
  },
  {
    q: 'Can I schedule an order in advance?',
    a: 'Yes. At checkout, choose "Schedule for later" to select a specific pickup or delivery time slot, available up to 7 days ahead.',
  },
  {
    q: 'How do I cancel or modify my order?',
    a: 'Orders can only be modified before they are confirmed by the kitchen. Please call us immediately if you need to make changes. Once cooking has started, we are unable to cancel or modify.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards, Apple Pay, and Google Pay. Payment is required at checkout — we do not accept cash online.',
  },
  {
    q: 'What is Artisan Vault?',
    a: 'Artisan Vault is our rewards program. You earn points on every order and can redeem them for free items and discounts. View your points balance on your Account page.',
  },
  {
    q: 'How do I track my order?',
    a: 'After placing an order, use the "Track your order" link on the confirmation screen, or visit the Track page from the navigation bar.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? ' faq-item--open' : ''}`}>
      <button
        type="button"
        className="faq-item__trigger"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span>{q}</span>
        <ChevronDown size={18} aria-hidden="true" className="faq-item__chevron" />
      </button>
      {open && <p className="faq-item__answer">{a}</p>}
    </div>
  );
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function HelpPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error?.message ?? 'Something went wrong. Please try again.');
        setStatus('error');
      } else {
        setStatus('success');
        setForm({ name: '', email: '', subject: SUBJECTS[0], message: '' });
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  }

  return (
    <div className="help-page">
      <div className="help-page__hero">
        <h1 className="help-page__title">How can we help?</h1>
        <p className="help-page__subtitle">Find answers below, or send us a message and we'll get back to you.</p>
      </div>

      <div className="help-page__body">
        {/* ── Contact form ── */}
        <section className="help-section" aria-labelledby="contact-heading">
          <h2 className="help-section__heading" id="contact-heading">Send us a message</h2>

          {status === 'success' ? (
            <div className="help-form__success" role="status">
              <span className="help-form__success-icon" aria-hidden="true">✓</span>
              <p><strong>Message sent!</strong> We'll reply to <strong>{form.email || 'you'}</strong> as soon as possible.</p>
            </div>
          ) : (
            <form className="help-form" onSubmit={handleSubmit} noValidate>
              <div className="help-form__row">
                <label className="help-form__label" htmlFor="hf-name">Your name</label>
                <input
                  id="hf-name"
                  name="name"
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                  placeholder="Jane Smith"
                />
              </div>
              <div className="help-form__row">
                <label className="help-form__label" htmlFor="hf-email">Email address</label>
                <input
                  id="hf-email"
                  name="email"
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder="jane@example.com"
                />
              </div>
              <div className="help-form__row">
                <label className="help-form__label" htmlFor="hf-subject">Subject</label>
                <select
                  id="hf-subject"
                  name="subject"
                  className="form-input"
                  value={form.subject}
                  onChange={handleChange}
                >
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="help-form__row">
                <label className="help-form__label" htmlFor="hf-message">Message</label>
                <textarea
                  id="hf-message"
                  name="message"
                  className="form-input help-form__textarea"
                  value={form.message}
                  onChange={handleChange}
                  required
                  maxLength={2000}
                  placeholder="Tell us what's on your mind…"
                />
                <span className="help-form__char-count">{form.message.length}/2000</span>
              </div>
              {status === 'error' && (
                <p className="help-form__error" role="alert">{errorMsg}</p>
              )}
              <button type="submit" className="btn btn--primary help-form__submit" disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </section>

        {/* ── FAQ ── */}
        <section className="help-section" aria-labelledby="faq-heading">
          <h2 className="help-section__heading" id="faq-heading">Frequently asked questions</h2>
          <div className="faq-list">
            {FAQ.map(item => <FaqItem key={item.q} {...item} />)}
          </div>
        </section>

        {/* ── Contact info ── */}
        <section className="help-section help-section--contact-info" aria-labelledby="info-heading">
          <h2 className="help-section__heading" id="info-heading">Find us</h2>
          <div className="contact-info">
            <div className="contact-info__item">
              <Phone size={18} aria-hidden="true" className="contact-info__icon" />
              <div>
                <p className="contact-info__label">Phone</p>
                <a href="tel:+12125551234" className="contact-info__value">(212) 555-1234</a>
              </div>
            </div>
            <div className="contact-info__item">
              <Mail size={18} aria-hidden="true" className="contact-info__icon" />
              <div>
                <p className="contact-info__label">Email</p>
                <a href="mailto:info@joycurry.com" className="contact-info__value">info@joycurry.com</a>
              </div>
            </div>
            <div className="contact-info__item">
              <MapPin size={18} aria-hidden="true" className="contact-info__icon" />
              <div>
                <p className="contact-info__label">Address</p>
                <p className="contact-info__value">148 East 46th Street<br />New York, NY 10017</p>
              </div>
            </div>
            <div className="contact-info__item">
              <Clock size={18} aria-hidden="true" className="contact-info__icon" />
              <div>
                <p className="contact-info__label">Hours</p>
                <p className="contact-info__value">Mon–Fri: 11am–10pm<br />Sat–Sun: 12pm–9pm</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
