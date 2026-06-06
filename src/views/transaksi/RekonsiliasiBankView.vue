<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  rekonsiliasiBankApi,
  type RekonsiliasiBankRow,
} from "@/api/transaksi/rekonsiliasiBankApi";
import { exportRekonsiliasiBank } from "@/utils/exportExcel";
import {
  IconArrowsExchange,
  IconFileSpreadsheet,
  IconCheck,
  IconListCheck,
} from "@tabler/icons-vue";

const toast = useToast();
const MENU_ID = "27";

// ── Tanggal — single date ─────────────────────────────────────────────
const STORAGE_KEY = "finance_tanggal_rekon_bank";

const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const tanggal = ref(
  sessionStorage.getItem(STORAGE_KEY) ?? getLocal(new Date()),
);
watch(tanggal, (v) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* silent */
  }
  loadData();
});

// ── Data ──────────────────────────────────────────────────────────────
const items = ref<RekonsiliasiBankRow[]>([]);
const isLoading = ref(false);
const selected = ref<RekonsiliasiBankRow[]>([]);

const selectedItem = computed(() => selected.value[0] ?? null);

// ── Headers ───────────────────────────────────────────────────────────
const headers = [
  { key: "Kode", title: "Kode", width: "130px" },
  { key: "Nama", title: "Nama Account", width: "300px" },
  {
    key: "SaldoAkhir",
    title: "Saldo Buku",
    width: "160px",
    align: "right" as const,
  },
  {
    key: "SaldoBank",
    title: "Saldo Bank",
    width: "160px",
    align: "right" as const,
  },
  {
    key: "Rekon",
    title: "Status Rekon",
    width: "110px",
    align: "center" as const,
  },
];

// ── Load ──────────────────────────────────────────────────────────────
const loadData = async () => {
  isLoading.value = true;
  selected.value = [];
  try {
    items.value = await rekonsiliasiBankApi.getBrowse(tanggal.value);
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// ── Selisih summary ───────────────────────────────────────────────────
const selisihTotal = computed(() =>
  items.value.reduce(
    (s, r) => s + (Number(r.SaldoAkhir) - Number(r.SaldoBank)),
    0,
  ),
);
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
const fmtSelisih = (v: number) => {
  const abs = Math.abs(v);
  return (v < 0 ? "-" : "") + new Intl.NumberFormat("id-ID").format(abs);
};

// ── Row props ─────────────────────────────────────────────────────────
const rowPropsFn = (data: any) => {
  const row = data.item?.raw || data.item;
  if (row.Rekon === "Sudah") return { class: "row-sudah" };
  return {};
};

const requireSelected = (): boolean => {
  if (!selectedItem.value) {
    toast.warning("Pilih rekening terlebih dahulu.");
    return false;
  }
  return true;
};

// ════════════════════════════════════════════════════════════════════
// DIALOG 1: VALIDASI BANK
// ════════════════════════════════════════════════════════════════════
const showValidasiDialog = ref(false);
const validasiLoading = ref(false);
const validasiSaving = ref(false);
const saldoKoran = ref<number>(0);
const saldoBuku = ref<number>(0);
const validasiKode = ref("");
const validasiNama = ref("");
const validasiTanggal = ref("");

const onValidasi = async () => {
  if (!requireSelected()) return;
  const row = selectedItem.value!;
  validasiKode.value = row.Kode;
  validasiNama.value = row.Nama;
  validasiTanggal.value = tanggal.value;
  saldoBuku.value = Number(row.SaldoAkhir);

  validasiLoading.value = true;
  showValidasiDialog.value = true;
  try {
    const res = await rekonsiliasiBankApi.getValidasi(row.Kode, tanggal.value);
    saldoKoran.value = Number(res.saldo_koran) || 0;
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    saldoKoran.value = 0;
  } finally {
    validasiLoading.value = false;
  }
};

const confirmValidasi = async () => {
  validasiSaving.value = true;
  try {
    await rekonsiliasiBankApi.saveValidasi(
      validasiKode.value,
      validasiTanggal.value,
      saldoKoran.value,
    );
    toast.success("Validasi bank berhasil disimpan.");
    showValidasiDialog.value = false;

    // Delphi: jika saldo berbeda → otomatis buka rekonsiliasi
    if (saldoBuku.value !== saldoKoran.value) {
      await loadData();
      const updated = items.value.find((r) => r.Kode === validasiKode.value);
      if (updated) {
        selected.value = [updated];
        await openRekon(updated);
        return;
      }
    }
    await loadData();
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal menyimpan validasi.");
  } finally {
    validasiSaving.value = false;
  }
};

// ════════════════════════════════════════════════════════════════════
// DIALOG 2: REKONSILIASI
// ════════════════════════════════════════════════════════════════════
const showRekonDialog = ref(false);
const rekonKode = ref("");
const rekonNama = ref("");
const rekonTanggal = ref("");
const rekonSaldoBuku = ref(0);
const rekonSaldoKoran = ref(0);
const rekonLoading = ref(false);

// Detail grid 4 tabel: buku tambah, buku kurang, bank tambah, bank kurang
interface RekonItem {
  no: number;
  uraian: string;
  keterangan: string;
  nominal: number;
}
const bukuTambah = ref<RekonItem[]>([
  { no: 1, uraian: "", keterangan: "", nominal: 0 },
]);
const bukuKurang = ref<RekonItem[]>([
  { no: 1, uraian: "", keterangan: "", nominal: 0 },
]);
const bankTambah = ref<RekonItem[]>([
  { no: 1, uraian: "", keterangan: "", nominal: 0 },
]);
const bankKurang = ref<RekonItem[]>([
  { no: 1, uraian: "", keterangan: "", nominal: 0 },
]);

const subtotalBukuTambah = computed(() =>
  bukuTambah.value.reduce((s, r) => s + (Number(r.nominal) || 0), 0),
);
const subtotalBukuKurang = computed(() =>
  bukuKurang.value.reduce((s, r) => s + (Number(r.nominal) || 0), 0),
);
const subtotalBankTambah = computed(() =>
  bankTambah.value.reduce((s, r) => s + (Number(r.nominal) || 0), 0),
);
const subtotalBankKurang = computed(() =>
  bankKurang.value.reduce((s, r) => s + (Number(r.nominal) || 0), 0),
);

const penjumlahanBuku = computed(
  () => rekonSaldoBuku.value + subtotalBukuTambah.value,
);
const saldoSetelahBuku = computed(
  () => penjumlahanBuku.value - subtotalBukuKurang.value,
);

const penjumlahanBank = computed(
  () => rekonSaldoKoran.value + subtotalBankTambah.value,
);
const saldoSetelahBank = computed(
  () => penjumlahanBank.value - subtotalBankKurang.value,
);

const addRekonRow = (list: RekonItem[]) => {
  list.push({ no: list.length + 1, uraian: "", keterangan: "", nominal: 0 });
};
const removeRekonRow = (list: RekonItem[], idx: number) => {
  list.splice(idx, 1);
};

const onRekonsiliasi = () => {
  if (!requireSelected()) return;
  openRekon(selectedItem.value!);
};

const openRekon = async (row: RekonsiliasiBankRow) => {
  rekonKode.value = row.Kode;
  rekonNama.value = row.Nama;
  rekonTanggal.value = tanggal.value;
  rekonSaldoBuku.value = Number(row.SaldoAkhir);
  rekonSaldoKoran.value = Number(row.SaldoBank);

  // Reset
  bukuTambah.value = [{ no: 1, uraian: "", keterangan: "", nominal: 0 }];
  bukuKurang.value = [{ no: 1, uraian: "", keterangan: "", nominal: 0 }];
  bankTambah.value = [{ no: 1, uraian: "", keterangan: "", nominal: 0 }];
  bankKurang.value = [{ no: 1, uraian: "", keterangan: "", nominal: 0 }];

  showRekonDialog.value = true;
  rekonLoading.value = true;

  try {
    const res = await rekonsiliasiBankApi.getRekon(row.Kode, tanggal.value);
    if (res.bukuTambah.length) bukuTambah.value = res.bukuTambah;
    if (res.bukuKurang.length) bukuKurang.value = res.bukuKurang;
    if (res.bankTambah.length) bankTambah.value = res.bankTambah;
    if (res.bankKurang.length) bankKurang.value = res.bankKurang;
  } catch {
    /* pakai default kosong */
  } finally {
    rekonLoading.value = false;
  }
};

const rekonSaving = ref(false);
const confirmRekon = async () => {
  rekonSaving.value = true;
  try {
    await rekonsiliasiBankApi.saveRekon(
      rekonKode.value,
      rekonTanggal.value,
      rekonSaldoBuku.value,
      rekonSaldoKoran.value,
      {
        bukuTambah: bukuTambah.value,
        bukuKurang: bukuKurang.value,
        bankTambah: bankTambah.value,
        bankKurang: bankKurang.value,
      },
    );
    toast.success("Rekonsiliasi berhasil disimpan.");
    showRekonDialog.value = false;
    await loadData();
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal menyimpan rekonsiliasi.");
  } finally {
    rekonSaving.value = false;
  }
};

// ── Hapus ─────────────────────────────────────────────────────────────
const showDeleteDialog = ref(false);
const isDeleting = ref(false);

const onHapus = () => {
  if (!requireSelected()) return;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedItem.value) return;
  isDeleting.value = true;
  try {
    await rekonsiliasiBankApi.delete(selectedItem.value.Kode, tanggal.value);
    toast.success("Data rekonsiliasi berhasil dihapus.");
    showDeleteDialog.value = false;
    await loadData();
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal menghapus.");
  } finally {
    isDeleting.value = false;
  }
};

// ── Export ────────────────────────────────────────────────────────────
const doExport = () => exportRekonsiliasiBank(items.value, tanggal.value);
</script>

<template>
  <BaseBrowse
    title="Rekonsiliasi Bank"
    :icon="IconArrowsExchange"
    :menu-id="MENU_ID"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    :fixed-layout="false"
    item-value="Kode"
    v-model:selected="selected"
    :row-props-fn="rowPropsFn"
    @refresh="loadData"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-lbl">Per Tanggal</span>
        <input v-model="tanggal" type="date" class="date-inp" />
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="teal-darken-1"
        variant="flat"
        :disabled="!selectedItem"
        @click="onValidasi"
      >
        <template #prepend><IconCheck :size="13" :stroke-width="2" /></template>
        Validasi Bank
      </v-btn>
      <v-btn
        size="small"
        color="indigo-darken-1"
        variant="flat"
        :disabled="!selectedItem"
        @click="onRekonsiliasi"
      >
        <template #prepend
          ><IconListCheck :size="13" :stroke-width="1.8"
        /></template>
        Rekonsiliasi
      </v-btn>
      <v-btn
        size="small"
        color="error"
        variant="tonal"
        :disabled="!selectedItem"
        @click="onHapus"
      >
        Hapus
      </v-btn>
      <v-btn size="small" variant="tonal" color="success" @click="doExport">
        <template #prepend
          ><IconFileSpreadsheet :size="13" :stroke-width="1.8"
        /></template>
        Export
      </v-btn>
    </template>

    <template #item.SaldoAkhir="{ value }">
      <span style="font-variant-numeric: tabular-nums">{{
        fmt(Number(value))
      }}</span>
    </template>
    <template #item.SaldoBank="{ value }">
      <span style="font-variant-numeric: tabular-nums">{{
        fmt(Number(value))
      }}</span>
    </template>
    <template #item.Rekon="{ value }">
      <span :class="value === 'Sudah' ? 'badge-sudah' : 'badge-belum'">{{
        value
      }}</span>
    </template>

    <template #summary-row="{ filteredItems }">
      <div class="summary-inner">
        <span class="summary-lbl">Saldo Buku :</span>
        <span class="summary-val">
          {{
            fmt(
              filteredItems.reduce(
                (s: number, r: any) => s + Number(r.SaldoAkhir),
                0,
              ),
            )
          }}
        </span>
        <span class="summary-sep">|</span>
        <span class="summary-lbl">Saldo Bank :</span>
        <span class="summary-val">
          {{
            fmt(
              filteredItems.reduce(
                (s: number, r: any) => s + Number(r.SaldoBank),
                0,
              ),
            )
          }}
        </span>
        <span class="summary-sep">|</span>
        <span class="summary-lbl">Selisih :</span>
        <span
          class="summary-val"
          :style="{ color: selisihTotal !== 0 ? '#ffcc80' : 'white' }"
        >
          {{ fmtSelisih(selisihTotal) }}
        </span>
      </div>
    </template>
  </BaseBrowse>

  <!-- ════════════════════════════════════════════
       DIALOG 1: VALIDASI BANK
  ════════════════════════════════════════════ -->
  <v-dialog v-model="showValidasiDialog" max-width="440" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #2e7d32"
      >
        Validasi Bank
      </v-card-title>
      <v-card-text class="pa-4 pt-2">
        <v-skeleton-loader v-if="validasiLoading" type="list-item@3" />
        <template v-else>
          <!-- Info rekening -->
          <div class="vld-info-row">
            <span class="vld-lbl">Tanggal</span>
            <span class="vld-val">{{ validasiTanggal }}</span>
          </div>
          <div class="vld-info-row">
            <span class="vld-lbl">Kode</span>
            <span class="vld-val mono">{{ validasiKode }}</span>
          </div>
          <div class="vld-info-row mb-3">
            <span class="vld-lbl">Nama</span>
            <span class="vld-val">{{ validasiNama }}</span>
          </div>

          <!-- Saldo -->
          <div class="vld-saldo-box">
            <div class="vld-saldo-row">
              <span class="vld-saldo-lbl">Pembukuan (Sistem)</span>
              <span class="vld-saldo-val readonly">{{ fmt(saldoBuku) }}</span>
            </div>
            <div class="vld-saldo-row mt-2">
              <label class="vld-saldo-lbl req">Rekening Koran</label>
              <input
                v-model.number="saldoKoran"
                type="number"
                class="vld-saldo-input"
                placeholder="0"
                @focus="($event.target as HTMLInputElement).select()"
              />
            </div>
            <!-- Selisih indicator -->
            <div
              class="vld-selisih-row"
              :class="saldoBuku === saldoKoran ? 'balanced' : 'unbalanced'"
            >
              <span>Selisih: {{ fmtSelisih(saldoBuku - saldoKoran) }}</span>
              <span v-if="saldoBuku !== saldoKoran" style="font-size: 10px">
                → Rekonsiliasi akan dibuka otomatis
              </span>
            </div>
          </div>
        </template>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="showValidasiDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          :loading="validasiSaving"
          :disabled="validasiLoading"
          @click="confirmValidasi"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ════════════════════════════════════════════
     DIALOG 2: REKONSILIASI BANK
════════════════════════════════════════════ -->
  <v-dialog v-model="showRekonDialog" max-width="1100" persistent scrollable>
    <v-card rounded="lg" style="overflow: hidden">
      <!-- ── Header rapi ── -->
      <div class="rekon-header">
        <div class="rekon-header-left">
          <span class="rekon-header-title">Rekonsiliasi Bank</span>
          <div class="rekon-header-info">
            <span class="rekon-header-kode">{{ rekonKode }}</span>
            <span class="rekon-header-nama">{{ rekonNama }}</span>
          </div>
        </div>
        <div class="rekon-header-right">
          <span class="rekon-header-tgl">{{ rekonTanggal }}</span>
        </div>
      </div>

      <v-card-text class="pa-4 pt-3" style="overflow-y: auto">
        <!-- Loading skeleton -->
        <v-skeleton-loader v-if="rekonLoading" type="table-row@6" />

        <template v-else>
          <div class="rekon-grid">
            <!-- ══ KIRI: Pembukuan Perusahaan ══ -->
            <div class="rekon-col">
              <div class="rekon-col-header">
                Saldo Menurut Pembukuan Perusahaan
              </div>
              <div class="rekon-saldo-display">{{ fmt(rekonSaldoBuku) }}</div>

              <!-- Ditambah -->
              <div class="rekon-sub-title">Ditambah :</div>
              <table class="rekon-tbl">
                <thead>
                  <tr>
                    <th style="width: 32px">No</th>
                    <th>Uraian</th>
                    <th style="width: 110px">Ket</th>
                    <th style="width: 105px">Nominal</th>
                    <th style="width: 22px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in bukuTambah" :key="`bt${i}`">
                    <td class="tc">{{ i + 1 }}</td>
                    <td><input v-model="r.uraian" class="ri" /></td>
                    <td><input v-model="r.keterangan" class="ri" /></td>
                    <td>
                      <input
                        v-model.number="r.nominal"
                        type="number"
                        class="ri tr"
                      />
                    </td>
                    <td>
                      <button
                        class="rdel"
                        @click="removeRekonRow(bukuTambah, i)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="rekon-add-row">
                <button class="radd" @click="addRekonRow(bukuTambah)">
                  + Baris
                </button>
                <span class="rekon-sub-total"
                  >Subtotal: {{ fmt(subtotalBukuTambah) }}</span
                >
              </div>
              <div class="rekon-penjumlahan">
                <span>Penjumlahan</span>
                <span>{{ fmt(penjumlahanBuku) }}</span>
              </div>

              <!-- Dikurangi -->
              <div class="rekon-sub-title mt-2">Dikurangi :</div>
              <table class="rekon-tbl">
                <thead>
                  <tr>
                    <th style="width: 32px">No</th>
                    <th>Uraian</th>
                    <th style="width: 110px">Keterangan</th>
                    <th style="width: 105px">Nominal</th>
                    <th style="width: 22px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in bukuKurang" :key="`bk${i}`">
                    <td class="tc">{{ i + 1 }}</td>
                    <td><input v-model="r.uraian" class="ri" /></td>
                    <td><input v-model="r.keterangan" class="ri" /></td>
                    <td>
                      <input
                        v-model.number="r.nominal"
                        type="number"
                        class="ri tr"
                      />
                    </td>
                    <td>
                      <button
                        class="rdel"
                        @click="removeRekonRow(bukuKurang, i)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="rekon-add-row">
                <button class="radd" @click="addRekonRow(bukuKurang)">
                  + Baris
                </button>
                <span class="rekon-sub-total"
                  >Subtotal: {{ fmt(subtotalBukuKurang) }}</span
                >
              </div>

              <div
                class="rekon-saldo-akhir"
                :class="
                  saldoSetelahBuku === saldoSetelahBank
                    ? 'akhir-ok'
                    : 'akhir-err'
                "
              >
                <span>Saldo Setelah Rekonsiliasi</span>
                <span style="font-variant-numeric: tabular-nums">{{
                  fmt(saldoSetelahBuku)
                }}</span>
              </div>
            </div>

            <!-- ── Divider ── -->
            <div class="rekon-divider"></div>

            <!-- ══ KANAN: Pembukuan Bank ══ -->
            <div class="rekon-col">
              <div class="rekon-col-header">Saldo Menurut Pembukuan Bank</div>
              <div class="rekon-saldo-display">{{ fmt(rekonSaldoKoran) }}</div>

              <!-- Ditambah -->
              <div class="rekon-sub-title">Ditambah :</div>
              <table class="rekon-tbl">
                <thead>
                  <tr>
                    <th style="width: 32px">No</th>
                    <th>Uraian</th>
                    <th style="width: 110px">Keterangan</th>
                    <th style="width: 105px">Nominal</th>
                    <th style="width: 22px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in bankTambah" :key="`nbt${i}`">
                    <td class="tc">{{ i + 1 }}</td>
                    <td><input v-model="r.uraian" class="ri" /></td>
                    <td><input v-model="r.keterangan" class="ri" /></td>
                    <td>
                      <input
                        v-model.number="r.nominal"
                        type="number"
                        class="ri tr"
                      />
                    </td>
                    <td>
                      <button
                        class="rdel"
                        @click="removeRekonRow(bankTambah, i)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="rekon-add-row">
                <button class="radd" @click="addRekonRow(bankTambah)">
                  + Baris
                </button>
                <span class="rekon-sub-total"
                  >Subtotal: {{ fmt(subtotalBankTambah) }}</span
                >
              </div>
              <div class="rekon-penjumlahan">
                <span>Penjumlahan</span>
                <span>{{ fmt(penjumlahanBank) }}</span>
              </div>

              <!-- Dikurangi -->
              <div class="rekon-sub-title mt-2">Dikurangi :</div>
              <table class="rekon-tbl">
                <thead>
                  <tr>
                    <th style="width: 32px">No</th>
                    <th>Uraian</th>
                    <th style="width: 110px">Keterangan</th>
                    <th style="width: 105px">Nominal</th>
                    <th style="width: 22px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in bankKurang" :key="`nbk${i}`">
                    <td class="tc">{{ i + 1 }}</td>
                    <td><input v-model="r.uraian" class="ri" /></td>
                    <td><input v-model="r.keterangan" class="ri" /></td>
                    <td>
                      <input
                        v-model.number="r.nominal"
                        type="number"
                        class="ri tr"
                      />
                    </td>
                    <td>
                      <button
                        class="rdel"
                        @click="removeRekonRow(bankKurang, i)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="rekon-add-row">
                <button class="radd" @click="addRekonRow(bankKurang)">
                  + Baris
                </button>
                <span class="rekon-sub-total"
                  >Subtotal: {{ fmt(subtotalBankKurang) }}</span
                >
              </div>

              <div
                class="rekon-saldo-akhir"
                :class="
                  saldoSetelahBuku === saldoSetelahBank
                    ? 'akhir-ok'
                    : 'akhir-err'
                "
              >
                <span>Saldo Setelah Rekonsiliasi</span>
                <span style="font-variant-numeric: tabular-nums">{{
                  fmt(saldoSetelahBank)
                }}</span>
              </div>
            </div>
          </div>

          <!-- Balance bar -->
          <div
            class="rekon-balance-bar"
            :class="
              saldoSetelahBuku === saldoSetelahBank ? 'bal-ok' : 'bal-err'
            "
          >
            <span v-if="saldoSetelahBuku === saldoSetelahBank">
              ✓ Saldo sudah balance
            </span>
            <span v-else>
              ✗ Belum balance — Selisih:
              {{ fmtSelisih(saldoSetelahBuku - saldoSetelahBank) }}
            </span>
          </div>
        </template>
      </v-card-text>

      <v-card-actions class="pa-4" style="border-top: 1px solid #e0e0e0">
        <v-btn variant="text" @click="showRekonDialog = false">Tutup</v-btn>
        <v-spacer />
        <v-btn
          color="indigo-darken-1"
          variant="flat"
          :loading="rekonSaving"
          :disabled="rekonLoading"
          @click="confirmRekon"
        >
          Simpan Rekonsiliasi
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Hapus ── -->
  <v-dialog v-model="showDeleteDialog" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title class="text-body-1 font-weight-bold pa-4">
        Hapus Data Rekonsiliasi
      </v-card-title>
      <v-card-text class="pa-4 pt-0" style="font-size: 12px">
        Yakin ingin menghapus rekonsiliasi
        <strong>{{ selectedItem?.Kode }} – {{ selectedItem?.Nama }}</strong>
        tanggal <strong>{{ tanggal }}</strong
        >?
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="showDeleteDialog = false">Batal</v-btn>
        <v-btn
          color="error"
          variant="flat"
          :loading="isDeleting"
          @click="confirmDelete"
        >
          Ya, Hapus
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap; /* Mencegah overflow jika layar menyempit */
}
.filter-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}
.date-inp {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  width: 130px;
}
.date-inp:focus {
  border-color: #2e7d32;
}
.mono {
  font-family: monospace;
}

:deep(.row-sudah td) {
  color: #1565c0 !important;
  font-weight: 600;
}

.badge-sudah {
  background: #e3f2fd;
  color: #1565c0;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-belum {
  background: #fff3e0;
  color: #e65100;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.summary-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
  white-space: nowrap;
}
.summary-lbl {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
}
.summary-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  font-variant-numeric: tabular-nums;
}
.summary-sep {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

/* ── Dialog Validasi ── */
.vld-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.vld-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
  width: 70px;
  flex-shrink: 0;
}
.vld-val {
  font-size: 12px;
}
.vld-saldo-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
}
.vld-saldo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.vld-saldo-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
}
.vld-saldo-lbl.req::after {
  content: " *";
  color: red;
}
.vld-saldo-val.readonly {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: #e5e7eb;
  border-radius: 4px;
  padding: 3px 10px;
}
.vld-saldo-input {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  outline: none;
  width: 160px;
}
.vld-saldo-input:focus {
  border-color: #2e7d32;
}
.vld-selisih-row {
  margin-top: 10px;
  padding-top: 8px;
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

/* ── Header rekonsiliasi ── */
.rekon-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 10px;
  border-top: 3px solid #1565c0;
  border-bottom: 1px solid #e3f2fd;
  background: #f8fbff;
  gap: 12px;
}
.rekon-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.rekon-header-title {
  font-size: 13px;
  font-weight: 700;
  color: #1565c0;
  white-space: nowrap;
}
.rekon-header-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rekon-header-kode {
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  background: #e3f2fd;
  color: #1565c0;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
.rekon-header-nama {
  font-size: 11px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 500px;
}
.rekon-header-right {
  flex-shrink: 0;
}
.rekon-header-tgl {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 12px;
  border-radius: 4px;
  white-space: nowrap;
}

/* ── Grid layout ── */
.rekon-grid {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  gap: 0;
}
.rekon-col {
  padding: 0 10px;
}
.rekon-col:first-child {
  padding-left: 0;
}
.rekon-col:last-child {
  padding-right: 0;
}
.rekon-divider {
  background: #e0e0e0;
  margin: 0 4px;
}

.rekon-col-header {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 2px solid #e3f2fd;
}
.rekon-saldo-display {
  background: #e3f2fd;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
  margin-bottom: 10px;
  color: #1565c0;
}
.rekon-sub-title {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}

/* ── Tabel detail ── */
.rekon-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.rekon-tbl thead tr {
  background: #1565c0;
}
.rekon-tbl th {
  color: white;
  font-weight: 700;
  padding: 4px 5px;
  text-align: left;
  white-space: nowrap;
}
.rekon-tbl td {
  padding: 1px 3px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.rekon-tbl tbody tr:hover td {
  background: #f0f7ff;
}

.ri {
  width: 100%;
  height: 24px;
  border: 1px solid #e0e0e0;
  border-radius: 2px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.ri:focus {
  border-color: #1565c0;
}
.ri.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.rdel {
  background: none;
  border: none;
  cursor: pointer;
  color: #c62828;
  font-size: 14px;
  font-weight: 700;
  padding: 0 2px;
  line-height: 1;
}
.rdel:hover {
  color: #b71c1c;
}

/* ── Add row / subtotal ── */
.rekon-add-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 0 5px;
}
.radd {
  background: none;
  border: 1px dashed #1565c0;
  border-radius: 3px;
  color: #1565c0;
  font-size: 10px;
  padding: 1px 8px;
  cursor: pointer;
}
.radd:hover {
  background: #e3f2fd;
}
.rekon-sub-total {
  font-size: 10px;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

/* ── Penjumlahan / saldo akhir ── */
.rekon-penjumlahan {
  display: flex;
  justify-content: space-between;
  background: #e8f5e9;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #1b5e20;
  font-variant-numeric: tabular-nums;
}
.rekon-saldo-akhir {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  margin-top: 8px;
}
.akhir-ok {
  background: #1565c0;
}
.akhir-err {
  background: #c62828;
}

/* ── Balance bar ── */
.rekon-balance-bar {
  margin-top: 14px;
  padding: 9px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}
.bal-ok {
  background: #e8f5e9;
  color: #2e7d32;
}
.bal-err {
  background: #ffebee;
  color: #c62828;
}
</style>
