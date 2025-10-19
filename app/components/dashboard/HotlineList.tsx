import { useDashboardStore } from '../../lib/stores/dashboardStore';
import { HotlineCard } from './HotlineCard';
import type { Hotline } from '../../lib/stores/dashboardStore';
import type { HotlineAudioFile } from '../../lib/audioUtils';

interface HotlineListProps {
  hotlines: Hotline[];
  hotlineAudioFiles: Record<string, HotlineAudioFile[]>;
}

export function HotlineList({ hotlines, hotlineAudioFiles }: HotlineListProps) {
  if (hotlines.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        🎯 Hotlines
      </h3>
      <div className="space-y-4">
        {hotlines.map((hotline) => (
          <HotlineCard
            key={hotline.id}
            hotline={hotline}
            audioFiles={hotlineAudioFiles[hotline.id] || []}
          />
        ))}
      </div>
    </div>
  );
}
