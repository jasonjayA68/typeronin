import { redirect } from "next/navigation";

/** The wallet now lives inside the dashboard. Kept as a redirect so old links
 *  and revalidatePath("/withdrawals") calls from the withdrawal actions still
 *  resolve. */
export default function WithdrawalsRedirect() {
  redirect("/dashboard");
}
