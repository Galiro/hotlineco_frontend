import { useDashboardStore } from '../../lib/stores/dashboardStore';
import type { PhoneNumber } from '../../lib/stores/dashboardStore';

interface HotlineCreationFormProps {
  phoneNumbers: PhoneNumber[];
  hotlines: any[];
  currentOrg: any;
}

export function HotlineCreationForm({ phoneNumbers, hotlines, currentOrg }: HotlineCreationFormProps) {
  const {
    showCreateHotline,
    hotlineName,
    hotlineScript,
    hotlineMode,
    selectedPhoneNumber,
    loading,
    setShowCreateHotline,
    setHotlineName,
    setHotlineScript,
    setHotlineMode,
    setSelectedPhoneNumber,
    createHotline,
    buyPhoneNumber,
    resetForm
  } = useDashboardStore();

  const handleCreateHotline = () => {
    createHotline(currentOrg.id);
  };

  const handleCancel = () => {
    setShowCreateHotline(false);
    resetForm();
  };

  const handleBuyPhoneNumber = () => {
    buyPhoneNumber(currentOrg.id);
  };

  const usedPhoneIds = hotlines.map(h => h.phone_number_id).filter(Boolean);
  const availableNumbers = phoneNumbers.filter(pn => !usedPhoneIds.includes(pn.id));

  return (
    <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
        Create New Hotline
      </h3>
      <p className="text-blue-800 dark:text-blue-200 mb-4">
        Create a new hotline with its own phone number and TTS script.
      </p>
      
      <div className="space-y-4">
        <button
          onClick={() => setShowCreateHotline(!showCreateHotline)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
        >
          🎯 Create New Hotline
        </button>
        
        <button
          onClick={handleBuyPhoneNumber}
          disabled={loading}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm disabled:opacity-50"
        >
          📞 Buy Additional Phone Number (Dummy)
        </button>
      </div>

      {/* Hotline Creation Form */}
      {showCreateHotline && (
        <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create New Hotline
          </h3>
          
          <div className="space-y-4">
            {/* Phone Number Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                📞 Select Phone Number
              </label>
              {availableNumbers.length === 0 ? (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    ⚠️ No available phone numbers. Please buy a new phone number first.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableNumbers.map((number) => (
                    <label key={number.id} className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="radio"
                        name="phoneNumber"
                        value={number.id}
                        checked={selectedPhoneNumber === number.id}
                        onChange={(e) => setSelectedPhoneNumber(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {number.e164}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Region: {number.region} • Status: {number.status}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hotline Name
              </label>
              <input
                type="text"
                value={hotlineName}
                onChange={(e) => setHotlineName(e.target.value)}
                placeholder="e.g., Summer Sale Hotline"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🎛️ Call Mode
              </label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="create-tts"
                    name="create-mode"
                    value="tts"
                    checked={hotlineMode === 'tts'}
                    onChange={(e) => setHotlineMode(e.target.value as 'tts' | 'audio')}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="create-tts" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    🎤 Text-to-Speech
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="create-audio"
                    name="create-mode"
                    value="audio"
                    checked={hotlineMode === 'audio'}
                    onChange={(e) => setHotlineMode(e.target.value as 'tts' | 'audio')}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="create-audio" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    🎵 Audio Files
                  </label>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {hotlineMode === 'tts' 
                  ? 'Callers will hear text-to-speech from your script'
                  : 'Callers will hear your uploaded audio files'
                }
              </p>
            </div>

            {hotlineMode === 'tts' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  TTS Script
                </label>
                <textarea
                  value={hotlineScript}
                  onChange={(e) => setHotlineScript(e.target.value)}
                  placeholder="Enter the text that will be spoken to callers..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={handleCreateHotline}
                disabled={!selectedPhoneNumber || !hotlineName || (hotlineMode === 'tts' && !hotlineScript) || loading}
                className={`font-semibold py-2 px-4 rounded-lg transition ${
                  !selectedPhoneNumber || !hotlineName || (hotlineMode === 'tts' && !hotlineScript) || loading
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? 'Creating...' : 'Create Hotline'}
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
