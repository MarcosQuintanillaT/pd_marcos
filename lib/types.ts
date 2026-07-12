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
  comentario_supervisor: string | null;
}

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

