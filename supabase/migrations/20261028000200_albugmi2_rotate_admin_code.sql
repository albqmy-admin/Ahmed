-- مكتب البقمي 2: rotate the initial owner code; only its SHA-256 digest is stored.
DO $migration$
BEGIN
  UPDATE albugmi2_private.admin_access
  SET code_sha256 = 'e36714d7342c9c303d841a8e357d21e63e49cf64e688bbb6fc5303484bdb7e8f',
      created_at = pg_catalog.now()
  WHERE singleton;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'albugmi2 admin access row is missing';
  END IF;
END;
$migration$;
