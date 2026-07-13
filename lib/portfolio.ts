import type { Parcial, Seccion, Subseccion } from "@/lib/types";

export const PARCIALES: Parcial[] = ["I", "II", "III", "IV"];
export const BUCKET_DOCUMENTOS = "portafolio-documentos";

export const PORTFOLIO_SECTIONS: Seccion[] = [
  {
    code: "1",
    title: "Portada",
    slug: "01-portada",
    color: "#d59b49",
    description: "Identificación y estado general del portafolio docente.",
    subsections: [
      { code: "1.1", title: "Área", slug: "01-area", storagePath: "01-portada/area" },
      { code: "1.2", title: "Nombre del docente", slug: "02-nombre-docente", storagePath: "01-portada/nombre-docente" },
      { code: "1.3", title: "Jornada", slug: "03-jornada", storagePath: "01-portada/jornada" },
      { code: "1.4", title: "Estado: Revisado y Aprobado", slug: "04-estado", storagePath: "01-portada/estado" },
    ],
  },
  {
    code: "2",
    title: "Perfil Profesional",
    slug: "02-perfil-profesional",
    color: "#4f8e7d",
    description: "Trayectoria, formación y análisis profesional del docente.",
    subsections: [
      { code: "2.1", title: "Fotografía", slug: "01-fotografia", storagePath: "02-perfil-profesional/fotografia" },
      { code: "2.2", title: "Título obtenido", slug: "02-titulo-obtenido", storagePath: "02-perfil-profesional/titulo-obtenido" },
      { code: "2.3", title: "Análisis FODA personal", slug: "03-analisis-foda-personal", storagePath: "02-perfil-profesional/foda" },
      { code: "2.4", title: "Hoja de vida", slug: "04-hoja-de-vida", storagePath: "02-perfil-profesional/hoja-de-vida" },
      { code: "2.5", title: "Documentos Personales", slug: "05-documentos-personales", storagePath: "02-perfil-profesional/documentos-personales" },
      { code: "2.6", title: "Certificados o constancias", slug: "06-certificados-constancias", storagePath: "02-perfil-profesional/certificados-constancias" },
    ],
  },
  {
    code: "3",
    title: "Datos Institucionales",
    slug: "03-datos-institucionales",
    color: "#537d91",
    description: "Identidad, historia y principios de la institución.",
    subsections: [
      { code: "3.1", title: "Logo de la institución", slug: "01-logo-institucion", storagePath: "03-datos-institucionales/logo" },
      { code: "3.2", title: "Reseña histórica", slug: "02-resena-historica", storagePath: "03-datos-institucionales/resena-historica" },
      { code: "3.3", title: "Misión", slug: "03-mision", storagePath: "03-datos-institucionales/mision" },
      { code: "3.4", title: "Visión", slug: "04-vision", storagePath: "03-datos-institucionales/vision" },
      { code: "3.5", title: "Valores", slug: "05-valores", storagePath: "03-datos-institucionales/valores" },
    ],
  },
  {
    code: "4",
    title: "Filosofía de Enseñanza",
    slug: "04-filosofia-ensenanza",
    color: "#a66b55",
    description: "Planificación, metodología, evaluación y práctica pedagógica.",
    subsections: [
      { code: "4.1", title: "Información del curso (metodología de enseñanza)", slug: "01-informacion-curso", storagePath: "04-filosofia-ensenanza/informacion-curso" },
      { code: "4.2", title: "SACE", slug: "02-sace", storagePath: "04-filosofia-ensenanza/sace" },
      { code: "4.3", title: "Listados de grupo de trabajo (estrategias utilizadas por parcial)", slug: "03-grupos-trabajo", storagePath: "04-filosofia-ensenanza/grupos-trabajo", supportsParcial: true },
      { code: "4.4", title: "Evaluaciones", slug: "04-evaluaciones", storagePath: "04-filosofia-ensenanza/evaluaciones", supportsParcial: true },
      { code: "4.5", title: "Programación (definición de objetivos)", slug: "05-programacion", storagePath: "04-filosofia-ensenanza/programacion", supportsParcial: true, allowsGeneral: true },
      { code: "4.6", title: "Calendarización (distribución de tiempo)", slug: "06-calendarizacion", storagePath: "04-filosofia-ensenanza/calendarizacion" },
      { code: "4.7", title: "Planes de clase (ejecución diaria)", slug: "07-planes-de-clase", storagePath: "04-filosofia-ensenanza/planes-de-clase", supportsParcial: true, allowsGeneral: true },
      { code: "4.8", title: "Rúbricas (métricas de evaluación)", slug: "08-rubricas", storagePath: "04-filosofia-ensenanza/rubricas", supportsParcial: true, allowsGeneral: true },
    ],
  },
  {
    code: "5",
    title: "Productos de Enseñanza",
    slug: "05-productos-ensenanza",
    color: "#7874a8",
    description: "Evidencias del trabajo y los logros de los estudiantes.",
    subsections: [
      {
        code: "5.1",
        title: "Galerías de productos de enseñanza",
        slug: "01-galerias",
        storagePath: "05-productos-ensenanza/galerias",
        children: [
          { code: "5.1.1", title: "Trabajos con excelencia académica", slug: "01-excelencia-academica", storagePath: "05-productos-ensenanza/galerias/excelencia-academica" },
          { code: "5.1.2", title: "Trabajos en grupos", slug: "02-trabajos-grupos", storagePath: "05-productos-ensenanza/galerias/trabajos-grupos" },
          { code: "5.1.3", title: "Esquemas y diagramas (trabajos de alumnos)", slug: "03-esquemas-diagramas", storagePath: "05-productos-ensenanza/galerias/esquemas-diagramas" },
        ],
      },
    ],
  },
  {
    code: "6",
    title: "Calificaciones",
    slug: "06-calificaciones",
    color: "#b07d3f",
    description: "Reportes de calificaciones organizados por parcial y cierre anual.",
    subsections: [
      { code: "6.1", title: "Calificaciones I Parcial", slug: "01-parcial", storagePath: "06-calificaciones/parcial-1", fixedParcial: "I" },
      { code: "6.2", title: "Calificaciones II Parcial", slug: "02-parcial", storagePath: "06-calificaciones/parcial-2", fixedParcial: "II" },
      { code: "6.3", title: "Calificaciones III Parcial", slug: "03-parcial", storagePath: "06-calificaciones/parcial-3", fixedParcial: "III" },
      { code: "6.4", title: "Calificaciones IV Parcial", slug: "04-parcial", storagePath: "06-calificaciones/parcial-4", fixedParcial: "IV" },
      { code: "6.5", title: "Calificaciones finales y promedios", slug: "05-finales-promedios", storagePath: "06-calificaciones/finales-promedios" },
    ],
  },
  {
    code: "7",
    title: "Asistencia",
    slug: "07-asistencia",
    color: "#3f8491",
    description: "Listados y reportes de asistencia del curso.",
    subsections: [
      { code: "7.1", title: "Listado de asistencia de curso", slug: "01-listado-curso", storagePath: "07-asistencia/listado-curso" },
      { code: "7.2", title: "Información segmentada por parcial", slug: "02-segmentada-parcial", storagePath: "07-asistencia", supportsParcial: true },
    ],
  },
  {
    code: "8",
    title: "Anexos",
    slug: "08-anexos",
    color: "#8b6b57",
    description: "Material complementario y evidencias del proceso educativo.",
    subsections: [
      { code: "8.1", title: "Material y formatos elaborados por el docente", slug: "01-material-formatos", storagePath: "08-anexos/material-formatos" },
      { code: "8.2", title: "Pruebas y diagramas", slug: "02-pruebas-diagramas", storagePath: "08-anexos/pruebas-diagramas" },
      { code: "8.3", title: "Evidencias multimedia: fotografías y videos", slug: "03-evidencias-multimedia", storagePath: "08-anexos/evidencias-multimedia" },
    ],
  },
];

export function sectionHref(section: Seccion, subsection?: Subseccion) {
  if (!subsection) return `/portafolio/${section.slug}`;
  return `/portafolio/${section.slug}/${subsection.slug}`;
}

export function flattenSubsections(section: Seccion): Subseccion[] {
  return section.subsections.flatMap((item) =>
    item.children?.length ? [item, ...item.children] : [item],
  );
}

export function findSection(slug: string) {
  return PORTFOLIO_SECTIONS.find((section) => section.slug === slug);
}

export function findSubsection(section: Seccion, slug?: string) {
  if (!slug) return undefined;
  return flattenSubsections(section).find((item) => item.slug === slug);
}

export function findByCode(code: string) {
  for (const section of PORTFOLIO_SECTIONS) {
    const subsection = flattenSubsections(section).find((item) => item.code === code);
    if (subsection) return { section, subsection };
  }
  return null;
}

export function resolveDocumentPeriod(
  subsection: Subseccion,
  parcial?: Parcial | null,
  general = false,
): { parcial: Parcial | null; general: boolean; error: string | null } {
  if (parcial && general) {
    return { parcial: null, general: false, error: "Selecciona un único período" };
  }
  if (subsection.fixedParcial) {
    if (general || (parcial && parcial !== subsection.fixedParcial)) {
      return { parcial: null, general: false, error: "Período no válido" };
    }
    return { parcial: subsection.fixedParcial, general: false, error: null };
  }
  if (parcial && !PARCIALES.includes(parcial)) {
    return { parcial: null, general: false, error: "Parcial no válido" };
  }
  if (!subsection.supportsParcial) {
    return parcial || general
      ? { parcial: null, general: false, error: "Esta subsección no se organiza por parcial" }
      : { parcial: null, general: false, error: null };
  }
  if (parcial) return { parcial, general: false, error: null };
  if (general && subsection.allowsGeneral) {
    return { parcial: null, general: true, error: null };
  }
  return {
    parcial: null,
    general: false,
    error: subsection.allowsGeneral
      ? "Selecciona General/Anual o un parcial"
      : "Selecciona el parcial",
  };
}

export function storageFolder(
  subsection: Subseccion,
  parcial?: Parcial | null,
  general = false,
) {
  if (subsection.fixedParcial) return subsection.storagePath;
  if (general && subsection.allowsGeneral) {
    return `${subsection.storagePath}/general-anual`;
  }
  if (!parcial) return subsection.storagePath;
  const number = PARCIALES.indexOf(parcial) + 1;
  return `${subsection.storagePath}/parcial-${number}`;
}

export function sectionLabel(section: Seccion) {
  return `${section.code}. ${section.title}`;
}

export function subsectionLabel(subsection: Subseccion) {
  return `${subsection.code}. ${subsection.title}`;
}
