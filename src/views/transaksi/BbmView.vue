<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { bbmApi, type BbmRow, type BbmDetailRow } from "@/api/transaksi/bbmApi";
import { exportBbm, exportBbmDetail } from "@/utils/exportExcel";
import {
  IconBuildingBank,
  IconPrinter,
  IconFileSpreadsheet,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const MENU_ID = "25";

// ── Periode ───────────────────────────────────────────────────────────
const STORAGE_KEY = "finance_periode_bbm";

const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const getSavedPeriode = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.startDate && saved?.endDate) return saved;
  } catch {
    /* silent */
  }
  return null;
};

const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
const savedPeriode = getSavedPeriode();

const startDate = ref(savedPeriode?.startDate ?? getLocal(firstDay));
const endDate = ref(savedPeriode?.endDate ?? getLocal(now));

watch([startDate, endDate], ([s, e]) => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startDate: s, endDate: e }),
    );
  } catch {
    /* silent */
  }
});

// ── Data ──────────────────────────────────────────────────────────────
const items = ref<BbmRow[]>([]);
const detailItems = ref<BbmDetailRow[]>([]);
const isLoading = ref(false);
const selected = ref<BbmRow[]>([]);
const expanded = ref<any[]>([]);

const selectedItem = computed(() => selected.value[0] ?? null);

// ── Headers ───────────────────────────────────────────────────────────
const headers = [
  { key: "Nomor", title: "Nomor", width: "170px" },
  {
    key: "Tanggal",
    title: "Tanggal",
    width: "100px",
    align: "center" as const,
  },
  { key: "Tipe", title: "Tipe", width: "60px", align: "center" as const },
  { key: "Account", title: "Account", width: "200px" },
  { key: "Rekening", title: "Rekening", width: "130px" },
  { key: "DiterimaDari", title: "Diterima Dari", width: "140px" },
  { key: "Nota", title: "Nota", width: "80px" },
  { key: "Keterangan", title: "Keterangan", width: "220px" },
  { key: "Nominal", title: "Nominal", width: "130px", align: "right" as const },
  { key: "Kasbon", title: "Kasbon", width: "160px" },
  { key: "Closed", title: "Closed", width: "70px", align: "center" as const },
];

// ── Load ──────────────────────────────────────────────────────────────
const loadData = async () => {
  isLoading.value = true;
  selected.value = [];
  expanded.value = [];
  try {
    const [master, detail] = await Promise.all([
      bbmApi.getBrowse(startDate.value, endDate.value),
      bbmApi.getBrowseDetail(startDate.value, endDate.value),
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
const validateAction = (action: "ubah" | "hapus" | "cetak"): boolean => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return false;
  }
  const r = selectedItem.value;
  if (r.Kasbon && action === "ubah") {
    toast.warning("BBM terbentuk otomatis dari kasbon. Tidak bisa diubah.");
    return false;
  }
  if (r.Kasbon && action === "hapus") {
    toast.warning("BBM terbentuk otomatis dari kasbon. Tidak bisa dihapus.");
    return false;
  }
  if (r.Kasbon && action === "cetak") {
    toast.warning("BBM dari kasbon. Silahkan cetak di Penyelesaian Kasbon.");
    return false;
  }
  if (r.Closed === "Sudah" && action !== "cetak") {
    toast.warning("Transaksi sudah diclose. Tidak bisa diubah/dihapus.");
    return false;
  }
  return true;
};

// ── Aksi ──────────────────────────────────────────────────────────────
const onBaru = () => router.push({ name: "BbmCreate" });
const onUbah = () => {
  if (!validateAction("ubah")) return;
  router.push({
    name: "BbmEdit",
    params: { nomor: encodeURIComponent(selectedItem.value!.Nomor) },
  });
};
const onCetak = () => {
  if (!validateAction("cetak")) return;
  window.open(
    `/transaksi/bbm/print/${encodeURIComponent(selectedItem.value!.Nomor)}`,
    "_blank",
  );
};

// ── Hapus ─────────────────────────────────────────────────────────────
const showDeleteDialog = ref(false);
const isDeleting = ref(false);

const onHapus = () => {
  if (!validateAction("hapus")) return;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedItem.value) return;
  isDeleting.value = true;
  try {
    await bbmApi.delete(selectedItem.value.Nomor);
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
const doExport = () => exportBbm(items.value, startDate.value, endDate.value);
const doExportDetail = () =>
  exportBbmDetail(detailItems.value, startDate.value, endDate.value);

// ── Row props ─────────────────────────────────────────────────────────
const rowPropsFn = (data: any) => {
  const row = data.item?.raw || data.item;
  let cls = "";
  if (row.Kasbon) cls += " row-kasbon";
  if (row.Closed === "Sudah") cls += " row-closed";
  return { class: cls.trim() };
};

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
</script>

<template>
  <BaseBrowse
    title="Bukti Bank Masuk (BBM)"
    :icon="IconBuildingBank"
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
    summary-key="Nominal"
    summary-label="Total Nominal"
    @refresh="loadData"
  >
    <!-- ── Filter periode ── -->
    <template #filter-left>
      <div class="d-flex align-center gap-2 flex-wrap">
        <span class="filter-lbl">Periode</span>
        <input v-model="startDate" type="date" class="date-inp" />
        <span class="filter-lbl">s/d</span>
        <input v-model="endDate" type="date" class="date-inp" />
        <v-btn size="small" color="primary" variant="tonal" @click="loadData">
          Tampilkan
        </v-btn>
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
    </template>

    <!-- ── Custom cell: Nominal ── -->
    <template #item.Nominal="{ value }">
      <span style="font-variant-numeric: tabular-nums">{{
        fmt(Number(value))
      }}</span>
    </template>

    <!-- ── Custom cell: Closed badge ── -->
    <template #item.Closed="{ value }">
      <span :class="value === 'Sudah' ? 'badge-closed' : 'badge-open'">{{
        value
      }}</span>
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div class="detail-wrap">
        <table class="detail-tbl">
          <thead>
            <tr>
              <th style="width: 40px">No</th>
              <th style="min-width: 280px">Uraian</th>
              <th style="width: 130px">Nominal</th>
              <th style="width: 100px">Account</th>
              <th style="min-width: 180px">Nama Account</th>
              <th style="min-width: 120px">Detail CC</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in getDetail(item.Nomor)" :key="d.No">
              <td class="tc">{{ d.No }}</td>
              <td>{{ d.Uraian }}</td>
              <td class="tr">{{ fmt(d.Nominal) }}</td>
              <td>{{ d.Account }}</td>
              <td>{{ d.NamaAccount }}</td>
              <td>{{ d.DetailCC }}</td>
            </tr>
            <tr v-if="!getDetail(item.Nomor).length">
              <td
                colspan="6"
                class="tc"
                style="color: #9e9e9e; font-style: italic; padding: 8px"
              >
                Tidak ada detail.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <!-- ── Dialog Hapus ── -->
  <v-dialog v-model="showDeleteDialog" max-width="400" persistent>
    <v-card rounded="lg">
      <v-card-title class="text-body-1 font-weight-bold pa-4"
        >Konfirmasi Hapus</v-card-title
      >
      <v-card-text class="pa-4 pt-0">
        Yakin ingin menghapus <strong>{{ selectedItem?.Nomor }}</strong
        >? <br /><small style="color: #c62828"
          >Jurnal otomatis terkait juga akan dihapus.</small
        >
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
.filter-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
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
.tc {
  text-align: center;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

:deep(.row-kasbon td) {
  color: #1565c0 !important;
  font-weight: 600;
}
:deep(.row-closed td) {
  color: #9e9e9e !important;
}

.badge-closed {
  background: #e0e0e0;
  color: #616161;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-open {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

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
  padding: 4px 8px;
  white-space: nowrap;
  text-align: left;
}
.detail-tbl td {
  padding: 3px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.detail-tbl tbody tr:hover td {
  background: rgba(46, 125, 50, 0.05);
}
</style>
