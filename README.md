# CodeSmart

CodeSmart is a Visual Java Execution IDE that teaches and explains Java while you type.

Unlike standard IDEs, CodeSmart visualizes Java execution and memory state (AST, Stack, Heap, Collections, Control Flow) in real-time as you write code, without requiring you to run or compile manually.

## Features

- **Real-time Memory Visualization:** Watch variables on the stack, objects on the heap, and string pool updates as you type.
- **AST Explorer:** See the Abstract Syntax Tree of your Java code visually.
- **Control Flow Graphs:** Visual flowchart of loops, branches, and exceptions.
- **UML Class Diagrams:** Live UML for classes, interfaces, inheritance, and dependencies.
- **Stream Pipelines:** Visualize functional Java streams (`filter`, `map`, `collect`).
- **Call Stack & Graphs:** Interactive call trees and execution frames.
- **Explain Like I'm 5:** Click any variable or node for a plain-English explanation.
- **Desktop Application:** Packaged as an Electron app wrapping a high-performance Java Spring Boot backend.

## Tech Stack

- **Backend:** Java 21, Spring Boot 3, JavaParser, LSP4J
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Monaco Editor, React Flow, Zustand, Framer Motion
- **Wrapper:** Electron

## Running Locally

### Backend
```bash
cd backend
mvn spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Electron (Desktop App)
Build the frontend, package the backend, and run the electron wrapper:
```bash
cd backend && mvn clean package -DskipTests
cd ../frontend && npm run build
cd ../electron && npm install && npm start
```

## Docker
Run the entire stack using Docker Compose:
```bash
docker-compose up --build
```
