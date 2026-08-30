/**
 * @fileoverview UserStoryList — Lista de Historias de Usuario dentro de una Épica.
 */

'use client';

import type { UserStory } from '@/lib/types/agent-2';
import { UserStoryItem } from './UserStoryItem';

interface UserStoryListProps {
  stories: UserStory[];
  onRequestEdit: (story: UserStory) => void;
  onDelete: (id: string) => void;
  isApproved: boolean;
}

export function UserStoryList({
  stories,
  onRequestEdit,
  onDelete,
  isApproved,
}: UserStoryListProps) {
  if (stories.length === 0) {
    if (isApproved) return null;
    return (
      <p className="px-3 py-2.5 text-[13px] text-muted">Aún no hay historias en esta épica.</p>
    );
  }

  return (
    <div>
      {stories.map((story, index) => (
        <UserStoryItem
          key={story.id}
          story={story}
          onRequestEdit={onRequestEdit}
          onDelete={onDelete}
          isApproved={isApproved}
          index={index}
        />
      ))}
    </div>
  );
}
