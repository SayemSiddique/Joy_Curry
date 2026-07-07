import { useState } from 'react';
import type { MenuItem } from '@lib/core';

interface Props {
  menuItems: MenuItem[];
}

type Step = 0 | 1 | 2 | 3; // 0 = closed, 1-3 = steps

const OCCASIONS = ['Lunch', 'Dinner', 'Date Night', 'Office'];
const SPICE_OPTIONS = ['Mild', 'Medium', 'Hot'];
const DIETARY_OPTIONS = ['No restriction', 'Veg', 'Vegan', 'GF'];

function showToast(msg: string) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast toast--success';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export default function MealConcierge({ menuItems }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [occasion, setOccasion] = useState('');
  const [spice, setSpice] = useState('');
  const [dietary, setDietary] = useState('No restriction');

  const openModal = () => { setStep(1); setOccasion(''); setSpice(''); setDietary('No restriction'); };
  const closeModal = () => setStep(0);

  const applyRecommendations = () => {
    const cards = document.querySelectorAll<HTMLElement>('.menu-card');
    let count = 0;

    cards.forEach(card => {
      const cardSpice = card.dataset.spiceLevel ?? '';
      const isVegan = card.dataset.isVegan === 'true';
      const isVegetarian = card.dataset.isVegetarian === 'true';
      const isGF = card.dataset.isGlutenFree === 'true';

      let match = true;

      if (spice === 'Mild' && cardSpice && cardSpice !== 'Mild') match = false;
      if (spice === 'Medium' && cardSpice && cardSpice !== 'Mild' && cardSpice !== 'Medium') match = false;
      if (spice === 'Hot' && cardSpice !== 'Hot') match = false;

      if (dietary === 'Vegan' && !isVegan) match = false;
      if (dietary === 'Veg' && !isVegan && !isVegetarian) match = false;
      if (dietary === 'GF' && !isGF) match = false;

      card.classList.toggle('menu-card--concierge-dim', !match);
      card.classList.toggle('menu-card--concierge-pick', match);
      if (match) count++;
    });

    // Scroll to first matching card
    const first = document.querySelector<HTMLElement>('.menu-card--concierge-pick');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const label = count === 1 ? '1 dish' : `${count} dishes`;
    showToast(`✨ We picked ${label} for you`);
    closeModal();
  };

  return (
    <>
      {/* Floating trigger button */}
      <button className="meal-concierge__fab" onClick={openModal} aria-label="Build my meal">
        ✨ Build my meal
      </button>

      {/* Modal */}
      {step > 0 && (
        <div
          className="dish-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Build my meal concierge"
        >
          <div className="concierge-modal">
            <button className="dish-modal__close" onClick={closeModal} aria-label="Close">✕</button>

            <div className="concierge-modal__header">
              <span className="concierge-modal__icon">✨</span>
              <h2 className="concierge-modal__title">Build My Meal</h2>
              <p className="concierge-modal__sub">Answer 3 quick questions</p>
              {/* Step dots */}
              <div className="concierge-modal__steps">
                {[1, 2, 3].map(s => (
                  <span key={s} className={`concierge-modal__step-dot${step >= s ? ' concierge-modal__step-dot--active' : ''}`} />
                ))}
              </div>
            </div>

            <div className="concierge-modal__body">
              {step === 1 && (
                <div className="concierge-modal__section">
                  <p className="concierge-modal__question">What's the occasion?</p>
                  <div className="concierge-modal__chips">
                    {OCCASIONS.map(o => (
                      <button
                        key={o}
                        type="button"
                        className={`concierge-chip${occasion === o ? ' concierge-chip--active' : ''}`}
                        onClick={() => { setOccasion(o); setStep(2); }}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="concierge-modal__section">
                  <p className="concierge-modal__question">How spicy do you like it?</p>
                  <div className="concierge-modal__chips">
                    {SPICE_OPTIONS.map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`concierge-chip${spice === s ? ' concierge-chip--active' : ''}`}
                        onClick={() => { setSpice(s); setStep(3); }}
                      >
                        {s === 'Mild' ? '🙂 Mild' : s === 'Medium' ? '🌶 Medium' : '🔥 Hot'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="concierge-modal__section">
                  <p className="concierge-modal__question">Any dietary preferences?</p>
                  <div className="concierge-modal__chips">
                    {DIETARY_OPTIONS.map(d => (
                      <button
                        key={d}
                        type="button"
                        className={`concierge-chip${dietary === d ? ' concierge-chip--active' : ''}`}
                        onClick={() => setDietary(d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <button className="dish-modal__add-btn" style={{ marginTop: '1.5rem' }} onClick={applyRecommendations}>
                    Show My Picks →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
