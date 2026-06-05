import apiClient from "./axios";

export interface DashboardSummary {
  kasbon: {
    count: number;
    total: number;
  };
  transfer: {
    count: number;
    total: number;
  };
}

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await apiClient.get("/dashboard/summary");
    return data.data;
  },
};
