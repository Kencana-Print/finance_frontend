<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import BaseForm from "@/components/BaseForm.vue";
import SearchModal from "@/components/SearchModal.vue";
import {
  IconTransfer,
  IconSearch,
  IconPlus,
  IconTrash,
  IconPrinter,
} from "@tabler/icons-vue";
import {
  pengajuanTransferFormApi,
  type PengajuanTransferFormDetail,
} from "@/api/transaksi/pengajuanTransferFormApi";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const MENU_ID = "28";
const isEdit = computed(() => !!route.params.nomor);
const isRealisasi = computed(() => !!route.meta?.isRealisasi);
const formTitle = computed(() => {
  if (isRealisasi.value) return "Realisasi Pengajuan Transfer";
  if (isEdit.value) return "Ubah Pengajuan Transfer";
  return "Pengajuan Transfer";
});
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
  rek_rekening: "",
  byrvoucher: "",
  detail: [] as PengajuanTransferFormDetail[],
});

const originalForm = ref<any>(null);

// ── Lookup ─────────────────────────────────────────────────────────────
const accountOptions = ref<{ kode: string; nama: string; rekening: string }[]>(
  [],
);
// Supplier modal state
const showSupplierModal = ref(false);
const showSupDetModal = ref(false);
const activeSupIdx = ref(-1);
const supplierDetOptions = ref<any[]>([]);

// Trs modal state
const activeTrsIdx = ref(-1);
const showVoucherModal = ref(false);
const showPoModal = ref(false);
const showPcModal = ref(false);

// ── Total ─────────────────────────────────────────────────────────────
const totalNominal = computed(() =>
  form.value.detail.reduce((s, d) => s + (Number(d.nominal) || 0), 0),
);
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

// ── onMounted ─────────────────────────────────────────────────────────
onMounted(async () => {
  isLoading.value = true;
  try {
    accountOptions.value = await pengajuanTransferFormApi.getAccountOptions();

    if (!isEdit.value) {
      if (accountOptions.value.length) {
        form.value.rek_kode = accountOptions.value[0].kode;
        form.value.rek_nama = accountOptions.value[0].nama;
        form.value.rek_rekening = accountOptions.value[0].rekening;
      }
      addRow();
    } else {
      const d = await pengajuanTransferFormApi.getDetailForm(
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

// ── Account Header Modal ──────────────────────────────────────────────
const showAccountModal = ref(false);
const selectAccount = (acc: any) => {
  form.value.rek_kode = acc.kode;
  form.value.rek_nama = acc.nama;
  form.value.rek_rekening = acc.rekening;
  showAccountModal.value = false;
};

// ── Generic pagination helper ─────────────────────────────────────────
const MODAL_PAGE_SIZE = 50;

interface ModalState<T> {
  allItems: T[];
  page: number;
  loading: boolean;
  search: string;
}

const createModalState = <T,>(): ModalState<T> => ({
  allItems: [],
  page: 1,
  loading: false,
  search: "",
});

const getPagedItems = <T,>(state: ModalState<T>) => {
  const start = (state.page - 1) * MODAL_PAGE_SIZE;
  return state.allItems.slice(start, start + MODAL_PAGE_SIZE);
};
const getTotalPages = <T,>(state: ModalState<T>) =>
  Math.max(1, Math.ceil(state.allItems.length / MODAL_PAGE_SIZE));

// ── Supplier ──────────────────────────────────────────────────────────
const supState = ref<ModalState<any>>(createModalState());

let supDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const searchSupplierDebounced = () => {
  if (supDebounceTimer) clearTimeout(supDebounceTimer);
  supDebounceTimer = setTimeout(() => doSearchSupplier(), 350);
};
const doSearchSupplier = async () => {
  supState.value.loading = true;
  supState.value.page = 1;
  try {
    // Kirim tanpa limit — backend sudah tidak limit
    supState.value.allItems = await pengajuanTransferFormApi.getSupplierOptions(
      supState.value.search,
    );
  } catch {
    /* silent */
  } finally {
    supState.value.loading = false;
  }
};
const openSupplierModal = async (idx: number) => {
  activeSupIdx.value = idx;
  supState.value = createModalState();
  showSupplierModal.value = true;
  await doSearchSupplier(); // load semua langsung
};
// selectSupplier & selectSupplierDet
const selectSupplier = async (sup: any) => {
  showSupplierModal.value = false;
  const det = await pengajuanTransferFormApi.getSupplierDetail(sup.kode);
  if (det.length === 1) {
    applySupplierDetail(activeSupIdx.value, det[0]);
  } else if (det.length > 1) {
    supplierDetOptions.value = det;
    showSupDetModal.value = true;
  } else {
    applySupplierDetail(activeSupIdx.value, {
      kode: sup.kode,
      nama: sup.nama,
      bank: "",
      rekening: "",
      atasnama: "",
    });
  }
};

const selectSupplierDet = (det: any) => {
  applySupplierDetail(activeSupIdx.value, det);
  showSupDetModal.value = false;
};

const applySupplierDetail = (idx: number, det: any) => {
  if (idx < 0) return;
  const d = form.value.detail[idx];
  d.kode = det.kode || "";
  d.nama = det.nama || "";
  d.bank = det.bank || "";
  d.rekening = det.rekening || "";
  d.atasnama = det.atasnama || "";
};

// ── Voucher ───────────────────────────────────────────────────────────
const vouState = ref<ModalState<any>>(createModalState());

let vouDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const searchVoucherDebounced = () => {
  if (vouDebounceTimer) clearTimeout(vouDebounceTimer);
  vouDebounceTimer = setTimeout(() => doSearchVoucher(), 350);
};
const doSearchVoucher = async () => {
  vouState.value.loading = true;
  vouState.value.page = 1;
  try {
    vouState.value.allItems = await pengajuanTransferFormApi.getVoucherOptions(
      vouState.value.search,
    );
  } catch {
    /* silent */
  } finally {
    vouState.value.loading = false;
  }
};
const openVoucherModal = async (idx: number) => {
  activeTrsIdx.value = idx;
  vouState.value = createModalState();
  showVoucherModal.value = true;
  await doSearchVoucher();
};
const selectVoucher = (v: any) => {
  const exists = form.value.detail.some(
    (d, i) => i !== activeTrsIdx.value && d.trs === v.nomor,
  );
  if (exists) {
    toast.warning("Nomor Voucher tsb sudah di input.");
    return;
  }
  const d = form.value.detail[activeTrsIdx.value];
  d.trs = v.nomor;
  d.nominal = Number(v.nominal) || 0;
  showVoucherModal.value = false;
};

// ── PO External ───────────────────────────────────────────────────────
const poState = ref<ModalState<any>>(createModalState());

let poDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const searchPoDebounced = () => {
  if (poDebounceTimer) clearTimeout(poDebounceTimer);
  poDebounceTimer = setTimeout(() => doSearchPo(), 350);
};
const doSearchPo = async () => {
  poState.value.loading = true;
  poState.value.page = 1;
  try {
    poState.value.allItems =
      await pengajuanTransferFormApi.getPoExternalOptions(poState.value.search);
  } catch {
    /* silent */
  } finally {
    poState.value.loading = false;
  }
};
const openPoModal = async (idx: number) => {
  activeTrsIdx.value = idx;
  poState.value = createModalState();
  showPoModal.value = true;
  await doSearchPo();
};
const selectPo = (p: any) => {
  const exists = form.value.detail.some(
    (d, i) => i !== activeTrsIdx.value && d.trs === p.nomor,
  );
  if (exists) {
    toast.warning("PO External tsb sudah di input.");
    return;
  }
  const d = form.value.detail[activeTrsIdx.value];
  d.trs = p.nomor;
  d.nominal = Number(p.nominal) || 0;
  showPoModal.value = false;
};

// ── Petty Cash ────────────────────────────────────────────────────────
const pcState = ref<ModalState<any>>(createModalState());

let pcDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const searchPcDebounced = () => {
  if (pcDebounceTimer) clearTimeout(pcDebounceTimer);
  pcDebounceTimer = setTimeout(() => doSearchPc(), 350);
};
const doSearchPc = async () => {
  pcState.value.loading = true;
  pcState.value.page = 1;
  try {
    pcState.value.allItems = await pengajuanTransferFormApi.getPettyCashOptions(
      pcState.value.search,
    );
  } catch {
    /* silent */
  } finally {
    pcState.value.loading = false;
  }
};
const openPcModal = async (idx: number) => {
  activeTrsIdx.value = idx;
  pcState.value = createModalState();
  showPcModal.value = true;
  await doSearchPc();
};
const selectPc = (p: any) => {
  const exists = form.value.detail.some(
    (d, i) => i !== activeTrsIdx.value && d.trs === p.nomor,
  );
  if (exists) {
    toast.warning("Nomor tsb sudah di input.");
    return;
  }
  const d = form.value.detail[activeTrsIdx.value];
  d.trs = p.nomor;
  d.nominal = Number(p.nominal) || 0;
  showPcModal.value = false;
};

// ── Account All Modal ─────────────────────────────────────────────────
const showAccModal = ref(false);
const activeAccIdx = ref(-1);
const accAllState = ref<ModalState<any>>(createModalState());

let accDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const searchAccDebounced = () => {
  if (accDebounceTimer) clearTimeout(accDebounceTimer);
  accDebounceTimer = setTimeout(() => doSearchAcc(), 350);
};
const doSearchAcc = async () => {
  accAllState.value.loading = true;
  accAllState.value.page = 1;
  try {
    accAllState.value.allItems = await pengajuanTransferFormApi.getAccountAll(
      accAllState.value.search,
    );
  } catch {
    /* silent */
  } finally {
    accAllState.value.loading = false;
  }
};
const openAccModal = async (idx: number) => {
  activeAccIdx.value = idx;
  accAllState.value = createModalState();
  showAccModal.value = true;
  await doSearchAcc();
};
const selectAcc = (acc: any) => {
  if (activeAccIdx.value < 0) return;
  const d = form.value.detail[activeAccIdx.value];
  if (acc.kode === form.value.rek_kode) {
    toast.warning("Account tidak boleh sama dengan Account header.");
    return;
  }
  d.rekkode = acc.kode;
  d.reknama = acc.nama;
  showAccModal.value = false;
};

// ── Cost Center Modal ─────────────────────────────────────────────────
const showCcModal = ref(false);
const activeCcIdx = ref(-1);
const ccAllState = ref<ModalState<any>>(createModalState());

let ccDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const searchCcDebounced = () => {
  if (ccDebounceTimer) clearTimeout(ccDebounceTimer);
  ccDebounceTimer = setTimeout(() => doSearchCc(), 350);
};
const doSearchCc = async () => {
  ccAllState.value.loading = true;
  ccAllState.value.page = 1;
  try {
    ccAllState.value.allItems =
      await pengajuanTransferFormApi.getCostCenterOptions(
        ccAllState.value.search,
      );
  } catch {
    /* silent */
  } finally {
    ccAllState.value.loading = false;
  }
};
const openCcModal = async (idx: number) => {
  activeCcIdx.value = idx;
  ccAllState.value = createModalState();
  showCcModal.value = true;
  await doSearchCc();
};
const selectCc = (cc: any) => {
  if (activeCcIdx.value < 0) return;
  const d = form.value.detail[activeCcIdx.value];
  const oldCc = d.cckode;
  d.cckode = cc.kode;
  d.ccnama = cc.nama;
  if (oldCc !== cc.kode) {
    d.dcnama = "";
    d.dckode = 0;
  }
  showCcModal.value = false;
};

// ── Detail CC Modal ───────────────────────────────────────────────────
const showDcModal = ref(false);
const activeDcIdx = ref(-1);
const dcAllState = ref<ModalState<any>>(createModalState());

let dcDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const searchDcDebounced = () => {
  if (dcDebounceTimer) clearTimeout(dcDebounceTimer);
  dcDebounceTimer = setTimeout(() => doSearchDc(), 350);
};
const doSearchDc = async () => {
  dcAllState.value.loading = true;
  dcAllState.value.page = 1;
  const cckode = form.value.detail[activeDcIdx.value]?.cckode || 0;
  try {
    dcAllState.value.allItems = await pengajuanTransferFormApi.getDcOptions(
      cckode,
      dcAllState.value.search,
    );
  } catch {
    /* silent */
  } finally {
    dcAllState.value.loading = false;
  }
};
const openDcModal = async (idx: number) => {
  const d = form.value.detail[idx];
  if (!d.cckode) {
    toast.warning("Pilih Cost Center dahulu.");
    return;
  }
  activeDcIdx.value = idx;
  dcAllState.value = createModalState();
  showDcModal.value = true;
  await doSearchDc();
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
    nourut: 0,
    kode: "",
    nama: "",
    bank: "",
    rekening: "",
    atasnama: "",
    trs: "",
    nominal: 0,
    ket: "",
    tglRealisasi: "",
    rekkode: "",
    reknama: "",
    cckode: 0,
    ccnama: "",
    dcnama: "",
    dckode: 0,
    jurnal: "",
    batal: "",
  });
};

const removeRow = (idx: number) => {
  const d = form.value.detail[idx];
  // Delphi: jika sudah realisasi tidak bisa hapus
  if (d.jurnal) {
    toast.warning("Item ini sudah di realisasi. Tidak bisa dihapus.");
    return;
  }
  form.value.detail.splice(idx, 1);
};

// ── Validasi ──────────────────────────────────────────────────────────
const validateSave = () => {
  if (!form.value.rek_kode || !form.value.rek_nama) {
    toast.warning("Rekening Asal harus diisi.");
    return;
  }
  const filled = form.value.detail.filter((d) => d.nama);
  if (!filled.length) {
    toast.warning("Detail harus diisi.");
    return;
  }

  if (!isRealisasi.value) {
    // ── Validasi mode Baru/Edit ──
    for (const d of filled) {
      if (!d.nominal || d.nominal === 0) {
        toast.warning(`Nominal harus diisi pada baris: ${d.nama}`);
        return;
      }
      if (!d.ket.trim()) {
        toast.warning(`Keterangan harus diisi pada baris: ${d.nama}`);
        return;
      }
    }
  } else {
    // ── Validasi mode Realisasi ──
    // Delphi: jika tglRealisasi diisi, account wajib ada
    // Delphi: jika tglRealisasi diisi, DC wajib (kecuali prefix A atau B)
    for (const d of filled) {
      if (d.jurnal) continue; // sudah realisasi sebelumnya — skip
      if (d.batal) continue; // dibatalkan — skip

      if (d.tglRealisasi) {
        if (!d.rekkode) {
          toast.warning(`Account harus diisi pada baris: ${d.nama}`);
          return;
        }
        const prefix = (d.rekkode || "").substring(0, 1);
        if (prefix !== "A" && prefix !== "B") {
          if (d.dckode === 0) {
            const msg = !d.dcnama.trim()
              ? `Detail CC harus diisi pada baris: ${d.nama}`
              : `Detail CC harus diisi dengan benar pada baris: ${d.nama}`;
            toast.warning(msg);
            return;
          }
        }
      }
    }
  }

  showSaveDialog.value = true;
};

const confirmSave = async () => {
  isSaving.value = true;
  try {
    const res = await pengajuanTransferFormApi.save({
      ...form.value,
      isEdit: isEdit.value,
      isRealisasi: isRealisasi.value,
    });
    savedNomor.value = res.data.nomor;
    showSaveDialog.value = false;

    if (isRealisasi.value) {
      // Delphi: realisasi hanya tampil pesan berhasil, tidak cetak
      toast.success(`Berhasil disimpan. Nomor: ${savedNomor.value}`);
      router.push({ name: "PengajuanTransferBrowse" });
    } else {
      showPrintDialog.value = true;
    }
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

// ── Dialog Batal per baris (mode realisasi) ────────────────────────────
const showBatalDialog = ref(false);
const activeBatalIdx = ref(-1);
const batalKet = ref("");

const openBatalDialog = (idx: number) => {
  const d = form.value.detail[idx];
  if (d.tglRealisasi) {
    toast.warning("Jika akan dibatalkan, realisasinya di hapus dulu ya!");
    return;
  }
  activeBatalIdx.value = idx;
  batalKet.value = d.batal || "";
  showBatalDialog.value = true;
};

const confirmBatal = () => {
  if (!batalKet.value.trim()) {
    toast.warning("Keterangan batal harus diisi.");
    return;
  }
  if (activeBatalIdx.value < 0) return;
  form.value.detail[activeBatalIdx.value].batal = batalKet.value.trim();
  showBatalDialog.value = false;
  batalKet.value = "";
};

const clearBatal = (idx: number) => {
  // Delphi: "Gak jadi batal?" dengan konfirmasi Yes/No
  if (confirm("Gak jadi batal?")) {
    form.value.detail[idx].batal = "";
  }
};

const cetakPjt = () => {
  window.open(
    `/transaksi/pengajuan-transfer/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  router.push({ name: "PengajuanTransferBrowse" });
};
const skipCetak = () => {
  showPrintDialog.value = false;
  router.push({ name: "PengajuanTransferBrowse" });
};

const confirmCancel = () => {
  showCancelDialog.value = false;
  if (isEdit.value && originalForm.value) {
    Object.assign(form.value, JSON.parse(JSON.stringify(originalForm.value)));
  } else {
    form.value.tanggal = today;
    form.value.rek_kode = "";
    form.value.rek_nama = "";
    form.value.detail = [];
    addRow();
  }
};
const confirmClose = () => {
  showCloseDialog.value = false;
  router.push({ name: "PengajuanTransferBrowse" });
};
</script>

<template>
  <BaseForm
    :title="formTitle"
    :menu-id="MENU_ID"
    :icon="IconTransfer"
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
    <!-- ══ LEFT COLUMN ══ -->
    <template #left-column>
      <div class="left-col-wrap">
        <div class="form-section">
          <div class="form-section-title">Informasi Pengajuan</div>

          <div class="field-row">
            <label class="field-lbl">Nomor</label>
            <div class="input-with-badge">
              <input
                :value="isEdit ? form.nomor : ''"
                readonly
                class="form-inp mono"
                :placeholder="isEdit ? '' : 'Otomatis'"
              />
              <span v-if="!isEdit" class="badge-info">Auto</span>
            </div>
          </div>

          <div class="field-row">
            <label class="field-lbl">Tanggal</label>
            <input
              v-model="form.tanggal"
              type="date"
              class="form-inp"
              :readonly="isRealisasi"
            />
          </div>

          <div class="field-row">
            <label class="field-lbl"
              >Rekening Asal <span class="req">*</span></label
            >
            <div class="input-with-btn">
              <input
                v-model="form.rek_kode"
                readonly
                class="form-inp mono"
                style="width: 100px; flex-shrink: 0"
                placeholder="Kode"
              />
              <input
                v-model="form.rek_nama"
                readonly
                class="form-inp"
                placeholder="Nama account"
              />
              <button
                v-if="!isRealisasi"
                class="icon-btn"
                type="button"
                @click="showAccountModal = true"
              >
                <IconSearch :size="13" :stroke-width="1.8" />
              </button>
            </div>
            <div
              v-if="form.rek_rekening"
              style="
                font-size: 10px;
                color: #6b7280;
                margin-top: 2px;
                padding-left: 2px;
              "
            >
              Rekening: {{ form.rek_rekening }}
            </div>
          </div>

          <div class="field-row" v-if="form.byrvoucher">
            <label class="field-lbl">No. Bayar Voucher</label>
            <input :value="form.byrvoucher" readonly class="form-inp mono" />
          </div>
        </div>

        <div class="total-box">
          <span class="total-lbl">Total Nominal</span>
          <span class="total-val">{{ fmt(totalNominal) }}</span>
        </div>

        <div class="keyboard-hint">
          <div class="hint-title">Pintasan di kolom No. Transaksi:</div>
          <div class="hint-row">
            <span class="hint-key">F2</span> Voucher Pembayaran
          </div>
          <div class="hint-row">
            <span class="hint-key">F3</span> PO External
          </div>
          <div class="hint-row">
            <span class="hint-key">F4</span> Petty Cash
          </div>
        </div>
      </div>
    </template>

    <!-- ══ RIGHT COLUMN ══ -->
    <template #right-column>
      <div style="height: 100%; display: flex; flex-direction: column">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="section-title">Detail Pengajuan</div>
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
                <th style="width: 90px">Kode Sup</th>
                <th style="min-width: 150px">Nama Supplier</th>
                <th style="width: 80px">Bank</th>
                <th style="min-width: 120px">Atas Nama</th>
                <th style="min-width: 110px">Rekening Tujuan</th>
                <th style="min-width: 130px">No. Transaksi</th>
                <th style="width: 110px">Nominal</th>
                <th style="min-width: 160px">Keterangan</th>
                <th style="width: 100px">Tgl Realisasi</th>
                <th style="width: 90px">Account</th>
                <th style="min-width: 140px">Nama Account</th>
                <th style="min-width: 100px">Cost Center</th>
                <th style="min-width: 100px">Detail CC</th>
                <th style="min-width: 130px">Ket Batal</th>
                <th style="width: 28px"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, idx) in form.detail"
                :key="idx"
                :style="
                  d.batal
                    ? 'color:#cc0000'
                    : d.tglRealisasi
                      ? 'color:#1565c0'
                      : ''
                "
              >
                <td class="tc">{{ idx + 1 }}</td>

                <!-- Kode Sup -->
                <td>
                  <div class="d-flex align-center gap-1">
                    <input
                      v-model="d.kode"
                      class="cell-inp"
                      :readonly="!!d.jurnal || isRealisasi"
                      style="max-width: 55px"
                      @blur="
                        d.kode &&
                        !d.jurnal &&
                        !isRealisasi &&
                        pengajuanTransferFormApi
                          .getSupplierDetail(d.kode)
                          .then((r) => r.length && (d.nama = r[0].nama))
                      "
                    />
                    <button
                      v-if="!isRealisasi && !d.jurnal"
                      type="button"
                      class="sup-btn"
                      @click.stop.prevent="openSupplierModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <!-- Nama Supplier -->
                <td>
                  <span class="cell-text">{{ d.nama || "-" }}</span>
                </td>

                <!-- Bank -->
                <td>
                  <input
                    v-model="d.bank"
                    class="cell-inp"
                    :readonly="!!d.jurnal || isRealisasi"
                  />
                </td>

                <!-- Atas Nama -->
                <td>
                  <input
                    v-model="d.atasnama"
                    class="cell-inp"
                    :readonly="!!d.jurnal || isRealisasi"
                  />
                </td>

                <!-- Rekening Tujuan -->
                <td>
                  <input
                    v-model="d.rekening"
                    class="cell-inp"
                    :readonly="!!d.jurnal || isRealisasi"
                  />
                </td>

                <!-- No. Transaksi + F2/F3/F4 -->
                <td>
                  <div class="d-flex align-center gap-1">
                    <input
                      v-model="d.trs"
                      class="cell-inp"
                      :readonly="!!d.jurnal || isRealisasi"
                      style="min-width: 80px"
                      @keydown.f2.prevent="
                        !d.jurnal && !isRealisasi && openVoucherModal(idx)
                      "
                      @keydown.f3.prevent="
                        !d.jurnal && !isRealisasi && openPoModal(idx)
                      "
                      @keydown.f4.prevent="
                        !d.jurnal && !isRealisasi && openPcModal(idx)
                      "
                    />
                    <div class="trs-btn-group" v-if="!d.jurnal && !isRealisasi">
                      <button
                        type="button"
                        class="trs-btn"
                        title="F2: Voucher"
                        @click.prevent="openVoucherModal(idx)"
                      >
                        V
                      </button>
                      <button
                        type="button"
                        class="trs-btn"
                        title="F3: PO External"
                        @click.prevent="openPoModal(idx)"
                      >
                        P
                      </button>
                      <button
                        type="button"
                        class="trs-btn"
                        title="F4: Petty Cash"
                        @click.prevent="openPcModal(idx)"
                      >
                        C
                      </button>
                    </div>
                  </div>
                </td>

                <!-- Nominal -->
                <td>
                  <input
                    v-model.number="d.nominal"
                    type="number"
                    class="cell-inp tr"
                    :readonly="!!d.jurnal || isRealisasi"
                  />
                </td>

                <!-- Keterangan -->
                <td>
                  <input
                    v-model="d.ket"
                    class="cell-inp"
                    :readonly="!!d.batal"
                  />
                </td>

                <!-- Tgl Realisasi — readonly, diisi saat realisasi -->
                <td>
                  <input
                    v-if="isRealisasi && !d.jurnal && !d.batal"
                    v-model="d.tglRealisasi"
                    type="date"
                    class="cell-inp"
                    style="min-width: 110px"
                  />
                  <span
                    v-else
                    class="cell-text"
                    style="font-size: 10px"
                    :style="{ color: d.tglRealisasi ? '#1565c0' : '#9e9e9e' }"
                  >
                    {{ d.tglRealisasi || "-" }}
                  </span>
                </td>

                <!-- Account -->
                <td>
                  <div class="d-flex align-center gap-1">
                    <span
                      class="cell-text mono-cell"
                      style="
                        max-width: 58px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      {{ d.rekkode || "-" }}
                    </span>
                    <button
                      v-if="isRealisasi && d.tglRealisasi && !d.batal"
                      type="button"
                      class="sup-btn"
                      @click.stop.prevent="openAccModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <!-- Nama Account -->
                <td>
                  <span class="cell-text">{{ d.reknama || "-" }}</span>
                </td>

                <!-- Cost Center -->
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
                      {{ d.ccnama || "-" }}
                    </span>
                    <button
                      v-if="isRealisasi && d.tglRealisasi && !d.batal"
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
                        max-width: 65px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      {{ d.dcnama || "-" }}
                    </span>
                    <button
                      v-if="
                        isRealisasi && d.tglRealisasi && d.cckode && !d.batal
                      "
                      type="button"
                      class="sup-btn"
                      @click.stop.prevent="openDcModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <!-- Ket Batal -->
                <td>
                  <div class="d-flex align-center gap-1">
                    <span
                      class="cell-text"
                      :style="{
                        color: d.batal ? '#cc0000' : '#9e9e9e',
                        fontSize: '10px',
                        maxWidth: '75px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }"
                    >
                      {{ d.batal || "-" }}
                    </span>

                    <template v-if="isRealisasi && !d.jurnal">
                      <!-- Belum batal → tombol Batal -->
                      <button
                        v-if="!d.batal"
                        type="button"
                        class="batal-btn"
                        :disabled="!!d.tglRealisasi"
                        :title="
                          d.tglRealisasi
                            ? 'Hapus realisasi dulu sebelum membatalkan'
                            : 'Batalkan item ini'
                        "
                        @click.prevent="openBatalDialog(idx)"
                      >
                        Batal
                      </button>
                      <!-- Sudah batal → tombol Gak Jadi Batal -->
                      <button
                        v-else
                        type="button"
                        class="unbatal-btn"
                        title="Gak jadi batal"
                        @click.prevent="clearBatal(idx)"
                      >
                        Gak Jadi
                      </button>
                    </template>
                  </div>
                </td>

                <!-- Hapus -->
                <td class="tc">
                  <button
                    v-if="!isRealisasi"
                    class="del-btn"
                    type="button"
                    :disabled="!!d.jurnal"
                    @click.prevent="removeRow(idx)"
                  >
                    <IconTrash :size="12" :stroke-width="1.8" />
                  </button>
                </td>
              </tr>
              <tr v-if="!form.detail.length">
                <td colspan="16" class="empty-td">
                  Belum ada item. Klik Tambah Baris.
                </td>
              </tr>
            </tbody>
            <tfoot v-if="form.detail.length">
              <tr class="foot-row">
                <td colspan="7" class="tr foot-lbl">Total</td>
                <td class="tr foot-val">{{ fmt(totalNominal) }}</td>
                <td colspan="8"></td>
              </tr>
            </tfoot>
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
        Nomor: <strong>{{ savedNomor }}</strong
        ><br />
        Ingin mencetak Pengajuan Transfer sekarang?
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-btn variant="text" @click="skipCetak">Tidak</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="cetakPjt">
          <template #prepend
            ><IconPrinter :size="14" :stroke-width="1.8"
          /></template>
          Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal: Account Header ── -->
  <SearchModal
    v-model="showAccountModal"
    title="Pilih Rekening Asal"
    :columns="[
      { key: 'kode', title: 'Kode', width: '100px' },
      { key: 'nama', title: 'Nama Account' },
      { key: 'rekening', title: 'No. Rekening', width: '140px' },
    ]"
    :items="accountOptions"
    search-placeholder="Cari rekening..."
    :search-keys="['kode', 'nama', 'rekening']"
    @select="selectAccount"
  />

  <!-- ── Modal: Supplier ── -->
  <v-dialog v-model="showSupplierModal" max-width="500" scrollable>
    <v-card rounded="lg">
      <v-card-title class="modal-header">Pilih Supplier</v-card-title>
      <v-card-text class="pa-3 pt-2" style="max-height: 520px">
        <div class="modal-search-bar">
          <div class="modal-search-wrap">
            <IconSearch :size="14" class="modal-search-icon" />
            <input
              v-model="supState.search"
              class="modal-search-input"
              placeholder="Cari nama atau kode supplier..."
              @input="searchSupplierDebounced"
              @keydown.enter="doSearchSupplier"
            />
            <button
              v-if="supState.search"
              class="modal-clear-btn"
              @click="
                supState.search = '';
                doSearchSupplier();
              "
            >
              ×
            </button>
          </div>
          <v-btn
            size="small"
            color="primary"
            variant="flat"
            :loading="supState.loading"
            @click="doSearchSupplier"
            >Cari</v-btn
          >
        </div>
        <div class="modal-table-wrap">
          <table class="modal-tbl">
            <thead>
              <tr>
                <th style="width: 90px">Kode</th>
                <th>Nama Supplier</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="supState.loading">
                <td colspan="2" class="modal-loading">
                  <v-progress-circular
                    size="16"
                    width="2"
                    indeterminate
                    color="primary"
                  />
                  Memuat...
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="s in getPagedItems(supState)"
                  :key="s.kode"
                  class="modal-row"
                  @click="selectSupplier(s)"
                >
                  <td class="mono-cell">{{ s.kode }}</td>
                  <td>{{ s.nama }}</td>
                </tr>
                <tr v-if="!supState.allItems.length">
                  <td colspan="2" class="empty-td">Tidak ada data.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="modal-pagination" v-if="getTotalPages(supState) > 1">
          <button
            class="pg-btn"
            :disabled="supState.page === 1"
            @click="supState.page--"
          >
            ‹
          </button>
          <span class="pg-info">
            {{ supState.page }} / {{ getTotalPages(supState) }}
            <span class="pg-total">({{ supState.allItems.length }} data)</span>
          </span>
          <button
            class="pg-btn"
            :disabled="supState.page >= getTotalPages(supState)"
            @click="supState.page++"
          >
            ›
          </button>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3" style="border-top: 1px solid #e0e0e0">
        <v-btn variant="text" @click="showSupplierModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal: Supplier Detail Rekening ── -->
  <SearchModal
    v-model="showSupDetModal"
    title="Pilih Rekening Supplier"
    :columns="[
      { key: 'bank', title: 'Bank', width: '100px' },
      { key: 'rekening', title: 'No. Rekening', width: '130px' },
      { key: 'atasnama', title: 'Atas Nama' },
    ]"
    :items="supplierDetOptions"
    search-placeholder="Cari rekening..."
    :search-keys="['bank', 'rekening', 'atasnama']"
    @select="selectSupplierDet"
  />

  <!-- ── Modal: Voucher Pembayaran (F2) ── -->
  <v-dialog v-model="showVoucherModal" max-width="640" scrollable>
    <v-card rounded="lg">
      <v-card-title class="modal-header" style="border-top-color: #7b1fa2">
        F2 — Voucher Pembayaran
      </v-card-title>
      <v-card-text class="pa-3 pt-2" style="max-height: 520px">
        <div class="modal-search-bar">
          <div class="modal-search-wrap">
            <IconSearch :size="14" class="modal-search-icon" />
            <input
              v-model="vouState.search"
              class="modal-search-input"
              placeholder="Cari nomor atau supplier..."
              @input="searchVoucherDebounced"
              @keydown.enter="doSearchVoucher"
            />
            <button
              v-if="vouState.search"
              class="modal-clear-btn"
              @click="
                vouState.search = '';
                doSearchVoucher();
              "
            >
              ×
            </button>
          </div>
          <v-btn
            size="small"
            color="purple-darken-2"
            variant="flat"
            :loading="vouState.loading"
            @click="doSearchVoucher"
            >Cari</v-btn
          >
        </div>
        <div class="modal-table-wrap">
          <table class="modal-tbl">
            <thead>
              <tr>
                <th style="width: 140px">Nomor</th>
                <th style="width: 100px">Tanggal</th>
                <th>Supplier</th>
                <th style="width: 120px">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="vouState.loading">
                <td colspan="4" class="modal-loading">
                  <v-progress-circular
                    size="16"
                    width="2"
                    indeterminate
                    color="purple"
                  />
                  Memuat...
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="v in getPagedItems(vouState)"
                  :key="v.nomor"
                  class="modal-row"
                  @click="selectVoucher(v)"
                >
                  <td class="mono-cell">{{ v.nomor }}</td>
                  <td>{{ v.tanggal }}</td>
                  <td>{{ v.supplier }}</td>
                  <td class="tr">{{ fmt(v.nominal) }}</td>
                </tr>
                <tr v-if="!vouState.allItems.length">
                  <td colspan="4" class="empty-td">Tidak ada data.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="modal-pagination" v-if="getTotalPages(vouState) > 1">
          <button
            class="pg-btn"
            :disabled="vouState.page === 1"
            @click="vouState.page--"
          >
            ‹
          </button>
          <span class="pg-info">
            {{ vouState.page }} / {{ getTotalPages(vouState) }}
            <span class="pg-total">({{ vouState.allItems.length }} data)</span>
          </span>
          <button
            class="pg-btn"
            :disabled="vouState.page >= getTotalPages(vouState)"
            @click="vouState.page++"
          >
            ›
          </button>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3" style="border-top: 1px solid #e0e0e0">
        <v-btn variant="text" @click="showVoucherModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal: PO External (F3) ── -->
  <v-dialog v-model="showPoModal" max-width="700" scrollable>
    <v-card rounded="lg">
      <v-card-title class="modal-header" style="border-top-color: #e65100">
        F3 — PO External
      </v-card-title>
      <v-card-text class="pa-3 pt-2" style="max-height: 520px">
        <div class="modal-search-bar">
          <div class="modal-search-wrap">
            <IconSearch :size="14" class="modal-search-icon" />
            <input
              v-model="poState.search"
              class="modal-search-input"
              placeholder="Cari nomor, supplier, atau SPK..."
              @input="searchPoDebounced"
              @keydown.enter="doSearchPo"
            />
            <button
              v-if="poState.search"
              class="modal-clear-btn"
              @click="
                poState.search = '';
                doSearchPo();
              "
            >
              ×
            </button>
          </div>
          <v-btn
            size="small"
            color="orange-darken-2"
            variant="flat"
            :loading="poState.loading"
            @click="doSearchPo"
            >Cari</v-btn
          >
        </div>
        <div class="modal-table-wrap">
          <table class="modal-tbl">
            <thead>
              <tr>
                <th style="width: 140px">Nomor</th>
                <th style="width: 100px">Tanggal</th>
                <th style="width: 110px">SPK</th>
                <th>Supplier</th>
                <th style="width: 120px">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="poState.loading">
                <td colspan="5" class="modal-loading">
                  <v-progress-circular
                    size="16"
                    width="2"
                    indeterminate
                    color="orange"
                  />
                  Memuat...
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="p in getPagedItems(poState)"
                  :key="p.nomor"
                  class="modal-row"
                  @click="selectPo(p)"
                >
                  <td class="mono-cell">{{ p.nomor }}</td>
                  <td>{{ p.tanggal }}</td>
                  <td>{{ p.spk }}</td>
                  <td>{{ p.supplier }}</td>
                  <td class="tr">{{ fmt(p.nominal) }}</td>
                </tr>
                <tr v-if="!poState.allItems.length">
                  <td colspan="5" class="empty-td">Tidak ada data.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="modal-pagination" v-if="getTotalPages(poState) > 1">
          <button
            class="pg-btn"
            :disabled="poState.page === 1"
            @click="poState.page--"
          >
            ‹
          </button>
          <span class="pg-info">
            {{ poState.page }} / {{ getTotalPages(poState) }}
            <span class="pg-total">({{ poState.allItems.length }} data)</span>
          </span>
          <button
            class="pg-btn"
            :disabled="poState.page >= getTotalPages(poState)"
            @click="poState.page++"
          >
            ›
          </button>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3" style="border-top: 1px solid #e0e0e0">
        <v-btn variant="text" @click="showPoModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal: Petty Cash (F4) ── -->
  <v-dialog v-model="showPcModal" max-width="580" scrollable>
    <v-card rounded="lg">
      <v-card-title class="modal-header" style="border-top-color: #00695c">
        F4 — Petty Cash
      </v-card-title>
      <v-card-text class="pa-3 pt-2" style="max-height: 520px">
        <div class="modal-search-bar">
          <div class="modal-search-wrap">
            <IconSearch :size="14" class="modal-search-icon" />
            <input
              v-model="pcState.search"
              class="modal-search-input"
              placeholder="Cari nomor atau store..."
              @input="searchPcDebounced"
              @keydown.enter="doSearchPc"
            />
            <button
              v-if="pcState.search"
              class="modal-clear-btn"
              @click="
                pcState.search = '';
                doSearchPc();
              "
            >
              ×
            </button>
          </div>
          <v-btn
            size="small"
            color="teal-darken-2"
            variant="flat"
            :loading="pcState.loading"
            @click="doSearchPc"
            >Cari</v-btn
          >
        </div>
        <div class="modal-table-wrap">
          <table class="modal-tbl">
            <thead>
              <tr>
                <th style="width: 140px">Nomor</th>
                <th style="width: 100px">Tanggal</th>
                <th style="width: 80px">Store</th>
                <th>Nama Store</th>
                <th style="width: 120px">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pcState.loading">
                <td colspan="5" class="modal-loading">
                  <v-progress-circular
                    size="16"
                    width="2"
                    indeterminate
                    color="teal"
                  />
                  Memuat...
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="p in getPagedItems(pcState)"
                  :key="p.nomor"
                  class="modal-row"
                  @click="selectPc(p)"
                >
                  <td class="mono-cell">{{ p.nomor }}</td>
                  <td>{{ p.tanggal }}</td>
                  <td>{{ p.store }}</td>
                  <td>{{ p.namaStore }}</td>
                  <td class="tr">{{ fmt(p.nominal) }}</td>
                </tr>
                <tr v-if="!pcState.allItems.length">
                  <td colspan="5" class="empty-td">Tidak ada data.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="modal-pagination" v-if="getTotalPages(pcState) > 1">
          <button
            class="pg-btn"
            :disabled="pcState.page === 1"
            @click="pcState.page--"
          >
            ‹
          </button>
          <span class="pg-info">
            {{ pcState.page }} / {{ getTotalPages(pcState) }}
            <span class="pg-total">({{ pcState.allItems.length }} data)</span>
          </span>
          <button
            class="pg-btn"
            :disabled="pcState.page >= getTotalPages(pcState)"
            @click="pcState.page++"
          >
            ›
          </button>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3" style="border-top: 1px solid #e0e0e0">
        <v-btn variant="text" @click="showPcModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal: Account All ── -->
  <v-dialog v-model="showAccModal" max-width="520" scrollable>
    <v-card rounded="lg">
      <v-card-title class="modal-header">Pilih Account</v-card-title>
      <v-card-text class="pa-3 pt-2" style="max-height: 520px">
        <div class="modal-search-bar">
          <div class="modal-search-wrap">
            <IconSearch :size="14" class="modal-search-icon" />
            <input
              v-model="accAllState.search"
              class="modal-search-input"
              placeholder="Cari kode atau nama account..."
              @input="searchAccDebounced"
              @keydown.enter="doSearchAcc"
            />
            <button
              v-if="accAllState.search"
              class="modal-clear-btn"
              @click="
                accAllState.search = '';
                doSearchAcc();
              "
            >
              ×
            </button>
          </div>
          <v-btn
            size="small"
            color="primary"
            variant="flat"
            :loading="accAllState.loading"
            @click="doSearchAcc"
            >Cari</v-btn
          >
        </div>
        <div class="modal-table-wrap">
          <table class="modal-tbl">
            <thead>
              <tr>
                <th style="width: 100px">Kode</th>
                <th>Nama Account</th>
                <th style="width: 70px">Cabang</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="accAllState.loading">
                <td colspan="3" class="modal-loading">
                  <v-progress-circular
                    size="16"
                    width="2"
                    indeterminate
                    color="primary"
                  />
                  Memuat...
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="a in getPagedItems(accAllState)"
                  :key="a.kode"
                  class="modal-row"
                  @click="selectAcc(a)"
                >
                  <td class="mono-cell">{{ a.kode }}</td>
                  <td>{{ a.nama }}</td>
                  <td class="tc">{{ a.cabang }}</td>
                </tr>
                <tr v-if="!accAllState.allItems.length">
                  <td colspan="3" class="empty-td">Ketik dan klik Cari.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="modal-pagination" v-if="getTotalPages(accAllState) > 1">
          <button
            class="pg-btn"
            :disabled="accAllState.page === 1"
            @click="accAllState.page--"
          >
            ‹
          </button>
          <span class="pg-info">
            {{ accAllState.page }} / {{ getTotalPages(accAllState) }}
            <span class="pg-total"
              >({{ accAllState.allItems.length }} data)</span
            >
          </span>
          <button
            class="pg-btn"
            :disabled="accAllState.page >= getTotalPages(accAllState)"
            @click="accAllState.page++"
          >
            ›
          </button>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3" style="border-top: 1px solid #e0e0e0">
        <v-btn variant="text" @click="showAccModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal: Cost Center ── -->
  <v-dialog v-model="showCcModal" max-width="440" scrollable>
    <v-card rounded="lg">
      <v-card-title class="modal-header">Pilih Cost Center</v-card-title>
      <v-card-text class="pa-3 pt-2" style="max-height: 520px">
        <div class="modal-search-bar">
          <div class="modal-search-wrap">
            <IconSearch :size="14" class="modal-search-icon" />
            <input
              v-model="ccAllState.search"
              class="modal-search-input"
              placeholder="Cari nama cost center..."
              @input="searchCcDebounced"
              @keydown.enter="doSearchCc"
            />
            <button
              v-if="ccAllState.search"
              class="modal-clear-btn"
              @click="
                ccAllState.search = '';
                doSearchCc();
              "
            >
              ×
            </button>
          </div>
          <v-btn
            size="small"
            color="primary"
            variant="flat"
            :loading="ccAllState.loading"
            @click="doSearchCc"
            >Cari</v-btn
          >
        </div>
        <div class="modal-table-wrap">
          <table class="modal-tbl">
            <thead>
              <tr>
                <th style="width: 80px">Kode</th>
                <th>Nama</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="ccAllState.loading">
                <td colspan="2" class="modal-loading">
                  <v-progress-circular
                    size="16"
                    width="2"
                    indeterminate
                    color="primary"
                  />
                  Memuat...
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="c in getPagedItems(ccAllState)"
                  :key="c.kode"
                  class="modal-row"
                  @click="selectCc(c)"
                >
                  <td class="mono-cell">{{ c.kode }}</td>
                  <td>{{ c.nama }}</td>
                </tr>
                <tr v-if="!ccAllState.allItems.length">
                  <td colspan="2" class="empty-td">Ketik dan klik Cari.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="modal-pagination" v-if="getTotalPages(ccAllState) > 1">
          <button
            class="pg-btn"
            :disabled="ccAllState.page === 1"
            @click="ccAllState.page--"
          >
            ‹
          </button>
          <span class="pg-info">
            {{ ccAllState.page }} / {{ getTotalPages(ccAllState) }}
            <span class="pg-total"
              >({{ ccAllState.allItems.length }} data)</span
            >
          </span>
          <button
            class="pg-btn"
            :disabled="ccAllState.page >= getTotalPages(ccAllState)"
            @click="ccAllState.page++"
          >
            ›
          </button>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3" style="border-top: 1px solid #e0e0e0">
        <v-btn variant="text" @click="showCcModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal: Detail CC ── -->
  <v-dialog v-model="showDcModal" max-width="440" scrollable>
    <v-card rounded="lg">
      <v-card-title class="modal-header">Pilih Detail Cost Center</v-card-title>
      <v-card-text class="pa-3 pt-2" style="max-height: 520px">
        <div class="modal-search-bar">
          <div class="modal-search-wrap">
            <IconSearch :size="14" class="modal-search-icon" />
            <input
              v-model="dcAllState.search"
              class="modal-search-input"
              placeholder="Cari detail CC..."
              @input="searchDcDebounced"
              @keydown.enter="doSearchDc"
            />
            <button
              v-if="dcAllState.search"
              class="modal-clear-btn"
              @click="
                dcAllState.search = '';
                doSearchDc();
              "
            >
              ×
            </button>
          </div>
          <v-btn
            size="small"
            color="primary"
            variant="flat"
            :loading="dcAllState.loading"
            @click="doSearchDc"
            >Cari</v-btn
          >
        </div>
        <div class="modal-table-wrap">
          <table class="modal-tbl">
            <thead>
              <tr>
                <th style="width: 80px">Kode</th>
                <th>Nama</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="dcAllState.loading">
                <td colspan="2" class="modal-loading">
                  <v-progress-circular
                    size="16"
                    width="2"
                    indeterminate
                    color="primary"
                  />
                  Memuat...
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="dc in getPagedItems(dcAllState)"
                  :key="dc.kode"
                  class="modal-row"
                  @click="selectDc(dc)"
                >
                  <td class="mono-cell">{{ dc.kode }}</td>
                  <td>{{ dc.nama }}</td>
                </tr>
                <tr v-if="!dcAllState.allItems.length">
                  <td colspan="2" class="empty-td">Tidak ada data.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="modal-pagination" v-if="getTotalPages(dcAllState) > 1">
          <button
            class="pg-btn"
            :disabled="dcAllState.page === 1"
            @click="dcAllState.page--"
          >
            ‹
          </button>
          <span class="pg-info">
            {{ dcAllState.page }} / {{ getTotalPages(dcAllState) }}
            <span class="pg-total"
              >({{ dcAllState.allItems.length }} data)</span
            >
          </span>
          <button
            class="pg-btn"
            :disabled="dcAllState.page >= getTotalPages(dcAllState)"
            @click="dcAllState.page++"
          >
            ›
          </button>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3" style="border-top: 1px solid #e0e0e0">
        <v-btn variant="text" @click="showDcModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Batal Item ── -->
  <v-dialog v-model="showBatalDialog" max-width="380" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #cc0000"
      >
        Batalkan Item
      </v-card-title>
      <v-card-text class="pa-4 pt-2">
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px">
          Item: <strong>{{ form.detail[activeBatalIdx]?.nama }}</strong>
        </div>
        <label style="font-size: 11px; font-weight: 600; color: #4b5563">
          Keterangan Batal <span style="color: red">*</span>
        </label>
        <v-text-field
          v-model="batalKet"
          density="compact"
          variant="outlined"
          hide-details
          class="mt-1"
          placeholder="Alasan pembatalan..."
          autofocus
          @keydown.enter="confirmBatal"
        />
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="showBatalDialog = false">Tutup</v-btn>
        <v-spacer />
        <v-btn
          color="error"
          variant="flat"
          :disabled="!batalKet.trim()"
          @click="confirmBatal"
        >
          Konfirmasi Batal
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Left column ── */
.left-col-wrap {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}
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

/* ── Field rows ── */
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
.form-inp[readonly] {
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

/* ── Total box ── */
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

/* Keyboard hint */
.keyboard-hint {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 12px;
}
.hint-title {
  font-size: 10px;
  font-weight: 700;
  color: #6b7280;
  margin-bottom: 4px;
}
.hint-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.hint-key {
  background: #e5e7eb;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  padding: 0 5px;
  font-family: monospace;
  color: #374151;
}

/* ── Detail table ── */
.section-title {
  font-size: 10px;
  font-weight: 700;
  color: #2e7d32;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  padding: 5px 5px;
  white-space: nowrap;
  text-align: left;
}
.detail-table td {
  padding: 2px 3px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.detail-table tbody tr:hover td {
  background: rgba(46, 125, 50, 0.04);
}
.detail-table tfoot .foot-row td {
  background: #f0fdf4;
  border-top: 2px solid #2e7d32;
  padding: 4px 5px;
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
  border-radius: 2px;
  padding: 0 3px;
  font-size: 11px;
  outline: none;
  background: white;
}
.cell-inp:focus {
  border-color: #2e7d32;
}
.cell-inp[readonly] {
  background: #f5f5f5;
  color: #9e9e9e;
}
.cell-inp.tr {
  text-align: right;
}
.cell-text {
  font-size: 11px;
  display: block;
  padding: 2px 3px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.empty-td {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 10px;
}

/* Sup button */
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
.sup-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* Trs button group */
.trs-btn-group {
  display: flex;
  gap: 1px;
  flex-shrink: 0;
}
.trs-btn {
  width: 18px;
  height: 18px;
  border: 1px solid #ccc;
  border-radius: 2px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 9px;
  font-weight: 700;
  color: #555;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.trs-btn:hover {
  background: #e3f2fd;
  border-color: #1565c0;
  color: #1565c0;
}

/* Del button */
.del-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #c62828;
  padding: 2px;
}
.del-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

/* Modal table */
.modal-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.modal-tbl thead tr {
  background: #2e7d32;
}
.modal-tbl th {
  color: white;
  font-weight: 700;
  padding: 4px 6px;
  text-align: left;
}
.modal-tbl td {
  padding: 3px 6px;
  border-bottom: 1px solid #f0f0f0;
}
.modal-row {
  cursor: pointer;
}
.modal-row:hover td {
  background: rgba(46, 125, 50, 0.08);
}

/* ── Modal header ── */
.modal-header {
  font-size: 13px;
  font-weight: 700;
  padding: 12px 16px 10px;
  border-top: 3px solid #2e7d32;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

/* ── Search bar ── */
.modal-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.modal-search-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.modal-search-icon {
  position: absolute;
  left: 8px;
  color: #9ca3af;
  pointer-events: none;
  flex-shrink: 0;
}
.modal-search-input {
  width: 100%;
  height: 34px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 30px 0 30px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
}
.modal-search-input:focus {
  border-color: #2e7d32;
}
.modal-clear-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  font-size: 16px;
  line-height: 1;
  padding: 0;
}
.modal-clear-btn:hover {
  color: #374151;
}

/* ── Table wrap ── */
.modal-table-wrap {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  max-height: 340px;
  overflow-y: auto;
}

/* Override modal-tbl di dalam modal ini */
.modal-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.modal-tbl thead tr {
  background: #2e7d32;
  position: sticky;
  top: 0;
  z-index: 1;
}
.modal-tbl th {
  color: white;
  font-weight: 700;
  padding: 8px 10px;
  text-align: left;
  white-space: nowrap;
}
.modal-tbl td {
  padding: 6px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.modal-row {
  cursor: pointer;
}
.modal-row:hover td {
  background: rgba(46, 125, 50, 0.08);
}

.mono-cell {
  font-family: monospace;
  font-size: 11px;
  color: #6b7280;
}

.modal-loading {
  text-align: center;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #6b7280;
  font-size: 12px;
}

/* ── Pagination ── */
.modal-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 0 2px;
}
.pg-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  background: white;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pg-btn:hover:not(:disabled) {
  background: rgba(46, 125, 50, 0.1);
  border-color: #2e7d32;
  color: #2e7d32;
}
.pg-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.pg-info {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 4px;
}
.pg-total {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 400;
}

.batal-btn {
  background: none;
  border: 1px solid #cc0000;
  border-radius: 3px;
  cursor: pointer;
  color: #cc0000;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  white-space: nowrap;
  flex-shrink: 0;
}
.batal-btn:hover:not(:disabled) {
  background: #ffebee;
}
.batal-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #ccc;
  color: #999;
}

.unbatal-btn {
  background: none;
  border: 1px solid #2e7d32;
  border-radius: 3px;
  cursor: pointer;
  color: #2e7d32;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  white-space: nowrap;
  flex-shrink: 0;
}
.unbatal-btn:hover {
  background: #e8f5e9;
}
</style>
