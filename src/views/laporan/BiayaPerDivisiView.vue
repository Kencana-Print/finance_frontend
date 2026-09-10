<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import { IconFileText, IconFileExport, IconPrinter } from "@tabler/icons-vue";
import {
  biayaPerDivisiApi,
  type DivisiOption,
  type BiayaPerDivisiData,
} from "@/api/laporan/biayaPerDivisiApi";
import { exportBiayaPerDivisi } from "@/utils/exportExcel";

const toast = useToast();

// ── Filter ────────────────────────────────────────────────────────────
const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

const startDate = ref(getLocal(firstDay));
const endDate = ref(getLocal(now));
const cckode = ref<number | string>("");

const divisiOptions = ref<DivisiOption[]>([]);
const reportData = ref<BiayaPerDivisiData | null>(null);
const isLoading = ref(false);
const isLoadingDivisi = ref(false);

// ── Load divisi options ───────────────────────────────────────────────
onMounted(async () => {
  isLoadingDivisi.value = true;
  try {
    divisiOptions.value = await biayaPerDivisiApi.getListDivisi();
  } catch (e: any) {
    if (!isAuthExpiredError(e)) toast.error("Gagal memuat daftar divisi.");
  } finally {
    isLoadingDivisi.value = false;
  }
});

// ── Load report ───────────────────────────────────────────────────────
const loadReport = async () => {
  if (!cckode.value) {
    toast.warning("Pilih Divisi terlebih dahulu.");
    return;
  }
  isLoading.value = true;
  try {
    reportData.value = await biayaPerDivisiApi.getBiayaPerDivisi({
      cckode: cckode.value,
      startDate: startDate.value,
      endDate: endDate.value,
    });
  } catch (e: any) {
    if (!isAuthExpiredError(e))
      toast.error(e.response?.data?.message ?? "Gagal memuat laporan.");
  } finally {
    isLoading.value = false;
  }
};

// ── Formatting ────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
const fmtDate = (v: string) => {
  if (!v) return "-";
  const [y, m, d] = v.split("-");
  return `${d}-${m}-${y}`;
};

// ── Export & Print ───────────────────────────────────────────────────
const doExport = async () => {
  if (!reportData.value) return toast.warning("Tampilkan laporan dahulu.");
  await exportBiayaPerDivisi(reportData.value, startDate.value, endDate.value);
};

const doPrint = () => {
  if (!reportData.value) return toast.warning("Tampilkan laporan dahulu.");
  window.print();
};

const hasData = computed(() => (reportData.value?.akunList.length ?? 0) > 0);
</script>

<template>
  <div class="page-wrap">
    <!-- ── Header ── -->
    <div class="page-header">
      <div class="d-flex align-center gap-2">
        <IconFileText :size="18" :stroke-width="1.8" color="#2e7d32" />
        <h2 class="page-title">Laporan Biaya per Divisi</h2>
      </div>
      <div class="d-flex align-center gap-2 no-print">
        <v-btn
          size="small"
          variant="tonal"
          color="grey-darken-3"
          :disabled="!hasData"
          @click="doPrint"
        >
          <template #prepend
            ><IconPrinter :size="14" :stroke-width="1.8"
          /></template>
          Cetak
        </v-btn>
        <v-btn
          size="small"
          variant="tonal"
          color="success"
          :disabled="!hasData"
          @click="doExport"
        >
          <template #prepend
            ><IconFileExport :size="14" :stroke-width="1.8"
          /></template>
          Export
        </v-btn>
      </div>
    </div>

    <!-- ── Filter bar ── -->
    <div class="filter-bar no-print">
      <div class="filter-group">
        <span class="filter-lbl">Divisi</span>
        <select
          v-model="cckode"
          class="filter-select"
          :disabled="isLoadingDivisi"
        >
          <option value="">— Pilih Divisi —</option>
          <option v-for="d in divisiOptions" :key="d.kode" :value="d.kode">
            [{{ d.kode }}] {{ d.nama }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <span class="filter-lbl">Periode</span>
        <input v-model="startDate" type="date" class="date-inp" />
        <span class="filter-sep">s/d</span>
        <input v-model="endDate" type="date" class="date-inp" />
      </div>
      <v-btn
        size="small"
        color="primary"
        variant="flat"
        :loading="isLoading"
        @click="loadReport"
      >
        Tampilkan
      </v-btn>
    </div>

    <!-- ── Report ── -->
    <div v-if="isLoading" class="loading-wrap">
      <v-progress-circular indeterminate color="primary" size="32" />
    </div>

    <div v-else-if="reportData" class="report-wrap" id="print-area">
      <div class="report-title">
        DIVISI : {{ reportData.divisi.nama.toUpperCase() }}
      </div>
      <div class="report-subtitle">
        Periode {{ fmtDate(startDate) }} s/d {{ fmtDate(endDate) }}
      </div>

      <div v-if="!hasData" class="empty-state">
        Tidak ada data biaya untuk divisi dan periode ini.
      </div>

      <table v-else class="report-table">
        <thead>
          <tr>
            <th class="col-akun">AKUN BIAYA</th>
            <th class="col-pengajuan">No. Pengajuan</th>
            <th class="col-tgl">Tanggal</th>
            <th class="col-bkk">No. BKK/BBK</th>
            <th class="col-tgl">Tanggal</th>
            <th class="col-dcc">Detail CC</th>
            <th class="col-nominal">Nominal</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="akun in reportData.akunList" :key="akun.rekKode">
            <!-- Header akun -->
            <tr class="row-akun-header">
              <td class="nama-akun">{{ akun.namaAkun }}</td>
              <td colspan="5"></td>
              <td class="tr total-nominal">{{ fmt(akun.totalNominal) }}</td>
            </tr>
            <!-- Detail rows -->
            <tr v-for="(d, i) in akun.detail" :key="i" class="row-detail">
              <td class="detail-label">{{ d.uraian || "-" }}</td>
              <td>{{ d.noPengajuan || "-" }}</td>
              <td class="tc">{{ fmtDate(d.tanggalPengajuan) }}</td>
              <td>{{ d.noBkkBbk }}</td>
              <td class="tc">{{ fmtDate(d.tanggalBkkBbk) }}</td>
              <td>{{ d.detailCC || "-" }}</td>
              <td class="tr">{{ fmt(d.nominal) }}</td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr class="row-grand-total">
            <td colspan="6" class="tr">GRAND TOTAL</td>
            <td class="tr">{{ fmt(reportData.grandTotal) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-else class="empty-state">
      Pilih Divisi dan Periode, lalu klik "Tampilkan".
    </div>
  </div>
</template>

<style scoped>
.page-wrap {
  padding: 16px;
  background: #f1f8f1;
  min-height: 100%;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.page-title {
  font-size: 15px;
  font-weight: 700;
  color: #1b1b1b;
  margin: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  background: white;
  border: 1px solid #c8e6c9;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}
.filter-sep {
  font-size: 12px;
  color: #9ca3af;
}
.filter-select,
.date-inp {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  background: white;
}
.filter-select:focus,
.date-inp:focus {
  border-color: #2e7d32;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
.empty-state {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 40px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.report-wrap {
  background: white;
  border: 1px solid #c8e6c9;
  border-radius: 8px;
  padding: 20px 24px;
}
.report-title {
  font-size: 13px;
  font-weight: 700;
  color: #1b1b1b;
  margin-bottom: 2px;
}
.report-subtitle {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 14px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.report-table th {
  text-align: left;
  font-size: 10px;
  font-weight: 700;
  color: #374151;
  padding: 6px 6px;
  border-bottom: 2px solid #2e7d32;
  white-space: nowrap;
}
.col-akun {
  width: 26%;
}
.col-pengajuan {
  width: 13%;
}
.col-tgl {
  width: 9%;
}
.col-bkk {
  width: 13%;
}
.col-dcc {
  width: 14%;
}
.col-nominal {
  width: 12%;
  text-align: right;
}

.row-akun-header td {
  font-weight: 700;
  color: #1b5e20;
  padding: 8px 6px 4px;
  border-top: 1px solid #e0e0e0;
}
.nama-akun {
  text-transform: uppercase;
  font-size: 11px;
}
.total-nominal {
  color: #1b5e20;
  font-weight: 700;
}

.row-detail td {
  padding: 2px 6px;
  color: #374151;
  border-bottom: 1px solid #f5f5f5;
}
.detail-label {
  padding-left: 16px;
  color: #2e7d32;
}

.row-grand-total td {
  padding: 8px 6px;
  border-top: 2px solid #2e7d32;
  font-weight: 700;
  font-size: 12px;
  color: #1b5e20;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* ── Print styles ── */
@media print {
  @page {
    size: A4 landscape;
    margin: 10mm;
  }

  .no-print {
    display: none !important;
  }

  .page-wrap {
    padding: 0;
    background: white;
  }
  .report-wrap {
    border: none;
    padding: 0;
    width: 100%;
  }

  .report-table {
    width: 100% !important;
    table-layout: fixed;
    font-size: 9px;
  }
  .report-table th,
  .report-table td {
    padding: 3px 4px !important;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  /* Pastikan semua kolom kelihatan proporsional saat cetak */
  .col-akun {
    width: 20% !important;
  }
  .col-pengajuan {
    width: 12% !important;
  }
  .col-tgl {
    width: 9% !important;
  }
  .col-bkk {
    width: 13% !important;
  }
  .col-dcc {
    width: 13% !important;
  }
  .col-nominal {
    width: 11% !important;
  }

  .detail-label {
    padding-left: 10px !important;
    font-size: 8.5px;
  }
  .nama-akun {
    font-size: 9px;
  }

  /* Hindari baris/section terpotong di tengah halaman */
  .row-akun-header,
  .row-detail {
    break-inside: avoid;
  }
  thead {
    display: table-header-group; /* header tabel berulang tiap halaman */
  }
}
</style>
