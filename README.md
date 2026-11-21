# Portfolio · Alicia Palacios Serrano

Portfolio personal bilingüe (inglés / español) hecho con [Hugo](https://gohugo.io/) y el
tema [Toha](https://github.com/hugo-toha/toha), publicado en
https://aliciapalacios82.github.io/

## Requisitos

Mismas versiones que usa el despliegue (`.github/workflows/deploy.yaml`):

| Herramienta | Versión | Para qué |
| --- | --- | --- |
| [Hugo](https://gohugo.io/installation/) (edición *extended* o *withdeploy*) | 0.170.1 | Generar el sitio |
| [Go](https://go.dev/dl/) | la indicada en `go.mod` | Descargar el tema (módulo de Hugo) |
| [Node.js](https://nodejs.org/) | 26 | Dependencias del tema |
| [Dart Sass](https://sass-lang.com/install/) | 1.108.2 | Compilar los estilos |

En macOS con Homebrew: `brew install hugo go node sass/sass/sass`.

## Arrancar en local

Desde la raíz del proyecto:

```bash
# 1. Instalar las dependencias del tema (solo la primera vez o si cambia package-lock.json)
npm ci

# 2. Arrancar el servidor de desarrollo
hugo server -w
```

Abre en el navegador:

- Inglés: http://localhost:1313/
- Español: http://localhost:1313/es/

Con `-w` el servidor recarga la página automáticamente al guardar cambios. Si creas una
carpeta nueva de primer nivel (por ejemplo `static/`), para el servidor con `Ctrl+C` y
vuelve a arrancarlo, porque Hugo no la vigila.

Para generar la versión de producción en `public/`: `hugo --gc --minify`.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `data/es/` | Contenido en español (fuente original) |
| `data/en/` | Traducción al inglés |
| `assets/styles/override.scss` | Estilos propios (sin tocar el tema) |
| `assets/images/` | Foto y favicon |
| `static/files/` | CV en PDF |
| `hugo.yaml` | Configuración del sitio |

## Despliegue

Cada push a `main` publica el sitio en GitHub Pages mediante GitHub Actions
(`.github/workflows/deploy.yaml`).
