ALTER TABLE albums ADD COLUMN deleted_at integer;
ALTER TABLE albums ADD COLUMN deleted_by text;
ALTER TABLE albums ADD COLUMN purpose text NOT NULL DEFAULT 'album';
ALTER TABLE assets ADD COLUMN deleted_at integer;
ALTER TABLE assets ADD COLUMN deleted_by text;
ALTER TABLE assets ADD COLUMN captured_on text;
CREATE INDEX assets_archive_order ON assets(created_at DESC, id DESC);
CREATE INDEX assets_day_order ON assets(captured_on, created_at, id);
CREATE TABLE day_settings (
  id integer PRIMARY KEY CHECK (id=1),
  desktop_asset_id text,
  mobile_asset_id text,
  revision integer NOT NULL DEFAULT 0
);
INSERT INTO day_settings(id) VALUES(1);
INSERT INTO albums(id,title,visibility,owner_id,paper,purpose,created_at,updated_at)
VALUES('photo-days','Günler','shared','umut','ivory','days',unixepoch()*1000,unixepoch()*1000);
