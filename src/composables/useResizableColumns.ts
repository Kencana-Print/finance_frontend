import { ref, onBeforeUnmount } from "vue";

export function useResizableColumns(storageKey?: string) {
  const widths = ref<Record<string, number>>({});
  const colRefs: Record<string, HTMLElement | null> = {};

  if (storageKey) {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        widths.value = JSON.parse(saved);
      } catch {
        /* ignore */
      }
    }
  }

  let resizingKey: string | null = null;
  let startX = 0;
  let startWidth = 0;
  let pendingWidth = 0;
  let rafId: number | null = null;

  const persist = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(widths.value));
    }
  };

  // Dipanggil dari :ref di <col> — simpan elemen DOM-nya, bukan lewat reactive state
  const setColRef = (key: string, el: Element | null) => {
    colRefs[key] = el as HTMLElement | null;
  };

  const applyWidth = () => {
    rafId = null;
    if (!resizingKey) return;
    const el = colRefs[resizingKey];
    if (el) el.style.width = pendingWidth + "px";
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingKey) return;
    const delta = e.clientX - startX;
    pendingWidth = Math.max(40, startWidth + delta); // min 40px
    // Throttle ke max 1x per frame, dan langsung ke DOM (tidak lewat Vue reactive)
    if (rafId === null) {
      rafId = requestAnimationFrame(applyWidth);
    }
  };

  const onMouseUp = () => {
    if (resizingKey) {
      // Commit ke reactive state SEKALI di akhir drag → 1 re-render, bukan ratusan
      widths.value = { ...widths.value, [resizingKey]: pendingWidth };
      persist();
    }
    resizingKey = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const startResize = (key: string, e: MouseEvent, currentWidth: number) => {
    resizingKey = key;
    startX = e.clientX;
    startWidth = widths.value[key] ?? currentWidth;
    pendingWidth = startWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  onBeforeUnmount(() => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    if (rafId !== null) cancelAnimationFrame(rafId);
  });

  return { widths, startResize, setColRef };
}
