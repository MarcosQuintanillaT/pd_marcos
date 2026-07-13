"use client";

import { useEffect, useState } from "react";
import {
  Download,
  FileCode2,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Maximize2,
  X,
} from "lucide-react";
import { getFileKind } from "@/lib/file-types";

type FileViewerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  filePath: string;
  url?: string | null;
  downloadUrl?: string | null;
};

const HTML_PREVIEW_CSP =
  "default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:; media-src data: blob:; object-src 'none'; frame-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'";

function isolateHtmlPreview(source: string) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${HTML_PREVIEW_CSP}">`;
  const head = source.match(/<head(?:\s[^>]*)?>/i);
  if (!head || head.index === undefined) return `${meta}${source}`;

  const insertionPoint = head.index + head[0].length;
  return `${source.slice(0, insertionPoint)}${meta}${source.slice(insertionPoint)}`;
}

export function FileViewer({
  open,
  onClose,
  title,
  filePath,
  url,
  downloadUrl,
}: FileViewerProps) {
  const kind = getFileKind(filePath);
  const [htmlPreview, setHtmlPreview] = useState({
    url: "",
    source: "",
    error: "",
  });
  const [imageErrorUrl, setImageErrorUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || kind !== "html" || !url || htmlPreview.url === url) return;

    const controller = new AbortController();

    void fetch(url, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo obtener el archivo HTML");
        return response.text();
      })
      .then((source) => setHtmlPreview({ url, source, error: "" }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHtmlPreview({
          url,
          source: "",
          error: "No fue posible cargar la vista previa del archivo HTML.",
        });
      });

    return () => controller.abort();
  }, [htmlPreview.url, kind, open, url]);

  if (!open) return null;

  const htmlLoading =
    kind === "html" && Boolean(url) && htmlPreview.url !== url;
  const htmlSource = htmlPreview.url === url ? htmlPreview.source : "";
  const isolatedHtmlSource = htmlSource ? isolateHtmlPreview(htmlSource) : "";
  const previewError =
    kind === "image" && imageErrorUrl === url
      ? "No fue posible cargar la vista previa de la imagen."
      : kind === "html" && htmlPreview.url === url
        ? htmlPreview.error
        : "";

  const ViewerIcon =
    kind === "image" ? ImageIcon : kind === "html" ? FileCode2 : FileText;
  const viewerLabel =
    kind === "pdf"
      ? "Visor PDF protegido"
      : kind === "image"
        ? "Visor de imagen protegido"
        : kind === "html"
          ? "Visor HTML protegido"
          : "Vista protegida";

  const fallback = (
    <div className="grid h-full min-h-[70dvh] place-items-center p-6 text-center">
      <div>
        <Maximize2 className="mx-auto mb-4 text-[#9a7a49]" size={38} />
        <h3 className="font-bold text-[#294740]">Vista previa no disponible</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#6f7e79]">
          {previewError ||
            "No fue posible mostrar este archivo. Puedes descargarlo para abrirlo en tu dispositivo."}
        </p>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-[#0b211e]/92 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Visor de ${title}`}
    >
      <header className="mx-auto flex w-full max-w-7xl items-center gap-3 rounded-t-2xl bg-[#fffdf8] px-4 py-3 sm:px-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#efe2cb] text-[#a36c29]">
          <ViewerIcon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#24413c]">{title}</p>
          <p className="text-[10px] uppercase tracking-wider text-[#81908b]">
            {viewerLabel}
          </p>
        </div>
        {downloadUrl && (
          <a
            href={downloadUrl}
            aria-label="Descargar archivo"
            className="flex size-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#dedbd0] text-xs font-bold text-[#34544e] hover:bg-[#f1eee5] sm:w-auto sm:px-3"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Descargar</span>
          </a>
        )}
        <button
          onClick={onClose}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#123b35] text-white"
          aria-label="Cerrar visor"
        >
          <X size={19} />
        </button>
      </header>
      <div className="mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-hidden rounded-b-2xl bg-[#e5e3dd]">
        {!url || previewError ? (
          fallback
        ) : kind === "pdf" ? (
          <iframe
            src={`${url}#toolbar=1&navpanes=0&view=FitH`}
            title={title}
            className="h-full min-h-[70dvh] w-full border-0"
          />
        ) : kind === "image" ? (
          <div className="grid h-full min-h-[70dvh] place-items-center overflow-auto bg-[#262d2b] p-3 sm:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={title}
              onError={() => setImageErrorUrl(url)}
              className="max-h-[calc(100dvh-9rem)] max-w-full object-contain"
            />
          </div>
        ) : kind === "html" ? (
          htmlLoading ? (
            <div className="grid h-full min-h-[70dvh] place-items-center text-[#526762]">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <LoaderCircle size={18} className="animate-spin" />
                Preparando vista HTML…
              </span>
            </div>
          ) : htmlSource ? (
            <iframe
              srcDoc={isolatedHtmlSource}
              sandbox=""
              referrerPolicy="no-referrer"
              title={title}
              className="h-full min-h-[70dvh] w-full border-0 bg-white"
            />
          ) : (
            fallback
          )
        ) : (
          fallback
        )}
      </div>
    </div>
  );
}
