import $ from "jquery";

(window as any).jQuery = $;
(window as any).$ = $;

// Patch method jQuery lama yang dihapus di versi 3.3+
if (!($ as any).isFunction) {
  ($ as any).isFunction = (obj: any) => typeof obj === "function";
}
if (!($ as any).isArray) {
  ($ as any).isArray = Array.isArray;
}

let pivotLoaded = false;

export const initPivot = async () => {
  if (pivotLoaded) return;
  // Load jquery-ui dulu sebelum pivottable
  await import("jquery-ui-dist/jquery-ui.js");
  await import("pivottable");
  pivotLoaded = true;
};

export const jQuery = $;
