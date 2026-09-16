import api from "@/api/axios";

export interface BkkFormDetail {
  no: number;
  uraian: string;
  satuan: string;
  qty: number;
  harga: number;
  total: number;
  rekkode: string;
  reknama: string;
  dckode?: number;
  cckode: number;
  ccnama: string;
  dcnama: string;
  mb: string;
  pck: string;
  kdbrg: string;
  jenis_item: string;
  cab_item: string;
  supkode: string;
  supnama: string;
  bank: string;
  rekening: string;
  atasnama: string;
}

export interface BkkForm {
  nomor: string;
  tanggal: string;
  rek_kode: string;
  rek_nama: string;
  penerima: string;
  nota: string;
  keterangan: string;
  cabang: string;
  cabang_old: string;
  detail: BkkFormDetail[];
}

export interface SupplierOption {
  kode: string;
  nama: string;
}

export interface SupplierDetailOption {
  kode: string;
  nama: string;
  bank: string;
  rekening: string;
  atasnama: string;
}

export interface PettyCashOption {
  nomor: string;
  tanggal: string;
  store: string;
  namaStore: string;
  nominal: number;
}

export const bkkFormApi = {
  getAccountOptions: async (cabang: string) => {
    const { data } = await api.get("/transaksi/bkk/form/account", {
      params: { cabang },
    });
    return data.data as { kode: string; nama: string; cabang: string }[];
  },
  getAccountAll: async () => {
    const { data } = await api.get("/transaksi/bkk/form/account-all");
    return data.data as { kode: string; nama: string; cabang: string }[];
  },
  getKeteranganOptions: async () => {
    const { data } = await api.get("/transaksi/bkk/form/keterangan");
    return data.data as { nama: string }[];
  },
  getCostCenterOptions: async () => {
    const { data } = await api.get("/transaksi/bkk/form/cost-center");
    return data.data as { kode: number; nama: string }[];
  },
  getDcOptions: async (cckode: number) => {
    const { data } = await api.get(`/transaksi/bkk/form/dc/${cckode}`);
    return data.data as { kode: number; nama: string }[];
  },
  getSupplierOptions: async (search = "") => {
    const { data } = await api.get("/transaksi/bkk/form/supplier", {
      params: { search },
    });
    return data.data as SupplierOption[];
  },
  getSupplierDetail: async (kode: string) => {
    const { data } = await api.get(
      `/transaksi/bkk/form/supplier/${encodeURIComponent(kode)}`,
    );
    return data.data as SupplierDetailOption[];
  },
  getPettyCashOptions: async (search = "") => {
    const { data } = await api.get("/transaksi/bkk/form/petty-cash", {
      params: { search },
    });
    return data.data as PettyCashOption[];
  },
  getDetailForm: async (nomor: string): Promise<BkkForm> => {
    const { data } = await api.get(
      `/transaksi/bkk/form/form/${encodeURIComponent(nomor)}`,
    );
    return data.data;
  },
  save: async (payload: any) => {
    const { data } = await api.post("/transaksi/bkk/form/save", payload);
    return data;
  },
  getPrintData: async (nomor: string) => {
    const { data } = await api.get(
      `/transaksi/bkk/form/print/${encodeURIComponent(nomor)}`,
    );
    return data.data;
  },
};
