alter default privileges for role postgres in schema app_private revoke execute on functions from public;

revoke execute on all functions in schema app_private from public;
grant execute on function app_private.has_role(uuid, public.app_role) to anon, authenticated;
grant execute on function app_private.is_approved(uuid) to anon, authenticated;
grant execute on function app_private.get_effective_doctor_id(uuid) to anon, authenticated;
grant execute on function app_private.is_subscription_valid(uuid) to anon, authenticated;
grant execute on function app_private.can_write(uuid) to anon, authenticated;

revoke execute on function public.verify_prescription(uuid) from public;
grant execute on function public.verify_prescription(uuid) to anon, authenticated;