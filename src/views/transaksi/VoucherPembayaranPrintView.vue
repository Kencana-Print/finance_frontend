<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import api from "@/api/axios";

const route = useRoute();
const rows = ref<any[]>([]);
const isLoading = ref(true);
const error = ref("");

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

onMounted(async () => {
  try {
    const nomor = decodeURIComponent(route.params.nomor as string);
    const { data } = await api.get(
      `/transaksi/voucher-pembayaran/print/${encodeURIComponent(nomor)}`,
    );
    rows.value = data.data;
  } catch (e: any) {
    error.value = e.response?.data?.message ?? "Gagal memuat data.";
  } finally {
    isLoading.value = false;
  }
});

// Header dari baris pertama
const hdr = computed(() => rows.value[0] ?? null);

// Total baris (BPB/BPJ/POE +, RET/PJG -)
const grandNet = computed(() => {
  if (!rows.value.length) return 0;
  return rows.value.reduce((s, r) => {
    if (["RET", "PJG"].includes(r.voud_type)) return s - Number(r.total_baris);
    return s + Number(r.total_baris);
  }, 0);
});
const bahanTambahan = computed(() =>
  Number(rows.value[0]?.bahan_tambahan || 0),
);
const disc = computed(() => Number(rows.value[0]?.vou_disc || 0));
const grandTotal = computed(
  () => grandNet.value - bahanTambahan.value - disc.value,
);
</script>

<template>
  <div class="print-page">
    <div v-if="isLoading" class="loading">Memuat data...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else-if="hdr">
      <!-- ── Header Perusahaan ── -->
      <div class="page-header">
        <div class="company-info">
          <div class="company-name">CV. Kencana Print</div>
          <div>Padokan RT 04 / 04 Sawahan</div>
          <div>0271-740634/0271-740634</div>
        </div>
        <div class="hal">Hal : 1 / 1</div>
      </div>

      <div class="doc-title">
        V O U C H E R &nbsp;&nbsp; P E M B A Y A R A N
      </div>

      <!-- ── Info Header ── -->
      <div class="info-block">
        <table class="info-tbl">
          <tr>
            <td class="lbl">Nomor</td>
            <td class="sep">:</td>
            <td class="val mono">{{ hdr.vou_nomor }}</td>
            <td style="width: 40px"></td>
            <td class="lbl">Supplier</td>
            <td class="sep">:</td>
            <td class="val">{{ hdr.sup_nama }}</td>
          </tr>
          <tr>
            <td class="lbl">Tanggal</td>
            <td class="sep">:</td>
            <td class="val">{{ hdr.vou_tanggal }}</td>
            <td></td>
            <td class="lbl">No Rek</td>
            <td class="sep">:</td>
            <td class="val mono">{{ hdr.sup_rekening }}</td>
          </tr>
          <tr>
            <td class="lbl">Nomor Pajak</td>
            <td class="sep">:</td>
            <td class="val">{{ hdr.vou_nomor_pajak || "" }}</td>
            <td></td>
            <td class="lbl">Bank</td>
            <td class="sep">:</td>
            <td class="val">{{ hdr.sup_bank }}</td>
          </tr>
          <tr>
            <td class="lbl">Keterangan</td>
            <td class="sep">:</td>
            <td class="val">{{ hdr.vou_keterangan || "" }}</td>
            <td></td>
            <td class="lbl">An/Cabang</td>
            <td class="sep">:</td>
            <td class="val">{{ hdr.sup_atasnama }} - {{ hdr.sup_cabang }}</td>
          </tr>
        </table>
      </div>

      <!-- ── Tabel Detail ── -->
      <table class="detail-tbl">
        <thead>
          <tr>
            <th style="width: 28px">No</th>
            <th style="width: 40px">Tipe</th>
            <th style="min-width: 130px">Nota</th>
            <th style="min-width: 130px">Nomor PO</th>
            <th style="width: 90px; text-align: right">Sub Total</th>
            <th style="width: 40px; text-align: right">Bs</th>
            <th style="width: 50px; text-align: right">Tarif<br />Bs</th>
            <th style="width: 70px; text-align: right">Nilai BS</th>
            <th style="width: 90px; text-align: right">Total</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td class="tc">{{ idx + 1 }}</td>
            <td>{{ r.voud_type }}</td>
            <td class="mono">{{ r.voud_nota }}</td>
            <td class="mono">{{ r.nomor_po || "-" }}</td>
            <td class="tr">{{ fmt(r.voud_total) }}</td>
            <td class="tr">{{ fmt(r.voud_bs) }}</td>
            <td class="tr">{{ fmt(r.voud_tarifbs) }}</td>
            <td class="tr">{{ fmt(r.nilai_bs) }}</td>
            <td class="tr fw">{{ fmt(r.total_baris) }}</td>
            <td>{{ r.pojh_keterangan }}</td>
          </tr>
        </tbody>
      </table>

      <!-- ── Footer ── -->
      <div class="footer">
        <div class="footer-left">
          <div class="footer-lbl">Dibuat Oleh</div>
          <div class="footer-user">
            {{ hdr.user_create }} &nbsp;&nbsp; {{ hdr.date_create }}
          </div>
        </div>
        <div class="footer-right">
          <div class="footer-row">
            <span>Total</span>
            <span class="footer-val">{{ fmt(grandNet) }}</span>
          </div>
          <div class="footer-row">
            <span>Bahan Tambahan</span>
            <span class="footer-val">{{ fmt(bahanTambahan) }}</span>
          </div>
          <div v-if="disc" class="footer-row">
            <span>Discount</span>
            <span class="footer-val">{{ fmt(disc) }}</span>
          </div>
          <div class="footer-row grand">
            <span>Grand Total</span>
            <span class="footer-val">{{ fmt(grandTotal) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}

.print-page {
  font-family: "Courier New", Courier, monospace;
  font-size: 11px;
  color: #000;
  background: white;
  padding: 24px 30px;
  max-width: 900px;
  margin: 0 auto;
  min-height: 100vh;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  font-size: 13px;
  color: #555;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}
.company-name {
  font-weight: bold;
  font-size: 12px;
}
.hal {
  font-size: 11px;
}

.doc-title {
  text-align: center;
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 1px;
  margin: 8px 0 10px;
  text-decoration: underline;
}

/* Info block */
.info-block {
  margin-bottom: 10px;
}
.info-tbl {
  border-collapse: collapse;
  font-size: 11px;
}
.info-tbl td {
  padding: 1px 4px;
  vertical-align: top;
}
.info-tbl .lbl {
  font-weight: normal;
  white-space: nowrap;
}
.info-tbl .sep {
  padding: 1px 2px;
}
.info-tbl .val {
  white-space: nowrap;
}

/* Detail table */
.detail-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  border: 1px solid #000;
  margin-bottom: 12px;
}
.detail-tbl th {
  border: 1px solid #000;
  padding: 3px 5px;
  text-align: left;
  font-weight: bold;
  background: white;
  white-space: nowrap;
  vertical-align: bottom;
}
.detail-tbl td {
  border: 0;
  border-bottom: 1px solid #ddd;
  padding: 2px 5px;
  vertical-align: top;
}

/* Footer */
.footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-top: 1px solid #000;
  padding-top: 8px;
  margin-top: 4px;
}
.footer-left {
  font-size: 11px;
}
.footer-lbl {
  margin-bottom: 20px;
}
.footer-user {
  font-size: 11px;
}
.footer-right {
  font-size: 11px;
  min-width: 240px;
}
.footer-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}
.footer-val {
  font-variant-numeric: tabular-nums;
  font-weight: normal;
}
.footer-row.grand .footer-val {
  font-weight: bold;
}

/* Utilities */
.tc {
  text-align: center;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.fw {
  font-weight: bold;
}
.mono {
  font-family: "Courier New", monospace;
}

/* Print */
@media print {
  .print-page {
    padding: 10px 15px;
  }
  @page {
    margin: 10mm;
  }
}
</style>
