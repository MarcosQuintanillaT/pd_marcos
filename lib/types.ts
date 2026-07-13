export type Rol = "docente" | "supervisor";
export type EstadoDocumento = "Pendiente" | "Revisado" | "Aprobado";
export type Parcial = "I" | "II" | "III" | "IV";

export interface Perfil {
  id: string;
  email: string;
  nombre: string | null;
  rol: Rol;
}

export interface Documento {
  id: string;
  /** Identificadores estables; los textos pueden cambiar sin perder documentos. */
  seccion_codigo?: string;
  subseccion_codigo?: string;
  portafolio_id?: string | null;
  seccion: string;
  subseccion: string;
  parcial: Parcial | null;
  titulo: string;
  /** Ruta del objeto dentro del bucket privado. */
  archivo_url: string;
  /** URL firmada temporal, agregada por la API al listar. */
  signed_url?: string | null;
  download_url?: string | null;
  estado: EstadoDocumento;
  subido_por: string;
  fecha_subida: string;
  actualizado_en?: string;
  eliminado_en?: string | null;
  eliminado_por?: string | null;
  mime_type?: string | null;
  tamano_bytes?: number | null;
  nombre_original?: string | null;
  version_actual?: number;
  revisado_por?: string | null;
  revisado_en?: string | null;
  comentario_supervisor: string | null;
}

export interface Portafolio {
  id: string;
  docente_id: string;
  anio_lectivo: number;
  area: string;
  jornada: string;
  institucion: string | null;
  estado: "Activo" | "Archivado";
  creado_en: string;
  actualizado_en: string;
  cerrado_en: string | null;
}

export interface DocumentoRevision {
  id: string;
  documento_id: string;
  actor_id: string;
  rol_actor: Rol;
  estado_anterior: EstadoDocumento;
  estado_nuevo: EstadoDocumento;
  comentario_anterior: string | null;
  comentario_nuevo: string | null;
  creado_en: string;
}

export interface DocumentoVersion {
  id: string;
  documento_id: string;
  numero_version: number;
  archivo_url: string;
  titulo: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  nombre_original: string | null;
  creado_por: string;
  creado_en: string;
}

export type SectionSummary = {
  code: string;
  documentos: number;
  aprobados: number;
  revisados: number;
  pendientes: number;
  subseccionesConEvidencia: number;
  subseccionesRequeridas: number;
};

export type PortfolioSummary = {
  total: number;
  aprobados: number;
  revisados: number;
  pendientes: number;
  cobertura: number;
  revision: number;
  subseccionesCubiertas: string[];
  secciones: SectionSummary[];
  portafolio: Portafolio | null;
};

export interface Subseccion {
  code: string;
  title: string;
  slug: string;
  storagePath: string;
  supportsParcial?: boolean;
  fixedParcial?: Parcial;
  children?: Subseccion[];
}

export interface Seccion {
  code: string;
  title: string;
  slug: string;
  color: string;
  description: string;
  subsections: Subseccion[];
}
