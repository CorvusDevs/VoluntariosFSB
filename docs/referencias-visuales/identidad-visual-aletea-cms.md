# Identidad visual Aletea para el CMS

Esta guía traduce las referencias institucionales a decisiones de interfaz reutilizables. No busca copiar una pieza gráfica puntual: busca que cada superficie del CMS ayude a entender quién coordina, qué necesita atención y cómo se relacionan los equipos.

## Fuentes consultadas

- Sitio oficial: [aletea.org](https://aletea.org/). Comunica una organización de familias y profesionales que trabaja por inclusión, comunidad, capacitaciones y deporte y recreación.
- Instagram oficial: [@aleteauy](https://www.instagram.com/aleteauy/). Es una referencia editorial continua para futuras piezas. En esta revisión no fue posible recuperar su contenido de forma automatizada, por lo que no se atribuyen decisiones visuales no verificadas.
- `Reunión socios 2025 (1).pdf`, especialmente página 5: estructura en red, equipos conectados y una leyenda cromática para trabajo transversal.
- `Sistema de gestión para aletea.pdf`, página 1: estados de trabajo legibles para Dirección, con color acompañado por texto.

## Idea rectora

**Una red organizada, cálida y accionable.** El CMS no es una lista de formularios: es el lugar donde Dirección ve el conjunto, los equipos entienden su lugar y cada situación tiene un siguiente paso.

La jerarquía se expresa con aire, bloques claros y conexiones sutiles. El color comunica función, no decoración. Ningún estado depende solo del color.

## Paleta semántica

| Rol | Color | Uso en el CMS |
| --- | --- | --- |
| Institución y Dirección | `#662D7D` violeta Aletea | navegación activa, encabezados, decisiones y estructura |
| Trabajo transversal y cuidado | `#5DCCC6` turquesa Aletea | coordinación, avance, red y estados en marcha |
| Acción prioritaria | `#E9287F` magenta Aletea | alertas, bloqueos, acciones entre equipos y llamados de atención |
| Ideas, recursos y aprendizaje | `#F2B544` amarillo cálido derivado | capacitaciones, recursos y próximos pasos que requieren atención |
| Seguimiento e información | `#3976B9` azul | espera de respuesta, hitos y horizonte temporal |
| Texto | `#2C2C2A` | lectura principal |
| Fondo institucional | `#FCFAFD` | superficies amplias y descanso visual |

El amarillo es una aproximación digital de los acentos cálidos de la página 5 de la presentación de socios. Se reserva para información secundaria de atención, nunca para errores ni texto de baja legibilidad.

## Tipografía

- **Poppins**, en archivos locales del proyecto, sigue siendo la familia principal del CMS, su interfaz y los textos de lectura.
- **League Gothic** es una alternativa expresiva para piezas de Comunicación visual y titulares breves de la página pública. Se usa cuando una campaña, una cifra o un llamado necesita un acento condensado y de alto impacto. No reemplaza Poppins en formularios, navegación, botones, párrafos ni texto operativo.
- El editor permite elegir Poppins para toda la pieza o combinar League Gothic en titulares y etiquetas con Poppins en textos de lectura. La vista previa muestra el resultado antes de exportar.
- El editor de Página web ofrece la misma decisión mediante dos tarjetas visuales, Institucional y Con impacto, solo en Portada, Cifras, Participación, Qué hacemos, Formación y Actualidad. La configuración inicial usa League Gothic en números, Participación y Actualidad, y mantiene Poppins en el resto.
- Poppins usa peso 500 para títulos y acciones y peso 400 para texto de apoyo. League Gothic usa su peso 400 original.
- Etiquetas institucionales en mayúsculas, pequeñas y espaciadas.
- Los párrafos no deben superar una medida cómoda de lectura dentro de tarjetas.
- Ambas familias se alojan localmente. League Gothic está licenciada bajo SIL Open Font License 1.1 en `assets/fuentes/LICENCIA-LEAGUE-GOTHIC.txt`.

## Logo y firmas

- La firma oficial violeta del pie de [aletea.org](https://aletea.org), guardada como `assets/logo-aletea-violeta.png`, se usa sobre fondos claros: navegación institucional, páginas de lectura y documentos internos.
- `assets/logo-aletea.png` es la firma blanca. Se reserva para fondos violeta, magenta u oscuros, como la cabecera institucional.
- Una firma monocromática puede usarse solamente cuando la superficie o el medio impidan la versión oficial a color. No aplicar filtros CSS ni recolorear la marca.
- Fuente verificada: pie de la página oficial de Aletea, archivo `logo-violeta-con-fondo-transparente-alta-calidad-1-2048x764.png`, consultado el 17 de agosto de 2026. Huella SHA-256 local: `5a29e459df9a3904e0fe5c13036c74de7e3929fcb718705516a267c61ac6e4f3`.
- Mantener fondo limpio y área de respiro alrededor de la marca.
- La cabecera principal incluye una firma de marca discreta. La navegación la mantiene siempre disponible como retorno al centro de control.
- Fútbol sin Barreras conserva identidad propia dentro del módulo Deportes, sin reemplazar la marca institucional del CMS.

## Componentes y lenguaje visual

- Las tarjetas tienen una única función y un borde de acento semántico.
- Las acciones principales son violeta sólido. Las secundarias usan contorno.
- Las alertas combinan color, ícono SVG existente y una etiqueta textual.
- El mapa de equipos representa conexiones con líneas sutiles, no con una infografía densa. Dirección queda como nodo institucional central.
- Las superficies de trabajo usan blanco o una tinta muy suave. Los gradientes se limitan a la cabecera institucional y no deben ocultar contenido.

## Reglas de accesibilidad

- Contraste suficiente en texto y controles. El estado se expresa con texto y no solo con color.
- Foco visible en todos los controles y navegación por teclado completa.
- Íconos de botones: SVG de bibliotecas establecidas, con etiqueta accesible.
- En pantallas pequeñas, la estructura se apila. No se reduce tipografía ni se comprimen paneles para intentar conservar una grilla de escritorio.

## Aplicación en código

Los tokens viven en `css/estilos.css` y se consumen únicamente en las superficies `.app-cms` y `.cms-*`. Esta guía debe actualizarse junto con cualquier nuevo color, fuente, logo o componente transversal del CMS.
