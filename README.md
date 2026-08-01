# Voluntarios FSB

Herramienta para armar las asignaciones semanales de **Fútbol sin Barreras**, el programa recreativo de fútbol inclusivo de [Aletea](https://aletea.org) para niñas, niños y adolescentes autistas, en Montevideo.

Cada viernes la coordinación publica en un grupo de WhatsApp qué voluntaria o voluntario acompaña a cada participante el sábado. Esta aplicación arma esa lista y la exporta como **una sola imagen vertical**, lista para compartir.

**Abrir la aplicación:** https://corvusdevs.github.io/VoluntariosFSB/

## Qué hace

- Arma la lista tocando dos veces: primero el participante, después quien lo acompaña.
- Admite los tres casos reales: alguien sin acompañante, dos personas acompañando a la misma, y una acompañando a dos.
- Genera la imagen con la identidad del programa, y avisa si va a quedar tan alta que WhatsApp la recorte.
- Guarda el historial y permite reusar la lista de la semana anterior.
- Funciona en el teléfono, que es donde se usa.

## Privacidad

Este repositorio contiene **solamente el programa**. Nunca un nombre, nunca una foto.

Los datos de las personas participantes viven en un repositorio **privado** aparte, o directamente en el navegador de quien usa la aplicación. La página publicada no tiene analítica, no usa cookies de terceros, y una vez cargada no pide nada a ningún servidor que no sea GitHub.

## Cómo funciona el acceso

Existe un único token de GitHub, el de la persona dueña del proyecto. Cada coordinadora recibe una contraseña **generada por la aplicación**, y con ella se descifra ese token dentro de su propio navegador. Así **nadie más necesita cuenta de GitHub**.

Las contraseñas nunca las elige una persona. El archivo que las custodia es público, así que su seguridad depende por completo de la fuerza de lo generado: 16 caracteres, 93 bits de entropía, y 600.000 iteraciones de PBKDF2 sobre cada intento.

Hay dos roles. Una **administradora** puede dar de alta y de baja personas, cambiarles el rol y rotar el token. Una **coordinadora** arma listas. Nunca puede quedar el sistema sin ninguna administradora.

## Para desarrollar

No hay compilación, ni empaquetador, ni framework. Es HTML, CSS y JavaScript con módulos nativos, y se publica tal cual.

```bash
npm install     # solo para las pruebas
npm test        # 354 pruebas
npm run servir  # http://localhost:8765
```

Documentación de diseño en [`docs/superpowers/`](docs/superpowers/): la especificación explica **por qué** está hecho así, y los planes recorren cómo se construyó, incluidos los defectos encontrados por el camino y cómo se corrigieron.

## Créditos

La marca y el logotipo son de Aletea, usados con permiso. La tipografía es [Poppins](https://github.com/itfoundry/Poppins), bajo licencia SIL Open Font License.
