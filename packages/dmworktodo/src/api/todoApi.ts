import axios from 'axios';
import { WKApp } from '@dmwork/base';
import type {
  Todo,
  TodoDetail,
  Goal,
  GoalStatus,
  TodoComment,
  TodoAttachment,
  PaginatedList,
  TodoListParams,
  CreateTodoReq,
  UpdateTodoReq,
  CreateGoalReq,
  UpdateGoalReq,
  TodoStatus,
} from '../bridge/types';

/**
 * Isolated axios instance for todo-service API.
 * Must NOT inherit axios.defaults.baseURL (set to '/api/v1/' by WKApp.apiClient)
 * otherwise all paths get double-prefixed.
 */
const todoAxios = axios.create({ baseURL: '' });

// Inject auth headers via interceptor (consistent with base APIClient pattern).
// Token is read at request time so it stays fresh after refresh.
todoAxios.interceptors.request.use((config) => {
  const token = WKApp.loginInfo.token;
  if (token) {
    config.headers['token'] = token;
  }
  const spaceId = WKApp.shared.currentSpaceId;
  if (spaceId) {
    config.headers['X-Space-Id'] = spaceId;
  }
  return config;
});

// Handle 401 — mirror APIClient behavior (trigger logout on expired token)
todoAxios.interceptors.response.use(undefined, (err) => {
  if (err?.response?.status === 401) {
    WKApp.shared.logout();
  }
  return Promise.reject(err);
});

/**
 * Extract server error message from axios error response.
 */
function extractErrorMessage(err: unknown): string {
  const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
  const msg = axiosErr?.response?.data?.error?.message;
  const raw = msg || (err instanceof Error ? err.message : 'Request failed');
  // Cap length to prevent pathologically long server error messages in toasts
  return raw.length > 200 ? raw.slice(0, 200) + '…' : raw;
}

/**
 * Base path for todo-service API.
 * Vite proxy rewrites /todo/api/v1/* → todo-service:8080/api/v1/*
 */
const BASE = '/todo/api/v1';

/**
 * Build query string params, filtering out undefined values.
 */
function buildParams(obj?: Record<string, unknown>): Record<string, string> {
  if (!obj) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return result;
}

/**
 * Unwrap axios response — return response.data directly.
 */
async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  try {
    const resp = await todoAxios.get(`${BASE}${path}`, {
      params: buildParams(params),
    });
    return resp.data;
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err));
  }
}

async function post<T>(path: string, data?: unknown): Promise<T> {
  try {
    const resp = await todoAxios.post(`${BASE}${path}`, data);
    return resp.data;
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err));
  }
}

async function put<T>(path: string, data?: unknown): Promise<T> {
  try {
    const resp = await todoAxios.put(`${BASE}${path}`, data);
    return resp.data;
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err));
  }
}

async function del<T>(path: string): Promise<T> {
  try {
    const resp = await todoAxios.delete(`${BASE}${path}`);
    return resp.data;
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err));
  }
}

// ─── Goals ──────────────────────────────────────────────

export async function listGoals(status?: GoalStatus): Promise<Goal[]> {
  const params: Record<string, unknown> = {};
  if (status) params.status = status;
  const resp = await get<PaginatedList<Goal>>('/goals', params);
  return resp?.data ?? [];
}

export async function getGoal(goalId: string): Promise<Goal> {
  return get<Goal>(`/goals/${goalId}`);
}

export async function createGoal(req: CreateGoalReq): Promise<Goal> {
  return post<Goal>('/goals', req);
}

export async function updateGoal(goalId: string, req: UpdateGoalReq): Promise<Goal> {
  return put<Goal>(`/goals/${goalId}`, req);
}

export async function deleteGoal(goalId: string): Promise<void> {
  return del<void>(`/goals/${goalId}`);
}

export async function transitionGoalStatus(goalId: string, status: GoalStatus): Promise<Goal> {
  return put<Goal>(`/goals/${goalId}/status`, { status });
}

// ─── Todos ──────────────────────────────────────────────

export async function listTodos(params?: TodoListParams): Promise<PaginatedList<Todo>> {
  return get<PaginatedList<Todo>>('/todos', params as unknown as Record<string, unknown>);
}

export async function getTodo(todoId: string): Promise<TodoDetail> {
  return get<TodoDetail>(`/todos/${todoId}`);
}

export async function createTodo(req: CreateTodoReq): Promise<TodoDetail> {
  return post<TodoDetail>('/todos', req);
}

export async function updateTodo(todoId: string, req: UpdateTodoReq): Promise<TodoDetail> {
  return put<TodoDetail>(`/todos/${todoId}`, req);
}

export async function transitionTodo(todoId: string, status: TodoStatus): Promise<TodoDetail> {
  return put<TodoDetail>(`/todos/${todoId}/status`, { status });
}

export async function deleteTodo(todoId: string): Promise<void> {
  return del<void>(`/todos/${todoId}`);
}

// ─── Assignees ──────────────────────────────────────────

export async function addAssignee(todoId: string, userId: string): Promise<void> {
  return post<void>(`/todos/${todoId}/assignees`, { user_id: userId });
}

export async function removeAssignee(todoId: string, userId: string): Promise<void> {
  return del<void>(`/todos/${todoId}/assignees/${userId}`);
}


// ─── Comments ───────────────────────────────────────────

export async function listComments(todoId: string): Promise<TodoComment[]> {
  return get<TodoComment[]>(`/todos/${todoId}/comments`);
}

export async function addComment(todoId: string, content: string): Promise<TodoComment> {
  return post<TodoComment>(`/todos/${todoId}/comments`, { content });
}

export async function deleteComment(todoId: string, commentId: string): Promise<void> {
  return del<void>(`/todos/${todoId}/comments/${commentId}`);
}

// ─── Attachments ────────────────────────────────────────

export async function listAttachments(todoId: string): Promise<TodoAttachment[]> {
  return get<TodoAttachment[]>(`/todos/${todoId}/attachments`);
}

export async function createAttachment(
  todoId: string,
  fileUrl: string,
  fileName?: string,
  fileSize?: number,
  mimeType?: string,
): Promise<TodoAttachment> {
  return post<TodoAttachment>(`/todos/${todoId}/attachments`, {
    file_url: fileUrl,
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeType,
  });
}

export async function deleteAttachment(todoId: string, attachmentId: string): Promise<void> {
  return del<void>(`/todos/${todoId}/attachments/${attachmentId}`);
}
