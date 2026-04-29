import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WKApp } from '@dmwork/base';
import * as api from '../../api/todoApi';
import type { Todo, TodoStatus } from '../../bridge/types';
import TodoCard from '../../ui/TodoCard';
import { Toast } from '../../utils/toast';
import './index.css';

const STATUS_ORDER: TodoStatus[] = ['open', 'closed'];
const STATUS_LABELS: Record<TodoStatus, string> = {
  open: 'Open',
  closed: 'Closed',
};

export interface ChatTodoPanelProps {
  channelId: string;
  channelType: number;
  channelName?: string;
  onClose: () => void;
  onTodoClick?: (todoId: string) => void;
}

/**
 * ChatTodoPanel — side panel embedded in chat window.
 * Queries todos by source_channel_id/type and groups by status.
 * Supports quick-create with auto-bound source context.
 * Uses 30s polling for refresh (v1).
 */
export default function ChatTodoPanel({
  channelId,
  channelType,
  channelName,
  onClose,
  onTodoClick,
}: ChatTodoPanelProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickTitle, setQuickTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleTodoClick = useCallback((todoId: string) => {
    if (onTodoClick) {
      onTodoClick(todoId);
    } else {
      // Default: navigate to todo module
      WKApp.route.push('/todo');
    }
  }, [onTodoClick]);

  const loadTodos = useCallback(async () => {
    try {
      const result = await api.listTodos({
        source_channel_id: channelId,
        source_channel_type: channelType,
        limit: 100,
      });
      setTodos(result.data);
    } catch (e) {
      Toast.error('Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, [channelId, channelType]);

  // Initial load + 30s polling (pauses when tab is hidden)
  // Single effect owns both interval and visibility listener to prevent
  // orphaned intervals from dual-effect race. (#1042 review round 7)
  useEffect(() => {
    loadTodos();
    pollRef.current = setInterval(loadTodos, 30000);

    const handleVisibility = () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (!document.hidden) {
        loadTodos();
        pollRef.current = setInterval(loadTodos, 30000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadTodos]);

  // Group by status
  const grouped = STATUS_ORDER.reduce<Record<string, Todo[]>>((acc, status) => {
    const items = todos.filter((t: Todo) => t.status === status);
    if (items.length > 0) {
      acc[status] = items;
    }
    return acc;
  }, {});

  const handleQuickCreate = useCallback(async () => {
    if (!quickTitle.trim() || creating) return;
    setCreating(true);
    try {
      await api.createTodo({
        title: quickTitle.trim(),
        source_channel_id: channelId,
        source_channel_type: channelType,
        source_name: channelName,
      });
      setQuickTitle('');
      await loadTodos();
    } catch (e) {
      Toast.error('Failed to create todo');
    } finally {
      setCreating(false);
    }
  }, [quickTitle, creating, channelId, channelType, channelName, loadTodos]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleQuickCreate();
      }
    },
    [handleQuickCreate],
  );

  return (
    <div className="wk-todo-chat-panel">
      {/* Header */}
      <div className="wk-todo-chat-panel__header">
        <div>
          <span className="wk-todo-chat-panel__title">Todos</span>
          <span className="wk-todo-chat-panel__count">({todos.length})</span>
        </div>
        <button type="button" className="wk-todo-chat-panel__close" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="wk-todo-chat-panel__body">
        {loading && (
          <div className="wk-todo-chat-panel__empty">Loading...</div>
        )}
        {!loading && todos.length === 0 && (
          <div className="wk-todo-chat-panel__empty">No todos in this channel</div>
        )}
        {!loading &&
          STATUS_ORDER.map((status) => {
            const items = grouped[status];
            if (!items) return null;
            return (
              <div key={status} className="wk-todo-chat-panel__section">
                <div className="wk-todo-chat-panel__section-title">
                  {STATUS_LABELS[status]} ({items.length})
                </div>
                {items.map((todo) => (
                  <div key={todo.id} style={{ marginBottom: 'var(--wk-sp-1, 4px)' }}>
                    <TodoCard todo={todo} onClick={handleTodoClick} />
                  </div>
                ))}
              </div>
            );
          })}
      </div>

      {/* Quick create footer */}
      <div className="wk-todo-chat-panel__footer">
        <div className="wk-todo-chat-panel__quick-create">
          <input
            className="wk-todo-chat-panel__quick-input"
            type="text"
            placeholder="Quick create todo..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="wk-todo-chat-panel__quick-btn"
            onClick={handleQuickCreate}
            disabled={creating || !quickTitle.trim()}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export { ChatTodoPanel };
