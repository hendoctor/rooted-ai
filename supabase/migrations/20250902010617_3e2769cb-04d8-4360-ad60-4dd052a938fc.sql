-- Create the Testy company first
INSERT INTO companies (name, slug, settings, created_at, updated_at)
VALUES ('Testy', 'testy', '{}'::jsonb, now(), now())
ON CONFLICT (slug) DO NOTHING;