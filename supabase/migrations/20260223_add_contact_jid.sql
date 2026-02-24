DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'contact_jid') THEN 
        ALTER TABLE conversations ADD COLUMN contact_jid TEXT; 
    END IF; 
END $$;
