import { ClientDashboard } from "@/components/dashboard/client-dashboard";
import { DEMO_NOW, DEMO_TASKS } from "@/lib/dashboard/sample";

export default function DemoOverview() {
  return (
    <ClientDashboard
      name="Sara" company="Studio North" startDate="2026-11-13" now={new Date(DEMO_NOW)} tasks={DEMO_TASKS}
      links="demo" nextPayment={{ amount: "€900", due: "Due in 4 days, after your profile approval" }}
    />
  );
}
