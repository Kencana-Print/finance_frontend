<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import {
  IconReceipt2,
  IconSearch,
  IconPlus,
  IconTrash,
  IconPrinter,
} from "@tabler/icons-vue";
import {
  uangMukaFormApi,
  type UangMukaFormDetail,
} from "@/api/transaksi/uangMukaFormApi";

import SearchModal from "@/components/SearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const MENU_ID = "21";
const isEdit = computed(() => !!route.params.nomor);
const isLoading = ref(false);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const showPermintaanDialog = ref(false);

const showPrintDialog = ref(false);
const savedNomor = ref("");

const isDataLoaded = ref(false);

// ── Form state ────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

const form = ref({
  nomor: "",
  tanggal: today,
  jenis: "KAS" as "KAS" | "BANK",
  rek_kode: "",
  rek_nama: "",
  cabang: authStore.userCabang || "P01",
  cabang_old: authStore.userCabang || "P01",
  pjh_nomor: "",
  nota: "",
  nominal: 0,
  penerima: "",
  keterangan: "",
  pmt_nomor: "",
  pmt_tanggal: today,
  pjh_tanggal: today,
  pjh_nik: "",
  jenis_permintaan: "",
  nama: "",
  bagian: "",
  lokasi: "",
  detail: [] as UangMukaFormDetail[],
});

const initialFormData = {
  nomor: "",
  tanggal: today,
  jenis: "KAS" as "KAS" | "BANK",
  rek_kode: "",
  rek_nama: "",
  cabang: authStore.userCabang || "P01",
  cabang_old: authStore.userCabang || "P01",
  pjh_nomor: "",
  nota: "",
  nominal: 0,
  penerima: "",
  keterangan: "",
  pmt_nomor: "",
  pmt_tanggal: today,
  pjh_tanggal: today,
  pjh_nik: "",
  jenis_permintaan: "",
  nama: "",
  bagian: "",
  lokasi: "",
  detail: [] as UangMukaFormDetail[],
};

const originalForm = ref<typeof initialFormData | null>(null);

// ── Lookup options ────────────────────────────────────────────────────
const accountOptions = ref<{ kode: string; nama: string; cabang: string }[]>(
  [],
);
const pengajuanOptions = ref<
  { nomor: string; tanggal: string; keterangan: string }[]
>([]);

const loadAccountOptions = async () => {
  try {
    accountOptions.value = await uangMukaFormApi.getAccountOptions(
      form.value.jenis,
      form.value.cabang,
    );
    // Set default account pertama HANYA kalau mode baru dan belum ada rek_kode
    if (!isEdit.value && accountOptions.value.length && !form.value.rek_kode) {
      form.value.rek_kode = accountOptions.value[0].kode;
      form.value.rek_nama = accountOptions.value[0].nama;
    }
  } catch {
    /* silent */
  }
};

// Saat jenis (KAS/BANK) berubah → reload account
watch(
  () => form.value.jenis,
  async () => {
    // Skip jika sedang proses load data edit
    if (!isDataLoaded.value) return;
    form.value.rek_kode = "";
    form.value.rek_nama = "";
    await loadAccountOptions();
  },
);

// ── Load form edit ────────────────────────────────────────────────────
onMounted(async () => {
  if (isEdit.value) {
    isLoading.value = true;
    try {
      const d = await uangMukaFormApi.getDetailForm(
        decodeURIComponent(route.params.nomor as string),
      );
      // Set flag false dulu SEBELUM assign, agar watch tidak trigger reset
      isDataLoaded.value = false;
      Object.assign(form.value, d);
      form.value.cabang_old = d.cabang;
      originalForm.value = JSON.parse(JSON.stringify(form.value));
      // Baru set true SETELAH assign selesai
      await nextTick();
      isDataLoaded.value = true;
      accountOptions.value = await uangMukaFormApi.getAccountOptions(
        d.jenis,
        d.cabang,
      );
    } catch (e: any) {
      if (e?.isAuthExpired) return; // ← skip toast, dialog sudah muncul
      toast.error(e.response?.data?.message ?? "Gagal memuat data.");
      router.back();
    } finally {
      isLoading.value = false;
    }
  } else {
    // Mode baru → langsung load account dan set flag true
    isDataLoaded.value = true;
    await loadAccountOptions();
  }
});

// ── Total approval ────────────────────────────────────────────────────
const totalApproval = computed(() =>
  form.value.detail.reduce((s, d) => s + (d.approved ? d.total : 0), 0),
);

watch(totalApproval, (val) => {
  form.value.nominal = val;
});

const hitungTotal = (d: UangMukaFormDetail) => {
  d.total = d.qty * d.nilai;
};

// ── Toggle approved/reject di baris ──────────────────────────────────
const toggleApproved = (d: UangMukaFormDetail) => {
  if (d.approved) {
    d.reject = false;
    d.nilai = d.nilai_old;
  } else {
    d.reject = true;
    d.nilai_old = d.nilai;
    d.nilai = 0;
  }
  d.total = d.qty * d.nilai;
};

const toggleReject = (d: UangMukaFormDetail) => {
  if (d.reject) {
    d.approved = false;
    d.nilai_old = d.nilai;
    d.nilai = 0;
  } else {
    d.approved = true;
    d.nilai = d.nilai_old;
  }
  d.total = d.qty * d.nilai;
};

// ── Tambah baris manual (non-GA) ──────────────────────────────────────
const addRow = () => {
  form.value.detail.push({
    no: form.value.detail.length + 1,
    nama: "",
    spesifikasi: "",
    qty: 1,
    satuan: "",
    nilai: 0,
    nilai_old: 0,
    total: 0,
    approved: true,
    reject: false,
    kegunaan: "",
    ga: 0,
    kdsup: "",
    supplier: "",
    bank: "",
    rekening: "",
    atasnama: "",
  });
};

const removeRow = (idx: number) => {
  const d = form.value.detail[idx];
  if (d.ga === 1) {
    toast.warning("Item pengajuan GA tidak bisa dihapus. Reject saja.");
    return;
  }
  form.value.detail.splice(idx, 1);
};

// ── Format nominal (separator ribuan) ────────────────────────────────
const parseNum = (v: string) =>
  Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

const formatNum = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

// Untuk input nominal kasbon
const nominalDisplay = computed({
  get: () => formatNum(form.value.nominal),
  set: (val: string) => {
    form.value.nominal = parseNum(val);
  },
});

// Handler untuk input detail nilai — format on blur, parse on input
const onNilaiInput = (d: UangMukaFormDetail, e: Event) => {
  const raw = parseNum((e.target as HTMLInputElement).value);
  d.nilai = raw;
  hitungTotal(d);
};

const onNilaiBlur = (d: UangMukaFormDetail, e: Event) => {
  (e.target as HTMLInputElement).value = formatNum(d.nilai);
};

const onNilaiFocus = (d: UangMukaFormDetail, e: Event) => {
  (e.target as HTMLInputElement).value = d.nilai ? String(d.nilai) : "";
};

const onNominalInput = (e: Event) => {
  form.value.nominal = parseNum((e.target as HTMLInputElement).value);
};

const onNominalBlur = (e: Event) => {
  (e.target as HTMLInputElement).value = formatNum(form.value.nominal);
};

const onNominalFocus = (e: Event) => {
  (e.target as HTMLInputElement).value = form.value.nominal
    ? String(form.value.nominal)
    : "";
};

// ── Search Modal: Pengajuan ───────────────────────────────────────────
const showPengajuanModal = ref(false);
const searchPjh = ref("");
const pjhLoading = ref(false);

const openPengajuanModal = async () => {
  pjhLoading.value = true;
  showPengajuanModal.value = true;
  try {
    pengajuanOptions.value = await uangMukaFormApi.getPengajuanOptions(
      form.value.cabang,
    );
  } catch {
    toast.error("Gagal memuat data pengajuan.");
  } finally {
    pjhLoading.value = false;
  }
};

const filteredPengajuan = computed(() => {
  const q = searchPjh.value.toLowerCase();
  return q
    ? pengajuanOptions.value.filter(
        (p) =>
          p.nomor.toLowerCase().includes(q) ||
          p.keterangan?.toLowerCase().includes(q),
      )
    : pengajuanOptions.value;
});

const selectPengajuan = async (pjh: any) => {
  showPengajuanModal.value = false;
  try {
    const d = await uangMukaFormApi.getDetailPengajuan(pjh.nomor);
    form.value.pjh_nomor = d.pmt_pjh_nomor ?? "";
    form.value.pmt_nomor = d.pmt_nomor; // ← No Permintaan
    form.value.pmt_tanggal = d.pmt_tanggal;
    form.value.pjh_tanggal = d.pjh_tanggal;
    form.value.pjh_nik = d.pjh_nik;
    form.value.jenis_permintaan = d.jenis_permintaan;
    form.value.nama = d.nama;
    form.value.penerima = d.nama;
    form.value.bagian = d.bagian;
    form.value.lokasi = d.lokasi;
    form.value.keterangan = d.keterangan;
    form.value.detail = d.detail;

    form.value.nominal = d.detail.reduce((sum, item) => sum + item.total, 0);
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal memuat pengajuan.");
  }
};

// ── Search Modal: Account ─────────────────────────────────────────────
const showAccountModal = ref(false);
const searchAcc = ref("");

const filteredAccount = computed(() => {
  const q = searchAcc.value.toLowerCase();
  return q
    ? accountOptions.value.filter(
        (a) =>
          a.nama.toLowerCase().includes(q) || a.kode.toLowerCase().includes(q),
      )
    : accountOptions.value;
});

const selectAccount = (acc: any) => {
  form.value.rek_kode = acc.kode;
  form.value.rek_nama = acc.nama;
  form.value.cabang =
    acc.cabang === "P02" || acc.cabang === "P04" ? acc.cabang : "P01";
  showAccountModal.value = false;
};

// ── Search Modal: Supplier ────────────────────────────────────────────
const showSupplierModal = ref(false);
const supplierSearch = ref("");
const supplierOptions = ref<any[]>([]);
const supplierLoading = ref(false);
const activeSupplierIdx = ref(-1);

const openSupplierModal = async (idx: number) => {
  activeSupplierIdx.value = idx;
  supplierLoading.value = true;
  showSupplierModal.value = true;
  try {
    supplierOptions.value = await uangMukaFormApi.getSupplierOptions("");
  } catch {
    /* silent */
  } finally {
    supplierLoading.value = false;
  }
};

const searchSupplier = async () => {
  supplierLoading.value = true;
  try {
    supplierOptions.value = await uangMukaFormApi.getSupplierOptions(
      supplierSearch.value,
    );
  } catch {
    /* silent */
  } finally {
    supplierLoading.value = false;
  }
};

const selectSupplier = (sup: any) => {
  const idx = activeSupplierIdx.value;
  if (idx < 0) return;
  const d = form.value.detail[idx];
  d.kdsup = sup.kode;
  d.supplier = sup.nama;
  d.bank = sup.bank;
  d.rekening = sup.rekening;
  d.atasnama = sup.atasnama;
  showSupplierModal.value = false;
};

// ── Validasi + Simpan ─────────────────────────────────────────────────
const validateSave = () => {
  // Delphi: cek account kode dan nama
  if (!form.value.rek_kode || !form.value.rek_nama) {
    toast.warning("Kode dan Nama Account harus diisi.");
    return;
  }
  // Delphi: cek penerima
  if (!form.value.penerima.trim()) {
    toast.warning("Penerima harus diisi.");
    return;
  }
  // Delphi: nominal boleh 0 tapi harus ada nilai (tidak kosong)
  if (form.value.nominal === null || form.value.nominal === undefined) {
    form.value.nominal = 0;
  }

  // Delphi: sebelum simpan, set nilai=0 untuk semua yang reject
  for (const d of form.value.detail) {
    if (d.reject) d.nilai = 0;
  }

  showSaveDialog.value = true;
};

const confirmSave = async () => {
  isSaving.value = true;
  for (const d of form.value.detail) {
    if (d.reject) d.nilai = 0;
  }
  try {
    const res = await uangMukaFormApi.save({
      ...form.value,
      isEdit: isEdit.value,
    } as any);
    savedNomor.value = res.data.nomor;
    showSaveDialog.value = false;
    showPrintDialog.value = true; // ← tampilkan dialog cetak
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

const cetakKasbon = () => {
  window.open(
    `/transaksi/uang-muka/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  router.push({ name: "UangMukaBrowse" });
};

const skipCetak = () => {
  showPrintDialog.value = false;
  router.push({ name: "UangMukaBrowse" });
};

const confirmCancel = () => {
  showCancelDialog.value = false;
  if (isEdit.value && originalForm.value) {
    // Mode edit → kembalikan ke data original dari server
    Object.assign(form.value, JSON.parse(JSON.stringify(originalForm.value)));
    // Reload account options sesuai jenis yang di-restore
    loadAccountOptions();
  } else {
    // Mode baru → reset ke initialFormData
    Object.assign(form.value, JSON.parse(JSON.stringify(initialFormData)));
    loadAccountOptions();
  }
};

const confirmClose = () => {
  showCloseDialog.value = false;
  router.push({ name: "UangMukaBrowse" });
};

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
</script>

<template>
  <BaseForm
    title="Uang Muka / Kasbon"
    :menu-id="MENU_ID"
    :icon="IconReceipt2"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="confirmSave"
    @confirm-cancel="confirmCancel"
    @confirm-close="confirmClose"
    :is-edit-mode="isEdit"
  >
    <!-- ── LEFT COLUMN ── -->
    <template #left-column>
      <div class="left-col-wrap">
        <div class="form-section">
          <div class="form-section-title">Informasi Kasbon</div>

          <!-- Jenis Transaksi -->
          <div class="field-row">
            <label class="field-lbl">Jenis Transaksi</label>
            <div class="radio-group">
              <label class="radio-item">
                <input type="radio" v-model="form.jenis" value="KAS" />
                <span>KAS</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="form.jenis" value="BANK" />
                <span>BANK</span>
              </label>
            </div>
          </div>

          <!-- Account -->
          <div class="field-row">
            <label class="field-lbl">Account <span class="req">*</span></label>
            <div class="input-with-btn">
              <input
                :value="form.rek_kode"
                readonly
                class="form-inp mono"
                style="width: 100px; flex-shrink: 0"
                placeholder="Kode"
              />
              <input
                :value="form.rek_nama"
                readonly
                class="form-inp"
                placeholder="Nama account"
              />
              <button
                class="icon-btn"
                @click="showAccountModal = true"
                type="button"
              >
                <IconSearch :size="13" :stroke-width="1.8" />
              </button>
            </div>
          </div>

          <!-- Nomor Kasbon -->
          <div class="field-row">
            <label class="field-lbl">Nomor Kasbon</label>
            <div class="input-with-badge">
              <input
                :value="isEdit ? form.nomor : ''"
                readonly
                class="form-inp"
                :placeholder="isEdit ? '' : 'Otomatis'"
              />
              <span v-if="!isEdit" class="badge-info">Auto</span>
            </div>
          </div>

          <!-- Tanggal Kasbon -->
          <div class="field-row">
            <label class="field-lbl">Tgl Kasbon</label>
            <input v-model="form.tanggal" type="date" class="form-inp" />
          </div>

          <!-- Nomor Pengajuan -->
          <div class="field-row">
            <label class="field-lbl">Nomor Pengajuan</label>
            <div class="input-with-btn">
              <input
                v-model="form.pjh_nomor"
                :readonly="isEdit"
                class="form-inp"
                placeholder="Nomor pengajuan"
              />
              <button
                v-if="!isEdit"
                class="icon-btn"
                @click="openPengajuanModal"
                type="button"
              >
                <IconSearch :size="13" :stroke-width="1.8" />
              </button>
            </div>
          </div>

          <!-- Tgl Pengajuan -->
          <div class="field-row">
            <label class="field-lbl">Tgl Pengajuan</label>
            <input
              v-model="form.pjh_tanggal"
              type="date"
              class="form-inp"
              readonly
            />
          </div>

          <!-- Penerima -->
          <div class="field-row">
            <label class="field-lbl">Penerima <span class="req">*</span></label>
            <input
              v-model="form.penerima"
              class="form-inp"
              placeholder="Nama penerima"
            />
          </div>

          <!-- No Nota -->
          <div class="field-row">
            <label class="field-lbl">No. Nota</label>
            <input
              v-model="form.nota"
              class="form-inp"
              placeholder="Nomor nota"
            />
          </div>

          <!-- Keterangan -->
          <div class="field-row">
            <label class="field-lbl">Keterangan</label>
            <input
              v-model="form.keterangan"
              class="form-inp"
              placeholder="Keterangan"
            />
          </div>
        </div>

        <!-- Info Permintaan -->
        <div class="form-section">
          <div class="form-section-header">
            <div class="form-section-title" style="margin-bottom: 0">
              Info Permintaan
            </div>
            <button
              class="link-btn"
              @click="showPermintaanDialog = true"
              :disabled="!form.pmt_nomor"
              type="button"
            >
              Lihat Detail
            </button>
          </div>
          <div v-if="form.pmt_nomor" class="pmt-info">
            <span class="pmt-nomor">{{ form.pmt_nomor }}</span>
            <span class="pmt-nama">{{ form.nama }}</span>
          </div>
          <div v-else class="pmt-empty">Belum ada permintaan dipilih</div>
        </div>
      </div>
    </template>

    <!-- ── RIGHT COLUMN ── -->
    <template #right-column>
      <div
        class="desktop-form-section header-section"
        style="height: 100%; display: flex; flex-direction: column"
      >
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="section-title">Detail Pengajuan</div>
          <v-btn size="small" color="primary" variant="tonal" @click="addRow">
            <template #prepend
              ><IconPlus :size="13" :stroke-width="2"
            /></template>
            Tambah Baris
          </v-btn>
        </div>

        <!-- Tabel detail -->
        <div class="detail-table-wrap">
          <table class="detail-table">
            <thead>
              <tr>
                <th style="width: 30px">No</th>
                <th style="min-width: 140px">Nama</th>
                <th style="min-width: 100px">Spesifikasi</th>
                <th style="width: 70px">Qty</th>
                <th style="width: 55px">Satuan</th>
                <th style="width: 120px">Nilai Approval</th>
                <th style="width: 110px">Total</th>
                <th style="width: 45px">ACC</th>
                <th style="width: 45px">Tolak</th>
                <th style="min-width: 90px">Kegunaan</th>
                <th style="width: 70px">Kd. Sup</th>
                <th style="min-width: 90px">Supplier</th>
                <th style="min-width: 90px">Bank</th>
                <th style="min-width: 110px">Rekening</th>
                <th style="min-width: 100px">Atas Nama</th>
                <th style="width: 30px"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, idx) in form.detail"
                :key="idx"
                :class="{
                  'row-reject': d.reject,
                  'row-approved': d.approved && !d.reject,
                }"
              >
                <td class="tc">{{ idx + 1 }}</td>
                <td>
                  <input
                    v-if="d.ga === 0"
                    v-model="d.nama"
                    class="cell-inp"
                    placeholder="Nama item"
                  />
                  <span v-else class="cell-text">{{ d.nama }}</span>
                </td>
                <td>
                  <input
                    v-if="d.ga === 0"
                    v-model="d.spesifikasi"
                    class="cell-inp"
                  />
                  <span v-else class="cell-text">{{ d.spesifikasi }}</span>
                </td>
                <td>
                  <input
                    v-if="d.ga === 0"
                    v-model.number="d.qty"
                    type="number"
                    class="cell-inp tr"
                    @input="hitungTotal(d)"
                  />
                  <span v-else class="cell-text tr">{{ d.qty }}</span>
                </td>
                <td>
                  <input
                    v-if="d.ga === 0"
                    v-model="d.satuan"
                    class="cell-inp"
                  />
                  <span v-else class="cell-text">{{ d.satuan }}</span>
                </td>
                <td>
                  <input
                    :value="formatNum(d.nilai)"
                    type="text"
                    inputmode="numeric"
                    class="cell-inp tr"
                    :disabled="d.reject"
                    @focus="onNilaiFocus(d, $event)"
                    @input="onNilaiInput(d, $event)"
                    @blur="onNilaiBlur(d, $event)"
                  />
                </td>
                <td class="tr cell-total">{{ fmt(d.total) }}</td>
                <td class="tc">
                  <input
                    type="checkbox"
                    v-model="d.approved"
                    @change="toggleApproved(d)"
                  />
                </td>
                <td class="tc">
                  <input
                    type="checkbox"
                    v-model="d.reject"
                    @change="toggleReject(d)"
                  />
                </td>
                <td>
                  <input v-model="d.kegunaan" class="cell-inp" />
                </td>
                <!-- Kode Supplier -->
                <td>
                  <div class="d-flex align-center gap-1" @click.stop>
                    <input
                      v-model="d.kdsup"
                      class="cell-inp"
                      style="width: 55px"
                      placeholder="Kode"
                      readonly
                    />
                    <button
                      class="sup-btn"
                      type="button"
                      @click.stop.prevent="openSupplierModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <!-- Nama Supplier -->
                <td>
                  <input
                    v-model="d.supplier"
                    class="cell-inp"
                    readonly
                    placeholder="-"
                  />
                </td>
                <td>
                  <input v-model="d.bank" class="cell-inp" placeholder="Bank" />
                </td>
                <td>
                  <input
                    v-model="d.rekening"
                    class="cell-inp"
                    placeholder="Rekening"
                  />
                </td>
                <td>
                  <input
                    v-model="d.atasnama"
                    class="cell-inp"
                    placeholder="Atas nama"
                  />
                </td>
                <td class="tc">
                  <button
                    v-if="d.ga === 0"
                    class="del-btn"
                    @click.prevent="removeRow(idx)"
                  >
                    <IconTrash :size="12" :stroke-width="1.8" />
                  </button>
                </td>
              </tr>
              <tr v-if="!form.detail.length">
                <td colspan="16" class="empty-td">
                  Belum ada item. Pilih pengajuan atau tambah baris manual.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer nominal -->
        <div class="detail-footer">
          <div class="footer-item">
            <span class="footer-lbl">Total Approval</span>
            <span class="footer-val">{{ fmt(totalApproval) }}</span>
          </div>
          <div class="footer-item">
            <label class="footer-lbl"
              >Nominal Kasbon <span class="req">*</span></label
            >
            <input
              :value="formatNum(form.nominal)"
              type="text"
              inputmode="numeric"
              class="nominal-inp"
              @focus="onNominalFocus($event)"
              @input="onNominalInput($event)"
              @blur="onNominalBlur($event)"
            />
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <v-dialog v-model="showPermintaanDialog" max-width="420">
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #2e7d32"
      >
        Info Permintaan
      </v-card-title>
      <v-card-text class="pa-4 pt-2">
        <div class="info-grid">
          <span class="info-lbl">No. Permintaan</span>
          <span class="info-val">{{ form.pmt_nomor || "-" }}</span>
          <span class="info-lbl">Tgl Permintaan</span>
          <span class="info-val">{{ form.pmt_tanggal || "-" }}</span>
          <span class="info-lbl">Jenis Permintaan</span>
          <span class="info-val">{{ form.jenis_permintaan || "-" }}</span>
          <span class="info-lbl">NIK</span>
          <span class="info-val">{{ form.pjh_nik || "-" }}</span>
          <span class="info-lbl">Nama</span>
          <span class="info-val">{{ form.nama || "-" }}</span>
          <span class="info-lbl">Bagian</span>
          <span class="info-val">{{ form.bagian || "-" }}</span>
          <span class="info-lbl">Lokasi</span>
          <span class="info-val">{{ form.lokasi || "-" }}</span>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn variant="text" @click="showPermintaanDialog = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

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
        Nomor Kasbon: <strong>{{ savedNomor }}</strong
        ><br />
        Ingin mencetak bukti kasbon sekarang?
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-btn variant="text" @click="skipCetak">Tidak</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="cetakKasbon">
          <template #prepend
            ><IconPrinter :size="14" :stroke-width="1.8"
          /></template>
          Cetak Kasbon
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal: Cari Pengajuan ── -->
  <SearchModal
    v-model="showPengajuanModal"
    title="Cari Nomor Pengajuan"
    :columns="[
      { key: 'nomor', title: 'Nomor', width: '150px' },
      { key: 'tanggal', title: 'Tanggal', width: '100px' },
      { key: 'keterangan', title: 'Keterangan' },
    ]"
    :items="pengajuanOptions"
    :loading="pjhLoading"
    search-placeholder="Cari nomor atau keterangan..."
    :search-keys="['nomor', 'keterangan']"
    @select="selectPengajuan"
  />

  <!-- ── Modal: Cari Account ── -->
  <SearchModal
    v-model="showAccountModal"
    :title="`Pilih Account (${form.jenis})`"
    :columns="[
      { key: 'kode', title: 'Kode', width: '120px' },
      { key: 'nama', title: 'Nama Account' },
      { key: 'cabang', title: 'Cabang', width: '80px', align: 'center' },
    ]"
    :items="accountOptions"
    search-placeholder="Cari kode atau nama..."
    :search-keys="['kode', 'nama']"
    @select="selectAccount"
  />

  <!-- ── Modal: Cari Supplier ── -->
  <SearchModal
    v-model="showSupplierModal"
    title="Cari Supplier"
    :columns="[
      { key: 'kode', title: 'Kode', width: '80px' },
      { key: 'nama', title: 'Nama Supplier' },
      { key: 'bank', title: 'Bank', width: '100px' },
      { key: 'rekening', title: 'Rekening', width: '120px' },
    ]"
    :items="supplierOptions"
    :loading="supplierLoading"
    :server-search="true"
    search-placeholder="Ketik nama supplier lalu Enter..."
    @select="selectSupplier"
    @search="searchSupplier"
  />
</template>

<style scoped>
/* ── Left column wrapper ── */
.left-col-wrap {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

/* ── Form section card ── */
.form-section {
  background: white;
  border: 1px solid #c8e6c9;
  border-radius: 8px;
  border-top: 3px solid #2e7d32;
  padding: 12px 14px;
}
.form-section-title {
  font-size: 10px;
  font-weight: 700;
  color: #2e7d32;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 10px;
}
.form-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

/* ── Field row ── */
.field-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 9px;
}
.field-row:last-child {
  margin-bottom: 0;
}

.field-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
  line-height: 1.3;
}
.req {
  color: #e53935;
}

/* ── Native inputs ── */
.form-inp {
  height: 30px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  padding: 0 8px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #111827;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.form-inp:focus {
  border-color: #2e7d32;
  box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.1);
}
.form-inp:read-only {
  background: #f9fafb;
  color: #6b7280;
}
.form-inp.mono {
  font-family: monospace;
}

/* ── Input with button ── */
.input-with-btn {
  display: flex;
  gap: 5px;
  align-items: center;
}
.input-with-btn .form-inp {
  flex: 1;
  min-width: 0;
}

/* ── Input with badge ── */
.input-with-badge {
  display: flex;
  gap: 6px;
  align-items: center;
}
.input-with-badge .form-inp {
  flex: 1;
}
.badge-info {
  font-size: 10px;
  font-weight: 700;
  color: #f57c00;
  background: #fff3e0;
  border: 1px solid #ffcc80;
  border-radius: 4px;
  padding: 2px 7px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Radio group ── */
.radio-group {
  display: flex;
  gap: 16px;
}
.radio-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  user-select: none;
}
.radio-item input[type="radio"] {
  accent-color: #2e7d32;
  width: 13px;
  height: 13px;
  cursor: pointer;
}

/* ── Icon button ── */
.icon-btn {
  width: 28px;
  height: 30px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4b5563;
  flex-shrink: 0;
  transition: all 0.15s;
}
.icon-btn:hover {
  border-color: #2e7d32;
  color: #2e7d32;
  background: #f0fdf4;
}

/* ── Link button ── */
.link-btn {
  background: none;
  border: none;
  font-size: 11px;
  font-weight: 600;
  color: #2e7d32;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.link-btn:disabled {
  color: #9ca3af;
  text-decoration: none;
  cursor: default;
}

/* ── Permintaan info ── */
.pmt-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pmt-nomor {
  font-size: 11px;
  font-weight: 700;
  color: #2e7d32;
  font-family: monospace;
}
.pmt-nama {
  font-size: 11px;
  color: #6b7280;
}
.pmt-empty {
  font-size: 11px;
  color: #9ca3af;
  font-style: italic;
}

/* ── Detail table (right column) ── */
.section-title {
  font-size: 10px;
  font-weight: 700;
  color: #2e7d32;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
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
.row-reject td {
  background: #fff0f0 !important;
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
.cell-inp:disabled {
  background: #f5f5f5;
  color: #999;
}
.cell-text {
  font-size: 11px;
  display: block;
  padding: 2px 4px;
}
.cell-total {
  font-weight: 700;
  font-size: 11px;
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
.del-btn:hover {
  color: #b71c1c;
}

/* ── Footer ── */
.detail-footer {
  border-top: 2px solid #2e7d32;
  padding: 8px 4px 4px;
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.footer-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.footer-lbl {
  font-size: 11px;
  font-weight: 700;
  color: #374151;
  white-space: nowrap;
}
.footer-val {
  font-size: 13px;
  font-weight: 700;
  color: #2e7d32;
  min-width: 120px;
  text-align: right;
}
.nominal-inp {
  height: 28px;
  border: 1.5px solid #2e7d32;
  border-radius: 5px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1b5e20;
  width: 150px;
  outline: none;
  text-align: right;
}
.nominal-inp:focus {
  box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.15);
}

/* ── Info grid dialog ── */
.info-grid {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 6px 12px;
  font-size: 12px;
}
.info-lbl {
  color: #6b7280;
  font-weight: 600;
}
.info-val {
  color: #111827;
}

.cell-inp[disabled] {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}
</style>
