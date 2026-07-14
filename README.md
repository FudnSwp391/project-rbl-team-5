# TechCycle - Electronics Marketplace & Repair Platform

Welcome to the **TechCycle** project repository! This project is an Electronics Marketplace & Repair Platform, built with a Node.js backend, a React frontend, and multiple chatbot servers.

## Project Structure

This is a monorepo containing several modules:

- `frontend`: The React-based frontend web application.
- `backend`: The Node.js server handling the core business logic and API.
- `chatbot-server`: The primary chatbot server for AI interactions.
- `chatbot-server2`: An additional chatbot server instance.
- `database`: Database configuration and scripts.

## Getting Started

### Prerequisites

Make sure you have Node.js and npm installed on your machine.

### Installation

To install all dependencies across the root, frontend, and backend projects, run:

```bash
npm run install:all
```

Alternatively, you can install them manually:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Running the Application Locally

You can run the entire stack (backend, frontend, and chatbot servers) concurrently using the dev script:

```bash
npm run dev
```

Or you can run specific components individually:

- **Backend only**: `npm run server`
- **Frontend only**: `npm run client`

### Environment Variables

Check `.env.example` in the root (and potentially inside the subdirectories) to set up your local `.env` file before running the application.

## Contribution

When contributing to this repository, please make sure to follow the existing coding conventions and create pull requests for review.
