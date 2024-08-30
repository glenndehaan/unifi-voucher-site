# Unifi Identity Enterprise (UID)

## 1. UID Application Configuration

### Step 1: Log in to your Identity Enterprise Worksapce

1. Access the UID workspace (e.g., `https://your-site.ui.com`).
2. Log in with your credentials.

![UID-Workspace](images/unifi-workspace.png)

### Step 2: Navigate to the Manager portal and create a new application

1. Select the `Manager Portal`. You will be promoted to verify with MFA.
2. Onced singed in select `SSO Apps` in the left-hand menu.
3. Press the Plus button in the top right-hand corner.
4. Select `Add Custom App`
5. Select `OIDC` from the menu
6. You will now fill in the details for your application.
   The crucial fields needed are `Initiate Sign-In URI` and `Sign-In Redirect URI`.

   Initiate Sign-In URI - (e.g., `https://your-domain.com`)
   Sign-In Redirect URI - (e.g., `https://your-domain.com/callback`)

7. Press Add. You will now be presented with your Tool Collection for the app. Copy your `Client ID`,`Client Secret` and the value form your `Well known coonfig endpoint`.
8. Press Done. You can now assign users or groups to the application. The setup has been completed UID side.

 ![UID-Manager-Portal](images/UID-Manager-Portal.png) ![UID-SSO-APPS](images/UID-SSO-APPS.png) ![uid-custom-app](images/uid-custom-app.png) ![uid-oidc](images/uid-oidc.png) ![uid-demo-oidc-app](images/uid-demo-oidc-app.png) ![uid-tool-collection-app](images/uid-tool-collection-app.png)

### Step 3: Create or update your application configuration

> Attention!: UID currently onnly supports the `confidential` client type.

1. Copy the values from your `Well known coonfig endpoint`, `Client ID` and `Client Secret` into your application configuration. Then set the AUTH_OIDC_CLIENT_TYPE to `confidential`.

`docker-compose.yml`
```yaml
      AUTH_OIDC_ISSUER_BASE_URL: 'https://your-domain.com/gw/idp/api/v1/public/oauth/your-secret-token/.well-known/openid-configuration'
      AUTH_OIDC_APP_BASE_URL: 'your-domain.com'
      AUTH_OIDC_CLIENT_ID: 'atlafa3i2j5ebhna5ds3hsxpx'
      AUTH_OIDC_CLIENT_TYPE: 'confidential'
      AUTH_OIDC_CLIENT_SECRET: 'vcusek6ixxjgxvvo57dqohxcjtjlqfutldvtbgycmpqltzt7zo'
```

2. Build your application or update it.

```bash
sudo docker-compose up -d
```

```bash
sudo docker-compose up -d --force-recreate
```

### Testin OIDC Sing-In

**From `UID Workspace`**

Naviage to the Applications section and select your application. This will launch the application. If you follwed the steps correctly you should be able to access the voucher site without needing to authenticate.

![uid-demo-app-launcher](images/uid-demo-app-launcher.png)

![demo-signin](images/demo-signin.png)

![uid-oidc-signin-success](images/uid-oidc-sigin-success.png)


**External Sign In form outside of UID**

> Notice: You will only be propted for UID signin if you have not signed in within your predefined sign in policy in UID.

Access your application via the `Initiate Sign-In URI` this will prompt a new window to sign in to UID. Once you sign in you will be redirected back to your application.

![uid-signin}](images/uid-signin.png) ![demo-signin](images/demo-signin.png) ![uid-oidc-signin-success](images/uid-oidc-sigin-success.png)

Thats it you now have OIDC setup and can sign in to your application!
