FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create directory for database
RUN mkdir -p /app/data

# Expose port (not really needed for telegram bot, but good practice)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
