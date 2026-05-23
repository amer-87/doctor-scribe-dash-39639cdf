revoke all on function app_private.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke all on function app_private.is_approved(uuid) from public, anon, authenticated;
revoke all on function app_private.get_effective_doctor_id(uuid) from public, anon, authenticated;
revoke all on function app_private.is_subscription_valid(uuid) from public, anon, authenticated;
revoke all on function app_private.can_write(uuid) from public, anon, authenticated;

grant execute on function app_private.has_role(uuid, public.app_role) to anon, authenticated;
grant execute on function app_private.is_approved(uuid) to anon, authenticated;
grant execute on function app_private.get_effective_doctor_id(uuid) to anon, authenticated;
grant execute on function app_private.is_subscription_valid(uuid) to anon, authenticated;
grant execute on function app_private.can_write(uuid) to anon, authenticated;