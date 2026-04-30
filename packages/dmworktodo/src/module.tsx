import React from 'react';
import { WKApp, Menus, ChannelTypeCommunityTopic } from '@dmwork/base';
import type { IModule } from '@dmwork/base';
import { ChannelTypeGroup } from 'wukongimjssdk';
import TodoPage from './pages/TodoPage';
import { createTodo } from './api/todoApi';
import { Toast } from './utils/toast';
import './ui/tokens.css';

/**
 * Callback-based coordination for 'wk:create-todo-from-chat'.
 * Replaces the previous module-level mutable `let` export.
 *
 * TodoPage registers a handler on mount; the context menu invokes it.
 * If no handler is registered (TodoPage not yet mounted), the payload
 * is buffered and delivered when TodoPage registers.
 */
type CreateTodoPayload = {
  source_channel_id: string;
  source_channel_type: number;
  title: string;
};

let _pendingPayload: CreateTodoPayload | null = null;
let _onCreateTodo: ((payload: CreateTodoPayload) => void) | null = null;

/** Called by TodoPage on mount to receive create-todo events. */
export function registerCreateTodoHandler(handler: (payload: CreateTodoPayload) => void): () => void {
  _onCreateTodo = handler;
  // Deliver any buffered payload immediately
  if (_pendingPayload) {
    handler(_pendingPayload);
    _pendingPayload = null;
  }
  // Return unregister function for useEffect cleanup
  return () => { _onCreateTodo = null; };
}

/** Called by the context menu to dispatch a create-todo event. */
function dispatchCreateTodo(payload: CreateTodoPayload): void {
  if (_onCreateTodo) {
    _onCreateTodo(payload);
  } else {
    _pendingPayload = payload;
  }
}

/** Guard against double-init (HMR in dev or future module lifecycle changes). */
let _initialized = false;

/** Stored handler refs for cleanup on HMR re-init. */
let _sendAsTodoHandler: ((data: { title: string; source_channel_id: string; source_channel_type: number }) => void) | null = null;
let _spaceChangedHandler: (() => void) | null = null;

// Reset on HMR: tear down old listeners, reset init guard.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (_sendAsTodoHandler) WKApp.mittBus.off('wk:send-as-todo', _sendAsTodoHandler);
    if (_spaceChangedHandler) WKApp.mittBus.off('space-changed', _spaceChangedHandler);
    _sendAsTodoHandler = null;
    _spaceChangedHandler = null;
    _pendingPayload = null;
    _onCreateTodo = null;
    _initialized = false;
  });
}

/**
 * Placeholder Todo icon for the NavRail.
 */
function TodoIcon({ active }: { active?: boolean }) {
  const color = active ? 'var(--wk-brand-primary, #7C5CFC)' : 'currentColor';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

/**
 * Small check-square icon for the chat toolbar button.
 */
function CheckSquareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

/**
 * TodoModule — registers the Todo feature into Octo web.
 */
export default class TodoModule implements IModule {
  id(): string {
    return 'TodoModule';
  }

  init(): void {
    // Prevent duplicate listeners on HMR / double-init
    if (_initialized) return;
    _initialized = true;

    // Register route
    WKApp.route.register('/todo', () => <TodoPage />);

    // Register NavRail menu item (sort=2000, between chat=1000 and contacts=4000)
    WKApp.menus.register(
      'todo',
      () => {
        const m = new Menus(
          'todo',
          '/todo',
          'Todos',
          <TodoIcon />,
          <TodoIcon active />,
        );
        return m;
      },
      2000,
    );

    // Handle "Send as Todo" from chat — keeps @dmwork/base decoupled from todo API
    _sendAsTodoHandler = (data) => {
      createTodo({
        title: data.title,
        source_channel_id: data.source_channel_id,
        source_channel_type: data.source_channel_type,
      }).then(() => {
        Toast.success('Todo created');
      }).catch((err: unknown) => {
        console.error('[TodoModule] send-as-todo failed:', err);
        Toast.error('Failed to create todo');
      });
    };
    WKApp.mittBus.on('wk:send-as-todo', _sendAsTodoHandler);

    // Clear pending event on space switch to avoid cross-space context leak
    _spaceChangedHandler = () => {
      _pendingPayload = null;
    };
    WKApp.mittBus.on('space-changed', _spaceChangedHandler);

    // Chat integration
    this.registerChatContextMenu();
    this.registerChatToolbar();
  }

  /**
   * Register "Create Todo" in message context menu (right-click).
   * Only shows in group and thread channels.
   * Uses WKApp.endpoints.registerMessageContextMenus directly — the handler
   * returns a plain object with title + onClick (no need to import MessageContextMenus class).
   */
  private registerChatContextMenu(): void {
    WKApp.endpoints.registerMessageContextMenus(
      'contextmenus.createTodo',
      (message) => {
        const ct = message.channel.channelType;
        if (ct !== ChannelTypeGroup && ct !== ChannelTypeCommunityTopic) {
          return null;
        }
        return {
          title: 'Create Todo',
          onClick: () => {
            // conversationDigest is a standard getter on all WuKong IM MessageContent subclasses
            const content = message.content as { conversationDigest?: string };
            const title = content.conversationDigest ? content.conversationDigest.slice(0, 100) : '';
            // Buffer the event BEFORE navigating — TodoPage will consume
            // it on mount, avoiding the race where emit fires before the
            // listener useEffect runs.
            const payload = {
              source_channel_id: message.channel.channelID,
              source_channel_type: ct,
              title,
            };
            // Dispatch via callback pattern — handles both mounted and not-yet-mounted cases
            dispatchCreateTodo(payload);
            WKApp.route.push('/todo');
          },
        };
      },
      6000,
    );
  }

  /**
   * Register todo toggle button in the chat toolbar.
   * Only visible in group and topic channels. Navigates to /todo on click.
   */
  private registerChatToolbar(): void {
    WKApp.endpoints.registerChatToolbar(
      'chattoolbar.todo',
      (ctx) => {
        const channel = ctx.channel();
        // Only show in group and topic channels
        if (channel.channelType !== ChannelTypeGroup && channel.channelType !== ChannelTypeCommunityTopic) {
          return undefined;
        }
        return (
          <div
            title="Todos"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => {
              WKApp.route.push('/todo');
            }}
          >
            <CheckSquareIcon />
          </div>
        );
      },
    );
  }
}
