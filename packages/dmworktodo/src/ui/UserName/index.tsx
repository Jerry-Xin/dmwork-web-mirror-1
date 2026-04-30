import React from 'react';
import { useUserName } from '../../hooks/useUserName';

/**
 * Inline component that renders a user's display name resolved from WKSDK.
 * Falls back to truncated uid while loading.
 */
export default function UserName({ uid, className, style }: {
  uid: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const name = useUserName(uid);
  return <span className={className} style={style}>{name}</span>;
}
