import type { CartItem } from '@stores/cart';

const PREFIX = 'jc_group_';
const CHANNEL = 'jc_group_order';

export interface GroupParticipant {
  id: string;
  name: string;
  items: Omit<CartItem, 'cartItemId'>[];
  addedAt: number;
}

export interface GroupSession {
  uuid: string;
  hostName: string;
  hostItems: Omit<CartItem, 'cartItemId'>[];
  participants: GroupParticipant[];
  createdAt: number;
}

function key(uuid: string): string {
  return `${PREFIX}${uuid}`;
}

export function startGroupOrder(uuid: string, hostName: string, hostItems: CartItem[]): string {
  const session: GroupSession = {
    uuid,
    hostName,
    hostItems: hostItems.map(({ cartItemId: _id, ...rest }) => rest),
    participants: [],
    createdAt: Date.now(),
  };
  localStorage.setItem(key(uuid), JSON.stringify(session));
  broadcast(uuid, 'started');
  return `${location.origin}${location.pathname}?group=${uuid}`;
}

export function getGroupSession(uuid: string): GroupSession | null {
  try {
    const raw = localStorage.getItem(key(uuid));
    return raw ? (JSON.parse(raw) as GroupSession) : null;
  } catch {
    return null;
  }
}

export function addParticipant(uuid: string, participant: GroupParticipant): boolean {
  const session = getGroupSession(uuid);
  if (!session) return false;
  const others = session.participants.filter(p => p.id !== participant.id);
  session.participants = [...others, participant];
  localStorage.setItem(key(uuid), JSON.stringify(session));
  broadcast(uuid, 'participant_added');
  return true;
}

export function mergeGroupItems(uuid: string): Omit<CartItem, 'cartItemId'>[] {
  const session = getGroupSession(uuid);
  if (!session) return [];
  const all: Omit<CartItem, 'cartItemId'>[] = [...session.hostItems];
  for (const p of session.participants) all.push(...p.items);
  return all;
}

export function clearGroupSession(uuid: string): void {
  localStorage.removeItem(key(uuid));
}

function broadcast(uuid: string, event: string): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const bc = new BroadcastChannel(CHANNEL);
  bc.postMessage({ uuid, event });
  bc.close();
}

export function listenGroupUpdates(uuid: string, cb: (session: GroupSession) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const bc = new BroadcastChannel(CHANNEL);
  bc.onmessage = (e: MessageEvent) => {
    if (e.data?.uuid === uuid) {
      const s = getGroupSession(uuid);
      if (s) cb(s);
    }
  };
  return () => bc.close();
}
