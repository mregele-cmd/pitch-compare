-- Migration v3: add author_emails column to videos table
-- Run this in the Supabase SQL Editor after schema_v2.sql

alter table videos add column if not exists author_emails text;
