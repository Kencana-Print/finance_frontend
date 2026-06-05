<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { isAuthExpiredError } from "@/api/axios";
import BaseForm from "@/components/BaseForm.vue";
import SearchModal from "@/components/SearchModal.vue";
import {
  IconBuildingBank,
  IconSearch,
  IconPlus,
  IconTrash,
  IconPrinter,
} from "@tabler/icons-vue";
import { bbmFormApi, type BbmFormDetail } from "@/api/transaksi/bbmFormApi";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const MENU_ID = "25";
const isEdit = computed(() => !!route.params.nomor);
const isLoading = ref(false);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const showPrintDialog = ref(false);
const savedNomor = ref("");

const today = new Date().toISOString().slice(0, 10);

const form = ref({
  nomor: "",
  tanggal: today,
  rek_kode: "",
  rek_nama: "",
  penerima: "",
  nota: "",
  keterangan: "",
  cabang: authStore.userCabang || "P01",
  cabang_old: authStore.userCabang || "P01",
  detail: [] as BbmFormDetail[],
});

const originalForm = ref<any>(null);

// ── Lookup ─────────────────────────────────────────────────────────────
const accountOptions = ref<
  { kode: string; nama: string; cabang: string; rekening: string }[]
>([]);
const ccOptions = ref<{ kode: number; nama: string }[]>([]);
const accountAllOptions = ref<{ kode: string; nama: string; cabang: string }[]>(
  [],
);

// ── Total ─────────────────────────────────────────────────────────────
const totalBbm = computed(() =>
  form.value.detail.reduce((s, d) => s + (Number(d.nominal) || 0), 0),
);
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

// ── onMounted ─────────────────────────────────────────────────────────
onMounted(async () => {
  isLoading.value = true;
  try {
    const [acc, cc, accAll] = await Promise.all([
      bbmFormApi.getAccountOptions(authStore.userCabang || "P01"),
      bbmFormApi.getCostCenterOptions(),
      bbmFormApi.getAccountAll(),
    ]);
    accountOptions.value = acc;
    ccOptions.value = cc;
    accountAllOptions.value = accAll;

    if (!isEdit.value) {
      if (acc.length) {
        form.value.rek_kode = acc[0].kode;
        form.value.rek_nama = acc[0].nama;
        form.value.cabang =
          acc[0].cabang === "P02" || acc[0].cabang === "P04"
            ? acc[0].cabang
            : "P01";
      }
      addRow();
    } else {
      const d = await bbmFormApi.getDetailForm(
        decodeURIComponent(route.params.nomor as string),
      );
      Object.assign(form.value, d);
      originalForm.value = JSON.parse(JSON.stringify(form.value));
      await nextTick();
    }
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal memuat data.");
    router.back();
  } finally {
    isLoading.value = false;
  }
});

// ── Account Header ────────────────────────────────────────────────────
const showAccountModal = ref(false);
const selectAccount = (acc: any) => {
  form.value.rek_kode = acc.kode;
  form.value.rek_nama = acc.nama;
  form.value.cabang =
    acc.cabang === "P02" || acc.cabang === "P04" ? acc.cabang : "P01";
  showAccountModal.value = false;
};

// ── Account Detail ────────────────────────────────────────────────────
const showDetAccountModal = ref(false);
const activeDetAccIdx = ref(-1);

const openDetAccountModal = (idx: number) => {
  activeDetAccIdx.value = idx;
  showDetAccountModal.value = true;
};
const selectDetAccount = (acc: any) => {
  if (activeDetAccIdx.value < 0) return;
  const d = form.value.detail[activeDetAccIdx.value];
  if (acc.kode === form.value.rek_kode) {
    toast.warning("Account tidak boleh sama dengan Account header.");
    return;
  }
  d.rekkode = acc.kode;
  d.reknama = acc.nama;
  showDetAccountModal.value = false;
};

// ── Cost Center ───────────────────────────────────────────────────────
const showCcModal = ref(false);
const activeCcIdx = ref(-1);

const openCcModal = (idx: number) => {
  activeCcIdx.value = idx;
  showCcModal.value = true;
};
const selectCc = (cc: any) => {
  if (activeCcIdx.value < 0) return;
  const d = form.value.detail[activeCcIdx.value];
  const oldCc = d.cckode;
  d.cckode = cc.kode;
  d.ccnama = cc.nama;
  if (oldCc !== cc.kode) d.dcnama = "";
  showCcModal.value = false;
};

// ── Detail CC ─────────────────────────────────────────────────────────
const showDcModal = ref(false);
const activeDcIdx = ref(-1);
const dcOptions = ref<{ kode: number; nama: string }[]>([]);

const openDcModal = async (idx: number) => {
  const d = form.value.detail[idx];
  if (!d.cckode) {
    toast.warning("Pilih Cost Center dahulu.");
    return;
  }
  activeDcIdx.value = idx;
  dcOptions.value = await bbmFormApi.getDcOptions(d.cckode);
  showDcModal.value = true;
};
const selectDc = (dc: any) => {
  if (activeDcIdx.value < 0) return;
  form.value.detail[activeDcIdx.value].dcnama = dc.nama;
  form.value.detail[activeDcIdx.value].dckode = dc.kode;
  showDcModal.value = false;
};

// ── Baris Detail ──────────────────────────────────────────────────────
const addRow = () => {
  form.value.detail.push({
    no: form.value.detail.length + 1,
    uraian: "",
    nominal: 0,
    rekkode: "",
    reknama: "",
    cckode: 0,
    ccnama: "",
    dcnama: "",
    dckode: 0,
  });
};
const removeRow = (idx: number) => {
  form.value.detail.splice(idx, 1);
};

// ── Validasi ──────────────────────────────────────────────────────────
// Delphi: skip validasi reknama & DC jika uraian mengandung SALDO atau PENYESUAIAN
const isSaldoPenyesuaian = (uraian: string) => {
  const u = uraian.toUpperCase();
  return u.includes("SALDO") || u.includes("PENYESUAIAN");
};

const validateSave = () => {
  // Delphi BBM: TIDAK ada cek cabang (berbeda dari BKM)

  if (!form.value.rek_kode || !form.value.rek_nama) {
    toast.warning("Kode dan Nama Account harus diisi.");
    return;
  }

  const filled = form.value.detail.filter((d) => d.uraian.trim());
  if (!filled.length) {
    toast.warning("Detail harus diisi.");
    return;
  }
  if (totalBbm.value === 0) {
    toast.warning("Total BBM kosong. Tidak bisa disimpan.");
    return;
  }

  for (const d of filled) {
    if (isSaldoPenyesuaian(d.uraian)) continue;

    if (!d.reknama) {
      toast.warning("Nama Account harus diisi.");
      return;
    }
    const prefix = (d.rekkode || "").substring(0, 1);
    if (prefix !== "A" && prefix !== "B") {
      if (d.dckode === 0) {
        const msg = !d.dcnama.trim()
          ? `Detail CC harus diisi pada baris: ${d.uraian}`
          : `Detail CC harus diisi dengan benar pada baris: ${d.uraian}`;
        toast.warning(msg);
        return;
      }
    }
  }

  showSaveDialog.value = true;
};

const confirmSave = async () => {
  isSaving.value = true;
  try {
    const res = await bbmFormApi.save({ ...form.value, isEdit: isEdit.value });
    savedNomor.value = res.data.nomor;
    showSaveDialog.value = false;
    showPrintDialog.value = true;
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

const cetakBbm = () => {
  window.open(
    `/transaksi/bbm/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  router.push({ name: "BbmBrowse" });
};
const skipCetak = () => {
  showPrintDialog.value = false;
  router.push({ name: "BbmBrowse" });
};

const confirmCancel = () => {
  showCancelDialog.value = false;
  if (isEdit.value && originalForm.value) {
    Object.assign(form.value, JSON.parse(JSON.stringify(originalForm.value)));
  } else {
    form.value.nomor = "";
    form.value.tanggal = today;
    form.value.penerima = "";
    form.value.nota = "";
    form.value.keterangan = "";
    form.value.detail = [];
    addRow();
  }
};
const confirmClose = () => {
  showCloseDialog.value = false;
  router.push({ name: "BbmBrowse" });
};
</script>

<template>
  <BaseForm
    title="Bukti Bank Masuk (BBM)"
    :menu-id="MENU_ID"
    :icon="IconBuildingBank"
    :is-loading="isLoading"
    :is-saving="isSaving"
    :is-edit-mode="isEdit"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="confirmSave"
    @confirm-cancel="confirmCancel"
    @confirm-close="confirmClose"
  >
    <!-- ── LEFT COLUMN ── -->
    <template #left-column>
      <div
        class="desktop-form-section header-section"
        style="
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 6px;
        "
      >
        <div class="section-title">Informasi BBM</div>

        <div class="field-row">
          <label class="field-lbl">Nomor BBM</label>
          <div class="d-flex align-center gap-2">
            <v-text-field
              :model-value="isEdit ? form.nomor : ''"
              density="compact"
              variant="outlined"
              hide-details
              readonly
              :placeholder="isEdit ? '' : 'Otomatis'"
            />
            <span
              v-if="!isEdit"
              style="
                font-size: 11px;
                color: #f57c00;
                font-weight: 600;
                white-space: nowrap;
              "
            >
              Baru = Otomatis
            </span>
          </div>
        </div>

        <div class="field-row">
          <label class="field-lbl">Tanggal</label>
          <v-text-field
            v-model="form.tanggal"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
          />
        </div>

        <!-- Account Header — tampilkan rekening jika ada -->
        <div class="field-row">
          <label class="field-lbl">Account <span class="req">*</span></label>
          <div class="d-flex gap-1">
            <v-text-field
              v-model="form.rek_kode"
              density="compact"
              variant="outlined"
              hide-details
              readonly
              style="max-width: 110px"
              placeholder="Kode"
            />
            <v-text-field
              v-model="form.rek_nama"
              density="compact"
              variant="outlined"
              hide-details
              readonly
              class="flex-1"
              placeholder="Nama account"
            />
            <v-btn
              size="small"
              icon
              variant="tonal"
              @click="showAccountModal = true"
            >
              <IconSearch :size="15" :stroke-width="1.8" />
            </v-btn>
          </div>
        </div>

        <div class="d-flex gap-2">
          <div class="field-row flex-1">
            <label class="field-lbl">Diterima Dari</label>
            <v-text-field
              v-model="form.penerima"
              density="compact"
              variant="outlined"
              hide-details
              placeholder="Nama pemberi"
            />
          </div>
          <div class="field-row flex-1">
            <label class="field-lbl">No. Nota</label>
            <v-text-field
              v-model="form.nota"
              density="compact"
              variant="outlined"
              hide-details
              placeholder="No. nota"
            />
          </div>
        </div>

        <!-- Keterangan — free text seperti BKM, bukan dropdown -->
        <div class="field-row">
          <label class="field-lbl">Keterangan</label>
          <v-text-field
            v-model="form.keterangan"
            density="compact"
            variant="outlined"
            hide-details
            placeholder="Keterangan penerimaan"
          />
        </div>

        <div class="field-row">
          <label class="field-lbl">Cabang</label>
          <v-text-field
            :model-value="form.cabang"
            density="compact"
            variant="outlined"
            hide-details
            readonly
          />
        </div>

        <div class="total-box mt-3">
          <span class="total-lbl">Total BBM</span>
          <span class="total-val">{{ fmt(totalBbm) }}</span>
        </div>
      </div>
    </template>

    <!-- ── RIGHT COLUMN ── -->
    <template #right-column>
      <div style="height: 100%; display: flex; flex-direction: column">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="section-title">Detail Penerimaan Bank</div>
          <v-btn size="small" color="primary" variant="tonal" @click="addRow">
            <template #prepend
              ><IconPlus :size="13" :stroke-width="2"
            /></template>
            Tambah Baris
          </v-btn>
        </div>

        <div class="detail-table-wrap">
          <table class="detail-table">
            <thead>
              <tr>
                <th style="width: 35px">No</th>
                <th style="min-width: 220px">Uraian</th>
                <th style="width: 130px">Nominal</th>
                <th style="min-width: 110px">Account</th>
                <th style="min-width: 160px">Nama Account</th>
                <th style="min-width: 120px">Cost Center</th>
                <th style="min-width: 120px">Detail CC</th>
                <th style="width: 28px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, idx) in form.detail" :key="idx">
                <td class="tc">{{ idx + 1 }}</td>

                <td>
                  <input
                    v-model="d.uraian"
                    class="cell-inp"
                    placeholder="Keterangan penerimaan"
                  />
                </td>

                <td>
                  <input
                    v-model.number="d.nominal"
                    type="number"
                    class="cell-inp tr"
                    style="min-width: 100px"
                  />
                </td>

                <td>
                  <div class="d-flex align-center gap-1">
                    <span
                      class="cell-text"
                      style="
                        max-width: 65px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      {{ d.rekkode || "-" }}
                    </span>
                    <button
                      type="button"
                      class="sup-btn"
                      @click.stop.prevent="openDetAccountModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <td>
                  <span class="cell-text">{{ d.reknama || "-" }}</span>
                </td>

                <td>
                  <div class="d-flex align-center gap-1">
                    <span
                      class="cell-text"
                      style="
                        max-width: 80px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      {{ d.ccnama || "-" }}
                    </span>
                    <button
                      type="button"
                      class="sup-btn"
                      @click.stop.prevent="openCcModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <td>
                  <div class="d-flex align-center gap-1">
                    <span
                      class="cell-text"
                      style="
                        max-width: 80px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      {{ d.dcnama || "-" }}
                    </span>
                    <button
                      type="button"
                      class="sup-btn"
                      @click.stop.prevent="openDcModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <td class="tc">
                  <button
                    class="del-btn"
                    type="button"
                    @click.prevent="removeRow(idx)"
                  >
                    <IconTrash :size="12" :stroke-width="1.8" />
                  </button>
                </td>
              </tr>
              <tr v-if="!form.detail.length">
                <td colspan="8" class="empty-td">
                  Belum ada item. Klik Tambah Baris.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- ── Dialog Cetak ── -->
  <v-dialog v-model="showPrintDialog" max-width="380" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #2e7d32"
      >
        <IconPrinter
          :size="16"
          :stroke-width="1.8"
          color="#2e7d32"
          style="margin-right: 6px"
        />
        Berhasil Disimpan
      </v-card-title>
      <v-card-text class="pa-4 pt-2" style="font-size: 12px">
        Nomor BBM: <strong>{{ savedNomor }}</strong
        ><br />
        Ingin mencetak BBM sekarang?
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-btn variant="text" @click="skipCetak">Tidak</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="cetakBbm">
          <template #prepend
            ><IconPrinter :size="14" :stroke-width="1.8"
          /></template>
          Cetak BBM
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal: Account Header ── -->
  <SearchModal
    v-model="showAccountModal"
    title="Pilih Account (BANK)"
    :columns="[
      { key: 'kode', title: 'Kode', width: '110px' },
      { key: 'nama', title: 'Nama Account' },
      { key: 'rekening', title: 'Rekening', width: '130px' },
      { key: 'cabang', title: 'Cabang', width: '80px', align: 'center' },
    ]"
    :items="accountOptions"
    search-placeholder="Cari kode atau nama..."
    :search-keys="['kode', 'nama', 'rekening']"
    @select="selectAccount"
  />

  <!-- ── Modal: Account Detail ── -->
  <SearchModal
    v-model="showDetAccountModal"
    title="Pilih Account Detail"
    :columns="[
      { key: 'kode', title: 'Kode', width: '100px' },
      { key: 'nama', title: 'Nama Account' },
    ]"
    :items="accountAllOptions"
    search-placeholder="Cari account..."
    :search-keys="['kode', 'nama']"
    @select="selectDetAccount"
  />

  <!-- ── Modal: Cost Center ── -->
  <SearchModal
    v-model="showCcModal"
    title="Pilih Cost Center"
    :columns="[
      { key: 'kode', title: 'Kode', width: '80px' },
      { key: 'nama', title: 'Nama' },
    ]"
    :items="ccOptions"
    search-placeholder="Cari cost center..."
    :search-keys="['nama']"
    @select="selectCc"
  />

  <!-- ── Modal: Detail CC ── -->
  <SearchModal
    v-model="showDcModal"
    title="Pilih Detail Cost Center"
    :columns="[
      { key: 'kode', title: 'Kode', width: '80px' },
      { key: 'nama', title: 'Nama' },
    ]"
    :items="dcOptions"
    search-placeholder="Cari detail CC..."
    :search-keys="['nama']"
    @select="selectDc"
  />
</template>

<style scoped>
.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #2e7d32;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
}
.field-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 8px;
}
.field-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
}
.req {
  color: red;
}
.flex-1 {
  flex: 1 1 50%;
  min-width: 0;
}

.total-box {
  background: #1b5e20;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.total-lbl {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
}
.total-val {
  font-size: 15px;
  font-weight: 700;
  color: white;
  font-variant-numeric: tabular-nums;
}

.detail-table-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.detail-table thead tr {
  background: #2e7d32;
}
.detail-table th {
  color: white;
  font-weight: 700;
  padding: 5px 6px;
  white-space: nowrap;
  text-align: left;
}
.detail-table td {
  padding: 2px 4px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.detail-table tbody tr:hover td {
  background: rgba(46, 125, 50, 0.05);
}

.cell-inp {
  width: 100%;
  height: 24px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.cell-inp:focus {
  border-color: #2e7d32;
}
.cell-text {
  font-size: 11px;
  display: block;
  padding: 2px 4px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.empty-td {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px;
}

.sup-btn {
  background: none;
  border: 1px solid #ccc;
  border-radius: 3px;
  cursor: pointer;
  padding: 1px 3px;
  color: #555;
  flex-shrink: 0;
}
.sup-btn:hover {
  background: #f0f0f0;
}
.del-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #c62828;
  padding: 2px;
}
</style>
