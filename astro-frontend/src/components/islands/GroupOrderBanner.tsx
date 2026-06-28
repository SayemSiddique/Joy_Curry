import { useState, useEffect } from 'react';
import type { ReadableAtom } from 'nanostores';
import { authState } from '@stores/auth';
import { addToCart, cartOpen, cartItems } from '@stores/cart';
import {
  getGroupSession,
  addParticipant,
  listenGroupUpdates,
  type GroupSession,
} from '@lib/groupOrder';
import { showToast } from '@lib/toast';

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

export default function GroupOrderBanner() {
  const auth = useNano(authState);
  const myItems = useNano(cartItems);
  const [uuid, setUuid] = useState<string | null>(null);
  const [session, setSession] = useState<GroupSession | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Detect ?group=uuid on page load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const gid = params.get('group');
    if (!gid) return;
    const s = getGroupSession(gid);
    if (!s) return;
    setUuid(gid);
    setSession(s);
    return listenGroupUpdates(gid, setSession);
  }, []);

  const handleSubmitItems = () => {
    if (!uuid || myItems.length === 0) return;
    const participantId = auth.user
      ? String(auth.user.id)
      : `guest-${crypto.randomUUID().slice(0, 8)}`;
    const name = auth.user?.name ?? 'Guest';
    const ok = addParticipant(uuid, {
      id: participantId,
      name,
      items: myItems.map(({ cartItemId: _id, ...rest }) => rest),
      addedAt: Date.now(),
    });
    if (ok) {
      setSubmitted(true);
      showToast('Your items have been added to the group order!', 'success');
    }
  };

  if (!uuid || !session || submitted) return null;

  return (
    <div className="group-banner" role="region" aria-label="Group order">
      <div className="container group-banner__inner">
        <div className="group-banner__info">
          <span className="group-banner__icon">👥</span>
          <div>
            <strong>Group Order</strong> started by{' '}
            <strong>{session.hostName}</strong>
            {session.participants.length > 0 && (
              <span className="group-banner__count">
                {' '}· {session.participants.length} person
                {session.participants.length !== 1 ? 's' : ''} added items
              </span>
            )}
          </div>
        </div>
        <div className="group-banner__actions">
          <span className="group-banner__hint">
            Add your items to the cart, then:
          </span>
          <button
            className="group-banner__submit"
            onClick={handleSubmitItems}
            disabled={myItems.length === 0}
            aria-label="Submit my items to the group order"
          >
            Submit My Items →
          </button>
        </div>
      </div>
    </div>
  );
}
