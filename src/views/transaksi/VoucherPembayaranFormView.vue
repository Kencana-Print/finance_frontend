<script setup lang="ts">
import { ref, computed, onMounted, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import BaseForm from "@/components/BaseForm.vue";
import SearchModal from "@/components/SearchModal.vue";
import {
  IconFileInvoice,
  IconSearch,
  IconPlus,
  IconTrash,
  IconPrinter,
} from "@tabler/icons-vue";
import {
  voucherPembayaranFormApi,
  type VoucherFormDetail,
  type VoucherFormBahan,
} from "@/api/transaksi/voucherPembayaranFormApi";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const MENU_ID = "30";
const isEdit = computed(() => !!route.params.nomor);
const isLoading = ref(false);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const showPrintDialog = ref(false);
const savedNomor = ref("");
const showHintPopup = ref(false);
const hintBtnEl = ref<HTMLElement | null>(null);
const hintPopupStyle = ref({});
const originalSupRekening = ref("");
const originalSupBank = ref("");
const originalSupCabang = ref("");
const originalSupAtasnama = ref("");

const onHintEnter = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  hintPopupStyle.value = {
    position: "fixed",
    top: `${rect.top - 8}px`,
    left: `${rect.left}px`,
    transform: "translateY(-100%)",
    zIndex: "9999",
  };
  showHintPopup.value = true;
};

const onHintLeave = () => {
  showHintPopup.value = false;
};

const today = new Date().toISOString().slice(0, 10);

// ── Form header ───────────────────────────────────────────────────────
const form = ref({
  nomor: "",
  tanggal: today,
  supKode: "",
  supNama: "",
  supRekening: "",
  supBank: "",
  supCabang: "",
  supAtasnama: "",
  nomorPajak: "",
  statusPpn: false,
  ppn: 0,
  disc: 0,
  keterangan: "",
  pin5Status: "",
  pin5Urut: 0,
});

const detail = ref<VoucherFormDetail[]>([]);
const bahanTambahan = ref<VoucherFormBahan[]>([]);
const originalState = ref<any>(null);

// ── Pin5 badge ────────────────────────────────────────────────────────
// Delphi: imgtglminta/wait/acc/tolak
const pin5Config = computed(() => {
  const map: Record<string, { label: string; color: string }> = {
    MINTA: { label: "Perlu Pengajuan", color: "#f57c00" },
    WAIT: { label: "Nunggu ACC", color: "#1565c0" },
    ACC: { label: "ACC — Bisa Simpan", color: "#2e7d32" },
    TOLAK: { label: "Ditolak", color: "#c62828" },
  };
  return map[form.value.pin5Status] ?? null;
});

// ── hitung — Delphi hitung() ─────────────────────────────────────────
// BPB/BPJ/POE → += total, RET/PJG → -= total
// Total = xtotal - xpotonganBahan
// GrandTotal = Total - Disc
const xpotonganBahan = computed(() =>
  bahanTambahan.value.reduce((s, b) => s + (Number(b.nilai) || 0), 0),
);
const xtotalDetail = computed(() =>
  detail.value.reduce((s, d) => {
    if (!d.tipe) return s;
    if (["BPB", "BPJ", "POE", "MMT", "BPE", "BPG"].includes(d.tipe))
      return s + (Number(d.total) || 0);
    if (["RET", "PJG"].includes(d.tipe)) return s - (Number(d.total) || 0);
    return s;
  }, 0),
);
const displayTotal = computed(() => xtotalDetail.value - xpotonganBahan.value);
const grandTotal = computed(
  () => displayTotal.value - (Number(form.value.disc) || 0),
);

// ── Format helpers ────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
const parseNum = (v: string) =>
  Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;
const formatNum = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

// ── Detail row ops ────────────────────────────────────────────────────
const addDetailRow = () =>
  detail.value.push({
    tipe: "",
    searchType: "BPB", // default BPB Bahan
    nomor: "",
    tanggal: "",
    keterangan: "",
    jenis: "",
    nilai: 0,
    nilaiMax: 0,
    bs: 0,
    tarif: 0,
    potongan: 0,
    total: 0,
  });

const removeDetailRow = (idx: number) => detail.value.splice(idx, 1);

const recalcDetail = (d: VoucherFormDetail) => {
  // Delphi Col8 Enter: potongan = bs * tarif; total = nilai - potongan
  d.potongan = Number(d.bs) * Number(d.tarif);
  d.total = Number(d.nilai) - d.potongan;
};

const onNilaiInput = (d: VoucherFormDetail, e: Event) => {
  d.nilai = parseNum((e.target as HTMLInputElement).value);
};
const onNilaiBlur = (d: VoucherFormDetail, e: Event) => {
  // Delphi GridDetailCellValidate: nilai <= nilaiMax
  if (d.nilaiMax > 0 && d.nilai > d.nilaiMax) {
    toast.warning("Nilai melebihi yang seharusnya.");
    d.nilai = d.nilaiMax;
  }
  recalcDetail(d);
  (e.target as HTMLInputElement).value = formatNum(d.nilai);
};

const onBsInput = (d: VoucherFormDetail, e: Event) => {
  d.bs = parseNum((e.target as HTMLInputElement).value);
};
const onBsBlur = (d: VoucherFormDetail, e: Event) => {
  recalcDetail(d);
  (e.target as HTMLInputElement).value = formatNum(d.bs);
};
const onTarifInput = (d: VoucherFormDetail, e: Event) => {
  d.tarif = parseNum((e.target as HTMLInputElement).value);
};
const onTarifBlur = (d: VoucherFormDetail, e: Event) => {
  recalcDetail(d);
  (e.target as HTMLInputElement).value = formatNum(d.tarif);
};

// ── Load nota detail ──────────────────────────────────────────────────
// Delphi loaddatadetail: load by nota nomor (prefix determines type)
// Only load if nilaiMax=0 (not yet loaded) — Delphi: if Floats[6,Row]=0
const loadNotaDetail = async (idx: number, nomor: string, searchType = "") => {
  if (!nomor.trim()) return;
  const d = detail.value[idx];
  if (d.nilaiMax > 0 && d.nomor === nomor) return;
  try {
    const statusPpn = form.value.statusPpn ? 1 : 0;
    const res = await voucherPembayaranFormApi.getNotaDetail(
      nomor,
      statusPpn,
      searchType,
    );
    Object.assign(detail.value[idx], res);
    recalcDetail(detail.value[idx]);
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Nota tidak ditemukan.");
    Object.assign(d, {
      tipe: "",
      tanggal: "",
      keterangan: "",
      nilai: 0,
      nilaiMax: 0,
      bs: 0,
      tarif: 0,
      potongan: 0,
      total: 0,
    });
  }
};

const onDetailNomorEnter = async (idx: number) => {
  const d = detail.value[idx];
  if (!d.nomor) return;
  // Reset nilaiMax agar selalu reload saat user ganti nomor manual
  d.nilaiMax = 0;
  await loadNotaDetail(idx, d.nomor, d.searchType);
};

// ── Bahan tambahan ops ────────────────────────────────────────────────
const addBahanRow = () =>
  bahanTambahan.value.push({
    nama: "",
    satuan: "",
    jumlah: 0,
    harga: 0,
    nilai: 0,
  });
const removeBahanRow = (idx: number) => bahanTambahan.value.splice(idx, 1);

// Delphi AdvColumnGrid1: Floats[5] = Floats[4]*Floats[3] (Nilai = Harga*Jumlah)
const onBahanJumlahInput = (b: VoucherFormBahan, e: Event) => {
  b.jumlah = parseNum((e.target as HTMLInputElement).value);
};
const onBahanJumlahBlur = (b: VoucherFormBahan, e: Event) => {
  b.nilai = Number(b.jumlah) * Number(b.harga);
  (e.target as HTMLInputElement).value = formatNum(b.jumlah);
};
const onBahanHargaInput = (b: VoucherFormBahan, e: Event) => {
  b.harga = parseNum((e.target as HTMLInputElement).value);
};
const onBahanHargaBlur = (b: VoucherFormBahan, e: Event) => {
  b.nilai = Number(b.jumlah) * Number(b.harga);
  (e.target as HTMLInputElement).value = formatNum(b.harga);
};

// ── Supplier search ───────────────────────────────────────────────────
const showSupplierModal = ref(false);
const supplierOptions = ref<any[]>([]);
const supplierLoading = ref(false);

const openSupplierModal = async () => {
  showSupplierModal.value = true;
  supplierLoading.value = true;
  try {
    supplierOptions.value = await voucherPembayaranFormApi.searchSupplier("");
  } catch {
    /* silent */
  } finally {
    supplierLoading.value = false;
  }
};

const searchSupplierDebounced = async (q: string) => {
  supplierLoading.value = true;
  try {
    supplierOptions.value = await voucherPembayaranFormApi.searchSupplier(q);
  } catch {
    /* silent */
  } finally {
    supplierLoading.value = false;
  }
};

const applySupplier = async (kode: string) => {
  try {
    const s = await voucherPembayaranFormApi.getSupplier(kode);
    Object.assign(form.value, {
      supKode: s.kode,
      supNama: s.nama,
      supRekening: s.rekening,
      supBank: s.bank,
      supCabang: s.cabang,
      supAtasnama: s.atasnama,
    });
    // Simpan nilai dari DB — jika kosong, field bisa diedit
    originalSupRekening.value = s.rekening || "";
    originalSupBank.value = s.bank || "";
    originalSupCabang.value = s.cabang || "";
    originalSupAtasnama.value = s.atasnama || "";
  } catch {
    toast.error("Kode supplier tidak ditemukan.");
    form.value.supKode = "";
    form.value.supNama = "";
  }
};

const selectSupplier = async (s: any) => {
  showSupplierModal.value = false;
  await applySupplier(s.kode);
};

const onSupKodeBlur = async () => {
  if (!form.value.supKode) return;
  await applySupplier(form.value.supKode);
};

// ── Nota search modal ─────────────────────────────────────────────────
// Delphi: F1=BPB, F2=RTG, F3=BPJ, F4=POE, F5=PJG
const showNotaModal = ref(false);
const notaModalType = ref("BPB");
const activeNotaIdx = ref(-1);
const notaOptions = ref<any[]>([]);
const notaLoading = ref(false);
const notaSearch = ref("");

const notaTypeConfig = computed(() => {
  const map: Record<string, { title: string; color: string }> = {
    RTG: { title: "Retur Barang", color: "#e65100" },
    BPB: { title: "BPB Bahan", color: "#1565c0" },
    BPJ: { title: "BPB Jasa", color: "#2e7d32" },
    POE: { title: "PO External", color: "#6a1b9a" },
    PJG: { title: "Potongan Jasa", color: "#4e342e" },
    MMT: { title: "BPB MMT", color: "#00695c" },
    BPE: { title: "BPB PO External MMT", color: "#0277bd" },
    BPG: { title: "BPB Non Bahan", color: "#6a1b9a" },
  };
  return map[notaModalType.value] ?? { title: "Cari Nota", color: "#2e7d32" };
});

const openNotaModal = async (type: string, idx: number) => {
  if (!form.value.supKode && type !== "BPG") {
    toast.warning("Pilih supplier dahulu.");
    return;
  }
  notaModalType.value = type;
  activeNotaIdx.value = idx;
  notaSearch.value = "";
  notaOptions.value = [];
  showNotaModal.value = true;
  notaLoading.value = true;
  try {
    notaOptions.value = await voucherPembayaranFormApi.searchNota(
      type,
      form.value.supKode,
      "",
    );
  } catch {
    /* silent */
  } finally {
    notaLoading.value = false;
  }
};

const doSearchNota = async () => {
  notaLoading.value = true;
  try {
    notaOptions.value = await voucherPembayaranFormApi.searchNota(
      notaModalType.value,
      form.value.supKode,
      notaSearch.value,
    );
  } catch {
    /* silent */
  } finally {
    notaLoading.value = false;
  }
};

const selectNota = async (item: any) => {
  const exists = detail.value.some(
    (d, i) => i !== activeNotaIdx.value && d.nomor === item.Nomor,
  );
  if (exists) {
    toast.warning("Nota ini sudah diinputkan.");
    return;
  }

  // Reset dulu agar loadNotaDetail tidak skip
  const d = detail.value[activeNotaIdx.value];
  d.nomor = item.Nomor;
  d.nilaiMax = 0; // ← reset guard

  showNotaModal.value = false;
  await loadNotaDetail(activeNotaIdx.value, item.Nomor, notaModalType.value);

  // Apply supplier dari BPG jika header masih kosong
  if (notaModalType.value === "BPG" && item.SupKode && !form.value.supKode) {
    await applySupplier(item.SupKode);
  }
};

// ── PPN ───────────────────────────────────────────────────────────────
// Delphi cbbPPNClick: unchecked → ppn=0, nomorPajak disabled+clear
const onPpnChange = (val: boolean) => {
  if (!val) {
    form.value.ppn = 0;
    form.value.nomorPajak = "";
  }
};

// ── Disc thousand separator ───────────────────────────────────────────
const onDiscInput = (e: Event) => {
  form.value.disc = parseNum((e.target as HTMLInputElement).value);
};
const onDiscBlur = (e: Event) => {
  (e.target as HTMLInputElement).value = formatNum(form.value.disc);
};

// ── onMounted ─────────────────────────────────────────────────────────
onMounted(async () => {
  isLoading.value = true;
  try {
    if (isRealisasi.value) {
      // ── REALISASI MODE ──
      if (isEdit.value) {
        const d = await voucherPembayaranFormApi.getDetailFormRealisasi(
          decodeURIComponent(route.params.nomor as string),
        );
        Object.assign(rlForm.value, {
          nomor: d.nomor,
          kodeBayar: d.kodeBayar,
          namaBayar: d.namaBayar,
          tanggal: d.tanggal,
          tanggalTempo: d.tanggalTempo,
          account: d.account,
          namaAccount: d.namaAccount,
        });
        rlDetail.value = d.detail;
        rlOriginalState.value = JSON.parse(
          JSON.stringify({ form: rlForm.value, detail: rlDetail.value }),
        );
      } else {
        addRlRow();
        const vou = route.query.vou as string;
        if (vou) {
          rlDetail.value[0].vouNomor = decodeURIComponent(vou);
          await loadRlRow(0, rlDetail.value[0].vouNomor);
        }
      }
    } else if (isEdit.value) {
      const d = await voucherPembayaranFormApi.getDetailForm(
        decodeURIComponent(route.params.nomor as string),
      );
      Object.assign(form.value, {
        nomor: d.nomor,
        tanggal: d.tanggal,
        supKode: d.supKode,
        supNama: d.supNama,
        supRekening: d.supRekening,
        supBank: d.supBank,
        supCabang: d.supCabang,
        supAtasnama: d.supAtasnama,
        nomorPajak: d.nomorPajak,
        statusPpn: d.statusPpn,
        ppn: d.ppn,
        disc: d.disc,
        keterangan: d.keterangan,
        pin5Status: d.pin5Status,
        pin5Urut: d.pin5Urut,
      });
      detail.value = d.detail.length ? d.detail : [];
      const typeMap: Record<string, string> = {
        BPB: "BPB",
        BPJ: "BPJ",
        MMT: "MMT",
        RET: "RTG",
        POE: "POE",
        PJG: "PJG",
        BPG: "BPG",
      };
      detail.value = d.detail.map((row) => ({
        ...row,
        searchType: typeMap[row.tipe] ?? "BPB",
      }));
      bahanTambahan.value = d.bahanTambahan.length ? d.bahanTambahan : [];
      originalState.value = JSON.parse(
        JSON.stringify({
          form: form.value,
          detail: detail.value,
          bahan: bahanTambahan.value,
        }),
      );
    } else {
      addDetailRow();
      addBahanRow();
    }
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal memuat data.");
    router.back();
  } finally {
    isLoading.value = false;
  }
});

// ── Validasi ──────────────────────────────────────────────────────────
// Delphi F10: cek pin5, cek supplier, cek realisasi (di backend)
const validateSave = () => {
  if (isRealisasi.value) {
    if (!rlForm.value.kodeBayar) {
      toast.warning("Kode bayar belum dipilih.");
      return;
    }
    if (isGiro.value && !rlForm.value.nomor) {
      toast.warning("Nomor Giro harus diisi.");
      return;
    }
    if (!rlForm.value.account) {
      toast.warning("Account belum dipilih.");
      return;
    }
    if (!rlDetail.value.filter((d) => d.vouNomor).length) {
      toast.warning("Detail voucher harus diisi minimal satu baris.");
      return;
    }
    showSaveDialog.value = true;
    return;
  }
  if (["MINTA", "WAIT", "TOLAK"].includes(form.value.pin5Status)) {
    const msgs: Record<string, string> = {
      MINTA: "Transaksi sudah diclose. Silahkan minta approve untuk menyimpan.",
      WAIT: "Transaksi sudah diclose. Sedang menunggu approve.",
      TOLAK: "Transaksi sudah diclose. Pengajuan perubahan ditolak.",
    };
    toast.warning(msgs[form.value.pin5Status]);
    return;
  }
  if (!form.value.supNama) {
    toast.warning("Supplier belum diisi.");
    return;
  }
  const filled = detail.value.filter((d) => d.tipe && d.nomor);
  if (!filled.length) {
    toast.warning("Detail nota harus diisi minimal satu baris.");
    return;
  }
  showSaveDialog.value = true;
};

const confirmSave = async () => {
  isSaving.value = true;
  try {
    if (isRealisasi.value) {
      const res = await voucherPembayaranFormApi.saveRealisasi({
        isEdit: isEdit.value,
        nomor: rlForm.value.nomor,
        kodeBayar: rlForm.value.kodeBayar,
        account: rlForm.value.account,
        tanggal: rlForm.value.tanggal,
        tanggalTempo: rlForm.value.tanggalTempo,
        detail: rlDetail.value.filter((d) => d.vouNomor),
      });
      savedNomor.value = res.data.data.nomor;
      showSaveDialog.value = false;
      showPrintDialog.value = true;
      return;
    }

    const res = await voucherPembayaranFormApi.save({
      isEdit: isEdit.value,
      nomor: form.value.nomor,
      tanggal: form.value.tanggal,
      supKode: form.value.supKode,
      nomorPajak: form.value.nomorPajak,
      statusPpn: form.value.statusPpn,
      ppn: form.value.ppn,
      disc: Number(form.value.disc) || 0,
      keterangan: form.value.keterangan,
      detail: detail.value.filter((d) => d.tipe && d.nomor),
      bahanTambahan: bahanTambahan.value.filter((b) => b.nama),
      pin5Status: form.value.pin5Status,
      pin5Urut: form.value.pin5Urut,
    });
    savedNomor.value = res.data.data.nomor;
    showSaveDialog.value = false;
    showPrintDialog.value = true;
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

const doSlip = () => {
  window.open(
    `/transaksi/voucher-pembayaran/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  router.push({ name: "VoucherPembayaran" });
};
const skipSlip = () => {
  showPrintDialog.value = false;
  router.push({ name: "VoucherPembayaran" });
};

const confirmCancel = () => {
  showCancelDialog.value = false;
  if (isRealisasi.value) {
    if (isEdit.value && rlOriginalState.value) {
      Object.assign(
        rlForm.value,
        JSON.parse(JSON.stringify(rlOriginalState.value.form)),
      );
      rlDetail.value = JSON.parse(JSON.stringify(rlOriginalState.value.detail));
    } else {
      Object.assign(rlForm.value, {
        nomor: "",
        kodeBayar: "CS",
        namaBayar: "Cash",
        tanggal: today,
        tanggalTempo: today,
        account: "",
        namaAccount: "",
      });
      rlDetail.value = [];
      addRlRow();
    }
    return;
  }

  if (isEdit.value && originalState.value) {
    Object.assign(
      form.value,
      JSON.parse(JSON.stringify(originalState.value.form)),
    );
    detail.value = JSON.parse(JSON.stringify(originalState.value.detail));
    bahanTambahan.value = JSON.parse(JSON.stringify(originalState.value.bahan));
    // Restore original supplier field locks
    originalSupRekening.value = form.value.supRekening || "";
    originalSupBank.value = form.value.supBank || "";
    originalSupCabang.value = form.value.supCabang || "";
    originalSupAtasnama.value = form.value.supAtasnama || "";
  } else {
    Object.assign(form.value, {
      tanggal: today,
      supKode: "",
      supNama: "",
      supRekening: "",
      supBank: "",
      supCabang: "",
      supAtasnama: "",
      nomorPajak: "",
      statusPpn: false,
      ppn: 0,
      disc: 0,
      keterangan: "",
    });
    detail.value = [];
    bahanTambahan.value = [];
    addDetailRow();
    addBahanRow();
    // Reset original refs — semua field jadi editable
    originalSupRekening.value = "";
    originalSupBank.value = "";
    originalSupCabang.value = "";
    originalSupAtasnama.value = "";
  }
};
const confirmClose = () => {
  showCloseDialog.value = false;
  router.push({ name: "VoucherPembayaran" });
};

// ── Realisasi mode ────────────────────────────────────────────────────
const isRealisasi = computed(() => !!route.meta.isRealisasi);
const isGiro = computed(() => rlForm.value.kodeBayar === "BG");
const fmtDate = (v: string) => (v ? v.split("-").reverse().join("/") : "-");

interface RealisasiRow {
  vouNomor: string;
  supplier: string;
  tanggalVou: string;
  nilai: number;
}

const rlForm = ref({
  nomor: "",
  kodeBayar: "CS",
  namaBayar: "Cash",
  tanggal: today,
  tanggalTempo: today,
  account: "",
  namaAccount: "",
});
const rlDetail = ref<RealisasiRow[]>([]);
const rlOriginalState = ref<any>(null);
const totalRealisasi = computed(() =>
  rlDetail.value.reduce((s, d) => s + Number(d.nilai), 0),
);

const addRlRow = () =>
  rlDetail.value.push({ vouNomor: "", supplier: "", tanggalVou: "", nilai: 0 });
const removeRlRow = (idx: number) => rlDetail.value.splice(idx, 1);

// Nilai input per baris realisasi
const onRlNilaiInput = (d: RealisasiRow, e: Event) => {
  d.nilai = parseNum((e.target as HTMLInputElement).value);
};
const onRlNilaiBlur = (d: RealisasiRow, e: Event) => {
  (e.target as HTMLInputElement).value = formatNum(d.nilai);
};

// Load voucher detail ke baris
const loadRlRow = async (idx: number, vouNomor: string) => {
  if (!vouNomor.trim()) return;
  try {
    const currentNomor = isEdit.value
      ? decodeURIComponent(route.params.nomor as string)
      : "";
    const res = await voucherPembayaranFormApi.loadVoucherRealisasiDetail(
      vouNomor,
      currentNomor,
    );
    Object.assign(rlDetail.value[idx], res);
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Voucher tidak ditemukan.");
    Object.assign(rlDetail.value[idx], {
      vouNomor: "",
      supplier: "",
      tanggalVou: "",
      nilai: 0,
    });
  }
};

const onRlVouEnter = async (idx: number) => {
  if (!rlDetail.value[idx].vouNomor) return;
  await loadRlRow(idx, rlDetail.value[idx].vouNomor);
};

// ── Kode Bayar modal ──────────────────────────────────────────────────
const showKodeBayarModal = ref(false);
const kodeBayarOptions = ref<any[]>([]);
const kodeBayarLoading = ref(false);

const openKodeBayarModal = async () => {
  showKodeBayarModal.value = true;
  kodeBayarLoading.value = true;
  try {
    kodeBayarOptions.value = await voucherPembayaranFormApi.searchKodeBayar("");
  } catch {
    /* silent */
  } finally {
    kodeBayarLoading.value = false;
  }
};
const searchKodeBayarDebounced = async (q: string) => {
  kodeBayarLoading.value = true;
  try {
    kodeBayarOptions.value = await voucherPembayaranFormApi.searchKodeBayar(q);
  } catch {
    /* silent */
  } finally {
    kodeBayarLoading.value = false;
  }
};
const applyKodeBayar = async (kode: string) => {
  try {
    const kb = await voucherPembayaranFormApi.getKodeBayar(kode);
    rlForm.value.kodeBayar = kb.kode;
    rlForm.value.namaBayar = kb.nama;
    if (!isGiro.value) rlForm.value.nomor = "";
  } catch {
    toast.error("Kode bayar tidak ditemukan.");
    rlForm.value.kodeBayar = "CS";
    rlForm.value.namaBayar = "Cash";
  }
};
const selectKodeBayar = async (item: any) => {
  showKodeBayarModal.value = false;
  await applyKodeBayar(item.kode);
};
const onKodeBayarBlur = async () => {
  if (rlForm.value.kodeBayar) await applyKodeBayar(rlForm.value.kodeBayar);
};

// ── Account modal ─────────────────────────────────────────────────────
const showAccountModal = ref(false);
const accountOptions = ref<any[]>([]);
const accountLoading = ref(false);

const openAccountModal = async () => {
  showAccountModal.value = true;
  accountLoading.value = true;
  try {
    accountOptions.value = await voucherPembayaranFormApi.searchAccount("");
  } catch {
    /* silent */
  } finally {
    accountLoading.value = false;
  }
};
const searchAccountDebounced = async (q: string) => {
  accountLoading.value = true;
  try {
    accountOptions.value = await voucherPembayaranFormApi.searchAccount(q);
  } catch {
    /* silent */
  } finally {
    accountLoading.value = false;
  }
};
const selectAccount = (item: any) => {
  showAccountModal.value = false;
  rlForm.value.account = item.rekening;
  rlForm.value.namaAccount = item.bank;
};
const onAccountBlur = async () => {
  if (!rlForm.value.account) {
    rlForm.value.namaAccount = "";
    return;
  }
  const acc = await voucherPembayaranFormApi
    .searchAccount(rlForm.value.account)
    .catch(() => []);
  rlForm.value.namaAccount =
    (acc as any[]).find((a) => a.rekening === rlForm.value.account)?.bank ?? "";
};

// ── Voucher search modal (realisasi) ──────────────────────────────────
const showRlVoucherModal = ref(false);
const rlVoucherOptions = ref<any[]>([]);
const rlVoucherLoading = ref(false);
const rlVoucherSearch = ref("");
const activeRlIdx = ref(-1);

const openRlVoucherModal = async (idx: number) => {
  activeRlIdx.value = idx;
  rlVoucherSearch.value = "";
  rlVoucherOptions.value = [];
  showRlVoucherModal.value = true;
  rlVoucherLoading.value = true;
  try {
    const excl = isEdit.value
      ? decodeURIComponent(route.params.nomor as string)
      : "";
    rlVoucherOptions.value =
      await voucherPembayaranFormApi.searchVoucherRealisasi("", excl);
  } catch {
    /* silent */
  } finally {
    rlVoucherLoading.value = false;
  }
};
const doSearchRlVoucher = async () => {
  rlVoucherLoading.value = true;
  try {
    const excl = isEdit.value
      ? decodeURIComponent(route.params.nomor as string)
      : "";
    rlVoucherOptions.value =
      await voucherPembayaranFormApi.searchVoucherRealisasi(
        rlVoucherSearch.value,
        excl,
      );
  } catch {
    /* silent */
  } finally {
    rlVoucherLoading.value = false;
  }
};
const selectRlVoucher = async (item: any) => {
  const exists = rlDetail.value.some(
    (d, i) => i !== activeRlIdx.value && d.vouNomor === item.Nomor,
  );
  if (exists) {
    toast.warning("Voucher ini sudah diinputkan.");
    return;
  }
  rlDetail.value[activeRlIdx.value].vouNomor = item.Nomor;
  showRlVoucherModal.value = false;
  await loadRlRow(activeRlIdx.value, item.Nomor);
};
</script>

<template>
  <BaseForm
    :title="isRealisasi ? 'Realisasi Voucher' : 'Voucher Pembayaran'"
    :menu-id="MENU_ID"
    :icon="IconFileInvoice"
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
      <!-- REALISASI MODE -->
      <div v-if="isRealisasi" class="left-col-wrap">
        <div class="form-section">
          <div class="form-section-title">Informasi Pembayaran</div>

          <div class="field-row">
            <label class="field-lbl"
              >Kode Bayar <span class="req">*</span></label
            >
            <div class="input-with-btn">
              <input
                v-model="rlForm.kodeBayar"
                class="form-inp mono"
                style="width: 80px; flex-shrink: 0"
                placeholder="CS"
                @blur="onKodeBayarBlur"
                @keydown.enter="onKodeBayarBlur"
              />
              <input
                :value="rlForm.namaBayar"
                readonly
                class="form-inp"
                placeholder="Nama bayar"
              />
              <button
                class="icon-btn"
                type="button"
                @click="openKodeBayarModal"
              >
                <IconSearch :size="13" :stroke-width="1.8" />
              </button>
            </div>
          </div>

          <div class="field-row">
            <label class="field-lbl">Nomor</label>
            <div class="input-with-badge">
              <input
                v-model="rlForm.nomor"
                class="form-inp mono"
                :readonly="!isGiro"
                :class="{ readonly: !isGiro }"
                :placeholder="isGiro ? 'Input nomor giro' : 'Otomatis'"
              />
              <span v-if="!isGiro" class="badge-info">Auto</span>
            </div>
          </div>

          <div class="field-row">
            <label class="field-lbl">Tanggal</label>
            <input v-model="rlForm.tanggal" type="date" class="form-inp" />
          </div>

          <div class="field-row">
            <label class="field-lbl">Tanggal Tempo</label>
            <input v-model="rlForm.tanggalTempo" type="date" class="form-inp" />
          </div>

          <div class="field-row">
            <label class="field-lbl">Account <span class="req">*</span></label>
            <div class="input-with-btn">
              <input
                v-model="rlForm.account"
                class="form-inp mono"
                placeholder="Kode account / rekening"
                @blur="onAccountBlur"
                @keydown.enter="onAccountBlur"
              />
              <button
                class="icon-btn"
                type="button"
                @click="openAccountModal"
                title="Cari dari rekening perusahaan"
              >
                <IconSearch :size="13" :stroke-width="1.8" />
              </button>
            </div>
          </div>

          <div class="field-row">
            <label class="field-lbl">Bank</label>
            <input
              :value="rlForm.namaAccount"
              readonly
              class="form-inp"
              placeholder="Nama bank"
            />
          </div>
        </div>
      </div>

      <div v-else class="left-col-wrap">
        <!-- Pin5 status badge -->
        <div
          v-if="pin5Config"
          class="pin5-banner"
          :style="{ background: pin5Config.color }"
        >
          {{ pin5Config.label }}
        </div>

        <!-- Info Voucher -->
        <div class="form-section">
          <div class="form-section-title">Informasi Voucher</div>

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
            <input v-model="form.tanggal" type="date" class="form-inp" />
          </div>

          <div class="field-row">
            <label class="field-lbl">Keterangan</label>
            <input
              v-model="form.keterangan"
              class="form-inp"
              placeholder="Keterangan voucher"
            />
          </div>

          <!-- PPN -->
          <div class="field-row">
            <label class="field-lbl">PPN</label>
            <div class="ppn-row">
              <label class="ppn-check-wrap">
                <input
                  type="checkbox"
                  v-model="form.statusPpn"
                  @change="onPpnChange(form.statusPpn)"
                  class="ppn-check"
                />
                <span>PPN %</span>
              </label>
              <input
                v-model.number="form.ppn"
                type="number"
                class="form-inp"
                style="width: 70px; flex-shrink: 0"
                :disabled="!form.statusPpn"
                :class="{ readonly: !form.statusPpn }"
              />
              <input
                v-model="form.nomorPajak"
                class="form-inp"
                placeholder="Nomor pajak"
                :disabled="!form.statusPpn"
                :class="{ readonly: !form.statusPpn }"
              />
            </div>
          </div>
        </div>

        <!-- Supplier -->
        <div class="form-section">
          <div class="form-section-title">Supplier</div>

          <div class="field-row">
            <label class="field-lbl">Kode <span class="req">*</span></label>
            <div class="input-with-btn">
              <input
                v-model="form.supKode"
                class="form-inp mono"
                style="width: 100px; flex-shrink: 0"
                placeholder="Kode"
                @blur="onSupKodeBlur"
                @keydown.enter="onSupKodeBlur"
              />
              <input
                :value="form.supNama"
                readonly
                class="form-inp"
                placeholder="Nama supplier"
              />
              <button class="icon-btn" type="button" @click="openSupplierModal">
                <IconSearch :size="13" :stroke-width="1.8" />
              </button>
            </div>
          </div>

          <!-- Rekening -->
          <div class="field-row">
            <label class="field-lbl">Rekening</label>
            <input
              v-model="form.supRekening"
              class="form-inp"
              :readonly="!!originalSupRekening"
              :class="{ readonly: !!originalSupRekening }"
              placeholder="No. rekening"
            />
          </div>

          <!-- Bank & Cabang -->
          <div class="field-row-2col">
            <div class="field-row">
              <label class="field-lbl">Bank</label>
              <input
                v-model="form.supBank"
                class="form-inp"
                :readonly="!!originalSupBank"
                :class="{ readonly: !!originalSupBank }"
                placeholder="Bank"
              />
            </div>
            <div class="field-row">
              <label class="field-lbl">Cabang</label>
              <input
                v-model="form.supCabang"
                class="form-inp"
                :readonly="!!originalSupCabang"
                :class="{ readonly: !!originalSupCabang }"
                placeholder="Cabang"
              />
            </div>
          </div>

          <!-- Atas Nama -->
          <div class="field-row">
            <label class="field-lbl">Atas Nama</label>
            <input
              v-model="form.supAtasnama"
              class="form-inp"
              :readonly="!!originalSupAtasnama"
              :class="{ readonly: !!originalSupAtasnama }"
              placeholder="Atas nama"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- ══ RIGHT COLUMN ══ -->
    <template #right-column>
      <!-- REALISASI MODE -->
      <div v-if="isRealisasi" class="right-wrap">
        <div class="detail-section">
          <div class="section-hdr">
            <span class="section-title">Detail Voucher</span>
            <v-btn
              size="small"
              color="primary"
              variant="tonal"
              @click="addRlRow"
            >
              <template #prepend
                ><IconPlus :size="13" :stroke-width="2"
              /></template>
              Tambah
            </v-btn>
          </div>
          <div class="tbl-wrap">
            <table class="detail-tbl">
              <thead>
                <tr>
                  <th style="width: 30px">No</th>
                  <th style="min-width: 200px">Nomor Voucher</th>
                  <th style="min-width: 200px">Nama Supplier</th>
                  <th style="width: 100px">Tgl Voucher</th>
                  <th style="width: 130px">Nilai</th>
                  <th style="width: 28px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, idx) in rlDetail" :key="idx">
                  <td class="tc">{{ idx + 1 }}</td>
                  <td>
                    <div class="d-flex align-center gap-1">
                      <input
                        v-model="d.vouNomor"
                        class="cell-inp mono"
                        placeholder="Nomor voucher..."
                        @keydown.enter.prevent="onRlVouEnter(idx)"
                      />
                      <button
                        type="button"
                        class="sup-btn"
                        @click.prevent="openRlVoucherModal(idx)"
                      >
                        <IconSearch :size="11" />
                      </button>
                    </div>
                  </td>
                  <td style="font-size: 11px">{{ d.supplier || "-" }}</td>
                  <td class="tc" style="font-size: 10px">
                    {{ fmtDate(d.tanggalVou) }}
                  </td>
                  <td>
                    <input
                      :value="formatNum(d.nilai)"
                      type="text"
                      inputmode="numeric"
                      class="cell-inp tr"
                      @focus="
                        (e) => {
                          (e.target as HTMLInputElement).value = d.nilai
                            ? String(d.nilai)
                            : '';
                        }
                      "
                      @input="(e) => onRlNilaiInput(d, e)"
                      @blur="(e) => onRlNilaiBlur(d, e)"
                    />
                  </td>
                  <td class="tc">
                    <button
                      class="del-btn"
                      type="button"
                      @click.prevent="removeRlRow(idx)"
                    >
                      <IconTrash :size="12" :stroke-width="1.8" />
                    </button>
                  </td>
                </tr>
                <tr v-if="!rlDetail.length">
                  <td colspan="6" class="empty-td">
                    Belum ada detail. Klik Tambah.
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="rlDetail.length">
                <tr class="foot-row">
                  <td colspan="4" class="tr foot-lbl">Total</td>
                  <td class="tr foot-val">{{ fmt(totalRealisasi) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Summary bar realisasi -->
        <div class="summary-bar">
          <span class="sbar-lbl-grand">Total Pembayaran</span>
          <span class="sbar-val-grand">{{ fmt(totalRealisasi) }}</span>
        </div>
      </div>

      <!-- VOUCHER MODE (existing) -->
      <div v-else class="right-wrap">
        <!-- ── Detail Nota ── -->
        <div class="detail-section" style="flex: 3">
          <div class="section-hdr">
            <span class="section-title">Detail Nota</span>
            <div class="d-flex align-center gap-2">
              <!-- Info pintasan -->
              <!-- Ganti blok hint-trigger: -->
              <div class="hint-trigger">
                <button
                  type="button"
                  class="hint-btn"
                  @mouseenter="onHintEnter"
                  @mouseleave="onHintLeave"
                >
                  ⌨ Pintasan
                </button>
                <Teleport to="body">
                  <div
                    v-if="showHintPopup"
                    class="hint-popup-teleport"
                    :style="hintPopupStyle"
                    @mouseenter="showHintPopup = true"
                    @mouseleave="showHintPopup = false"
                  >
                    <div class="hint-title">Pintasan kolom Nomor detail:</div>
                    <div class="hint-row">
                      <span class="hint-key">B</span> BPB Bahan
                    </div>
                    <div class="hint-row">
                      <span class="hint-key">R</span> Retur
                    </div>
                    <div class="hint-row">
                      <span class="hint-key">J</span> BPB Jasa
                    </div>
                    <div class="hint-row">
                      <span class="hint-key">E</span> PO External
                    </div>
                    <div class="hint-row">
                      <span class="hint-key">P</span> Potongan Jasa
                    </div>
                  </div>
                </Teleport>
              </div>
              <v-btn
                size="small"
                color="primary"
                variant="tonal"
                @click="addDetailRow"
              >
                <template #prepend
                  ><IconPlus :size="13" :stroke-width="2"
                /></template>
                Tambah
              </v-btn>
            </div>
          </div>

          <div class="tbl-wrap">
            <table class="detail-tbl">
              <thead>
                <tr>
                  <th style="width: 30px">No</th>
                  <th style="min-width: 240px">Nomor Nota</th>
                  <th style="width: 90px">Tanggal</th>
                  <th style="width: 55px">Type</th>
                  <th
                    v-if="detail.some((d) => d.tipe === 'BPG')"
                    style="width: 90px"
                  >
                    Jenis
                  </th>
                  <th style="min-width: 160px">Keterangan</th>
                  <th style="width: 110px">Nilai</th>
                  <th style="width: 80px">Jml BS</th>
                  <th style="width: 80px">Tarif</th>
                  <th style="width: 100px">Potongan</th>
                  <th style="width: 110px">Total</th>
                  <th style="width: 28px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, idx) in detail" :key="idx">
                  <td class="tc">{{ idx + 1 }}</td>

                  <!-- Nomor + type search buttons -->
                  <td>
                    <div class="d-flex align-center gap-1">
                      <input
                        v-model="d.nomor"
                        class="cell-inp"
                        style="min-width: 90px"
                        placeholder="Nomor nota..."
                        @keydown.enter.prevent="onDetailNomorEnter(idx)"
                      />
                      <select v-model="d.searchType" class="type-select">
                        <option value="BPB">BPB Bahan</option>
                        <option value="BPJ">BPB Jasa</option>
                        <option value="MMT">BPB MMT</option>
                        <option value="BPE">BPB PO Ext MMT</option>
                        <option value="BPG">BPB Non Bahan</option>
                        <!-- Tambah tipe lain nanti -->
                      </select>
                      <button
                        type="button"
                        class="sup-btn"
                        :title="`Cari ${d.searchType}`"
                        @click.prevent="openNotaModal(d.searchType, idx)"
                      >
                        <IconSearch :size="11" />
                      </button>
                    </div>
                  </td>

                  <td class="tc" style="font-size: 10px">
                    {{ d.tanggal || "-" }}
                  </td>

                  <td class="tc">
                    <span
                      v-if="d.tipe"
                      class="type-badge"
                      :class="`type-${d.tipe.toLowerCase()}`"
                    >
                      {{ d.tipe }}
                    </span>
                  </td>

                  <td
                    v-if="detail.some((d) => d.tipe === 'BPG')"
                    style="font-size: 10px; white-space: nowrap"
                  >
                    {{ d.tipe === "BPG" ? d.jenis || "-" : "" }}
                  </td>

                  <td
                    style="
                      font-size: 10px;
                      max-width: 160px;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    "
                  >
                    {{ d.keterangan || "-" }}
                  </td>

                  <!-- Nilai — readonly jika RET (Delphi: RET Col5 tidak bisa diubah) -->
                  <td>
                    <input
                      :value="formatNum(d.nilai)"
                      type="text"
                      inputmode="numeric"
                      class="cell-inp tr"
                      :readonly="d.tipe === 'RET'"
                      :class="{ 'cell-readonly': d.tipe === 'RET' }"
                      @focus="
                        (e) => {
                          if (d.tipe !== 'RET')
                            (e.target as HTMLInputElement).value = d.nilai
                              ? String(d.nilai)
                              : '';
                        }
                      "
                      @input="
                        (e) => {
                          if (d.tipe !== 'RET') onNilaiInput(d, e);
                        }
                      "
                      @blur="
                        (e) => {
                          onNilaiBlur(d, e);
                        }
                      "
                    />
                  </td>

                  <!-- Jml BS -->
                  <td>
                    <input
                      :value="formatNum(d.bs)"
                      type="text"
                      inputmode="numeric"
                      class="cell-inp tr"
                      @focus="
                        (e) => {
                          (e.target as HTMLInputElement).value = d.bs
                            ? String(d.bs)
                            : '';
                        }
                      "
                      @input="(e) => onBsInput(d, e)"
                      @blur="(e) => onBsBlur(d, e)"
                    />
                  </td>

                  <!-- Tarif -->
                  <td>
                    <input
                      :value="formatNum(d.tarif)"
                      type="text"
                      inputmode="numeric"
                      class="cell-inp tr"
                      @focus="
                        (e) => {
                          (e.target as HTMLInputElement).value = d.tarif
                            ? String(d.tarif)
                            : '';
                        }
                      "
                      @input="(e) => onTarifInput(d, e)"
                      @blur="(e) => onTarifBlur(d, e)"
                    />
                  </td>

                  <!-- Potongan (readonly computed) -->
                  <td class="tr cell-computed">
                    {{ d.potongan ? fmt(d.potongan) : "" }}
                  </td>

                  <!-- Total (readonly computed, bold) -->
                  <td class="tr cell-total">{{ fmt(d.total) }}</td>

                  <td class="tc">
                    <button
                      class="del-btn"
                      type="button"
                      @click.prevent="removeDetailRow(idx)"
                    >
                      <IconTrash :size="12" :stroke-width="1.8" />
                    </button>
                  </td>
                </tr>
                <tr v-if="!detail.length">
                  <td colspan="11" class="empty-td">
                    Belum ada detail. Klik Tambah.
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="detail.length">
                <tr class="foot-row">
                  <td colspan="5" class="tr foot-lbl">Subtotal</td>
                  <td class="tr foot-val">
                    {{ fmt(detail.reduce((s, d) => s + (d.nilai || 0), 0)) }}
                  </td>
                  <td colspan="2"></td>
                  <td class="tr foot-val">
                    {{ fmt(detail.reduce((s, d) => s + (d.potongan || 0), 0)) }}
                  </td>
                  <td class="tr foot-val">{{ fmt(xtotalDetail) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- ── Bahan Tambahan ── -->
        <div class="detail-section" style="flex: 2">
          <div class="section-hdr">
            <span class="section-title">Bahan Tambahan</span>
            <v-btn
              size="small"
              color="teal-darken-1"
              variant="tonal"
              @click="addBahanRow"
            >
              <template #prepend
                ><IconPlus :size="13" :stroke-width="2"
              /></template>
              Tambah
            </v-btn>
          </div>

          <div class="tbl-wrap">
            <table class="detail-tbl">
              <thead>
                <tr>
                  <th style="width: 30px">No</th>
                  <th style="min-width: 200px">Nama</th>
                  <th style="width: 90px">Satuan</th>
                  <th style="width: 90px">Jumlah</th>
                  <th style="width: 100px">Harga</th>
                  <th style="width: 110px">Nilai</th>
                  <th style="width: 28px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(b, idx) in bahanTambahan" :key="idx">
                  <td class="tc">{{ idx + 1 }}</td>
                  <td>
                    <input
                      v-model="b.nama"
                      class="cell-inp"
                      placeholder="Nama bahan..."
                    />
                  </td>
                  <td>
                    <input
                      v-model="b.satuan"
                      class="cell-inp"
                      placeholder="pcs/kg..."
                    />
                  </td>
                  <!-- Jumlah -->
                  <td>
                    <input
                      :value="formatNum(b.jumlah)"
                      type="text"
                      inputmode="numeric"
                      class="cell-inp tr"
                      @focus="
                        (e) => {
                          (e.target as HTMLInputElement).value = b.jumlah
                            ? String(b.jumlah)
                            : '';
                        }
                      "
                      @input="(e) => onBahanJumlahInput(b, e)"
                      @blur="(e) => onBahanJumlahBlur(b, e)"
                    />
                  </td>
                  <!-- Harga / Tarif -->
                  <td>
                    <input
                      :value="formatNum(b.harga)"
                      type="text"
                      inputmode="numeric"
                      class="cell-inp tr"
                      @focus="
                        (e) => {
                          (e.target as HTMLInputElement).value = b.harga
                            ? String(b.harga)
                            : '';
                        }
                      "
                      @input="(e) => onBahanHargaInput(b, e)"
                      @blur="(e) => onBahanHargaBlur(b, e)"
                    />
                  </td>
                  <!-- Nilai = Jumlah * Harga (readonly computed) -->
                  <td class="tr cell-total">{{ fmt(b.nilai) }}</td>
                  <td class="tc">
                    <button
                      class="del-btn"
                      type="button"
                      @click.prevent="removeBahanRow(idx)"
                    >
                      <IconTrash :size="12" :stroke-width="1.8" />
                    </button>
                  </td>
                </tr>
                <tr v-if="!bahanTambahan.length">
                  <td colspan="7" class="empty-td">
                    Belum ada bahan tambahan.
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="bahanTambahan.length">
                <tr class="foot-row">
                  <td colspan="5" class="tr foot-lbl">Total Bahan</td>
                  <td class="tr foot-val">{{ fmt(xpotonganBahan) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Summary bar — Total | Discount | Grand Total -->
        <div class="summary-bar">
          <div class="sbar-item">
            <span class="sbar-lbl">Total</span>
            <span class="sbar-val">{{ fmt(displayTotal) }}</span>
          </div>
          <div class="sbar-div"></div>
          <div class="sbar-item">
            <label class="sbar-lbl">Discount</label>
            <input
              :value="formatNum(form.disc)"
              type="text"
              inputmode="numeric"
              class="sbar-disc-inp"
              @focus="
                (e) => {
                  (e.target as HTMLInputElement).value = form.disc
                    ? String(form.disc)
                    : '';
                }
              "
              @input="onDiscInput"
              @blur="onDiscBlur"
            />
          </div>
          <div class="sbar-div"></div>
          <div class="sbar-item sbar-grand">
            <span class="sbar-lbl-grand">Grand Total</span>
            <span class="sbar-val-grand">{{ fmt(grandTotal) }}</span>
          </div>
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
        Ingin mencetak Voucher Pembayaran sekarang?
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-btn variant="text" @click="skipSlip">Tidak</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="doSlip">
          <template #prepend
            ><IconPrinter :size="14" :stroke-width="1.8"
          /></template>
          Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal: Supplier ── -->
  <SearchModal
    v-model="showSupplierModal"
    title="Pilih Supplier"
    :columns="[
      { key: 'kode', title: 'Kode', width: '90px' },
      { key: 'nama', title: 'Nama Supplier' },
    ]"
    :items="supplierOptions"
    :loading="supplierLoading"
    :server-search="true"
    search-placeholder="Ketik nama supplier..."
    :search-keys="['kode', 'nama']"
    @select="selectSupplier"
    @search="searchSupplierDebounced"
  />

  <!-- ── Modal: Nota Search ── -->
  <v-dialog v-model="showNotaModal" max-width="700" scrollable>
    <v-card rounded="lg">
      <v-card-title
        class="modal-header"
        :style="{ borderTopColor: notaTypeConfig.color }"
      >
        {{ notaTypeConfig.title }}
      </v-card-title>
      <v-card-text class="pa-3 pt-2" style="max-height: 520px">
        <div class="modal-search-bar">
          <div class="modal-search-wrap">
            <IconSearch :size="14" class="modal-search-icon" />
            <input
              v-model="notaSearch"
              class="modal-search-input"
              placeholder="Cari nomor atau supplier..."
              @keydown.enter="doSearchNota"
            />
            <button
              v-if="notaSearch"
              class="modal-clear-btn"
              @click="
                notaSearch = '';
                doSearchNota();
              "
            >
              ×
            </button>
          </div>
          <v-btn
            size="small"
            variant="flat"
            :color="notaTypeConfig.color"
            style="color: white"
            :loading="notaLoading"
            @click="doSearchNota"
            >Cari</v-btn
          >
        </div>
        <div class="modal-table-wrap">
          <table class="modal-tbl">
            <thead>
              <tr>
                <th style="min-width: 140px">Nomor</th>
                <th style="width: 100px">Tanggal</th>
                <th v-if="notaModalType === 'BPG'" style="width: 90px">
                  Jenis
                </th>
                <th
                  v-if="!['POE', 'BPE'].includes(notaModalType)"
                  style="min-width: 160px"
                >
                  Keterangan
                </th>
                <th
                  v-if="['POE', 'BPE'].includes(notaModalType)"
                  style="min-width: 120px"
                >
                  SPK
                </th>
                <th v-if="notaModalType === 'POE'" style="min-width: 160px">
                  Nama SPK
                </th>
                <th style="min-width: 160px">Supplier</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="notaLoading">
                <td colspan="4" class="modal-loading">
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
                  v-for="n in notaOptions"
                  :key="n.Nomor"
                  class="modal-row"
                  @click="selectNota(n)"
                >
                  <td class="mono-cell">{{ n.Nomor }}</td>
                  <td>{{ n.Tanggal }}</td>
                  <td v-if="notaModalType === 'BPG'">{{ n.Jenis }}</td>
                  <td v-if="!['POE', 'BPE'].includes(notaModalType)">
                    {{ n.Keterangan }}
                  </td>
                  <td v-if="['POE', 'BPE'].includes(notaModalType)">
                    {{ n.Spk }}
                  </td>
                  <td v-if="notaModalType === 'POE'">{{ n.NamaSpk }}</td>
                  <td>{{ n.Supplier }}</td>
                </tr>
                <tr v-if="!notaOptions.length">
                  <td colspan="4" class="empty-td">Tidak ada data.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3" style="border-top: 1px solid #e0e0e0">
        <v-btn variant="text" @click="showNotaModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal: Kode Bayar ── -->
  <SearchModal
    v-model="showKodeBayarModal"
    title="Pilih Kode Bayar"
    :columns="[
      { key: 'kode', title: 'Kode', width: '80px' },
      { key: 'nama', title: 'Nama Bayar' },
    ]"
    :items="kodeBayarOptions"
    :loading="kodeBayarLoading"
    :server-search="true"
    search-placeholder="Cari kode bayar..."
    :search-keys="['kode', 'nama']"
    @select="selectKodeBayar"
    @search="searchKodeBayarDebounced"
  />

  <!-- ── Modal: Account ── -->
  <SearchModal
    v-model="showAccountModal"
    title="Pilih Account"
    :columns="[
      { key: 'rekening', title: 'Rekening', width: '140px' },
      { key: 'bank', title: 'Bank', width: '120px' },
      { key: 'atasnama', title: 'Atas Nama' },
    ]"
    :items="accountOptions"
    :loading="accountLoading"
    :server-search="true"
    search-placeholder="Cari rekening atau bank..."
    :search-keys="['rekening', 'bank', 'atasnama']"
    @select="selectAccount"
    @search="searchAccountDebounced"
  />

  <!-- ── Modal: Voucher Realisasi ── -->
  <v-dialog v-model="showRlVoucherModal" max-width="700" scrollable>
    <v-card rounded="lg">
      <v-card-title class="modal-header">Pilih Voucher Pembayaran</v-card-title>
      <v-card-text class="pa-3 pt-2" style="max-height: 520px">
        <div class="modal-search-bar">
          <div class="modal-search-wrap">
            <IconSearch :size="14" class="modal-search-icon" />
            <input
              v-model="rlVoucherSearch"
              class="modal-search-input"
              placeholder="Cari nomor atau supplier..."
              @keydown.enter="doSearchRlVoucher"
            />
            <button
              v-if="rlVoucherSearch"
              class="modal-clear-btn"
              @click="
                rlVoucherSearch = '';
                doSearchRlVoucher();
              "
            >
              ×
            </button>
          </div>
          <v-btn
            size="small"
            variant="flat"
            color="#2e7d32"
            style="color: white"
            :loading="rlVoucherLoading"
            @click="doSearchRlVoucher"
            >Cari</v-btn
          >
        </div>
        <div class="modal-table-wrap">
          <table class="modal-tbl">
            <thead>
              <tr>
                <th style="min-width: 160px">Nomor Voucher</th>
                <th style="width: 100px">Tanggal</th>
                <th style="min-width: 200px">Supplier</th>
                <th style="width: 120px; text-align: right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="rlVoucherLoading">
                <td colspan="4" class="modal-loading">
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
                  v-for="v in rlVoucherOptions"
                  :key="v.Nomor"
                  class="modal-row"
                  @click="selectRlVoucher(v)"
                >
                  <td class="mono-cell">{{ v.Nomor }}</td>
                  <td>{{ fmtDate(v.Tanggal) }}</td>
                  <td>{{ v.Supplier }}</td>
                  <td class="tr">{{ fmt(v.Total) }}</td>
                </tr>
                <tr v-if="!rlVoucherOptions.length">
                  <td colspan="4" class="empty-td">Tidak ada data.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3" style="border-top: 1px solid #e0e0e0">
        <v-btn variant="text" @click="showRlVoucherModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Left column */
.left-col-wrap {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}
.pin5-banner {
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-align: center;
  flex-shrink: 0;
}
.form-section {
  background: white;
  border: 1px solid #c8e6c9;
  border-radius: 8px;
  border-top: 3px solid #2e7d32;
  padding: 10px 12px;
}
.form-section-title {
  font-size: 10px;
  font-weight: 700;
  color: #2e7d32;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}
.field-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 7px;
}
.field-row:last-child {
  margin-bottom: 0;
}
.field-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 7px;
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
.form-inp {
  height: 28px;
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
}
.form-inp.readonly,
.form-inp:read-only {
  background: #f9fafb;
  color: #6b7280;
}
.form-inp.mono {
  font-family: monospace;
}
.input-with-btn {
  display: flex;
  gap: 5px;
  align-items: center;
}
.input-with-btn .form-inp {
  flex: 1;
  min-width: 0;
}
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
.icon-btn {
  width: 28px;
  height: 28px;
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
.ppn-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ppn-check-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
}
.ppn-check {
  accent-color: #2e7d32;
  cursor: pointer;
}

/* Summary */
.summary-bar {
  background: #1b5e20;
  border-radius: 8px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.sbar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sbar-grand {
  margin-left: auto;
}
.sbar-lbl {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}
.sbar-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  font-variant-numeric: tabular-nums;
}
.sbar-lbl-grand {
  font-size: 12px;
  font-weight: 700;
  color: white;
  white-space: nowrap;
}
.sbar-val-grand {
  font-size: 15px;
  font-weight: 700;
  color: #a5d6a7;
  font-variant-numeric: tabular-nums;
}
.sbar-div {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}
.sbar-disc-inp {
  width: 110px;
  height: 24px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 700;
  text-align: right;
  outline: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-variant-numeric: tabular-nums;
}
.sbar-disc-inp:focus {
  border-color: #a5d6a7;
}

/* Hint */
.hint-trigger {
  position: relative;
  display: inline-block;
}
.hint-btn {
  background: #f0fdf4;
  border: 1px solid #2e7d32;
  border-radius: 4px;
  color: #2e7d32;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.hint-btn:hover {
  background: #e8f5e9;
}
.hint-popup {
  display: none;
  position: absolute;
  bottom: calc(100% + 6px);
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
  z-index: 100;
  min-width: 160px;
}
.hint-trigger:hover .hint-popup {
  display: block;
}
.hint-title {
  font-size: 10px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 4px;
}
.hint-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: #6b7280;
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
  flex-shrink: 0;
}

/* Right column */
.right-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.detail-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.section-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
  flex-shrink: 0;
}
.section-title {
  font-size: 10px;
  font-weight: 700;
  color: #2e7d32;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.tbl-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  min-height: 0;
}
.detail-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.detail-tbl thead tr {
  background: #2e7d32;
}
.detail-tbl th {
  color: white;
  font-weight: 700;
  padding: 4px 5px;
  white-space: nowrap;
  text-align: left;
}
.detail-tbl td {
  padding: 2px 3px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.detail-tbl tbody tr:hover td {
  background: rgba(46, 125, 50, 0.04);
}
.detail-tbl tfoot .foot-row td {
  background: #f0fdf4;
  border-top: 2px solid #2e7d32;
  padding: 3px 5px;
}
.foot-lbl {
  font-size: 11px;
  font-weight: 700;
  color: #374151;
  text-align: right;
}
.foot-val {
  font-size: 11px;
  font-weight: 700;
  color: #1b5e20;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.cell-inp {
  width: 100%;
  height: 22px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 0 3px;
  font-size: 11px;
  outline: none;
  background: white;
}
.cell-inp:focus {
  border-color: #2e7d32;
}
.cell-inp.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.cell-inp.cell-readonly {
  background: #f5f5f5;
  color: #9e9e9e;
}
.cell-computed {
  color: #6b7280;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.cell-total {
  font-weight: 700;
  color: #1b5e20;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
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

/* Type badges */
.type-badge {
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.type-bpb {
  background: #e3f2fd;
  color: #1565c0;
}
.type-bpj {
  background: #e8f5e9;
  color: #2e7d32;
}
.type-ret {
  background: #fff3e0;
  color: #e65100;
}
.type-poe {
  background: #f3e5f5;
  color: #6a1b9a;
}
.type-pjg {
  background: #efebe9;
  color: #4e342e;
}

/* Nota buttons */
.nota-btn-grp {
  display: flex;
  gap: 1px;
  flex-shrink: 0;
}
.nota-btn {
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
.nota-btn:hover {
  background: #e3f2fd;
  border-color: #1565c0;
  color: #1565c0;
}

.del-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #c62828;
  padding: 2px;
}

/* Modal */
.modal-header {
  font-size: 13px;
  font-weight: 700;
  padding: 12px 16px 10px;
  border-top: 3px solid #2e7d32;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}
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
.modal-table-wrap {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  max-height: 360px;
  overflow-y: auto;
}
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
  padding: 6px 8px;
  text-align: left;
  white-space: nowrap;
}
.modal-tbl td {
  padding: 5px 8px;
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
</style>

<style>
.hint-popup-teleport {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
  min-width: 160px;
}
.hint-popup-teleport .hint-title {
  font-size: 10px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 4px;
}
.hint-popup-teleport .hint-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: #6b7280;
  margin-bottom: 2px;
}
.hint-popup-teleport .hint-key {
  background: #e5e7eb;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  padding: 0 5px;
  font-family: monospace;
  color: #374151;
}

.type-select {
  height: 22px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 0 20px 0 5px; /* kanan lebih lebar untuk arrow */
  font-size: 10px;
  font-weight: 600;
  outline: none;
  background: white
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E")
    no-repeat right 5px center;
  background-size: 8px;
  color: #374151;
  cursor: pointer;
  flex-shrink: 0;
  min-width: 85px;
  appearance: none; /* hilangkan default OS arrow */
  -webkit-appearance: none;
}
.type-select:focus {
  border-color: #2e7d32;
}
.type-mmt {
  background: #e0f2f1;
  color: #00695c;
}
.type-bpe {
  background: #e1f5fe;
  color: #0277bd;
}
.type-bpg {
  background: #f3e5f5;
  color: #6a1b9a;
}
</style>
