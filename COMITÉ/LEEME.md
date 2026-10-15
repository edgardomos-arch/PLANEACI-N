# Comité de Planeación FESC — sitio Netlify (v2)

## Publicar (una sola vez)
1. Instale Node 18+ y Netlify CLI:  npm i -g netlify-cli
2. En esta carpeta:  npm install
3. netlify login  y  netlify link   (elija el sitio comitedeplaneacion)
4. En Netlify -> Site configuration -> Environment variables cree ADMIN_KEY con la clave de administrador que usted elija (minimo 12 caracteres).
5. netlify deploy --prod

Nota: arrastrar la carpeta (drag and drop) NO publica las funciones; use la CLI o conecte un repositorio Git.

## Uso
- Cualquier persona con el enlace consulta (modo consulta).
- "Acceso administrador" + ADMIN_KEY: subir, reemplazar o quitar actas y anexos, editar textos, cronograma y galeria.
- Archivos de mas de 3 MB se suben por partes automaticamente.
