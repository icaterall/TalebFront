# AI Coding Agent Instructions for Taleb Monorepo

Welcome! This document provides essential guidance for working effectively within the Taleb codebase. This project is a monorepo containing a Node.js/Express.js backend (`TalebBack`) and an Angular frontend (`TalebFront`).

## 🏛️ Architecture Overview

The application follows a standard client-server architecture:

-   **`TalebBack` (Backend):** A RESTful API built with **Node.js** and **Express.js**.
    -   **Entry Point:** `app.js` is the main application entry point.
    -   **Database:** It connects to a **PostgreSQL** database using the `pg-promise` library. Database configuration is in `config/db.js` and relies on environment variables.
    -   **Authentication:** Implemented using JSON Web Tokens (JWT). The core logic is in `middleware/auth.js`. It expects a `Bearer <token>` in the `Authorization` header.
    -   **API Routes:** The API is versioned under `/api/v1`. Route definitions are located in the `routes/` directory and organized by feature (e.g., `routes/course.routes.js`).
    -   **Containerization:** The backend is containerized with Docker. The `Dockerfile` uses `pm2-runtime` to manage the Node.js process in production, exposing port 3200.

-   **`TalebFront` (Frontend):** A Single-Page Application (SPA) built with **Angular**.
    -   **Configuration:** The main project configuration is in `angular.json`.
    -   **Entry Point:** `src/main.ts` bootstraps the Angular application.
    -   **API Communication:** The frontend communicates with the backend via HTTP requests. During development, a proxy is configured in `proxy.conf.json` to forward requests from `/api` to the backend server at `http://127.0.0.1:3000`.
    -   **Interceptors:** HTTP interceptors in `src/app/core/interceptors/` automatically attach the JWT `Authorization` header to outgoing API requests.
    -   **Containerization:** The frontend is also containerized. The `Dockerfile` performs a multi-stage build, compiling the Angular app and then serving the static assets with **Nginx**.

## 🧑‍💻 Developer Workflow

### Running the Application Locally

To run the full application, you need to start both the backend and frontend servers in separate terminals.

1.  **Start the Backend Server:**
    ```bash
    cd TalebBack
    npm install
    npm start # Starts on http://localhost:3200 (or as configured)
    ```

2.  **Start the Frontend Server:**
    ```bash
    cd TalebFront
    npm install
    npm start # Starts on http://localhost:4200 and proxies API calls
    ```

### Key Scripts

-   `TalebBack/package.json`:
    -   `npm start`: Runs the backend server in development mode with `nodemon`.
    -   `npm test`: Executes the test suite using Jest.
-   `TalebFront/package.json`:
    -   `npm start`: Runs the Angular development server.
    -   `npm run build:prod`: Creates a production-ready build of the frontend.

## 🧩 Code Conventions & Patterns

-   **Backend Controllers:** Controllers in `TalebBack/controllers/` contain the main business logic for API endpoints. They are responsible for interacting with services and the database, and for sending responses.
-   **Backend Middleware:** Custom middleware, like the authentication checker in `TalebBack/middleware/auth.js`, is used to handle cross-cutting concerns for Express routes.
-   **Angular Services:** In the frontend, services in `TalebFront/src/app/core/services/` encapsulate API interactions and shared business logic.
-   **Environment Variables:** The backend heavily relies on environment variables for configuration (database credentials, JWT secrets). See `config/db.js` for examples. A `.env` file is expected at the root of `TalebBack`.
-   **Asynchronous Code:** The backend extensively uses `async/await` for handling database queries and other asynchronous operations.

By following these guidelines, you can contribute effectively to the project. Please let me know if any part of this is unclear or if you have suggestions for improvement.
