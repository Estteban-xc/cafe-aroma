# Guía de despliegue — Café Aroma en Vercel + MongoDB Atlas

Al terminar tendrás una URL pública (por ejemplo `https://cafe-aroma.vercel.app`) que funciona todo el tiempo y guarda las ventas de forma permanente en una base de datos en la nube. Todo es gratis.

**Tiempo aproximado:** 15–20 minutos.

**Necesitas:** Node.js 20.19 o superior (versión LTS de nodejs.org) y el proyecto descomprimido.

---

## Parte 1 — Crear la base de datos en MongoDB Atlas

1. Entra a **https://www.mongodb.com/cloud/atlas/register** y crea una cuenta (puedes usar Google).
2. Cuando te pida crear un clúster, elige el plan **Free (M0)**.
   - Proveedor: **AWS** · Región: la más cercana (por ejemplo *São Paulo* o *N. Virginia*).
   - Nombre: deja `Cluster0`.
   - Clic en **Create Deployment**.
3. **Usuario de la base de datos.** Atlas te muestra un usuario y una contraseña.
   - Usa una contraseña **solo con letras y números** (sin `@ : / ? # %`), así no da problemas en la cadena de conexión.
   - **Cópiala y guárdala**, porque la vas a necesitar.
   - Clic en **Create Database User**.
4. **Permitir el acceso desde Vercel.** En el menú izquierdo entra a **Network Access** (o *Security → Network Access*).
   - Clic en **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) → **Confirm**.
   - Es necesario porque Vercel no tiene una IP fija.
5. **Copiar la cadena de conexión.** Ve a **Database / Clusters** → botón **Connect** → **Drivers**.
   - Copia la cadena. Se parece a esta:
     ```
     mongodb+srv://sebastian:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
     ```
   - Reemplaza `<db_password>` (incluidos los signos `< >`) por tu contraseña.

## Parte 2 — Conectar el proyecto y cargar los datos de ejemplo

1. En la carpeta del proyecto, copia el archivo `.env.example` y renómbralo como **`.env`**.
2. Ábrelo y pega tu cadena en `MONGODB_URI`:
   ```
   MONGODB_URI=mongodb+srv://sebastian:MiClave123@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   MONGODB_DB=cafe_aroma
   ```
3. En la terminal, dentro de la carpeta:
   ```bash
   npm install
   npm run seed
   ```
   Debe aparecer: `✔ 694 ventas de ejemplo guardadas en MongoDB Atlas`.
4. Pruébalo localmente:
   ```bash
   npm start
   ```
   Debe decir `💾 Almacenamiento: MongoDB Atlas`. Abre http://localhost:3000 para verificar y luego apágalo con **Ctrl + C**.

> El archivo `.env` contiene tu contraseña. **No se sube a GitHub**, porque `.gitignore` ya lo excluye.

## Parte 3 — Subir el código a GitHub

1. Entra a **https://github.com** → **New repository**.
   - Nombre: `cafe-aroma` · Público · **sin** README → **Create repository**.
2. Sube el código de una de estas dos formas.

   **Opción A, con Git (recomendada):** en la terminal, dentro de la carpeta:
   ```bash
   git init
   git add .
   git commit -m "Dashboard inteligente Café Aroma"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/cafe-aroma.git
   git push -u origin main
   ```

   **Opción B, sin Git:** en la página del repositorio vacío, clic en **uploading an existing file** y arrastra todo el contenido de la carpeta **excepto** `node_modules` y `.env`. Luego clic en **Commit changes**.

## Parte 4 — Publicar en Vercel

1. Entra a **https://vercel.com/signup** y regístrate **con tu cuenta de GitHub** (plan *Hobby*, gratis).
2. Clic en **Add New… → Project** → busca `cafe-aroma` → **Import**.
3. En la configuración:
   - **Framework Preset:** Vercel lo detecta solo (*Express*). Si muestra *Other*, también funciona.
   - Abre **Environment Variables** y agrega:

     | Key | Value |
     |---|---|
     | `MONGODB_URI` | tu cadena completa (la misma del `.env`) |
     | `MONGODB_DB` | `cafe_aroma` |
4. Clic en **Deploy**. En 1 o 2 minutos aparece la pantalla de felicitaciones y tu URL, por ejemplo `https://cafe-aroma.vercel.app`.
5. Verifica que todo quedó bien:
   - Abre la URL y debe verse el dashboard con datos.
   - Abre `TU_URL/api/estado`, que debe responder `"almacenamiento":"MongoDB Atlas"`.

**Esa es la URL que va en el documento.**

## Parte 5 — Registrar ventas en la app publicada

**Desde la terminal de tu computador** (cualquier sistema operativo):
```bash
npm run registrar -- https://cafe-aroma.vercel.app
```
También funciona solo con `npm run registrar` si tienes el `.env` con `MONGODB_URI`, porque escribe directo en la misma base de datos.

**Desde la consola del navegador:** abre la URL, presiona F12 → *Consola* y escribe:
```js
registrarVenta("Capuccino", 2)
```

En los dos casos la venta aparece en el dashboard en unos 5 segundos.

---

## Actualizar la app más adelante
Cada cambio que subas a GitHub (`git add . && git commit -m "cambio" && git push`) hace que Vercel vuelva a publicar la app sola.

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| El dashboard dice "Sin conexión con el servidor" o `/api/estado` da error 500 | Falta la variable `MONGODB_URI` en Vercel | Vercel → proyecto → *Settings → Environment Variables*. Agrégala y luego *Deployments → … → Redeploy* |
| Error con `bad auth` / `Authentication failed` | Contraseña incorrecta o con símbolos especiales | Atlas → *Database Access* → edita el usuario y pon una contraseña solo con letras y números |
| Error de tiempo de espera (`timed out`, `Server selection`) | La IP no está permitida | Atlas → *Network Access* → agrega `0.0.0.0/0` |
| El dashboard abre pero sin datos | No se cargaron los datos de ejemplo | Corre `npm run seed` con el `.env` configurado |
| `npm run seed` dice "archivo local" en vez de "MongoDB Atlas" | El `.env` no existe o está mal nombrado | Debe llamarse exactamente `.env` (no `.env.txt`) y estar en la carpeta principal |
