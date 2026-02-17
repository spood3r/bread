# Pin Node base image to a specific patch for reproducible builds.
# To pin to a digest, replace the ARG value with the image@sha256:... digest.
ARG NODE_BASE=node@sha256:6d9d5269cbe4088803e9ef81da62ac481c063b60cadbe8e628bfcbb12296d901
# Stage 1: install dependencies (deterministic)
FROM ${NODE_BASE} AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Stage 2: runtime image
FROM ${NODE_BASE}
WORKDIR /app
ENV NODE_ENV=production

# Copy only installed deps from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy app source
COPY . .

# Ensure the app files are owned by the non-root user so runtime can write DB
RUN chown -R node:node /app

# Run as non-root user provided by the official image
USER node

# Document the port and start
EXPOSE 3000
CMD ["node", "server.js"]
