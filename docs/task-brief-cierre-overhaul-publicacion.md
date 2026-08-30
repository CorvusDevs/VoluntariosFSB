# Brief: cierre y publicación del overhaul de Página web

- Resultado: el encuadre elegido en el gestor llega al sitio de prueba y el overhaul queda publicado con versión verificable.
- Alcance: gestor VoluntariosFSB, sitio Astro aletea-web, pruebas, ayuda, novedades y paquetes de cPanel.
- Exclusiones: no modificar aletea.org ni reemplazar la web pública antigua.
- Autoridad: editar, compilar, auditar y publicar gestor.aletea.org y prueba.aletea.org, según la solicitud actual.
- Premisa: el CMS entrega imágenes editoriales y el sitio Astro las dibuja con `object-fit`, pero todavía ignora `focoX` y `focoY`.
- Compatibilidad: imágenes sin punto focal deben conservar el centro 50 por ciento, 50 por ciento.
- Caché: sellar gestor y verificar tanto la versión como los archivos reales cargados.
- Evidencia: pruebas completas de ambos proyectos, compilación, auditoría textual, rutas y hashes vivos, más prueba visual móvil y escritorio.
- Stop: ambos destinos sirven el nuevo artefacto, el punto focal se observa y no quedan regresiones abiertas.
- Esfuerzo: alto, por contrato compartido y despliegue de dos destinos.
