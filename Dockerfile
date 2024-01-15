#
# Define OS
#
FROM alpine:3.19

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

# Bundle app source
COPY . .

# Install dependencies
RUN npm ci --only=production

# Create production build
RUN npm run build

#
# Setup app
#

# Expose app
EXPOSE 3000

# Set node env
ENV NODE_ENV=production

# Run app
CMD ["node", "/app/server.js"]
