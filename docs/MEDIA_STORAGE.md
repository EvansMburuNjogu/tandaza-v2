# Media Storage

Tandaza supports local filesystem storage for simple development and S3-compatible object storage for MinIO or cloud buckets.

## Recommended Setup

- Local development: MinIO
- Self-hosted production: MinIO with persistent volumes, backups, and TLS
- Managed production: any S3-compatible bucket such as S3, Cloudflare R2, Wasabi, Backblaze B2, or DigitalOcean Spaces

## Local MinIO

Start MinIO:

```bash
docker compose -f docker-compose.minio.yml up -d
```

MinIO console:

```text
http://127.0.0.1:9001
```

Default local credentials:

```text
tandaza / tandaza-secret
```

The compose file creates a `tandaza-media` bucket and enables anonymous download for local testing.

## Backend Configuration

Use MinIO/S3:

```bash
STORAGE_DRIVER=s3
S3_ENDPOINT=http://127.0.0.1:9000
S3_ACCESS_KEY=tandaza
S3_SECRET_KEY=tandaza-secret
S3_BUCKET=tandaza-media
S3_REGION=us-east-1
S3_PUBLIC_URL=http://127.0.0.1:9000/tandaza-media
S3_FORCE_PATH_STYLE=true
```

Use local fallback:

```bash
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=../.dev/uploads
```

## Behavior

- `POST /api/v1/media` validates file size and MIME type, then stores the object.
- Local mode returns `/api/backend/uploads/{file}`.
- S3/MinIO mode returns `S3_PUBLIC_URL/{key}` when `S3_PUBLIC_URL` is set.
- If `S3_PUBLIC_URL` is empty, the backend returns `/api/backend/media/{key}` and proxies the object from the bucket.
- Upload audit logs include media key, MIME type, file size, and storage driver.

## Allowed Media

- Images
- PDFs
- MP4 video

Files are currently limited to 10MB.
