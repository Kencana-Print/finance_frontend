<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import BaseForm from "@/components/BaseForm.vue";
import SearchModal from "@/components/SearchModal.vue";
import { IconBook, IconSearch, IconPlus, IconTrash } from "@tabler/icons-vue";
import {
  jurnalUmumFormApi,
  type JurnalUmumFormDetail,
} from "@/api/transaksi/jurnalUmumFormApi";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const MENU_ID = "26";
const isEdit = computed(() => !!route.params.nomor);
const isLoading = ref(false);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const savedNomor = ref("");

const today = new Date().toISOString().slice(0, 10);

const form = ref({
  nomor: "",
  tanggal: today,
  keterangan: "",
  detail: [] as JurnalUmumFormDetail[],
});

const originalForm = ref<any>(null);

// ── Lookup ─────────────────────────────────────────────────────────────
const accountAllOptions = ref<{ kode: string; nama: string; cabang: string }[]>(
  [],
);
const ccOptions = ref<{ kode: number; nama: string }[]>([]);

// ── Total Debet & Kredit ──────────────────────────────────────────────
const totalDebet = computed(() =>
  form.value.detail.reduce((s, d) => s + (Number(d.debet) || 0), 0),
);
const totalKredit = computed(() =>
  form.value.detail.reduce((s, d) => s + (Number(d.kredit) || 0), 0),
);
const isBalance = computed(() => totalDebet.value === totalKredit.value);
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

// ── onMounted ─────────────────────────────────────────────────────────
onMounted(async () => {
  isLoading.value = true;
  try {
    const [accAll, cc] = await Promise.all([
      jurnalUmumFormApi.getAccountAll(),
      jurnalUmumFormApi.getCostCenterOptions(),
    ]);
    accountAllOptions.value = accAll;
    ccOptions.value = cc;

    if (!isEdit.value) {
      addRow();
    } else {
      const d = await jurnalUmumFormApi.getDetailForm(
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

// ── Account Modal ─────────────────────────────────────────────────────
const showAccountModal = ref(false);
const activeAccIdx = ref(-1);

const openAccountModal = (idx: number) => {
  activeAccIdx.value = idx;
  showAccountModal.value = true;
};
const selectAccount = (acc: any) => {
  if (activeAccIdx.value < 0) return;
  const d = form.value.detail[activeAccIdx.value];
  d.rekkode = acc.kode;
  d.reknama = acc.nama;
  showAccountModal.value = false;
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
  dcOptions.value = await jurnalUmumFormApi.getDcOptions(d.cckode);
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
    debet: 0,
    kredit: 0,
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

// ── Validasi F10 Delphi ───────────────────────────────────────────────
const validateSave = () => {
  if (!form.value.keterangan.trim()) {
    toast.warning("Keterangan harus diisi.");
    return;
  }

  // Delphi: cek reknama per baris (bukan uraian)
  for (const d of form.value.detail) {
    if (!d.reknama) {
      toast.warning("Nama Account harus diisi.");
      return;
    }
    // Delphi: cek DC jika uraian tidak kosong dan dckode=0
    // Skip jika prefix A atau B
    if (d.uraian.trim() && d.dckode === 0) {
      const prefix = (d.rekkode || "").substring(0, 1);
      if (prefix !== "A" && prefix !== "B") {
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
    const res = await jurnalUmumFormApi.save({
      ...form.value,
      isEdit: isEdit.value,
    });
    savedNomor.value = res.data.nomor;
    showSaveDialog.value = false;
    toast.success(`Berhasil disimpan. Nomor: ${savedNomor.value}`);
    router.push({ name: "JurnalUmumBrowse" });
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

const confirmCancel = () => {
  showCancelDialog.value = false;
  if (isEdit.value && originalForm.value) {
    Object.assign(form.value, JSON.parse(JSON.stringify(originalForm.value)));
  } else {
    form.value.tanggal = today;
    form.value.keterangan = "";
    form.value.detail = [];
    addRow();
  }
};
const confirmClose = () => {
  showCloseDialog.value = false;
  router.push({ name: "JurnalUmumBrowse" });
};
</script>

<template>
  <BaseForm
    title="Jurnal Umum"
    :menu-id="MENU_ID"
    :icon="IconBook"
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
      <div style="height: 100%; overflow-y: auto; padding-right: 6px">
        <div class="section-title">Informasi Jurnal</div>

        <!-- Nomor -->
        <div class="field-row">
          <label class="field-lbl">Nomor Jurnal</label>
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

        <!-- Tanggal -->
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

        <!-- Keterangan -->
        <div class="field-row">
          <label class="field-lbl">Keterangan <span class="req">*</span></label>
          <v-text-field
            v-model="form.keterangan"
            density="compact"
            variant="outlined"
            hide-details
            placeholder="Keterangan jurnal"
          />
        </div>

        <!-- Total Debet & Kredit -->
        <div class="total-wrap mt-4">
          <div class="total-row">
            <span class="total-lbl">Total Debet</span>
            <span class="total-val">{{ fmt(totalDebet) }}</span>
          </div>
          <div class="total-row">
            <span class="total-lbl">Total Kredit</span>
            <span class="total-val">{{ fmt(totalKredit) }}</span>
          </div>
          <div
            class="balance-row"
            :class="isBalance ? 'balanced' : 'unbalanced'"
          >
            <span>{{ isBalance ? "✓ Balance" : "✗ Tidak Balance" }}</span>
            <span v-if="!isBalance" style="font-size: 10px">
              Selisih: {{ fmt(Math.abs(totalDebet - totalKredit)) }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- ── RIGHT COLUMN ── -->
    <template #right-column>
      <div style="height: 100%; display: flex; flex-direction: column">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="section-title">Detail Jurnal</div>
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
                <th style="min-width: 200px">Uraian</th>
                <th style="width: 120px">Debet</th>
                <th style="width: 120px">Kredit</th>
                <th style="min-width: 100px">Account</th>
                <th style="min-width: 150px">Nama Account</th>
                <th style="min-width: 110px">Cost Center</th>
                <th style="min-width: 110px">Detail CC</th>
                <th style="width: 28px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, idx) in form.detail" :key="idx">
                <td class="tc">{{ idx + 1 }}</td>

                <!-- Uraian -->
                <td>
                  <input
                    v-model="d.uraian"
                    class="cell-inp"
                    placeholder="Keterangan baris"
                  />
                </td>

                <!-- Debet -->
                <td>
                  <input
                    v-model.number="d.debet"
                    type="number"
                    class="cell-inp tr"
                    style="min-width: 90px"
                  />
                </td>

                <!-- Kredit -->
                <td>
                  <input
                    v-model.number="d.kredit"
                    type="number"
                    class="cell-inp tr"
                    style="min-width: 90px"
                  />
                </td>

                <!-- Account -->
                <td>
                  <div class="d-flex align-center gap-1">
                    <span
                      class="cell-text"
                      style="
                        max-width: 62px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      {{ d.rekkode || "-" }}
                    </span>
                    <button
                      type="button"
                      class="sup-btn"
                      @click.stop.prevent="openAccountModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <!-- Nama Account -->
                <td>
                  <span class="cell-text" :class="{ 'text-error': !d.reknama }">
                    {{ d.reknama || "(wajib)" }}
                  </span>
                </td>

                <!-- Cost Center -->
                <td>
                  <div class="d-flex align-center gap-1">
                    <span
                      class="cell-text"
                      style="
                        max-width: 70px;
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

                <!-- Detail CC -->
                <td>
                  <div class="d-flex align-center gap-1">
                    <span
                      class="cell-text"
                      style="
                        max-width: 70px;
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

                <!-- Hapus -->
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
                <td colspan="9" class="empty-td">
                  Belum ada baris. Klik Tambah Baris.
                </td>
              </tr>
            </tbody>
            <!-- Footer total -->
            <tfoot v-if="form.detail.length">
              <tr class="foot-row">
                <td colspan="2" class="tr foot-lbl">Subtotal</td>
                <td class="tr foot-val">{{ fmt(totalDebet) }}</td>
                <td class="tr foot-val">{{ fmt(totalKredit) }}</td>
                <td colspan="5"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- ── Modal: Account ── -->
  <SearchModal
    v-model="showAccountModal"
    title="Pilih Account"
    :columns="[
      { key: 'kode', title: 'Kode', width: '100px' },
      { key: 'nama', title: 'Nama Account' },
      { key: 'cabang', title: 'Cabang', width: '80px', align: 'center' },
    ]"
    :items="accountAllOptions"
    search-placeholder="Cari account..."
    :search-keys="['kode', 'nama']"
    @select="selectAccount"
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

.total-wrap {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.total-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
}
.total-val {
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.balance-row {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
}
.balanced {
  color: #2e7d32;
}
.unbalanced {
  color: #c62828;
}
.text-error {
  color: #c62828 !important;
  font-style: italic;
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
.detail-table tfoot .foot-row td {
  background: #f0fdf4;
  border-top: 2px solid #2e7d32;
  padding: 4px 6px;
}
.foot-lbl {
  font-size: 11px;
  font-weight: 700;
  color: #374151;
}
.foot-val {
  font-size: 11px;
  font-weight: 700;
  color: #1b5e20;
  font-variant-numeric: tabular-nums;
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
