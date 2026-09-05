import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { authApi, type AuthUser, type MenuPermission } from "@/api/authApi";

const TOKEN_KEY = "finance_token";
const USER_KEY = "finance_user";
const ACTIVE_CABANG_KEY = "finance_active_cabang";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<AuthUser | null>(
    (() => {
      try {
        return JSON.parse(localStorage.getItem(USER_KEY) || "null");
      } catch {
        return null;
      }
    })(),
  );

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.level === "ADMIN");
  const userName = computed(() => user.value?.nama || "");
  const userKode = computed(() => user.value?.kode || "");
  const userCabang = computed(() => user.value?.cabang || "");

  // ── Cabang aktif — untuk lihat dashboard/laporan cabang lain ─────────
  const activeCabang = ref<string>(
    localStorage.getItem(ACTIVE_CABANG_KEY) || user.value?.cabang || "",
  );

  const cabangOptions = computed(() => user.value?.cabangList ?? []);
  const canSwitchCabang = computed(() => cabangOptions.value.length > 1);

  const setActiveCabang = (cabang: string) => {
    if (!cabangOptions.value.includes(cabang)) return;
    activeCabang.value = cabang;
    localStorage.setItem(ACTIVE_CABANG_KEY, cabang);
  };

  const can = (
    menuId: string,
    action: "view" | "insert" | "edit" | "delete" | "print" = "view",
  ): boolean => {
    if (isAdmin.value) return true;
    if (!user.value?.menus?.length) return true;

    const menu = user.value.menus.find(
      (m) => String(m.menu_id) === String(menuId),
    );
    if (!menu) return false;
    const col = {
      view: "hak_view",
      insert: "hak_insert",
      edit: "hak_edit",
      delete: "hak_delete",
      print: "hak_print",
    }[action] as keyof MenuPermission;
    return menu[col] === "Y";
  };

  const login = async (username: string, password: string) => {
    const result = await authApi.login({ username, password });
    token.value = result.token;
    user.value = result.user;
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));

    // Reset cabang aktif ke cabang login setiap kali login baru
    activeCabang.value = result.user.cabang;
    localStorage.setItem(ACTIVE_CABANG_KEY, result.user.cabang);
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_CABANG_KEY);
  };

  const refreshUser = async () => {
    try {
      const fresh = await authApi.me();
      user.value = fresh;
      localStorage.setItem(USER_KEY, JSON.stringify(fresh));
    } catch {
      logout();
    }
  };

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    userName,
    userKode,
    userCabang,
    activeCabang, // ← baru
    cabangOptions, // ← baru
    canSwitchCabang, // ← baru
    setActiveCabang, // ← baru
    can,
    login,
    logout,
    refreshUser,
  };
});
