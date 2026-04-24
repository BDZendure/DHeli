'use client';

import StarRating from './StarRating';
import type { MenuItem } from '@/lib/types';

function tagClass(tag: string): string {
  const t = tag.toUpperCase();
  if (t === 'GF') return 'dish-tag gf';
  if (t === 'V') return 'dish-tag v';
  if (t === 'VG') return 'dish-tag vg';
  return 'dish-tag';
}

export default function DishCard({
  item,
  userRating,
  onRate,
  onClick,
}: {
  item: MenuItem;
  userRating: number | null;
  onRate: (n: number) => void;
  onClick: () => void;
}) {
  const display = userRating ?? item.avg_stars ?? 0;
  return (
    <div className="dish-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="dish-card-img">
        {item.thumbnail ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            className="dish-card-thumb"
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/${item.thumbnail}`}
            alt={item.name}
          />
        ) : (
          <>
            <span>{item.name}</span>
            <span style={{ opacity: 0.5, fontSize: '0.6rem', marginTop: '0.3rem' }}>
              [food photo]
            </span>
          </>
        )}
      </div>
      <div className="dish-card-body">
        <div className="dish-card-name">{item.name}</div>
        <div className="dish-card-meta">
          <div className="dish-card-tags">
            {item.tags.map((t) => (
              <span key={t} className={tagClass(t)}>
                {t}
              </span>
            ))}
          </div>
          <StarRating rating={display} onRate={onRate} />
        </div>
      </div>
    </div>
  );
}
