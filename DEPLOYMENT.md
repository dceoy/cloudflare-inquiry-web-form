# Deployment Guide

This guide provides step-by-step instructions for deploying the contact form to Cloudflare Pages with Resend email integration.

## Table of Contents

- [Prerequisites](#prerequisites)
- [1. Cloudflare Turnstile Setup](#1-cloudflare-turnstile-setup)
- [2. Resend Account Configuration](#2-resend-account-configuration)
- [3. Cloudflare Pages Project Setup](#3-cloudflare-pages-project-setup)
- [4. Environment Variables Configuration](#4-environment-variables-configuration)
- [5. Build and Deploy](#5-build-and-deploy)
- [6. Verification](#6-verification)
- [7. Troubleshooting](#7-troubleshooting)
- [8. Production Best Practices](#8-production-best-practices)

## Prerequisites

Before deploying, ensure you have:

- [ ] A Cloudflare account (free tier works)
- [ ] A Resend account (free tier: 100 emails/day, 3,000/month)
- [ ] A verified domain for sending emails (or use Resend's test domain)
- [ ] Your code in a Git repository (GitHub, GitLab, or Bitbucket)
- [ ] Node.js and pnpm installed locally for testing

## 1. Cloudflare Turnstile Setup

Turnstile is Cloudflare's CAPTCHA alternative that verifies users are human without friction.

### 1.1 Create a Turnstile Widget

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** in the left sidebar
3. Click **Add site**
4. Configure your widget:
   - **Site name**: `Contact Form` (or your preference)
   - **Domain**: Add your production domain (e.g., `example.com`)
     - For testing, you can add `localhost` or use the testing key
   - **Widget mode**: Choose **Managed** (recommended)
   - **Pre-Clearance**: Leave unchecked (default)
5. Click **Add**

### 1.2 Get Your Keys

After creating the widget, you'll receive two keys:

- **Site Key** (public): Used in the frontend, visible to users
- **Secret Key** (private): Used for server-side verification, keep secure

**Save both keys** - you'll need them for environment variables.

### 1.3 Testing Keys

For local development and testing, you can use Turnstile's dummy keys:

- **Dummy site key**: `1x00000000000000000000AA` (always passes)
- **Dummy secret**: `1x0000000000000000000000000000000AA` (always passes)

**Reference**: [Turnstile Documentation](https://developers.cloudflare.com/turnstile/get-started/)

## 2. Resend Account Configuration

Resend handles email delivery with a simple HTTP API.

### 2.1 Create a Resend Account

1. Go to [resend.com](https://resend.com/)
2. Sign up for a free account
3. Verify your email address

### 2.2 Verify Your Sender Domain

To send emails from your domain, you must verify it:

1. In the Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `example.com`)
4. Resend will provide DNS records to add:
   - **SPF record** (TXT)
   - **DKIM record** (TXT or CNAME)
   - **DMARC record** (TXT, recommended)
5. Add these records to your DNS provider (Cloudflare, if you use it for DNS)
6. Wait for verification (usually 5-30 minutes)
7. Refresh the page to confirm verification status shows **Verified**

**Using Resend's Test Domain**:

If you don't have a domain or want to test first, Resend provides a test domain:

- **From address**: `onboarding@resend.dev`
- **Limitation**: Can only send to the email address you signed up with
- **Use case**: Development and testing only

### 2.3 Create an API Key

1. In the Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Configure the key:
   - **Name**: `Contact Form Production` (or your preference)
   - **Permission**: Choose **Sending access** (recommended)
     - Full Access gives all permissions (use for development only)
   - **Domain**: Select your verified domain (or "All Domains")
4. Click **Add**
5. **Copy the API key immediately** - you won't be able to see it again
   - Format: `re_...` (starts with `re_`)
6. Store it securely (you'll add it to Cloudflare Pages secrets)

**Security Note**: Treat API keys like passwords. Never commit them to git or expose them in frontend code.

**Reference**: [Resend Quickstart](https://resend.com/docs/send-with-nodejs)

## 3. Cloudflare Pages Project Setup

### 3.1 Create a Pages Project

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** in the left sidebar
3. Click **Create application**
4. Select the **Pages** tab
5. Click **Connect to Git**

### 3.2 Connect Your Repository

1. Choose your Git provider (GitHub, GitLab, or Bitbucket)
2. Authorize Cloudflare to access your repositories
3. Select the repository containing your contact form
4. Click **Begin setup**

### 3.3 Configure Build Settings

1. **Project name**: Choose a unique name (e.g., `contact-form`)
   - This becomes your URL: `contact-form.pages.dev`
2. **Production branch**: `main` (or your default branch)
3. **Build settings**:
   - **Framework preset**: Select **Vite** (or None, then configure manually)
   - **Build command**: `pnpm run build`
   - **Build output directory**: `dist`
4. **Root directory**: Leave empty (use repository root)
5. Click **Save and Deploy**

### 3.4 Wait for Initial Deployment

- Cloudflare will build and deploy your site
- This may take 2-5 minutes
- The build may fail initially because environment variables aren't set yet - this is expected

## 4. Environment Variables Configuration

### 4.1 Navigate to Environment Variables

1. Go to your Pages project in the Cloudflare dashboard
2. Click **Settings** tab
3. Scroll down to **Environment variables**

### 4.2 Add Production Variables

Click **Add variables** and add the following for the **Production** environment:

#### Required Variables

| Variable Name             | Value                                   | Type     | Notes                        |
| ------------------------- | --------------------------------------- | -------- | ---------------------------- |
| `VITE_TURNSTILE_SITE_KEY` | Your Turnstile site key                 | Variable | Public, used in frontend     |
| `TURNSTILE_SECRET_KEY`    | Your Turnstile secret key               | Secret   | Private, server-side only    |
| `RESEND_API_KEY`          | Your Resend API key (starts with `re_`) | Secret   | Private, server-side only    |
| `EMAIL_FROM`              | `noreply@yourdomain.com`                | Variable | Must be from verified domain |
| `EMAIL_TO`                | `contact@yourdomain.com`                | Variable | Where form submissions go    |

#### Optional Variables

| Variable Name           | Value                        | Type     | Notes                                 |
| ----------------------- | ---------------------------- | -------- | ------------------------------------- |
| `EMAIL_REPLY_TO`        | (leave empty or set address) | Variable | Defaults to submitter's email         |
| `CORS_ALLOWED_ORIGINS`  | `https://yourdomain.com`     | Variable | Only needed for cross-origin requests |
| `RESEND_MAX_RETRIES`    | `2`                          | Variable | Number of retry attempts (default: 2) |
| `RESEND_TIMEOUT_MS`     | `5000`                       | Variable | API timeout in ms (default: 5000)     |
| `RESEND_RETRY_DELAY_MS` | `100`                        | Variable | Initial retry delay (default: 100)    |

**Variable vs. Secret**:

- **Variable**: Visible in logs, can be read by anyone with project access
- **Secret**: Encrypted, not visible in logs, use for sensitive data (API keys, tokens)

### 4.3 Add Preview/Development Variables (Optional)

If you want to test deployments on preview branches:

1. Switch to **Preview** environment tab
2. Add the same variables as Production (or use test values)
3. Consider using Turnstile's dummy keys for preview deployments

### 4.4 Environment Variables in Build

**Important**: The `VITE_*` prefixed variables are embedded into the frontend build at build time.

- These must be set **before** the build runs
- Changing them requires a new build/deployment
- They are visible in the browser's JavaScript bundle

Other variables (without `VITE_` prefix) are only available to Pages Functions at runtime and are not exposed to the frontend.

## 5. Build and Deploy

### 5.1 Trigger a Deployment

After setting environment variables:

1. Go to **Deployments** tab in your Pages project
2. Click **Create deployment** or push to your repository
3. Cloudflare will automatically:
   - Install dependencies (`pnpm install`)
   - Build the frontend (`pnpm run build`)
   - Deploy to the global edge network

### 5.2 Monitor Build Logs

1. Click on the deployment to view logs
2. Check for errors in:
   - Dependency installation
   - TypeScript compilation
   - Vite build
3. If the build fails, check:
   - `package.json` scripts are correct
   - `VITE_*` environment variables are set
   - No syntax errors in code

### 5.3 Automatic Deployments

Cloudflare Pages automatically deploys:

- **Production deployments**: When you push to the production branch (`main`)
- **Preview deployments**: When you push to other branches (great for testing)

Each preview deployment gets a unique URL like:
`<commit-hash>.<project-name>.pages.dev`

## 6. Verification

### 6.1 Test the Deployment

1. Visit your Pages URL (e.g., `contact-form.pages.dev`)
2. Open browser developer tools (F12)
3. Fill out the contact form with test data
4. Click **Send Message**
5. Verify:
   - Turnstile challenge appears and completes
   - Form shows "Success" message
   - Email arrives at `EMAIL_TO` address
   - Email has correct subject, content, and reply-to

### 6.2 Check Pages Functions Logs

1. In Cloudflare dashboard, go to your Pages project
2. Click **Functions** tab
3. View real-time logs to see:
   - Incoming requests
   - Turnstile verification results
   - Resend API responses
   - Any errors or warnings

**Note**: Logs are near real-time and retained for 24 hours on the free plan.

### 6.3 Test Error Scenarios

Verify error handling works:

1. **Invalid Turnstile**: Try to submit without completing the challenge
   - Expected: Error message about verification
2. **Missing fields**: Submit with empty required fields
   - Expected: Validation error
3. **Invalid email**: Use malformed email address
   - Expected: Validation error
4. **Long content**: Exceed character limits
   - Expected: Character counter prevents submission

## 7. Troubleshooting

### Common Issues

#### Build Fails: "Command not found: pnpm"

**Solution**: Cloudflare should auto-detect pnpm from `pnpm-lock.yaml`, but if not:

1. Go to **Settings** → **Builds & deployments**
2. Set **Build configuration** → **Package manager** to `pnpm`
3. Retry deployment

#### Email Not Sending: "Unable to deliver message"

**Possible causes**:

1. **Invalid `RESEND_API_KEY`**: Check key format (starts with `re_`)
2. **Domain not verified**: Verify sender domain in Resend dashboard
3. **`EMAIL_FROM` not from verified domain**: Must match verified domain
4. **Resend API issues**: Check [Resend Status](https://status.resend.com/)

**Debugging**:

- Check Pages Functions logs for Resend API error codes
- Test API key with curl:
  ```bash
  curl -X POST 'https://api.resend.com/emails' \
    -H 'Authorization: Bearer YOUR_API_KEY' \
    -H 'Content-Type: application/json' \
    -d '{"from":"you@yourdomain.com","to":"test@example.com","subject":"Test","text":"Test"}'
  ```

#### Turnstile Always Fails: "Turnstile verification failed"

**Possible causes**:

1. **Wrong `TURNSTILE_SECRET_KEY`**: Verify in Turnstile dashboard
2. **Domain mismatch**: Turnstile widget domain must match deployment domain
3. **Token reuse**: Tokens are single-use; refreshing the page generates a new token

**Debugging**:

- Check Pages Functions logs for Turnstile error codes
- Test with dummy keys first to isolate the issue
- Verify widget domain includes your Pages domain

#### CORS Error: "Access to fetch blocked by CORS policy"

**When this happens**:

- Only if calling the API from a different domain than where it's hosted

**Solution**:

1. Add `CORS_ALLOWED_ORIGINS` environment variable
2. Set value to comma-separated list: `https://yourdomain.com,https://www.yourdomain.com`
3. Redeploy to apply changes

**Note**: Same-origin requests (frontend and API on same domain) don't need CORS configuration.

#### Environment Variable Not Working

**Checklist**:

1. Variable name is spelled correctly (case-sensitive)
2. Variable is set for the correct environment (Production vs Preview)
3. For `VITE_*` variables: Redeploy after changing (build-time embedding)
4. For runtime variables: They may take a minute to propagate

**Verify variables**:

- Check **Settings** → **Environment variables** in dashboard
- Temporarily log them in Functions (for non-secret values) to confirm

### Getting Help

If issues persist:

1. **Cloudflare Community**: [community.cloudflare.com](https://community.cloudflare.com/)
2. **Resend Support**: [resend.com/docs](https://resend.com/docs)
3. **GitHub Issues**: Check the repository issues for known problems

## 8. Production Best Practices

### Security

1. **Use Secrets for sensitive data**: `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`
2. **Rotate API keys periodically**: Create new keys, update environment variables
3. **Monitor failed requests**: Watch Pages Functions logs for suspicious activity
4. **Rate limiting**: Consider adding rate limits if abuse is detected (Cloudflare Workers can help)
5. **Content validation**: The form already validates input length and format - don't remove these checks

### Performance

1. **Edge caching**: Cloudflare Pages automatically caches static assets globally
2. **Retry configuration**: Adjust `RESEND_MAX_RETRIES` and `RESEND_TIMEOUT_MS` based on your needs
   - Higher retries = better reliability, but slower failure responses
   - Lower timeout = faster error detection, but may fail on slow networks
3. **Monitoring**: Use Cloudflare Analytics to track:
   - Page views and performance
   - API request volume
   - Error rates

### Reliability

1. **Test in Preview**: Use preview deployments to test changes before production
2. **Gradual rollouts**: Use Cloudflare's rollback feature if issues arise
3. **Backup email**: Consider setting up multiple `EMAIL_TO` addresses (modify code to send to array)
4. **Status monitoring**: Subscribe to [Cloudflare Status](https://www.cloudflarestatus.com/) and [Resend Status](https://status.resend.com/)

### Cost Optimization

**Cloudflare Pages** (Free tier limits):

- 500 builds per month
- 100,000 requests per day
- Unlimited bandwidth

**Resend** (Free tier limits):

- 100 emails per day
- 3,000 emails per month
- 1 API key

**Recommendations**:

- Monitor usage in dashboards
- Set up billing alerts before hitting limits
- Upgrade to paid plans if needed (Resend starts at $20/month for 50,000 emails)

### Maintenance

1. **Keep dependencies updated**: Run `pnpm update` regularly and test
2. **Review logs monthly**: Check for unusual patterns or errors
3. **Test form quarterly**: Manually verify end-to-end functionality
4. **Domain renewal**: Don't let your domain expire (email sending will break)
5. **Backup configuration**: Document all environment variables in a secure location

---

## Deployment Checklist

Use this checklist for each deployment:

### Pre-Deployment

- [ ] Turnstile widget created and keys saved
- [ ] Resend account created and API key generated
- [ ] Sender domain verified in Resend
- [ ] Code tested locally with `.dev.vars`
- [ ] All tests passing (`pnpm test`)
- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)

### Cloudflare Pages Setup

- [ ] Pages project created and connected to Git
- [ ] Build command set to `pnpm run build`
- [ ] Build output directory set to `dist`
- [ ] Framework preset set to Vite (or build command configured)

### Environment Variables

- [ ] `VITE_TURNSTILE_SITE_KEY` set (Production)
- [ ] `TURNSTILE_SECRET_KEY` set as secret (Production)
- [ ] `RESEND_API_KEY` set as secret (Production)
- [ ] `EMAIL_FROM` set with verified domain (Production)
- [ ] `EMAIL_TO` set to destination mailbox (Production)
- [ ] Optional: `EMAIL_REPLY_TO`, `CORS_ALLOWED_ORIGINS`, retry settings

### Post-Deployment

- [ ] Build completes successfully
- [ ] Site loads without errors
- [ ] Test form submission with real data
- [ ] Verify email delivery to `EMAIL_TO`
- [ ] Check email format (subject, body, reply-to)
- [ ] Review Pages Functions logs for errors
- [ ] Test on multiple devices/browsers
- [ ] Set up monitoring/alerts for errors

### Custom Domain (Optional)

- [ ] Custom domain added in Pages settings
- [ ] DNS records configured (CNAME)
- [ ] SSL certificate provisioned (automatic)
- [ ] Update Turnstile widget domain if needed

---

## Quick Reference

### Useful Links

- **Cloudflare Dashboard**: https://dash.cloudflare.com/
- **Turnstile Documentation**: https://developers.cloudflare.com/turnstile/
- **Resend Dashboard**: https://resend.com/overview
- **Resend API Documentation**: https://resend.com/docs/api-reference/emails/send-email
- **Pages Functions Documentation**: https://developers.cloudflare.com/pages/functions/
- **Hono Documentation**: https://hono.dev/docs/getting-started/cloudflare-pages

### Support

- **Cloudflare Community**: https://community.cloudflare.com/
- **Cloudflare Support**: https://dash.cloudflare.com/?to=/:account/support
- **Resend Support**: [resend.com/docs](https://resend.com/docs) or email support@resend.com

---

**Need help?** Check the [README.md](./README.md) for local development setup or open an issue in the repository.
