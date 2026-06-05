<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { bkkFormApi } from "@/api/transaksi/bkkFormApi";

const route = useRoute();
const toast = useToast();

interface PrintData {
  nomor: string;
  nota: string;
  penerima: string;
  tanggal: string;
  tanggal_fmt: string;
  keterangan: string;
  cabang: string;
  kasir: string;
  total: number;
  detail: { no: number; uraian: string; nominal: number }[];
}

const data = ref<PrintData | null>(null);
const isLoading = ref(true);

onMounted(async () => {
  try {
    const nomor = decodeURIComponent(route.params.nomor as string);
    data.value = await bkkFormApi.getPrintData(nomor);
    // Auto print setelah data siap
    setTimeout(() => window.print(), 600);
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal memuat data cetak.");
  } finally {
    isLoading.value = false;
  }
});

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

// Terbilang sederhana (ratusan juta cukup untuk BKK operasional)
const terbilang = (n: number): string => {
  const satuan = [
    "",
    "SATU",
    "DUA",
    "TIGA",
    "EMPAT",
    "LIMA",
    "ENAM",
    "TUJUH",
    "DELAPAN",
    "SEMBILAN",
    "SEPULUH",
    "SEBELAS",
  ];
  const convert = (num: number): string => {
    if (num < 12) return satuan[num];
    if (num < 20) return satuan[num - 10] + " BELAS";
    if (num < 100)
      return satuan[Math.floor(num / 10)] + " PULUH " + satuan[num % 10];
    if (num < 200) return "SERATUS " + convert(num - 100);
    if (num < 1000)
      return satuan[Math.floor(num / 100)] + " RATUS " + convert(num % 100);
    if (num < 2000) return "SERIBU " + convert(num - 1000);
    if (num < 1000000)
      return convert(Math.floor(num / 1000)) + " RIBU " + convert(num % 1000);
    if (num < 1000000000)
      return (
        convert(Math.floor(num / 1000000)) + " JUTA " + convert(num % 1000000)
      );
    return (
      convert(Math.floor(num / 1000000000)) +
      " MILIAR " +
      convert(num % 1000000000)
    );
  };
  if (n === 0) return "NOL";
  return convert(Math.floor(n)).replace(/\s+/g, " ").trim();
};
</script>

<template>
  <div v-if="isLoading" class="loading-wrap">Memuat data...</div>

  <div v-else-if="data" class="print-page">
    <!-- ── Header ── -->
    <div class="header-wrap">
      <div class="header-left">
        <div class="judul">BUKTI KAS KELUAR</div>
        <table class="info-tbl">
          <tr>
            <td class="info-key">Nomor</td>
            <td class="info-sep">:</td>
            <td class="info-val">{{ data.nomor }}</td>
            <td style="width: 20px"></td>
            <td class="info-key">Nota</td>
            <td class="info-sep">:</td>
            <td class="info-val">{{ data.nota }}</td>
          </tr>
          <tr>
            <td class="info-key">Tanggal</td>
            <td class="info-sep">:</td>
            <td class="info-val">{{ data.tanggal_fmt }}</td>
          </tr>
          <tr>
            <td class="info-key">Keterangan</td>
            <td class="info-sep">:</td>
            <td class="info-val" colspan="4">{{ data.keterangan }}</td>
          </tr>
        </table>
      </div>
      <div class="header-logo">
        <img src="@/assets/logo.png" alt="Logo" class="logo-img" />
      </div>
    </div>

    <!-- ── Tabel Detail ── -->
    <table class="detail-tbl">
      <thead>
        <tr>
          <th style="width: 35px">No</th>
          <th>Uraian</th>
          <th style="width: 110px">Nominal</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in data.detail" :key="d.no">
          <td class="tc">{{ d.no }}</td>
          <td>{{ d.uraian }}</td>
          <td class="tr">{{ fmt(d.nominal) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="terbilang-cell">
            Terbilang: {{ terbilang(data.total) }}
          </td>
          <td></td>
        </tr>
        <tr class="total-row">
          <td colspan="2" class="total-label">Total :</td>
          <td class="tr total-val">{{ fmt(data.total) }}</td>
        </tr>
      </tfoot>
    </table>

    <!-- ── Tanda Tangan ── -->
    <div class="ttd-wrap">
      <div class="ttd-col">
        <div class="ttd-title">Diterima Oleh</div>
        <div class="ttd-space"></div>
        <div class="ttd-name">( {{ data.penerima }} )</div>
      </div>
      <div class="ttd-col">
        <div class="ttd-title">Kasir</div>
        <div class="ttd-space"></div>
        <div class="ttd-name">( {{ data.kasir }} )</div>
      </div>
      <div class="ttd-col">
        <div class="ttd-title">Manager</div>
        <div class="ttd-space"></div>
        <div class="ttd-name">({{ " ".repeat(20) }})</div>
      </div>
    </div>
  </div>

  <div v-else class="loading-wrap">Data tidak ditemukan.</div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: #555;
}

.print-page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 15mm 15mm 20mm;
  font-family: Arial, sans-serif;
  font-size: 11pt;
  color: #000;
  background: white;
}

/* Header */
.header-wrap {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.judul {
  font-size: 13pt;
  font-weight: bold;
  text-align: center;
  margin-bottom: 8px;
}
.logo-img {
  height: 52px;
  object-fit: contain;
}
.info-tbl {
  border-collapse: collapse;
  font-size: 10.5pt;
}
.info-tbl td {
  padding: 1px 4px;
}
.info-key {
  font-weight: 600;
  white-space: nowrap;
}
.info-sep {
  padding: 0 2px;
}

/* Detail table */
.detail-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 10.5pt;
  margin-top: 6px;
}
.detail-tbl thead th {
  border: 1px solid #000;
  padding: 4px 6px;
  text-align: left;
  font-weight: 700;
  background: #f0f0f0;
}
.detail-tbl tbody td {
  border: 1px solid #000;
  padding: 3px 6px;
}
.detail-tbl tfoot td {
  border: 1px solid #000;
  padding: 4px 6px;
}
.terbilang-cell {
  font-style: italic;
  font-size: 10pt;
}
.total-row .total-label {
  font-weight: 700;
  text-align: right;
}
.total-row .total-val {
  font-weight: 700;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* TTD */
.ttd-wrap {
  display: flex;
  justify-content: space-around;
  margin-top: 30px;
  gap: 12px;
}
.ttd-col {
  text-align: center;
  min-width: 130px;
}
.ttd-title {
  font-weight: 600;
  font-size: 10.5pt;
  margin-bottom: 4px;
}
.ttd-space {
  height: 55px;
}
.ttd-name {
  font-size: 10.5pt;
  border-top: 1px solid #000;
  padding-top: 3px;
}

/* Print */
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }
  body {
    margin: 0;
  }
  .print-page {
    width: 210mm;
    padding: 12mm 14mm 18mm;
    margin: 0;
    box-shadow: none;
  }
}

/* Screen preview */
@media screen {
  body {
    background: #e0e0e0;
  }
  .print-page {
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2);
    margin: 20px auto;
  }
}
</style>
