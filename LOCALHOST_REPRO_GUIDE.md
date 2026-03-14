# Localhost Repro Guide

This guide makes your measurable localhost business data reproducible from Git.

## What gets versioned
- Snapshot file: `data/localhost-measurements.json`
- Business entities for one admin profile:
  - Products
  - Bills
- No `.env` secrets are committed.

## 1) Export current localhost data to Git-tracked snapshot
Run from project root:

```powershell
Set-Location "D:\OneDrive\Desktop\complete_GENAI internship\VyaparAI"
node backend/scripts/exportLocalSnapshot.js abhishekhegdea@gmail.com
```

Optional custom output path:

```powershell
node backend/scripts/exportLocalSnapshot.js abhishekhegdea@gmail.com data/my-snapshot.json
```

## 2) Commit and push snapshot

```powershell
git add data/localhost-measurements.json backend/scripts/exportLocalSnapshot.js backend/scripts/importLocalSnapshot.js backend/package.json LOCALHOST_REPRO_GUIDE.md
git commit -m "chore: add localhost data snapshot export/import workflow"
git push origin main
```

## 3) Import snapshot on any machine
Run from project root after configuring backend `.env`:

```powershell
node backend/scripts/importLocalSnapshot.js data/localhost-measurements.json abhishekhegdea@gmail.com
```

Notes:
- Import replaces products and bills for the target admin only.
- If target admin does not exist, it is created with password from `LOCALHOST_IMPORT_ADMIN_PASSWORD` or fallback `admin123`.

## Package scripts
From `backend` folder:

```powershell
npm run export:localhost-data -- abhishekhegdea@gmail.com
npm run import:localhost-data -- ../data/localhost-measurements.json abhishekhegdea@gmail.com
```
