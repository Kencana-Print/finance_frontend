<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  voucherPembayaranApi,
  type VoucherRow,
  type VoucherDetailRow,
} from "@/api/transaksi/voucherPembayaranApi";
import {
  exportVoucherPembayaran,
  exportVoucherPembayaranDetail,
} from "@/utils/exportExcel";
import {
  IconFileInvoice,
  IconPrinter,
  IconFileSpreadsheet,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const MENU_ID = "30";

// ── Periode ───────────────────────────────────────────────────────────
const STORAGE_KEY = "finance_periode_voucher_pembayaran";

const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const getSaved = () => {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (s?.startDate && s?.endDate) return s;
  } catch {
    /* silent */
  }
  return null;
};

const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
const saved = getSaved();

const startDate = ref(saved?.startDate ?? getLocal(firstDay));
const endDate = ref(saved?.endDate ?? getLocal(now));

watch([startDate, endDate], ([s, e]) => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startDate: s, endDate: e }),
    );
  } catch {
    /* silent */
  }
  loadData();
});

// ── Data ──────────────────────────────────────────────────────────────
const items = ref<VoucherRow[]>([]);
const detailItems = ref<VoucherDetailRow[]>([]);
const isLoading = ref(false);
const selected = ref<VoucherRow[]>([]);
const expanded = ref<any[]>([]);

const selectedItem = computed(() => selected.value[0] ?? null);

// ── Headers ───────────────────────────────────────────────────────────
const headers = [
  { key: "Nomor", title: "Nomor", width: "190px" },
  {
    key: "Tanggal",
    title: "Tanggal",
    width: "100px",
    align: "center" as const,
  },
  { key: "KodeSupplier", title: "Kode Sup", width: "90px" },
  { key: "Supplier", title: "Supplier", width: "260px" },
  { key: "NomorPajak", title: "No. Pajak", width: "130px" },
  { key: "Total", title: "Total", width: "140px", align: "right" as const },
  {
    key: "BahanTambahan",
    title: "Bahan Tambahan",
    width: "140px",
    align: "right" as const,
  },
  { key: "Net", title: "Net", width: "140px", align: "right" as const },
  { key: "Disc", title: "Disc", width: "60px", align: "right" as const },
  { key: "Status", title: "Status", width: "80px", align: "center" as const },
  { key: "NomorRealisasi", title: "No. Pengajuan Transfer", width: "160px" },
  {
    key: "TanggalRealisasi",
    title: "Tgl Realisasi",
    width: "100px",
    align: "center" as const,
  },
  { key: "AccountBayar", title: "Account", width: "100px" },
  { key: "NamaAccount", title: "Nama Account", width: "160px" },
  { key: "CcNama", title: "Cost Center", width: "140px" },
  { key: "DcNama", title: "DC", width: "120px" },
  { key: "Usr", title: "User", width: "80px", align: "center" as const },
  { key: "Created", title: "Created", width: "160px" },
];

// ── Load ──────────────────────────────────────────────────────────────
const loadData = async () => {
  isLoading.value = true;
  selected.value = [];
  expanded.value = [];
  try {
    const [master, detail] = await Promise.all([
      voucherPembayaranApi.getBrowse(startDate.value, endDate.value),
      voucherPembayaranApi.getBrowseDetail(startDate.value, endDate.value),
    ]);
    items.value = master;
    detailItems.value = detail;
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

const getDetail = (nomor: string) =>
  detailItems.value.filter((d) => d.Nomor === nomor);

// ── Row props — warna berdasarkan Ngedit (Delphi CustomDrawCell) ──────
// WAIT → biru, ACC → hijau, TOLAK → merah (hanya kolom Nomor di Delphi,
// tapi di web lebih natural pewarnaan seluruh baris)
const rowPropsFn = (data: any) => {
  const row = data?.item?.raw ?? data?.item ?? data;
  const ngedit = row?.Ngedit ?? "";
  if (ngedit === "WAIT")
    return { style: "background:#e3f2fd;color:#1565c0;font-weight:600" };
  if (ngedit === "ACC")
    return { style: "background:#e8f5e9;color:#2e7d32;font-weight:600" };
  if (ngedit === "TOLAK")
    return { style: "background:#ffebee;color:#c62828;font-weight:600" };
  // Belum ada nomor realisasi (belum diinput ke pengajuan transfer)
  if (!row?.NomorRealisasi)
    return { style: "background:#fff3e0;color:#e65100" };
  return {};
};

// ── Format ────────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
const fmtDate = (v: string) => {
  if (!v) return "-";
  const [y, m, d] = v.split("-");
  return `${d}-${m}-${y}`;
};

// ── Validasi ──────────────────────────────────────────────────────────
const requireSelected = (): boolean => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return false;
  }
  return true;
};

// ── Aksi ──────────────────────────────────────────────────────────────
const onBaru = () => router.push({ name: "VoucherPembayaranCreate" });

const onUbah = () => {
  if (!requireSelected()) return;
  router.push({
    name: "VoucherPembayaranEdit",
    params: { nomor: encodeURIComponent(selectedItem.value!.Nomor) },
  });
};

const onCetak = () => {
  if (!requireSelected()) return;
  window.open(
    `/transaksi/voucher-pembayaran/print/${encodeURIComponent(selectedItem.value!.Nomor)}`,
    "_blank",
  );
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
    await voucherPembayaranApi.delete(selectedItem.value.Nomor);
    toast.success("Data berhasil dihapus.");
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
const doExport = () =>
  exportVoucherPembayaran(items.value, startDate.value, endDate.value);
const doExportDetail = () =>
  exportVoucherPembayaranDetail(
    detailItems.value,
    startDate.value,
    endDate.value,
  );

// ── Pengajuan Perubahan Data ──────────────────────────────────────────
// Delphi: klik kanan → PengajuanPerubahanData1Click
// Cek tutup periode → jika perlu → tampil dialog alasan → submit
const showPengajuanDialog = ref(false);
const pengajuanAlasan = ref("");
const pengajuanLoading = ref(false);
const pengajuanSaving = ref(false);

const onPengajuan = async () => {
  if (!requireSelected()) return;
  pengajuanLoading.value = true;
  try {
    const res = await voucherPembayaranApi.cekPengajuan(
      selectedItem.value!.Nomor,
    );
    if (!res.perlu) {
      toast.info(res.message ?? "Tidak perlu pengajuan perubahan data.");
      return;
    }
    // Isi alasan lama jika ada (Delphi: edtalasan.text = pin_alasan)
    pengajuanAlasan.value = res.alasanLama ?? "";
    showPengajuanDialog.value = true;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message ?? "Gagal memeriksa status pengajuan.",
    );
  } finally {
    pengajuanLoading.value = false;
  }
};

const confirmPengajuan = async () => {
  if (!pengajuanAlasan.value.trim()) {
    toast.warning("Alasan harus diisi.");
    return;
  }
  pengajuanSaving.value = true;
  try {
    await voucherPembayaranApi.requestPin5(
      selectedItem.value!.Nomor,
      pengajuanAlasan.value.trim(),
    );
    toast.success("Berhasil diajukkan. Nunggu ACC.");
    showPengajuanDialog.value = false;
    pengajuanAlasan.value = "";
    await loadData(); // refresh agar Ngedit berubah ke WAIT
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal mengajukan.");
  } finally {
    pengajuanSaving.value = false;
  }
};

// ── Summary footer ────────────────────────────────────────────────────
const totalTotal = computed(() =>
  items.value.reduce((s, r) => s + Number(r.Total), 0),
);
const totalBahan = computed(() =>
  items.value.reduce((s, r) => s + Number(r.BahanTambahan), 0),
);
const totalNet = computed(() =>
  items.value.reduce((s, r) => s + Number(r.Net), 0),
);
</script>

<template>
  <BaseBrowse
    title="Voucher Pembayaran"
    :icon="IconFileInvoice"
    :menu-id="MENU_ID"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    :fixed-layout="false"
    :show-expand="true"
    :expanded="expanded"
    @update:expanded="expanded = $event"
    item-value="Nomor"
    v-model:selected="selected"
    :row-props-fn="rowPropsFn"
    @refresh="loadData"
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-lbl">Periode</span>
        <input v-model="startDate" type="date" class="date-inp" />
        <span class="filter-sep">s/d</span>
        <input v-model="endDate" type="date" class="date-inp" />
      </div>
    </template>

    <!-- ── Legend back color ── -->
    <template #filter-right>
      <div class="legend-wrap">
        <span class="legend-dot" style="background: #1565c0"></span>
        <span class="legend-lbl">Nunggu Acc</span>
        <span class="legend-dot" style="background: #2e7d32"></span>
        <span class="legend-lbl">Sudah Acc</span>
        <span class="legend-dot" style="background: #c62828"></span>
        <span class="legend-lbl">Tolak</span>
        <span class="legend-dot" style="background: #e65100"></span>
        <span class="legend-lbl">Belum PT</span>
      </div>
    </template>

    <!-- ── Tombol aksi ── -->
    <template #extra-actions>
      <v-btn size="small" color="primary" variant="flat" @click="onBaru"
        >+ Baru</v-btn
      >
      <v-btn
        size="small"
        variant="outlined"
        :disabled="!selectedItem"
        @click="onUbah"
        >Ubah</v-btn
      >
      <v-btn
        size="small"
        color="error"
        variant="tonal"
        :disabled="!selectedItem"
        @click="onHapus"
        >Hapus</v-btn
      >
      <v-btn
        size="small"
        color="warning"
        variant="tonal"
        :disabled="!selectedItem"
        :loading="pengajuanLoading"
        @click="onPengajuan"
      >
        Pengajuan Ubah
      </v-btn>
      <v-btn
        size="small"
        variant="tonal"
        :disabled="!selectedItem"
        @click="onCetak"
      >
        <template #prepend
          ><IconPrinter :size="13" :stroke-width="1.8"
        /></template>
        Cetak
      </v-btn>
      <v-btn size="small" variant="tonal" color="success" @click="doExport">
        <template #prepend
          ><IconFileSpreadsheet :size="13" :stroke-width="1.8"
        /></template>
        Export
      </v-btn>
      <v-btn size="small" variant="tonal" color="info" @click="doExportDetail">
        <template #prepend
          ><IconFileSpreadsheet :size="13" :stroke-width="1.8"
        /></template>
        Export Detail
      </v-btn>
    </template>

    <!-- ── Custom cells ── -->
    <template #item.Tanggal="{ value }">
      <span>{{ fmtDate(value) }}</span>
    </template>
    <template #item.Created="{ value }">
      <span style="font-size: 10px">{{ value }}</span>
    </template>
    <template
      v-for="col in ['Total', 'BahanTambahan', 'Net', 'Disc']"
      :key="col"
      v-slot:[`item.${col}`]="{ value }"
    >
      <span class="num-cell">{{ value ? fmt(value) : "" }}</span>
    </template>
    <template #item.TanggalRealisasi="{ value }">
      <span>{{ fmtDate(value) }}</span>
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="!getDetail(item.Nomor).length" class="detail-empty">
          Tidak ada detail untuk voucher ini.
        </div>
        <table v-else class="detail-tbl">
          <thead>
            <tr>
              <th style="min-width: 140px">Nota</th>
              <th style="min-width: 140px">Nomor PO</th>
              <th style="width: 100px">Tanggal</th>
              <th style="width: 80px">Type</th>
              <th style="width: 130px">Total</th>
              <th style="min-width: 130px">SPK Nomor</th>
              <th style="min-width: 220px">SPK Nama</th>
              <th style="width: 100px">Jumlah</th>
              <th style="width: 80px">BS</th>
              <th style="width: 100px">Tarif BS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, idx) in getDetail(item.Nomor)" :key="idx">
              <td>{{ d.Nota }}</td>
              <td>{{ d.NomorPO || "-" }}</td>
              <td class="tc">{{ fmtDate(d.Tanggal) }}</td>
              <td class="tc">{{ d.Type }}</td>
              <td class="tr">{{ fmt(d.Total) }}</td>
              <td>{{ d.SpkNomor || "-" }}</td>
              <td>{{ d.SpkNama || "-" }}</td>
              <td class="tr">{{ fmt(d.Jumlah) }}</td>
              <td class="tr">{{ fmt(d.Bs) }}</td>
              <td class="tr">{{ fmt(d.TarifBS) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="detail-foot">
              <td colspan="4" class="tr detail-foot-lbl">Total</td>
              <td class="tr detail-foot-val">
                {{
                  fmt(
                    getDetail(item.Nomor).reduce(
                      (s, d) => s + Number(d.Total),
                      0,
                    ),
                  )
                }}
              </td>
              <td colspan="5"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>

    <!-- ── Summary bar ── -->
    <template #summary-row>
      <span class="summary-lbl">Total</span>
      <span class="summary-val">{{ fmt(totalTotal) }}</span>
      <span class="summary-lbl" style="margin-left: 20px">Bahan Tambahan</span>
      <span class="summary-val">{{ fmt(totalBahan) }}</span>
      <span class="summary-lbl" style="margin-left: 20px">Net</span>
      <span class="summary-val">{{ fmt(totalNet) }}</span>
    </template>
  </BaseBrowse>

  <!-- ── Dialog Hapus ── -->
  <v-dialog v-model="showDeleteDialog" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title class="text-body-1 font-weight-bold pa-4"
        >Konfirmasi Hapus</v-card-title
      >
      <v-card-text class="pa-4 pt-0" style="font-size: 12px">
        Yakin ingin menghapus <strong>{{ selectedItem?.Nomor }}</strong
        >? <br /><small style="color: #c62828"
          >Detail voucher juga akan dihapus.</small
        >
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

  <!-- ── Dialog Pengajuan Perubahan Data ── -->
  <v-dialog v-model="showPengajuanDialog" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #f57c00"
      >
        Pengajuan Perubahan Data
      </v-card-title>
      <v-card-text class="pa-4 pt-2">
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px">
          Nomor: <strong>{{ selectedItem?.Nomor }}</strong> —
          {{ selectedItem?.Supplier }}
        </div>
        <label style="font-size: 11px; font-weight: 600; color: #4b5563">
          Alasan <span style="color: red">*</span>
        </label>
        <textarea
          v-model="pengajuanAlasan"
          rows="3"
          class="alasan-inp"
          placeholder="Isi alasan pengajuan perubahan data..."
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="showPengajuanDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="warning"
          variant="flat"
          :loading="pengajuanSaving"
          :disabled="!pengajuanAlasan.trim()"
          @click="confirmPengajuan"
        >
          Ajukan
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
  flex-wrap: wrap;
}
.filter-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}
.filter-sep {
  font-size: 12px;
  color: #9ca3af;
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

.legend-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: nowrap;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-lbl {
  font-size: 11px;
  color: #374151;
  margin-right: 6px;
}

.num-cell {
  font-variant-numeric: tabular-nums;
}

.detail-wrap {
  padding: 4px 0;
}
.detail-empty {
  padding: 12px 10px;
  font-size: 11px;
  color: #9e9e9e;
  font-style: italic;
}
.detail-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.detail-tbl thead tr {
  background: #1b5e20;
}
.detail-tbl th {
  color: white;
  font-weight: 700;
  padding: 4px 6px;
  white-space: nowrap;
  text-align: left;
}
.detail-tbl td {
  padding: 3px 6px;
  border-bottom: 1px solid #f0f0f0;
}
.detail-tbl tbody tr:hover td {
  background: rgba(46, 125, 50, 0.05);
}
.detail-foot td {
  background: #f0fdf4;
  border-top: 2px solid #2e7d32;
  padding: 4px 6px;
}
.detail-foot-lbl {
  font-size: 11px;
  font-weight: 700;
  color: #374151;
}
.detail-foot-val {
  font-size: 11px;
  font-weight: 700;
  color: #1b5e20;
  font-variant-numeric: tabular-nums;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.alasan-inp {
  width: 100%;
  margin-top: 4px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
}
.alasan-inp:focus {
  border-color: #f57c00;
}
</style>
