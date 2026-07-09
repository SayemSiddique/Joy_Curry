import { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { authState } from '@lib/core';
import { API_BASE_URL } from '@lib/core';
import { showToast } from '@lib/toast';

interface Review {
  id: string;
  photoUrl?: string;
  rating: number;
  comment: string;
  userName: string;
  createdAt: string;
}

function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="review-gallery__stars" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => i < rating ? '★' : '☆').join('')}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-picker" role="group" aria-label="Rate this dish">
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`star-picker__star${n <= (hover || value) ? ' star-picker__star--active' : ''}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          role="button"
          tabIndex={0}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onKeyDown={e => e.key === 'Enter' && onChange(n)}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function ReviewGallery({ itemId }: { itemId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const auth = authState.get();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reviews?itemId=${encodeURIComponent(itemId)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { reviews: Review[] }) => setReviews(data.reviews))
      .catch(() => {});
  }, [itemId]);

  if (reviews.length === 0 && !auth.token) return null;

  const avg = reviews.length
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { showToast('Please select a star rating'); return; }
    setSubmitting(true);
    try {
      const token = authState.get().token;
      const res = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ itemId, rating, comment }),
      });
      if (!res.ok) throw new Error();
      const { review } = await res.json();
      // One review per user per item — replace any prior version, else prepend.
      setReviews(prev => [review, ...prev.filter(r => r.id !== review.id)]);
      setShowForm(false);
      setRating(0);
      setComment('');
      showToast('Review submitted — thank you!');
    } catch {
      showToast('Could not submit review — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-gallery">
      {reviews.length > 0 && (
        <>
          <div className="review-gallery__header">
            <span className="review-gallery__avg">{avg}</span>
            <Stars rating={avg} />
            <span className="review-gallery__count">({reviews.length})</span>
          </div>
          <div className="review-gallery__scroll">
            {reviews.map(r => (
              <div key={r.id} className="review-card">
                {r.photoUrl && (
                  <img className="review-card__photo" src={r.photoUrl} alt={`Review photo by ${r.userName}`} loading="lazy" />
                )}
                <div className="review-card__body">
                  <div className="review-card__stars">{Array.from({ length: 5 }, (_, i) => i < r.rating ? '★' : '☆').join('')}</div>
                  <p className="review-card__comment">{r.comment}</p>
                  <span className="review-card__user">{r.userName}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {auth.token && (
        <>
          <button
            className="review-gallery__toggle"
            onClick={() => setShowForm(v => !v)}
            type="button"
          >
            {showForm ? 'Cancel' : <><Camera size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }} />Leave a review</>}
          </button>

          {showForm && (
            <form className="review-upload-form" onSubmit={handleSubmit}>
              <StarPicker value={rating} onChange={setRating} />
              <textarea
                placeholder="Tell others what you loved about this dish…"
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={500}
              />
              <button
                className="review-upload-form__submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Post Review'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
