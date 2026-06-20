import { useState, useEffect, useRef } from 'react';

type TimeWindow = 'lunch' | 'afternoon' | 'dinner' | 'default';

// Unsplash photo IDs — replace with owned images when available (see Chunk N)
const HERO_IMAGES: Record<TimeWindow, string> = {
  lunch:     'photo-1585937421612-70a008356fbe', // Indian thali / bright midday
  afternoon: 'photo-1606491956689-2ea866880c84', // samosa closeup
  dinner:    'photo-1547592180-85f173990554',     // dark moody curry
  default:   'photo-1565557623262-b51c2513a641',  // tandoori clay oven
};

const HERO_OVERLAYS: Record<TimeWindow, string> = {
  lunch:     'linear-gradient(105deg, rgba(10,14,8,0.55) 0%, rgba(10,14,8,0.30) 100%)',
  afternoon: 'linear-gradient(105deg, rgba(10,14,8,0.62) 0%, rgba(10,14,8,0.35) 100%)',
  dinner:    'linear-gradient(105deg, rgba(8,6,4,0.82) 0%, rgba(8,6,4,0.60) 100%)',
  default:   'linear-gradient(105deg, rgba(13,9,6,0.92) 0%, rgba(13,9,6,0.60) 50%, rgba(13,9,6,0.35) 100%)',
};

interface WindowConfig {
  eyebrow: string;
  title: string;
  titleEm: string;
  subtitle: string;
  cta1: { text: string; href: string };
  cta2: { text: string; href: string };
}

const WINDOWS: Record<TimeWindow, WindowConfig> = {
  lunch: {
    eyebrow: '⚡ Express Lunch · Midtown Manhattan · 100% Halal',
    title: 'The Mid-Day',
    titleEm: 'Matrix.',
    subtitle: 'Complex Indian flavors, engineered for the afternoon pace. Ready in minutes.',
    cta1: { text: 'Deploy Express Lunch', href: '/order?t=lunch' },
    cta2: { text: 'View Full Menu', href: '/menu' },
  },
  afternoon: {
    eyebrow: '☕ Afternoon Bites · Midtown Manhattan · 100% Halal',
    title: 'Afternoon',
    titleEm: 'Cravings?',
    subtitle: 'Fuel your mid-day slide with something satisfying from our clay tandoor.',
    cta1: { text: 'Snack Break', href: '/order?t=afternoon' },
    cta2: { text: 'View Full Menu', href: '/menu' },
  },
  dinner: {
    eyebrow: '🌙 Dinner Service · Open Until 11 PM · 100% Halal',
    title: 'Hungry',
    titleEm: 'Tonight?',
    subtitle: 'The evening slow-braises are perfectly aged. Dinner is served.',
    cta1: { text: 'Begin Dinner Experience', href: '/order?t=dinner' },
    cta2: { text: 'View Full Menu', href: '/menu' },
  },
  default: {
    eyebrow: '🌙 100% Halal · Authentic Since 1994 · Midtown NYC',
    title: 'Flavours of',
    titleEm: 'India, Delivered',
    subtitle: 'From clay-oven tandoor to slow-simmered curries — every dish made fresh with halal ingredients at 148 East 46th Street.',
    cta1: { text: 'Order Now', href: '/order' },
    cta2: { text: 'Explore Our Menu', href: '/menu' },
  },
};

function getTimeWindow(): TimeWindow {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 15 && h < 18.5) return 'afternoon';
  if (h >= 18.5 && h < 23) return 'dinner';
  return 'default';
}

export default function TimeBasedHero() {
  const [activeWindow, setActiveWindow] = useState<TimeWindow>('default');
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const target = getTimeWindow();
    if (target === activeWindow) return;

    // Check prefers-reduced-motion — skip fade if set
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setActiveWindow(target);
      return;
    }

    setFading(true);
    timerRef.current = setTimeout(() => {
      setActiveWindow(target);
      setFading(false);
    }, 320);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const w = WINDOWS[activeWindow];

  return (
    <section className="hero" aria-label="Joy Curry & Tandoor — Welcome">
      <div className="hero__bg" aria-hidden="true">
        <img
          src={`https://images.unsplash.com/${HERO_IMAGES[activeWindow]}?w=1920&q=80&auto=format&fit=crop`}
          alt=""
          loading="eager"
          fetchPriority="high"
          width={1920}
          height={1080}
        />
        <div
          className="hero__gradient"
          style={{ background: HERO_OVERLAYS[activeWindow] }}
        />
      </div>

      <div className="container">
        <div className={`hero__content${fading ? ' hero__content--fading' : ''}`}>
          <p className="hero__eyebrow">{w.eyebrow}</p>

          <h1 className="hero__title">
            {w.title}
            <br />
            <em>{w.titleEm}</em>
          </h1>

          <p className="hero__subtitle">{w.subtitle}</p>

          <div className="hero__actions">
            <a href={w.cta1.href} className="btn btn--cta">
              {w.cta1.text}
            </a>
            <a href={w.cta2.href} className="btn btn--outline">
              {w.cta2.text}
            </a>
          </div>

          <div className="hero__badge-row" aria-label="Restaurant highlights">
            <span className="hero__badge">
              <span aria-hidden="true">✓</span> Halal Certified
            </span>
            <span className="hero__badge">
              <span aria-hidden="true">🛵</span> Fast Delivery
            </span>
            <span className="hero__badge">
              <span aria-hidden="true">🌱</span> Vegetarian Options
            </span>
            <span className="hero__badge">
              <span aria-hidden="true">⭐</span> 30+ Years Serving NYC
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
