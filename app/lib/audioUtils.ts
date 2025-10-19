import { supabase } from './supabase';

export interface AudioAsset {
  id: string;
  org_id: string;
  title?: string;
  storage_path: string;
  duration_ms?: number;
  source: 'upload' | 'tts';
  hash?: string;
  created_at: string;
}

export interface HotlineAudioFile {
  id: string;
  hotline_id: string;
  audio_asset_id: string;
  display_order: number;
  created_at: string;
  audio_assets: AudioAsset;
}

// Supported audio file types
export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3', 
  'audio/wav',
  'audio/ogg',
  'audio/m4a',
  'audio/aac'
];

// Maximum file size (100MB)
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Upload an audio file to Supabase storage and create an audio asset record
 */
export async function uploadAudioFile(
  file: File,
  orgId: string,
  title?: string
): Promise<AudioAsset> {
  // Validate file type
  if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Supported types: ${SUPPORTED_AUDIO_TYPES.join(', ')}`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const storagePath = `audio-assets/${fileName}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('audio-assets')
    .upload(fileName, file);

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get file duration (simplified - in a real app you'd use a library like music-metadata)
  const duration = await getAudioDuration(file);

  // Create audio asset record
  const { data: assetData, error: assetError } = await supabase
    .from('audio_assets')
    .insert({
      org_id: orgId,
      title: title || file.name,
      storage_path: storagePath,
      duration_ms: duration,
      source: 'upload',
      hash: await generateFileHash(file)
    })
    .select()
    .single();

  if (assetError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from('audio-assets').remove([fileName]);
    throw new Error(`Failed to create audio asset: ${assetError.message}`);
  }

  return assetData;
}

/**
 * Get audio duration from file (simplified implementation)
 */
async function getAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(audio.duration * 1000)); // Convert to milliseconds
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(null);
    });
    
    audio.src = url;
  });
}

/**
 * Generate a simple hash for file deduplication
 */
async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get all audio assets for an organization
 */
export async function getAudioAssets(orgId: string): Promise<AudioAsset[]> {
  const { data, error } = await supabase
    .from('audio_assets')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch audio assets: ${error.message}`);
  }

  return data || [];
}

/**
 * Get audio files for a specific hotline
 */
export async function getHotlineAudioFiles(hotlineId: string): Promise<HotlineAudioFile[]> {
  const { data, error } = await supabase
    .from('hotline_audio_files')
    .select(`
      *,
      audio_assets (*)
    `)
    .eq('hotline_id', hotlineId)
    .order('display_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch hotline audio files: ${error.message}`);
  }

  return data || [];
}

/**
 * Add an audio file to a hotline
 */
export async function addAudioToHotline(
  hotlineId: string,
  audioAssetId: string,
  displayOrder?: number
): Promise<HotlineAudioFile> {
  // Get the next display order if not provided
  if (displayOrder === undefined) {
    const { data: existingFiles } = await supabase
      .from('hotline_audio_files')
      .select('display_order')
      .eq('hotline_id', hotlineId)
      .order('display_order', { ascending: false })
      .limit(1);
    
    displayOrder = existingFiles?.[0]?.display_order ? existingFiles[0].display_order + 1 : 0;
  }

  const { data, error } = await supabase
    .from('hotline_audio_files')
    .insert({
      hotline_id: hotlineId,
      audio_asset_id: audioAssetId,
      display_order: displayOrder
    })
    .select(`
      *,
      audio_assets (*)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to add audio to hotline: ${error.message}`);
  }

  return data;
}

/**
 * Remove an audio file from a hotline
 */
export async function removeAudioFromHotline(hotlineAudioFileId: string): Promise<void> {
  const { error } = await supabase
    .from('hotline_audio_files')
    .delete()
    .eq('id', hotlineAudioFileId);

  if (error) {
    throw new Error(`Failed to remove audio from hotline: ${error.message}`);
  }
}

/**
 * Update the display order of audio files in a hotline
 */
export async function updateAudioDisplayOrder(
  hotlineId: string,
  audioFileIds: string[]
): Promise<void> {
  const updates = audioFileIds.map((id, index) => ({
    id,
    display_order: index
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('hotline_audio_files')
      .update({ display_order: update.display_order })
      .eq('id', update.id);

    if (error) {
      throw new Error(`Failed to update display order: ${error.message}`);
    }
  }
}

/**
 * Delete an audio asset and its associated files
 */
export async function deleteAudioAsset(audioAssetId: string): Promise<void> {
  // Get the audio asset to find the storage path
  const { data: asset, error: fetchError } = await supabase
    .from('audio_assets')
    .select('storage_path')
    .eq('id', audioAssetId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch audio asset: ${fetchError.message}`);
  }

  // Delete from storage
  const fileName = asset.storage_path.split('/').pop();
  if (fileName) {
    const { error: storageError } = await supabase.storage
      .from('audio-assets')
      .remove([fileName]);

    if (storageError) {
      console.warn(`Failed to delete file from storage: ${storageError.message}`);
    }
  }

  // Delete from database (cascade will handle hotline_audio_files)
  const { error: deleteError } = await supabase
    .from('audio_assets')
    .delete()
    .eq('id', audioAssetId);

  if (deleteError) {
    throw new Error(`Failed to delete audio asset: ${deleteError.message}`);
  }
}

/**
 * Get a signed URL for playing an audio file
 */
export async function getAudioUrl(storagePath: string): Promise<string> {
  const fileName = storagePath.split('/').pop();
  if (!fileName) {
    throw new Error('Invalid storage path');
  }

  const { data, error } = await supabase.storage
    .from('audio-assets')
    .createSignedUrl(fileName, 3600); // 1 hour expiry

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}
