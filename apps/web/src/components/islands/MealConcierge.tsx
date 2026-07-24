import { useState } from 'react';
import { Sparkles, Flame, ChevronDown } from 'lucide-react';
import { Dialog, Accordion } from '@joy-curry/ui';
import type { MenuItem } from '@lib/core';
import { showToast } from '@lib/toast';

interface Props {
  menuItems: MenuItem[];
}

const OCCASIONS = ['Lunch', 'Dinner', 'Date Night', 'Office'];
const SPICE_OPTIONS = ['Mild', 'Medium', 'Hot'];
const DIETARY_OPTIONS = ['No restriction', 'Veg', 'Vegan', 'GF'];

export default function MealConcierge({ menuItems: _menuItems }: Props) {
  const [open, setOpen] = useState(false);
  const [occasion, setOccasion] = useState('');
  const [spice, setSpice] = useState('');
  const [dietary, setDietary] = useState('No restriction');
  // Which accordion sections are expanded. Controlled so picking an answer can
  // guide the guest to the next question (the old wizard's auto-advance).
  const [openSections, setOpenSections] = useState<string[]>(['occasion']);

  const openModal = () => {
    setOccasion('');
    setSpice('');
    setDietary('No restriction');
    setOpenSections(['occasion']);
    setOpen(true);
  };
  const closeModal = () => setOpen(false);

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
    showToast(`We picked ${label} for you`, 'success');
    closeModal();
  };

  // Chip picked → record it and guide the guest to the next unanswered section.
  const pickOccasion = (o: string) => { setOccasion(o); setOpenSections(['spice']); };
  const pickSpice = (s: string) => { setSpice(s); setOpenSections(['dietary']); };

  return (
    <>
      {/* Floating trigger button */}
      <button className="meal-concierge__fab" onClick={openModal} aria-label="Build my meal">
        <Sparkles size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }} /> Build my meal
      </button>

      <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) closeModal(); }}>
        <Dialog.Portal>
          <Dialog.Backdrop unstyled className="dish-modal__backdrop" />
          <div className="dish-modal__positioner">
            <Dialog.Popup unstyled className="concierge-modal">
              <Dialog.Close className="dish-modal__close" aria-label="Close">✕</Dialog.Close>

              <div className="concierge-modal__header">
                <Sparkles size={28} className="concierge-modal__icon" aria-hidden="true" />
                <Dialog.Title className="concierge-modal__title">Build My Meal</Dialog.Title>
                <Dialog.Description className="concierge-modal__sub">Answer 3 quick questions</Dialog.Description>
              </div>

              <div className="concierge-modal__body">
                <Accordion.Root
                  className="concierge-accordion"
                  value={openSections}
                  onValueChange={(v) => setOpenSections(v as string[])}
                >
                  <Accordion.Item value="occasion">
                    <Accordion.Header>
                      <Accordion.Trigger>
                        <span className="concierge-accordion__q">What's the occasion?</span>
                        <span className="concierge-accordion__meta">
                          <span className="concierge-accordion__value">{occasion || 'Any'}</span>
                          <ChevronDown className="jc-accordion__chevron" size={18} aria-hidden="true" />
                        </span>
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Panel>
                      <div className="concierge-modal__chips">
                        {OCCASIONS.map(o => (
                          <button
                            key={o}
                            type="button"
                            className={`concierge-chip${occasion === o ? ' concierge-chip--active' : ''}`}
                            aria-pressed={occasion === o}
                            onClick={() => pickOccasion(o)}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    </Accordion.Panel>
                  </Accordion.Item>

                  <Accordion.Item value="spice">
                    <Accordion.Header>
                      <Accordion.Trigger>
                        <span className="concierge-accordion__q">How spicy do you like it?</span>
                        <span className="concierge-accordion__meta">
                          <span className="concierge-accordion__value">{spice || 'Any'}</span>
                          <ChevronDown className="jc-accordion__chevron" size={18} aria-hidden="true" />
                        </span>
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Panel>
                      <div className="concierge-modal__chips">
                        {SPICE_OPTIONS.map(s => (
                          <button
                            key={s}
                            type="button"
                            className={`concierge-chip${spice === s ? ' concierge-chip--active' : ''}`}
                            aria-pressed={spice === s}
                            onClick={() => pickSpice(s)}
                          >
                            {s === 'Mild' ? 'Mild' : s === 'Medium' ? <><Flame size={12} aria-hidden="true" /> Medium</> : <><Flame size={12} aria-hidden="true" /><Flame size={12} aria-hidden="true" /> Hot</>}
                          </button>
                        ))}
                      </div>
                    </Accordion.Panel>
                  </Accordion.Item>

                  <Accordion.Item value="dietary">
                    <Accordion.Header>
                      <Accordion.Trigger>
                        <span className="concierge-accordion__q">Any dietary preferences?</span>
                        <span className="concierge-accordion__meta">
                          <span className="concierge-accordion__value">{dietary}</span>
                          <ChevronDown className="jc-accordion__chevron" size={18} aria-hidden="true" />
                        </span>
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Panel>
                      <div className="concierge-modal__chips">
                        {DIETARY_OPTIONS.map(d => (
                          <button
                            key={d}
                            type="button"
                            className={`concierge-chip${dietary === d ? ' concierge-chip--active' : ''}`}
                            aria-pressed={dietary === d}
                            onClick={() => setDietary(d)}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion.Root>

                <button className="dish-modal__add-btn concierge-modal__submit" onClick={applyRecommendations}>
                  Show My Picks →
                </button>
              </div>
            </Dialog.Popup>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
