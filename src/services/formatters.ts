import { isoOrBlank } from "./format.js";
import type {
  VikunjaBucket,
  VikunjaLabel,
  VikunjaProject,
  VikunjaProjectView,
  VikunjaTask,
  VikunjaTaskComment,
} from "../types.js";

const PRIORITY_NAMES: Record<number, string> = {
  0: "None",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
  5: "Do now",
};

export function summariseTask(t: VikunjaTask): string {
  const status = t.done ? "DONE" : "open";
  const due = isoOrBlank(t.due_date);
  const prio = t.priority ? ` p${t.priority}` : "";
  const labels =
    t.labels && t.labels.length > 0
      ? ` [${t.labels.map((l) => l.title).join(", ")}]`
      : "";
  return `#${t.id} ${status}${prio} ${t.title}${due ? ` (due ${due})` : ""}${labels}`;
}

export function detailTask(t: VikunjaTask): string {
  const lines: string[] = [];
  lines.push(`# ${t.title}`);
  lines.push(``);
  lines.push(`- **ID**: ${t.id}${t.identifier ? ` (${t.identifier})` : ""}`);
  lines.push(`- **Project**: ${t.project_id}`);
  if (t.bucket_id) lines.push(`- **Bucket**: ${t.bucket_id}`);
  lines.push(`- **Status**: ${t.done ? `Done (${isoOrBlank(t.done_at) || "—"})` : "Open"}`);
  if (t.priority !== undefined && t.priority !== 0) {
    lines.push(`- **Priority**: ${t.priority} (${PRIORITY_NAMES[t.priority] ?? "?"})`);
  }
  const due = isoOrBlank(t.due_date);
  if (due) lines.push(`- **Due**: ${due}`);
  const start = isoOrBlank(t.start_date);
  if (start) lines.push(`- **Start**: ${start}`);
  const end = isoOrBlank(t.end_date);
  if (end) lines.push(`- **End**: ${end}`);
  if (typeof t.percent_done === "number" && t.percent_done > 0) {
    lines.push(`- **Progress**: ${Math.round(t.percent_done * 100)}%`);
  }
  if (t.is_favorite) lines.push(`- **Favourite**: yes`);
  if (t.labels && t.labels.length > 0) {
    lines.push(`- **Labels**: ${t.labels.map((l) => l.title).join(", ")}`);
  }
  if (t.assignees && t.assignees.length > 0) {
    lines.push(
      `- **Assignees**: ${t.assignees.map((u) => u.username || u.name || `user#${u.id}`).join(", ")}`,
    );
  }
  if (typeof t.comment_count === "number" && t.comment_count > 0) {
    lines.push(`- **Comments**: ${t.comment_count}`);
  }
  if (t.created) lines.push(`- **Created**: ${t.created}`);
  if (t.updated) lines.push(`- **Updated**: ${t.updated}`);
  if (t.description && t.description.trim().length > 0) {
    lines.push(``);
    lines.push(`## Description`);
    lines.push(``);
    lines.push(t.description);
  }
  return lines.join("\n");
}

export function summariseProject(p: VikunjaProject): string {
  const archived = p.is_archived ? " (archived)" : "";
  const parent = p.parent_project_id ? ` ← parent ${p.parent_project_id}` : "";
  return `#${p.id} ${p.title}${archived}${parent}`;
}

export function detailProject(p: VikunjaProject): string {
  const lines: string[] = [];
  lines.push(`# ${p.title}`);
  lines.push(``);
  lines.push(`- **ID**: ${p.id}${p.identifier ? ` (${p.identifier})` : ""}`);
  if (p.parent_project_id) lines.push(`- **Parent**: ${p.parent_project_id}`);
  if (p.owner) lines.push(`- **Owner**: ${p.owner.username || p.owner.name || `user#${p.owner.id}`}`);
  if (p.is_archived) lines.push(`- **Archived**: yes`);
  if (p.is_favorite) lines.push(`- **Favourite**: yes`);
  if (p.hex_color) lines.push(`- **Colour**: ${p.hex_color}`);
  if (p.views && p.views.length > 0) {
    lines.push(`- **Views**: ${p.views.map((v) => `${v.title} (${v.view_kind}, id ${v.id})`).join("; ")}`);
  }
  if (p.created) lines.push(`- **Created**: ${p.created}`);
  if (p.updated) lines.push(`- **Updated**: ${p.updated}`);
  if (p.description && p.description.trim().length > 0) {
    lines.push(``);
    lines.push(`## Description`);
    lines.push(``);
    lines.push(p.description);
  }
  return lines.join("\n");
}

export function summariseView(v: VikunjaProjectView): string {
  return `#${v.id} ${v.title} (${v.view_kind})`;
}

export function summariseBucket(b: VikunjaBucket): string {
  const lim = b.limit && b.limit > 0 ? ` cap ${b.limit}` : "";
  const count = typeof b.count === "number" ? ` ${b.count} tasks` : "";
  return `#${b.id} ${b.title}${count}${lim}`;
}

export function summariseLabel(l: VikunjaLabel): string {
  const color = l.hex_color ? ` (#${l.hex_color})` : "";
  return `#${l.id} ${l.title}${color}`;
}

export function summariseComment(c: VikunjaTaskComment): string {
  const author = c.author?.username || c.author?.name || `user#${c.author?.id ?? "?"}`;
  const date = c.created ?? "";
  return `#${c.id} [${author}${date ? `, ${date}` : ""}] ${c.comment.slice(0, 160)}`;
}
