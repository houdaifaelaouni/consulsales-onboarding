import type { MessageKey } from "@/lib/i18n";
import type { StepInput } from "./campaign";

/**
 * The Build tab draws the sequence as a graph. The steps are the real campaign (a connection request, then up to eight
 * messages); the follow-up and booking nodes are the hand-off points where a reply leaves the sequence, which is what the
 * sender already does. Coordinates are deterministic so the canvas is the same on every render.
 */
export type FlowKind = "start" | "invite" | "message" | "agent" | "booked" | "confirm";

export interface FlowNode {
  id: string;
  kind: FlowKind;
  titleKey: MessageKey;
  subtitleKey: MessageKey;
  x: number;
  y: number;
  step?: number;
  delayDays?: number;
}

export interface FlowEdge { id: string; from: string; to: string; labelKey: MessageKey; tone: "primary" | "reply" | "ok" }

export interface FlowGraph { nodes: FlowNode[]; edges: FlowEdge[]; width: number; height: number }

export const FLOW = { col: 300, row: 150, pad: 40, nodeWidth: 232, nodeHeight: 92 } as const;

export function buildFlow(steps: StepInput[]): FlowGraph {
  const messages = steps.slice(1);
  const nodes: FlowNode[] = [
    { id: "start", kind: "start", titleKey: "outreach.fl.start", subtitleKey: "outreach.fl.startSub", x: 0, y: 0 },
    { id: "invite", kind: "invite", titleKey: "outreach.fl.invite", subtitleKey: "outreach.fl.inviteSub", x: FLOW.col, y: FLOW.row },
  ];
  const edges: FlowEdge[] = [
    { id: "e-start-invite", from: "start", to: "invite", labelKey: "outreach.fl.edge.connection", tone: "primary" },
  ];

  messages.forEach((m, i) => {
    const id = `message-${i + 1}`;
    nodes.push({
      id, kind: "message",
      titleKey: i === 0 ? "outreach.fl.firstMessage" : "outreach.fl.message",
      subtitleKey: "outreach.fl.messageSub",
      x: (i % 3) * FLOW.col,
      y: FLOW.row * 2 + Math.floor(i / 3) * FLOW.row,
      step: i + 1,
      delayDays: m.delayDays,
    });
    edges.push(
      i === 0
        ? { id: "e-invite-message-1", from: "invite", to: id, labelKey: "outreach.fl.edge.accepted", tone: "ok" }
        : { id: `e-message-${i}-message-${i + 1}`, from: `message-${i}`, to: id, labelKey: "outreach.fl.edge.noReply", tone: "primary" },
    );
  });

  const agentRow = FLOW.row * (2 + Math.ceil(Math.max(messages.length, 1) / 3));
  const lastMessage = messages.length > 0 ? `message-${messages.length}` : "invite";
  nodes.push(
    { id: "followup", kind: "agent", titleKey: "outreach.fl.followup", subtitleKey: "outreach.fl.followupSub", x: 0, y: agentRow },
    { id: "setter", kind: "agent", titleKey: "outreach.fl.setter", subtitleKey: "outreach.fl.setterSub", x: FLOW.col, y: agentRow },
    { id: "booked", kind: "booked", titleKey: "outreach.fl.booked", subtitleKey: "outreach.fl.bookedSub", x: FLOW.col * 2, y: agentRow },
    { id: "confirm", kind: "confirm", titleKey: "outreach.fl.confirm", subtitleKey: "outreach.fl.confirmSub", x: FLOW.col * 3, y: agentRow },
  );
  edges.push(
    { id: "e-last-followup", from: lastMessage, to: "followup", labelKey: "outreach.fl.edge.ifNoReply", tone: "primary" },
    { id: "e-followup-setter", from: "followup", to: "setter", labelKey: "outreach.fl.edge.ifReply", tone: "reply" },
    { id: "e-setter-booked", from: "setter", to: "booked", labelKey: "outreach.fl.edge.books", tone: "ok" },
    { id: "e-booked-confirm", from: "booked", to: "confirm", labelKey: "outreach.fl.edge.confirmed", tone: "ok" },
  );

  const width = FLOW.col * 4 + FLOW.nodeWidth;
  const height = agentRow + FLOW.nodeHeight;
  return { nodes, edges, width, height };
}

export function nodeCentre(node: FlowNode): { x: number; y: number } {
  return { x: node.x + FLOW.nodeWidth / 2, y: node.y + FLOW.nodeHeight / 2 };
}

/** A smooth path from one node to another: side to side when moving right, otherwise top to bottom (or the reverse). */
export function edgePath(from: FlowNode, to: FlowNode): string {
  const a = nodeCentre(from);
  const b = nodeCentre(to);
  if (Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)) {
    const x1 = b.x > a.x ? a.x + FLOW.nodeWidth / 2 : a.x - FLOW.nodeWidth / 2;
    const x2 = b.x > a.x ? b.x - FLOW.nodeWidth / 2 : b.x + FLOW.nodeWidth / 2;
    const mid = (x1 + x2) / 2;
    return `M ${x1} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${x2} ${b.y}`;
  }
  const y1 = b.y > a.y ? a.y + FLOW.nodeHeight / 2 : a.y - FLOW.nodeHeight / 2;
  const y2 = b.y > a.y ? b.y - FLOW.nodeHeight / 2 : b.y + FLOW.nodeHeight / 2;
  const mid = (y1 + y2) / 2;
  return `M ${a.x} ${y1} C ${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${y2}`;
}
