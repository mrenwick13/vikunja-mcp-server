export interface VikunjaUser {
  id: number;
  username?: string;
  name?: string;
  email?: string;
  created?: string;
  updated?: string;
}

export interface VikunjaLabel {
  id: number;
  title: string;
  description?: string;
  hex_color?: string;
  created?: string;
  updated?: string;
  created_by?: VikunjaUser;
}

export interface VikunjaTaskAssignee {
  user_id: number;
  created?: string;
}

export interface VikunjaTaskRelation {
  task_id: number;
  other_task_id: number;
  relation_kind: string;
  created?: string;
  created_by?: VikunjaUser;
}

export interface VikunjaTask {
  id: number;
  title: string;
  description?: string;
  done: boolean;
  done_at?: string;
  due_date?: string;
  start_date?: string;
  end_date?: string;
  priority?: number;
  percent_done?: number;
  project_id: number;
  bucket_id?: number;
  hex_color?: string;
  identifier?: string;
  index?: number;
  is_favorite?: boolean;
  position?: number;
  repeat_after?: number;
  repeat_mode?: number;
  labels?: VikunjaLabel[] | null;
  assignees?: VikunjaUser[] | null;
  comment_count?: number;
  related_tasks?: Record<string, VikunjaTask[]>;
  reminders?: unknown[] | null;
  attachments?: unknown[] | null;
  cover_image_attachment_id?: number;
  created?: string;
  updated?: string;
  created_by?: VikunjaUser;
}

export interface VikunjaProjectView {
  id: number;
  title: string;
  project_id: number;
  view_kind: "list" | "gantt" | "table" | "kanban" | string;
  position?: number;
  bucket_configuration_mode?: "none" | "manual" | "filter" | string;
  bucket_configuration?: unknown[] | null;
  default_bucket_id?: number;
  done_bucket_id?: number;
  filter?: Record<string, unknown> | null;
  created?: string;
  updated?: string;
}

export interface VikunjaProject {
  id: number;
  title: string;
  description?: string;
  identifier?: string;
  hex_color?: string;
  parent_project_id?: number;
  owner?: VikunjaUser;
  is_archived?: boolean;
  is_favorite?: boolean;
  position?: number;
  views?: VikunjaProjectView[];
  background_information?: unknown;
  background_blur_hash?: string;
  max_permission?: number;
  created?: string;
  updated?: string;
}

export interface VikunjaBucket {
  id: number;
  title: string;
  limit: number;
  count?: number;
  position?: number;
  project_view_id: number;
  created?: string;
  updated?: string;
  created_by?: VikunjaUser;
}

export interface VikunjaTaskComment {
  id: number;
  comment: string;
  author?: VikunjaUser;
  created?: string;
  updated?: string;
}

export interface VikunjaSavedFilter {
  id: number;
  title: string;
  description?: string;
  filters?: Record<string, unknown>;
  owner?: VikunjaUser;
  is_favorite?: boolean;
  created?: string;
  updated?: string;
}

export interface VikunjaSubscription {
  id: number;
  entity: number;
  entity_id: number;
  created?: string;
}

export type SubscriptionEntity = "project" | "task";
