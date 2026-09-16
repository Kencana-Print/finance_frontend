<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { IconCalendarDollar } from "@tabler/icons-vue";
import {
  rencanaPembayaranApi,
  type RencanaPembayaranRow,
  type RencanaPembayaranDetail,
} from "@/api/transaksi/rencanaPembayaranApi";

const toast = useToast();
const MENU_ID = "32";

// ── Periode ───────────────────────────────────────────────────────────
const STORAGE_KEY = "finance_filter_rencana_pembayaran";

const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const getSaved = () => {
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
const saved = getSaved();

const startDate = ref(saved?.startDate ?? getLocal(firstDay));
const endDate = ref(saved?.endDate ?? getLocal(now));
const searchSupplier = ref("");

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
const items = ref<RencanaPembayaranRow[]>([]);
const detailItems = ref<RencanaPembayaranDetail[]>([]);
const isLoading = ref(false);
const selected = ref<RencanaPembayaranRow[]>([]);
const expanded = ref<any[]>([]);

const filterValues = computed(() => ({
  startDate: startDate.value,
  endDate: endDate.value,
  q: searchSupplier.value,
}));

const itemsFiltered = computed(() => {
  const q = searchSupplier.value.trim().toLowerCase();
  if (!q) return items.value;
  return items.value.filter(
    (r) =>
      r.Supplier.toLowerCase().includes(q) ||
      r.KodeSupplier.toLowerCase().includes(q),
  );
});

// ── Headers ───────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "",
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MEI",
  "JUN",
  "JUL",
  "AGU",
  "SEP",
  "OKT",
  "NOV",
  "DES",
];

const headers = [
  { key: "Supplier", title: "Nama Supplier", width: "260px" },
  {
    key: "BulanTagihan",
    title: "Bulan Tagihan",
    width: "110px",
    align: "center" as const,
  },
  {
    key: "JumlahVoucher",
    title: "Jml Voucher",
    width: "90px",
    align: "center" as const,
  },
  { key: "Nominal", title: "Nominal", width: "160px", align: "right" as const },
  {
    key: "TglRencana",
    title: "Rencana Pembayaran",
    width: "170px",
    align: "center" as const,
  },
];

// ── Load ──────────────────────────────────────────────────────────────
const loadData = async () => {
  isLoading.value = true;
  selected.value = [];
  expanded.value = [];
  try {
    const [master, detail] = await Promise.all([
      rencanaPembayaranApi.getBrowse({
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      rencanaPembayaranApi.getBrowseDetail({
        startDate: startDate.value,
        endDate: endDate.value,
      }),
    ]);
    items.value = master.map((r) => ({
      ...r,
      __key: `${r.KodeSupplier}-${r.Tahun}-${r.Bulan}`,
    }));
    detailItems.value = detail;
  } catch (e: any) {
    if (!isAuthExpiredError(e))
      toast.error(e.response?.data?.message ?? "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// ── Row key unik untuk expand (Supplier+Bulan+Tahun) ───────────────────
const rowKey = (r: RencanaPembayaranRow) =>
  `${r.KodeSupplier}-${r.Tahun}-${r.Bulan}`;

const getDetail = (r: RencanaPembayaranRow) =>
  detailItems.value.filter(
    (d) =>
      d.KodeSupplier === r.KodeSupplier &&
      d.Bulan === r.Bulan &&
      d.Tahun === r.Tahun,
  );

// ── Inline edit Tgl Rencana ─────────────────────────────────────────────
const savingKey = ref<string | null>(null);

const onTglRencanaChange = async (row: RencanaPembayaranRow, val: string) => {
  const key = rowKey(row);
  savingKey.value = key;
  try {
    await rencanaPembayaranApi.saveRencana({
      supKode: row.KodeSupplier,
      bulan: row.Bulan,
      tahun: row.Tahun,
      tglRencana: val || null,
    });
    row.TglRencana = val || null;
    toast.success("Rencana pembayaran disimpan.");
  } catch (e: any) {
    if (!isAuthExpiredError(e))
      toast.error(e.response?.data?.message ?? "Gagal menyimpan rencana.");
  } finally {
    savingKey.value = null;
  }
};

// ── Formatting ────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
const fmtDate = (v: string) => {
  if (!v) return "-";
  const [y, m, d] = v.split("-");
  return `${d}-${m}-${y}`;
};

// ── Summary ───────────────────────────────────────────────────────────
const totalAll = computed(() =>
  itemsFiltered.value.reduce((s, r) => s + Number(r.Nominal || 0), 0),
);
const belumRencanaCount = computed(
  () => itemsFiltered.value.filter((r) => !r.TglRencana).length,
);
</script>

<template>
  <BaseBrowse
    title="Rencana Pembayaran"
    :icon="IconCalendarDollar"
    :menu-id="MENU_ID"
    :headers="headers"
    :items="itemsFiltered"
    :is-loading="isLoading"
    :show-expand="true"
    :expanded="expanded"
    @update:expanded="expanded = $event"
    item-value="__key"
    v-model:selected="selected"
    :filter-values="filterValues"
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
      <div class="filter-divider" />
      <input
        v-model="searchSupplier"
        class="search-inp"
        placeholder="Cari supplier..."
      />
      <div class="filter-divider" />
      <div class="badge-warn" v-if="belumRencanaCount > 0">
        {{ belumRencanaCount }} belum ada rencana
      </div>
    </template>

    <!-- ── Custom cells ── -->
    <template #item.BulanTagihan="{ item }">
      {{ MONTH_NAMES[item.Bulan] }} {{ item.Tahun }}
    </template>

    <template #item.Nominal="{ value }">
      <span style="font-variant-numeric: tabular-nums; font-weight: 600">
        {{ fmt(Number(value)) }}
      </span>
    </template>

    <template #item.TglRencana="{ item }">
      <input
        type="date"
        class="tgl-rencana-inp"
        :class="{ empty: !item.TglRencana }"
        :value="item.TglRencana || ''"
        :disabled="savingKey === rowKey(item)"
        @change="
          onTglRencanaChange(item, ($event.target as HTMLInputElement).value)
        "
        @click.stop
      />
    </template>

    <!-- ── Detail expand ── -->
    <template #detail="{ item }">
      <div class="det-wrap">
        <table class="det-tbl">
          <thead>
            <tr>
              <th style="width: 160px">No. Voucher</th>
              <th style="width: 100px" class="tc">Tanggal</th>
              <th style="width: 120px">No. Pajak</th>
              <th style="width: 130px" class="tr">Total</th>
              <th style="width: 130px" class="tr">Bahan Tambahan</th>
              <th style="width: 130px" class="tr">Net</th>
              <th style="width: 100px" class="tc">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in getDetail(item)" :key="i">
              <td class="mono accent">{{ d.Nomor }}</td>
              <td class="tc">{{ fmtDate(d.Tanggal) }}</td>
              <td>{{ d.NomorPajak || "-" }}</td>
              <td class="tr">{{ fmt(d.Total) }}</td>
              <td class="tr">{{ fmt(d.BahanTambahan) }}</td>
              <td class="tr bold">{{ fmt(d.Total - d.BahanTambahan) }}</td>
              <td class="tc">
                <span
                  :class="d.StatusRealisasi ? 'badge-done' : 'badge-pending'"
                >
                  {{ d.StatusRealisasi || "Belum" }}
                </span>
              </td>
            </tr>
            <tr v-if="!getDetail(item).length">
              <td colspan="7" class="empty-td">Tidak ada voucher.</td>
            </tr>
          </tbody>
          <tfoot v-if="getDetail(item).length">
            <tr class="det-foot">
              <td colspan="5" class="tr det-foot-lbl">Total Net</td>
              <td class="tr det-foot-val">
                {{
                  fmt(
                    getDetail(item).reduce(
                      (s, d) => s + (d.Total - d.BahanTambahan),
                      0,
                    ),
                  )
                }}
              </td>
              <td></td>
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
.filter-divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
  flex-shrink: 0;
  margin: 0 4px;
}
.date-inp {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  width: 130px;
}
.date-inp:focus {
  border-color: #2e7d32;
}
.search-inp {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 12px;
  outline: none;
  width: 200px;
}
.search-inp:focus {
  border-color: #2e7d32;
}
.badge-warn {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
  border-radius: 12px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

/* ── Inline tgl rencana ── */
.tgl-rencana-inp {
  height: 26px;
  border: 1px solid #c8e6c9;
  border-radius: 5px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  width: 130px;
  background: #f0fdf4;
  color: #1b5e20;
  font-weight: 600;
}
.tgl-rencana-inp:focus {
  border-color: #2e7d32;
}
.tgl-rencana-inp.empty {
  background: #fff8f0;
  color: #e65100;
  border-color: #ffcc80;
}
.tgl-rencana-inp:disabled {
  opacity: 0.5;
}

/* ── Detail expand ── */
.det-wrap {
  padding: 4px 0;
}
.det-tbl {
  border-collapse: collapse;
  font-size: 11px;
}
.det-tbl thead tr {
  background: #1b5e20;
}
.det-tbl th {
  color: white;
  font-weight: 700;
  padding: 4px 8px;
  white-space: nowrap;
  text-align: left;
}
.det-tbl td {
  padding: 3px 8px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}
.det-tbl tbody tr:hover td {
  background: rgba(46, 125, 50, 0.05);
}
.det-foot td {
  background: #f0fdf4;
  border-top: 2px solid #2e7d32;
  padding: 4px 8px;
}
.det-foot-lbl {
  font-size: 11px;
  font-weight: 700;
  color: #374151;
}
.det-foot-val {
  font-size: 11px;
  font-weight: 700;
  color: #1b5e20;
  font-variant-numeric: tabular-nums;
}
.badge-done {
  background: #e3f2fd;
  color: #1565c0;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-pending {
  background: #fce4ec;
  color: #c62828;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.bold {
  font-weight: 700;
}
.mono {
  font-family: monospace;
}
.accent {
  color: #2e7d32;
}
.empty-td {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px;
}
</style>
