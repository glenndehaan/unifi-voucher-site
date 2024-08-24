# UniFi Voucher Site

UniFi Voucher Site is a web-based platform for generating and managing UniFi network guest vouchers

[![Image Size](https://img.shields.io/docker/image-size/glenndehaan/unifi-voucher-site)](https://hub.docker.com/r/glenndehaan/unifi-voucher-site)

![Vouchers Overview - Desktop](https://github.com/glenndehaan/unifi-voucher-site/assets/7496187/b0d5c208-2ac7-444e-977d-31287ff19e8b)

> Upgrading from 2.x to 3.x? Please take a look at the [migration guide](#migration-from-2x-to-3x)

## Features

- **Voucher Management**: Create, view, and manage vouchers with customizable options for expiration, data limits, and speeds.
- **OIDC Support**: Integrates OpenID Connect for secure user authentication and single sign-on (SSO).
- **Web and API Services**: Access the service via a web interface or integrate with other systems using a REST API.
- **Docker Support**: Easily deploy using Docker, with customizable environment settings.
- **Home Assistant Add-on**: Seamlessly integrate with Home Assistant for centralized management.
- **Receipt Printing**: Supports printing vouchers with 80mm thermal printers.
- **Email Functionality**: Automatically send vouchers via SMTP.

## Structure

- NodeJS
- ExpressJS
- EJS
- Node UniFi
- TailwindCSS
- NodeMailer
- PDFKit

## Installation

### Docker

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
      # The password used to log in to the voucher portal Web UI
      AUTH_PASSWORD: '0000'
      # The Bearer token used for the API
      AUTH_TOKEN: '00000000-0000-0000-0000-000000000000'
      # OIDC issuer base url provided by oauth provider. Example: https://auth.example.com/.well-known/openid-configuration
      AUTH_OIDC_ISSUER_BASE_URL: ''
      # OIDC UniFi Voucher base url (This application). Example: https://voucher.example.com
      AUTH_OIDC_APP_BASE_URL: ''
      # OIDC client id provided by oauth provider
      AUTH_OIDC_CLIENT_ID: ''
      # Disables the login/authentication for the portal and API
      AUTH_DISABLE: 'false'
      # Voucher Types, format: expiration in minutes (required),single-use or multi-use vouchers value - '0' is for multi-use - '1' is for single-use (optional),upload speed limit in kbps (optional),download speed limit in kbps (optional),data transfer limit in MB (optional)
      # To skip a parameter just but nothing in between the comma's
      # After a voucher type add a semicolon, after the semicolon you can start a new voucher type
      VOUCHER_TYPES: '480,1,,,;'
      # Allow users to create custom vouchers types within the UI
      VOUCHER_CUSTOM: 'true'
      # Enable/disable the Web UI
      SERVICE_WEB: 'true'
      # Enable/disable the API
      SERVICE_API: 'false'
      # SMTP Mail from email address (optional)
      SMTP_FROM: ''
      # SMTP Mail server hostname/ip (optional)
      SMTP_HOST: ''
      # SMTP Mail server port (optional)
      SMTP_PORT: ''
      # SMTP Mail use TLS? (optional)
      SMTP_SECURE: 'false'
      # SMTP Mail username (optional)
      SMTP_USERNAME: ''
      # SMTP Mail password (optional)
      SMTP_PASSWORD: ''
      # Sets the application Log Level (Valid Options: error|warn|info|debug|trace)
      LOG_LEVEL: 'info'
```

> Attention!: We recommend only using Local UniFi accounts due to short token lengths provided by UniFi Cloud Accounts. Also, UniFi Cloud Accounts using 2FA won't work!

> Note: When creating a Local UniFi account ensure you give 'Full Management' access rights to the Network controller. The 'Hotspot Role' won't give access to the API and therefore the application will throw errors.

### Home Assistant Add-on

For users of Home Assistant, we provide a dedicated add-on to seamlessly integrate the UniFi Voucher Site with your Home Assistant instance. This add-on simplifies the setup process and allows you to manage UniFi vouchers directly from your Home Assistant dashboard.

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fglenndehaan%2Fha-addons)

#### Manual Installation

To install the UniFi Voucher Site add-on for Home Assistant, follow these steps:

1. Open the Supervisor panel in your Home Assistant instance.
2. Navigate to the "Add-on Store."
3. Add our repository to the list of repositories by clicking the three dots in the upper-right corner, then selecting "Repositories," and entering the URL of our repository: `https://github.com/glenndehaan/ha-addons`.
4. Once the repository is added, you will find the "UniFi Voucher Site" add-on in the add-on store. Click on it.
5. Click "Install" and wait for the installation to complete.

## Development

- Install NodeJS 20.0 or higher.
- Run `npm ci` in the root folder
- Run `npm start` & `npm run tailwind` in the root folder

Then open up your favorite browser and go to http://localhost:3000/

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
      "/api/voucher/:type",
      "/api/vouchers"
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
   request authorization header. The token must match the value of the `AUTH_TOKEN` environment variable. Without
   this token, access to the endpoint will be denied.

4. **`/api/vouchers`**
    - Method: GET
    - Description: Retrieves a list of available vouchers.
    - Response Format: JSON
    - Access: Protected by Bearer Token
    - Response Example:

```json
{
  "error": null,
  "data": {
    "message": "OK",
    "vouchers": [
      {
        "code": "15695-53133",
        "type": "multi",
        "duration": 60,
        "data_limit": "200",
        "download_limit": "5000",
        "upload_limit": "2000"
      },
      {
        "code": "03004-59449",
        "type": "single",
        "duration": 480,
        "data_limit": null,
        "download_limit": null,
        "upload_limit": null
      }
    ],
    "updated": 1712934667937
  }
}
```

> This endpoint is protected by a security mechanism. To access it, users need to include a bearer token in the
request authorization header. The token must match the value of the `AUTH_TOKEN` environment variable. Without
this token, access to the endpoint will be denied.

## Print Functionality

The UniFi Voucher Site application includes built-in support for printing vouchers using 80mm receipt printers, offering a convenient way to distribute vouchers in physical format.

### Compatibility

The print functionality is compatible with most 80mm thermal receipt printers commonly used in various industries. These printers typically use thermal printing technology, eliminating the need for ink cartridges and ensuring efficient and cost-effective voucher printing.

### Usage

Once your 80mm receipt printer is configured and connected, you can easily print vouchers directly from the UniFi Voucher Site application. Simply navigate to the voucher within the interface and click on the "Print" button.

The application will automatically format the voucher for 80mm paper width, ensuring optimal printing results. Depending on your printer settings and preferences, you may adjust print quality, paper type, and other printing parameters to suit your needs.

### Example Print PDF

![Example Print PDF](https://github.com/glenndehaan/unifi-voucher-site/assets/7496187/e86d0789-47d2-4630-a7fe-291a4fa9502f)

## Email Functionality

The UniFi Voucher Site includes a convenient email feature that allows you to send vouchers directly to users from the web interface. By configuring the SMTP settings, you can enable email sending and make it easy to distribute vouchers digitally.

### Configuration

To enable the email feature, you need to set the following environment variables with your SMTP server details:

```env
SMTP_FROM: ''
SMTP_HOST: ''
SMTP_PORT: ''
SMTP_SECURE: ''
SMTP_USERNAME: ''
SMTP_PASSWORD: ''
```

Here’s what each variable represents:

- **`SMTP_FROM`**: The sender email address that will appear in the "From" field when users receive the voucher.
- **`SMTP_HOST`**: The hostname or IP address of your SMTP server (e.g., `smtp.example.com`).
- **`SMTP_PORT`**: The port used by your SMTP server (e.g., `587` for TLS or `465` for SSL).
- **`SMTP_SECURE`**: Set to `true` if your SMTP server requires a secure connection (SSL/TLS), or `false` if it does not.
- **`SMTP_USERNAME`**: The username for authenticating with your SMTP server.
- **`SMTP_PASSWORD`**: The password for authenticating with your SMTP server.

These settings allow the application to connect to your SMTP server and send emails on your behalf.

### Usage

Once the SMTP environment variables are configured, the email feature will be available within the UniFi Voucher Site interface. After generating a voucher, you will see an option to send the voucher via email. Enter the recipient's email address, and the application will send the voucher details directly to their inbox.

### Example Email

![Example Email](https://github.com/user-attachments/assets/45615db3-df76-48b0-ad30-05236e3754c1)

## OpenID Connect (OIDC) Authentication

The UniFi Voucher Site allows seamless integration with OpenID Connect (OIDC), enabling users to authenticate through their preferred identity provider (IdP). The setup is straightforward, requiring configuration through environment variables to align with your existing OIDC provider.

### Configuration

To enable OIDC authentication, set the following environment variables in your application’s environment:

- **`AUTH_OIDC_ISSUER_BASE_URL`**:
  The base URL of your OIDC provider. This is typically the URL where the well-known OIDC configuration is hosted (e.g., `https://auth.example.com/.well-known/openid-configuration`).

- **`AUTH_OIDC_APP_BASE_URL`**:
  The base URL of your UniFi Voucher Site application. This should be the public URL where the site is accessible to users (e.g., `https://voucher.example.com`).

- **`AUTH_OIDC_CLIENT_ID`**:
  The client ID registered with your OIDC provider. This value is specific to the OIDC client created for the UniFi Voucher Site.

> Please note that **enabling OIDC support will automatically disable the built-in login system**. Once OIDC is activated, all user authentication will be handled through your configured identity provider, and the local login mechanism will no longer be available.

### OIDC Client Configuration

When configuring your OIDC client, ensure that the following settings are enabled:

- **Implicit Flow Support**: The OIDC client **must** support the Implicit flow. This is essential as the UniFi Voucher Site relies on this flow for authentication.

## Screenshots

### Login (Desktop)
![Login - Desktop](https://github.com/glenndehaan/unifi-voucher-site/assets/7496187/5f89ecbd-7e03-4fd0-ae7d-279d16321384)

### Vouchers Overview (Desktop)
![Vouchers Overview - Desktop](https://github.com/glenndehaan/unifi-voucher-site/assets/7496187/b0d5c208-2ac7-444e-977d-31287ff19e8b)

### Create Voucher (Desktop)
![Create Voucher - Desktop](https://github.com/glenndehaan/unifi-voucher-site/assets/7496187/72f8dcf0-6642-4c89-849f-21cfbcc488ab)

### Voucher Details (Desktop)
![Voucher Details - Desktop](https://github.com/glenndehaan/unifi-voucher-site/assets/7496187/b84ad74c-afaa-4bf1-8bc1-398fb0450ff1)

### Login (Mobile)
![Login - Mobile](https://github.com/glenndehaan/unifi-voucher-site/assets/7496187/d74bc487-5b80-4bb6-8617-da870cdf4cec)

### Vouchers Overview (Mobile)
![Voucher Overview - Mobile](https://github.com/glenndehaan/unifi-voucher-site/assets/7496187/c986e03d-5edf-4b04-8903-0b42ff1c4fc9)

### Create Voucher (Mobile)
![Create Voucher - Mobile](https://github.com/glenndehaan/unifi-voucher-site/assets/7496187/f1cef8c8-a7a5-4238-8a2e-461835375f29)

### Voucher Details (Mobile)
![Voucher Details - Mobile](https://github.com/glenndehaan/unifi-voucher-site/assets/7496187/28b8f97b-8042-4e6d-b1dc-8386860a1e39)

## Migration Guide

### Migration from 2.x to 3.x

When upgrading from 2.x to 3.x, the following changes need to be made:

1. **`SECURITY_CODE`** has been replaced by **`AUTH_PASSWORD`**.
    - Update your environment variables configuration to use `AUTH_PASSWORD` instead of `SECURITY_CODE`.

2. **`DISABLE_AUTH`** has been replaced by **`AUTH_DISABLE`**.
    - Replace `DISABLE_AUTH` with `AUTH_DISABLE` in your environment variables.

3. The API bearer token now uses a dedicated variable **`AUTH_TOKEN`**.
    - Ensure that your API token is now stored under the `AUTH_TOKEN` variable and update your implementations to used this new token instead of the `SECURITY_CODE`.

### Migration from 1.x to 2.x

No migration steps are required.

### Migration from Versions Prior to v1

Versions before v1 do not have a direct migration path. If you are using a version earlier than v1, a fresh installation is required. Be sure to back up any important data before proceeding with a reinstall.

## License

MIT
