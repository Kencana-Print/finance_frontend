<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { uangMukaFormApi } from "@/api/transaksi/uangMukaFormApi";
import logoUrl from "@/assets/logo.png";

const route = useRoute();
const data = ref<any>(null);
const isLoading = ref(true);
const error = ref("");

onMounted(async () => {
  try {
    data.value = await uangMukaFormApi.getPrintData(
      decodeURIComponent(route.params.nomor as string),
    );
    setTimeout(() => window.print(), 600);
  } catch (e: any) {
    error.value = e.response?.data?.message ?? "Gagal memuat data.";
  } finally {
    isLoading.value = false;
  }
});

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
const terbilang = (n: number): string => {
  const satuan = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
    "dua belas",
    "tiga belas",
    "empat belas",
    "lima belas",
    "enam belas",
    "tujuh belas",
    "delapan belas",
    "sembilan belas",
  ];
  if (n < 20) return satuan[n];
  if (n < 100)
    return (
      satuan[
        Math.floor(n / 10) * 10 - Math.floor(n / 10) * 10 + Math.floor(n / 10)
      ] +
      " puluh" +
      (n % 10 ? " " + satuan[n % 10] : "")
    );
  const convert = (num: number): string => {
    if (num === 0) return "";
    if (num < 20) return satuan[num] + " ";
    if (num < 100)
      return (
        satuan[Math.floor(num / 10)] +
        " puluh " +
        (num % 10 ? satuan[num % 10] + " " : "")
      );
    if (num < 200) return "seratus " + convert(num - 100);
    if (num < 1000)
      return satuan[Math.floor(num / 100)] + " ratus " + convert(num % 100);
    if (num < 2000) return "seribu " + convert(num - 1000);
    if (num < 1000000)
      return convert(Math.floor(num / 1000)) + "ribu " + convert(num % 1000);
    if (num < 1000000000)
      return (
        convert(Math.floor(num / 1000000)) + "juta " + convert(num % 1000000)
      );
    return (
      convert(Math.floor(num / 1000000000)) +
      "milyar " +
      convert(num % 1000000000)
    );
  };
  return convert(n).trim().toUpperCase();
};
</script>

<template>
  <div v-if="isLoading" class="loading">Memuat data...</div>
  <div v-else-if="error" class="loading">{{ error }}</div>
  <div v-else-if="data" class="print-page">
    <!-- Header -->
    <div class="header-row">
      <div class="header-left">
        <div class="doc-title">BUKTI KASBON</div>
      </div>
      <div class="header-right">
        <img :src="logoUrl" alt="Logo" class="logo" />
      </div>
    </div>

    <!-- Info -->
    <table class="info-table">
      <tr>
        <td class="info-lbl">No.Bon</td>
        <td class="info-sep">:</td>
        <td class="info-val">
          <strong>{{ data.nomor }}</strong>
        </td>
        <td class="info-lbl">No.Pengajuan</td>
        <td class="info-sep">:</td>
        <td class="info-val">{{ data.pjh || "-" }}</td>
      </tr>
      <tr>
        <td class="info-lbl">Tanggal</td>
        <td class="info-sep">:</td>
        <td class="info-val">{{ data.tanggal_fmt }}</td>
        <td class="info-lbl">Nota</td>
        <td class="info-sep">:</td>
        <td class="info-val">{{ data.nota || "-" }}</td>
      </tr>
      <tr>
        <td class="info-lbl">Keterangan</td>
        <td class="info-sep">:</td>
        <td class="info-val" colspan="4">{{ data.keterangan || "-" }}</td>
      </tr>
    </table>

    <!-- Detail Table -->
    <table class="detail-table">
      <thead>
        <tr>
          <th style="width: 28px">No</th>
          <th>Uraian</th>
          <th style="width: 70px; text-align: right">Qty</th>
          <th style="width: 110px; text-align: right">Nominal</th>
          <th style="width: 110px; text-align: right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(d, i) in data.detail" :key="i">
          <td class="tc">{{ Number(i) + 1 }}</td>
          <td>{{ d.nama }}{{ d.spesifikasi ? " - " + d.spesifikasi : "" }}</td>
          <td class="tr">{{ d.qty }}</td>
          <td class="tr">{{ fmt(d.nilai) }}</td>
          <td class="tr">{{ fmt(d.total) }}</td>
        </tr>
        <tr v-if="!data.detail.length">
          <td colspan="5" class="tc" style="color: #999; font-style: italic">
            Tidak ada detail
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Terbilang + Total -->
    <table class="total-table">
      <tr>
        <td class="terbilang-cell">Terbilang: {{ terbilang(data.gtotal) }}</td>
        <td class="kasbon-label">Kasbon:</td>
        <td class="kasbon-val">
          <strong>{{ fmt(data.gtotal) }}</strong>
        </td>
      </tr>
    </table>

    <!-- TTD -->
    <div class="ttd-row">
      <div class="ttd-col">
        <div class="ttd-title">Diterima Oleh</div>
        <div class="ttd-space"></div>
        <div class="ttd-name">({{ data.penerima }})</div>
      </div>
      <div class="ttd-col">
        <div class="ttd-title">Kasir</div>
        <div class="ttd-space"></div>
        <div class="ttd-name">({{ data.kasir || "ADMIN" }})</div>
      </div>
      <div class="ttd-col">
        <div class="ttd-title">Diketahui</div>
        <div class="ttd-space"></div>
        <div class="ttd-name">( )</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: #666;
}

.print-page {
  width: 190mm;
  margin: 0 auto;
  padding: 10mm 12mm;
  font-family: Arial, sans-serif;
  font-size: 10pt;
  color: #000;
}

/* Header */
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}
.doc-title {
  font-size: 14pt;
  font-weight: 700;
  letter-spacing: 0.05em;
  margin-top: 8px;
}
.logo {
  height: 45px;
  object-fit: contain;
}

/* Info table */
.info-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
  font-size: 9.5pt;
}
.info-lbl {
  font-weight: 600;
  white-space: nowrap;
  padding: 1px 4px 1px 0;
  width: 90px;
}
.info-sep {
  padding: 1px 4px;
  width: 8px;
}
.info-val {
  padding: 1px 8px 1px 0;
}

/* Detail table */
.detail-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0;
  font-size: 9.5pt;
}
.detail-table thead tr {
  background: #f0f0f0;
}
.detail-table th {
  border: 1px solid #000;
  padding: 4px 6px;
  font-weight: 700;
  text-align: left;
}
.detail-table td {
  border: 1px solid #000;
  padding: 3px 6px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

/* Total */
.total-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
  border: 1px solid #000;
  border-top: none;
}
.terbilang-cell {
  padding: 4px 6px;
  font-style: italic;
  border-right: 1px solid #000;
}
.kasbon-label {
  padding: 4px 6px;
  font-weight: 700;
  white-space: nowrap;
  text-align: right;
  border-right: 1px solid #000;
  width: 70px;
}
.kasbon-val {
  padding: 4px 6px;
  text-align: right;
  width: 110px;
}

/* TTD */
.ttd-row {
  display: flex;
  margin-top: 20px;
  gap: 0;
}
.ttd-col {
  flex: 1;
  text-align: center;
  font-size: 9.5pt;
}
.ttd-title {
  font-weight: 600;
  margin-bottom: 2px;
}
.ttd-space {
  height: 40px;
}
.ttd-name {
  border-top: 1px solid #000;
  padding-top: 2px;
  display: inline-block;
  min-width: 120px;
}

@media print {
  @page {
    size: A4;
    margin: 10mm 12mm;
  }
  .print-page {
    width: 100%;
    padding: 0;
    margin: 0;
  }
}
</style>
