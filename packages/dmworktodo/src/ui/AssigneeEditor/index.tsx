import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { WKApp, isSafeUrl } from '@dmwork/base';
import type { TodoAssignee } from '../../bridge/types';
import { useUserName } from '../../hooks/useUserName';
import * as api from '../../api/todoApi';
import { Toast } from '../../utils/toast';
import './index.css';

// ─── Single Assignee Chip ────────────────────────────────

function AssigneeChip({ assignee, todoId, editable, onRemoved }: {
  assignee: TodoAssignee;
  todoId: string;
  editable: boolean;
  onRemoved: () => void;
}) {
  const name = useUserName(assignee.user_id);
  const [removing, setRemoving] = useState(false);

  const handleRemove = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (removing) return;
    setRemoving(true);
    try {
      await api.removeAssignee(todoId, assignee.user_id);
      onRemoved();
    } catch (err) {
      Toast.error('Failed to remove assignee');
      setRemoving(false);
    }
  }, [todoId, assignee.user_id, removing, onRemoved]);

  return (
    <span className="wk-assignee-chip">
      <span className="wk-assignee-chip__name">{name}</span>
      {editable && (
        <button
          type="button"
          className="wk-assignee-chip__remove"
          onClick={handleRemove}
          disabled={removing}
          title="Remove assignee"
        >
          ✕
        </button>
      )}
    </span>
  );
}

// ─── Search Result Item ──────────────────────────────────

interface SearchResult {
  uid: string;
  name: string;
  avatar: string;
}

function SearchResultItem({ result, onSelect }: { result: SearchResult; onSelect: (uid: string) => void }) {
  return (
    <div
      className="wk-assignee-search__item"
      onClick={() => onSelect(result.uid)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(result.uid); }}
    >
      {result.avatar && isSafeUrl(result.avatar) && (
        <img src={result.avatar} alt="" className="wk-assignee-search__avatar" />
      )}
      <span className="wk-assignee-search__name">{result.name}</span>
    </div>
  );
}

// ─── Assignee Editor ─────────────────────────────────────

export interface AssigneeEditorProps {
  todoId: string;
  assignees: TodoAssignee[];
  onChanged: () => void;
}

export default function AssigneeEditor({ todoId, assignees, onChanged }: AssigneeEditorProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showSearch) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSearch]);

  // Filter contacts from local cache — no network request
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const assignedUids = new Set(assignees.map(a => a.user_id));
    const keyword = query.trim().toLowerCase();
    const contacts = WKApp.dataSource?.contactsList ?? [];
    return contacts
      .filter((c) =>
        !assignedUids.has(c.uid) &&
        c.uid !== WKApp.loginInfo.uid &&
        (c.name?.toLowerCase().includes(keyword) || c.uid.toLowerCase().includes(keyword))
      )
      .slice(0, 8)
      .map((c) => ({
        uid: c.uid,
        name: c.name || c.uid,
        avatar: c.avatar || '',
      }));
  }, [query, assignees]);

  const handleSelect = useCallback(async (uid: string) => {
    if (adding) return;
    setAdding(true);
    try {
      await api.addAssignee(todoId, uid);
      setShowSearch(false);
      setQuery('');
      onChanged();
    } catch (err) {
      Toast.error('Failed to add assignee');
    } finally {
      setAdding(false);
    }
  }, [todoId, adding, onChanged]);

  return (
    <div className="wk-assignee-editor">
      <div className="wk-assignee-editor__label">
        <strong>Assignees</strong>
      </div>
      <div className="wk-assignee-editor__chips">
        {assignees.length === 0 && !showSearch && (
          <span className="wk-assignee-editor__empty">No assignees</span>
        )}
        {assignees.map((a) => (
          <AssigneeChip
            key={a.id}
            assignee={a}
            todoId={todoId}
            editable={true}
            onRemoved={onChanged}
          />
        ))}
        {!showSearch && (
          <button
            type="button"
            className="wk-assignee-editor__add-btn"
            onClick={() => setShowSearch(true)}
            title="Add assignee"
          >
            +
          </button>
        )}
      </div>
      {showSearch && (
        <div className="wk-assignee-search" ref={searchRef}>
          <input
            type="text"
            className="wk-assignee-search__input"
            placeholder="Search by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowSearch(false); setQuery(''); }
            }}
            autoFocus
          />
          {query.trim() && (
            <div className="wk-assignee-search__dropdown">
              {results.length === 0 && (
                <div className="wk-assignee-search__empty">No results</div>
              )}
              {results.map((r) => (
                <SearchResultItem key={r.uid} result={r} onSelect={handleSelect} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
