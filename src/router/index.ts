import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/authStore";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ── Auth ──────────────────────────────────────────────────────────
    {
      path: "/login",
      name: "Login",
      component: () => import("@/views/auth/LoginView.vue"),
      meta: { title: "Login", layout: "BlankLayout", requiresAuth: false },
    },

    // ── Dashboard ─────────────────────────────────────────────────────
    {
      path: "/",
      name: "Dashboard",
      component: () => import("@/views/dashboard/DashboardView.vue"),
      meta: { layout: "DefaultLayout", requiresAuth: true, title: "Dashboard" },
    },

    // ── Master ────────────────────────────────────────────────────────
    {
      path: "/master/cost-center",
      name: "MasterCostCenter",
      component: () => import("@/views/master/CostCenterView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "5",
        title: "Master Cost Center",
      },
    },
    {
      path: "/master/account",
      name: "MasterAccount",
      component: () => import("@/views/master/AccountView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "6",
        title: "Master Account",
      },
    },
    {
      path: "/master/kelompok",
      name: "MasterKelompok",
      component: () => import("@/views/master/KelompokView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "7",
        title: "Master Kelompok",
      },
    },
    {
      path: "/master/jenis-pembayaran",
      name: "MasterJenisPembayaran",
      component: () => import("@/views/master/JenisPembayaranView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "8",
        title: "Master Jenis Pembayaran",
      },
    },

    // ── Transaksi ─────────────────────────────────────────────────────
    {
      path: "/transaksi/uang-muka",
      name: "UangMukaBrowse",
      component: () => import("@/views/transaksi/UangMukaView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "21",
        title: "Uang Muka / Kasbon",
      },
    },
    {
      path: "/transaksi/uang-muka/create",
      name: "UangMukaCreate",
      component: () => import("@/views/transaksi/UangMukaFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "21",
        title: "Tambah Kasbon",
        browseRoute: "UangMukaBrowse",
      },
    },
    {
      path: "/transaksi/uang-muka/edit/:nomor",
      name: "UangMukaEdit",
      component: () => import("@/views/transaksi/UangMukaFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "21",
        title: "Ubah Kasbon",
        browseRoute: "UangMukaBrowse",
      },
    },
    {
      path: "/transaksi/uang-muka/selesai/:nomor",
      name: "UangMukaSelesai",
      component: () =>
        import("@/views/transaksi/UangMukaPenyelesaianFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "21",
        title: "Penyelesaian Kasbon",
        browseRoute: "UangMukaBrowse",
      },
    },
    {
      path: "/transaksi/uang-muka/print/:nomor",
      name: "UangMukaPrint",
      component: () => import("@/views/transaksi/UangMukaPrintView.vue"),
      meta: {
        layout: "BlankLayout",
        requiresAuth: true,
        title: "Cetak Kasbon",
      },
    },
    {
      path: "/transaksi/uang-muka/print-selesai/:nomor",
      name: "UangMukaPrintSelesai",
      component: () =>
        import("@/views/transaksi/UangMukaPenyelesaianPrintView.vue"),
      meta: {
        layout: "BlankLayout",
        requiresAuth: true,
        title: "Cetak Penyelesaian",
      },
    },
    // BKM
    {
      path: "/transaksi/bkm",
      name: "BkmBrowse",
      component: () => import("@/views/transaksi/BkmView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "23",
        title: "Bukti Kas Masuk",
      },
    },
    {
      path: "/transaksi/bkm/create",
      name: "BkmCreate",
      component: () => import("@/views/transaksi/BkmFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "23",
        title: "Tambah BKM",
        browseRoute: "BkmBrowse",
      },
    },
    {
      path: "/transaksi/bkm/edit/:nomor",
      name: "BkmEdit",
      component: () => import("@/views/transaksi/BkmFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "23",
        title: "Ubah BKM",
        browseRoute: "BkmBrowse",
      },
    },
    {
      path: "/transaksi/bkm/print/:nomor",
      name: "BkmPrint",
      component: () => import("@/views/transaksi/BkmPrintView.vue"),
      meta: { layout: "BlankLayout", requiresAuth: true, title: "Cetak BKM" },
    },
    // BKK
    {
      path: "/transaksi/bkk",
      name: "BkkBrowse",
      component: () => import("@/views/transaksi/BkkView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "22",
        title: "Bukti Kas Keluar",
      },
    },
    {
      path: "/transaksi/bkk/create",
      name: "BkkCreate",
      component: () => import("@/views/transaksi/BkkFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "22",
        title: "Tambah BKK",
        browseRoute: "BkkBrowse",
      },
    },
    {
      path: "/transaksi/bkk/edit/:nomor",
      name: "BkkEdit",
      component: () => import("@/views/transaksi/BkkFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "22",
        title: "Ubah BKK",
        browseRoute: "BkkBrowse",
      },
    },
    {
      path: "/transaksi/bkk/print/:nomor",
      name: "BkkPrint",
      component: () => import("@/views/transaksi/BkkPrintView.vue"),
      meta: { layout: "BlankLayout", requiresAuth: true, title: "Cetak BKK" },
    },
    // BBM
    {
      path: "/transaksi/bbm",
      name: "BbmBrowse",
      component: () => import("@/views/transaksi/BbmView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "25",
        title: "Bukti Bank Masuk",
      },
    },
    {
      path: "/transaksi/bbm/create",
      name: "BbmCreate",
      component: () => import("@/views/transaksi/BbmFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "25",
        title: "Tambah BBM",
        browseRoute: "BbmBrowse",
      },
    },
    {
      path: "/transaksi/bbm/edit/:nomor",
      name: "BbmEdit",
      component: () => import("@/views/transaksi/BbmFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "25",
        title: "Ubah BBM",
        browseRoute: "BbmBrowse",
      },
    },
    {
      path: "/transaksi/bbm/print/:nomor",
      name: "BbmPrint",
      component: () => import("@/views/transaksi/BbmPrintView.vue"),
      meta: { layout: "BlankLayout", requiresAuth: true, title: "Cetak BBM" },
    },
    // BBK
    {
      path: "/transaksi/bbk",
      name: "BbkBrowse",
      component: () => import("@/views/transaksi/BbkView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "24",
        title: "Bukti Bank Keluar",
      },
    },
    {
      path: "/transaksi/bbk/create",
      name: "BbkCreate",
      component: () => import("@/views/transaksi/BbkFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "24",
        title: "Tambah BBK",
        browseRoute: "BbkBrowse",
      },
    },
    {
      path: "/transaksi/bbk/edit/:nomor",
      name: "BbkEdit",
      component: () => import("@/views/transaksi/BbkFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "24",
        title: "Ubah BBK",
        browseRoute: "BbkBrowse",
      },
    },
    {
      path: "/transaksi/bbk/print/:nomor",
      name: "BbkPrint",
      component: () => import("@/views/transaksi/BbkPrintView.vue"),
      meta: { layout: "BlankLayout", requiresAuth: true, title: "Cetak BBK" },
    },
    // Jurnal Umum
    {
      path: "/transaksi/jurnal-umum",
      name: "JurnalUmumBrowse",
      component: () => import("@/views/transaksi/JurnalUmumView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "26",
        title: "Jurnal Umum",
      },
    },
    {
      path: "/transaksi/jurnal-umum/create",
      name: "JurnalUmumCreate",
      component: () => import("@/views/transaksi/JurnalUmumFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "26",
        title: "Tambah Jurnal Umum",
        browseRoute: "JurnalUmumBrowse",
      },
    },
    {
      path: "/transaksi/jurnal-umum/edit/:nomor",
      name: "JurnalUmumEdit",
      component: () => import("@/views/transaksi/JurnalUmumFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "26",
        title: "Ubah Jurnal Umum",
        browseRoute: "JurnalUmumBrowse",
      },
    },
    // Rekonsiliasi Bank
    {
      path: "/transaksi/rekonsiliasi-bank",
      name: "RekonsiliasiBankBrowse",
      component: () => import("@/views/transaksi/RekonsiliasiBankView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "27",
        title: "Rekonsiliasi Bank",
      },
    },
    // },
    // Pengajuan Transfer
    {
      path: "/transaksi/pengajuan-transfer",
      name: "PengajuanTransferBrowse",
      component: () => import("@/views/transaksi/PengajuanTransferView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "28",
        title: "Pengajuan Transfer",
      },
    },
    {
      path: "/transaksi/pengajuan-transfer/create",
      name: "PengajuanTransferCreate",
      component: () =>
        import("@/views/transaksi/PengajuanTransferFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "28",
        title: "Baru Pengajuan Transfer",
        browseRoute: "PengajuanTransferBrowse",
      },
    },
    {
      path: "/transaksi/pengajuan-transfer/edit/:nomor",
      name: "PengajuanTransferEdit",
      component: () =>
        import("@/views/transaksi/PengajuanTransferFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "28",
        title: "Ubah Pengajuan Transfer",
        browseRoute: "PengajuanTransferBrowse",
      },
    },
    {
      path: "/transaksi/pengajuan-transfer/realisasi/:nomor",
      name: "PengajuanTransferRealisasi",
      component: () =>
        import("@/views/transaksi/PengajuanTransferFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "28",
        title: "Realisasi Pengajuan Transfer",
        browseRoute: "PengajuanTransferBrowse",
        isRealisasi: true,
      },
    },
    {
      path: "/transaksi/pengajuan-transfer/print/:nomor",
      name: "PengajuanTransferPrint",
      component: () =>
        import("@/views/transaksi/PengajuanTransferPrintView.vue"),
      meta: {
        layout: "BlankLayout",
        requiresAuth: true,
        title: "Cetak Pengajuan Transfer",
      },
    },
    // Terima Setoran
    {
      path: "/transaksi/terima-setoran",
      name: "TerimaSetoranBrowse",
      component: () => import("@/views/transaksi/TerimaSetoranView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "29",
        title: "Terima Setoran",
      },
    },
    // {
    //   path: "/transaksi/terima-setoran/form/:nomor",
    //   name: "TerimaSetoranForm",
    //   component: () => import("@/views/transaksi/TerimaSetoranFormView.vue"),
    //   meta: { requiresAuth: true, menuId: 29 },
    // },

    // ── Posting ───────────────────────────────────────────────────────
    // {
    //   path: "/posting/pembayaran-customer",
    //   name: "PembayaranCustomer",
    //   component: () => import("@/views/posting/PembayaranCustomerView.vue"),
    //   meta: {
    //     layout: "DefaultLayout",
    //     requiresAuth: true,
    //     menuId: "20",
    //     title: "Pembayaran Customer",
    //   },
    // },
    // {
    //   path: "/posting/pembayaran-customer-kaosan",
    //   name: "PembayaranCustomerKaosan",
    //   component: () =>
    //     import("@/views/posting/PembayaranCustomerKaosanView.vue"),
    //   meta: {
    //     layout: "DefaultLayout",
    //     requiresAuth: true,
    //     menuId: "21",
    //     title: "Pembayaran Customer Kaosan",
    //   },
    // },

    // // ── Laporan ───────────────────────────────────────────────────────
    // {
    //   path: "/laporan/list-jurnal",
    //   name: "LapListJurnal",
    //   component: () => import("@/views/laporan/ListJurnalView.vue"),
    //   meta: {
    //     layout: "DefaultLayout",
    //     requiresAuth: true,
    //     menuId: "30",
    //     title: "List Jurnal",
    //   },
    // },
    // {
    //   path: "/laporan/buku-besar",
    //   name: "LapBukuBesar",
    //   component: () => import("@/views/laporan/BukuBesarView.vue"),
    //   meta: {
    //     layout: "DefaultLayout",
    //     requiresAuth: true,
    //     menuId: "31",
    //     title: "Buku Besar",
    //   },
    // },
    // {
    //   path: "/laporan/kasbon-belum-selesai",
    //   name: "LapKasbonBelumSelesai",
    //   component: () => import("@/views/laporan/KasbonBelumSelesaiView.vue"),
    //   meta: {
    //     layout: "DefaultLayout",
    //     requiresAuth: true,
    //     menuId: "32",
    //     title: "Kasbon Belum Selesai",
    //   },
    // },
    // {
    //   path: "/laporan/rekonsiliasi-bank",
    //   name: "LapRekonsiliasi",
    //   component: () => import("@/views/laporan/LapRekonsiliasiBankView.vue"),
    //   meta: {
    //     layout: "DefaultLayout",
    //     requiresAuth: true,
    //     menuId: "33",
    //     title: "Laporan Rekonsiliasi Bank",
    //   },
    // },
    // {
    //   path: "/laporan/stok-finance",
    //   name: "LapStokFinance",
    //   component: () => import("@/views/laporan/StokFinanceView.vue"),
    //   meta: {
    //     layout: "DefaultLayout",
    //     requiresAuth: true,
    //     menuId: "34",
    //     title: "Stok Finance",
    //   },
    // },

    // // ── Tools ─────────────────────────────────────────────────────────
    // {
    //   path: "/tools/users",
    //   name: "MasterUser",
    //   component: () => import("@/views/tools/UserView.vue"),
    //   meta: {
    //     layout: "DefaultLayout",
    //     requiresAuth: true,
    //     title: "Master User",
    //   },
    // },

    // ── Error Pages ───────────────────────────────────────────────────
    {
      path: "/403",
      name: "Unauthorized",
      component: () => import("@/views/errors/UnauthorizedView.vue"),
      meta: {
        layout: "BlankLayout",
        requiresAuth: false,
        title: "Akses Ditolak",
      },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      component: () => import("@/views/errors/NotFoundView.vue"),
      meta: {
        layout: "BlankLayout",
        requiresAuth: false,
        title: "Halaman Tidak Ditemukan",
      },
    },
  ],
});

// ── Navigation Guard ──────────────────────────────────────────────────
router.beforeEach((to) => {
  const authStore = useAuthStore();
  document.title = `${String(to.meta?.title || to.name || "Finance")} — FINANCE`;

  if (to.meta.requiresAuth && !authStore.isAuthenticated)
    return { name: "Login" };

  if (to.name === "Login" && authStore.isAuthenticated)
    return { name: "Dashboard" };

  // Hanya cek permission kalau menus sudah ada isinya
  const menuId = to.meta.menuId as string | undefined;
  if (menuId && authStore.user?.menus?.length && !authStore.can(menuId, "view"))
    return { name: "Unauthorized", query: { from: to.fullPath } };
});

export default router;
