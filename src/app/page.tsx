import { redirect } from "next/navigation";

/** The root has nothing of its own: signed-in people land on their client side, everyone else on the login page. */
export default function Home() {
  redirect("/app");
}
