import { findByCode, sectionLabel, subsectionLabel } from "@/lib/portfolio";
import type { Documento, EstadoDocumento, Parcial } from "@/lib/types";

function demo(id: string, code: string, title: string, estado: EstadoDocumento, parcial: Parcial | null, daysAgo: number): Documento {
  const found = findByCode(code)!;
  const date = new Date(); date.setDate(date.getDate() - daysAgo);
  return {
    id,
    seccion: sectionLabel(found.section),
    subseccion: subsectionLabel(found.subsection),
    parcial,
    titulo: title,
    archivo_url: `${found.subsection.storagePath}/demostracion.pdf`,
    signed_url: null,
    download_url: null,
    estado,
    subido_por: "demo-docente",
    fecha_subida: date.toISOString(),
    comentario_supervisor: estado === "Aprobado" ? "Documento completo y organizado. Sin observaciones." : estado === "Revisado" ? "Revisado. Agregar la firma en la versión final." : null,
  };
}

export const DEMO_DOCUMENTS: Documento[] = [
  demo("demo-1", "1.1", "Identificación del área de Informática", "Aprobado", null, 38),
  demo("demo-2", "2.4", "Hoja de vida docente 2026", "Aprobado", null, 34),
  demo("demo-3", "3.2", "Reseña histórica institucional", "Revisado", null, 28),
  demo("demo-4", "4.3", "Estrategias de trabajo colaborativo", "Aprobado", "I", 18),
  demo("demo-5", "4.4", "Instrumentos de evaluación", "Revisado", "II", 12),
  demo("demo-6", "4.7", "Planes de clase — Programación web", "Pendiente", null, 5),
  demo("demo-7", "6.1", "Registro de calificaciones I Parcial", "Aprobado", "I", 22),
  demo("demo-8", "7.2", "Asistencia consolidada III Parcial", "Pendiente", "III", 2),
  demo("demo-9", "8.1", "Formatos de seguimiento pedagógico", "Revisado", null, 8),
];

