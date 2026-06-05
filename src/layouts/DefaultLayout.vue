<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import logoUrl from "@/assets/logo.png"; // 👈 Import logo di sini
import {
  IconLayoutDashboard,
  IconCash,
  IconArrowBarRight,
  IconArrowBarLeft,
  IconChevronDown,
  IconLogout,
  IconUser,
  IconLock,
  IconBuildingBank,
  IconFileInvoice,
  IconReportMoney,
  IconBookmarks,
  IconTransferIn,
  IconTransferOut,
  IconReceipt2,
  IconBook,
  IconList,
  IconAdjustments,
  IconUsers,
  IconMenu2,
  IconArrowsExchange,
  IconTransfer,
} from "@tabler/icons-vue";

const router = useRouter();
const authStore = useAuthStore();
const drawer = ref(true);
const rail = ref(false);

const userName = computed(() => authStore.userName);
const userCabang = computed(() => authStore.userCabang);

const logout = () => {
  authStore.logout();
  router.push("/login");
};

// ── Menu struktur ─────────────────────────────────────────────────────
const menus = [
  {
    title: "Dashboard",
    icon: IconLayoutDashboard,
    route: "/",
    menuId: null,
  },
  {
    title: "Master",
    icon: IconBookmarks,
    menuId: null,
    children: [
      {
        title: "Cost Center",
        icon: IconAdjustments,
        route: "/master/cost-center",
        menuId: "5",
      },
      {
        title: "Rekening (Account)",
        icon: IconBuildingBank,
        route: "/master/account",
        menuId: "6",
      },
      {
        title: "Kelompok",
        icon: IconList,
        route: "/master/kelompok",
        menuId: "7",
      },
      {
        title: "Jenis Pembayaran",
        icon: IconList,
        route: "/master/jenis-pembayaran",
        menuId: "8",
      },
    ],
  },
  {
    title: "Transaksi",
    icon: IconCash,
    menuId: null,
    children: [
      {
        title: "Uang Muka",
        icon: IconReceipt2,
        route: "/transaksi/uang-muka",
        menuId: "21",
      },
      {
        title: "Bukti Kas Masuk (BKM)",
        icon: IconTransferIn,
        route: "/transaksi/bkm",
        menuId: "23",
      },
      {
        title: "Bukti Kas Keluar (BKK)",
        icon: IconTransferOut,
        route: "/transaksi/bkk",
        menuId: "22",
      },
      {
        title: "Bukti Bank Masuk (BBM)",
        icon: IconTransferIn,
        route: "/transaksi/bbm",
        menuId: "25",
      },
      {
        title: "Bukti Bank Keluar (BBK)",
        icon: IconTransferOut,
        route: "/transaksi/bbk",
        menuId: "24",
      },
      {
        title: "Jurnal Umum",
        icon: IconBook,
        route: "/transaksi/jurnal-umum",
        menuId: "26",
      },
      {
        title: "Rekonsiliasi Bank",
        icon: IconArrowsExchange,
        route: "/transaksi/rekonsiliasi-bank",
        menuId: "27",
      },
      {
        title: "Pengajuan Transfer",
        icon: IconTransfer,
        route: "/transaksi/pengajuan-transfer",
        menuId: "28",
      },
      {
        title: "Terima Setoran",
        icon: IconTransferIn,
        route: "/transaksi/terima-setoran",
        menuId: "29",
      },
    ],
  },
  {
    title: "Posting",
    icon: IconFileInvoice,
    menuId: null,
    children: [
      {
        title: "Pembayaran Customer",
        icon: IconReceipt2,
        route: "/posting/pembayaran-customer",
        menuId: "20",
      },
      {
        title: "Pembayaran Customer Kaosan",
        icon: IconReceipt2,
        route: "/posting/pembayaran-customer-kaosan",
        menuId: "21",
      },
    ],
  },
  {
    title: "Laporan",
    icon: IconReportMoney,
    menuId: null,
    children: [
      {
        title: "List Jurnal",
        icon: IconList,
        route: "/laporan/list-jurnal",
        menuId: "30",
      },
      {
        title: "Buku Besar",
        icon: IconBook,
        route: "/laporan/buku-besar",
        menuId: "31",
      },
      {
        title: "Kasbon Belum Selesai",
        icon: IconList,
        route: "/laporan/kasbon-belum-selesai",
        menuId: "32",
      },
      {
        title: "Rekonsiliasi Bank",
        icon: IconBuildingBank,
        route: "/laporan/rekonsiliasi-bank",
        menuId: "33",
      },
      {
        title: "Stok Finance",
        icon: IconList,
        route: "/laporan/stok-finance",
        menuId: "34",
      },
    ],
  },
  {
    title: "Tools",
    icon: IconUsers,
    menuId: null,
    children: [
      {
        title: "Master User",
        icon: IconUser,
        route: "/tools/users",
        menuId: null,
      },
    ],
  },
];

// Expand state per group
const openGroups = ref<Record<string, boolean>>({});
const toggleGroup = (title: string) => {
  if (openGroups.value[title]) {
    openGroups.value[title] = false;
  } else {
    openGroups.value = { [title]: true };
  }
};
</script>

<template>
  <v-app>
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail"
      permanent
      class="finance-drawer"
      width="240"
    >
      <div class="drawer-brand" :class="{ 'rail-brand': rail }">
        <div class="brand-logo">
          <img :src="logoUrl" alt="Logo" class="img-logo" />
        </div>
        <transition name="fade">
          <div v-if="!rail" class="brand-text">
            <div class="brand-title">FINANCE</div>
            <div class="brand-sub">Management System</div>
          </div>
        </transition>
      </div>

      <v-divider class="mx-3 mb-1" />

      <v-list density="compact" nav class="px-2">
        <template v-for="menu in menus" :key="menu.title">
          <v-list-item
            v-if="!menu.children"
            :to="menu.route"
            rounded="lg"
            class="mb-1"
            active-class="nav-active"
            :title="rail ? '' : menu.title"
          >
            <template #prepend>
              <component
                :is="menu.icon"
                :size="18"
                :stroke-width="1.8"
                class="nav-icon"
              />
            </template>
            <template #title v-if="!rail">{{ menu.title }}</template>
          </v-list-item>

          <template v-else>
            <v-list-item
              rounded="lg"
              class="mb-1 nav-group-header"
              :title="rail ? '' : menu.title"
              @click="!rail && toggleGroup(menu.title)"
            >
              <template #prepend>
                <component
                  :is="menu.icon"
                  :size="18"
                  :stroke-width="1.8"
                  class="nav-icon"
                />
              </template>
              <template #title v-if="!rail">{{ menu.title }}</template>
              <template #append v-if="!rail">
                <IconChevronDown
                  :size="14"
                  :stroke-width="2"
                  :style="{
                    transform: openGroups[menu.title] ? 'rotate(180deg)' : '',
                    transition: 'transform .2s',
                  }"
                />
              </template>
            </v-list-item>

            <v-expand-transition>
              <div v-if="openGroups[menu.title] && !rail" class="nav-children">
                <v-list-item
                  v-for="child in menu.children"
                  :key="child.title"
                  :to="child.route"
                  rounded="lg"
                  class="mb-0.5 nav-child-item"
                  active-class="nav-active"
                >
                  <template #prepend>
                    <component
                      :is="child.icon"
                      :size="15"
                      :stroke-width="1.7"
                      class="nav-child-icon"
                    />
                  </template>
                  <v-list-item-title class="nav-child-title">{{
                    child.title
                  }}</v-list-item-title>
                </v-list-item>
              </div>
            </v-expand-transition>
          </template>
        </template>
      </v-list>

      <template #append>
        <v-divider class="mx-3" />
        <div class="drawer-footer">
          <div v-if="!rail" class="user-info">
            <div class="user-avatar">
              {{ userName.charAt(0).toUpperCase() }}
            </div>
            <div class="user-details">
              <div class="user-name" :title="userName">{{ userName }}</div>
              <div class="user-cab" :title="userCabang">{{ userCabang }}</div>
            </div>
          </div>
          <v-btn
            variant="text"
            size="small"
            color="error"
            @click="logout"
            class="logout-btn"
            :icon="rail"
          >
            <IconLogout :size="16" :stroke-width="1.8" />
            <span v-if="!rail" class="ml-1">Keluar</span>
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar flat class="finance-appbar" height="52">
      <v-btn variant="text" size="small" @click="rail = !rail" class="ml-1">
        <IconMenu2 :size="20" :stroke-width="1.8" />
      </v-btn>

      <v-app-bar-title>
        <span class="appbar-title">Sistem Keuangan</span>
      </v-app-bar-title>

      <template #append>
        <div class="appbar-user">
          <div class="appbar-avatar">
            {{ userName.charAt(0).toUpperCase() }}
          </div>
          <div class="appbar-info">
            <div class="appbar-name">{{ userName }}</div>
            <div class="appbar-cab">{{ userCabang }}</div>
          </div>
        </div>
        <v-btn
          variant="text"
          size="small"
          color="error"
          @click="logout"
          class="mr-2"
        >
          <IconLogout :size="17" :stroke-width="1.8" />
        </v-btn>
      </template>
    </v-app-bar>

    <v-main class="finance-main">
      <router-view />
    </v-main>
  </v-app>
</template>

<style scoped>
/* ── Drawer ── */
.finance-drawer {
  background: #1b5e20 !important;
  border-right: none !important;
}

.drawer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 10px;
  min-height: 64px;
  transition: padding 0.2s ease;
}

/* 👈 Tambahan styling untuk memusatkan logo saat rail aktif */
.rail-brand {
  padding-left: 0 !important;
  padding-right: 0 !important;
  justify-content: center !important;
}

/* 👈 Styling box putih (bisa diganti transparan) khusus logo */
.brand-logo {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.img-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px; /* Memberi jarak agar logo tidak nabrak tepi box */
}

.brand-title {
  font-size: 14px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.05em;
}
.brand-sub {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
}

/* Nav items */
.nav-icon {
  color: rgba(255, 255, 255, 0.65);
  flex-shrink: 0;
}
.nav-title {
  font-size: 12px !important;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}
.nav-group-header {
  cursor: pointer;
}
.nav-group-header:hover .nav-icon,
.nav-group-header:hover .nav-title {
  color: white !important;
  opacity: 1;
}

.nav-children {
  padding-left: 8px;
}
.nav-child-icon {
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}
.nav-child-title {
  font-size: 11px !important;
  color: rgba(255, 255, 255, 0.75);
}
.nav-child-item:hover .nav-child-icon,
.nav-child-item:hover .nav-child-title {
  color: white !important;
  opacity: 1;
}

/* Active state */
:deep(.nav-active) {
  background: rgba(255, 255, 255, 0.15) !important;
}
:deep(.nav-active .nav-icon),
:deep(.nav-active .nav-title),
:deep(.nav-active .nav-child-icon),
:deep(.nav-active .nav-child-title) {
  color: white !important;
  opacity: 1;
}

/* Drawer footer */
.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  gap: 8px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.user-name {
  font-size: 11px;
  font-weight: 600;
  color: white;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.2;
}
.user-cab {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
}
.logout-btn {
  color: rgba(255, 255, 255, 0.7) !important;
  flex-shrink: 0;
}
.logout-btn:hover {
  color: #ef9a9a !important;
}

/* ── App Bar ── */
.finance-appbar {
  background: white !important;
  border-bottom: 1px solid #c8e6c9 !important;
  box-shadow: 0 1px 4px rgba(46, 125, 50, 0.1) !important;
}
.appbar-title {
  font-size: 13px;
  font-weight: 600;
  color: #2e7d32;
}
.appbar-user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 4px;
}
.appbar-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #2e7d32;
  color: white;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.appbar-name {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.3;
}
.appbar-cab {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.45);
}

/* ── Main ── */
.finance-main {
  background-color: #f1f8f1 !important;
  min-height: 100vh;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.finance-drawer :deep(.v-list-item__content) {
  display: none;
}
.finance-drawer:not(.v-navigation-drawer--rail) :deep(.v-list-item__content) {
  display: flex;
}
.finance-drawer :deep(.v-list-item-title) {
  color: rgba(255, 255, 255, 0.85) !important;
}
</style>
