FROM node:18-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Create directory for database
RUN mkdir -p /app/data

# Expose port (not really needed for telegram bot, but good practice)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
