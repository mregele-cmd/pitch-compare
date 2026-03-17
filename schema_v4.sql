-- Migration v4: add creator_email to rooms table for tiered permissions
-- Run this in the Supabase SQL Editor after schema_v3.sql

alter table rooms add column if not exists creator_email text;
