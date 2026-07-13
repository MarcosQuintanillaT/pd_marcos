"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Minus,
  Plus,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type MobilePdfViewerProps = {
  url: string;
  title: string;
};

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.75;
const ZOOM_STEP = 0.25;

export function MobilePdfViewer({ url, title }: MobilePdfViewerProps) {
  const sizeContainer = useRef<HTMLDivElement>(null);
  const pageContainer = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(320);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const container = sizeContainer.current;
    if (!container) return;

    const updateWidth = () => {
      setContainerWidth(Math.max(240, Math.floor(container.clientWidth - 24)));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    pageContainer.current?.scrollTo({ top: 0, left: 0 });
  }, [pageNumber]);

  const renderedWidth = Math.round(containerWidth * zoom);

  return (
    <div ref={sizeContainer} className="flex h-full min-h-[70dvh] flex-col bg-[#d9d8d3]">
      <div className="flex min-h-14 shrink-0 items-center justify-between gap-0.5 border-b border-white/10 bg-[#263d38] px-1 text-white sm:gap-1 sm:px-2">
        <button
          type="button"
          onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
          disabled={pageNumber <= 1}
          className="grid size-10 touch-manipulation place-items-center rounded-xl transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 sm:size-11"
          aria-label="Página anterior"
        >
          <ChevronLeft size={21} aria-hidden="true" />
        </button>

        <p className="min-w-[3.25rem] text-center text-xs font-bold tabular-nums sm:min-w-[5.5rem]" aria-live="polite">
          {pageCount ? `${pageNumber} / ${pageCount}` : "Cargando…"}
        </p>

        <button
          type="button"
          onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))}
          disabled={!pageCount || pageNumber >= pageCount}
          className="grid size-10 touch-manipulation place-items-center rounded-xl transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 sm:size-11"
          aria-label="Página siguiente"
        >
          <ChevronRight size={21} aria-hidden="true" />
        </button>

        <span className="mx-0.5 h-7 w-px bg-white/15 sm:mx-1" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP))}
          disabled={zoom <= MIN_ZOOM}
          className="grid size-10 touch-manipulation place-items-center rounded-xl transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 sm:size-11"
          aria-label="Alejar PDF"
        >
          <Minus size={19} aria-hidden="true" />
        </button>
        <span className="hidden min-w-8 text-center text-[11px] font-bold tabular-nums min-[360px]:block sm:min-w-9">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP))}
          disabled={zoom >= MAX_ZOOM}
          className="grid size-10 touch-manipulation place-items-center rounded-xl transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 sm:size-11"
          aria-label="Acercar PDF"
        >
          <Plus size={19} aria-hidden="true" />
        </button>
      </div>

      <div
        ref={pageContainer}
        className="min-h-0 flex-1 overflow-auto overscroll-contain p-3"
      >
        {error ? (
          <div className="grid min-h-full place-items-center px-5 py-10 text-center">
            <div>
              <p className="font-bold text-[#294740]">No se pudo mostrar el PDF</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#5d706a]">
                {error} Puedes usar el botón Descargar y abrirlo en tu dispositivo.
              </p>
            </div>
          </div>
        ) : (
          <Document
            key={url}
            file={url}
            onLoadSuccess={({ numPages }: { numPages: number }) => {
              setPageCount(numPages);
              setPageNumber((current) => Math.min(current, numPages));
              setError("");
            }}
            onLoadError={() => {
              setPageCount(0);
              setError("La vista previa móvil no pudo cargar el documento.");
            }}
            loading={
              <div className="grid min-h-[60dvh] place-items-center text-[#405f58]" role="status">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
                  Preparando PDF…
                </span>
              </div>
            }
            error={null}
            className="mx-auto flex min-h-full w-max items-start justify-center"
          >
            {pageCount > 0 && (
              <Page
                pageNumber={pageNumber}
                width={renderedWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                loading={
                  <div className="grid min-h-[60dvh] place-items-center text-[#405f58]" role="status">
                    <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
                  </div>
                }
                onRenderError={() =>
                  setError("No fue posible dibujar esta página del documento.")
                }
                canvasRef={(canvas) => {
                  if (canvas) canvas.setAttribute("aria-label", `${title}, página ${pageNumber}`);
                }}
                className="overflow-hidden rounded-sm bg-white shadow-[0_10px_30px_rgba(20,35,31,.25)]"
              />
            )}
          </Document>
        )}
      </div>
    </div>
  );
}
