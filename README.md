# UniFi Voucher Site

A small UniFi Voucher Site for simple voucher creation

[![Build Status](https://img.shields.io/docker/cloud/build/glenndehaan/unifi-voucher-site.svg)](https://hub.docker.com/r/glenndehaan/unifi-voucher-site) [![Build Status](https://img.shields.io/docker/cloud/automated/glenndehaan/unifi-voucher-site.svg)](https://hub.docker.com/r/glenndehaan/unifi-voucher-site)

## Structure
- ES6 Javascript
- SCSS
- Node UniFi
- Webpack

## Development Usage
- Install NodeJS 8.0 or higher.
- Run `npm ci` in the root folder
- Run `npm start` in the root folder

Then open up your favorite browser and go to http://localhost:3001/

## Build Usage
- Install NodeJS 8.0 or higher.
- Run `npm ci` in the root folder
- Run `npm run build` in the root folder

## Docker
- Code from master is build by Docker Hub
- Builds can be pulled by using this command: `docker pull glenndehaan/unifi-voucher-site`

## License

MIT
