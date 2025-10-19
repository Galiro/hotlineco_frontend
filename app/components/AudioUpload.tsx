import { useState, useRef } from 'react';
import { uploadAudioFile, SUPPORTED_AUDIO_TYPES, MAX_FILE_SIZE } from '../lib/audioUtils';
import type { AudioAsset } from '../lib/audioUtils';

interface AudioUploadProps {
  orgId: string;
  onUploadComplete: (audioAsset: AudioAsset) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  maxFiles?: number;
  currentFileCount?: number;
}

export default function AudioUpload({
  orgId,
  onUploadComplete,
  onError,
  disabled = false,
  maxFiles = 10,
  currentFileCount = 0
}: AudioUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check if we've reached the maximum number of files
    if (currentFileCount >= maxFiles) {
      onError(`Maximum ${maxFiles} audio files allowed per hotline`);
      return;
    }

    // Validate file type
    if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
      onError(`Unsupported file type: ${file.type}. Supported types: ${SUPPORTED_AUDIO_TYPES.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      onError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    setIsUploading(true);

    try {
      const audioAsset = await uploadAudioFile(file, orgId);
      onUploadComplete(audioAsset);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled || isUploading) return;
    
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600'
          }
          ${disabled || isUploading 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_AUDIO_TYPES.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Uploading audio file...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 text-gray-400 dark:text-gray-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {disabled 
                  ? 'Upload disabled' 
                  : `Upload audio file (${currentFileCount}/${maxFiles})`
                }
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Drag and drop or click to select
              </p>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>Supported formats: MP3, WAV, OGG, M4A, AAC</p>
              <p>Maximum size: {formatFileSize(MAX_FILE_SIZE)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
