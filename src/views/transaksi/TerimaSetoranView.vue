<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  terimaSetoranApi,
  type TerimaSetoranRow,
  type TerimaSetoranDetailRow,
  type CabangItem,
} from "@/api/transaksi/terimaSetoranApi";
import {
  exportTerimaSetoran,
  exportTerimaSetoranDetail,
} from "@/utils/exportExcel";
import { IconFileSpreadsheet, IconReceipt } from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const MENU_ID = "29";

// ── Periode & Cabang ──────────────────────────────────────────────────
const STORAGE_KEY = "finance_periode_terima_setoran";

const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const getSavedPeriode = () => {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (s?.startDate && s?.endDate && s?.cabang) return s;
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
const cabangList = ref<CabangItem[]>([]);
const selectedCabang = ref<string>(savedP?.cabang ?? "");

watch([startDate, endDate, selectedCabang], ([s, e, c]) => {
  if (isInitializing.value) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startDate: s, endDate: e, cabang: c }),
    );
  } catch {
    /* silent */
  }
  loadData();
});

// ── Data ──────────────────────────────────────────────────────────────
const items = ref<TerimaSetoranRow[]>([]);
const detailItems = ref<TerimaSetoranDetailRow[]>([]);
const isLoading = ref(false);
const selected = ref<TerimaSetoranRow[]>([]);
const expanded = ref<any[]>([]);

const selectedItem = computed(() => selected.value[0] ?? null);

// ── Headers ───────────────────────────────────────────────────────────
const headers = [
  { key: "Nomor", title: "Nomor", width: "200px" },
  {
    key: "TglSetor",
    title: "Tgl Setor",
    width: "110px",
    align: "center" as const,
  },
  {
    key: "TglVerifikasi",
    title: "Tgl Verifikasi",
    width: "120px",
    align: "center" as const,
  },
  {
    key: "Created",
    title: "Created",
    width: "100px",
    align: "center" as const,
  },
  {
    key: "Verified",
    title: "Verified",
    width: "100px",
    align: "center" as const,
  },
];

const isPendingFilter = computed(() => route.query.filter === "pending");

// Items yang ditampilkan — filter pending jika dari dashboard
const itemsDisplayed = computed(() =>
  isPendingFilter.value ? items.value.filter((r) => !r.Verified) : items.value,
);

const isInitializing = ref(true);

// ── Init: load cabang dulu, lalu data ─────────────────────────────────
onMounted(async () => {
  isInitializing.value = true;

  try {
    cabangList.value = await terimaSetoranApi.getCabang();
    if (!selectedCabang.value && cabangList.value.length > 0) {
      selectedCabang.value = cabangList.value[0].kode;
    }
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error("Gagal memuat daftar cabang.");
  }

  isInitializing.value = false;
  await loadData();
});

// ── Load ──────────────────────────────────────────────────────────────
const loadData = async () => {
  // Mode pending all — bypass filter cabang & tanggal
  if (isPendingFilter.value) {
    isLoading.value = true;
    selected.value = [];
    expanded.value = [];
    try {
      const [master, detail] = await Promise.all([
        terimaSetoranApi.getBrowsePendingAll(),
        // detail tidak perlu di mode pending, atau bisa kosongkan
        Promise.resolve([] as TerimaSetoranDetailRow[]),
      ]);
      items.value = master;
      detailItems.value = detail;
    } catch (e: any) {
      if (isAuthExpiredError(e)) return;
      toast.error(e.response?.data?.message ?? "Gagal memuat data.");
    } finally {
      isLoading.value = false;
    }
    return;
  }

  // Mode normal
  if (!selectedCabang.value) return;
  isLoading.value = true;
  selected.value = [];
  expanded.value = [];
  try {
    const [master, detail] = await Promise.all([
      terimaSetoranApi.getBrowse(
        startDate.value,
        endDate.value,
        selectedCabang.value,
      ),
      terimaSetoranApi.getBrowseDetail(
        startDate.value,
        endDate.value,
        selectedCabang.value,
      ),
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

const getDetail = (nomor: string) =>
  detailItems.value.filter((d) => d.Nomor === nomor);

// ── Label cabang untuk display di export ─────────────────────────────
const cabangLabel = computed(() => {
  const found = cabangList.value.find((c) => c.kode === selectedCabang.value);
  return found ? `${found.kode} - ${found.nama}` : selectedCabang.value;
});

// ── Tombol Terima ─────────────────────────────────────────────────────
// Delphi: buka frmTerimaSetoran dengan FLAGEDIT=true, loaddataall(Nomor)
// Di web: navigasi ke route form edit
const onTerima = () => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return;
  }
  router.push({
    name: "TerimaSetoranForm",
    params: { nomor: encodeURIComponent(selectedItem.value.Nomor) },
  });
};

// ── Export ────────────────────────────────────────────────────────────
const doExport = () =>
  exportTerimaSetoran(
    items.value,
    startDate.value,
    endDate.value,
    cabangLabel.value,
  );

const doExportDetail = () =>
  exportTerimaSetoranDetail(
    detailItems.value,
    startDate.value,
    endDate.value,
    cabangLabel.value,
  );

// ── Row props — merah jika Verified kosong (Delphi: cxStyle1) ────────
const rowPropsFn = (data: any) => {
  const row = data?.item?.raw ?? data?.item ?? data;
  if (!row?.Verified) return { style: "color:#cc0000;font-weight:600" };
  return {};
};

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

const fmtDate = (v: string) => {
  if (!v) return "-";
  const [y, m, d] = v.split("-");
  return `${d}-${m}-${y}`;
};
</script>

<template>
  <BaseBrowse
    title="Terima Setoran Kasir"
    :icon="IconReceipt"
    :menu-id="MENU_ID"
    :headers="headers"
    :items="itemsDisplayed"
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

        <span class="filter-sep ml-2">Store</span>
        <select v-model="selectedCabang" class="cabang-select">
          <option v-for="c in cabangList" :key="c.kode" :value="c.kode">
            {{ c.kode }} - {{ c.nama }}
          </option>
        </select>
      </div>
    </template>

    <!-- ── Legend ── -->
    <template #filter-right>
      <div class="legend-wrap">
        <span class="legend-dot" style="background: #cc0000"></span>
        <span class="legend-lbl">Belum di Verifikasi</span>
        <span
          v-if="isPendingFilter"
          class="pending-badge"
          title="Klik untuk tampilkan semua"
          @click="
            () => {
              const today = new Date();
              const firstDayOfMonth = new Date(
                today.getFullYear(),
                today.getMonth(),
                1,
              );
              startDate = getLocal(firstDayOfMonth);
              endDate = getLocal(today);
              router.replace({ path: '/transaksi/terima-setoran' });
            }
          "
        >
          ⚠ Menampilkan yang belum verifikasi · ✕ Reset
        </span>
      </div>
    </template>

    <template #summary-row>
      <span class="summary-lbl">Total</span>
      <span class="summary-val">{{ itemsDisplayed.length }} data</span>
      <template v-if="isPendingFilter">
        <span class="summary-lbl" style="margin-left: 20px; color: #ffcdd2">
          Belum Verifikasi
        </span>
        <span class="summary-val" style="color: #ffcdd2">
          {{ itemsDisplayed.length }} dari {{ items.length }}
        </span>
      </template>
      <template v-else>
        <span class="summary-lbl" style="margin-left: 20px"
          >Belum Verifikasi</span
        >
        <span class="summary-val">
          {{ items.filter((r) => !r.Verified).length }}
        </span>
      </template>
    </template>

    <!-- ── Tombol aksi ── -->
    <template #extra-actions>
      <v-btn
        size="small"
        color="primary"
        variant="flat"
        :disabled="!selectedItem"
        @click="onTerima"
      >
        <template #prepend
          ><IconReceipt :size="13" :stroke-width="1.8"
        /></template>
        Terima
      </v-btn>
      <v-btn size="small" variant="tonal" color="success" @click="doExport">
        <template #prepend>
          <IconFileSpreadsheet :size="13" :stroke-width="1.8" />
        </template>
        Export
      </v-btn>
      <v-btn size="small" variant="tonal" color="info" @click="doExportDetail">
        <template #prepend>
          <IconFileSpreadsheet :size="13" :stroke-width="1.8" />
        </template>
        Export Detail
      </v-btn>
    </template>

    <template #item.TglSetor="{ value }">
      <span>{{ fmtDate(value) }}</span>
    </template>

    <template #item.TglVerifikasi="{ value }">
      <span>{{ fmtDate(value) }}</span>
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div class="detail-wrap">
        <table class="detail-tbl">
          <thead>
            <tr>
              <th style="min-width: 180px">Nomor</th>
              <th style="min-width: 200px">Jenis</th>
              <th style="width: 140px">Nominal Setor</th>
              <th style="width: 150px">Nominal Verifikasi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, idx) in getDetail(item.Nomor)" :key="idx">
              <td>{{ d.Nomor }}</td>
              <td>{{ d.Jenis }}</td>
              <td class="tr">{{ fmt(d.NominalSetor) }}</td>
              <td class="tr">{{ fmt(d.NominalVerifikasi) }}</td>
            </tr>
            <tr v-if="!getDetail(item.Nomor).length">
              <td
                colspan="4"
                class="tc"
                style="color: #9e9e9e; font-style: italic; padding: 8px"
              >
                Tidak ada detail.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="getDetail(item.Nomor).length">
            <tr class="detail-foot">
              <td colspan="2" class="tr detail-foot-lbl">Total</td>
              <td class="tr detail-foot-val">
                {{
                  fmt(
                    getDetail(item.Nomor).reduce(
                      (s, d) => s + Number(d.NominalSetor),
                      0,
                    ),
                  )
                }}
              </td>
              <td class="tr detail-foot-val">
                {{
                  fmt(
                    getDetail(item.Nomor).reduce(
                      (s, d) => s + Number(d.NominalVerifikasi),
                      0,
                    ),
                  )
                }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
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
.cabang-select {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  min-width: 160px;
  background: white;
}
.cabang-select:focus {
  border-color: #2e7d32;
}
.legend-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
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

.pending-badge {
  font-size: 11px;
  font-weight: 600;
  color: #cc0000;
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 20px;
  padding: 2px 10px;
  cursor: pointer;
  white-space: nowrap;
  margin-left: 8px;
  transition: background 0.15s;
}
.pending-badge:hover {
  background: #ffcdd2;
}
</style>
