# Stage 1: Build the frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Final runtime image
FROM node:20-alpine
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy backend files and install dependencies
COPY backend/package*.json ./backend/
RUN npm install --prefix backend

# Copy chatbot-server files and install dependencies
COPY chatbot-server/package*.json ./chatbot-server/
RUN npm install --prefix chatbot-server

# Copy chatbot-server2 files and install dependencies
COPY chatbot-server2/package*.json ./chatbot-server2/
RUN npm install --prefix chatbot-server2

# Install concurrently globally to run multiple processes
RUN npm install -g concurrently

# Copy source code for backend and chatbot servers
COPY backend/ ./backend/
COPY chatbot-server/ ./chatbot-server/
COPY chatbot-server2/ ./chatbot-server2/

# Copy built frontend from Stage 1 to the location backend expects
COPY --from=build-frontend /app/frontend/dist ./frontend/dist

# Ensure the root package.json is fully there so we can run scripts
COPY package.json ./

# Expose backend port
EXPOSE 5000

# Start the application using the start:prod script
CMD ["npm", "run", "start:prod"]
