# Proyecto Iconico 2026

## Cambios realizados

- Se agrego `src/data/iconicProject2026.js` con el proyecto, etapas, actividades, carreras, ejes criticos, evidencias esperadas e indicadores 2026.
- Se agrego `src/services/iconicProjectSeed.js` para cargar datos iniciales idempotentes en Supabase cuando entra un usuario `admin_comite`.
- Se agrego `src/utils/activityMetadata.js` para guardar metadatos de seguimiento dentro de `activities.observations` sin cambiar el esquema actual.
- Se actualizaron Dashboard, Actividades, Cronograma, Reportes, Detalle y Formulario de Actividad para mostrar, filtrar y editar la informacion del Proyecto Iconico 2026.
- Se agrego `supabase/seed_iconic_project_2026.sql` como respaldo para ejecutar la carga desde Supabase.

## Como se cargan las actividades

La plataforma usa las tablas existentes: `careers`, `objectives`, `activities` y `timeline_events`.

Al abrir Dashboard, Actividades, Cronograma o Reportes con un perfil `admin_comite`, la app revisa si existen los IDs semilla del Proyecto Iconico 2026. Si faltan, crea:

- carrera `Interdisciplinaria` y carreras del proyecto que no existan;
- objetivo principal del Proyecto Iconico 2026;
- 14 actividades correspondientes a etapas e iniciativas;
- 4 eventos de linea de tiempo.

La carga no actualiza actividades ya existentes con esos IDs, para no sobrescribir ediciones posteriores del coordinador.

## Como agregar nuevas actividades

1. Entrar con perfil `admin_comite` o `responsable_carrera`.
2. Ir a `Actividades` y seleccionar `Nueva Actividad`.
3. Completar los campos generales de la actividad.
4. Completar la seccion `Seguimiento Proyecto Iconico 2026` para que la actividad quede disponible en filtros por etapa, territorio, eje critico, poblacion objetivo, semestre y responsable.
5. Guardar la actividad.

## Datos pendientes de confirmar

- Fechas especificas de actividades descritas solo como primer semestre, segundo semestre o periodo por definir.
- Responsables operativos de actividades donde el prompt no entrego nombre/correo.
- Ejes criticos e indicadores concretos de las iniciativas de la Corporacion Pro Casablanca.
- Confirmacion de campo clinico para ELEAM HSM / Hospital Sanatorio Maritimo.
- Estado final de actividades de primer semestre que dependen de fechas reales del sistema.
