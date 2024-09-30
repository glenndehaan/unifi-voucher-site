#=====================================================
# Build Stage (1/2)
#=====================================================

#
# Define OS
#
FROM alpine:3.20 AS dependencies

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

#=====================================================
# Build Stage (2/2)
#=====================================================

#
# Define OS
#
FROM alpine:3.20 AS css

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
RUN npm ci && npm cache clean --force

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
FROM alpine:3.20

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

# Setup healthcheck
HEALTHCHECK --interval=10s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/_health || exit 1

# Run app
CMD ["dumb-init", "node", "/app/server.js"]

#
# Setup non-root user
#
RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node;

#
# Set build
#
RUN echo -n `date '+%Y.%m.%d.%H.%M'` > /etc/unifi_voucher_site_build

#
# Continue as non-root user
#
USER node

#
# Bundle app
#

# Bundle from build image
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=css /app/public/dist ./public/dist
COPY --chown=node:node . .
