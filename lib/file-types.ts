export const FILE_INPUT_ACCEPT = [
  "application/pdf",
  ".pdf",
  "text/html",
  ".html",
  ".htm",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "video/mp4",
  ".mp4",
  "video/webm",
  ".webm",
].join(",");

export const MAX_STANDARD_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_FILE_BYTES = 50 * 1024 * 1024;
/** Máximo absoluto del bucket privado. */
export const MAX_CLIENT_FILE_BYTES = MAX_VIDEO_FILE_BYTES;

export type SupportedFileKind = "pdf" | "image" | "html" | "video" | "unknown";

export type PortfolioFileDescription = {
  kind: Exclude<SupportedFileKind, "unknown">;
  extension: string;
  contentType: string;
};

const FILE_TYPES: Record<string, PortfolioFileDescription> = {
  pdf: { kind: "pdf", extension: "pdf", contentType: "application/pdf" },
  html: { kind: "html", extension: "html", contentType: "text/html" },
  htm: { kind: "html", extension: "html", contentType: "text/html" },
  png: { kind: "image", extension: "png", contentType: "image/png" },
  jpg: { kind: "image", extension: "jpg", contentType: "image/jpeg" },
  jpeg: { kind: "image", extension: "jpg", contentType: "image/jpeg" },
  jfif: { kind: "image", extension: "jpg", contentType: "image/jpeg" },
  webp: { kind: "image", extension: "webp", contentType: "image/webp" },
  gif: { kind: "image", extension: "gif", contentType: "image/gif" },
  avif: { kind: "image", extension: "avif", contentType: "image/avif" },
  bmp: { kind: "image", extension: "bmp", contentType: "image/bmp" },
  tif: { kind: "image", extension: "tiff", contentType: "image/tiff" },
  tiff: { kind: "image", extension: "tiff", contentType: "image/tiff" },
  ico: { kind: "image", extension: "ico", contentType: "image/vnd.microsoft.icon" },
  mp4: { kind: "video", extension: "mp4", contentType: "video/mp4" },
  webm: { kind: "video", extension: "webm", contentType: "video/webm" },
};

const MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "text/html": "html",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/vnd.microsoft.icon": "ico",
  "image/x-icon": "ico",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function normalizeMimeType(value?: string | null) {
  return String(value ?? "").split(";", 1)[0].trim().toLowerCase();
}

export function getFileExtension(path: string) {
  const cleanPath = String(path ?? "").split(/[?#]/, 1)[0].replace(/\\/g, "/");
  const fileName = cleanPath.slice(cleanPath.lastIndexOf("/") + 1);
  return fileName.match(/\.([a-z0-9]{1,10})$/i)?.[1].toLowerCase() ?? "";
}

export function getFileKind(pathOrName: string, mimeType?: string | null): SupportedFileKind {
  const extension = MIME_TO_EXTENSION[normalizeMimeType(mimeType)] ?? getFileExtension(pathOrName);
  return FILE_TYPES[extension]?.kind ?? "unknown";
}

export function describePortfolioFile(file: Pick<File, "name" | "type">): PortfolioFileDescription | null {
  const extension = getFileExtension(file.name);
  const mime = normalizeMimeType(file.type);
  const byMime = MIME_TO_EXTENSION[mime] ? FILE_TYPES[MIME_TO_EXTENSION[mime]] : null;
  const byExtension = FILE_TYPES[extension] ?? null;

  if (!byMime && !byExtension) return null;
  if (byMime && byExtension && byMime.kind !== byExtension.kind) return null;
  if (byMime && byExtension && byMime.contentType !== byExtension.contentType) {
    const bothJpeg = byMime.contentType === "image/jpeg" && byExtension.contentType === "image/jpeg";
    if (!bothJpeg) return null;
  }
  return byMime ?? byExtension;
}

export function maximumFileBytes(file: Pick<File, "name" | "type">) {
  return describePortfolioFile(file)?.kind === "video"
    ? MAX_VIDEO_FILE_BYTES
    : MAX_STANDARD_FILE_BYTES;
}

export function validatePortfolioFile(file: File, maxBytes?: number) {
  if (!file || file.size === 0) return "Selecciona un archivo válido";
  const description = describePortfolioFile(file);
  if (!description) {
    return "Formato no permitido. Usa PDF, HTML, PNG, JPG, WebP, GIF, AVIF, BMP, TIFF, ICO, MP4 o WebM";
  }
  const limit = maxBytes ?? maximumFileBytes(file);
  if (file.size > limit) {
    return `El archivo supera el límite de ${Math.round(limit / 1024 / 1024)} MB`;
  }
  return null;
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

/** Verifica el contenido real; no confía únicamente en extensión o MIME. */
export function validateFileSignature(
  input: ArrayBuffer | Uint8Array,
  description: PortfolioFileDescription,
) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 4) return false;

  switch (description.extension) {
    case "pdf":
      return ascii(bytes, 0, 5) === "%PDF-";
    case "png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "jpg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "gif":
      return ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a";
    case "webp":
      return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP";
    case "bmp":
      return ascii(bytes, 0, 2) === "BM";
    case "tiff":
      return startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a]);
    case "ico":
      return startsWith(bytes, [0x00, 0x00, 0x01, 0x00]);
    case "avif": {
      const brand = ascii(bytes, 4, 12);
      return brand.startsWith("ftyp") && /avif|avis/.test(ascii(bytes, 8, Math.min(bytes.length, 32)));
    }
    case "mp4":
      return ascii(bytes, 4, 8) === "ftyp";
    case "webm":
      return startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
    case "html": {
      const source = new TextDecoder("utf-8", { fatal: false })
        .decode(bytes.slice(0, 8192))
        .replace(/^\uFEFF/, "")
        .trimStart()
        .toLowerCase();
      return /^(<!doctype\s+html|<html|<head|<body|<!--)/.test(source);
    }
    default:
      return false;
  }
}

export function filenameWithoutExtension(name: string) {
  return String(name ?? "").replace(/\.([a-z0-9]{1,10})$/i, "");
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function downloadNeedsWarning(path: string, mimeType?: string | null) {
  return getFileKind(path, mimeType) === "html";
}
