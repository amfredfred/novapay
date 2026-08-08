-- Allow users to self-issue a card on their own account (mirrors "accounts: own insert").
-- Previously only select/update policies existed, so client-side card issuance had no path.
create policy "cards: own insert"
  on public.cards for insert
  with check (auth.uid() = user_id);
