<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import { IconList } from "@tabler/icons-vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { kelompokApi, type Kelompok } from "@/api/master/kelompokApi";
import { exportKelompok } from "@/utils/exportExcel";

const MENU_ID = "7";
const toast = useToast();

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
} = useBrowse<Kelompok>({ menuId: MENU_ID, fetchApi: kelompokApi.getAll });

const headers = [
  { title: "Kode", key: "kode", width: "80px", align: "center" },
  { title: "Nama", key: "nama", minWidth: "200px" },
  {
    title: "Keterangan (D/K)",
    key: "keterangan",
    width: "130px",
    align: "center",
  },
];

// ── Dialog ───────────────────────────────────────────────────────────
const dialog = ref(false);
const dialogTitle = ref("");
const isSaving = ref(false);

const emptyForm = () => ({ isEdit: false, kode: "", nama: "", keterangan: "" });
const form = ref(emptyForm());

const openCreate = () => {
  form.value = emptyForm();
  dialogTitle.value = "Tambah Kelompok";
  dialog.value = true;
};

const openEdit = async (item: Kelompok) => {
  try {
    const d = await kelompokApi.getById(item.kode);
    form.value = {
      isEdit: true,
      kode: d.kode,
      nama: d.nama,
      keterangan: d.keterangan,
    };
    dialogTitle.value = "Ubah Kelompok";
    dialog.value = true;
  } catch (e: any) {
    if (e?.isAuthExpired) return; // ← skip toast, dialog sudah muncul
    toast.error(e.response?.data?.message ?? "Gagal memuat data.");
  }
};

const handleSave = async () => {
  if (!form.value.kode.trim()) {
    toast.warning("Kode harus diisi.");
    return;
  }
  if (!form.value.nama.trim()) {
    toast.warning("Nama harus diisi.");
    return;
  }

  isSaving.value = true;
  try {
    await kelompokApi.save(form.value);
    toast.success("Berhasil disimpan.");
    dialog.value = false;
    await fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

const handleDelete = async (item: Kelompok) => {
  try {
    await kelompokApi.delete(item.kode);
    toast.success("Berhasil dihapus.");
    await fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal menghapus.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Master Kelompok Account"
    :menu-id="MENU_ID"
    :icon="IconList"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    :selected="selected"
    @update:selected="selected = $event"
    item-value="kode"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :export-fn="() => exportKelompok(items ?? [])"
    search-placeholder="Cari kelompok..."
    @refresh="fetchData"
    @add="openCreate"
    @edit="openEdit"
    @delete="handleDelete"
  >
    <!-- Badge D/K -->
    <template #item.keterangan="{ item }">
      <span
        v-if="item.keterangan"
        :style="{
          background: item.keterangan === 'D' ? '#e3f2fd' : '#fce4ec',
          color: item.keterangan === 'D' ? '#1565c0' : '#c62828',
          padding: '1px 10px',
          borderRadius: '3px',
          fontSize: '11px',
          fontWeight: 700,
        }"
      >
        {{ item.keterangan === "D" ? "D = Debet" : "K = Kredit" }}
      </span>
    </template>
  </BaseBrowse>

  <!-- ── Dialog Form ── -->
  <v-dialog v-model="dialog" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="d-flex align-center gap-2 pa-4 pb-2"
        style="font-size: 14px; font-weight: 700; border-top: 3px solid #2e7d32"
      >
        <IconList :size="18" :stroke-width="1.8" color="#2e7d32" />
        {{ dialogTitle }}
      </v-card-title>

      <v-card-text class="pa-4 pt-3">
        <div class="form-grid">
          <div class="form-row">
            <label class="form-label">Kode <span class="req">*</span></label>
            <v-text-field
              v-model="form.kode"
              density="compact"
              variant="outlined"
              hide-details
              :disabled="form.isEdit"
              placeholder="Contoh: 1"
            />
          </div>
          <div class="form-row">
            <label class="form-label">Nama <span class="req">*</span></label>
            <v-text-field
              v-model="form.nama"
              density="compact"
              variant="outlined"
              hide-details
              placeholder="Nama kelompok"
            />
          </div>
          <div class="form-row">
            <label class="form-label">Keterangan (D=Debet / K=Kredit)</label>
            <v-select
              v-model="form.keterangan"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              :items="[
                { title: 'D = Debet', value: 'D' },
                { title: 'K = Kredit', value: 'K' },
              ]"
              placeholder="Pilih D atau K"
            />
          </div>
        </div>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn variant="text" @click="dialog = false" :disabled="isSaving"
          >Batal</v-btn
        >
        <v-btn
          color="primary"
          variant="flat"
          @click="handleSave"
          :loading="isSaving"
          >Simpan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}
.req {
  color: red;
}
</style>
