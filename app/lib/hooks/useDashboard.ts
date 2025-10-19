import { useEffect } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import { useOrg } from '../useOrg';

export const useDashboard = () => {
  const { currentOrg } = useOrg();
  const {
    loading,
    error,
    phoneNumbers,
    hotlines,
    hotlineAudioFiles,
    loadAllData,
    clearError
  } = useDashboardStore();

  useEffect(() => {
    if (currentOrg) {
      loadAllData(currentOrg.id);
    }
  }, [currentOrg, loadAllData]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return {
    currentOrg,
    loading,
    error,
    phoneNumbers,
    hotlines,
    hotlineAudioFiles
  };
};
