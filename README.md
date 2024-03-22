# UniFi Voucher Site

A small UniFi Voucher Site for simple voucher creation

[![Image Size](https://img.shields.io/docker/image-size/glenndehaan/unifi-voucher-site)](https://hub.docker.com/r/glenndehaan/unifi-voucher-site)

![Screenshot](https://github.com/glenndehaan/unifi-voucher-site/assets/7496187/64f199e6-5e50-4d91-8731-1f970c1f1210)

## Structure

- Javascript
- ExpressJS
- Node UniFi
- TailwindCSS

## Development Usage

- Install NodeJS 20.0 or higher.
- Run `npm ci` in the root folder
- Run `npm start` & `npm run tailwind` in the root folder

Then open up your favorite browser and go to http://localhost:3000/

## Build Usage

- Install NodeJS 20.0 or higher.
- Run `npm ci` in the root folder
- Run `npm run build` in the root folder

## Docker

- Code from master is build by Docker Hub
- Builds can be pulled by using this command: `docker pull glenndehaan/unifi-voucher-site`
- An example docker compose file can be found below:

```yaml
version: '3'
services:
  app:
    image: glenndehaan/unifi-voucher-site
    ports:
      - "3000:3000"
    environment:
      # The IP address to your UniFi OS Console
      UNIFI_IP: '192.168.1.1'
      # The port of your UniFi OS Console, this could be 443 or 8443
      UNIFI_PORT: 443
      # The username of a local UniFi OS account
      UNIFI_USERNAME: 'admin'
      # The password of a local UniFi OS account
      UNIFI_PASSWORD: 'password'
      # The UniFi Site ID
      UNIFI_SITE_ID: 'default'
      # The 'password' used to log in to the voucher portal and used as Bearer token for the API
      SECURITY_CODE: '0000'
      # Disables the login/authentication for the portal and API
      DISABLE_AUTH: 'false'
      # Voucher Types, format: expiration in minutes (required),single-use or multi-use vouchers value - '0' is for multi-use - '1' is for single-use (optional),upload speed limit in kbps (optional),download speed limit in kbps (optional),data transfer limit in MB (optional)
      # To skip a parameter just but nothing in between the comma's
      # After a voucher type add a semicolon, after the semicolon you can start a new voucher type
      VOUCHER_TYPES: '480,0,,,;'
      # Enable/disable the Web UI
      SERVICE_WEB: 'true'
      # Enable/disable the API
      SERVICE_API: 'false'
```

## Services

The project consists of two main services: Web and API.

### Web Service

The Web service is a user interface accessible through a web browser. It provides functionality for generating, viewing,
and managing vouchers within the UniFi system.

### API Service

The API service allows programmatic access to voucher-related functionalities. It is designed for developers who wish to
integrate voucher management into their applications or automate voucher generation processes. Below are the details of
the different endpoints available in the API:

#### Endpoints

1. **`/api`**
    - Method: GET
    - Description: Retrieves information about the API and its endpoints.
    - Access: Open
    - Response Example:

```json
{
  "error": null,
  "data": {
    "message": "OK",
    "endpoints": [
      "/api",
      "/api/types",
      "/api/voucher/:type"
    ]
  }
}
```

2. **`/api/types`**
    - Method: GET
    - Description: Retrieves a list of available voucher types supported by the system.
    - Response Format: JSON
    - Access: Open
    - Response Example:

```json
{
  "error": null,
  "data": {
    "message": "OK",
    "types": [
      {
        "expiration": "480",
        "usage": "0",
        "raw": "480,0,,,"
      }
    ]
  }
}
```

3. **`/api/voucher/:type`**
    - Method: GET
    - Description: Generates a voucher of the specified type.
    - Parameters:
        - `type` (string): The type of voucher to generate.
    - Response Format: JSON
    - Access: Protected by Bearer Token
    - Response Example:

```json
{
  "error": null,
  "data": {
    "message": "OK",
    "voucher": "12345-67890"
  }
}
```

   > This endpoint is protected by a security mechanism. To access it, users need to include a bearer token in the
   request authorization header. The token must match the value of the `SECURITY_CODE` environment variable. Without
   this token, access to the endpoint will be denied.

## License

MIT
