// pivottable-setup.ts
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
  await import("jquery-ui-dist/jquery-ui.js");
  await import("pivottable");
  pivotLoaded = true;
};

export const jQuery = $;
