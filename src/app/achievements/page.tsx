import { redirect } from "next/navigation";

/** "Bushido Trials" merged into the unified Train page (as Achievements). Kept as
 *  a redirect so old links and revalidatePath("/achievements") calls still work. */
export default function AchievementsRedirect() {
  redirect("/train");
}
