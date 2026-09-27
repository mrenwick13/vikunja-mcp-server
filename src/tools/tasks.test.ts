import { test } from "node:test";
import assert from "node:assert/strict";
import type { VikunjaClient } from "../services/api.js";
import { updateTaskMerged } from "./tasks.js";

function fakeClient(current: Record<string, unknown>) {
  const posts: Array<{ path: string; body: Record<string, unknown> }> = [];
  const client = {
    get: async () => current,
    post: async (path: string, body: Record<string, unknown>) => {
      posts.push({ path, body });
      return { ...current, ...body };
    },
  } as unknown as VikunjaClient;
  return { client, posts };
}

const michael = { id: 1, username: "michael", name: "Michael" };

test("partial update re-sends current assignees", async () => {
  const { client, posts } = fakeClient({
    id: 538,
    title: "T",
    priority: 3,
    assignees: [michael],
  });
  await updateTaskMerged(client, 538, { due_date: "2026-10-01T00:00:00Z" });
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0].body.assignees, [michael]);
  assert.equal(posts[0].body.priority, 3);
  assert.equal(posts[0].body.due_date, "2026-10-01T00:00:00Z");
});

test("completing a task keeps its assignees", async () => {
  const { client, posts } = fakeClient({ id: 5, title: "T", assignees: [michael] });
  await updateTaskMerged(client, 5, { done: true });
  assert.deepEqual(posts[0].body.assignees, [michael]);
  assert.equal(posts[0].body.done, true);
});

test("unassigned task sends no assignees key", async () => {
  const { client, posts } = fakeClient({ id: 6, title: "T", assignees: null });
  await updateTaskMerged(client, 6, { priority: 1 });
  assert.ok(!("assignees" in posts[0].body));
});
