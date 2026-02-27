# Cloudinary Implementation Documentation

This document outlines the Cloudinary integration for image storage and the PHP proxy setup used in the Nairobi DevOps Community website.

## Architecture Overview

The integration consists of a React frontend and a PHP-based backend proxy to securely handle Cloudinary API requests without exposing secrets.

### 1. PHP Proxy (`public_html/api/imagesCloudinary.php`)

- **Role**: Intermediate layer that communicates with the Cloudinary Admin API.
- **Security**: Accesses `CLD_API_KEY` and `CLD_API_SECRET` from server environment variables.
- **Verification**: Requires proper authentication (e.g., API keys, JWT, or authenticated session) to prevent unauthorized access. It also relies on CORS origin restrictions, input validation/sanitization, and should be served strictly over HTTPS. The `X-Requested-With: XMLHttpRequest` header may still be present for UX filtering but is not an access control mechanism.
- **Functionality**: Fetches resources from specified folders (e.g., `ndcCampusTour`) and returns them in a JSON format compatible with the frontend.

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

### 3. Usage Example: `NdcCampusLogos`

The `NdcCampusLogos` component demonstrates a robust implementation:

1. Fetches data with `useCloudinaryFolder("ndcCampusTour")`.
2. Displays a **Skeleton loading state** while the initial fetch is in progress.
3. Automatically **falls back** to local data (`partnersData.ts`) if the fetch fails or the folder is empty.
4. Maintains high performance with cached images and optimized transformations.

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
