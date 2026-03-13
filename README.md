# Ícono Control

**Plataforma de Monitoreo y Trazabilidad — Proyecto Ícono**
Facultad de Ciencias de la Vida • Universidad Viña del Mar

---

## Descripción

Ícono Control es una aplicación web para monitorear, registrar, visualizar y dar trazabilidad al Proyecto Ícono. Permite gestión multiusuario con roles diferenciados (administrador, responsable de carrera, visualizador), un dashboard ejecutivo, sistema de actividades por carrera y objetivo, cronograma Gantt, repositorio de evidencias, bitácora de cambios, y reportes exportables.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite |
| Backend | Supabase (Postgres, Auth, Storage) |
| Gráficos | Recharts |
| Iconos | Lucide React |
| Fechas | date-fns |
| Router | React Router DOM v7 |

## Requisitos Previos

- Node.js 18+
- npm
- Proyecto en Supabase (ya configurado)

## Instalación

```bash
# Clonar repositorio
git clone <url-del-repo>
cd icono-control

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu URL y anon key de Supabase
```

## Variables de Entorno

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

> ⚠️ Usa solo la clave pública (anon key). Nunca expongas la `service_role` key en el frontend.

## Ejecución Local

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Build para Producción

```bash
npm run build
npm run preview
```

## Base de Datos Supabase

El esquema incluye las siguientes tablas:

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Usuarios vinculados a auth.users |
| `careers` | 12 carreras de la facultad |
| `objectives` | Objetivos estratégicos del proyecto |
| `activities` | Actividades por carrera y objetivo |
| `tasks` | Subtareas asociadas a actividades |
| `evidence` | Archivos de evidencia (Storage) |
| `activity_updates` | Bitácora de cambios |
| `timeline_events` | Hitos y eventos del proyecto |
| `status_catalog` | Catálogo de estados |

### Migraciones

Las migraciones SQL se aplicaron automáticamente vía MCP. Los archivos de referencia están disponibles en la raíz del proyecto workspace:
- `migration_001_schema.sql` — Esquema principal
- `migration_002_rls.sql` — Políticas RLS
- `migration_003_storage.sql` — Bucket de evidencias
- `migration_004_seeds.sql` — Datos demo

### Row Level Security

- **admin_comite**: Acceso completo a todo
- **responsable_carrera**: CRUD solo en actividades de su carrera
- **visualizador**: Solo lectura global

### Storage

- Bucket `evidence` (privado)
- Políticas de acceso por usuario autenticado
- Descarga mediante signed URLs

## Roles y Permisos

| Función | Admin | Responsable | Viewer |
|---------|:-----:|:-----------:|:------:|
| Dashboard | ✅ | ✅ | ✅ |
| Ver actividades | ✅ | ✅ | ✅ |
| Crear/editar actividades | ✅ | ✅ (su carrera) | ❌ |
| Subir evidencias | ✅ | ✅ (su carrera) | ❌ |
| Gestionar carreras | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Exportar reportes | ✅ | ✅ | ✅ |

## Crear Usuarios

1. Accede al panel de Supabase → Authentication → Users
2. Haz clic en **Add user** → **Create new user**
3. Ingresa email y contraseña
4. En metadata, puedes agregar:
   ```json
   { "full_name": "Nombre Usuario", "role": "admin_comite" }
   ```
5. El trigger automático creará el perfil correspondiente
6. Luego, desde la app (Gestión de Usuarios), asigna el rol y carrera correctos

## Pantallas

1. **Login** — Autenticación con Supabase Auth
2. **Dashboard** — KPIs, gráficos, alertas, hitos
3. **Actividades** — Lista filtrable con búsqueda
4. **Detalle de Actividad** — Tareas, evidencias, historial
5. **Crear/Editar Actividad** — Formulario completo con auditoría
6. **Cronograma** — Vista Gantt temporal
7. **Evidencias** — Galería con descarga
8. **Historial** — Bitácora de cambios + línea de tiempo
9. **Reportes** — Filtros, CSV, resumen imprimible
10. **Carreras** — CRUD de carreras (admin)
11. **Usuarios** — Gestión de roles y perfiles (admin)

## Despliegue

### Vercel
```bash
npm run build
# Sube el contenido de dist/ a Vercel
# Configura las variables de entorno en el panel de Vercel
```

### Netlify
```bash
npm run build
# Build command: npm run build
# Publish directory: dist
```

### GitHub Pages
Configura `vite.config.js` con `base: '/nombre-repo/'` y usa GitHub Actions.

## Licencia

Uso exclusivo interno — Proyecto Ícono, Universidad Viña del Mar.
