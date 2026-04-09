-- Note: add search_vector column + GIN index + trigger
ALTER TABLE "Note" ADD COLUMN "search_vector" tsvector;

CREATE INDEX "Note_search_vector_idx" ON "Note" USING GIN ("search_vector");

CREATE OR REPLACE FUNCTION note_search_vector_update() RETURNS trigger AS $$
DECLARE
  plain_text TEXT := '';
  body_json JSONB;
  tag_text TEXT := '';
BEGIN
  -- Extract plain text from BlockNote JSON body
  IF NEW.body IS NOT NULL AND NEW.body != '' THEN
    BEGIN
      body_json := NEW.body::jsonb;
      SELECT string_agg(elem::text, ' ') INTO plain_text
      FROM jsonb_path_query(body_json, 'strict $.**.text') AS elem;
    EXCEPTION WHEN OTHERS THEN
      -- Legacy HTML: strip tags
      plain_text := regexp_replace(NEW.body, '<[^>]+>', ' ', 'g');
    END;
  END IF;

  -- Join tags array
  IF NEW.tags IS NOT NULL THEN
    tag_text := array_to_string(NEW.tags, ' ');
  END IF;

  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(plain_text, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(tag_text, '')), 'C');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER note_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Note"
  FOR EACH ROW EXECUTE FUNCTION note_search_vector_update();

-- Project: add search_vector column + GIN index + trigger
ALTER TABLE "Project" ADD COLUMN "search_vector" tsvector;

CREATE INDEX "Project_search_vector_idx" ON "Project" USING GIN ("search_vector");

CREATE OR REPLACE FUNCTION project_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Project"
  FOR EACH ROW EXECUTE FUNCTION project_search_vector_update();

-- Area: add search_vector column + GIN index + trigger
ALTER TABLE "Area" ADD COLUMN "search_vector" tsvector;

CREATE INDEX "Area_search_vector_idx" ON "Area" USING GIN ("search_vector");

CREATE OR REPLACE FUNCTION area_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER area_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Area"
  FOR EACH ROW EXECUTE FUNCTION area_search_vector_update();

-- Resource: add search_vector column + GIN index + trigger
ALTER TABLE "Resource" ADD COLUMN "search_vector" tsvector;

CREATE INDEX "Resource_search_vector_idx" ON "Resource" USING GIN ("search_vector");

CREATE OR REPLACE FUNCTION resource_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resource_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Resource"
  FOR EACH ROW EXECUTE FUNCTION resource_search_vector_update();

-- Backfill existing rows so search_vector is populated
UPDATE "Note" SET title = title WHERE true;
UPDATE "Project" SET title = title WHERE true;
UPDATE "Area" SET title = title WHERE true;
UPDATE "Resource" SET title = title WHERE true;
