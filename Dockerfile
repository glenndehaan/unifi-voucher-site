FROM alpine:3.13

# Install packages
RUN apk add --no-cache nginx nodejs npm

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . .

# Create production build
RUN npm ci --only=production && npm run build

# Expose app
EXPOSE 3001

# Run app
CMD ["node", "/usr/src/app/app/server.js"]
