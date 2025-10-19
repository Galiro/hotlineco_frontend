import { useDashboardStore } from '../../lib/stores/dashboardStore';
import HotlineAudioManager from '../HotlineAudioManager';
import type { Hotline } from '../../lib/stores/dashboardStore';
import type { HotlineAudioFile } from '../../lib/audioUtils';

interface HotlineCardProps {
  hotline: Hotline;
  audioFiles: HotlineAudioFile[];
}

export function HotlineCard({ hotline, audioFiles }: HotlineCardProps) {
  const {
    editingHotline,
    editScript,
    managingAudio,
    setEditingHotline,
    setEditScript,
    setManagingAudio,
    updateHotline,
    updateHotlineMode,
    loadHotlineAudioFiles
  } = useDashboardStore();

  const isEditing = editingHotline?.id === hotline.id;
  const isManagingAudio = managingAudio === hotline.id;

  const handleStartEdit = () => {
    setEditingHotline(hotline);
    setEditScript(hotline.tts_text || '');
  };

  const handleCancelEdit = () => {
    setEditingHotline(null);
    setEditScript('');
  };

  const handleUpdateHotline = () => {
    if (!editScript.trim()) {
      return;
    }
    updateHotline(hotline.id, { tts_text: editScript });
  };

  const handleStartManagingAudio = () => {
    setManagingAudio(hotline.id);
  };

  const handleStopManagingAudio = async () => {
    if (managingAudio) {
      await loadHotlineAudioFiles(hotline.id);
    }
    setManagingAudio(null);
  };

  const handleModeChange = (mode: 'tts' | 'audio') => {
    updateHotlineMode(hotline.id, mode);
  };

  return (
    <>
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        {isEditing ? (
          // Edit mode
          <div className="space-y-3">
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              Edit: {hotline.name}
            </h4>
            <textarea
              value={editScript}
              onChange={(e) => setEditScript(e.target.value)}
              placeholder="Enter the TTS script..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpdateHotline}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-1 px-3 rounded transition"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold py-1 px-3 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // Display mode
          <div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 text-lg">
                  {hotline.name}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Status: {hotline.status}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleStartManagingAudio}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-1 px-3 rounded transition"
                >
                  🎵 Audio
                </button>
                <button
                  onClick={handleStartEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1 px-3 rounded transition"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">🎛️</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Call Mode</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={`tts-${hotline.id}`}
                      name={`mode-${hotline.id}`}
                      value="tts"
                      checked={hotline.mode === 'tts'}
                      onChange={() => handleModeChange('tts')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor={`tts-${hotline.id}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      🎤 TTS
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={`audio-${hotline.id}`}
                      name={`mode-${hotline.id}`}
                      value="audio"
                      checked={hotline.mode === 'audio'}
                      onChange={() => handleModeChange('audio')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor={`audio-${hotline.id}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      🎵 Audio
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {hotline.mode === 'tts' 
                  ? 'Callers will hear text-to-speech from your script'
                  : 'Callers will hear your uploaded audio files'
                }
              </div>
            </div>
            
            {/* Phone number */}
            {hotline.phone_numbers && (
              <div className="ml-4 mb-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">📞</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {hotline.phone_numbers.e164}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Phone number assigned to this hotline
                </p>
              </div>
            )}
            
            {/* TTS Script */}
            <div className="ml-4 mb-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">🎤</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">TTS Script</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                "{hotline.tts_text || 'No script set'}"
              </p>
            </div>

            {/* Audio Files */}
            <div className="ml-4 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">🎵</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Audio Files</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {audioFiles.length}/10
                </span>
              </div>
              
              {audioFiles.length > 0 ? (
                <div className="space-y-2">
                  {audioFiles.map((audioFile, idx) => (
                    <div key={audioFile.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {audioFile.audio_assets.title || 'Untitled'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {audioFile.audio_assets.duration_ms && (
                          <span>
                            {Math.floor(audioFile.audio_assets.duration_ms / 1000)}s
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No audio files uploaded yet
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Audio Management Modal */}
      {isManagingAudio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Manage Audio Files
                </h3>
                <button
                  onClick={handleStopManagingAudio}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <HotlineAudioManager
                hotlineId={hotline.id}
                orgId={hotline.org_id}
                onError={(error) => console.error('Audio management error:', error)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
