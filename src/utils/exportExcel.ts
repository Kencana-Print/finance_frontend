import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// --- Master Data Export ---
export const exportCostCenter = async (
  items: any[],
  type: "browse" | "detail",
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");

  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  // ── Style helpers ──
  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const boldFont: Partial<ExcelJS.Font> = { bold: true, size: 10 };
  const normalFont: Partial<ExcelJS.Font> = { size: 10 };

  const setHeaderCell = (cell: ExcelJS.Cell, value: string) => {
    cell.value = value;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };

  const setCell = (
    cell: ExcelJS.Cell,
    value: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = value;
    cell.font = bold ? boldFont : normalFont;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: align };
  };

  if (type === "browse") {
    // ── Header info ──
    ws.mergeCells("A1:B1");
    ws.getCell("A1").value = "Browse Cost Center";
    ws.getCell("A1").font = { bold: true, size: 12 };

    ws.mergeCells("A2:B2");
    ws.getCell("A2").value = `Tanggal  :${tglStr}`;
    ws.getCell("A2").font = { size: 10 };

    ws.addRow([]);

    // ── Table header ──
    const hRow = ws.addRow(["Nomor", "Nama"]);
    hRow.eachCell((cell) => setHeaderCell(cell, cell.value as string));
    hRow.height = 18;

    // ── Data ──
    for (const item of items) {
      const row = ws.addRow([item.kode, item.nama]);
      setCell(row.getCell(1), item.kode, "right");
      setCell(row.getCell(2), item.nama, "left");
      row.height = 16;
    }

    ws.getColumn(1).width = 10;
    ws.getColumn(2).width = 30;
  } else {
    // ── Header info ──
    ws.mergeCells("A1:D1");
    ws.getCell("A1").value = "Browse Cost Center";
    ws.getCell("A1").font = { bold: true, size: 12 };

    ws.mergeCells("A2:D2");
    ws.getCell("A2").value = `Tanggal  :${tglStr}`;
    ws.getCell("A2").font = { size: 10 };

    ws.addRow([]);

    // ── Table header — 4 kolom ──
    const hRow = ws.addRow(["Nomor", "Nama", "Nomor", "Nama"]);
    ["A", "B", "C", "D"].forEach((col, i) => {
      setHeaderCell(
        ws.getCell(`${col}${hRow.number}`),
        hRow.getCell(i + 1).value as string,
      );
    });
    hRow.height = 18;

    // ── Data: header kiri + detail kanan ──
    let rowNum = hRow.number + 1;
    for (const item of items) {
      const details = item.detail ?? [];
      const rowCount = Math.max(details.length, 1);

      for (let i = 0; i < rowCount; i++) {
        const row = ws.getRow(rowNum + i);
        // Kolom kiri hanya di baris pertama tiap header
        if (i === 0) {
          setCell(row.getCell(1), item.kode, "right");
          setCell(row.getCell(2), item.nama, "left");
        } else {
          setCell(row.getCell(1), "", "left");
          setCell(row.getCell(2), "", "left");
        }
        // Kolom kanan = detail
        if (details[i]) {
          setCell(row.getCell(3), item.kode, "right");
          setCell(row.getCell(4), details[i].nama, "left");
        } else {
          setCell(row.getCell(3), "", "left");
          setCell(row.getCell(4), "", "left");
        }
        row.height = 16;
      }
      rowNum += rowCount;
    }

    ws.getColumn(1).width = 10;
    ws.getColumn(2).width = 30;
    ws.getColumn(3).width = 10;
    ws.getColumn(4).width = 30;
  }

  const buf = await wb.xlsx.writeBuffer();
  const name = type === "browse" ? "Master_Cost_Center" : "Detail_Cost_Center";
  saveAs(new Blob([buf]), `${name}_${tglStr.replace(/\//g, "-")}.xlsx`);
};

export const exportAccount = async (items: any[]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");

  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };

  ws.mergeCells("A1:I1");
  ws.getCell("A1").value = "Master Account / Rekening";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:I2");
  ws.getCell("A2").value = `Tanggal  :${tglStr}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Kode",
    "Nama",
    "No. Rekening Bank",
    "Store",
    "Kelompok",
    "Cabang",
    "Keterangan",
    "Status",
    "Saldo Akhir",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 18;

  for (const item of items) {
    const row = ws.addRow([
      item.kode,
      item.nama,
      item.no_rekening,
      item.store ?? "",
      item.kelompok,
      item.cabang,
      item.keterangan,
      item.status,
      Number(item.saldo_akhir) || 0,
    ]);
    setC(row.getCell(1), item.kode, "left");
    setC(row.getCell(2), item.nama, "left");
    setC(row.getCell(3), item.no_rekening, "left");
    setC(row.getCell(4), item.store ?? "", "left"); // ← store
    setC(row.getCell(5), item.kelompok, "left"); // ← kelompok
    setC(row.getCell(6), item.cabang, "center"); // ← cabang
    setC(row.getCell(7), item.keterangan, "left"); // ← keterangan
    setC(row.getCell(8), item.status, "center"); // ← status
    row.getCell(9).value = Number(item.saldo_akhir) || 0;
    row.getCell(9).border = borderAll;
    row.getCell(9).font = { size: 10 };
    row.getCell(9).numFmt = "#,##0";
    row.getCell(9).alignment = { horizontal: "right" };
    row.height = 16;
  }

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 20; // Store — geser semua yang setelahnya +1
  ws.getColumn(5).width = 20; // Kelompok
  ws.getColumn(6).width = 10; // Cabang
  ws.getColumn(7).width = 25; // Keterangan
  ws.getColumn(8).width = 10; // Status
  ws.getColumn(9).width = 18; // Saldo Akhir

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Master_Account_${tglStr.replace(/\//g, "-")}.xlsx`);
};

export const exportKelompok = async (items: any[]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");

  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };

  ws.mergeCells("A1:C1");
  ws.getCell("A1").value = "Master Kelompok Account";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:C2");
  ws.getCell("A2").value = `Tanggal  :${tglStr}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = ["Kode", "Nama", "Keterangan (D/K)"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 18;

  for (const item of items) {
    const row = ws.addRow([item.kode, item.nama, item.keterangan]);
    setC(row.getCell(1), item.kode, "center");
    setC(row.getCell(2), item.nama, "left");
    setC(row.getCell(3), item.keterangan, "center");
    row.height = 16;
  }

  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 35;
  ws.getColumn(3).width = 18;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Master_Kelompok_${tglStr.replace(/\//g, "-")}.xlsx`);
};

export const exportJenisPembayaran = async (items: any[]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  ws.mergeCells("A1:A1");
  ws.getCell("A1").value = "Master Jenis Pembayaran";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.getCell("A2").value = `Tanggal  :${tglStr}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const hRow = ws.addRow(["Jenis Pembayaran"]);
  const hCell = hRow.getCell(1);
  hCell.value = "Jenis Pembayaran";
  hCell.font = headerFont;
  hCell.fill = headerFill;
  hCell.border = borderAll;
  hCell.alignment = { vertical: "middle", horizontal: "center" };
  hRow.height = 18;

  for (const item of items) {
    const row = ws.addRow([item.nama]);
    row.getCell(1).value = item.nama;
    row.getCell(1).border = borderAll;
    row.getCell(1).font = { size: 10 };
    row.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    row.height = 16;
  }

  ws.getColumn(1).width = 35;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `Master_Jenis_Pembayaran_${tglStr.replace(/\//g, "-")}.xlsx`,
  );
};

// --- Transaksi Export ---
export const exportUangMuka = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const numFmt = "#,##0";

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = numFmt;
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  const colCount = 14;
  const lastCol = String.fromCharCode(64 + colCount); // N

  ws.mergeCells(`A1:${lastCol}1`);
  ws.getCell("A1").value = "Daftar Uang Muka / Kasbon";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells(`A2:${lastCol}2`);
  ws.getCell("A2").value = `Periode  :${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Jenis",
    "Nama Account",
    "PJH",
    "Nota",
    "Penerima",
    "Nominal",
    "Terpakai",
    "Sisa",
    "Keterangan",
    "No Bukti",
    "Selesai",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const item of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), item.Nomor, "left");
    setC(row.getCell(2), item.Tanggal, "center");
    setC(row.getCell(3), item.Jenis, "center");
    setC(row.getCell(4), item.NamaAccount, "left");
    setC(row.getCell(5), item.Pjh, "left");
    setC(row.getCell(6), item.Nota, "left");
    setC(row.getCell(7), item.Penerima, "left");
    setN(row.getCell(8), item.Nominal);
    setN(row.getCell(9), item.Terpakai);
    setN(row.getCell(10), item.Sisa);
    setC(row.getCell(11), item.Keterangan, "left");
    setC(row.getCell(12), item.NoBukti, "left");
    setC(row.getCell(13), item.Selesai, "center");
    setC(row.getCell(14), item.Closed, "center");

    // Highlight baris Selesai=Belum seperti di Delphi
    if (item.Selesai === "Belum") {
      for (let c = 1; c <= colCount; c++) {
        row.getCell(c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFCE4EC" },
        };
      }
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 25;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 20;
  ws.getColumn(8).width = 16;
  ws.getColumn(9).width = 16;
  ws.getColumn(10).width = 16;
  ws.getColumn(11).width = 25;
  ws.getColumn(12).width = 14;
  ws.getColumn(13).width = 10;
  ws.getColumn(14).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Uang_Muka_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBkk = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BKK");
  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "Bukti Kas Keluar (BKK)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Tipe",
    "Account",
    "Penerima",
    "Nota",
    "Keterangan",
    "Nominal",
    "Kasbon",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.Tipe, "center");
    setC(row.getCell(4), r.Account);
    setC(row.getCell(5), r.Penerima);
    setC(row.getCell(6), r.Nota);
    setC(row.getCell(7), r.Keterangan);
    setN(row.getCell(8), r.Nominal);
    setC(row.getCell(9), r.Kasbon);
    setC(row.getCell(10), r.Closed, "center");
    if (r.Kasbon) {
      for (let c = 1; c <= 10; c++)
        row.getCell(c).font = {
          size: 10,
          color: { argb: "FF1565C0" },
          bold: true,
        };
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 25;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BKK_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBkkDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BKK Detail");
  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Bukti Kas Keluar (BKK)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "No",
    "Uraian",
    "Nominal",
    "Account",
    "Nama Account",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";

  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;

    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.No, "center");
    setC(row.getCell(3), r.Uraian);
    setN(row.getCell(4), r.Nominal);
    setC(row.getCell(5), r.Account);
    setC(row.getCell(6), r.NamaAccount);
    setC(row.getCell(7), r.DetailCC);
    row.height = 16;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 35;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BKK_Detail_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBbk = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BBK");
  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "Bukti Bank Keluar (BBK)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Tipe",
    "Account",
    "Penerima",
    "Nota",
    "Keterangan",
    "Nominal",
    "Link",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.Tipe, "center");
    setC(row.getCell(4), r.Account);
    setC(row.getCell(5), r.Penerima);
    setC(row.getCell(6), r.Nota);
    setC(row.getCell(7), r.Keterangan);
    setN(row.getCell(8), r.Nominal);
    setC(row.getCell(9), r.Link);
    setC(row.getCell(10), r.Closed, "center");
    if (r.Link) {
      for (let c = 1; c <= 10; c++)
        row.getCell(c).font = {
          size: 10,
          color: { argb: "FF1565C0" },
          bold: true,
        };
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 25;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BBK_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBbkDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BBK Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Bukti Bank Keluar (BBK)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "No",
    "Uraian",
    "Nominal",
    "Account",
    "Nama Account",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = ""; // ← track nomor sebelumnya

  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor; // ← cek duplikat

    // Kolom Nomor: kosongkan jika sama dengan baris sebelumnya
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.No, "center");
    setC(row.getCell(3), r.Uraian);
    setN(row.getCell(4), r.Nominal);
    setC(row.getCell(5), r.Account);
    setC(row.getCell(6), r.NamaAccount);
    setC(row.getCell(7), r.DetailCC);
    row.height = 16;

    lastNomor = r.Nomor; // ← update tracker
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 35;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BBK_Detail_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBkm = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BKM");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "Bukti Kas Masuk (BKM)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Tipe",
    "Account",
    "Diterima Dari",
    "Nota",
    "Keterangan",
    "Nominal",
    "Kasbon",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.Tipe, "center");
    setC(row.getCell(4), r.Account);
    setC(row.getCell(5), r.DiterimaDari);
    setC(row.getCell(6), r.Nota);
    setC(row.getCell(7), r.Keterangan);
    setN(row.getCell(8), r.Nominal);
    setC(row.getCell(9), r.Kasbon);
    setC(row.getCell(10), r.Closed, "center");
    if (r.Kasbon) {
      for (let c = 1; c <= 10; c++)
        row.getCell(c).font = {
          size: 10,
          color: { argb: "FF1565C0" },
          bold: true,
        };
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 25;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BKM_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBkmDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BKM Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Bukti Kas Masuk (BKM)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "No",
    "Uraian",
    "Nominal",
    "Account",
    "Nama Account",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.No, "center");
    setC(row.getCell(3), r.Uraian);
    setN(row.getCell(4), r.Nominal);
    setC(row.getCell(5), r.Account);
    setC(row.getCell(6), r.NamaAccount);
    setC(row.getCell(7), r.DetailCC);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 35;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BKM_Detail_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBbm = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BBM");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:K1");
  ws.getCell("A1").value = "Bukti Bank Masuk (BBM)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:K2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Tipe",
    "Account",
    "Rekening",
    "Diterima Dari",
    "Nota",
    "Keterangan",
    "Nominal",
    "Kasbon",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.Tipe, "center");
    setC(row.getCell(4), r.Account);
    setC(row.getCell(5), r.Rekening);
    setC(row.getCell(6), r.DiterimaDari);
    setC(row.getCell(7), r.Nota);
    setC(row.getCell(8), r.Keterangan);
    setN(row.getCell(9), r.Nominal);
    setC(row.getCell(10), r.Kasbon);
    setC(row.getCell(11), r.Closed, "center");
    if (r.Kasbon) {
      for (let c = 1; c <= 11; c++)
        row.getCell(c).font = {
          size: 10,
          color: { argb: "FF1565C0" },
          bold: true,
        };
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 26;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 20;
  ws.getColumn(7).width = 12;
  ws.getColumn(8).width = 25;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 18;
  ws.getColumn(11).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BBM_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBbmDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BBM Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Bukti Bank Masuk (BBM)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "No",
    "Uraian",
    "Nominal",
    "Account",
    "Nama Account",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.No, "center");
    setC(row.getCell(3), r.Uraian);
    setN(row.getCell(4), r.Nominal);
    setC(row.getCell(5), r.Account);
    setC(row.getCell(6), r.NamaAccount);
    setC(row.getCell(7), r.DetailCC);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 35;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BBM_Detail_${startDate}_sd_${endDate}.xlsx`);
};

export const exportJurnalUmum = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jurnal Umum");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Jurnal Umum";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tipe",
    "Tanggal",
    "Debet",
    "Kredit",
    "Keterangan",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tipe, "center");
    setC(row.getCell(3), r.Tanggal, "center");
    setN(row.getCell(4), r.Debet);
    setN(row.getCell(5), r.Kredit);
    setC(row.getCell(6), r.Keterangan);
    setC(row.getCell(7), r.Closed, "center");
    row.height = 16;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 30;
  ws.getColumn(7).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `JurnalUmum_${startDate}_sd_${endDate}.xlsx`);
};

export const exportJurnalUmumDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jurnal Umum Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Jurnal Umum";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Account",
    "Nama Account",
    "Detail CC",
    "Debet",
    "Kredit",
    "Uraian",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.Account);
    setC(row.getCell(3), r.NamaAccount);
    setC(row.getCell(4), r.DetailCC);
    setN(row.getCell(5), r.Debet);
    setN(row.getCell(6), r.Kredit);
    setC(row.getCell(7), r.Uraian);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 35;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `JurnalUmum_Detail_${startDate}_sd_${endDate}.xlsx`);
};

export const exportRekonsiliasiBank = async (items: any[], tanggal: string) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Rekonsiliasi Bank");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = "Rekonsiliasi Bank";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:E2");
  ws.getCell("A2").value = `Per Tanggal : ${tanggal}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = ["Kode", "Nama", "Saldo Buku", "Saldo Bank", "Status Rekon"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Kode);
    setC(row.getCell(2), r.Nama);
    setN(row.getCell(3), r.SaldoAkhir);
    setN(row.getCell(4), r.SaldoBank);
    setC(row.getCell(5), r.Rekon, "center");
    // Delphi: baris Rekon=Sudah warna biru
    if (r.Rekon === "Sudah") {
      for (let c = 1; c <= 5; c++)
        row.getCell(c).font = { size: 10, color: { argb: "FF1565C0" } };
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 35;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 14;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `RekonsiliasiBank_${tanggal}.xlsx`);
};

export const exportPengajuanTransfer = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pengajuan Transfer");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = "Pengajuan Transfer";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:F2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Account",
    "No. Rek Asal",
    "Nama Rekening",
    "Status",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.Account);
    setC(row.getCell(4), r.NoRekAsal);
    setC(row.getCell(5), r.NamaRekening);
    setC(row.getCell(6), r.Status_, "center");
    // Delphi: BELUM=merah, PROSES=biru, CLOSE=hitam
    const color =
      r.Status_ === "BELUM"
        ? "FFCC0000"
        : r.Status_ === "PROSES"
          ? "FF1565C0"
          : "FF212121";
    for (let c = 1; c <= 6; c++)
      row.getCell(c).font = { size: 10, color: { argb: color } };
    row.height = 16;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 16;
  ws.getColumn(5).width = 30;
  ws.getColumn(6).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `PengajuanTransfer_${startDate}_sd_${endDate}.xlsx`);
};

export const exportPengajuanTransferDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("PJT Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "Detail Pengajuan Transfer";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Nama Supplier",
    "Bank",
    "Atas Nama",
    "Rekening",
    "Nominal",
    "Keterangan",
    "Tgl Realisasi",
    "Jurnal",
    "Ket Batal",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.NamaSupplier);
    setC(row.getCell(3), r.Bank);
    setC(row.getCell(4), r.AtasNama);
    setC(row.getCell(5), r.Rekening);
    setN(row.getCell(6), r.Nominal);
    setC(row.getCell(7), r.Keterangan);
    setC(row.getCell(8), r.TglRealisasi || "", "center");
    setC(row.getCell(9), r.Jurnal || "");
    setC(row.getCell(10), r.KetBatal || "");
    // Delphi detail: KetBatal != "" → merah, TglRealisasi != "" → biru
    if (r.KetBatal) {
      for (let c = 1; c <= 10; c++)
        row.getCell(c).font = { size: 10, color: { argb: "FFCC0000" } };
    } else if (r.TglRealisasi) {
      for (let c = 1; c <= 10; c++)
        row.getCell(c).font = { size: 10, color: { argb: "FF1565C0" } };
    }
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 25;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 16;
  ws.getColumn(7).width = 25;
  ws.getColumn(8).width = 14;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `PengajuanTransfer_Detail_${startDate}_sd_${endDate}.xlsx`,
  );
};

// Export Excel per nomor — Delphi btnExcel (format khusus per transaksi)
export const exportPengajuanTransferExcel = async (
  nomor: string,
  tanggal: string,
  account: string,
  noRekAsal: string,
  namaRekening: string,
  detail: any[],
  userKode: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pengajuan Transfer");

  ws.getCell("A2").value = "Pengajuan Transfer";
  ws.getCell("A2").font = { bold: true, size: 12 };
  ws.getCell("A3").value = `Tanggal: ${tanggal}`;
  ws.getCell("A3").font = { bold: true };
  ws.getCell("A4").value = `Nomor: ${nomor}`;
  ws.getCell("A4").font = { bold: true };
  ws.getCell("A5").value =
    `Rekening Asal: (${account}) ${namaRekening} - ${noRekAsal}`;
  ws.getCell("A5").font = { bold: true };

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFF00" },
  };
  const colHeaders = [
    "NO",
    "Nama Supplier",
    "Nama Bank",
    "Atas Nama",
    "NO. Rekening",
    "Nominal",
    "Keterangan",
    "Tgl Realisasi",
  ];
  const hRow = ws.getRow(6);
  colHeaders.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = headerFill;
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  hRow.height = 18;

  detail.forEach((d, idx) => {
    const row = ws.getRow(7 + idx);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = d.NamaSupplier || "";
    row.getCell(3).value = d.Bank || "";
    row.getCell(4).value = d.AtasNama || "";
    row.getCell(5).value = d.Rekening || "";
    row.getCell(6).value = Number(d.Nominal) || 0;
    row.getCell(6).numFmt = "#,##0";
    row.getCell(7).value = d.Keterangan || "";
    row.getCell(8).value = d.TglRealisasi || "";
    for (let c = 1; c <= 8; c++)
      row.getCell(c).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    row.height = 16;
  });

  const totalRow = 7 + detail.length;
  ws.getRow(totalRow).getCell(1).value = "Total";
  ws.getRow(totalRow).getCell(1).font = { bold: true };
  const totalNominal = detail.reduce((s, d) => s + (Number(d.Nominal) || 0), 0);
  ws.getRow(totalRow).getCell(6).value = totalNominal;
  ws.getRow(totalRow).getCell(6).numFmt = "#,##0";
  ws.getRow(totalRow).getCell(6).font = { bold: true };

  const signRow = totalRow + 3;
  ws.getRow(signRow).getCell(2).value = "Dibuat Oleh,";
  ws.getRow(signRow + 4).getCell(2).value = `(${userKode})`;

  [2, 3, 4, 5, 6, 7, 8].forEach((c) => (ws.getColumn(c).width = 20));
  ws.getColumn(1).width = 4;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `PJT_${nomor}.xlsx`);
};

export const exportTerimaSetoran = async (
  items: any[],
  startDate: string,
  endDate: string,
  cabang: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Terima Setoran");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };

  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = `Terima Setoran Kasir — ${cabang}`;
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:E2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = ["Nomor", "Tgl Setor", "Tgl Verifikasi", "Created", "Verified"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.TglSetor, "center");
    setC(row.getCell(3), r.TglVerifikasi || "", "center");
    setC(row.getCell(4), r.Created, "center");
    setC(row.getCell(5), r.Verified, "center");
    // Delphi: Verified kosong → highlight merah
    if (!r.Verified) {
      for (let c = 1; c <= 5; c++) {
        row.getCell(c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFEBEE" },
        };
        row.getCell(c).font = {
          size: 10,
          color: { argb: "FFCC0000" },
          bold: true,
        };
      }
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 13;
  ws.getColumn(3).width = 15;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 12;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `TerimaSetoran_${startDate}_sd_${endDate}.xlsx`);
};

export const exportTerimaSetoranDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
  cabang: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Terima Setoran Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = `Detail Terima Setoran Kasir — ${cabang}`;
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:D2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = ["Nomor", "Jenis", "Nominal Setor", "Nominal Verifikasi"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.Jenis);
    setN(row.getCell(3), r.NominalSetor);
    setN(row.getCell(4), r.NominalVerifikasi);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 25;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 18;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `TerimaSetoran_Detail_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportPembayaranCustomer = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pembayaran Customer");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:L1");
  ws.getCell("A1").value = "Posting Pembayaran Customer";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:L2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tipe",
    "Account",
    "Nama Account",
    "Rekening",
    "Tanggal",
    "Diterima Dari",
    "Nota",
    "Keterangan",
    "Nominal",
    "Cabang",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tipe, "center");
    setC(row.getCell(3), r.Account);
    setC(row.getCell(4), r.NamaAccount);
    setC(row.getCell(5), r.Rekening);
    setC(row.getCell(6), r.Tanggal, "center");
    setC(row.getCell(7), r.DiterimaDari);
    setC(row.getCell(8), r.Nota);
    setC(row.getCell(9), r.Keterangan);
    setN(row.getCell(10), r.Nominal);
    setC(row.getCell(11), r.Cabang, "center");
    setC(row.getCell(12), r.Closed, "center");
    if (r.Closed === "Belum") {
      for (let c = 1; c <= 12; c++)
        row.getCell(c).font = {
          size: 10,
          color: { argb: "FFCC0000" },
          bold: true,
        };
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 20;
  ws.getColumn(8).width = 12;
  ws.getColumn(9).width = 30;
  ws.getColumn(10).width = 18;
  ws.getColumn(11).width = 10;
  ws.getColumn(12).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `PembayaranCustomer_${startDate}_sd_${endDate}.xlsx`);
};

export const exportPembayaranCustomerDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("PBC Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Posting Pembayaran Customer";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "No",
    "Uraian",
    "Nominal",
    "Account",
    "Nama Account",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.No, "center");
    setC(row.getCell(3), r.Uraian);
    setN(row.getCell(4), r.Nominal);
    setC(row.getCell(5), r.Account);
    setC(row.getCell(6), r.NamaAccount);
    setC(row.getCell(7), r.DetailCC);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 40;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `PembayaranCustomer_Detail_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportPembayaranCustKaosan = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pembayaran Cust Kaosan");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:N1");
  ws.getCell("A1").value = "Posting Pembayaran Customer Kaosan";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:N2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tipe",
    "Account",
    "Nama Account",
    "Rekening",
    "Tanggal",
    "Tgl Transfer",
    "Diterima Dari",
    "Nota",
    "Keterangan",
    "Nominal",
    "Cabang",
    "Customer",
    "Trs",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tipe, "center");
    setC(row.getCell(3), r.Account);
    setC(row.getCell(4), r.NamaAccount);
    setC(row.getCell(5), r.Rekening);
    setC(row.getCell(6), r.Tanggal, "center");
    setC(row.getCell(7), r.TglTransfer || "", "center");
    setC(row.getCell(8), r.DiterimaDari);
    setC(row.getCell(9), r.Nota);
    setC(row.getCell(10), r.Keterangan);
    setN(row.getCell(11), r.Nominal);
    setC(row.getCell(12), r.Cabang, "center");
    setC(row.getCell(13), r.Customer);
    setC(row.getCell(14), r.Trs, "center");
    row.height = 16;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 13;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 12;
  ws.getColumn(10).width = 30;
  ws.getColumn(11).width = 18;
  ws.getColumn(12).width = 8;
  ws.getColumn(13).width = 22;
  ws.getColumn(14).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `PembayaranCustKaosan_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportPembayaranCustKaosanDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("PBK Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Posting Pembayaran Customer Kaosan";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "No",
    "Uraian",
    "Nominal",
    "Account",
    "Nama Account",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.No, "center");
    setC(row.getCell(3), r.Uraian);
    setN(row.getCell(4), r.Nominal);
    setC(row.getCell(5), r.Account);
    setC(row.getCell(6), r.NamaAccount);
    setC(row.getCell(7), r.DetailCC);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 40;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `PembayaranCustKaosan_Detail_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportListJurnal = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("List Jurnal");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:K1");
  ws.getCell("A1").value = "List Jurnal";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:K2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Bulan",
    "Tahun",
    "Tanggal",
    "Nomor",
    "Referensi",
    "Account",
    "Nama Account",
    "Keterangan",
    "Debet",
    "Kredit",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totalDebet = 0;
  let totalKredit = 0;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Bulan, "center");
    setC(row.getCell(2), r.Tahun, "center");
    setC(row.getCell(3), r.Tanggal, "center");
    setC(row.getCell(4), r.Nomor);
    setC(row.getCell(5), r.Referensi);
    setC(row.getCell(6), r.Account);
    setC(row.getCell(7), r.AccountName);
    setC(row.getCell(8), r.Keterangan);
    setN(row.getCell(9), r.Debet);
    setN(row.getCell(10), r.Kredit);
    setC(row.getCell(11), r.DetailCC);
    totalDebet += Number(r.Debet) || 0;
    totalKredit += Number(r.Kredit) || 0;
    row.height = 16;
  }

  // Footer total
  const footRow = ws.addRow([]);
  const footCells = Array.from({ length: 11 }, (_, i) =>
    footRow.getCell(i + 1),
  );
  footCells.forEach((c) => {
    c.border = borderAll;
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8F5E9" },
    };
  });
  footRow.getCell(8).value = "TOTAL";
  footRow.getCell(8).font = { bold: true, size: 10 };
  footRow.getCell(8).alignment = { horizontal: "right" };
  footRow.getCell(9).value = totalDebet;
  footRow.getCell(9).numFmt = "#,##0";
  footRow.getCell(9).font = { bold: true, size: 10 };
  footRow.getCell(9).alignment = { horizontal: "right" };
  footRow.getCell(10).value = totalKredit;
  footRow.getCell(10).numFmt = "#,##0";
  footRow.getCell(10).font = { bold: true, size: 10 };
  footRow.getCell(10).alignment = { horizontal: "right" };

  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 22;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 28;
  ws.getColumn(8).width = 32;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 18;
  ws.getColumn(11).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `ListJurnal_${startDate}_sd_${endDate}.xlsx`);
};

export const exportListJurnalFromConfig = async (
  data: Record<string, any>[],
  rowFields: string[],
  colFields: string[],
  valField: string,
  aggregator: string,
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pivot");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  // ── Kumpulkan nilai unik per colField (hierarkis) ──────────────────
  // Buat composite key kolom: join nilai semua colFields
  const colKeySet = new Set<string>();
  const colKeyMap = new Map<string, Record<string, string>>(); // key → {field: value}
  for (const row of data) {
    const key = colFields.map((f) => String(row[f] ?? "")).join("|||");
    if (!colKeySet.has(key)) {
      colKeySet.add(key);
      const obj: Record<string, string> = {};
      colFields.forEach((f) => {
        obj[f] = String(row[f] ?? "");
      });
      colKeyMap.set(key, obj);
    }
  }
  const colKeys = [...colKeySet].sort();

  // ── Kumpulkan nilai unik per rowField (hierarkis) ─────────────────
  const rowKeySet = new Set<string>();
  const rowKeyMap = new Map<string, Record<string, string>>();
  for (const row of data) {
    const key = rowFields.map((f) => String(row[f] ?? "")).join("|||");
    if (!rowKeySet.has(key)) {
      rowKeySet.add(key);
      const obj: Record<string, string> = {};
      rowFields.forEach((f) => {
        obj[f] = String(row[f] ?? "");
      });
      rowKeyMap.set(key, obj);
    }
  }
  const rowKeys = [...rowKeySet].sort();

  // ── Agregasi ──────────────────────────────────────────────────────
  // map: rowKey → colKey → {sum, count}
  type AggVal = { sum: number; count: number };
  const aggMap = new Map<string, Map<string, AggVal>>();
  for (const d of data) {
    const rk = rowFields.map((f) => String(d[f] ?? "")).join("|||");
    const ck = colFields.map((f) => String(d[f] ?? "")).join("|||");
    if (!aggMap.has(rk)) aggMap.set(rk, new Map());
    const inner = aggMap.get(rk)!;
    const cur = inner.get(ck) || { sum: 0, count: 0 };
    cur.sum += Number(d[valField]) || 0;
    cur.count += 1;
    inner.set(ck, cur);
  }

  const getVal = (agg: AggVal | undefined): number => {
    if (!agg) return 0;
    if (aggregator === "Count") return agg.count;
    if (aggregator === "Average") return agg.count ? agg.sum / agg.count : 0;
    return agg.sum; // Sum (default)
  };

  // ── Tulis header info ──────────────────────────────────────────────
  const totalCols = rowFields.length + colKeys.length + 1;
  const endColLetter = String.fromCharCode(64 + Math.min(totalCols, 26));
  ws.mergeCells(`A1:${endColLetter}1`);
  ws.getCell("A1").value = `List Jurnal — Pivot (${aggregator} of ${valField})`;
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells(`A2:${endColLetter}2`);
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  // ── Tulis header kolom (satu baris per colField level) ────────────
  const headerStartRow = 4;

  // Untuk setiap level colField, tulis header dengan merge jika nilai berurutan sama
  colFields.forEach((field, levelIdx) => {
    const row = ws.getRow(headerStartRow + levelIdx);

    // Cells untuk rowFields (kiri atas, merge vertikal nanti)
    rowFields.forEach((rf, ri) => {
      if (levelIdx === 0) {
        // Tulis label rowField hanya di level pertama
        const cell = row.getCell(ri + 1);
        cell.value = rf;
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.border = borderAll;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        const cell = row.getCell(ri + 1);
        cell.fill = headerFill;
        cell.border = borderAll;
      }
    });

    // Tulis nilai colField per kolom data
    let mergeStart = rowFields.length + 1;
    let prevVal = "";
    colKeys.forEach((ck, ci) => {
      const val = colKeyMap.get(ck)?.[field] ?? "";
      const colIdx = rowFields.length + ci + 1;
      const cell = row.getCell(colIdx);
      cell.value = val;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.border = borderAll;
      cell.alignment = { vertical: "middle", horizontal: "center" };
      prevVal = val;
    });

    // Total header
    const totalCell = row.getCell(rowFields.length + colKeys.length + 1);
    if (levelIdx === 0) {
      totalCell.value = "Totals";
      totalCell.font = headerFont;
      totalCell.fill = headerFill;
      totalCell.border = borderAll;
      totalCell.alignment = { vertical: "middle", horizontal: "center" };
    } else {
      totalCell.fill = headerFill;
      totalCell.border = borderAll;
    }

    row.height = 18;
  });

  // ── Tulis data ──────────────────────────────────────────────────────
  let dataRowNum = headerStartRow + colFields.length;
  const colTotals = new Map<string, number>();
  let grandTotal = 0;

  for (const rk of rowKeys) {
    const row = ws.getRow(dataRowNum);
    const rowVals = rowKeyMap.get(rk)!;

    // Tulis nilai rowFields
    rowFields.forEach((rf, ri) => {
      const cell = row.getCell(ri + 1);
      cell.value = rowVals[rf] ?? "";
      cell.border = borderAll;
      cell.font = { size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    // Tulis nilai data per kolom
    let rowTotal = 0;
    colKeys.forEach((ck, ci) => {
      const agg = aggMap.get(rk)?.get(ck);
      const val = getVal(agg);
      const cell = row.getCell(rowFields.length + ci + 1);
      cell.value = val || 0;
      cell.border = borderAll;
      cell.font = { size: 10 };
      cell.numFmt = "#,##0";
      cell.alignment = { vertical: "middle", horizontal: "right" };
      rowTotal += val;
      colTotals.set(ck, (colTotals.get(ck) ?? 0) + val);
    });

    // Row total
    const totalCell = row.getCell(rowFields.length + colKeys.length + 1);
    totalCell.value = rowTotal;
    totalCell.border = borderAll;
    totalCell.font = { size: 10, bold: true };
    totalCell.numFmt = "#,##0";
    totalCell.alignment = { vertical: "middle", horizontal: "right" };
    grandTotal += rowTotal;

    row.height = 16;
    dataRowNum++;
  }

  // ── Totals row ──────────────────────────────────────────────────────
  const footRow = ws.getRow(dataRowNum);
  rowFields.forEach((_, ri) => {
    const cell = footRow.getCell(ri + 1);
    cell.value = ri === 0 ? "Totals" : "";
    cell.border = borderAll;
    cell.font = { bold: true, size: 10 };
    cell.fill = totalFill;
    cell.alignment = { horizontal: ri === 0 ? "left" : "center" };
  });

  colKeys.forEach((ck, ci) => {
    const cell = footRow.getCell(rowFields.length + ci + 1);
    cell.value = colTotals.get(ck) ?? 0;
    cell.border = borderAll;
    cell.font = { bold: true, size: 10 };
    cell.fill = totalFill;
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  });

  const gtCell = footRow.getCell(rowFields.length + colKeys.length + 1);
  gtCell.value = grandTotal;
  gtCell.border = borderAll;
  gtCell.font = { bold: true, size: 10 };
  gtCell.fill = totalFill;
  gtCell.numFmt = "#,##0";
  gtCell.alignment = { vertical: "middle", horizontal: "right" };
  footRow.height = 18;

  // ── Column widths ──────────────────────────────────────────────────
  rowFields.forEach((_, i) => {
    ws.getColumn(i + 1).width = 28;
  });
  colKeys.forEach((_, i) => {
    ws.getColumn(rowFields.length + i + 1).width = 14;
  });
  ws.getColumn(rowFields.length + colKeys.length + 1).width = 16;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `ListJurnal_Pivot_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBukuBesar = async (
  items: any[],
  rekkode: string,
  reknama: string,
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Buku Besar");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const saldoAwalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF9C4" },
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  // ── Header info ──
  ws.mergeCells("A1:L1");
  ws.getCell("A1").value = "Buku Besar";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:L2");
  ws.getCell("A2").value = `Account : (${rekkode}) ${reknama}`;
  ws.getCell("A2").font = { size: 10 };
  ws.mergeCells("A3:L3");
  ws.getCell("A3").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A3").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Tanggal",
    "Nomor",
    "Trs",
    "Nota",
    "Penerima",
    "Keterangan",
    "Debet",
    "Kredit",
    "Saldo",
    "Account",
    "Nama Account",
    "Tgl Transfer",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totalDebet = 0;
  let totalKredit = 0;

  for (const r of items) {
    const row = ws.addRow([]);
    const isSaldoAwal = r.Keterangan === "Saldo Awal";

    setC(row.getCell(1), r.Tanggal, "center");
    setC(row.getCell(2), r.Nomor);
    setC(row.getCell(3), r.Trs, "center");
    setC(row.getCell(4), r.Nota);
    setC(row.getCell(5), r.Penerima);
    setC(row.getCell(6), r.Keterangan, "left", isSaldoAwal);
    setN(row.getCell(7), r.Debet);
    setN(row.getCell(8), r.Kredit);
    setN(row.getCell(9), r.Saldo, true);
    setC(row.getCell(10), r.Account);
    setC(row.getCell(11), r.NamaAccount);
    setC(row.getCell(12), r.TglTransfer || "", "center");

    if (isSaldoAwal) {
      for (let c = 1; c <= 12; c++) {
        row.getCell(c).fill = saldoAwalFill;
      }
    }

    if (!isSaldoAwal) {
      totalDebet += Number(r.Debet) || 0;
      totalKredit += Number(r.Kredit) || 0;
    }
    row.height = 16;
  }

  // Footer total
  const footRow = ws.addRow([]);
  for (let c = 1; c <= 12; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(6), "TOTAL", "right", true);
  setN(footRow.getCell(7), totalDebet, true);
  setN(footRow.getCell(8), totalKredit, true);
  const lastSaldo = items.length > 0 ? items[items.length - 1].Saldo : 0;
  setN(footRow.getCell(9), lastSaldo, true);
  footRow.height = 18;

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 35;
  ws.getColumn(7).width = 18;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 10;
  ws.getColumn(11).width = 30;
  ws.getColumn(12).width = 13;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `BukuBesar_${rekkode}_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportKasbonBelumSelesai = async (
  items: any[],
  rekkode: string,
  reknama: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Kasbon Belum Selesai");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "Kasbon Belum Selesai";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = `Account : (${rekkode}) ${reknama}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Jenis",
    "Pjh",
    "Nota",
    "Penerima",
    "Nominal",
    "Keterangan",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totalNominal = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.Jenis, "center");
    setC(row.getCell(4), r.Pjh);
    setC(row.getCell(5), r.Nota);
    setC(row.getCell(6), r.Penerima);
    setN(row.getCell(7), r.Nominal);
    setC(row.getCell(8), r.Keterangan);
    totalNominal += Number(r.Nominal) || 0;
    row.height = 16;
  }

  const footRow = ws.addRow([]);
  for (let c = 1; c <= 8; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(6), "TOTAL", "right", true);
  setN(footRow.getCell(7), totalNominal, true);
  footRow.height = 18;

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 16;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 16;
  ws.getColumn(7).width = 16;
  ws.getColumn(8).width = 35;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `KasbonBelumSelesai_${rekkode}.xlsx`);
};

export const exportKasbonBelumSelesaiDetail = async (
  items: any[],
  rekkode: string,
  reknama: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Detail Kasbon");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B5E20" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "Detail Kasbon Belum Selesai";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = `Account : (${rekkode}) ${reknama}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Uraian",
    "Satuan",
    "Qty",
    "Nominal",
    "Total",
    "Kegunaan",
    "Keterangan",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totalNominal = 0;
  let totalTotal = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Uraian);
    setC(row.getCell(3), r.Satuan, "center");
    setN(row.getCell(4), r.Qty);
    setN(row.getCell(5), r.Nominal);
    setN(row.getCell(6), r.Total);
    setC(row.getCell(7), r.Kegunaan);
    setC(row.getCell(8), r.Keterangan);
    totalNominal += Number(r.Nominal) || 0;
    totalTotal += Number(r.Total) || 0;
    row.height = 16;
  }

  const footRow = ws.addRow([]);
  for (let c = 1; c <= 8; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(4), "TOTAL", "right", true);
  setN(footRow.getCell(5), totalNominal, true);
  setN(footRow.getCell(6), totalTotal, true);
  footRow.height = 18;

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 35;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 20;
  ws.getColumn(8).width = 16;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `KasbonBelumSelesai_Detail_${rekkode}.xlsx`);
};

export const exportRekonsiliasiBankMaster = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Rekonsiliasi Bank");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const subHeaderFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B5E20" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };
  const selisihNolFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0FDF4" },
  };
  const selisihAdaFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF3E0" },
  };

  const setH = (cell: ExcelJS.Cell, val: string, fill = headerFill) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = fill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (
    cell: ExcelJS.Cell,
    val: number,
    bold = false,
    color?: string,
  ) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold, color: color ? { argb: color } : undefined };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  // ── Info header ──
  ws.mergeCells("A1:L1");
  ws.getCell("A1").value = "Laporan Rekonsiliasi Bank";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:L2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  // ── Header row 1 (group) ──
  const row4 = ws.getRow(4);
  setH(row4.getCell(1), "Tanggal");
  setH(row4.getCell(2), "Account");
  setH(row4.getCell(3), "Nama");
  ws.mergeCells(4, 4, 4, 7);
  setH(row4.getCell(4), "BUKU");
  ws.mergeCells(4, 8, 4, 11);
  setH(row4.getCell(8), "BANK", subHeaderFill);
  setH(row4.getCell(12), "Selisih");
  row4.height = 20;

  // ── Header row 2 (sub) ──
  const row5 = ws.getRow(5);
  setH(row5.getCell(1), "");
  setH(row5.getCell(2), "");
  setH(row5.getCell(3), "");
  setH(row5.getCell(4), "Saldo Buku");
  setH(row5.getCell(5), "Tambah");
  setH(row5.getCell(6), "Kurang");
  setH(row5.getCell(7), "Saldo Akhir");
  setH(row5.getCell(8), "Saldo Bank", subHeaderFill);
  setH(row5.getCell(9), "Tambah_", subHeaderFill);
  setH(row5.getCell(10), "Kurang_", subHeaderFill);
  setH(row5.getCell(11), "Saldo Akhir", subHeaderFill);
  setH(row5.getCell(12), "");
  row5.height = 18;

  // ── Data rows ──
  let totSaldoBuku = 0,
    totTambah = 0,
    totKurang = 0,
    totBuku = 0;
  let totSaldoBank = 0,
    totTambah_ = 0,
    totKurang_ = 0,
    totBank = 0;
  let totSelisih = 0;

  let dataRowNum = 6;
  for (const r of items) {
    const row = ws.getRow(dataRowNum);
    setC(row.getCell(1), r.Tanggal, "center");
    setC(row.getCell(2), r.Account);
    setC(row.getCell(3), r.Nama);
    setN(row.getCell(4), r.SaldoBuku);
    setN(row.getCell(5), r.Tambah);
    setN(row.getCell(6), r.Kurang);
    setN(row.getCell(7), r.Buku, true);
    setN(row.getCell(8), r.SaldoBank);
    setN(row.getCell(9), r.Tambah_);
    setN(row.getCell(10), r.Kurang_);
    setN(row.getCell(11), r.Bank, true);
    setN(
      row.getCell(12),
      r.Selisih,
      true,
      Number(r.Selisih) !== 0 ? "FFCC3300" : undefined,
    );

    // Warna baris berdasarkan selisih
    const rowFill = Number(r.Selisih) === 0 ? selisihNolFill : selisihAdaFill;
    for (let c = 1; c <= 12; c++) {
      if (
        !row.getCell(c).fill ||
        (row.getCell(c).fill as any).fgColor?.argb === "FFFFFFFF"
      ) {
        row.getCell(c).fill = rowFill;
      }
    }

    totSaldoBuku += Number(r.SaldoBuku);
    totTambah += Number(r.Tambah);
    totKurang += Number(r.Kurang);
    totBuku += Number(r.Buku);
    totSaldoBank += Number(r.SaldoBank);
    totTambah_ += Number(r.Tambah_);
    totKurang_ += Number(r.Kurang_);
    totBank += Number(r.Bank);
    totSelisih += Number(r.Selisih);
    row.height = 16;
    dataRowNum++;
  }

  // ── Footer total ──
  const footRow = ws.getRow(dataRowNum);
  for (let c = 1; c <= 12; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(3), "TOTAL", "right", true);
  setN(footRow.getCell(4), totSaldoBuku, true);
  setN(footRow.getCell(5), totTambah, true);
  setN(footRow.getCell(6), totKurang, true);
  setN(footRow.getCell(7), totBuku, true);
  setN(footRow.getCell(8), totSaldoBank, true);
  setN(footRow.getCell(9), totTambah_, true);
  setN(footRow.getCell(10), totKurang_, true);
  setN(footRow.getCell(11), totBank, true);
  setN(
    footRow.getCell(12),
    totSelisih,
    true,
    totSelisih !== 0 ? "FFCC3300" : undefined,
  );
  footRow.height = 18;

  // ── Column widths ──
  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 16;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 16;
  ws.getColumn(8).width = 16;
  ws.getColumn(9).width = 14;
  ws.getColumn(10).width = 14;
  ws.getColumn(11).width = 16;
  ws.getColumn(12).width = 14;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `RekonsiliasiBankMaster_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportRekonsiliasiBankDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Detail Rekonsiliasi");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B5E20" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Rekonsiliasi Bank";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Tanggal",
    "Account",
    "Nama",
    "Jenis",
    "Nomor",
    "Keterangan",
    "Nominal",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let total = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Tanggal, "center");
    setC(row.getCell(2), r.Account);
    setC(row.getCell(3), r.Nama);
    setC(row.getCell(4), r.Jenis, "center");
    setC(row.getCell(5), r.Nomor);
    setC(row.getCell(6), r.Keterangan);
    setN(row.getCell(7), r.Nominal);
    total += Number(r.Nominal) || 0;
    row.height = 16;
  }

  const footRow = ws.addRow([]);
  for (let c = 1; c <= 7; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(6), "TOTAL", "right", true);
  setN(footRow.getCell(7), total, true);
  footRow.height = 18;

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 30;
  ws.getColumn(7).width = 16;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `RekonsiliasiBankDetail_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportStokFinance = async (items: any[], cabang: string) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Stok Finance");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };
  const realNegFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF3E0" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (
    cell: ExcelJS.Cell,
    val: number,
    bold = false,
    color?: string,
  ) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold, color: color ? { argb: color } : undefined };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = `Stok Finance — Cabang ${cabang}`;
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.addRow([]);

  const cols = ["Jenis", "Kode", "Nama", "Satuan", "Stok", "Mutasi", "REAL"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totStok = 0,
    totMutasi = 0,
    totReal = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Jenis, "center");
    setC(row.getCell(2), r.Kode);
    setC(row.getCell(3), r.Nama);
    setC(row.getCell(4), r.Satuan, "center");
    setN(row.getCell(5), r.Stok);
    setN(row.getCell(6), r.Mutasi);
    setN(
      row.getCell(7),
      r.REAL_,
      true,
      Number(r.REAL_) < 0 ? "FFCC3300" : undefined,
    );
    if (Number(r.REAL_) < 0) {
      for (let c = 1; c <= 7; c++) row.getCell(c).fill = realNegFill;
    }
    totStok += Number(r.Stok);
    totMutasi += Number(r.Mutasi);
    totReal += Number(r.REAL_);
    row.height = 16;
  }

  const footRow = ws.addRow([]);
  for (let c = 1; c <= 7; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(3), "TOTAL", "right", true);
  setN(footRow.getCell(5), totStok, true);
  setN(footRow.getCell(6), totMutasi, true);
  setN(footRow.getCell(7), totReal, true, totReal < 0 ? "FFCC3300" : undefined);
  footRow.height = 18;

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 40;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 12;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `StokFinance_${cabang}.xlsx`);
};
