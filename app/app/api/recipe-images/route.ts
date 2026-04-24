import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { getOrCreateSessionHash } from '@/lib/session';
import { PostRecipeImageBody } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

const MAX_IMAGES_PER_RECIPE = 15;

export async function GET(req: Request) {
  if (!rateLimit(req, 'general')) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const url = new URL(req.url);
  const recipeId = url.searchParams.get('recipe_id');
  if (!recipeId) {
    return NextResponse.json({ error: 'recipe_id required' }, { status: 400 });
  }
  const { rows } = await query<{ id: string; storage_path: string; created_at: string }>(
    `SELECT id, storage_path, created_at
       FROM recipe_images
      WHERE recipe_id = $1
      ORDER BY created_at DESC`,
    [recipeId],
  );
  return NextResponse.json(rows);
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
  const parsed = PostRecipeImageBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { recipe_id, storage_path } = parsed.data;

  // Verify recipe exists
  const { rows: recipes } = await query('SELECT id FROM recipes WHERE id = $1', [recipe_id]);
  if (recipes.length === 0) {
    return NextResponse.json({ error: 'recipe not found' }, { status: 404 });
  }

  // Check image count limit
  const { rows: countRows } = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM recipe_images WHERE recipe_id = $1',
    [recipe_id],
  );
  if (Number(countRows[0].count) >= MAX_IMAGES_PER_RECIPE) {
    return NextResponse.json({ error: 'image limit reached' }, { status: 409 });
  }

  const session = getOrCreateSessionHash();
  const { rows } = await query<{ id: string; storage_path: string; created_at: string }>(
    `INSERT INTO recipe_images (recipe_id, storage_path, session_token)
     VALUES ($1, $2, $3)
     RETURNING id, storage_path, created_at`,
    [recipe_id, storage_path, session],
  );
  return NextResponse.json(rows[0], { status: 201 });
}
