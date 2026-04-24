CREATE TABLE recipe_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id     uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  session_token text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ri_recipe ON recipe_images(recipe_id);
