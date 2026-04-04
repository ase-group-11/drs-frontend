import React from 'react';
import { Avatar } from 'antd';

/**
 * Generates 1-2 uppercase initials from a full name.
 * e.g. "Sharath Pradeep" → "SP", "Admin" → "A", null → "?"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface UserInitialsProps {
  name: string | null | undefined;
  /** Background colour of the avatar circle */
  color?: string;
  /** Ant Design Avatar size — defaults to 36 */
  size?: number;
}

/**
 * Atom — circular avatar showing a user's initials.
 * Used in UserManagement table, TeamDetailsPage crew list, and MapView vehicle popups.
 */
const UserInitials: React.FC<UserInitialsProps> = ({ name, color = '#7c3aed', size = 36 }) => (
  <Avatar size={size} style={{ background: color, flexShrink: 0, fontWeight: 600 }}>
    {getInitials(name)}
  </Avatar>
);

export default UserInitials;
