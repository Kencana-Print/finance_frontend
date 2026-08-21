<script setup lang="ts">
import { ref } from "vue";
import PageLayout from "@/components/PageLayout.vue";
import {
  IconDeviceFloppy,
  IconX,
  IconAlertTriangle,
  IconCircleX,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-vue";

const props = defineProps<{
  title: string;
  menuId: string;
  icon?: any;
  isLoading?: boolean;
  isSaving?: boolean;
  itemName?: string;
  isEditMode?: boolean;
}>();

const showSaveDialog = defineModel<boolean>("showSaveDialog");
const showCancelDialog = defineModel<boolean>("showCancelDialog");
const showCloseDialog = defineModel<boolean>("showCloseDialog");

const emit = defineEmits([
  "validate-save",
  "confirm-save",
  "confirm-cancel",
  "confirm-close",
]);

// ── Collapse kolom kiri — memberi ruang lebih ke tabel di right-column ──
const leftCollapsed = ref(false);
</script>

<template>
  <PageLayout :title="title" :icon="icon" :menu-id="menuId" desktop-mode>
    <template #header-actions>
      <v-btn
        size="small"
        color="primary"
        @click="emit('validate-save')"
        :loading="isSaving"
      >
        <template #prepend
          ><IconDeviceFloppy :size="14" :stroke-width="1.8"
        /></template>
        Simpan
      </v-btn>
      <v-btn size="small" variant="outlined" @click="showCancelDialog = true">
        Batal
      </v-btn>
      <v-btn
        size="small"
        variant="tonal"
        color="error"
        @click="showCloseDialog = true"
      >
        <template #prepend><IconX :size="14" :stroke-width="2.2" /></template>
        Tutup
      </v-btn>
    </template>

    <v-overlay
      :model-value="isLoading"
      class="align-center justify-center"
      persistent
      scroll-strategy="none"
    >
      <v-progress-circular indeterminate color="primary" size="56" />
    </v-overlay>

    <div
      v-if="!isLoading"
      :class="[
        'form-grid-container',
        $slots['left-column'] &&
        $slots['center-column'] &&
        $slots['right-column']
          ? 'three-column'
          : $slots['left-column'] && $slots['right-column']
            ? 'two-column'
            : !$slots['left-column'] && $slots['right-column']
              ? 'single-column'
              : 'custom-layout',
        { 'left-collapsed': leftCollapsed },
      ]"
    >
      <template v-if="$slots['left-column'] || $slots['right-column']">
        <aside class="left-column" v-if="$slots['left-column']">
          <slot name="left-column" />
        </aside>

        <!-- Toggle handle — muncul hanya jika ada left-column -->
        <button
          v-if="$slots['left-column']"
          type="button"
          class="collapse-toggle"
          :class="{ collapsed: leftCollapsed }"
          :title="
            leftCollapsed ? 'Tampilkan panel info' : 'Sembunyikan panel info'
          "
          @click="leftCollapsed = !leftCollapsed"
        >
          <IconChevronLeft
            v-if="!leftCollapsed"
            :size="14"
            :stroke-width="2.2"
          />
          <IconChevronRight v-else :size="14" :stroke-width="2.2" />
        </button>

        <main class="center-column" v-if="$slots['center-column']">
          <slot name="center-column" />
        </main>
        <main class="right-column" v-if="$slots['right-column']">
          <slot name="right-column" />
        </main>
      </template>
      <template v-else>
        <main class="full-column"><slot /></main>
      </template>
    </div>

    <!-- Dialog Simpan -->
    <v-dialog v-model="showSaveDialog" max-width="400px">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-4"
          >Konfirmasi Simpan</v-card-title
        >
        <v-card-text class="pa-4 pt-0">
          Yakin ingin menyimpan
          {{ itemName ? `data ${itemName}` : "data ini" }}?
          <slot name="dialog-warning" />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showSaveDialog = false">Batal</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="emit('confirm-save')"
            :loading="isSaving"
            >Ya, Simpan</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Batal -->
    <v-dialog v-model="showCancelDialog" max-width="400px">
      <v-card rounded="lg">
        <v-card-title
          class="text-body-1 font-weight-bold pa-4 d-flex align-center gap-2"
        >
          <IconAlertTriangle :size="18" :stroke-width="1.8" color="#f57c00" />
          Konfirmasi Batal
        </v-card-title>
        <v-card-text class="pa-4 pt-0">
          Yakin ingin membatalkan perubahan?
          <span v-if="!isEditMode">Form akan dikosongkan.</span>
          <span v-else>Data akan dikembalikan ke kondisi semula.</span>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showCancelDialog = false">Tidak</v-btn>
          <v-btn color="warning" variant="flat" @click="emit('confirm-cancel')">
            Ya, Batalkan
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Tutup -->
    <v-dialog v-model="showCloseDialog" max-width="400px">
      <v-card rounded="lg">
        <v-card-title
          class="text-body-1 font-weight-bold pa-4 d-flex align-center gap-2"
        >
          <IconCircleX :size="18" :stroke-width="1.8" color="#c62828" />
          Konfirmasi Tutup
        </v-card-title>
        <v-card-text class="pa-4 pt-0"
          >Yakin ingin keluar? Pastikan data sudah disimpan.</v-card-text
        >
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showCloseDialog = false">Batal</v-btn>
          <v-btn color="error" variant="flat" @click="emit('confirm-close')"
            >Ya, Keluar</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </PageLayout>
</template>

<style scoped>
.form-grid-container :deep(*) {
  font-size: 11px !important;
}
.form-grid-container {
  padding: 12px;
  height: calc(100vh - 120px);
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  background: #f1f8f1;
  position: relative;
  transition:
    grid-template-columns 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    gap 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.form-grid-container.three-column {
  grid-template-columns: 280px 1fr 200px;
}
.form-grid-container.single-column {
  grid-template-columns: 1fr;
}
.form-grid-container.custom-layout {
  display: block;
  padding: 0;
  height: calc(100vh - 120px);
  overflow: hidden;
}

/* ── Collapsed state — kolom kiri hilang, kanan mengisi penuh ── */
.form-grid-container.left-collapsed {
  grid-template-columns: 0px 1fr !important;
  gap: 0 !important;
}
.form-grid-container.left-collapsed.three-column {
  grid-template-columns: 0px 1fr 200px !important;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.left-column {
  overflow: hidden;
  transition: opacity 0.2s ease;
}
.form-grid-container.left-collapsed .left-column {
  opacity: 0;
  pointer-events: none;
}
.right-column {
  flex-grow: 1;
  overflow: hidden;
  min-width: 0;
}
.center-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex-grow: 1;
}
.full-column {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* ── Toggle button — nempel di tepi kiri right-column ── */
.collapse-toggle {
  position: absolute;
  top: 4px;
  left: 328px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #c8e6c9;
  background: white;
  color: #2e7d32;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.collapse-toggle:hover {
  background: #f0fdf4;
}
.collapse-toggle.collapsed {
  left: 4px;
}

/* Section card di dalam form — Finance pakai garis hijau */
:deep(.desktop-form-section) {
  padding: 14px 16px;
  border: 1px solid #c8e6c9;
  border-radius: 8px;
  background: white !important;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(46, 125, 50, 0.08) !important;
}
:deep(.header-section) {
  border-top: 3px solid #2e7d32 !important;
}

.form-left-col {
  overflow-y: auto;
  height: 100%;
  min-height: 0;
}

/* ── Responsif ── */
@media (max-width: 1280px) {
  .form-grid-container {
    grid-template-columns: 280px 1fr;
    gap: 12px;
    padding: 10px;
    height: calc(100vh - 110px);
  }
  .form-grid-container.three-column {
    grid-template-columns: 240px 1fr 180px;
  }
  .collapse-toggle {
    left: 288px;
  }
}

@media (max-width: 1024px) {
  .form-grid-container {
    grid-template-columns: 1fr !important;
    grid-template-rows: auto;
    height: auto;
    min-height: calc(100vh - 110px);
    overflow-y: auto;
    padding: 8px;
    gap: 10px;
  }
  .form-grid-container.three-column {
    grid-template-columns: 1fr !important;
  }
  .full-column {
    height: auto;
    min-height: 400px;
    overflow: visible;
  }
  .left-column {
    min-height: unset;
  }
  .right-column {
    min-width: unset;
  }
  :deep(.desktop-form-section) {
    padding: 10px 12px;
    margin-bottom: 8px;
  }
  .collapse-toggle {
    display: none; /* di layar sempit, kolom sudah stack vertikal */
  }
}

@media (max-width: 768px) {
  .form-grid-container {
    padding: 4px;
    gap: 6px;
  }
  .form-grid-container :deep(*) {
    font-size: 10px !important;
  }
  :deep(.desktop-form-section) {
    padding: 8px 10px;
    margin-bottom: 6px;
    border-radius: 6px;
  }
}
</style>
