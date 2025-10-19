import { create } from 'zustand';
import { supabase } from '../supabase';
import { getHotlineAudioFiles } from '../audioUtils';
import type { HotlineAudioFile } from '../audioUtils';

export interface PhoneNumber {
  id: string;
  org_id: string;
  twilio_sid: string;
  e164: string;
  region: string;
  status: 'active' | 'inactive' | 'released';
  created_at: string;
}

export interface Hotline {
  id: string;
  org_id: string;
  phone_number_id: string | null;
  slug: string;
  name: string;
  mode: 'audio' | 'tts' | 'simple_ivr';
  tts_text: string | null;
  audio_asset_id: string | null;
  ivr_json: any;
  status: 'active' | 'paused' | 'archived';
  created_at: string;
  phone_numbers?: {
    e164: string;
  };
}

export interface DashboardState {
  // Data
  phoneNumbers: PhoneNumber[];
  hotlines: Hotline[];
  hotlineAudioFiles: Record<string, HotlineAudioFile[]>;
  
  // UI State
  loading: boolean;
  error: string | null;
  showCreateHotline: boolean;
  editingHotline: Hotline | null;
  managingAudio: string | null;
  
  // Form State
  hotlineName: string;
  hotlineScript: string;
  hotlineMode: 'tts' | 'audio';
  selectedPhoneNumber: string;
  editScript: string;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setShowCreateHotline: (show: boolean) => void;
  setEditingHotline: (hotline: Hotline | null) => void;
  setManagingAudio: (hotlineId: string | null) => void;
  
  // Form Actions
  setHotlineName: (name: string) => void;
  setHotlineScript: (script: string) => void;
  setHotlineMode: (mode: 'tts' | 'audio') => void;
  setSelectedPhoneNumber: (phoneId: string) => void;
  setEditScript: (script: string) => void;
  
  // Data Actions
  loadPhoneNumbers: (orgId: string) => Promise<void>;
  loadHotlines: (orgId: string) => Promise<void>;
  loadHotlineAudioFiles: (hotlineId: string) => Promise<void>;
  loadAllData: (orgId: string) => Promise<void>;
  
  // CRUD Actions
  createHotline: (orgId: string) => Promise<void>;
  updateHotline: (hotlineId: string, updates: Partial<Hotline>) => Promise<void>;
  updateHotlineMode: (hotlineId: string, mode: 'tts' | 'audio') => Promise<void>;
  buyPhoneNumber: (orgId: string) => Promise<void>;
  
  // Utility Actions
  resetForm: () => void;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial State
  phoneNumbers: [],
  hotlines: [],
  hotlineAudioFiles: {},
  loading: false,
  error: null,
  showCreateHotline: false,
  editingHotline: null,
  managingAudio: null,
  hotlineName: '',
  hotlineScript: '',
  hotlineMode: 'tts',
  selectedPhoneNumber: '',
  editScript: '',

  // UI Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setShowCreateHotline: (show) => set({ showCreateHotline: show }),
  setEditingHotline: (hotline) => set({ editingHotline: hotline }),
  setManagingAudio: (hotlineId) => set({ managingAudio: hotlineId }),

  // Form Actions
  setHotlineName: (name) => set({ hotlineName: name }),
  setHotlineScript: (script) => set({ hotlineScript: script }),
  setHotlineMode: (mode) => set({ hotlineMode: mode }),
  setSelectedPhoneNumber: (phoneId) => set({ selectedPhoneNumber: phoneId }),
  setEditScript: (script) => set({ editScript: script }),

  // Data Loading Actions
  loadPhoneNumbers: async (orgId) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('org_id', orgId);

      if (error) throw error;
      set({ phoneNumbers: data || [] });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load phone numbers' });
    } finally {
      set({ loading: false });
    }
  },

  loadHotlines: async (orgId) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('hotlines')
        .select(`
          *,
          phone_numbers(e164)
        `)
        .eq('org_id', orgId);

      if (error) throw error;
      set({ hotlines: data || [] });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load hotlines' });
    } finally {
      set({ loading: false });
    }
  },

  loadHotlineAudioFiles: async (hotlineId) => {
    try {
      const audioFiles = await getHotlineAudioFiles(hotlineId);
      set((state) => ({
        hotlineAudioFiles: {
          ...state.hotlineAudioFiles,
          [hotlineId]: audioFiles
        }
      }));
    } catch (error) {
      console.error(`Error loading audio files for hotline ${hotlineId}:`, error);
      set((state) => ({
        hotlineAudioFiles: {
          ...state.hotlineAudioFiles,
          [hotlineId]: []
        }
      }));
    }
  },

  loadAllData: async (orgId) => {
    const { loadPhoneNumbers, loadHotlines, loadHotlineAudioFiles } = get();
    
    try {
      set({ loading: true, error: null });
      
      // Load phone numbers and hotlines in parallel
      await Promise.all([
        loadPhoneNumbers(orgId),
        loadHotlines(orgId)
      ]);

      // Load audio files for each hotline
      const { hotlines } = get();
      if (hotlines.length > 0) {
        await Promise.all(
          hotlines.map(hotline => loadHotlineAudioFiles(hotline.id))
        );
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load data' });
    } finally {
      set({ loading: false });
    }
  },

  // CRUD Actions
  createHotline: async (orgId) => {
    const { hotlineName, hotlineScript, hotlineMode, selectedPhoneNumber } = get();
    
    if (!hotlineName) {
      set({ error: 'Please fill in the hotline name' });
      return;
    }

    if (hotlineMode === 'tts' && !hotlineScript) {
      set({ error: 'Please fill in the TTS script' });
      return;
    }

    if (!selectedPhoneNumber) {
      set({ error: 'Please select a phone number' });
      return;
    }

    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('hotlines')
        .insert({
          org_id: orgId,
          phone_number_id: selectedPhoneNumber,
          slug: hotlineName.toLowerCase().replace(/\s+/g, '-'),
          name: hotlineName,
          mode: hotlineMode,
          tts_text: hotlineMode === 'tts' ? hotlineScript : null,
          status: 'active'
        })
        .select(`
          *,
          phone_numbers(e164)
        `)
        .single();

      if (error) throw error;
      
      set((state) => ({
        hotlines: [...state.hotlines, data],
        showCreateHotline: false
      }));
      
      get().resetForm();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create hotline' });
    } finally {
      set({ loading: false });
    }
  },

  updateHotline: async (hotlineId, updates) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await supabase
        .from('hotlines')
        .update(updates)
        .eq('id', hotlineId);

      if (error) throw error;

      set((state) => ({
        hotlines: state.hotlines.map(h => 
          h.id === hotlineId ? { ...h, ...updates } : h
        ),
        editingHotline: null
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update hotline' });
    } finally {
      set({ loading: false });
    }
  },

  updateHotlineMode: async (hotlineId, mode) => {
    const { updateHotline } = get();
    await updateHotline(hotlineId, { mode });
  },

  buyPhoneNumber: async (orgId) => {
    try {
      set({ loading: true, error: null });
      
      // Generate a dummy phone number
      const dummyNumber = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
      const dummyTwilioSid = `PN${Math.random().toString(36).substr(2, 34)}`;
      
      const { data, error } = await supabase
        .from('phone_numbers')
        .insert({
          org_id: orgId,
          twilio_sid: dummyTwilioSid,
          e164: dummyNumber,
          region: 'US',
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({
        phoneNumbers: [...state.phoneNumbers, data]
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to buy phone number' });
    } finally {
      set({ loading: false });
    }
  },

  // Utility Actions
  resetForm: () => set({
    hotlineName: '',
    hotlineScript: '',
    hotlineMode: 'tts',
    selectedPhoneNumber: '',
    editScript: ''
  }),

  clearError: () => set({ error: null })
}));
