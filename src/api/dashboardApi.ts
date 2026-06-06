import apiClient from "./axios";

export interface DashboardSummary {
  kasbon: { count: number; total: number };
  transfer: { count: number; total: number };
  setoran: { count: number };
  serverDate: string;
  // Tambahan:
  saldoKas: { account: string; saldo: number };
  rekon: { selisihCount: number };
  stok: { negativeCount: number };
}

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await apiClient.get("/dashboard/summary");
    return data.data;
  },
};
