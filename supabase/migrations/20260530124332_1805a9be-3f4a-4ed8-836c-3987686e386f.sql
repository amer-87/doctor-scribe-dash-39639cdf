
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_effective_doctor_id(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_subscription_valid(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_write(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.find_doctor_by_code(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.verify_prescription(uuid) TO authenticated, anon, service_role;
