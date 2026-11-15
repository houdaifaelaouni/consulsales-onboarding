export type Role = "client_owner" | "delivery_lead" | "admin";

export interface ViewerFacts { isAdmin: boolean; roles: Role[] }

/** Staff are the founder (admin flag) and anyone who is a delivery lead or admin on at least one workspace. */
export function isStaff(v: ViewerFacts): boolean {
  return v.isAdmin || v.roles.some((r) => r === "admin" || r === "delivery_lead");
}

/** Where a signed-in person belongs when they open a side they may not use. */
export function landingFor(side: "client" | "admin", v: ViewerFacts): "ok" | "/app" | "/login" {
  if (side === "admin") return isStaff(v) ? "ok" : "/app";
  return "ok";
}
