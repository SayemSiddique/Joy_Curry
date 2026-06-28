import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@lib/constants';

interface KitchenStatus {
  isOpen: boolean;
  waitMinutes?: number;
  message?: string;
}

type StatusLevel = 'green' | 'amber' | 'red';

function dotColor(level: StatusLevel): string {
  return level === 'green' ? '#2E7D32' : level === 'amber' ? '#B5651D' : '#C62828';
}

export default function KitchenTicker() {
  const [status, setStatus] = useState<KitchenStatus>({ isOpen: true });
  const [level, setLevel] = useState<StatusLevel>('green');

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/status`);
      if (!res.ok) throw new Error('no status');
      const data: KitchenStatus = await res.json();
      setStatus(data);
      if (!data.isOpen) setLevel('red');
      else if ((data.waitMinutes ?? 0) > 30) setLevel('amber');
      else setLevel('green');
    } catch {
      // Backend doesn't have /api/status yet — degrade gracefully
      setStatus({ isOpen: true });
      setLevel('green');
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 60_000);
    return () => clearInterval(id);
  }, []);

  const label = status.message
    ?? (status.isOpen
      ? `Kitchen Open${status.waitMinutes ? ` · Avg wait ${status.waitMinutes} min` : ''}`
      : 'Kitchen Closed · Check back soon');

  return (
    <div className="kitchen-ticker" role="status" aria-live="polite">
      <span
        className="kitchen-ticker__dot"
        style={{ background: dotColor(level) }}
        aria-hidden="true"
      />
      <span className="kitchen-ticker__label">{label}</span>
    </div>
  );
}
