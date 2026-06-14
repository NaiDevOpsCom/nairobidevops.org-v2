# Deployment Documentation

This document describes the deployment implementation for the NDC Redesign Website.

## Overview

The project uses GitHub Actions for CI/CD, deploying to a cPanel-hosted server via SSH and RSync. The deployment process is designed to be **atomic**, ensuring zero downtime and easy rollbacks.

## Deployment Workflow

Production deployment is defined in [.github/workflows/deploy.yml](../.github/workflows/deploy.yml). Staging deployment is defined in [.github/workflows/staging-deploy.yml](../.github/workflows/staging-deploy.yml).

### Triggers

1. **Push to `main`**: Automatically triggers a deployment when changes are merged into the main branch. The workflow monitors the following paths:
   - `client/src/**`
   - `client/public/**`
   - `package.json`
   - `package-lock.json`
   - `vite.config.ts`
   - `tsconfig.json`
   - `.github/workflows/deploy.yml`
2. **Manual Trigger (`workflow_dispatch`)**: Allows manual execution of the workflow from the GitHub "Actions" tab for any branch.

### Prerequisites (GitHub Secrets)

The following secrets must be configured in the GitHub repository:

- `SSH_PRIVATE_KEY_B64`: Base64-encoded private SSH key for server access. Preferred for both staging and production because it avoids multiline copy/paste issues.
- `SSH_PRIVATE_KEY`: Raw private SSH key for server access (OpenSSH format). Use this only if not using `SSH_PRIVATE_KEY_B64`.
- `KNOWN_HOSTS`: SSH known hosts for identity verification (use `ssh-keyscan` to obtain this).
- `REMOTE_HOST`: Server IP or hostname.
- `REMOTE_USER`: SSH username.
- `REMOTE_PORT`: SSH port (defaults to 22).
- `REMOTE_PATH`: The final path where the website should be accessible (e.g., `/home/user/public_html`).

### Rotating Deploy SSH Keys

Use a dedicated, unencrypted deploy key for GitHub Actions. Do not reuse your personal SSH key.

On your local machine, generate a new key pair:

```bash
ssh-keygen -t ed25519 -C "github-actions-ndc-deploy" -f ./ndc-deploy-key -N ""
```

This creates two files:

- `ndc-deploy-key`: private key. Convert this to base64 and paste it into the GitHub environment secret `SSH_PRIVATE_KEY_B64`.
- `ndc-deploy-key.pub`: public key. Add this to the cPanel SSH authorized keys for `REMOTE_USER`.

On PowerShell, create the base64 value with:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\ndc-deploy-key"))
```

Paste the command output into the target GitHub environment secret `SSH_PRIVATE_KEY_B64` (`staging` or `production`).

If you use the raw `SSH_PRIVATE_KEY` secret instead, it must include the full private key text, including these wrapper lines:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

The public key starts with `ssh-ed25519`. That value belongs on the server only; it will fail if pasted into `SSH_PRIVATE_KEY`.

After adding the public key in cPanel, authorize it if cPanel requires a separate "Manage Authorization" step. Then verify these related secrets:

- `KNOWN_HOSTS`: output from `ssh-keyscan -p <REMOTE_PORT> <REMOTE_HOST>`.
- `REMOTE_HOST`: cPanel server hostname or IP.
- `REMOTE_USER`: cPanel SSH user.
- `REMOTE_PORT`: SSH port, usually `22`.

If a deploy fails with `The deploy key secret could not be parsed by ssh-keygen`, replace `SSH_PRIVATE_KEY_B64` with a base64 value generated directly from the private key file and confirm the key is not passphrase-protected.

## Implementation Details

### 1. Build Process

The build process runs on `ubuntu-latest`:

- Installs dependencies using `npm ci`.
- Generates security headers via `npm run security:generate`.
- Builds the production assets using `npm run build`.
- Validates that the `dist` directory is not empty.

### 2. Atomic Deployment Mechanism

Instead of overwriting the existing site, the workflow uses a release-based structure for true atomic updates:

1. **Timestamp Generation**: A unique timestamp (`RELEASE_TIMESTAMP`) is created for each deployment.
2. **Release Directory**: A new directory is created on the server: `/home/${user}/releases/${timestamp}`.
3. **Sync**: Files from the `dist` directory are synced to the new release directory using `scp`. The target path must end with `.` (e.g., `./dist/.`) to ensure hidden files like `.htaccess` are included.
4. **Atomic Symlink Switch**: The workflow uses a "Create-and-Move" pattern to ensure atomicity and compatibility with cPanel:
   - A check verifies that the `REMOTE_PATH` is a symbolic link. If it's a physical directory, the workflow will fail with instructions to rename it.
   - A temporary symlink is created pointing to the new release.
   - The `mv -Tf` command atomically replaces the current `REMOTE_PATH` with the new symlink.
5. **Cleanup**: The workflow automatically removes old releases, keeping only the last 5 versions to save disk space.

### 3. Supply-Chain Security

- **Pinned Actions**: All GitHub Actions are pinned to full commit SHAs (e.g., `appleboy/ssh-action@7eaf766...`) rather than mutable version tags. This prevents "tag retargeting" attacks and ensures the exact same code runs every time.
- **Safe Secret Handling**: Multi-line secrets like `SSH_PRIVATE_KEY` and `KNOWN_HOSTS` are written using `printf` to avoid interpretation of special characters.

### 4. Verification & Rollback

- **Verification**: After deployment, check the website URL to ensure the new changes are live.
- **Rollback**: To roll back to a previous version, manually update the symlink on the server:

  ```bash
  ln -sfn /home/user/releases/OLD_TIMESTAMP /home/user/public_html.tmp
  mv -Tf /home/user/public_html.tmp /home/user/public_html
  ```

## Testing Your Deployment

Before merging to `main`, you can test your deployment workflow using one of these methods:

### Manual Dispatch (Recommended)

1. Push your feature branch to GitHub.
2. Go to **Actions** -> **Deploy to cPanel**.
3. Click **Run workflow**, select your branch, and click **Run workflow**.

### Local Testing with `act`

If you have Docker installed, you can test the workflow locally:

```bash
act --secret-file .secrets
```

_(Make sure `.secrets` contains values for all required GitHub Secrets)_

---

> [!TIP]
> Always verify that your build passes locally with `npm run build` before pushing to GitHub.
