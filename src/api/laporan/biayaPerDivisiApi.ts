import api from "@/api/axios";

export interface DivisiOption {
  kode: number;
  nama: string;
}

export interface BiayaDetailRow {
  noPengajuan: string;
  tanggalPengajuan: string;
  noBkkBbk: string;
  tanggalBkkBbk: string;
  detailCC: string;
  uraian: string;
  nominal: number;
}

export interface BiayaAkun {
  rekKode: string;
  namaAkun: string;
  totalNominal: number;
  detail: BiayaDetailRow[];
}

export interface BiayaPerDivisiData {
  divisi: { kode: number; nama: string };
  akunList: BiayaAkun[];
  grandTotal: number;
}

export const biayaPerDivisiApi = {
  getListDivisi: async () => {
    const { data } = await api.get("/laporan/biaya-per-divisi/divisi");
    return data.data as DivisiOption[];
  },

  getBiayaPerDivisi: async (params: {
    cckode: number | string;
    startDate: string;
    endDate: string;
  }) => {
    const { data } = await api.get("/laporan/biaya-per-divisi", { params });
    return data.data as BiayaPerDivisiData;
  },
};
