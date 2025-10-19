import { useState, useEffect } from 'react';
import { 
  getHotlineAudioFiles, 
  addAudioToHotline, 
  removeAudioFromHotline,
  updateAudioDisplayOrder,
  deleteAudioAsset,
  getAudioUrl
} from '../lib/audioUtils';
import type { HotlineAudioFile, AudioAsset } from '../lib/audioUtils';
import AudioUpload from './AudioUpload';

interface HotlineAudioManagerProps {
  hotlineId: string;
  orgId: string;
  onError: (error: string) => void;
}

export default function HotlineAudioManager({ 
  hotlineId, 
  orgId, 
  onError 
}: HotlineAudioManagerProps) {
  const [audioFiles, setAudioFiles] = useState<HotlineAudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAudioFiles();
  }, [hotlineId]);

  const loadAudioFiles = async () => {
    try {
      setLoading(true);
      const files = await getHotlineAudioFiles(hotlineId);
      setAudioFiles(files);
      
      // Pre-load signed URLs for all audio files
      const urls: Record<string, string> = {};
      for (const file of files) {
        try {
          const url = await getAudioUrl(file.audio_assets.storage_path);
          urls[file.audio_assets.id] = url;
        } catch (error) {
          console.warn(`Failed to get URL for audio ${file.audio_assets.id}:`, error);
        }
      }
      setAudioUrls(urls);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to load audio files');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = async (audioAsset: AudioAsset) => {
    try {
      const newHotlineAudioFile = await addAudioToHotline(hotlineId, audioAsset.id);
      setAudioFiles(prev => [...prev, newHotlineAudioFile]);
      
      // Get signed URL for the new audio file
      const url = await getAudioUrl(audioAsset.storage_path);
      setAudioUrls(prev => ({ ...prev, [audioAsset.id]: url }));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to add audio to hotline');
    }
  };

  const handleRemoveAudio = async (hotlineAudioFileId: string, audioAssetId: string) => {
    if (!confirm('Are you sure you want to remove this audio file from the hotline?')) {
      return;
    }

    try {
      await removeAudioFromHotline(hotlineAudioFileId);
      setAudioFiles(prev => prev.filter(f => f.id !== hotlineAudioFileId));
      
      // Clean up URL
      setAudioUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[audioAssetId];
        return newUrls;
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to remove audio file');
    }
  };

  const handleDeleteAudio = async (hotlineAudioFileId: string, audioAssetId: string) => {
    if (!confirm('Are you sure you want to permanently delete this audio file? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteAudioAsset(audioAssetId);
      setAudioFiles(prev => prev.filter(f => f.id !== hotlineAudioFileId));
      
      // Clean up URL
      setAudioUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[audioAssetId];
        return newUrls;
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to delete audio file');
    }
  };

  const handlePlayAudio = (audioAssetId: string) => {
    if (playingAudio === audioAssetId) {
      setPlayingAudio(null);
      return;
    }

    setPlayingAudio(audioAssetId);
    const audio = new Audio(audioUrls[audioAssetId]);
    audio.play();
    
    audio.addEventListener('ended', () => {
      setPlayingAudio(null);
    });
    
    audio.addEventListener('error', () => {
      setPlayingAudio(null);
      onError('Failed to play audio file');
    });
  };

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return 'Unknown';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading audio files...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Upload Audio Files
        </h3>
        <AudioUpload
          orgId={orgId}
          onUploadComplete={handleUploadComplete}
          onError={onError}
          maxFiles={10}
          currentFileCount={audioFiles.length}
        />
      </div>

      {/* Audio Files List */}
      {audioFiles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Audio Files ({audioFiles.length}/10)
          </h3>
          <div className="space-y-3">
            {audioFiles.map((file, index) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* Play Button */}
                  <button
                    onClick={() => handlePlayAudio(file.audio_assets.id)}
                    className="flex-shrink-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    {playingAudio === file.audio_assets.id ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.audio_assets.title || 'Untitled Audio'}
                    </h4>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Order: {index + 1}</span>
                      <span>Duration: {formatDuration(file.audio_assets.duration_ms)}</span>
                      <span>Source: {file.audio_assets.source}</span>
                      <span>Created: {new Date(file.audio_assets.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRemoveAudio(file.id, file.audio_assets.id)}
                    className="px-3 py-1 text-xs font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                    title="Remove from hotline"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => handleDeleteAudio(file.id, file.audio_assets.id)}
                    className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Permanently delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {audioFiles.length === 0 && (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 text-gray-400 dark:text-gray-500 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No audio files yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Upload your first audio file to get started
          </p>
        </div>
      )}
    </div>
  );
}
