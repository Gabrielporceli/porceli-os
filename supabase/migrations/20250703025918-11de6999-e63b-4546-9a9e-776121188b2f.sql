-- Add recurrence fields to finances table
ALTER TABLE public.finances 
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN recurrence_type TEXT;