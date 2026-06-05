<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { IconReceipt2, IconPrinter, IconCheck } from "@tabler/icons-vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { uangMukaApi, type UangMuka } from "@/api/transaksi/uangMukaApi";
import { exportUangMuka } from "@/utils/exportExcel";

const MENU_ID = "21";
const toast = useToast();
const router = useRouter();

// ── Default filter: awal bulan s.d. hari ini ─────────────────────────
const STORAGE_KEY = "finance_periode_uang_muka";

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

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
const savedPeriode = getSavedPeriode();

const filterState = ref({
  startDate: savedPeriode?.startDate ?? getLocal(firstDay),
  endDate: savedPeriode?.endDate ?? getLocal(today),
  cabang: "ALL",
});

// Simpan setiap kali startDate atau endDate berubah
watch(
  () => [filterState.value.startDate, filterState.value.endDate],
  ([s, e]) => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ startDate: s, endDate: e }),
      );
    } catch {
      /* silent */
    }
  },
);

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
} = useBrowse<UangMuka>({
  menuId: MENU_ID,
  fetchApi: () =>
    uangMukaApi.getBrowse(
      filterState.value.startDate,
      filterState.value.endDate,
      filterState.value.cabang,
    ),
});

const headers = [
  { title: "Nomor", key: "Nomor", minWidth: "130px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Jenis", key: "Jenis", width: "70px", align: "center" },
  { title: "Account", key: "NamaAccount", minWidth: "180px" },
  { title: "PJH", key: "Pjh", minWidth: "120px" },
  { title: "Nota", key: "Nota", minWidth: "100px" },
  { title: "Penerima", key: "Penerima", minWidth: "150px" },
  { title: "Nominal", key: "Nominal", width: "140px", align: "end" },
  { title: "Terpakai", key: "Terpakai", width: "140px", align: "end" },
  { title: "Sisa", key: "Sisa", width: "140px", align: "end" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
  { title: "No Bukti", key: "NoBukti", minWidth: "120px" },
  { title: "Selesai", key: "Selesai", width: "90px", align: "center" },
  { title: "Closed", key: "Closed", width: "85px", align: "center" },
];

// ── Row color — Belum = pink seperti Delphi ────────────────────────
const rowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Selesai === "Belum")
    return { style: "color:#c62828;font-weight:600" };
  return {};
};

const fmt2 = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
const fmtDate = (v: string) => {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}-${m}-${y}`;
};

// ── Aksi ─────────────────────────────────────────────────────────────
const onAdd = () => router.push("/transaksi/uang-muka/create");

const onEdit = (item: UangMuka) => {
  if (item.Selesai === "Sudah") {
    toast.error("Sudah ada penyelesaian. Tidak bisa diubah.");
    return;
  }
  router.push(`/transaksi/uang-muka/edit/${encodeURIComponent(item.Nomor)}`);
};

const onDelete = async (item: UangMuka) => {
  if (item.Selesai === "Sudah") {
    toast.error("Sudah ada penyelesaian. Tidak bisa dihapus.");
    return;
  }
  try {
    await uangMukaApi.delete(item.Nomor);
    toast.success("Berhasil dihapus.");
    await fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal menghapus.");
  }
};

const onCetakKasbon = () => {
  if (!selected.value.length) return;
  window.open(
    `/transaksi/uang-muka/print/${encodeURIComponent(selected.value[0].Nomor)}`,
    "_blank",
  );
};

const onPenyelesaian = () => {
  if (!selected.value.length) return;
  const item = selected.value[0];
  if (item.Closed === "Sudah") {
    toast.error("Transaksi sudah diclose. Tidak bisa diubah.");
    return;
  }
  router.push(`/transaksi/uang-muka/selesai/${encodeURIComponent(item.Nomor)}`);
};

const onCetakSelesai = () => {
  if (!selected.value.length) return;
  const item = selected.value[0];
  if (item.Selesai === "Belum") {
    toast.error("Belum ada penyelesaian.");
    return;
  }
  window.open(
    `/transaksi/uang-muka/print-selesai/${encodeURIComponent(item.Nomor)}`,
    "_blank",
  );
};
</script>

<template>
  <BaseBrowse
    title="Uang Muka / Kasbon"
    :menu-id="MENU_ID"
    :icon="IconReceipt2"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    :selected="selected"
    @update:selected="selected = $event"
    item-value="Nomor"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :export-fn="
      () =>
        exportUangMuka(items ?? [], filterState.startDate, filterState.endDate)
    "
    :row-props-fn="rowProps"
    search-placeholder="Cari kasbon..."
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    :fixed-layout="false"
  >
    <!-- Filter tanggal -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>
    </template>

    <!-- Tombol extra -->
    <template #extra-actions="{ selected: sel }">
      <v-btn
        size="small"
        color="grey-darken-2"
        :disabled="!sel.length"
        @click="onCetakKasbon"
      >
        <template #prepend
          ><IconPrinter :size="14" :stroke-width="1.8"
        /></template>
        Cetak Kasbon
      </v-btn>
      <v-btn
        size="small"
        color="teal-darken-1"
        :disabled="!sel.length"
        @click="onPenyelesaian"
      >
        <template #prepend><IconCheck :size="14" :stroke-width="2" /></template>
        Penyelesaian
      </v-btn>
      <v-btn
        size="small"
        color="indigo-darken-2"
        :disabled="!sel.length"
        @click="onCetakSelesai"
      >
        <template #prepend
          ><IconPrinter :size="14" :stroke-width="1.8"
        /></template>
        Cetak Selesai
      </v-btn>
    </template>

    <!-- Format kolom -->
    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>
    <template #item.Nominal="{ item }">{{ fmt2(item.Nominal) }}</template>
    <template #item.Terpakai="{ item }">{{ fmt2(item.Terpakai) }}</template>
    <template #item.Sisa="{ item }">
      <span
        :style="{
          color: item.Sisa < 0 ? '#c62828' : 'inherit',
          fontWeight: item.Sisa < 0 ? 700 : 'normal',
        }"
      >
        {{ fmt2(item.Sisa) }}
      </span>
    </template>
    <template #item.Selesai="{ item }">
      <span
        :style="{
          background: item.Selesai === 'Sudah' ? '#e8f5e9' : '#ffebee',
          color: item.Selesai === 'Sudah' ? '#2e7d32' : '#c62828',
          padding: '1px 8px',
          borderRadius: '3px',
          fontSize: '11px',
          fontWeight: 600,
        }"
        >{{ item.Selesai }}</span
      >
    </template>
    <template #item.Closed="{ item }">
      <span
        :style="{
          background: item.Closed === 'Sudah' ? '#e8f5e9' : '#fff8e1',
          color: item.Closed === 'Sudah' ? '#2e7d32' : '#f57c00',
          padding: '1px 8px',
          borderRadius: '3px',
          fontSize: '11px',
          fontWeight: 600,
        }"
        >{{ item.Closed }}</span
      >
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.filter-sep {
  font-size: 11px;
  color: #888;
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.date-inp:focus {
  border-color: #2e7d32;
}
</style>
