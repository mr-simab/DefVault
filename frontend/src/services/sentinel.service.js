import apiService from './api.service';

const sentinelService = {
  analyzeUrl: async (url) => {
    const response = await apiService.analyzeUrl({ url });
    return response.data;
  },

  getScanResult: async (scanId) => {
    const response = await apiService.getScanResult(scanId);
    return response.data;
  },

  getScanHistory: async () => {
    const response = await apiService.getScanHistory();
    return response.data;
  }
};

export default sentinelService;
