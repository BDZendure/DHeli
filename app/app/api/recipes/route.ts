import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { PostRecipeBody } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

type RecipeRow = {
  id: string;
  hall_id: string;
  source: 'ai' | 'user';
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  dietary_tags: string[];
  prep_time_mins: number | null;
  meal_period: 'breakfast' | 'lunch' | 'dinner';
  date: string;
  created_at: string;
  thumbnail: string | null;
};

export async function GET(req: Request) {
  if (!rateLimit(req, 'general')) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const url = new URL(req.url);
  const hall = url.searchParams.get('hall');
  const filter = url.searchParams.get('filter') ?? 'all';
  const limitRaw = url.searchParams.get('limit');
  const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 0, 1), 100) : 100;

  const where: string[] = [`r.status = 'published'`];
  const params: unknown[] = [];
  if (hall) {
    params.push(hall);
    where.push(`r.hall_id = $${params.length}`);
  }
  if (filter === 'ai') where.push(`r.source = 'ai'`);
  if (filter === 'community') where.push(`r.source = 'user'`);

  params.push(limit);
  const limitIdx = params.length;

  const { rows } = await query<RecipeRow>(
    `SELECT r.id, r.hall_id, r.source, r.title, r.description, r.ingredients, r.steps,
            r.dietary_tags, r.prep_time_mins, r.meal_period, r.date, r.created_at,
            latest_img.storage_path AS thumbnail
       FROM recipes r
       LEFT JOIN LATERAL (
         SELECT storage_path FROM recipe_images
          WHERE recipe_id = r.id ORDER BY created_at DESC LIMIT 1
       ) latest_img ON true
      WHERE ${where.join(' AND ')}
      ORDER BY (r.source = 'ai') DESC, r.created_at DESC
      LIMIT $${limitIdx}`,
    params,
  );

  return NextResponse.json({ recipes: rows });
}

export async function POST(req: Request) {
  if (!rateLimit(req, 'general')) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const parsed = PostRecipeBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const b = parsed.data;
  const { rows } = await query<{ id: string }>(
    `INSERT INTO recipes (hall_id, source, title, description, ingredients, steps,
                          dietary_tags, prep_time_mins, meal_period, date,
                          status, menu_item_ids)
     VALUES ($1, 'user', $2, $3, $4, $5, $6, $7, $8::meal_period, CURRENT_DATE,
             'published', $9)
     RETURNING id`,
    [
      b.hall_id,
      b.title,
      b.description,
      b.ingredients,
      b.steps,
      b.dietary_tags,
      b.prep_time_mins ?? null,
      b.meal_period,
      b.menu_item_ids,
    ],
  );
  return NextResponse.json({ id: rows[0].id }, { status: 201 });
}
