# Sincronización personal con Google Calendar

- Resultado: cada cuenta puede conectar voluntariamente su calendario principal de Google y ver sus eventos, con alertas, dentro de Agenda.
- Primera etapa: lectura solamente. El gestor no crea, edita ni elimina eventos de Google.
- Brecha comprobada: Agenda reúne eventos internos, cumpleaños y efemérides, pero no tiene fuentes externas ni credenciales por cuenta.
- Contrato comprobado: Google admite OAuth 2.0 de servidor, acceso sin conexión, `calendar.events.readonly` y sincronización incremental mediante `nextSyncToken`.
- Forma comprobada: el modelo actual ya combina tipos de evento; se agregará una fuente `google` separada, sin convertirla en evento institucional.
- Privacidad: consentimiento individual, cuenta conectada visible, calendarios personales aislados por usuario, revocación inmediata y eliminación de tokens y caché al desconectar.
- Seguridad: credenciales OAuth y tokens solo en el servidor, cifrado de refresh tokens, `state` anti-CSRF, redirección HTTPS exacta y registro sin títulos ni detalles privados.
- UX: Conectar Google Calendar, última sincronización, Sincronizar ahora, alertas configurables y Desconectar. Los eventos de Google tendrán color, icono y etiqueta propios.
- Evidencia: pruebas de aislamiento entre cuentas, token revocado, evento eliminado, zona horaria, día completo, recurrencia, error 410 y conexión móvil.
- Dependencias: proyecto Google Cloud de Aletea, pantalla de consentimiento, política de privacidad, client ID, client secret y revisión de alcance sensible antes de producción.
- Parada: no activar OAuth con cuentas reales hasta que Aletea apruebe el texto de consentimiento, la retención y quién administra el proyecto Google.
