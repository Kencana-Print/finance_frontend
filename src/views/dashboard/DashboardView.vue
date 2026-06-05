<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { systemApi, type SystemInfo } from "@/api/systemApi";
import { dashboardApi, type DashboardSummary } from "@/api/dashboardApi";
import {
  IconLayoutDashboard,
  IconReceipt2,
  IconTransferOut,
  IconBook,
  IconAlertCircle,
  IconClock,
  IconInfoCircle,
} from "@tabler/icons-vue";
import PageLayout from "@/components/PageLayout.vue";

const authStore = useAuthStore();
const router = useRouter();
const appVersion = __APP_VERSION__;

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 11) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 18) return "Selamat Sore";
  return "Selamat Malam";
});

// Format mata uang untuk dummy data
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v);

// ── Changelog State ──
const showChangelog = ref(false);
const systemInfo = ref<SystemInfo | null>(null);

onMounted(async () => {
  try {
    systemInfo.value = await systemApi.getInfo();
  } catch (e) {
    console.error("Gagal memuat info sistem", e);
  }
});

// ── Dashboard Summary State ──
const summaryData = ref<DashboardSummary>({
  kasbon: { count: 0, total: 0 },
  transfer: { count: 0, total: 0 },
});
const isSummaryLoading = ref(true);

onMounted(async () => {
  // Load Changelog
  try {
    systemInfo.value = await systemApi.getInfo();
  } catch (e) {
    console.error("Gagal memuat info sistem", e);
  }

  // Load Dashboard Summary Data
  try {
    summaryData.value = await dashboardApi.getSummary();
  } catch (e) {
    console.error("Gagal memuat data ringkasan", e);
  } finally {
    isSummaryLoading.value = false;
  }
});
</script>

<template>
  <PageLayout
    title="Dashboard"
    :icon="IconLayoutDashboard"
    :desktop-mode="false"
  >
    <div class="dash-wrap">
      <div class="dash-greeting">
        <h2 class="greeting-text">
          {{ greeting }},
          <span class="name">{{ authStore.userName || "User" }}</span> 👋
        </h2>
        <p class="greeting-sub">
          Selamat datang di Sistem Manajemen Keuangan Finance Kencana Print.
        </p>
      </div>

      <div class="dash-cards mb-6">
        <div
          class="dash-card info-card clickable-card"
          @click="showChangelog = true"
          title="Klik untuk melihat catatan rilis"
        >
          <div class="card-label d-flex align-center gap-1">
            Modul Aktif <IconInfoCircle :size="12" />
          </div>
          <div class="card-val">Finance v{{ appVersion }}</div>
        </div>

        <div class="dash-card info-card">
          <div class="card-label">Cabang</div>
          <div class="card-val">{{ authStore.userCabang || "—" }}</div>
        </div>
      </div>

      <v-dialog v-model="showChangelog" max-width="500" scrollable>
        <v-card rounded="lg">
          <v-card-title
            class="pa-4 pb-2"
            style="
              font-size: 14px;
              font-weight: 700;
              border-top: 3px solid #2e7d32;
            "
          >
            Catatan Rilis (Changelog)
          </v-card-title>

          <v-card-text class="pa-4 pt-2" style="max-height: 400px">
            <div v-if="systemInfo">
              <div class="mb-3 text-caption" style="color: #555">
                Versi Aplikasi: <strong>v{{ appVersion }}</strong>
              </div>

              <div
                v-for="(logs, version) in systemInfo.all_changelogs"
                :key="version"
                class="mb-4"
              >
                <div class="changelog-version">Versi {{ version }}</div>
                <ul class="changelog-list">
                  <li v-for="(log, idx) in logs" :key="idx">{{ log }}</li>
                </ul>
              </div>
            </div>
            <div v-else class="text-center text-caption" style="color: #999">
              Memuat data...
            </div>
          </v-card-text>

          <v-card-actions class="pa-3" style="border-top: 1px solid #eee">
            <v-spacer />
            <v-btn variant="text" size="small" @click="showChangelog = false"
              >Tutup</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>

      <h3 class="section-title">Ringkasan Tugas</h3>
      <div class="dash-cards mb-6">
        <div class="dash-card alert-card">
          <div class="card-icon-wrap bg-red-light">
            <IconAlertCircle :size="24" color="#c62828" />
          </div>
          <div class="card-content">
            <div class="card-label">Kasbon Belum Selesai</div>
            <div class="card-val text-red">
              <span v-if="isSummaryLoading">...</span>
              <span v-else>{{ summaryData.kasbon.count }} Dokumen</span>
            </div>
            <div class="card-desc">
              Total: Rp
              {{ isSummaryLoading ? "..." : fmt(summaryData.kasbon.total) }}
            </div>
          </div>
        </div>

        <div class="dash-card warning-card">
          <div class="card-icon-wrap bg-orange-light">
            <IconClock :size="24" color="#ef6c00" />
          </div>
          <div class="card-content">
            <div class="card-label">Pengajuan Transfer</div>
            <div class="card-val text-orange">
              <span v-if="isSummaryLoading">...</span>
              <span v-else>{{ summaryData.transfer.count }} Menunggu</span>
            </div>
            <div class="card-desc">
              Total: Rp
              {{ isSummaryLoading ? "..." : fmt(summaryData.transfer.total) }}
            </div>
          </div>
        </div>
      </div>

      <h3 class="section-title">Aksi Cepat</h3>
      <div class="quick-actions">
        <button class="qa-btn" @click="router.push('/transaksi/bkk')">
          <IconTransferOut :size="20" class="qa-icon" />
          <span>Buat BKK</span>
        </button>
        <button class="qa-btn" @click="router.push('/transaksi/uang-muka')">
          <IconReceipt2 :size="20" class="qa-icon" />
          <span>Penyelesaian Kasbon</span>
        </button>
        <button class="qa-btn" @click="router.push('/transaksi/jurnal-umum')">
          <IconBook :size="20" class="qa-icon" />
          <span>Jurnal Umum</span>
        </button>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.dash-wrap {
  max-width: 1200px;
  padding-bottom: 24px;
}
.dash-greeting {
  margin-bottom: 24px;
}
.greeting-text {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px;
}
.name {
  color: #2e7d32;
}
.greeting-sub {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
  margin: 0;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dash-cards {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

/* User Info Cards */
.dash-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.info-card {
  min-width: 150px;
  border-left: 3px solid #2e7d32;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.card-label {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 600;
  text-transform: uppercase;
}
.info-card .card-val {
  font-size: 15px;
  font-weight: 700;
  color: #2e7d32;
}

/* Summary Widgets */
.alert-card,
.warning-card {
  flex: 1;
  min-width: 250px;
}
.card-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bg-red-light {
  background: #ffebee;
}
.bg-orange-light {
  background: #fff3e0;
}
.text-red {
  color: #c62828;
  font-size: 16px;
  font-weight: 700;
  margin-top: 2px;
}
.text-orange {
  color: #ef6c00;
  font-size: 16px;
  font-weight: 700;
  margin-top: 2px;
}
.card-desc {
  font-size: 11px;
  color: #757575;
  font-weight: 600;
  margin-top: 2px;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.qa-btn {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}
.qa-btn:hover {
  border-color: #2e7d32;
  background: #f1f8f1;
  color: #2e7d32;
}
.qa-icon {
  color: #2e7d32;
}

/* ── Tambahan CSS ── */
.clickable-card {
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}
.clickable-card:hover {
  background-color: #f1f8f1;
  border-left-color: #1b5e20;
}

.changelog-version {
  font-size: 13px;
  font-weight: 700;
  color: #2e7d32;
  margin-bottom: 4px;
  padding-bottom: 2px;
  border-bottom: 1px solid #e0e0e0;
}
.changelog-list {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #333;
}
.changelog-list li {
  margin-bottom: 3px;
}
</style>
