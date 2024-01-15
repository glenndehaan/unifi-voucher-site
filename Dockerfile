#=====================================================
# Build Stage
#=====================================================

#
# Define OS
#
FROM alpine:3.19 AS app

#
# Basic OS management
#

# Install packages
RUN apk add --no-cache nodejs npm

#
# Require app
#

# Create app directory
WORKDIR /app

# Bundle package.json and package-lock.json
COPY ./package.json ./package-lock.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Bundle application source
COPY . .

# Create a production build
RUN npm run build

#=====================================================
# Image Stage
#=====================================================

#
# Define OS
#
FROM alpine:3.19

#
# Basic OS management
#

# Install packages
RUN apk add --no-cache dumb-init nodejs

#
# Require app
#

# Create app directory
WORKDIR /app

#
# Setup app
#

# Expose app
EXPOSE 3000

# Set node env
ENV NODE_ENV=production

# Run app
CMD ["dumb-init", "node", "/app/server.js"]

#
# Bundle app
#

# Bundle from build image
COPY --from=app /app/node_modules ./node_modules
COPY --from=app /app/public/dist ./public/dist
COPY . .
