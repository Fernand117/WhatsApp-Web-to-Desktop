# WhatsApp-Web-to-Desktop

Extensión para **Google Chrome** y **Microsoft Edge** que imita el comportamiento de la app de escritorio de WhatsApp en WhatsApp Web:

- **Redimensionar la lista de chats**: arrastra el borde derecho de la columna de chats con el mouse para ajustar su ancho (se guarda el valor para la próxima sesión).
- **Ocultar automáticamente la lista de chats**: cuando el ancho de la ventana del navegador es estrecho (≤ 700px por defecto), la columna se oculta con una animación y aparece un botón flotante verde para volver a mostrarla como superposición.

## Instalación

1. Descarga o clona este repositorio.
2. Abre el administrador de extensiones:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
3. Activa el **modo de desarrollador** (interruptor en la esquina superior).
4. Haz clic en **"Cargar descomprimida"** / **"Load unpacked"** y selecciona la carpeta del proyecto.
5. Abre o recarga `https://web.whatsapp.com` y usa WhatsApp como siempre.

## Uso

- Pasa el mouse por el borde derecho de la columna de chats hasta ver el cursor `col-resize`, luego arrastra para cambiar el ancho (límites: 220px mínimo, 60% de la ventana como máximo). La primera vez se conserva el ancho actual de WhatsApp; luego se guarda el que tú fijes.
- Doble clic sobre el borde restaura el ancho por defecto (380px).
- Si la ventana se vuelve estrecha, la columna se oculta sola; usa el botón flotante verde (☰) arriba a la izquierda para mostrarla/ocultarla.

## Cómo funciona

El script (`content.js`) usa como selector principal la clase `.x1a0bplq` (la que WhatsApp usa para fijar el ancho de la lista de chats, verificada manualmente; se aplica con el selector reforzado `.x1a0bplq.x1a0bplq` en el CSS para ganar especificidad). Solo modifica la propiedad `width` (como harías a mano en DevTools) y **no toca** `flex` ni `min-width`, así el layout de WhatsApp no se reordena. Si WhatsApp cambia de clases, hay un fallback estructural: localiza el campo de búsqueda, sube por la jerarquía hasta el contenedor que agrupa las columnas y toma la columna que contiene la búsqueda.

En ventanas estrechas (≤ el `BREAKPOINT`) la lista de chats pasa a "modo flotante", igual que en Android: se oculta sobre la vista principal (el rail con Chats/Historias/Comunidades queda intacto) y aparece el botón flotante verde (☰) para desplegarla/ocultarla sobre el chat.

## Personalización

Abre `content.js` y ajusta estas constantes:

| Constante          | Valor por defecto | Qué hace |
| ------------------ | ----------------- | -------- |
| `DEFAULT_WIDTH`    | `380`             | Ancho a usar si no se encuentra el ancho actual de WhatsApp (px) |
| `MIN_WIDTH`        | `220`             | Ancho mínimo permitido (px) |
| `MAX_WIDTH_RATIO`  | `0.6`             | Ancho máximo = 60% del ancho de la ventana |
| `BREAKPOINT`       | `700`             | Ancho de ventana (px) bajo el cual la columna se oculta |

## Notas

- Si WhatsApp cambia sus clases internas, la extensión intenta detectar la columna de chats por su estructura (campo de búsqueda `role="textbox"`) y por el contenedor `#side`.
- El ancho se guarda en `chrome.storage.local` (permiso `storage`), por lo que persiste entre recargas y sesiones.