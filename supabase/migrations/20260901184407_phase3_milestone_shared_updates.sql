drop policy if exists "milestones_update_member" on public.milestones;
create policy "milestones_update_member" on public.milestones for update to authenticated
  using ((select private.is_active_couple_member(couple_id)))
  with check ((select private.is_active_couple_member(couple_id)));
