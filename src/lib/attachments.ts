import { supabase } from "@/integrations/supabase/client";

/**
 * Extract storage path from either a legacy public URL
 * (.../storage/v1/object/public/attachments/<path>) or a raw path.
 */
export function extractAttachmentPath(value: string): string {
  const m = value.match(/\/attachments\/(.+)$/);
  return m ? m[1] : value;
}

export async function getAttachmentSignedUrl(
  value: string,
  expiresIn = 3600,
): Promise<string> {
  const path = extractAttachmentPath(value);
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(path, expiresIn);
  if (error || !data) return "";
  return data.signedUrl;
}

export async function getAttachmentSignedUrls(
  values: string[],
  expiresIn = 3600,
): Promise<string[]> {
  return Promise.all(values.map((v) => getAttachmentSignedUrl(v, expiresIn)));
}
