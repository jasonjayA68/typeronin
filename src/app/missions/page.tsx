import { redirect } from "next/navigation";

/** Missions merged into the unified Train page. Kept as a redirect so old links,
 *  bookmarks and revalidatePath("/missions") calls still resolve. */
export default function MissionsRedirect() {
  redirect("/train");
}
