import $ from "jquery";

if (!($ as any).isFunction) {
  ($ as any).isFunction = (obj: any) => typeof obj === "function";
}
if (!($ as any).isArray) {
  ($ as any).isArray = Array.isArray;
}

// Pakai path eksplisit ke file, bukan package entry
import "jquery-ui-dist/jquery-ui";
import "pivottable";

export const initPivot = async () => Promise.resolve();
export const jQuery = $;
