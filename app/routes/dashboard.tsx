import { useAuth } from "../lib/useAuth";
import { useOrg } from "../lib/useOrg";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const { user } = useAuth();
  const { currentOrg, loading } = useOrg();
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [hotlines, setHotlines] = useState<any[]>([]);
  const [showCreateHotline, setShowCreateHotline] = useState(false);
  const [hotlineScript, setHotlineScript] = useState("");
  const [hotlineName, setHotlineName] = useState("");
  const [editingHotline, setEditingHotline] = useState<any>(null);
  const [editScript, setEditScript] = useState("");
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>("");

  // Load existing data when component mounts or org changes
  useEffect(() => {
    if (currentOrg) {
      loadExistingData();
    }
  }, [currentOrg]);

  const loadExistingData = async () => {
    if (!currentOrg) return;

    try {
      // Load phone numbers
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('org_id', currentOrg.id);

      if (phoneError) throw phoneError;
      setPhoneNumbers(phoneData || []);

      // Load hotlines
      const { data: hotlineData, error: hotlineError } = await supabase
        .from('hotlines')
        .select(`
          *,
          phone_numbers(e164)
        `)
        .eq('org_id', currentOrg.id);

      if (hotlineError) throw hotlineError;
      setHotlines(hotlineData || []);
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const buyPhoneNumber = async () => {
    if (!currentOrg) return;
    
    try {
      // Generate a dummy phone number
      const dummyNumber = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
      const dummyTwilioSid = `PN${Math.random().toString(36).substr(2, 34)}`;
      
      const { data, error } = await supabase
        .from('phone_numbers')
        .insert({
          org_id: currentOrg.id,
          twilio_sid: dummyTwilioSid,
          e164: dummyNumber,
          region: 'US',
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      
      setPhoneNumbers(prev => [...prev, data]);
      alert(`Phone number ${dummyNumber} purchased successfully!`);
    } catch (error) {
      console.error('Error buying phone number:', error);
      alert('Error buying phone number');
    }
  };

  const createHotline = async () => {
    if (!currentOrg || !hotlineName || !hotlineScript) {
      alert('Please fill in both name and script');
      return;
    }

    if (!selectedPhoneNumber) {
      alert('Please select a phone number');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('hotlines')
        .insert({
          org_id: currentOrg.id,
          phone_number_id: selectedPhoneNumber,
          slug: hotlineName.toLowerCase().replace(/\s+/g, '-'),
          name: hotlineName,
          mode: 'tts',
          tts_text: hotlineScript,
          status: 'active'
        })
        .select(`
          *,
          phone_numbers(e164)
        `)
        .single();

      if (error) throw error;
      
      setHotlines(prev => [...prev, data]);
      setShowCreateHotline(false);
      setHotlineName("");
      setHotlineScript("");
      setSelectedPhoneNumber("");
      alert(`Hotline "${hotlineName}" created successfully!`);
    } catch (error) {
      console.error('Error creating hotline:', error);
      alert('Error creating hotline');
    }
  };

  const startEditHotline = (hotline: any) => {
    setEditingHotline(hotline);
    setEditScript(hotline.tts_text || "");
  };

  const cancelEdit = () => {
    setEditingHotline(null);
    setEditScript("");
  };

  const updateHotline = async () => {
    if (!editingHotline || !editScript.trim()) {
      alert('Please enter a script');
      return;
    }

    try {
      const { error } = await supabase
        .from('hotlines')
        .update({ tts_text: editScript })
        .eq('id', editingHotline.id);

      if (error) throw error;

      // Update local state
      setHotlines(prev => prev.map(h => 
        h.id === editingHotline.id 
          ? { ...h, tts_text: editScript }
          : h
      ));

      setEditingHotline(null);
      setEditScript("");
      alert('Hotline updated successfully!');
    } catch (error) {
      console.error('Error updating hotline:', error);
      alert('Error updating hotline');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your organization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to HotlineCo! 🎉
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Your organization is ready to go
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Organization Details
          </h2>
          
          {currentOrg ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {currentOrg.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Plan: {currentOrg.plan}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Created: {new Date(currentOrg.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Owner: {user?.email}
                  </p>
                </div>
              </div>
              
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
                    onClick={buyPhoneNumber}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                  >
                    📞 Buy Additional Phone Number (Dummy)
                  </button>
                </div>
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
                      {(() => {
                        const usedPhoneIds = hotlines.map(h => h.phone_number_id).filter(Boolean);
                        const availableNumbers = phoneNumbers.filter(pn => !usedPhoneIds.includes(pn.id));
                        
                        if (availableNumbers.length === 0) {
                          return (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                              <p className="text-sm text-red-800 dark:text-red-200">
                                ⚠️ No available phone numbers. Please buy a new phone number first.
                              </p>
                            </div>
                          );
                        }
                        
                        return (
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
                        );
                      })()}
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
                    <div className="flex gap-3">
                      <button
                        onClick={createHotline}
                        disabled={!selectedPhoneNumber || !hotlineName || !hotlineScript}
                        className={`font-semibold py-2 px-4 rounded-lg transition ${
                          !selectedPhoneNumber || !hotlineName || !hotlineScript
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        Create Hotline
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateHotline(false);
                          setSelectedPhoneNumber("");
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Display Created Items */}
              {(phoneNumbers.length > 0 || hotlines.length > 0) && (
                <div className="mt-8 space-y-6">
                  {/* Hotlines as primary items */}
                  {hotlines.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        🎯 Hotlines
                      </h3>
                      <div className="space-y-4">
                        {hotlines.map((hotline) => (
                          <div key={hotline.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            {editingHotline?.id === hotline.id ? (
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
                                    onClick={updateHotline}
                                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-1 px-3 rounded transition"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEdit}
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
                                      Mode: {hotline.mode} • Status: {hotline.status}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => startEditHotline(hotline)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1 px-3 rounded transition"
                                  >
                                    Edit
                                  </button>
                                </div>
                                
                                {/* Phone number as sub-element */}
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
                                <div className="ml-4 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">🎤</span>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">TTS Script</span>
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    "{hotline.tts_text || 'No script set'}"
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available Phone Numbers */}
                  {(() => {
                    const usedPhoneIds = hotlines.map(h => h.phone_number_id).filter(Boolean);
                    const availableNumbers = phoneNumbers.filter(pn => !usedPhoneIds.includes(pn.id));
                    
                    if (availableNumbers.length > 0) {
                      return (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            📞 Available Phone Numbers
                          </h3>
                          <div className="space-y-2">
                            {availableNumbers.map((number) => (
                              <div key={number.id} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-green-900 dark:text-green-100">
                                      {number.e164}
                                    </p>
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                      Region: {number.region} • Status: {number.status}
                                    </p>
                                  </div>
                                  <div className="px-2 py-1 rounded text-xs font-medium bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">
                                    Available
                                  </div>
                                </div>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                  Ready to be assigned to a new hotline
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                No organization found. This shouldn't happen - please contact support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

