import { onMounted, onUnmounted, nextTick, type Ref } from "vue";

/**
 * Composable resize kolom untuk tabel custom di FormView (mis. grid Rincian Barang).
 * Pakai di FormView mana pun yang punya tabel dengan <th> berlabel kolom.
 *
 * Penggunaan:
 *   const tableWrapRef = ref<HTMLElement | null>(null);
 *   useTableColumnResize(tableWrapRef);
 *   <div ref="tableWrapRef"><table class="gt">...</table></div>
 *
 * Tambahkan CSS: th { position: relative; } (biasanya sudah ada di tabel grid).
 */
export function useTableColumnResize(
  containerRef: Ref<HTMLElement | null>,
  options: { tableSelector?: string } = {},
) {
  const tableSelector = options.tableSelector ?? "table";
  let observer: MutationObserver | null = null;

  const attach = () => {
    if (!containerRef.value) return;
    const table = containerRef.value.querySelector(
      tableSelector,
    ) as HTMLElement | null;
    if (!table) return;

    const ths = table.querySelectorAll("th");
    ths.forEach((th) => {
      const thEl = th as HTMLElement;
      if (thEl.querySelector(".col-resize-handle-form")) return;

      thEl.style.position = "relative";

      const handle = document.createElement("div");
      handle.className = "col-resize-handle-form";
      thEl.appendChild(handle);

      handle.addEventListener("mousedown", (e: Event) => {
        const me = e as MouseEvent;
        me.preventDefault();
        me.stopPropagation();
        const startX = me.clientX;
        const startW = thEl.getBoundingClientRect().width;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        const onMove = (ev: MouseEvent) => {
          const newW = Math.max(40, startW + (ev.clientX - startX));
          thEl.style.width = `${newW}px`;
          thEl.style.minWidth = `${newW}px`;
          thEl.style.maxWidth = `${newW}px`;
        };
        const onUp = () => {
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });
    });
  };

  onMounted(async () => {
    await nextTick();
    attach();

    if (containerRef.value) {
      observer = new MutationObserver(() => attach());
      observer.observe(containerRef.value, { childList: true, subtree: true });
    }
  });

  onUnmounted(() => {
    if (observer) observer.disconnect();
  });

  return { reattach: attach };
}
