import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WKApp } from '@dmwork/base';
import * as api from '../api/todoApi';
import type { Todo, TodoDetail, Goal, GoalStatus, TodoStatus, TodoListParams, TodoComment, TodoAttachment, CreateGoalReq } from '../bridge/types';
import TodoCard from '../ui/TodoCard';
import TodoStatusBadge from '../ui/TodoStatusBadge';
import TodoFilterBar from '../ui/TodoFilterBar';
import AssigneeEditor from '../ui/AssigneeEditor';
import UserName from '../ui/UserName';
import { Toast } from '../utils/toast';
import { registerCreateTodoHandler } from '../module';
import './TodoPage.css';

/** Validate URL protocol to prevent javascript:/data: XSS via malicious file_url. */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch { return false; }
}

// ─── Detail Side Panel ──────────────────────────────────

function DetailSidePanel({ todoId, onClose, onStatusChanged }: { todoId: string; onClose: () => void; onStatusChanged?: () => void }) {
  const [todo, setTodo] = useState<TodoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<TodoComment[]>([]);
  const [attachments, setAttachments] = useState<TodoAttachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAttachForm, setShowAttachForm] = useState(false);
  const [attachUrl, setAttachUrl] = useState('');
  const [attachName, setAttachName] = useState('');
  const [attachSubmitting, setAttachSubmitting] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [updatingGoal, setUpdatingGoal] = useState(false);
  const updatingGoalRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c, a, g] = await Promise.all([
        api.getTodo(todoId),
        api.listComments(todoId),
        api.listAttachments(todoId),
        api.listGoals(),
      ]);
      setTodo(t);
      setComments(Array.isArray(c) ? c : []);
      setAttachments(Array.isArray(a) ? a : []);
      setGoals(Array.isArray(g) ? g : []);
    } catch (e) { Toast.error('Failed to load todo'); }
    finally { setLoading(false); }
  }, [todoId]);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = useCallback(async () => {
    if (!todo) return;
    const newStatus: TodoStatus = todo.status === 'open' ? 'closed' : 'open';
    try {
      await api.transitionTodo(todo.id, newStatus);
      await load();
      onStatusChanged?.();
    } catch (e) { Toast.error('Failed to update status'); }
  }, [todo, load, onStatusChanged]);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.addComment(todoId, newComment.trim());
      setNewComment('');
      const c = await api.listComments(todoId);
      setComments(Array.isArray(c) ? c : []);
    } catch (e) { Toast.error('Failed to add comment'); }
    finally { setSubmitting(false); }
  }, [todoId, newComment, submitting]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.deleteComment(todoId, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) { Toast.error('Failed to delete comment'); }
  }, [todoId]);

  const handleAddAttachment = useCallback(async () => {
    if (!attachUrl.trim() || attachSubmitting) return;
    if (!isSafeUrl(attachUrl.trim())) {
      Toast.error('Invalid URL — only http/https links are allowed');
      return;
    }
    setAttachSubmitting(true);
    try {
      await api.createAttachment(todoId, attachUrl.trim(), attachName.trim() || undefined);
      setAttachUrl('');
      setAttachName('');
      setShowAttachForm(false);
      const a = await api.listAttachments(todoId);
      setAttachments(Array.isArray(a) ? a : []);
    } catch (e) { Toast.error('Failed to add attachment'); }
    finally { setAttachSubmitting(false); }
  }, [todoId, attachUrl, attachName, attachSubmitting]);

  const handleDeleteAttachment = useCallback(async (attachmentId: string) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await api.deleteAttachment(todoId, attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (e) { Toast.error('Failed to delete attachment'); }
  }, [todoId]);

  const handleGoalChange = useCallback(async (goalId: string) => {
    if (updatingGoalRef.current) return;
    updatingGoalRef.current = true;
    setUpdatingGoal(true);
    try {
      // Only send goal_id — avoid overwriting title with potentially stale closure value.
      // Use todoId (from props) instead of todo.id to avoid stale closure on `todo`.
      const updated = await api.updateTodo(todoId, {
        goal_id: goalId || null,
      });
      setTodo(updated);
      onStatusChanged?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Toast.error(`Failed to update goal: ${msg}`);
    }
    finally {
      updatingGoalRef.current = false;
      setUpdatingGoal(false);
    }
  }, [todoId, onStatusChanged]);

  return (
    <div className="wk-todo-side-panel">
      <div className="wk-todo-side-panel__header">
        <span className="wk-todo-side-panel__header-title">Detail</span>
        <button type="button" className="wk-todo-side-panel__close" onClick={onClose}>✕</button>
      </div>
      <div className="wk-todo-side-panel__body">
        {loading && <div className="wk-todo-list__loading">Loading...</div>}
        {!loading && !todo && <div className="wk-todo-list__empty">Failed to load</div>}
        {!loading && todo && (
          <>
            <h2 className="wk-todo-detail__title">{todo.title}</h2>
            <div className="wk-todo-detail__status" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TodoStatusBadge status={todo.status} />
              <button type="button" className="wk-todo-detail__action-btn" onClick={handleToggleStatus}>
                {todo.status === 'open' ? '✕ Close' : '↺ Reopen'}
              </button>
            </div>
            {todo.description && <div className="wk-todo-detail__desc">{todo.description}</div>}
            <div className="wk-todo-detail__meta">
              <AssigneeEditor
                todoId={todo.id}
                assignees={todo.assignees ?? []}
                onChanged={load}
              />
              <div style={{ marginBottom: '4px' }}>
                <div style={{ fontSize: '14px', color: 'var(--wk-text-primary, #1a1a1a)', marginBottom: '8px' }}>
                  <strong style={{ fontWeight: 500 }}>Goal</strong>
                </div>
                <select
                  value={todo.goal_id || ''}
                  onChange={(e) => handleGoalChange(e.target.value)}
                  disabled={updatingGoal}
                  style={{
                    width: '100%', padding: '6px 10px',
                    border: '1px solid var(--wk-border-default, #e5e5e5)',
                    borderRadius: '6px', fontSize: '13px',
                    background: 'var(--wk-bg-surface, #fff)',
                    color: 'var(--wk-text-primary, #1a1a1a)',
                    outline: 'none', cursor: 'pointer',
                    opacity: updatingGoal ? 0.5 : 1,
                  }}
                >
                  <option value="">No goal</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
              {todo.deadline && <div><strong>Deadline:</strong> {new Date(todo.deadline).toLocaleDateString()}</div>}
              {todo.source_name && <div><strong>Source:</strong> {todo.source_name}</div>}
              <div className="wk-todo-detail__timestamps">
                Created: {new Date(todo.created_at).toLocaleString()} · Updated: {new Date(todo.updated_at).toLocaleString()}
              </div>
            </div>

            {/* Attachments */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--wk-border-default, #f0f0f0)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '13px', color: 'var(--wk-text-primary, #1a1a1a)' }}>Attachments ({attachments.length})</strong>
                {!showAttachForm && (
                  <button type="button" onClick={() => setShowAttachForm(true)} style={{
                    border: 'none', background: 'none', color: 'var(--wk-brand-primary, #7C5CFC)',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                  }}>+ Add</button>
                )}
              </div>
              {showAttachForm && (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input type="text" placeholder="File URL (required)" value={attachUrl}
                    onChange={(e) => setAttachUrl(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid var(--wk-border-default, #e5e5e5)', borderRadius: '6px', fontSize: '12px', outline: 'none' }} />
                  <input type="text" placeholder="File name (optional)" value={attachName}
                    onChange={(e) => setAttachName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddAttachment(); }}
                    style={{ padding: '6px 10px', border: '1px solid var(--wk-border-default, #e5e5e5)', borderRadius: '6px', fontSize: '12px', outline: 'none' }} />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" onClick={handleAddAttachment} disabled={!attachUrl.trim() || attachSubmitting}
                      style={{ padding: '5px 12px', border: 'none', borderRadius: '4px', background: 'var(--wk-brand-primary, #7C5CFC)', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 500, opacity: (!attachUrl.trim() || attachSubmitting) ? 0.5 : 1 }}>
                      {attachSubmitting ? '...' : 'Add'}
                    </button>
                    <button type="button" onClick={() => { setShowAttachForm(false); setAttachUrl(''); setAttachName(''); }}
                      style={{ padding: '5px 12px', border: 'none', borderRadius: '4px', background: 'transparent', color: 'var(--wk-text-tertiary, #999)', cursor: 'pointer', fontSize: '12px' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {attachments.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 10px', background: 'var(--wk-bg-base, #f7f8fa)', borderRadius: '6px', fontSize: '13px',
                  }}>
                    <a href={isSafeUrl(a.file_url) ? a.file_url : '#'} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--wk-brand-primary, #7C5CFC)', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📎 {a.file_name || 'Attachment'}
                      {a.file_size ? ` (${(a.file_size / 1024).toFixed(1)} KB)` : ''}
                    </a>
                    <button type="button" onClick={() => handleDeleteAttachment(a.id)}
                      style={{ border: 'none', background: 'none', color: 'var(--wk-text-disabled, #ccc)', cursor: 'pointer', fontSize: '11px', padding: '0 2px', transition: 'color 150ms' }}>
                      ✕
                    </button>
                  </div>
                ))}
                {attachments.length === 0 && !showAttachForm && (
                  <div style={{ color: 'var(--wk-text-disabled, #bbb)', fontSize: '13px', padding: '4px 0' }}>No attachments</div>
                )}
              </div>
            </div>

            {/* Comments */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--wk-border-default, #f0f0f0)', paddingTop: '14px' }}>
              <strong style={{ fontSize: '13px', color: 'var(--wk-text-primary, #1a1a1a)' }}>Comments ({comments.length})</strong>
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {comments.map(c => (
                  <div key={c.id} style={{ padding: '10px 12px', background: 'var(--wk-bg-base, #f7f8fa)', borderRadius: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--wk-text-primary, #1a1a1a)', fontSize: '12px' }}><UserName uid={c.user_id} /></span>
                      <span style={{ fontSize: '11px', color: 'var(--wk-text-tertiary, #999)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {new Date(c.created_at).toLocaleString()}
                        <button type="button" onClick={() => handleDeleteComment(c.id)}
                          style={{
                            border: 'none', background: 'none', color: 'var(--wk-text-disabled, #ccc)',
                            cursor: 'pointer', fontSize: '11px', padding: '0 2px',
                            transition: 'color 150ms',
                          }}>
                          ✕
                        </button>
                      </span>
                    </div>
                    <div style={{ color: 'var(--wk-text-secondary, #555)', lineHeight: '1.5' }}>{c.content}</div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div style={{ color: 'var(--wk-text-disabled, #bbb)', fontSize: '13px', padding: '8px 0' }}>No comments yet</div>
                )}
              </div>
              {/* Add comment */}
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  style={{
                    flex: 1, padding: '8px 12px', border: '1px solid var(--wk-border-default, #e5e5e5)',
                    borderRadius: '6px', fontSize: '13px', outline: 'none',
                    transition: 'border-color 150ms',
                  }}
                />
                <button type="button" onClick={handleAddComment} disabled={!newComment.trim() || submitting}
                  style={{
                    padding: '8px 14px', border: 'none',
                    borderRadius: '6px', background: 'var(--wk-brand-primary, #7C5CFC)',
                    color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                    opacity: (!newComment.trim() || submitting) ? 0.5 : 1,
                    transition: 'opacity 150ms',
                  }}>
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Todo List View (used for both All Todos and Goal Todos) ─────

function TodoListView({ title, goalId, prefillTodo, onGoalsRefresh }: { title: string; goalId?: string; prefillTodo?: { title: string; source_channel_id: string; source_channel_type: number }; onGoalsRefresh?: () => void }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TodoListParams>({});
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const cursorRef = useRef<string | undefined>();
  const [showCreateDialog, setShowCreateDialog] = useState(!!prefillTodo);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  // Serialize filters to a stable string for useCallback deps.
  // JSON.stringify produces an identical string across renders when `filters`
  // state hasn't changed, so `load` only gets recreated on actual filter changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const load = useCallback(async (append = false) => {
    if (!append) setLoading(true);
    try {
      const params: TodoListParams = { ...filters, limit: 50 };
      if (goalId) params.goal_id = goalId;
      if (append && cursorRef.current) params.cursor = cursorRef.current;

      const res = await api.listTodos(params);
      setTodos(append ? (prev) => [...prev, ...res.data] : res.data);
      setHasMore(res.pagination.has_more);
      cursorRef.current = res.pagination.next_cursor;
      setCursor(res.pagination.next_cursor);
    } catch (e) { Toast.error('Failed to load todos'); }
    finally { setLoading(false); }
  }, [goalId, filtersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when filters change. `load` is in deps so this fires when
  // filtersKey changes (which recreates `load`). `filters` in deps is
  // intentionally redundant for readability.
  useEffect(() => {
    cursorRef.current = undefined;
    setCursor(undefined);
    load(false);
  }, [load]); // goalId/filters changes cascade through `load` identity

  const handleToggleStatus = useCallback(async (todoId: string, currentStatus: TodoStatus) => {
    const newStatus: TodoStatus = currentStatus === 'open' ? 'closed' : 'open';
    try {
      await api.transitionTodo(todoId, newStatus);
      // Update local state
      setTodos(prev => prev.map(t => t.id === todoId ? { ...t, status: newStatus } : t));
    } catch (e) { Toast.error('Failed to update status'); }
  }, []);

  return (
    <div className="wk-todo-list-view" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="wk-todo-list-view__header">
        <span className="wk-todo-list-view__title">{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TodoFilterBar filters={filters} onFilterChange={(f) => setFilters(prev => ({ ...prev, ...f }))} />
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            style={{
              padding: '6px 14px', border: 'none',
              borderRadius: '6px', background: 'var(--wk-brand-primary, #7C5CFC)',
              color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
              whiteSpace: 'nowrap', transition: 'opacity 150ms',
              boxShadow: '0 1px 3px rgba(124, 92, 252, 0.3)',
            }}
          >
            + New Todo
          </button>
        </div>
      </div>

      {/* Content area: list + optional detail panel side by side */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* Todo list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {loading && <div className="wk-todo-list__loading" style={{ textAlign: 'center', padding: '40px', color: 'var(--wk-text-tertiary, #999)' }}>Loading...</div>}
        {!loading && todos.length === 0 && (
          <div className="wk-todo-list__empty" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--wk-text-disabled, #bbb)', fontSize: '14px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
            No todos{filters.status ? ` with status "${filters.status}"` : ''}
          </div>
        )}
        {!loading && todos.map(todo => {
          let isOverdue = false;
          if (todo.deadline) {
            const dl = new Date(todo.deadline);
            dl.setHours(0, 0, 0, 0);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            isOverdue = dl < now;
          }
          return (
            <div
              key={todo.id}
              className={`wk-todo-list-view__item${selectedTodoId === todo.id ? ' wk-todo-list-view__item--selected' : ''}`}
              onClick={() => setSelectedTodoId(todo.id)}
            >
              <button
                type="button"
                className={`wk-todo-checkbox${todo.status === 'closed' ? ' wk-todo-checkbox--closed' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleToggleStatus(todo.id, todo.status); }}
                title={todo.status === 'open' ? 'Close' : 'Reopen'}
              >
                {todo.status === 'closed' ? '✓' : ''}
              </button>
              <span className={`wk-todo-item-title${todo.status === 'closed' ? ' wk-todo-item-title--closed' : ''}`}>
                {todo.title}
              </span>
              <div className="wk-todo-item-meta">
                {todo.deadline && (
                  <span className={`wk-todo-item-deadline${isOverdue && todo.status === 'open' ? ' wk-todo-item-deadline--overdue' : ''}`}>
                    {new Date(todo.deadline).toLocaleDateString()}
                  </span>
                )}
                <TodoStatusBadge status={todo.status} />
              </div>
            </div>
          );
        })}
        {!loading && hasMore && (
          <button type="button" onClick={() => load(true)}
            style={{
              display: 'block', margin: '12px auto', padding: '8px 20px',
              border: 'none',
              borderRadius: '6px', background: 'var(--wk-brand-tint-06, rgba(124, 92, 252, 0.06))',
              cursor: 'pointer', color: 'var(--wk-brand-primary, #7C5CFC)',
              fontSize: '13px', fontWeight: 500,
              transition: 'background 150ms',
            }}>
            Load more
          </button>
        )}
      </div>

      {/* Detail side panel (right side) */}
      {selectedTodoId && (
        <DetailSidePanel
          todoId={selectedTodoId}
          onClose={() => setSelectedTodoId(null)}
          onStatusChanged={() => { load(false); onGoalsRefresh?.(); }}
        />
      )}
      </div>{/* end flex row */}

      {/* Create todo dialog */}
      {showCreateDialog && (
        <NewTodoDialog
          goalId={goalId}
          prefillTitle={prefillTodo?.title}
          prefillSource={prefillTodo ? { channel_id: prefillTodo.source_channel_id, channel_type: prefillTodo.source_channel_type } : undefined}
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => { setShowCreateDialog(false); load(false); }}
        />
      )}
    </div>
  );
}

// ─── New Todo Dialog ─────────────────────────────────

function NewTodoDialog({ goalId, prefillTitle, prefillSource, onClose, onCreated }: {
  goalId?: string;
  prefillTitle?: string;
  prefillSource?: { channel_id: string; channel_type: number };
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState(prefillTitle || '');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      await api.createTodo({
        title: title.trim(),
        description: desc.trim() || undefined,
        goal_id: goalId,
        source_channel_id: prefillSource?.channel_id,
        source_channel_type: prefillSource?.channel_type,
      });
      onCreated();
    } catch (e) { Toast.error('Failed to create todo'); }
    finally { setCreating(false); }
  }, [title, desc, creating, goalId, prefillSource, onCreated]);

  return (
    <div className="wk-todo-dialog-overlay" onClick={onClose}>
      <div className="wk-todo-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="wk-todo-dialog__title">New Todo</div>
        <input className="wk-todo-dialog__input" type="text" placeholder="Todo title..."
          value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleCreate(); }} autoFocus />
        <textarea
          className="wk-todo-dialog__input"
          placeholder="Description (optional)"
          value={desc} onChange={(e) => setDesc(e.target.value)}
          rows={3}
          style={{ resize: 'vertical' }}
        />
        <div className="wk-todo-dialog__actions">
          <button type="button" className="wk-todo-dialog__btn wk-todo-dialog__btn--cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="wk-todo-dialog__btn wk-todo-dialog__btn--create"
            onClick={handleCreate} disabled={!title.trim() || creating}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Goal Dialog ────────────────────────────────────

function NewGoalDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (goal: Goal) => void }) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      const req: CreateGoalReq = { title: title.trim() };
      if (deadline) req.deadline = new Date(deadline).toISOString();
      onCreated(await api.createGoal(req));
    } catch (e) { Toast.error('Failed to create goal'); }
    finally { setCreating(false); }
  }, [title, deadline, creating, onCreated]);

  return (
    <div className="wk-todo-dialog-overlay" onClick={onClose}>
      <div className="wk-todo-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="wk-todo-dialog__title">New Goal</div>
        <input className="wk-todo-dialog__input" type="text" placeholder="Goal title..."
          value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleCreate(); }} autoFocus />
        <div style={{ marginTop: '8px' }}>
          <label className="wk-todo-dialog__label">Deadline (optional)</label>
          <input className="wk-todo-dialog__input" type="date" value={deadline}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div className="wk-todo-dialog__actions">
          <button type="button" className="wk-todo-dialog__btn wk-todo-dialog__btn--cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="wk-todo-dialog__btn wk-todo-dialog__btn--create"
            onClick={handleCreate} disabled={!title.trim() || creating}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Icons ──────────────────────────────────────

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ─── Goal Status Badge ──────────────────────────────────

function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const config: Record<GoalStatus, { label: string; color: string; bg: string; icon: string }> = {
    active: { label: 'Active', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.08)', icon: '●' },
    completed: { label: 'Completed', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.08)', icon: '✓' },
    archived: { label: 'Archived', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.08)', icon: '○' },
  };
  const c = config[status];
  if (!c) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`GoalStatusBadge: unknown status "${status}", falling back to active`);
    }
  }
  const resolved = c || config.active;
  return (
    <span className="wk-goal-status-badge" style={{ color: resolved.color, background: resolved.bg }}>
      <span style={{ fontSize: '8px', lineHeight: 1 }}>{resolved.icon}</span> {resolved.label}
    </span>
  );
}

// ─── Goal Card ──────────────────────────────────────────

function GoalCard({ goal, selected, onClick }: { goal: Goal; selected: boolean; onClick: () => void }) {
  const totalTodos = goal.open_count + goal.closed_count;

  // Normalize to date-only comparison to avoid UTC+N timezone drift.
  // e.g. "2026-04-28" parsed as UTC 00:00 would be "overdue" in UTC+8 before 08:00.
  let isOverdue = false;
  let deadlineDisplay = '';
  if (goal.deadline) {
    const deadlineDate = new Date(goal.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    isOverdue = goal.status === 'active' && deadlineDate < today;
    deadlineDisplay = deadlineDate.toLocaleDateString();
  }

  return (
    <div
      className={`wk-goal-card${selected ? ' wk-goal-card--selected' : ''}`}
      onClick={onClick}
    >
      <div className="wk-goal-card__header">
        <span className="wk-goal-card__title">{goal.title}</span>
        <GoalStatusBadge status={goal.status} />
      </div>
      <div className="wk-goal-card__meta">
        {totalTodos > 0 && (
          <span className="wk-goal-card__stats">
            {goal.open_count} open · {goal.closed_count} closed
          </span>
        )}
        {totalTodos === 0 && (
          <span className="wk-goal-card__stats">No todos</span>
        )}
        {goal.deadline && (
          <span className={`wk-goal-card__deadline${isOverdue ? ' wk-goal-card__deadline--overdue' : ''}`}>
            {isOverdue ? '⚠ ' : ''}{deadlineDisplay}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Left Sidebar (Main Export) ─────────────────────────

export default function TodoPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedId, setSelectedId] = useState<string>('__all__');
  const [showNewGoal, setShowNewGoal] = useState(false);

  const loadGoals = useCallback(() => {
    api.listGoals().then(setGoals).catch(() => Toast.error('Failed to load goals'));
  }, []);

    useEffect(() => {
    loadGoals();
    WKApp.routeRight.replaceToRoot(<TodoListView title="All Todos" onGoalsRefresh={loadGoals} />);
  }, [loadGoals]); // loadGoals is stable ([] deps) so this runs once

  useEffect(() => {
    const handler = () => {
      loadGoals();
      setSelectedId('__all__');
      WKApp.routeRight.replaceToRoot(<TodoListView title="All Todos" onGoalsRefresh={loadGoals} />);
    };
    WKApp.mittBus.on('space-changed', handler);
    return () => { WKApp.mittBus.off('space-changed', handler); };
  }, [loadGoals]);

  // Register handler for "Create Todo from chat" events.
  // Uses callback pattern instead of mutable module-level state.
  useEffect(() => {
    const unregister = registerCreateTodoHandler((data) => {
      setSelectedId('__all__');
      WKApp.routeRight.replaceToRoot(
        <TodoListView
          title="All Todos"
          onGoalsRefresh={loadGoals}
          prefillTodo={{ title: data.title || '', source_channel_id: data.source_channel_id || '', source_channel_type: data.source_channel_type || 0 }}
        />
      );
    });
    return unregister;
  }, [loadGoals]); // loadGoals is stable so this effectively runs once

  const handleAllTodosClick = useCallback(() => {
    setSelectedId('__all__');
    WKApp.routeRight.replaceToRoot(<TodoListView title="All Todos" onGoalsRefresh={loadGoals} />);
  }, [loadGoals]);

  const handleGoalClick = useCallback((goal: Goal) => {
    setSelectedId(goal.id);
    WKApp.routeRight.replaceToRoot(<TodoListView title={goal.title} goalId={goal.id} onGoalsRefresh={loadGoals} />);
  }, [loadGoals]);

  const handleGoalCreated = useCallback((goal: Goal) => {
    setShowNewGoal(false);
    loadGoals();
    setSelectedId(goal.id);
    WKApp.routeRight.replaceToRoot(<TodoListView title={goal.title} goalId={goal.id} onGoalsRefresh={loadGoals} />);
  }, [loadGoals]);

  return (
    <div className="wk-todo-sidebar">
      <div
        className={`wk-todo-sidebar__item${selectedId === '__all__' ? ' wk-todo-sidebar__item--selected' : ''}`}
        onClick={handleAllTodosClick}
        style={{ marginTop: 'var(--wk-sp-1, 4px)' }}
      >
        <div className="wk-todo-sidebar__item-icon"><ListIcon /></div>
        <span className="wk-todo-sidebar__item-name">All Todos</span>
      </div>

      <div className="wk-todo-sidebar__section-header">
        <span className="wk-todo-sidebar__section">Goals</span>
        <button type="button" className="wk-todo-sidebar__add-btn" onClick={() => setShowNewGoal(true)} title="New Goal">
          <PlusIcon />
        </button>
      </div>

      <div className="wk-todo-sidebar__list">
        {goals.length === 0 ? (
          <div className="wk-todo-sidebar__empty">No goals yet</div>
        ) : (
          goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              selected={selectedId === g.id}
              onClick={() => handleGoalClick(g)}
            />
          ))
        )}
      </div>

      {showNewGoal && <NewGoalDialog onClose={() => setShowNewGoal(false)} onCreated={handleGoalCreated} />}
    </div>
  );
}

export { TodoPage };
