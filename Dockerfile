FROM node:18-alpine

WORKDIR /app

# Install Python and build tools needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Rebuild native modules for the container architecture
RUN npm rebuild

# Build the application
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Set production environment after build
ENV NODE_ENV=production

# Create directory for database
RUN mkdir -p /app/data

# Expose port (not really needed for telegram bot, but good practice)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
