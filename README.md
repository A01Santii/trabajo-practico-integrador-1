# Sistema de Gestión de Blog Personal con Autenticación

API REST para un blog personal con autenticación de usuarios, gestión de artículos y etiquetas.
Trabajo Práctico Integrador I - Instituto Politécnico Formosa.

## Tecnologías

- Node.js (ES Modules) y Express
- MySQL con Sequelize
- JWT en cookie `httpOnly`
- bcrypt para el hasheo de contraseñas
- express-validator para las validaciones

## Instalación

1. Clonar el repositorio e instalar dependencias:
   ```bash
   git clone https://github.com/TU_USUARIO/trabajo-practico-integrador-1.git
   cd trabajo-practico-integrador-1
   npm install
   ```
2. Crear la base de datos en MySQL:
   ```sql
   CREATE DATABASE blog_personal;
   ```
3. Copiar `.env.example` a `.env` y completar los valores:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=blog_personal
   JWT_SECRET=una_frase_larga_y_secreta
   PORT=3000
   ```
4. Iniciar el servidor :
   ```bash
   npm run dev
   ```

## Primer administrador

Nadie puede registrarse como admin. Para crear el primero, registrar un usuario con
`POST /api/auth/register` y ejecutar en MySQL:

```sql
UPDATE users SET role = 'admin' WHERE username = 'tu_username';
```

## Estructura del proyecto

```
src/
├── config/        conexión a la base de datos
├── models/        modelos Sequelize y relaciones
├── routes/        definición de rutas
├── controllers/   lógica y validaciones
├── middlewares/   auth, admin y owner
├── helpers/       JWT, bcrypt y ejecución de validaciones
└── app.js         servidor Express
```

## Modelo de datos

- **User 1:1 Profile** (`profile` / `user`)
- **User 1:N Article** (`articles` / `author`)
- **Article N:M Tag** a través de `ArticleTag` (`tags` / `articles`)
- Eliminación lógica en `User` (`paranoid`).
- Eliminación en cascada: al borrar un artículo o una etiqueta se eliminan sus filas en `article_tags`.

## Endpoints

### Auth
| Método | Ruta | Acceso |
|---|---|---|
| POST | /api/auth/register | público |
| POST | /api/auth/login | público |
| GET | /api/auth/profile | autenticado |
| PUT | /api/auth/profile | autenticado |
| POST | /api/auth/logout | autenticado |

### Users
| Método | Ruta | Acceso |
|---|---|---|
| GET | /api/users | admin |
| GET | /api/users/:id | admin |
| POST | /api/users | admin |
| PUT | /api/users/:id | admin |
| DELETE | /api/users/:id | admin (eliminación lógica) |

### Tags
| Método | Ruta | Acceso |
|---|---|---|
| POST | /api/tags | admin |
| GET | /api/tags | autenticado |
| GET | /api/tags/:id | admin |
| PUT | /api/tags/:id | admin |
| DELETE | /api/tags/:id | admin |

### Articles
| Método | Ruta | Acceso |
|---|---|---|
| POST | /api/articles | autenticado |
| GET | /api/articles | autenticado |
| GET | /api/articles/:id | autenticado |
| GET | /api/articles/user | autenticado |
| GET | /api/articles/user/:id | autenticado |
| PUT | /api/articles/:id | autor o admin |
| DELETE | /api/articles/:id | autor o admin |

### Articles-Tags
| Método | Ruta | Acceso |
|---|---|---|
| POST | /api/articles-tags | solo autor |
| DELETE | /api/articles-tags/:articleTagId | solo autor |

## Códigos HTTP

200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden,
404 Not Found, 500 Internal Server Error.

## Autor

Falcón Santiago