// Todo module type definitions — aligned with todo-service backend models

// ─── Status enums ───────────────────────────────────────

export type TodoStatus = 'open' | 'closed';
export type GoalStatus = 'active' | 'completed' | 'archived';

// ─── Core models (match backend JSON exactly) ───────────

/**
 * Todo — from model.Todo in todo-service.
 * `assignees` is only present in TodoDetail responses (GET /todos/:id, POST /todos).
 */
export interface Todo {
  id: string;
  space_id: string;
  goal_id?: string;
  title: string;
  description?: string;
  creator_id: string;
  status: TodoStatus;
  deadline?: string;
  remind_at?: string;
  source_channel_id?: string;
  source_channel_type?: number;
  source_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * TodoDetail — from service.TodoDetail, returned by GET /todos/:id and POST /todos.
 * Extends Todo with assignees.
 */
export interface TodoDetail extends Todo {
  assignees: TodoAssignee[];
}

export interface TodoAssignee {
  id: string;
  todo_id: string;
  user_id: string;
  created_at: string;
}

/**
 * Goal — from model.Goal in todo-service.
 * Backend uses `creator_id`, not `owner_id`.
 */
export interface Goal {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  creator_id: string;
  status: GoalStatus;
  deadline?: string;
  open_count: number;
  closed_count: number;
  created_at: string;
  updated_at: string;
}

export interface GoalAssignee {
  id: string;
  goal_id: string;
  user_id: string;
  created_at: string;
}

/**
 * GoalDetail — from service.GoalDetail, returned by GET /goals/:id.
 * Returns goal metadata + assignees.
 */
export interface GoalDetail extends Goal {
  assignees: GoalAssignee[];
}

export interface TodoComment {
  id: string;
  todo_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface TodoAttachment {
  id: string;
  todo_id: string;
  user_id: string;
  file_url: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

// ─── Pagination ─────────────────────────────────────────

export interface Pagination {
  has_more: boolean;
  next_cursor?: string;
}

export interface PaginatedList<T> {
  data: T[];
  pagination: Pagination;
}

// ─── Request types ──────────────────────────────────────

export interface TodoListParams {
  status?: TodoStatus;
  goal_id?: string;
  assignee_id?: string;
  creator_id?: string;
  source_channel_id?: string;
  source_channel_type?: number;
  q?: string;
  limit?: number;
  cursor?: string;
}

export interface CreateTodoReq {
  title: string;
  description?: string;
  goal_id?: string;
  assignee_ids?: string[];
  source_channel_id?: string;
  source_channel_type?: number;
  source_name?: string;
  deadline?: string;
}

export interface UpdateTodoReq {
  title?: string;
  description?: string | null;
  goal_id?: string | null;
  deadline?: string | null;
  remind_at?: string | null;
}

export interface CreateGoalReq {
  title: string;
  description?: string;
  deadline?: string;
}

export interface UpdateGoalReq {
  title?: string;
  description?: string;
  deadline?: string;
}

// ─── API error ──────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
