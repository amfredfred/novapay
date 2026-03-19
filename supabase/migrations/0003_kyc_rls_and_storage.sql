-- ── KYC Documents: add UPDATE policy for users ───────────────────────────────
-- upsert = INSERT on first upload, UPDATE on re-upload.
-- Without this, re-uploading an existing doc type fails RLS.
create policy "kyc_docs: update own"
  on public.kyc_documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Storage: kyc-documents bucket ────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760,  -- 10 MB
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;

-- Users can upload to their own folder: {user_id}/{doc_type}.{ext}
create policy "kyc storage: user upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update (overwrite) their own files
create policy "kyc storage: user update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own files
create policy "kyc storage: user read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins and superadmins can read all KYC files
create policy "kyc storage: admin read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'kyc-documents'
    and (
      public.is_superadmin()
      or (auth.jwt()->'app_metadata'->>'role' = 'admin')
    )
  );
