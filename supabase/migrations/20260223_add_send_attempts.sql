DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'send_attempts') THEN 
        ALTER TABLE messages ADD COLUMN send_attempts INTEGER DEFAULT 0; 
    END IF; 
END $$;
