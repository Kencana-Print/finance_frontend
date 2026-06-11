import $ from "jquery";

if (!($ as any).isFunction) {
  ($ as any).isFunction = (obj: any) => typeof obj === "function";
}
if (!($ as any).isArray) {
  ($ as any).isArray = Array.isArray;
}

let pivotLoaded = false;

export const initPivot = async () => {
  if (pivotLoaded) return;

  // Pastikan jQuery UI ter-load SEBELUM pivottable
  // dan tunggu tiap step selesai
  await import("jquery-ui-dist/jquery-ui.js");

  // Verifikasi sortable sudah ada sebelum lanjut
  if (!($ as any).fn?.sortable) {
    console.warn("jQuery UI sortable not loaded, retrying...");
    await new Promise((r) => setTimeout(r, 100));
  }

  await import("pivottable");
  pivotLoaded = true;
};

export const jQuery = $;
