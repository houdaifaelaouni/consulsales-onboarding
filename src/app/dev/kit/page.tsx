import { notFound } from "next/navigation";
import { Kit } from "./kit";

export const metadata = { title: "UI kit" };

export default function KitPage() {
  // Visible in dev and preview deployments, hidden in production.
  if (process.env.VERCEL_ENV === "production") notFound();
  return <Kit />;
}
