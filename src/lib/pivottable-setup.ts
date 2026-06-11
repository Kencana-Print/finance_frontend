// pivottable-setup.ts
import $ from "jquery";

if (!($ as any).isFunction) {
  ($ as any).isFunction = (obj: any) => typeof obj === "function";
}
if (!($ as any).isArray) {
  ($ as any).isArray = Array.isArray;
}

// Static import — Vite pre-bundle semuanya jadi satu chunk
import "jquery-ui-dist/jquery-ui.js";
import "pivottable";

export const initPivot = async () => Promise.resolve();
export const jQuery = $;
