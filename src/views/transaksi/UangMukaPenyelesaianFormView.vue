<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import SearchModal from "@/components/SearchModal.vue";
import {
  IconReceipt2,
  IconSearch,
  IconPlus,
  IconTrash,
  IconPrinter,
} from "@tabler/icons-vue";
import {
  uangMukaPenyelesaianApi,
  type PenyelesaianDetail,
} from "@/api/transaksi/uangMukaPenyelesaianApi";
import { uangMukaFormApi } from "@/api/transaksi/uangMukaFormApi";
import { bbkFormApi } from "@/api/transaksi/bbkFormApi";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const MENU_ID = "21";
const isLoading = ref(false);
const isSaving = ref(false);
const originalForm = ref<any>(null);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const showPrintDialog = ref(false);
const showPermintaanDialog = ref(false);
const savedNoBkk = ref("");

const detailAccountLoading = ref(false);

// ── State Modals Pjh ──────────────────────────────────────────────────
const activePjhIdx = ref(-1);

const showModalPjh = ref(false);
const showModalPoExt = ref(false);
const showModalVoucher = ref(false);
const showModalMb = ref(false);
const showModalIv = ref(false);

const optPjh = ref<any[]>([]);
const optPoExt = ref<any[]>([]);
const optVoucher = ref<any[]>([]);
const optMb = ref<any[]>([]);
const optIv = ref<any[]>([]);

// ── Form state ─────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

const form = ref({
  nomor: "",
  jenis: "KAS",
  nomerator: "BKK",
  tanggal: today,
  tgl_bkk: today,
  no_bkk: "",
  rek_kode: "",
  rek_nama: "",
  pjh_nomor: "",
  nota: "",
  nominal: 0,
  penerima: "",
  keterangan: "",
  cabang: "P01",
  is_edit: false,
  info_permintaan: null as any,
  detail: [] as PenyelesaianDetail[],
});

// ── Lookup ─────────────────────────────────────────────────────────────
const accountOptions = ref<{ kode: string; nama: string; cabang: string }[]>(
  [],
);
const ccOptions = ref<{ kode: number; nama: string }[]>([]);

onMounted(async () => {
  isLoading.value = true;
  try {
    const nomor = decodeURIComponent(route.params.nomor as string);

    // Fetch semua sekaligus — termasuk accountAll
    const [d, accOpts, ccOpts, accAll] = await Promise.all([
      uangMukaPenyelesaianApi.getFormData(nomor),
      uangMukaPenyelesaianApi.getAccountOptions("KAS", "P01"), // placeholder, di-update setelah d loaded
      uangMukaPenyelesaianApi.getCostCenterOptions(),
      bbkFormApi.getAccountAll(), // ← fetch bersamaan
    ]);

    Object.assign(form.value, d);
    originalForm.value = JSON.parse(JSON.stringify(d));

    // Re-fetch account sesuai jenis & cabang yang benar
    accountOptions.value = await uangMukaPenyelesaianApi.getAccountOptions(
      d.jenis,
      d.cabang,
    );
    ccOptions.value = ccOpts;
    detailAccountOptions.value = accAll; // ← simpan langsung ke cache
  } catch (e: any) {
    if (e?.isAuthExpired) return;
    toast.error(e.response?.data?.message ?? "Gagal memuat data.");
    router.back();
  } finally {
    isLoading.value = false;
  }
});

// ── Total ──────────────────────────────────────────────────────────────
const totalKasbon = computed(() => form.value.nominal);
const totalTerpakai = computed(() =>
  form.value.detail.reduce(
    (s, d) => s + (d.verified && d.total > 0 ? d.total : 0),
    0,
  ),
);
const totalSisa = computed(() => totalKasbon.value - totalTerpakai.value);

const hitungTotal = (d: PenyelesaianDetail) => {
  d.total = d.qty * d.harga;
};

const onVerifiedChange = (d: PenyelesaianDetail) => {
  // Delphi: kalau uraian kosong → reset qty/harga, unverify
  if (!d.uraian.trim()) {
    d.verified = false;
    d.qty = 0;
    d.harga = 0;
    d.total = 0;
  }
  // hitungTotal tetap jalan
};

const cekDuplikatPjh = (nomor: string) => {
  return form.value.detail.some((d) => d.pjh === nomor);
};

const onPjhKeyDown = async (e: KeyboardEvent, idx: number) => {
  if (["F1", "F2", "F3", "F4", "F5"].includes(e.key)) {
    e.preventDefault(); // Blok fungsi bawaan browser (seperti Help atau Search)
    activePjhIdx.value = idx;

    try {
      if (e.key === "F1") {
        // Validasi Delphi: Jika ada pengajuan di header, tolak.
        if (form.value.pjh_nomor) {
          toast.warning(
            "Ada pengajuan GA di header. Tidak bisa menambah pengajuan GA di detail.",
          );
          return;
        }
        optPjh.value = await uangMukaPenyelesaianApi.getListPengajuanGA(
          form.value.cabang,
        );
        showModalPjh.value = true;
      } else if (e.key === "F2") {
        optPoExt.value = await uangMukaPenyelesaianApi.getListPoExternal();
        showModalPoExt.value = true;
      } else if (e.key === "F3") {
        optVoucher.value = await uangMukaPenyelesaianApi.getListVoucher();
        showModalVoucher.value = true;
      } else if (e.key === "F4") {
        optMb.value = await uangMukaPenyelesaianApi.getListPermintaanGarmen(
          form.value.cabang,
        );
        showModalMb.value = true;
      } else if (e.key === "F5") {
        optIv.value = await uangMukaPenyelesaianApi.getListInvoiceGarmen();
        showModalIv.value = true;
      }
    } catch {
      toast.error("Gagal mengambil data dari server.");
    }
  }
};

// ── Select Handlers (F2 & F3 mengisi baris saat ini) ──────────────────
const selectPoExt = (item: any) => {
  if (cekDuplikatPjh(item.nomor))
    return toast.warning("PO External tsb sudah di input");
  const d = form.value.detail[activePjhIdx.value];
  d.pjh = item.nomor;
  d.uraian = "DP PO External " + item.nomor;
  d.qty = 1;
  showModalPoExt.value = false;
};

const selectVoucher = (item: any) => {
  if (cekDuplikatPjh(item.nomor))
    return toast.warning("Nomor Voucher tsb sudah di input");
  const d = form.value.detail[activePjhIdx.value];
  d.pjh = item.nomor;
  d.uraian = "Pembayaran Jasa " + item.nomor;
  d.qty = 1;
  showModalVoucher.value = false;
};

// ── Select Handlers (F1, F4, F5 load banyak baris dari DB) ────────────
const loadDetailBaru = async (nomor: string, tipe: string) => {
  if (cekDuplikatPjh(nomor)) return toast.warning("Nomor tsb sudah di input");

  try {
    let detailTambahan: PenyelesaianDetail[] = [];

    // Gunakan fungsi detail yang spesifik
    if (tipe === "ga") {
      detailTambahan =
        await uangMukaPenyelesaianApi.getDetailPengajuanGA(nomor);
    } else if (tipe === "minta-garmen") {
      detailTambahan =
        await uangMukaPenyelesaianApi.getDetailPermintaanGarmen(nomor);
    } else if (tipe === "invoice-garmen") {
      detailTambahan =
        await uangMukaPenyelesaianApi.getDetailInvoiceGarmen(nomor);
    }

    // Hapus baris kosong yang sedang aktif jika uraian kosong
    if (!form.value.detail[activePjhIdx.value].uraian) {
      form.value.detail.splice(activePjhIdx.value, 1);
    }
    // Append data detail baru
    form.value.detail.push(...detailTambahan);
  } catch {
    toast.error("Gagal memuat detail.");
  }
};

const selectPjh = (item: any) => {
  loadDetailBaru(item.nomor, "ga");
  showModalPjh.value = false;
};

const selectMb = (item: any) => {
  loadDetailBaru(item.nomor, "minta-garmen");
  showModalMb.value = false;
};

const selectIv = (item: any) => {
  loadDetailBaru(item.invoice, "invoice-garmen");
  showModalIv.value = false;
};

// ── Search Modal: Account ─────────────────────────────────────────────
const showAccountModal = ref(false);
const selectAccount = (acc: any) => {
  form.value.rek_kode = acc.kode;
  form.value.rek_nama = acc.nama;
  showAccountModal.value = false;
};

// ── Search Modal: Account per baris detail ────────────────────────────
const showDetailAccountModal = ref(false);
const activeDetailIdx = ref(-1);
const detailAccountOptions = ref<any[]>([]);

const openDetAccountModal = (idx: number) => {
  activeDetailIdx.value = idx;
  showDetailAccountModal.value = true; // data sudah ada dari onMounted
};

const selectDetailAccount = (acc: any) => {
  if (activeDetailIdx.value < 0) return;
  const d = form.value.detail[activeDetailIdx.value];
  // Delphi: tidak boleh sama dengan account header
  if (acc.kode === form.value.rek_kode) {
    toast.warning("Account tidak boleh sama dengan Account header.");
    return;
  }
  d.rekkode = acc.kode;
  d.reknama = acc.nama;
  showDetailAccountModal.value = false;
};

// ── Search Modal: Cost Center ─────────────────────────────────────────
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
  d.ccnama = cc.nama; // ← tambah ini
  if (oldCc !== cc.kode) d.dcnama = "";
  showCcModal.value = false;
};

// ── Search Modal: Detail CC ───────────────────────────────────────────
const showDcModal = ref(false);
const activeDcIdx = ref(-1);
const dcOptions = ref<{ kode: number; nama: string }[]>([]);

const openDcModal = async (idx: number) => {
  activeDcIdx.value = idx;
  const d = form.value.detail[idx];
  if (!d.cckode) {
    toast.warning("Pilih Cost Center dahulu.");
    return;
  }
  dcOptions.value = await uangMukaPenyelesaianApi.getDcOptions(d.cckode);
  showDcModal.value = true;
};

const selectDc = (dc: any) => {
  if (activeDcIdx.value < 0) return;
  form.value.detail[activeDcIdx.value].dcnama = dc.nama;
  showDcModal.value = false;
};

// ── Search Modal: Supplier ────────────────────────────────────────────
const showSupplierModal = ref(false);
const activeSupIdx = ref(-1);
const supplierOptions = ref<any[]>([]);
const supplierLoading = ref(false);
const supplierSearch = ref("");

const openSupplierModal = async (idx: number) => {
  activeSupIdx.value = idx;
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

const searchSupplier = async (query: string) => {
  supplierLoading.value = true;
  try {
    supplierOptions.value = await uangMukaFormApi.getSupplierOptions(
      query || "",
    );
  } catch {
    /* silent */
  } finally {
    supplierLoading.value = false;
  }
};

const selectSupplier = (sup: any) => {
  if (activeSupIdx.value < 0) return;
  const d = form.value.detail[activeSupIdx.value];
  d.kdsup = sup.kode;
  d.supplier = sup.nama;
  d.bank = sup.bank;
  d.rekening = sup.rekening;
  d.atasnama = sup.atasnama;
  showSupplierModal.value = false;
};

// ── Tambah baris baru ─────────────────────────────────────────────────
const addRow = () => {
  form.value.detail.push({
    no: form.value.detail.length + 1,
    pjh: "",
    pmt: "",
    uraian: "",
    spesifikasi: "",
    satuan: "",
    qty: 1,
    harga: 0,
    total: 0,
    verified: true,
    guna: "",
    ga: 0,
    rekkode: "",
    reknama: "",
    cckode: 0,
    ccnama: "",
    dcnama: "",
    kdsup: "",
    supplier: "",
    bank: "",
    rekening: "",
    atasnama: "",
    gabrg: 0,
    edit: 0,
    pjh_link: "",
    kdbrg: "",
    mb: "",
    jenis_item: "",
    cab_item: "",
  });
};

const removeRow = (idx: number) => {
  const d = form.value.detail[idx];
  if (d.ga !== 0) {
    toast.warning("Hanya record baru yang bisa dihapus.");
    return;
  }
  form.value.detail.splice(idx, 1);
};

// ── Validasi ──────────────────────────────────────────────────────────
const validateSave = () => {
  if (!form.value.rek_kode || !form.value.rek_nama) {
    toast.warning("Account harus diisi.");
    return;
  }

  const verifiedItems = form.value.detail.filter(
    (d) => d.uraian.trim() && d.verified,
  );

  if (verifiedItems.length === 0) {
    toast.warning(
      "Tidak ada pengajuan yang diverifikasi. Tidak bisa disimpan.",
    );
    return;
  }

  const totalQty = verifiedItems.reduce((s, d) => s + d.qty, 0);
  if (totalQty === 0) {
    toast.warning("Total Qty yang diverifikasi kosong. Tidak bisa disimpan.");
    return;
  }

  // Delphi: cek account detail wajib kalau verified
  for (const d of verifiedItems) {
    if (!d.reknama) {
      toast.warning(`Nama Account harus diisi pada item: ${d.uraian}`);
      return;
    }
    // Delphi: kalau account bukan A-xxx atau B-xxx → wajib DC
    const prefix = (d.rekkode || "").substring(0, 1);
    if (prefix !== "A" && prefix !== "B") {
      if (!d.dcnama.trim() || !d.cckode) {
        toast.warning(`Detail CC harus diisi pada item: ${d.uraian}`);
        return;
      }
    }
    // Delphi: kalau ada mb (permintaan garmen) → supplier wajib
    if (d.mb && !d.kdsup) {
      toast.warning(
        `Supplier harus diisi untuk Permintaan Garmen: ${d.uraian}`,
      );
      return;
    }
  }

  showSaveDialog.value = true;
};

const confirmSave = async () => {
  isSaving.value = true;
  try {
    const res = await uangMukaPenyelesaianApi.save({
      ...form.value,
      no_bkk_lama: form.value.no_bkk,
    });
    savedNoBkk.value = res.data.no_bkk || "";
    showSaveDialog.value = false;
    showPrintDialog.value = true;
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

const cetakSelesai = () => {
  window.open(
    `/transaksi/uang-muka/print-selesai/${encodeURIComponent(form.value.nomor)}`,
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
  if (originalForm.value) {
    // Reset ke data original dari server
    Object.assign(form.value, JSON.parse(JSON.stringify(originalForm.value)));
  }
};

const confirmClose = () => {
  showCloseDialog.value = false;
  router.push({ name: "UangMukaBrowse" });
};

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

// ── Format nominal (separator ribuan) ────────────────────────────────
const parseNum = (v: string) =>
  Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

const formatNum = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

const onHargaInput = (d: PenyelesaianDetail, e: Event) => {
  d.harga = parseNum((e.target as HTMLInputElement).value);
  hitungTotal(d);
};
const onHargaBlur = (d: PenyelesaianDetail, e: Event) => {
  (e.target as HTMLInputElement).value = formatNum(d.harga);
};
const onHargaFocus = (d: PenyelesaianDetail, e: Event) => {
  (e.target as HTMLInputElement).value = d.harga ? String(d.harga) : "";
};

const onQtyInput = (d: PenyelesaianDetail, e: Event) => {
  d.qty = parseNum((e.target as HTMLInputElement).value);
  hitungTotal(d);
};
const onQtyBlur = (d: PenyelesaianDetail, e: Event) => {
  (e.target as HTMLInputElement).value = formatNum(d.qty);
};
const onQtyFocus = (d: PenyelesaianDetail, e: Event) => {
  (e.target as HTMLInputElement).value = d.qty ? String(d.qty) : "";
};

// ── Row color — baris yang perlu perhatian ────────────────────────────
const rowClass = (d: PenyelesaianDetail) => {
  if (!d.verified) return "row-unverified";
  if (d.verified && d.reknama === "") return "row-warn";
  return "";
};
</script>

<template>
  <BaseForm
    title="Penyelesaian Uang Muka / Kasbon"
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
    :is-edit-mode="true"
  >
    <!-- ── LEFT COLUMN ── -->
    <template #left-column>
      <div class="left-col-wrap">
        <!-- Info Kasbon -->
        <div class="form-section">
          <div class="form-section-title">Info Kasbon</div>

          <div class="field-row">
            <label class="field-lbl">No. Kasbon</label>
            <input :value="form.nomor" readonly class="form-inp mono" />
          </div>

          <div class="field-row-2col">
            <div class="field-row">
              <label class="field-lbl">Tgl Kasbon</label>
              <input
                :value="form.tanggal"
                readonly
                class="form-inp"
                type="date"
              />
            </div>
            <div class="field-row">
              <label class="field-lbl">Jenis</label>
              <input :value="form.jenis" readonly class="form-inp" />
            </div>
          </div>
        </div>

        <!-- Info BKK/BBK -->
        <div class="form-section">
          <div class="form-section-title">Info BKK / BBK</div>

          <div class="field-row-2col">
            <div class="field-row">
              <label class="field-lbl">No. BKK/BBK</label>
              <input
                :value="form.no_bkk || '(Otomatis)'"
                readonly
                class="form-inp mono"
              />
            </div>
            <div class="field-row">
              <label class="field-lbl">Tgl Penyelesaian</label>
              <input v-model="form.tgl_bkk" type="date" class="form-inp" />
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
                type="button"
                @click="showAccountModal = true"
              >
                <IconSearch :size="13" :stroke-width="1.8" />
              </button>
            </div>
          </div>

          <div class="field-row-2col">
            <div class="field-row">
              <label class="field-lbl">Penerima</label>
              <input
                v-model="form.penerima"
                class="form-inp"
                placeholder="Penerima"
              />
            </div>
            <div class="field-row">
              <label class="field-lbl">No. Nota</label>
              <input
                v-model="form.nota"
                class="form-inp"
                placeholder="No. nota"
              />
            </div>
          </div>

          <div class="field-row">
            <label class="field-lbl">Keterangan</label>
            <input
              v-model="form.keterangan"
              class="form-inp"
              placeholder="Keterangan"
            />
          </div>

          <div class="field-row">
            <label class="field-lbl">No. Pengajuan</label>
            <input
              :value="form.pjh_nomor"
              readonly
              class="form-inp mono"
              placeholder="-"
            />
          </div>
        </div>

        <!-- Info Permintaan -->
        <div v-if="form.info_permintaan" class="form-section">
          <div class="form-section-header">
            <div class="form-section-title" style="margin-bottom: 0">
              Info Permintaan
            </div>
            <button
              class="link-btn"
              type="button"
              @click="showPermintaanDialog = true"
            >
              Lihat Detail
            </button>
          </div>
          <div class="pmt-info">
            <span class="pmt-nomor">{{ form.info_permintaan.pmt_nomor }}</span>
            <span class="pmt-nama">{{ form.info_permintaan.nama }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ── RIGHT COLUMN ── -->
    <template #right-column>
      <div style="height: 100%; display: flex; flex-direction: column">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="section-title">Detail Penyelesaian</div>
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
                <th style="width: 35px">Kode</th>
                <th style="min-width: 120px">No.Pengajuan</th>
                <th style="min-width: 150px">Uraian</th>
                <th style="min-width: 90px">Spesifikasi</th>
                <th style="width: 55px">Satuan</th>
                <th style="width: 80px">Qty</th>
                <th style="width: 120px">Nominal Satuan</th>
                <th style="width: 110px">Total</th>
                <th style="min-width: 130px">Account</th>
                <th style="min-width: 240px">Nama Account</th>
                <th style="min-width: 200px">Cost Center</th>
                <th style="min-width: 200px">Detail CC</th>
                <th style="width: 45px">Ver</th>
                <th style="min-width: 80px">Kegunaan</th>
                <th style="width: 70px">Kd.Sup</th>
                <th style="min-width: 100px">Supplier</th>
                <th style="min-width: 90px">Bank</th>
                <th style="min-width: 110px">Rekening</th>
                <th style="min-width: 100px">Atas Nama</th>
                <th style="width: 60px">Jenis</th>
                <th style="width: 55px">Cab</th>
                <th style="min-width: 80px">Kd.Brg</th>
                <th style="width: 28px"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, idx) in form.detail"
                :key="idx"
                :class="rowClass(d)"
              >
                <!-- Kode (no) -->
                <td class="tc">{{ d.no }}</td>

                <!-- No.Pengajuan (pjh) — dari GA pjh diisi pmt_pjh_nomor kalau pjh='' di header -->
                <td>
                  <span v-if="d.ga !== 0 && d.pjh" class="cell-text">{{
                    d.pjh
                  }}</span>
                  <input
                    v-else
                    v-model="d.pjh"
                    class="cell-inp"
                    placeholder="F1-F5 utk cari"
                    @keydown="onPjhKeyDown($event, idx)"
                  />
                </td>

                <!-- Uraian -->
                <td>
                  <span v-if="d.ga !== 0" class="cell-text">{{
                    d.uraian
                  }}</span>
                  <input v-else v-model="d.uraian" class="cell-inp" />
                </td>

                <!-- Spesifikasi -->
                <td>
                  <span v-if="d.ga !== 0" class="cell-text">{{
                    d.spesifikasi
                  }}</span>
                  <input v-else v-model="d.spesifikasi" class="cell-inp" />
                </td>

                <!-- Satuan -->
                <td>
                  <span v-if="d.ga !== 0" class="cell-text">{{
                    d.satuan
                  }}</span>
                  <input v-else v-model="d.satuan" class="cell-inp" />
                </td>

                <!-- Qty -->
                <td>
                  <input
                    :value="formatNum(d.qty)"
                    type="text"
                    inputmode="numeric"
                    class="cell-inp tr"
                    style="min-width: 65px"
                    @focus="onQtyFocus(d, $event)"
                    @input="onQtyInput(d, $event)"
                    @blur="onQtyBlur(d, $event)"
                  />
                </td>

                <!-- Nominal Satuan -->
                <td>
                  <input
                    :value="formatNum(d.harga)"
                    type="text"
                    inputmode="numeric"
                    class="cell-inp tr"
                    style="min-width: 65px"
                    @focus="onHargaFocus(d, $event)"
                    @input="onHargaInput(d, $event)"
                    @blur="onHargaBlur(d, $event)"
                  />
                </td>

                <!-- Total -->
                <td class="tr cell-total">{{ fmt(d.total) }}</td>

                <!-- Account (rekkode) -->
                <td>
                  <div class="d-flex align-center gap-1" @click.stop>
                    <span
                      class="cell-text"
                      style="
                        max-width: 60px;
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

                <!-- Nama Account -->
                <td>
                  <span
                    class="cell-text"
                    style="min-width: 200px; display: block"
                  >
                    {{ d.reknama || "-" }}
                  </span>
                </td>

                <!-- Cost Center -->
                <td>
                  <div class="d-flex align-center gap-1" @click.stop>
                    <span
                      class="cell-text"
                      style="
                        max-width: 155px;
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
                  <div class="d-flex align-center gap-1" @click.stop>
                    <span
                      class="cell-text"
                      style="
                        max-width: 155px;
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

                <!-- Verified -->
                <td class="tc">
                  <input
                    type="checkbox"
                    v-model="d.verified"
                    @change="onVerifiedChange(d)"
                  />
                </td>

                <!-- Kegunaan -->
                <td><input v-model="d.guna" class="cell-inp" /></td>

                <!-- Kd.Sup -->
                <td>
                  <div class="d-flex align-center gap-1" @click.stop>
                    <input
                      v-model="d.kdsup"
                      class="cell-inp"
                      style="width: 45px"
                      readonly
                      placeholder="Kode"
                    />
                    <button
                      type="button"
                      class="sup-btn"
                      @click.stop.prevent="openSupplierModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <!-- Supplier -->
                <td>
                  <input v-model="d.supplier" class="cell-inp" readonly />
                </td>

                <!-- Bank -->
                <td>
                  <input v-model="d.bank" class="cell-inp" placeholder="Bank" />
                </td>

                <!-- Rekening -->
                <td>
                  <input
                    v-model="d.rekening"
                    class="cell-inp"
                    placeholder="Rekening"
                  />
                </td>

                <!-- Atas Nama -->
                <td>
                  <input
                    v-model="d.atasnama"
                    class="cell-inp"
                    placeholder="Atas nama"
                  />
                </td>

                <!-- Jenis (item) -->
                <td>
                  <span class="cell-text">{{ d.jenis_item || "-" }}</span>
                </td>

                <!-- Cab -->
                <td>
                  <span class="cell-text">{{ d.cab_item || "-" }}</span>
                </td>

                <!-- Kd.Brg -->
                <td>
                  <span class="cell-text">{{ d.kdbrg || "-" }}</span>
                </td>

                <!-- Hapus -->
                <td class="tc">
                  <button
                    v-if="d.ga === 0"
                    class="del-btn"
                    type="button"
                    @click.prevent="removeRow(idx)"
                  >
                    <IconTrash :size="12" :stroke-width="1.8" />
                  </button>
                </td>
              </tr>
              <tr v-if="!form.detail.length">
                <td colspan="23" class="empty-td">Belum ada item.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer totals -->
        <div class="detail-footer">
          <div class="footer-item">
            <span class="footer-lbl">Total Kasbon</span>
            <span class="footer-val">{{ fmt(totalKasbon) }}</span>
          </div>
          <div class="footer-item">
            <span class="footer-lbl">Terpakai</span>
            <span class="footer-val" style="color: #1565c0">{{
              fmt(totalTerpakai)
            }}</span>
          </div>
          <div class="footer-item">
            <span class="footer-lbl">Kurang/Lebih</span>
            <span
              class="footer-val"
              :style="{
                color:
                  totalSisa < 0
                    ? '#c62828'
                    : totalSisa > 0
                      ? '#f57c00'
                      : '#2e7d32',
              }"
            >
              {{ fmt(totalSisa) }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- ── Dialog Info Permintaan ── -->
  <v-dialog v-model="showPermintaanDialog" max-width="420">
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #2e7d32"
      >
        Info Permintaan
      </v-card-title>
      <v-card-text class="pa-4 pt-2">
        <div class="info-grid" v-if="form.info_permintaan">
          <span class="info-lbl">No. Permintaan</span>
          <span class="info-val">{{ form.info_permintaan.pmt_nomor }}</span>
          <span class="info-lbl">Tgl Permintaan</span>
          <span class="info-val">{{ form.info_permintaan.pmt_tanggal }}</span>
          <span class="info-lbl">Jenis Permintaan</span>
          <span class="info-val">{{
            form.info_permintaan.jenis_permintaan
          }}</span>
          <span class="info-lbl">NIK</span>
          <span class="info-val">{{ form.info_permintaan.pjh_nik }}</span>
          <span class="info-lbl">Nama</span>
          <span class="info-val">{{ form.info_permintaan.nama }}</span>
          <span class="info-lbl">Bagian</span>
          <span class="info-val">{{ form.info_permintaan.bagian }}</span>
          <span class="info-lbl">Lokasi</span>
          <span class="info-val">{{ form.info_permintaan.lokasi }}</span>
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
        No. BKK/BBK: <strong>{{ savedNoBkk || "-" }}</strong
        ><br />
        Ingin mencetak bukti penyelesaian?
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-btn variant="text" @click="skipCetak">Tidak</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="cetakSelesai">
          <template #prepend>
            <IconPrinter :size="14" :stroke-width="1.8" />
          </template>
          Cetak Penyelesaian
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal: Pilih Account Header ── -->
  <SearchModal
    v-model="showDetailAccountModal"
    title="Pilih Account Detail"
    :columns="[
      { key: 'kode', title: 'Kode', width: '100px' },
      { key: 'nama', title: 'Nama Account' },
    ]"
    :items="detailAccountOptions"
    :loading="detailAccountLoading"
    search-placeholder="Cari account..."
    :search-keys="['kode', 'nama']"
    @select="selectDetailAccount"
  />

  <!-- ── Modal: Account Detail ── -->
  <SearchModal
    v-model="showDetailAccountModal"
    title="Pilih Account Detail"
    :columns="[
      { key: 'kode', title: 'Kode', width: '100px' },
      { key: 'nama', title: 'Nama Account' },
    ]"
    :items="detailAccountOptions"
    search-placeholder="Cari account..."
    :search-keys="['kode', 'nama']"
    @select="selectDetailAccount"
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

  <!-- ── Modal: Supplier ── -->
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

  <SearchModal
    v-model="showModalPjh"
    title="Pengajuan GA (F1)"
    :columns="[
      { key: 'nomor', title: 'Nomor' },
      { key: 'nama', title: 'Nama' },
      { key: 'keterangan', title: 'Keterangan' },
    ]"
    :items="optPjh"
    @select="selectPjh"
    search-placeholder="Cari Pengajuan GA..."
    :search-keys="['nomor', 'nama', 'keterangan']"
  />

  <SearchModal
    v-model="showModalPoExt"
    title="DP PO External (F2)"
    :columns="[
      { key: 'nomor', title: 'Nomor' },
      { key: 'tanggal', title: 'Tanggal' },
      { key: 'spk', title: 'SPK' },
      { key: 'supplier', title: 'Supplier' },
      { key: 'nominal', title: 'Nominal', align: 'right' },
    ]"
    :items="optPoExt"
    @select="selectPoExt"
    search-placeholder="Cari PO External..."
    :search-keys="['nomor', 'spk', 'supplier']"
  />

  <SearchModal
    v-model="showModalVoucher"
    title="Voucher Hutang (F3)"
    :columns="[
      { key: 'nomor', title: 'Nomor' },
      { key: 'tanggal', title: 'Tanggal' },
      { key: 'supplier', title: 'Supplier' },
      { key: 'total', title: 'Total', align: 'right' },
    ]"
    :items="optVoucher"
    @select="selectVoucher"
    search-placeholder="Cari Voucher..."
    :search-keys="['nomor', 'supplier']"
  />

  <SearchModal
    v-model="showModalMb"
    title="Permintaan Garmen (F4)"
    :columns="[
      { key: 'nomor', title: 'Nomor' },
      { key: 'tanggal', title: 'Tanggal' },
      { key: 'jenis', title: 'Jenis' },
      { key: 'keterangan', title: 'Keterangan' },
      { key: 'usr', title: 'User' },
      { key: 'bagian', title: 'Bagian' },
    ]"
    :items="optMb"
    @select="selectMb"
    search-placeholder="Cari Permintaan..."
    :search-keys="['nomor', 'jenis', 'keterangan', 'bagian']"
  />

  <SearchModal
    v-model="showModalIv"
    title="Invoice Garmen (F5)"
    :columns="[
      { key: 'invoice', title: 'Invoice' },
      { key: 'jenis', title: 'Jenis' },
      { key: 'tanggal', title: 'Tanggal' },
    ]"
    :items="optIv"
    @select="selectIv"
    search-placeholder="Cari Invoice..."
    :search-keys="['invoice', 'jenis']"
  />
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
.form-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
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
.field-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 9px;
}
.field-row-2col .field-row {
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

/* ── Detail table ── */
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
.row-unverified td {
  background: #fafafa !important;
  color: #aaa;
}
.row-warn td {
  background: #fff3e0 !important;
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

/* ── Footer ── */
.detail-footer {
  border-top: 2px solid #2e7d32;
  padding: 8px 4px 4px;
  display: flex;
  gap: 20px;
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
  min-width: 110px;
  text-align: right;
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

/* ── Section title right column ── */
.section-title {
  font-size: 10px;
  font-weight: 700;
  color: #2e7d32;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}
</style>
