<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  pengajuanTransferApi,
  type PengajuanTransferRow,
  type PengajuanTransferDetailRow,
} from "@/api/transaksi/pengajuanTransferApi";
import {
  exportPengajuanTransfer,
  exportPengajuanTransferDetail,
  exportPengajuanTransferExcel,
} from "@/utils/exportExcel";
import {
  IconTransfer,
  IconPrinter,
  IconFileSpreadsheet,
  IconTableExport,
  IconCheck,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const MENU_ID = "28";

// ── Periode ───────────────────────────────────────────────────────────
const STORAGE_KEY = "finance_periode_pengajuan_transfer";

const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const getSavedPeriode = () => {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (s?.startDate && s?.endDate) return s;
  } catch {
    /* silent */
  }
  return null;
};

const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
const savedP = getSavedPeriode();

const startDate = ref(savedP?.startDate ?? getLocal(firstDay));
const endDate = ref(savedP?.endDate ?? getLocal(now));

watch([startDate, endDate], ([s, e]) => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startDate: s, endDate: e }),
    );
  } catch {
    /* silent */
  }
  loadData();
});

// ── Data ──────────────────────────────────────────────────────────────
const items = ref<PengajuanTransferRow[]>([]);
const detailItems = ref<PengajuanTransferDetailRow[]>([]);
const isLoading = ref(false);
const selected = ref<PengajuanTransferRow[]>([]);
const expanded = ref<any[]>([]);

const selectedItem = computed(() => selected.value[0] ?? null);

// ── Headers ───────────────────────────────────────────────────────────
const headers = [
  { key: "Nomor", title: "Nomor", width: "180px" },
  {
    key: "Tanggal",
    title: "Tanggal",
    width: "100px",
    align: "center" as const,
  },
  { key: "Account", title: "Account", width: "100px" },
  { key: "NoRekAsal", title: "No. Rek Asal", width: "130px" },
  { key: "NamaRekening", title: "Nama Rekening", width: "250px" },
  { key: "Status_", title: "Status", width: "80px", align: "center" as const },
];

// ── Load ──────────────────────────────────────────────────────────────
const loadData = async () => {
  isLoading.value = true;
  selected.value = [];
  expanded.value = [];
  try {
    const [master, detail] = await Promise.all([
      pengajuanTransferApi.getBrowse(startDate.value, endDate.value),
      pengajuanTransferApi.getBrowseDetail(startDate.value, endDate.value),
    ]);
    items.value = master;
    detailItems.value = detail;
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

const getDetail = (nomor: string) =>
  detailItems.value.filter((d) => d.Nomor === nomor);

// ── Validasi ──────────────────────────────────────────────────────────
const requireSelected = (): boolean => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return false;
  }
  return true;
};

// ── Aksi ──────────────────────────────────────────────────────────────
const onBaru = () => router.push({ name: "PengajuanTransferCreate" });

const onUbah = () => {
  if (!requireSelected()) return;
  router.push({
    name: "PengajuanTransferEdit",
    params: { nomor: encodeURIComponent(selectedItem.value!.Nomor) },
  });
};

const onCetak = () => {
  if (!requireSelected()) return;
  window.open(
    `/transaksi/pengajuan-transfer/print/${encodeURIComponent(selectedItem.value!.Nomor)}`,
    "_blank",
  );
};

const onRealisasi = () => {
  if (!requireSelected()) return;
  router.push({
    name: "PengajuanTransferRealisasi",
    params: { nomor: encodeURIComponent(selectedItem.value!.Nomor) },
  });
};

// ── Excel export per nomor (Delphi btnExcel) ──────────────────────────
const onExcel = () => {
  if (!requireSelected()) return;
  const row = selectedItem.value!;
  const detail = getDetail(row.Nomor);
  exportPengajuanTransferExcel(
    row.Nomor,
    row.Tanggal,
    row.Account,
    row.NoRekAsal,
    row.NamaRekening,
    detail,
    authStore.userKode || "ADMIN",
  );
};

// ── Hapus ─────────────────────────────────────────────────────────────
const showDeleteDialog = ref(false);
const deleteWarning = ref(false); // true jika status != BELUM
const isDeleting = ref(false);

const onHapus = async () => {
  if (!requireSelected()) return;
  const row = selectedItem.value!;
  // Delphi: cek status untuk warning extra
  deleteWarning.value = row.Status_ !== "BELUM";
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedItem.value) return;
  isDeleting.value = true;
  try {
    await pengajuanTransferApi.delete(selectedItem.value.Nomor);
    toast.success("Data berhasil dihapus.");
    showDeleteDialog.value = false;
    await loadData();
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal menghapus.");
  } finally {
    isDeleting.value = false;
  }
};

// ── Export ────────────────────────────────────────────────────────────
const doExport = () =>
  exportPengajuanTransfer(items.value, startDate.value, endDate.value);
const doExportDetail = () =>
  exportPengajuanTransferDetail(
    detailItems.value,
    startDate.value,
    endDate.value,
  );

// ── Row props — tiru pola UangMukaView pakai style inline ─────────────
const rowPropsFn = (data: any) => {
  const row = data?.item?.raw ?? data?.item ?? data;
  const status = row?.Status_ ?? "";

  if (status === "BELUM") return { style: "color:#cc0000;font-weight:600" };
  if (status === "PROSES") return { style: "color:#1565c0;font-weight:600" };
  return {};
};

// ── Detail row props — KetBatal=merah, TglRealisasi=biru ─────────────
const detailRowClass = (d: PengajuanTransferDetailRow) => {
  if (d.KetBatal) return "det-batal";
  if (d.TglRealisasi) return "det-realisasi";
  return "";
};

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
</script>

<template>
  <BaseBrowse
    title="Pengajuan Transfer"
    :icon="IconTransfer"
    :menu-id="MENU_ID"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    :fixed-layout="false"
    :show-expand="true"
    :expanded="expanded"
    @update:expanded="expanded = $event"
    item-value="Nomor"
    v-model:selected="selected"
    :row-props-fn="rowPropsFn"
    @refresh="loadData"
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-lbl">Periode</span>
        <input v-model="startDate" type="date" class="date-inp" />
        <span class="filter-sep">s/d</span>
        <input v-model="endDate" type="date" class="date-inp" />
      </div>
    </template>

    <!-- ── Legend keterangan warna ── -->
    <template #filter-right>
      <div class="legend-wrap">
        <span class="legend-dot" style="background: #cc0000"></span>
        <span class="legend-lbl">Belum</span>
        <span class="legend-dot" style="background: #1565c0"></span>
        <span class="legend-lbl">Proses</span>
        <span class="legend-dot" style="background: #212121"></span>
        <span class="legend-lbl">Close</span>
      </div>
    </template>

    <!-- ── Tombol aksi ── -->
    <template #extra-actions>
      <v-btn size="small" color="primary" variant="flat" @click="onBaru"
        >+ Baru</v-btn
      >
      <v-btn
        size="small"
        variant="outlined"
        :disabled="!selectedItem"
        @click="onUbah"
        >Ubah</v-btn
      >
      <v-btn
        size="small"
        color="error"
        variant="tonal"
        :disabled="!selectedItem"
        @click="onHapus"
        >Hapus</v-btn
      >
      <v-btn
        size="small"
        variant="tonal"
        :disabled="!selectedItem"
        @click="onCetak"
      >
        <template #prepend
          ><IconPrinter :size="13" :stroke-width="1.8"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        size="small"
        variant="tonal"
        color="teal-darken-1"
        :disabled="!selectedItem"
        @click="onExcel"
      >
        <template #prepend
          ><IconTableExport :size="13" :stroke-width="1.8"
        /></template>
        Excel
      </v-btn>
      <v-btn size="small" variant="tonal" color="success" @click="doExport">
        <template #prepend
          ><IconFileSpreadsheet :size="13" :stroke-width="1.8"
        /></template>
        Export
      </v-btn>
      <v-btn size="small" variant="tonal" color="info" @click="doExportDetail">
        <template #prepend
          ><IconFileSpreadsheet :size="13" :stroke-width="1.8"
        /></template>
        Export Detail
      </v-btn>
      <v-btn
        size="small"
        color="indigo-darken-1"
        variant="flat"
        :disabled="!selectedItem"
        @click="onRealisasi"
      >
        <template #prepend><IconCheck :size="13" :stroke-width="2" /></template>
        Realisasi
      </v-btn>
    </template>

    <!-- ── Custom cell: Status badge ── -->
    <template #item.Status_="{ value }">
      <span
        :class="{
          'badge-belum': value === 'BELUM',
          'badge-proses': value === 'PROSES',
          'badge-close': value === 'CLOSE',
        }"
        >{{ value }}</span
      >
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div class="detail-wrap">
        <table class="detail-tbl">
          <thead>
            <tr>
              <th style="width: 80px">Kode Sup</th>
              <th style="min-width: 150px">Nama Supplier</th>
              <th style="width: 80px">Bank</th>
              <th style="min-width: 120px">Atas Nama</th>
              <th style="width: 120px">Rekening</th>
              <th style="width: 100px">No Transaksi</th>
              <th style="width: 110px">Nominal</th>
              <th style="min-width: 160px">Keterangan</th>
              <th style="width: 100px">Tgl Realisasi</th>
              <th style="width: 90px">Account</th>
              <th style="min-width: 150px">Nama Account</th>
              <th style="min-width: 100px">CC Nama</th>
              <th style="min-width: 100px">DC Nama</th>
              <th style="width: 130px">Jurnal</th>
              <th style="min-width: 130px">Ket Batal</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, idx) in getDetail(item.Nomor)"
              :key="idx"
              :class="detailRowClass(d)"
            >
              <td>{{ d.KodeSup || "-" }}</td>
              <td>{{ d.NamaSupplier }}</td>
              <td>{{ d.Bank }}</td>
              <td>{{ d.AtasNama }}</td>
              <td>{{ d.Rekening }}</td>
              <td>{{ d.NoTransaksi || "-" }}</td>
              <td class="tr">{{ fmt(d.Nominal) }}</td>
              <td>{{ d.Keterangan }}</td>
              <td class="tc">{{ d.TglRealisasi || "-" }}</td>
              <td>{{ d.Account || "-" }}</td>
              <td>{{ d.NamaAccount || "-" }}</td>
              <td>{{ d.CcNama || "-" }}</td>
              <td>{{ d.DcNama || "-" }}</td>
              <td>{{ d.Jurnal || "-" }}</td>
              <td>{{ d.KetBatal || "-" }}</td>
            </tr>
            <tr v-if="!getDetail(item.Nomor).length">
              <td
                colspan="15"
                class="tc"
                style="color: #9e9e9e; font-style: italic; padding: 8px"
              >
                Tidak ada detail.
              </td>
            </tr>
          </tbody>
          <!-- Footer total nominal -->
          <tfoot v-if="getDetail(item.Nomor).length">
            <tr class="detail-foot">
              <td colspan="6" class="tr detail-foot-lbl">Total</td>
              <td class="tr detail-foot-val">
                {{
                  fmt(
                    getDetail(item.Nomor).reduce(
                      (s, d) => s + Number(d.Nominal),
                      0,
                    ),
                  )
                }}
              </td>
              <td colspan="8"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <!-- ── Dialog Hapus ── -->
  <v-dialog v-model="showDeleteDialog" max-width="440" persistent>
    <v-card rounded="lg">
      <v-card-title class="text-body-1 font-weight-bold pa-4">
        Konfirmasi Hapus
      </v-card-title>
      <v-card-text class="pa-4 pt-0" style="font-size: 12px">
        <template v-if="deleteWarning">
          <div class="delete-warning-box">
            ⚠️ Pengajuan ini sudah di Realisasi. Jika dihapus, Jurnal akan ikut
            dihapus.
          </div>
        </template>
        Yakin ingin menghapus <strong>{{ selectedItem?.Nomor }}</strong
        >?
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="showDeleteDialog = false">Batal</v-btn>
        <v-btn
          color="error"
          variant="flat"
          :loading="isDeleting"
          @click="confirmDelete"
        >
          Ya, Hapus
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap; /* Mencegah overflow jika layar menyempit */
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
  white-space: nowrap;
}
.date-inp {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.date-inp:focus {
  border-color: #2e7d32;
}

/* Legend */
.legend-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: nowrap;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-lbl {
  font-size: 11px;
  color: #374151;
  margin-right: 6px;
}

/* Row colors */

/* Status badge */
.badge-belum {
  background: #ffebee;
  color: #cc0000;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-proses {
  background: #e3f2fd;
  color: #1565c0;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-close {
  background: #f5f5f5;
  color: #212121;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

/* Detail table */
.detail-wrap {
  padding: 4px 0;
}
.detail-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.detail-tbl thead tr {
  background: #1b5e20;
}
.detail-tbl th {
  color: white;
  font-weight: 700;
  padding: 4px 6px;
  white-space: nowrap;
  text-align: left;
}
.detail-tbl td {
  padding: 3px 6px;
  border-bottom: 1px solid #f0f0f0;
}
.detail-tbl tbody tr:hover td {
  background: rgba(46, 125, 50, 0.05);
}
/* Detail row colors — Delphi: KetBatal=merah, TglRealisasi=biru */
.det-batal td {
  color: #cc0000 !important;
}
.det-realisasi td {
  color: #1565c0 !important;
}
.detail-foot td {
  background: #f0fdf4;
  border-top: 2px solid #2e7d32;
  padding: 4px 6px;
}
.detail-foot-lbl {
  font-size: 11px;
  font-weight: 700;
  color: #374151;
}
.detail-foot-val {
  font-size: 11px;
  font-weight: 700;
  color: #1b5e20;
  font-variant-numeric: tabular-nums;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.delete-warning-box {
  background: #fff3e0;
  border: 1px solid #ff9800;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #e65100;
  margin-bottom: 10px;
}
</style>
