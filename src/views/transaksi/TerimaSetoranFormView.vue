<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { IconReceipt } from "@tabler/icons-vue";
import {
  terimaSetoranFormApi,
  type TerimaSetoranFormHdr,
  type TerimaSetoranDtl1Row,
  type TerimaSetoranDtl2Row,
} from "@/api/transaksi/terimaSetoranFormApi";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const MENU_ID = "29";

const nomor = computed(() => decodeURIComponent(route.params.nomor as string));

// ── State ─────────────────────────────────────────────────────────────
const isLoading = ref(false);
const isSaving = ref(false);
const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);

const hdr = ref<TerimaSetoranFormHdr>({
  Nomor: "",
  TglSetor: "",
  TglVerifikasi: null,
  UserCreate: "",
  UserVerifikasi: "",
  Cabang: "",
});
const dtl1 = ref<TerimaSetoranDtl1Row[]>([]);

// dtl2 dengan field tambahan `sama` (Delphi: clsama checkbox)
const dtl2 = ref<(TerimaSetoranDtl2Row & { sama: boolean })[]>([]);

// ── Verifikasi state ──────────────────────────────────────────────────
// Delphi: ckVerifikasi + edtVerifikasi
const diVerifikasi = ref(false);
const tglVerifikasi = ref("");
const userVerifikasi = ref("");

// xLoad flag — Delphi pakai ini untuk guard reactive side-effects
const xLoad = ref(false);

// ── Load ──────────────────────────────────────────────────────────────
const loadData = async () => {
  isLoading.value = true;
  try {
    const result = await terimaSetoranFormApi.getForm(nomor.value);
    hdr.value = result.hdr;
    dtl1.value = result.dtl1;

    // dtl2: init dengan sama = (nominalv === nominal)
    dtl2.value = result.dtl2.map((d) => ({
      ...d,
      sama: d.NominalVerifikasi === d.NominalSetor,
    }));

    // Set state verifikasi dari data
    xLoad.value = true;
    diVerifikasi.value = !!result.hdr.UserVerifikasi;
    userVerifikasi.value = result.hdr.UserVerifikasi || "";
    tglVerifikasi.value = result.hdr.TglVerifikasi || result.hdr.TglSetor || "";
    xLoad.value = false;
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal memuat data.");
    router.back();
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// ── Checkbox Verifikasi ───────────────────────────────────────────────
// Delphi ckVerifikasiClick:
//   centang → edtVerifikasi = kduser
//   uncentang + semua nominalv 0 → clear edtVerifikasi langsung
//   uncentang + ada nominalv > 0 → confirm dialog → jika ya: reset semua nominalv & edtVerifikasi
const confirmUnverifDialog = ref(false);

const onVerifikasiChange = (val: boolean) => {
  if (xLoad.value) return;

  if (val) {
    // Centang → isi user verifikasi dengan user login
    userVerifikasi.value = authStore.userKode || authStore.userName || "";
  } else {
    // Cek apakah ada nominalv > 0
    const totalNominalv = dtl2.value.reduce(
      (s, d) => s + Number(d.NominalVerifikasi),
      0,
    );
    if (totalNominalv === 0) {
      // Langsung clear tanpa konfirmasi
      userVerifikasi.value = "";
    } else {
      // Ada nilai → minta konfirmasi "Batalkan Verifikasi?"
      // Kembalikan checkbox ke true dulu, tunggu konfirmasi
      xLoad.value = true;
      diVerifikasi.value = true;
      xLoad.value = false;
      confirmUnverifDialog.value = true;
    }
  }
};

// Konfirmasi batalkan verifikasi
const doConfirmUnverif = () => {
  confirmUnverifDialog.value = false;
  xLoad.value = true;
  diVerifikasi.value = false;
  userVerifikasi.value = "";
  // Reset semua nominalv ke 0 (Delphi: loop CDSGrid2, set nominalv=0, sama=false)
  dtl2.value = dtl2.value.map((d) => ({
    ...d,
    NominalVerifikasi: 0,
    sama: false,
  }));
  xLoad.value = false;
};

// ── Nominalv edit ─────────────────────────────────────────────────────
// Delphi clnominalvPropertiesEditValueChanged:
//   sama = (nominalv === nominal)
const onNominalvChange = (idx: number) => {
  const d = dtl2.value[idx];
  d.sama = Number(d.NominalVerifikasi) === Number(d.NominalSetor);
};

// ── Checkbox Sama ─────────────────────────────────────────────────────
// Delphi clsamaPropertiesEditValueChanged:
//   jika sama=true → nominalv = nominal
const onSamaChange = (idx: number) => {
  const d = dtl2.value[idx];
  if (d.sama) {
    d.NominalVerifikasi = d.NominalSetor;
  }
};

// ── Computed totals ───────────────────────────────────────────────────
const totalNominalDtl1 = computed(() =>
  dtl1.value.reduce((s, d) => s + Number(d.Nominal), 0),
);
const totalNominalSetor = computed(() =>
  dtl2.value.reduce((s, d) => s + Number(d.NominalSetor), 0),
);
const totalNominalVerif = computed(() =>
  dtl2.value.reduce((s, d) => s + Number(d.NominalVerifikasi), 0),
);

const statusLabel = computed(() => {
  if (!hdr.value.Nomor) return "";
  return diVerifikasi.value ? "Sudah Diverifikasi" : "Belum Diverifikasi";
});

// ── Validasi & Save ───────────────────────────────────────────────────
// Delphi btnSimpanClick:
//   validasi: tglVerifikasi < tglSetor → error
//   confirm dialog → simpandata
const onValidateSave = () => {
  if (!diVerifikasi.value) {
    // Simpan tanpa verifikasi tetap boleh
    showSaveDialog.value = true;
    return;
  }
  if (tglVerifikasi.value && hdr.value.TglSetor) {
    if (new Date(tglVerifikasi.value) < new Date(hdr.value.TglSetor)) {
      toast.error("Tgl verifikasi tidak boleh lebih kecil dari Tgl setor.");
      return;
    }
  }
  showSaveDialog.value = true;
};

const onConfirmSave = async () => {
  isSaving.value = true;
  showSaveDialog.value = false;
  try {
    await terimaSetoranFormApi.save({
      nomor: nomor.value,
      diVerifikasi: diVerifikasi.value,
      tglVerifikasi: diVerifikasi.value ? tglVerifikasi.value : null,
      detail2: dtl2.value.map((d) => ({
        jenis: d.Jenis,
        nominalv: Number(d.NominalVerifikasi),
      })),
    });
    toast.success("Data berhasil disimpan.");
    router.back();
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

const onConfirmCancel = () => {
  showCancelDialog.value = false;
  loadData();
};

const onConfirmClose = () => {
  showCloseDialog.value = false;
  router.back();
};

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
</script>

<template>
  <BaseForm
    title="Terima Setoran Kasir"
    :icon="IconReceipt"
    :menu-id="MENU_ID"
    :is-loading="isLoading"
    :is-saving="isSaving"
    :is-edit-mode="true"
    :item-name="nomor"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidateSave"
    @confirm-save="onConfirmSave"
    @confirm-cancel="onConfirmCancel"
    @confirm-close="onConfirmClose"
  >
    <!-- ── Layout: full custom (bukan left/right) karena ada 2 grid besar ── -->
    <div class="ts-layout">
      <!-- ── Header info ── -->
      <div class="desktop-form-section header-section ts-header">
        <div class="hdr-grid">
          <div class="hdr-field">
            <label class="field-lbl">Nomor</label>
            <div class="field-row">
              <input :value="hdr.Nomor" readonly class="field-inp readonly" />
              <span
                :class="[
                  'status-badge',
                  diVerifikasi ? 'verified' : 'unverified',
                ]"
              >
                {{ statusLabel }}
              </span>
            </div>
          </div>
          <div class="hdr-field">
            <label class="field-lbl">Dibuat Oleh</label>
            <input
              :value="hdr.UserCreate"
              readonly
              class="field-inp readonly"
            />
          </div>
          <div class="hdr-field">
            <label class="field-lbl">Tanggal Setor</label>
            <input
              :value="hdr.TglSetor"
              readonly
              type="date"
              class="field-inp readonly"
            />
          </div>
          <div class="hdr-field verif-row">
            <label class="field-lbl">Di Verifikasi Oleh</label>
            <div class="field-row gap-6">
              <input
                type="checkbox"
                :checked="diVerifikasi"
                @change="
                  (e) => {
                    diVerifikasi = (e.target as HTMLInputElement).checked;
                    onVerifikasiChange(diVerifikasi);
                  }
                "
                class="verif-check"
              />
              <input
                :value="userVerifikasi"
                readonly
                class="field-inp readonly"
                style="flex: 1"
              />
            </div>
          </div>
          <div class="hdr-field">
            <label class="field-lbl">Store</label>
            <input :value="hdr.Cabang" readonly class="field-inp readonly" />
          </div>
          <div class="hdr-field">
            <label class="field-lbl">Tgl Verifikasi</label>
            <input
              v-model="tglVerifikasi"
              type="date"
              class="field-inp"
              :disabled="!diVerifikasi"
              :class="{ readonly: !diVerifikasi }"
            />
          </div>
        </div>
      </div>

      <!-- ── Grid 1: Detail Setoran (readonly) ── -->
      <div class="desktop-form-section ts-grid1">
        <div class="section-title">Detail Setoran</div>
        <div class="grid-wrap">
          <table class="form-tbl">
            <thead>
              <tr>
                <th style="width: 36px">No</th>
                <th style="min-width: 160px">Jenis Setoran</th>
                <th style="width: 105px">Tanggal Transfer</th>
                <th style="width: 80px">Kd Cus</th>
                <th style="min-width: 160px">Nama Customer</th>
                <th style="min-width: 180px">Alamat</th>
                <th style="min-width: 130px">Invoice</th>
                <th style="width: 120px">Nominal Setor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, idx) in dtl1" :key="idx">
                <td class="tc">{{ idx + 1 }}</td>
                <td>{{ d.Jenis }}</td>
                <td class="tc">{{ d.TglTransfer || "-" }}</td>
                <td>{{ d.KdCus }}</td>
                <td>{{ d.NamaCus }}</td>
                <td>{{ d.Alamat }}</td>
                <td>{{ d.Invoice }}</td>
                <td class="tr">{{ fmt(d.Nominal) }}</td>
              </tr>
              <tr v-if="!dtl1.length">
                <td colspan="8" class="tc empty-row">Tidak ada data.</td>
              </tr>
            </tbody>
            <tfoot v-if="dtl1.length">
              <tr class="tfoot-row">
                <td colspan="7" class="tr tfoot-lbl">Total</td>
                <td class="tr tfoot-val">{{ fmt(totalNominalDtl1) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- ── Grid 2: Rekap per Jenis (editable nominalv + sama) ── -->
      <div class="desktop-form-section ts-grid2">
        <div class="section-title">Rekap Verifikasi per Jenis</div>
        <div class="grid-wrap">
          <table class="form-tbl">
            <thead>
              <tr>
                <th style="width: 36px">No</th>
                <th style="min-width: 200px">Jenis Setoran</th>
                <th style="width: 150px">Total Nominal Setor</th>
                <th style="width: 150px">Nominal Verifikasi</th>
                <th style="width: 60px">Sama</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, idx) in dtl2" :key="idx">
                <td class="tc">{{ idx + 1 }}</td>
                <td>{{ d.Jenis }}</td>
                <td class="tr">{{ fmt(d.NominalSetor) }}</td>
                <td class="td-input">
                  <!-- Delphi: clnominalv — editable hanya jika diVerifikasi -->
                  <input
                    v-model.number="d.NominalVerifikasi"
                    type="number"
                    class="num-inp"
                    :disabled="!diVerifikasi"
                    @change="onNominalvChange(idx)"
                    @input="onNominalvChange(idx)"
                  />
                </td>
                <td class="tc">
                  <!-- Delphi: clsama — centang = copy nominal ke nominalv -->
                  <input
                    type="checkbox"
                    v-model="d.sama"
                    :disabled="!diVerifikasi"
                    @change="onSamaChange(idx)"
                    class="sama-check"
                  />
                </td>
              </tr>
              <tr v-if="!dtl2.length">
                <td colspan="5" class="tc empty-row">Tidak ada data.</td>
              </tr>
            </tbody>
            <tfoot v-if="dtl2.length">
              <tr class="tfoot-row">
                <td colspan="2" class="tr tfoot-lbl">Total</td>
                <td class="tr tfoot-val">{{ fmt(totalNominalSetor) }}</td>
                <td class="tr tfoot-val">{{ fmt(totalNominalVerif) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </BaseForm>

  <!-- ── Dialog Batalkan Verifikasi ── -->
  <!-- Delphi: confirm "Batalkan Verifikasi?" saat uncheck + ada nominalv > 0 -->
  <v-dialog v-model="confirmUnverifDialog" max-width="380" persistent>
    <v-card rounded="lg">
      <v-card-title class="text-body-1 font-weight-bold pa-4">
        Batalkan Verifikasi?
      </v-card-title>
      <v-card-text class="pa-4 pt-0" style="font-size: 12px">
        Nominal verifikasi yang sudah diisi akan direset ke 0. Lanjutkan?
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="
            confirmUnverifDialog = false;
            xLoad = true;
            diVerifikasi = true;
            xLoad = false;
          "
        >
          Tidak
        </v-btn>
        <v-btn color="warning" variant="flat" @click="doConfirmUnverif">
          Ya, Batalkan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Layout utama ── */
.ts-layout {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  height: calc(100vh - 120px);
  overflow-y: auto;
  background: #f1f8f1;
}

/* ── Header grid ── */
.ts-header {
  flex-shrink: 0;
}
.hdr-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px 20px;
}
.hdr-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.field-lbl {
  font-size: 10px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.field-inp {
  height: 28px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  padding: 0 8px;
  font-size: 11px;
  outline: none;
  width: 100%;
  background: white;
}
.field-inp:focus {
  border-color: #2e7d32;
}
.field-inp.readonly {
  background: #f5f5f5;
  color: #555;
  cursor: default;
}
.verif-check {
  width: 16px;
  height: 16px;
  accent-color: #2e7d32;
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Status badge ── */
.status-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}
.status-badge.verified {
  background: #e8f5e9;
  color: #2e7d32;
}
.status-badge.unverified {
  background: #ffebee;
  color: #cc0000;
}

/* ── Section title ── */
.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #2e7d32;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Grid tables ── */
.ts-grid1,
.ts-grid2 {
  flex-shrink: 0;
}
.grid-wrap {
  overflow-x: auto;
}
.form-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.form-tbl thead tr {
  background: #2e7d32;
}
.form-tbl th {
  color: white;
  font-weight: 700;
  padding: 5px 7px;
  text-align: left;
  white-space: nowrap;
}
.form-tbl td {
  padding: 3px 7px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}
.form-tbl tbody tr:hover td {
  background: rgba(46, 125, 50, 0.04);
}
.tfoot-row td {
  background: #f0fdf4;
  border-top: 2px solid #2e7d32;
  padding: 4px 7px;
}
.tfoot-lbl {
  font-weight: 700;
  font-size: 11px;
  color: #374151;
}
.tfoot-val {
  font-weight: 700;
  font-size: 11px;
  color: #1b5e20;
  font-variant-numeric: tabular-nums;
}

/* ── Input dalam tabel (nominalv) ── */
.td-input {
  padding: 2px 4px !important;
}
.num-inp {
  height: 24px;
  width: 130px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  text-align: right;
  outline: none;
  -moz-appearance: textfield;
  appearance: textfield;
}
.num-inp::-webkit-inner-spin-button,
.num-inp::-webkit-outer-spin-button {
  -webkit-appearance: none;
}
.num-inp:focus {
  border-color: #2e7d32;
}
.num-inp:disabled {
  background: #f5f5f5;
  color: #9e9e9e;
  cursor: default;
}
.sama-check {
  width: 15px;
  height: 15px;
  accent-color: #2e7d32;
  cursor: pointer;
}
.sama-check:disabled {
  cursor: default;
  opacity: 0.5;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.empty-row {
  color: #9e9e9e;
  font-style: italic;
  padding: 12px !important;
}

.gap-6 {
  gap: 6px;
}
</style>
