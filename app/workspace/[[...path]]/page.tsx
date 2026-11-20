import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { workspaceRoute, canonicalWorkspacePath } from "@/lib/navigation";
import { sessionUser, HttpError } from "@/lib/server";
export const dynamic = "force-dynamic";
export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { path } = await params;
  const pathname = canonicalWorkspacePath(path);
  if (!workspaceRoute(pathname)) notFound();
  const search = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search))
    if (typeof value === "string") query.set(key, value);
  try {
    await sessionUser((await headers()).get("cookie"));
  } catch (e) {
    if (e instanceof HttpError && (e.status === 401 || e.status === 503))
      redirect(
        `/login?next=${encodeURIComponent(pathname + (query.size ? `?${query}` : ""))}`,
      );
    throw e;
  }
  if (!path?.length) redirect("/workspace/meetings");
  return null;
}
