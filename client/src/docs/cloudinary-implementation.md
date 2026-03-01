# Cloudinary Implementation Documentation

This document outlines the Cloudinary integration for image storage and the PHP proxy setup used in the Nairobi DevOps Community website.

## Architecture Overview

The integration consists of a React frontend and a PHP-based backend proxy to securely handle Cloudinary API requests without exposing secrets.

### 1. PHP Proxy (`public_html/api/imagesCloudinary.php`)

- **Role**: Intermediate layer that communicates with the Cloudinary Admin API.
- **Security**: Accesses `CLD_API_KEY` and `CLD_API_SECRET` from server environment variables.
- **Verification**: Requires proper authentication (e.g., API keys, JWT, or authenticated session) to prevent unauthorized access. It also relies on CORS origin restrictions, input validation/sanitization, and should be served strictly over HTTPS. The `X-Requested-With: XMLHttpRequest` header may still be present for UX filtering but is not an access control mechanism.
- **Functionality**: Fetches resources from specified folders (e.g., `ndcCampusTour`) and returns them in a JSON format compatible with the frontend.

### 4. Same-origin Validation (Security & UX)

- **Files:** `client/public/api/luma.php`, `client/public/api/imagesCloudinary.php`
- **Change:** Backend proxies now use `Sec-Fetch-Site: same-origin` to identify requests from our own frontend. Combined with `X-Requested-With: XMLHttpRequest`, this allows the proxies to safely serve same-origin requests WITHOUT needing a bearer token embedded in the HTML.

### 5. Bearer Token Removal

- **Files:** `client/src/lib/lumaCalendar.ts`, `client/index.html` (verified)
- **Change:** Removed the strict requirement for the `api-bearer-token` in the frontend fetch logic. The token is now only included if present, and confirmed it is already removed from `index.html` to prevent accidental credential leakage.

### 6. Deployment Workflow Documentation Fix

- **File:** `.github/workflows/deploy.yml`
- **Change:** Updated comments to correctly state that FOUR secrets (including `PROXY_API_TOKEN`) are injected into the production environment's `.env.php` file.

## Validation

- **CI Checks:** Validated correct frontend format formatting via `npm run check`.
- **Build Verification:** Output compiled successfully via `npm run build` after modifications.
- **Audit:** Verified that `imagesCloudinary.php` is using `Authorization: Basic` for Cloudinary Admin API.
- **Security:** Confirmed `index.html` does not contain the `api-bearer-token` meta tag.

### 2. React Frontend Integration

#### Types (`src/types/cloudinary.ts`)

Defines the structure for Cloudinary resources and response objects.

#### Hook (`src/hooks/useCloudinaryFolder.ts`)

A custom hook used to fetch and manage image data from Cloudinary.

- **Parameters**: `folder` (the target Cloudinary folder).
- **Features**: Loading states, error handling, pagination (`next_cursor`), and retry logic.

#### Component (`src/components/CloudinaryImage.tsx`)

A wrapper around `@cloudinary/react`'s `AdvancedImage`.

- **Optimization**: Uses lazy loading (`lazyload()`), responsive scaling (`responsive()`), and placeholders (`placeholder()`).
- **Transformations**: Supports manual width/height scaling using `@cloudinary/url-gen`.

### 3. Usage Examples

#### `NdcCampusLogos`

- **Folder**: `ndcCampusTour`
- **Features**: Skeleton loading, automatic fallback to local data (`partnersData.ts`).

#### `SponsorsCarousel`

- **Folder**: `ndcPartners`
- **Implementation**: Uses `useCloudinaryFolder("ndcPartners")` to dynamically fetch partner logos.
- **Mapping**: Resources are mapped to the `Partner` interface. Note that the `website` property in `Partner` is now optional to accommodate logos directly fetched from Cloudinary.
- **Looping**: The fetched list is duplicated in the UI to ensure a seamless infinite scroll.
- **Fallback**: Gracefully switch to static `communityPartners` if the fetch fails or the folder is empty.

## Adding a New Cloudinary Folder

To add a new image folder for fetching on the frontend, follow these three steps:

### 1. Update the PHP Proxy

Add the new folder name to the `$allowedFolders` whitelist in the Cloudinary proxy file:

- **Source path**: `client/public/api/imagesCloudinary.php` (edit this first)
- **Deployed path**: `public_html/api/imagesCloudinary.php` (where the file exists on the server)

Locate the `$allowedFolders` variable in `imagesCloudinary.php` and add your new folder:

```php
$allowedFolders = [
    'ndcCampusTour',
    'ndcPartners',
    'yourNewFolderName', // Add here
];
```

### 2. Update Frontend Types

Add the folder name to the `CloudinaryFolder` union type in `client/src/types/cloudinary.ts`:

```typescript
export type CloudinaryFolder = "ndcCampusTour" | "ndcPartners" | "yourNewFolderName";
```

### 3. Implement in Component

Use the `useCloudinaryFolder` hook in your component:

```tsx
const { images, loading, error } = useCloudinaryFolder("yourNewFolderName");
```

## Configuration Requirements

### Environment Variables

- **Frontend**: `VITE_CLOUDINARY_CLOUD_NAME` must be defined in your `.env` file for the `CloudinaryImage` component to work.
- **Server (cPanel)**: The following must be set as environment variables (via cPanel "Environment Variables" interface, `.htaccess` `SetEnv`, or `php.ini`):
  - `CLD_CLOUD_NAME`
  - `CLD_API_KEY`
  - `CLD_API_SECRET`

### Deployment Notes

- Ensure the `api/imagesCloudinary.php` file is uploaded to the `public_html/api/` directory on the server.
- The `.htaccess` file includes rules to protect the `api` directory from direct browsing.

### `.htaccess` Security Configuration

To explicitly secure the `public_html/api/` directory so requests are correctly routed and restricted, you can place an `.htaccess` file inside `public_html/api/` with the following configuration:

```apache
# Disable directory browsing
Options -Indexes

# Force HTTPS for all API requests
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Restrict direct access to PHP files by requiring an Authorization header
<FilesMatch "\.php$">
    # NOTE: This only checks if the header EXISTS.
    # Actual token verification must be done securely within the PHP scripts using environment variables.

    # Example: Require the Authorization header to be present
    SetEnvIf Authorization "^(Bearer .*)$" HAS_AUTH
    Require env HAS_AUTH

    # Or, if configuring IP whitelisting:
    # Require ip 192.168.1.100
</FilesMatch>
```
