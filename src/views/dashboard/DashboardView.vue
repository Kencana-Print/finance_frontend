<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { IconLayoutDashboard } from "@tabler/icons-vue";
import PageLayout from "@/components/PageLayout.vue";

const authStore = useAuthStore();
const greeting  = computed(() => {
  const h = new Date().getHours();
  if (h < 11) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 18) return "Selamat Sore";
  return "Selamat Malam";
});
</script>

<template>
  <PageLayout title="Dashboard" :icon="IconLayoutDashboard" :desktop-mode="false">
    <div class="dash-wrap">
      <div class="dash-greeting">
        <h2 class="greeting-text">{{ greeting }}, <span class="name">{{ authStore.userName }}</span> 👋</h2>
        <p class="greeting-sub">Selamat datang di Sistem Manajemen Keuangan Finance.</p>
      </div>

      <div class="dash-cards">
        <div class="dash-card">
          <div class="card-label">Modul Aktif</div>
          <div class="card-val">Finance v1.0</div>
        </div>
        <div class="dash-card">
          <div class="card-label">Cabang</div>
          <div class="card-val">{{ authStore.userCabang || "—" }}</div>
        </div>
        <div class="dash-card">
          <div class="card-label">Level</div>
          <div class="card-val">{{ authStore.user?.level || "—" }}</div>
        </div>
      </div>

      <div class="dash-info">
        Pilih menu di sidebar kiri untuk mulai bekerja.
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.dash-wrap { padding: 24px; }
.dash-greeting { margin-bottom: 28px; }
.greeting-text { font-size: 20px; font-weight: 700; color: #1a1a1a; margin: 0 0 6px; }
.name { color: #2e7d32; }
.greeting-sub { font-size: 13px; color: rgba(0,0,0,.5); margin: 0; }
.dash-cards { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.dash-card {
  background: white; border: 1px solid #c8e6c9;
  border-top: 3px solid #2e7d32;
  border-radius: 10px; padding: 16px 20px;
  min-width: 160px;
}
.card-label { font-size: 11px; color: rgba(0,0,0,.45); font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
.card-val   { font-size: 16px; font-weight: 700; color: #2e7d32; }
.dash-info  { font-size: 13px; color: rgba(0,0,0,.4); }
</style>
