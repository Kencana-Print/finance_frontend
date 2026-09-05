import apiClient from "./axios";

export interface DashboardSummary {
  kasbon: { count: number; total: number };
  transfer: { count: number; total: number };
  setoran: { count: number };
  serverDate: string;
  saldo: {
    kas: { account: string; saldo: number; count: number };
    bank: { account: string; saldo: number; count: number };
  };
  rekon: { selisihCount: number };
  stok: { negativeCount: number };
  voucherPt: { count: number; total: number };
  hutang: { count: number; total: number };
}

export const dashboardApi = {
  getSummary: async (cabang?: string): Promise<DashboardSummary> => {
    const { data } = await apiClient.get("/dashboard/summary", {
      params: cabang ? { cabang } : undefined,
    });
    return data.data;
  },
};
