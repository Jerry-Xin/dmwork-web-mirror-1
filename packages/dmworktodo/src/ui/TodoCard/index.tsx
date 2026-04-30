import React from 'react';
import type { Todo, TodoDetail } from '../../bridge/types';
import TodoStatusBadge from '../TodoStatusBadge';
import './index.css';

export interface TodoCardProps {
  todo: Todo | TodoDetail;
  onClick?: (id: string) => void;
  className?: string;
}

function formatDeadline(deadline: string): { text: string; overdue: boolean } {
  const date = new Date(deadline);
  date.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const overdue = date < now;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return { text: `${month}/${day}`, overdue };
}

export default function TodoCard({ todo, onClick, className }: TodoCardProps) {
  const handleClick = () => {
    if (onClick) onClick(todo.id);
  };

  const deadline = todo.deadline ? formatDeadline(todo.deadline) : null;

  return (
    <div
      className={`wk-todo-card${className ? ` ${className}` : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
    >
      <div className="wk-todo-card__title">{todo.title}</div>
      <div className="wk-todo-card__meta">
        <TodoStatusBadge status={todo.status} />
        {'assignees' in todo && (todo.assignees ?? []).length > 0 && (
          <span className="wk-todo-card__assignee-count">
            {(todo.assignees ?? []).length} assignee{(todo.assignees ?? []).length > 1 ? 's' : ''}
          </span>
        )}
        {deadline && (
          <span className={`wk-todo-card__deadline${deadline.overdue ? ' wk-todo-card__deadline--overdue' : ''}`}>
            {deadline.text}
          </span>
        )}
      </div>
    </div>
  );
}

export { TodoCard };
