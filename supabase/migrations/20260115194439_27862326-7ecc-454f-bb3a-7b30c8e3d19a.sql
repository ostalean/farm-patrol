-- Add is_recurring column to alerts table
ALTER TABLE public.alerts ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT true;