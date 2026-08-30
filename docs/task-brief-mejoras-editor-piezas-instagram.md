Outcome: El editor permite crear piezas, carruseles y mensajes breves coherentes con el Instagram real de Aletea, con menos trabajo manual y mejor vista previa.
Scope: js/ui/pantalla-comunicacion-visual.js, js/imagen/comunicacion-visual.js, css/estilos.css, preview local y pruebas directas.
Excluded: Publicar en gestor.aletea.org, publicar en Instagram, modificar contenido o credenciales de cuentas.
Authority: Ediciones locales y pruebas; cualquier despliegue externo requiere una autorización posterior.
Evidence: Perfil @aleteauy y tres publicaciones recientes verificadas, pruebas completas, exportación real PNG/SVG y revisión visual en escritorio y móvil.
Stop condition: El flujo principal crea una pieza y un carrusel reutilizando presets, con edición clara, sin desbordamiento y sin regresiones.
Tool route: Instagram público en navegador, rg para inventario, apply_patch para cambios, preview local y pruebas automatizadas.
Model effort: Alto, por combinar auditoría visual, rediseño de interacción y compatibilidad con exportación.
Risks: Instagram puede limitar contenido sin sesión; no copiar fotografías ni textos como assets del CMS.
First checkpoint: Comparar los patrones observados con los controles y el modelo actual antes de editar.
