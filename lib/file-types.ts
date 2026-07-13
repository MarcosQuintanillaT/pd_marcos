export const FILE_INPUT_ACCEPT =
  "application/pdf,.pdf,text/html,.html,.htm,image/*";

export const MAX_CLIENT_FILE_BYTES = 4 * 1024 * 1024;

export type SupportedFileKind = "pdf" | "image" | "html" | "unknown";

type PortfolioFileDescription = {
  kind: Exclude<SupportedFileKind, "unknown">;
  extension: string;
  contentType: string;
};

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  ico: "image/vnd.microsoft.icon",
  jfif: "image/jpeg",
  jpe: "image/jpeg",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  jxl: "image/jxl",
  png: "image/png",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

const IMAGE_EXTENSIONS_BY_MIME: Record<string, string> = {
  "image/apng": "apng",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/jxl": "jxl",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/tiff": "tiff",
  "image/vnd.microsoft.icon": "ico",
  "image/webp": "webp",
  "image/x-icon": "ico",
  "image/x-ms-bmp": "bmp",
};

function normalizeMimeType(mimeType?: string | null) {
  return String(mimeType ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

function isSafeExtension(extension: string) {
  return /^[a-z0-9]{1,16}$/.test(extension);
}

function extensionFromImageMime(mimeType: string) {
  const mapped = IMAGE_EXTENSIONS_BY_MIME[mimeType];
  if (mapped) return mapped;

  const subtype = mimeType.slice("image/".length);
  const derived = subtype
    .replace(/^x-/, "")
    .replace(/^vnd\./, "")
    .replace(/\+xml$/, "")
    .replace(/[^a-z0-9]/g, "");
  return isSafeExtension(derived) ? derived : "";
}

export function getFileExtension(path: string) {
  const cleanPath = String(path ?? "").split(/[?#]/, 1)[0].replace(/\\/g, "/");
  const fileName = cleanPath.slice(cleanPath.lastIndexOf("/") + 1);
  const match = fileName.match(/\.([a-z0-9]{1,16})$/i);
  return match?.[1].toLowerCase() ?? "";
}

export function getFileKind(
  pathOrName: string,
  mimeType?: string | null,
): SupportedFileKind {
  const mime = normalizeMimeType(mimeType);
  const extension = getFileExtension(pathOrName);

  if (mime === "application/pdf") return "pdf";
  if (mime === "text/html") return "html";
  if (mime.startsWith("image/")) return "image";
  if (extension === "pdf") return "pdf";
  if (extension === "html" || extension === "htm") return "html";
  if (extension in IMAGE_CONTENT_TYPES || extension === "apng") return "image";
  // Las rutas de Storage solo se generan después de validar el MIME durante
  // la carga. Así reconocemos al volver a listar imágenes con formatos menos
  // comunes cuyo subtipo no está en el mapa anterior.
  if (extension && isSafeExtension(extension)) return "image";
  return "unknown";
}

export function describePortfolioFile(
  file: File,
): PortfolioFileDescription | null {
  const mime = normalizeMimeType(file.type);
  const extension = getFileExtension(file.name);

  if (mime === "application/pdf" || (!mime && extension === "pdf")) {
    if (extension && extension !== "pdf") return null;
    return { kind: "pdf", extension: "pdf", contentType: "application/pdf" };
  }

  if (
    mime === "text/html" ||
    (!mime && (extension === "html" || extension === "htm"))
  ) {
    if (extension && extension !== "html" && extension !== "htm") return null;
    return {
      kind: "html",
      extension: extension || "html",
      contentType: "text/html",
    };
  }

  if (mime.startsWith("image/")) {
    if (extension === "pdf" || extension === "html" || extension === "htm")
      return null;

    const preferredExtension = IMAGE_EXTENSIONS_BY_MIME[mime];
    const imageExtension = preferredExtension || extension || extensionFromImageMime(mime);
    if (!imageExtension || !isSafeExtension(imageExtension)) return null;
    return {
      kind: "image",
      extension: imageExtension,
      contentType: mime,
    };
  }

  if (!mime && extension in IMAGE_CONTENT_TYPES) {
    return {
      kind: "image",
      extension,
      contentType: IMAGE_CONTENT_TYPES[extension],
    };
  }

  return null;
}

export function validatePortfolioFile(
  file: File,
  maxBytes = MAX_CLIENT_FILE_BYTES,
) {
  if (!file || file.size === 0) return "Selecciona un archivo válido";
  if (file.size > maxBytes) {
    return `El archivo supera el límite de ${Math.round(maxBytes / 1024 / 1024)} MB`;
  }
  if (!describePortfolioFile(file)) {
    return "Solo se permiten archivos PDF, HTML o imágenes";
  }
  return null;
}

export function filenameWithoutExtension(name: string) {
  return String(name ?? "").replace(/\.([a-z0-9]{1,16})$/i, "");
}
