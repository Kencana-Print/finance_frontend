import api from "@/api/axios";

export interface RencanaPembayaranRow {
  KodeSupplier: string;
  Supplier: string;
  Bulan: number;
  Tahun: number;
  JumlahVoucher: number;
  Nominal: number;
  TglRencana: string | null;
  Keterangan: string;
  __key?: string;
}

export interface RencanaPembayaranDetail {
  KodeSupplier: string;
  Bulan: number;
  Tahun: number;
  Nomor: string;
  Tanggal: string;
  NomorPajak: string;
  Total: number;
  BahanTambahan: number;
  StatusRealisasi: string;
}

export const rencanaPembayaranApi = {
  getBrowse: async (params: {
    startDate: string;
    endDate: string;
    supKode?: string;
  }) => {
    const { data } = await api.get("/transaksi/rencana-pembayaran", {
      params,
    });
    return data.data as RencanaPembayaranRow[];
  },

  getBrowseDetail: async (params: {
    startDate: string;
    endDate: string;
    supKode?: string;
  }) => {
    const { data } = await api.get("/transaksi/rencana-pembayaran/detail", {
      params,
    });
    return data.data as RencanaPembayaranDetail[];
  },

  saveRencana: async (payload: {
    supKode: string;
    bulan: number;
    tahun: number;
    tglRencana: string | null;
    keterangan?: string;
  }) => {
    const { data } = await api.post("/transaksi/rencana-pembayaran", payload);
    return data;
  },
};
