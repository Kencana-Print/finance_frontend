<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { listJurnalApi, type ListJurnalRow } from "@/api/laporan/listJurnalApi";
import {
  exportListJurnal,
  exportListJurnalFromConfig,
} from "@/utils/exportExcel";
import {
  IconList,
  IconFileSpreadsheet,
  IconTable,
  IconChartBar,
} from "@tabler/icons-vue";
import { initPivot, jQuery as jq } from "@/lib/pivottable-setup";

const toast = useToast();
const MENU_ID = "";

// ── Periode ───────────────────────────────────────────────────────────
const STORAGE_KEY = "finance_periode_list_jurnal";

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
const saved = getSaved();

const filterState = ref({
  startDate: saved?.startDate ?? getLocal(now),
  endDate: saved?.endDate ?? getLocal(now),
});

const startDate = computed({
  get: () => filterState.value.startDate,
  set: (v) => {
    filterState.value = { ...filterState.value, startDate: v };
  },
});
const endDate = computed({
  get: () => filterState.value.endDate,
  set: (v) => {
    filterState.value = { ...filterState.value, endDate: v };
  },
});

// Simpan ke sessionStorage
watch(
  filterState,
  (val) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    } catch {
      /* silent */
    }
  },
  { deep: true },
);

// filterValues → BaseBrowse watch → emit refresh → loadData
const filterValues = computed(() => ({ ...filterState.value }));

// ── Tab ───────────────────────────────────────────────────────────────
const activeTab = ref<"grid" | "pivot" | "chart">("grid");

// ── Data ──────────────────────────────────────────────────────────────
const items = ref<ListJurnalRow[]>([]);
const isLoading = ref(false);

// ── BaseBrowse headers ────────────────────────────────────────────────
const headers = [
  { key: "Bulan", title: "Bulan", width: "60px", align: "center" as const },
  { key: "Tahun", title: "Tahun", width: "60px", align: "center" as const },
  {
    key: "Tanggal",
    title: "Tanggal",
    width: "100px",
    align: "center" as const,
  },
  { key: "Nomor", title: "Nomor", width: "200px" },
  { key: "Referensi", title: "Referensi", width: "200px" },
  { key: "Account", title: "Account", width: "100px" },
  { key: "AccountName", title: "Nama Account", width: "240px" },
  { key: "Keterangan", title: "Keterangan", width: "280px" },
  { key: "Debet", title: "Debet", width: "140px", align: "right" as const },
  { key: "Kredit", title: "Kredit", width: "140px", align: "right" as const },
  { key: "DetailCC", title: "Detail CC", width: "160px" },
];

// ── Load ──────────────────────────────────────────────────────────────
const loadData = async () => {
  isLoading.value = true;
  try {
    items.value = await listJurnalApi.getListJurnal(
      filterState.value.startDate,
      filterState.value.endDate,
    );
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal memuat data.");
  } finally {
    isLoading.value = false;
    if (activeTab.value === "pivot") {
      await nextTick();
      renderPivot();
    }
  }
};

onMounted(loadData);

// ── Pivot ─────────────────────────────────────────────────────────────
const pivotContainer = ref<HTMLElement | null>(null);

const renderPivot = async () => {
  await nextTick();
  await nextTick();
  if (!pivotContainer.value || items.value.length === 0) return;

  await initPivot();

  // Simpan/restore config pivot dari localStorage
  let savedConfig: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem("pivot_config_list_jurnal");
    if (raw) savedConfig = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  // Reshape: 1 baris → 2 baris (Debet + Kredit)
  // cols: Tahun + Bulan + Jenis → hasilnya 2026/6/Debet dan 2026/6/Kredit
  const plainData: Record<string, any>[] = [];
  for (const r of items.value) {
    const base = {
      Bulan: String(r.Bulan),
      Tahun: String(r.Tahun),
      Account: r.Account ?? "",
      AccountName: r.AccountName ?? "",
      Keterangan: r.Keterangan ?? "",
      DetailCC: r.DetailCC ?? "",
    };
    if (Number(r.Debet)) {
      plainData.push({ ...base, Jenis: "Debet", Nilai: Number(r.Debet) });
    }
    if (Number(r.Kredit)) {
      plainData.push({ ...base, Jenis: "Kredit", Nilai: Number(r.Kredit) });
    }
  }

  // Delphi: row=AccountName, col=Tahun+Bulan, data=Debet+Kredit
  (jq(pivotContainer.value) as any).empty().pivotUI(
    plainData,
    {
      rows: (savedConfig.rows as string[]) ?? ["AccountName"],
      cols: (savedConfig.cols as string[]) ?? ["Tahun", "Bulan", "Jenis"],
      vals: (savedConfig.vals as string[]) ?? ["Nilai"],
      aggregatorName: (savedConfig.aggregatorName as string) ?? "Sum",
      rendererName: (savedConfig.rendererName as string) ?? "Table",
      hiddenAttributes: [],
      onRefresh: (config: Record<string, unknown>) => {
        localStorage.setItem(
          "pivot_config_list_jurnal",
          JSON.stringify(config),
        );
      },
    },
    true,
  );
};

const resetPivotConfig = () => {
  localStorage.removeItem("pivot_config_list_jurnal");
  renderPivot();
};

// Watch tab change → render pivot saat masuk tab pivot
watch(activeTab, async (tab) => {
  if (tab === "pivot") {
    await nextTick();
    renderPivot();
  }
});

// ── Chart ─────────────────────────────────────────────────────────────
const chartCanvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: any = null;

const chartData = computed(() => {
  const map = new Map<string, { debet: number; kredit: number }>();
  for (const r of items.value) {
    const key = r.AccountName || r.Account;
    const cur = map.get(key) || { debet: 0, kredit: 0 };
    cur.debet += Number(r.Debet);
    cur.kredit += Number(r.Kredit);
    map.set(key, cur);
  }
  return [...map.entries()]
    .sort((a, b) => b[1].debet + b[1].kredit - (a[1].debet + a[1].kredit))
    .slice(0, 15)
    .map(([name, val]) => ({ name, ...val }));
});

watch([activeTab, chartData], async ([tab]) => {
  if (tab !== "chart") return;
  await nextTick();
  if (!chartCanvasRef.value) return;

  const {
    Chart,
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
  } = await import("chart.js");
  Chart.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
  );

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(chartCanvasRef.value, {
    type: "bar",
    data: {
      labels: chartData.value.map((d) => d.name),
      datasets: [
        {
          label: "Debet",
          data: chartData.value.map((d) => d.debet),
          backgroundColor: "rgba(46,125,50,0.75)",
          borderColor: "#2e7d32",
          borderWidth: 1,
        },
        {
          label: "Kredit",
          data: chartData.value.map((d) => d.kredit),
          backgroundColor: "rgba(21,101,192,0.65)",
          borderColor: "#1565c0",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${new Intl.NumberFormat("id-ID").format(ctx.parsed.y ?? 0)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (v) =>
              new Intl.NumberFormat("id-ID", { notation: "compact" }).format(
                Number(v),
              ),
          },
        },
        x: { ticks: { maxRotation: 35, font: { size: 10 } } },
      },
    },
  });
});

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
const fmtDate = (v: string) => {
  if (!v) return "-";
  const [y, m, d] = v.split("-");
  return `${d}-${m}-${y}`;
};

const doExport = () =>
  exportListJurnal(
    items.value,
    filterState.value.startDate,
    filterState.value.endDate,
  );

const doExportPivot = async () => {
  let config: Record<string, any> = {};
  try {
    const raw = localStorage.getItem("pivot_config_list_jurnal");
    if (raw) config = JSON.parse(raw);
  } catch {
    /* silent */
  }

  const rows: string[] = config.rows ?? ["AccountName"];
  const cols: string[] = config.cols ?? ["Tahun", "Bulan", "Jenis"];
  const vals: string[] = config.vals ?? ["Nilai"];
  const aggregator: string = config.aggregatorName ?? "Sum";

  const plainData: Record<string, any>[] = [];
  for (const r of items.value) {
    const base = {
      Bulan: String(r.Bulan),
      Tahun: String(r.Tahun),
      Account: r.Account ?? "",
      AccountName: r.AccountName ?? "",
      Keterangan: r.Keterangan ?? "",
      DetailCC: r.DetailCC ?? "",
      Referensi: r.Referensi ?? "",
      Tanggal: r.Tanggal ?? "",
    };
    if (Number(r.Debet))
      plainData.push({ ...base, Jenis: "Debet", Nilai: Number(r.Debet) });
    if (Number(r.Kredit))
      plainData.push({ ...base, Jenis: "Kredit", Nilai: Number(r.Kredit) });
  }

  await exportListJurnalFromConfig(
    plainData,
    rows,
    cols,
    vals[0] ?? "Nilai",
    aggregator,
    filterState.value.startDate,
    filterState.value.endDate,
  );
};
</script>

<template>
  <!-- ── Grid tab ── -->
  <BaseBrowse
    v-if="activeTab === 'grid'"
    title="List Jurnal"
    :icon="IconList"
    :menu-id="MENU_ID"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    :fixed-layout="false"
    item-value="Nomor"
    :filter-values="filterValues"
    @refresh="loadData"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-lbl">Periode</span>
        <input v-model="startDate" type="date" class="date-inp" />
        <span class="filter-sep">s/d</span>
        <input v-model="endDate" type="date" class="date-inp" />
      </div>
    </template>

    <template #filter-right-prepend>
      <div class="filter-divider" />
      <div class="tab-wrap">
        <button class="tab-btn active">
          <IconTable :size="13" :stroke-width="1.8" /> Grid Data
        </button>
        <button class="tab-btn" @click="activeTab = 'pivot'">
          <IconList :size="13" :stroke-width="1.8" /> Pivot
        </button>
        <button class="tab-btn" @click="activeTab = 'chart'">
          <IconChartBar :size="13" :stroke-width="1.8" /> Grafik
        </button>
      </div>
    </template>

    <template #extra-actions>
      <v-btn size="small" variant="tonal" color="success" @click="doExport">
        <template #prepend
          ><IconFileSpreadsheet :size="13" :stroke-width="1.8"
        /></template>
        Export
      </v-btn>
    </template>

    <template #item.Debet="{ value }">
      <span class="num-cell">{{ value ? fmt(value) : "" }}</span>
    </template>
    <template #item.Kredit="{ value }">
      <span class="num-cell">{{ value ? fmt(value) : "" }}</span>
    </template>
    <template #item.Tanggal="{ value }">
      <span>{{ fmtDate(value) }}</span>
    </template>

    <template #summary-row="{ filteredItems }">
      <span class="summary-lbl">Total Debet</span>
      <span class="summary-val">
        {{
          fmt(
            filteredItems.reduce((s: number, r: any) => s + Number(r.Debet), 0),
          )
        }}
      </span>
      <span class="summary-lbl" style="margin-left: 24px">Total Kredit</span>
      <span class="summary-val">
        {{
          fmt(
            filteredItems.reduce(
              (s: number, r: any) => s + Number(r.Kredit),
              0,
            ),
          )
        }}
      </span>
    </template>
  </BaseBrowse>

  <!-- ── Pivot & Chart tab ── -->
  <div v-else class="lap-layout">
    <div class="lap-header">
      <div class="page-title-section">
        <div class="title-icon-wrap">
          <IconList :size="16" :stroke-width="1.8" />
        </div>
        <h1 class="page-title">List Jurnal</h1>
      </div>
      <div class="header-actions">
        <v-btn size="small" variant="tonal" color="success" @click="doExport">
          <template #prepend
            ><IconFileSpreadsheet :size="13" :stroke-width="1.8"
          /></template>
          Export
        </v-btn>
      </div>
    </div>

    <div class="lap-card">
      <!-- Filter bar pivot/chart -->
      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-lbl">Periode</span>
          <input v-model="startDate" type="date" class="date-inp" />
          <span class="filter-sep">s/d</span>
          <input v-model="endDate" type="date" class="date-inp" />
          <v-btn
            size="small"
            color="primary"
            variant="tonal"
            :loading="isLoading"
            @click="loadData"
          >
            Tampilkan
          </v-btn>
        </div>
        <div class="filter-divider" />
        <div class="tab-wrap">
          <button class="tab-btn" @click="activeTab = 'grid'">
            <IconTable :size="13" :stroke-width="1.8" /> Grid Data
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'pivot' }"
            @click="activeTab = 'pivot'"
          >
            <IconList :size="13" :stroke-width="1.8" /> Pivot
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'chart' }"
            @click="activeTab = 'chart'"
          >
            <IconChartBar :size="13" :stroke-width="1.8" /> Grafik
          </button>
        </div>
      </div>

      <!-- Pivot -->
      <div v-if="activeTab === 'pivot'" class="tab-inner">
        <div v-if="isLoading" class="tab-loading">
          <v-progress-circular indeterminate color="primary" size="36" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="!items.length" class="tab-empty">
          Tidak ada data untuk periode ini.
        </div>
        <div v-else class="pivot-wrapper">
          <div class="pivot-hint">
            <span>
              Drag field ke baris/kolom. Tersedia: AccountName, Account, Tahun,
              Bulan, Tanggal, Nomor, Referensi, Jenis, Nilai, DetailCC.
            </span>
            <div class="d-flex gap-2">
              <v-btn
                size="small"
                variant="text"
                color="warning"
                @click="resetPivotConfig"
              >
                Reset Pivot
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="success"
                @click="doExportPivot"
              >
                <template #prepend
                  ><IconFileSpreadsheet :size="13" :stroke-width="1.8"
                /></template>
                Export Pivot
              </v-btn>
            </div>
          </div>
          <div ref="pivotContainer" class="pivot-container" />
        </div>
      </div>

      <!-- Chart -->
      <div v-if="activeTab === 'chart'" class="tab-inner">
        <div v-if="isLoading" class="tab-loading">
          <v-progress-circular indeterminate color="primary" size="36" />
        </div>
        <div v-else-if="!chartData.length" class="tab-empty">
          Tidak ada data untuk periode ini.
        </div>
        <div v-else class="chart-wrap">
          <div class="chart-title">Top 15 Account — Debet & Kredit</div>
          <div class="chart-container">
            <canvas ref="chartCanvasRef" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Filter ── */
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
  white-space: nowrap;
}
.filter-divider {
  width: 1px;
  height: 24px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
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

/* ── Tab selector ── */
.tab-wrap {
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(var(--v-border-color), 0.06);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  padding: 3px;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.tab-btn:hover {
  background: rgba(46, 125, 50, 0.08);
  color: #2e7d32;
}
.tab-btn.active {
  background: #2e7d32;
  color: white;
}

/* ── Pivot/Chart layout ── */
.lap-layout {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  padding: 8px 12px;
  gap: 6px;
}
.lap-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 36px;
}
.page-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(46, 125, 50, 0.1);
  color: #2e7d32;
  display: flex;
  align-items: center;
  justify-content: center;
}
.page-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.lap-card {
  flex: 1;
  min-height: 0;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-top: 3px solid #2e7d32;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.tab-inner {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.tab-loading,
.tab-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 200px;
  font-size: 12px;
  color: #9e9e9e;
}

/* ── Pivot ── */
.pivot-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.pivot-hint {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 12px;
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  background: rgba(46, 125, 50, 0.03);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.pivot-container {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

:deep(.pvtUi),
:deep(.pvtUi *) {
  font-size: 11px !important;
  font-family: inherit !important;
}
:deep(.pvtUi) {
  border: none !important;
  background: transparent !important;
}
:deep(.pvtAxisContainer),
:deep(.pvtVals) {
  background: rgba(46, 125, 50, 0.04) !important;
  border: 1px solid rgba(46, 125, 50, 0.15) !important;
  border-radius: 4px !important;
  min-height: 48px !important;
  padding: 4px !important;
}
:deep(.pvtAttr) {
  background: rgba(46, 125, 50, 0.1) !important;
  color: #2e7d32 !important;
  border: 1px solid rgba(46, 125, 50, 0.25) !important;
  border-radius: 3px !important;
  padding: 2px 7px !important;
  font-weight: 600 !important;
  cursor: grab !important;
}
:deep(.pvtTable th) {
  background: #2e7d32 !important;
  color: white !important;
  font-weight: 700 !important;
  padding: 5px 9px !important;
  white-space: nowrap !important;
}
:deep(.pvtTable td) {
  padding: 3px 9px !important;
  text-align: right !important;
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}
:deep(.pvtTotal),
:deep(.pvtGrandTotal) {
  font-weight: 700 !important;
  background: rgba(46, 125, 50, 0.07) !important;
}

/* ── Chart ── */
.chart-wrap {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.chart-title {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 10px;
  text-align: center;
}
.chart-container {
  flex: 1;
  min-height: 350px;
  position: relative;
}

.num-cell {
  font-variant-numeric: tabular-nums;
}
</style>
