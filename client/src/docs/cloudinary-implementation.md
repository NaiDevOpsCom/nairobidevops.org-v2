# Cloudinary Implementation Documentation

This document outlines the Cloudinary integration for image storage and the PHP proxy setup used in the Nairobi DevOps Community website.

## Architecture Overview

The integration consists of a React frontend and a PHP-based backend proxy to securely handle Cloudinary API requests without exposing secrets.

### 1. PHP Proxy Architecture

The Cloudinary integration uses a hardened proxy layer to securely interact with the Admin API.

- **File**: `client/public/api/imagesCloudinary.php`
- **Security Logic**:
  - **Shared Config**: Use `config-loader.php` to load credentials from `~/config/secrets.env.php`.
  - **Utilities**: Use `security-utils.php` for origin validation and rate limiting.
  - **IP-Based Rate Limiting**: Prevents brute-force probing of Cloudinary folders.
  - **Disk Caching**: Responses are cached in `~/cache/api_responses/` to reduce upstream load and stay within API limits.
- **Authentication**: Requires a valid `X-Proxy-Token` or a trusted AJAX request from the primary domain.

### 2. Deployment & Secret Management

Secrets are managed centrally via GitHub Secrets and injected into a shared directory on the server during deployment.

**Secrets Injected:**

- `CLD_CLOUD_NAME`
- `CLD_API_KEY`
- `CLD_API_SECRET`
- `PROXY_API_TOKEN` (Supports JSON array for rotation)

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
