# QR Code Generator

Static QR code generator for Strathmore Alumni links.

## Deployment

This project is Vercel-ready as a static deployment:

- `index.html` is the root entry point
- `vercel.json` enables clean URLs and security headers
- `styles.css` and `app.js` are served as static assets

## Security notes

- Only `http`, `https`, `mailto`, `tel`, and `sms` destinations are accepted
- User input is rendered with DOM APIs instead of inline HTML event handlers
- A Content Security Policy is configured in `vercel.json`
- Data is stored only in the browser's local storage
