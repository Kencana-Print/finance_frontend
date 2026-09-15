<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { pengajuanTransferFormApi } from "@/api/transaksi/pengajuanTransferFormApi";

const route = useRoute();
const toast = useToast();

interface PrintDetail {
  namaSupplier: string;
  bank: string;
  atasNama: string;
  rekening: string;
  nominal: number;
  keterangan: string;
  tglRealisasi: string;
}

interface PrintData {
  nomor: string;
  tanggal: string;
  tanggal_fmt: string;
  account: string;
  noRekAsal: string;
  namaRekening: string;
  user_create: string;
  total: number;
  detail: PrintDetail[];
}

const data = ref<PrintData | null>(null);
const isLoading = ref(true);

onMounted(async () => {
  try {
    const nomor = decodeURIComponent(route.params.nomor as string);
    data.value = await pengajuanTransferFormApi.getPrintData(nomor);
    setTimeout(() => window.print(), 600);
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal memuat data cetak.");
  } finally {
    isLoading.value = false;
  }
});

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
</script>

<template>
  <div v-if="isLoading" class="loading-wrap">Memuat data...</div>

  <div v-else-if="data" class="print-page">
    <!-- ── Header ── -->
    <div class="header-wrap">
      <div class="header-left">
        <div class="judul">PENGAJUAN TRANSFER</div>
        <table class="info-tbl">
          <tr>
            <td class="info-key">Tanggal</td>
            <td class="info-sep">:</td>
            <td class="info-val">{{ data.tanggal_fmt }}</td>
          </tr>
          <tr>
            <td class="info-key">Nomor</td>
            <td class="info-sep">:</td>
            <td class="info-val">{{ data.nomor }}</td>
          </tr>
          <tr>
            <td class="info-key">Rekening Asal</td>
            <td class="info-sep">:</td>
            <td class="info-val">
              ({{ data.account }}) {{ data.namaRekening }} -
              {{ data.noRekAsal }}
            </td>
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
          <th style="width: 24px">No</th>
          <th>Nama Supplier</th>
          <th>Nama Bank</th>
          <th>Atas Nama</th>
          <th>No Rekening</th>
          <th>Nominal</th>
          <th>Keterangan</th>
          <th>Tgl Realisasi</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(d, idx) in data.detail" :key="idx">
          <td class="tc">{{ idx + 1 }}</td>
          <td>{{ d.namaSupplier }}</td>
          <td>{{ d.bank }}</td>
          <td>{{ d.atasNama }}</td>
          <td>{{ d.rekening }}</td>
          <td class="tr">{{ fmt(d.nominal) }}</td>
          <td>{{ d.keterangan }}</td>
          <td class="tc">{{ d.tglRealisasi || "" }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="5" class="tr total-label">Total</td>
          <td class="tr total-val">{{ fmt(data.total) }}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>

    <!-- ── Tanda Tangan ── -->
    <div class="ttd-wrap">
      <div class="ttd-col">
        <div class="ttd-title">Dibuat Oleh,</div>
        <div class="ttd-space"></div>
        <div class="ttd-name">( {{ data.user_create }} )</div>
      </div>
    </div>
  </div>

  <div v-else class="loading-wrap">Data tidak ditemukan.</div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  padding: 0;
  background: #e0e0e0;
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
  width: 297mm;
  margin: 20px auto;
  padding: 12mm 14mm 15mm;
  font-family: Arial, sans-serif;
  font-size: 9.5pt;
  color: #000;
  background: white;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2);
  overflow-x: auto;
}

/* Header */
.header-wrap {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.header-left {
  flex: 1;
}
.judul {
  font-size: 12pt;
  font-weight: bold;
  margin-bottom: 6px;
}
.logo-img {
  height: 48px;
  object-fit: contain;
}

.info-tbl {
  border-collapse: collapse;
  font-size: 9.5pt;
}
.info-tbl td {
  padding: 1px 3px;
}
.info-key {
  font-weight: 600;
  white-space: nowrap;
  min-width: 90px;
}
.info-sep {
  padding: 0 4px;
}

/* Detail table */
.detail-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5pt;
  margin-top: 8px;
}
.detail-tbl thead th {
  border: 1px solid #000;
  padding: 3px 5px;
  text-align: left;
  font-weight: 700;
  background: #f0f0f0;
  white-space: nowrap;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.detail-tbl tbody td {
  border: 1px solid #000;
  padding: 2px 5px;
  vertical-align: middle;
  white-space: nowrap;
}
.detail-tbl tfoot td {
  border: 1px solid #000;
  padding: 3px 5px;
  white-space: nowrap;
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
  margin-top: 24px;
}
.ttd-col {
  text-align: center;
  min-width: 130px;
}
.ttd-title {
  font-weight: 600;
  font-size: 9.5pt;
  margin-bottom: 4px;
}
.ttd-space {
  height: 45px;
}
.ttd-name {
  font-size: 9.5pt;
  border-top: 1px solid #000;
  padding-top: 3px;
}

/* ── PRINT ── */
@media print {
  @page {
    size: A4 landscape;
    margin: 8mm 12mm;
  }
  body {
    margin: 0;
    padding: 0;
    background: white;
  }
  .print-page {
    width: 100%;
    min-height: calc(
      210mm - 16mm
    ); /* tinggi A4 landscape dikurangi margin atas+bawah */
    margin: 0;
    padding: 0;
    box-shadow: none;
    background: white;
  }
  .print-page,
  .detail-tbl,
  .ttd-wrap {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>
