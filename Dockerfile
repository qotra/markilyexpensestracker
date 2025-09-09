# Use Node.js official image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Create volume for database persistence
VOLUME ["/app/data"]

# Expose port (optional, for health checks)
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
