-- Index to support cross-day aggregation of ratings and images
-- for the same dish (identified by hall_id + name).
CREATE INDEX idx_menu_items_hall_name ON menu_items(hall_id, name);
