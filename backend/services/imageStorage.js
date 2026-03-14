const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

const uploadsDir = path.join(__dirname, '..', 'uploads');

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

function sanitizeBaseName(value) {
  return String(value || 'image')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'image';
}

async function ensureUploadsDir() {
  await fs.promises.mkdir(uploadsDir, { recursive: true });
}

function buildLocalAssetPayload(fileName) {
  return {
    imageUrl: `/uploads/${fileName}`,
    publicId: null,
    storage: 'local'
  };
}

async function saveBufferLocally(file, options = {}) {
  await ensureUploadsDir();

  const extension = path.extname(file.originalname || '') || '.jpg';
  const fileName = `${Date.now()}-${sanitizeBaseName(options.baseName)}${extension}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.promises.writeFile(filePath, file.buffer);
  return buildLocalAssetPayload(fileName);
}

async function uploadBufferToCloudinary(file, options = {}) {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'DukaanSaathi/products',
        public_id: `${sanitizeBaseName(options.baseName)}-${Date.now()}`,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          imageUrl: result.secure_url,
          publicId: result.public_id,
          storage: 'cloudinary'
        });
      }
    );

    upload.end(file.buffer);
  });
}

async function uploadProductImage(file, options = {}) {
  if (!file) {
    return {
      imageUrl: null,
      publicId: null,
      storage: isCloudinaryConfigured() ? 'cloudinary' : 'local'
    };
  }

  if (isCloudinaryConfigured()) {
    return uploadBufferToCloudinary(file, options);
  }

  return saveBufferLocally(file, options);
}

async function uploadRemoteImage(imageUrl, options = {}) {
  if (!imageUrl) {
    return {
      imageUrl: null,
      publicId: null,
      storage: isCloudinaryConfigured() ? 'cloudinary' : 'remote'
    };
  }

  if (!isCloudinaryConfigured()) {
    return {
      imageUrl,
      publicId: null,
      storage: 'remote'
    };
  }

  const result = await cloudinary.uploader.upload(imageUrl, {
    folder: options.folder || 'DukaanSaathi/generated',
    public_id: `${sanitizeBaseName(options.baseName)}-${Date.now()}`,
    resource_type: 'image'
  });

  return {
    imageUrl: result.secure_url,
    publicId: result.public_id,
    storage: 'cloudinary'
  };
}

async function removeStoredImage(publicId) {
  if (!publicId || !isCloudinaryConfigured()) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.error('Failed to remove Cloudinary image:', error.message);
  }
}

async function persistMarketingAdviceImage(advice) {
  if (!advice?.creative?.imageUrl) {
    return advice;
  }

  const uploaded = await uploadRemoteImage(advice.creative.imageUrl, {
    folder: 'DukaanSaathi/marketing-ai',
    baseName: advice.productSnapshot?.name || 'marketing-image'
  });

  return {
    ...advice,
    creative: {
      ...advice.creative,
      imageUrl: uploaded.imageUrl || advice.creative.imageUrl,
      imagePublicId: uploaded.publicId || null,
      imageStorage: uploaded.storage
    }
  };
}

module.exports = {
  isCloudinaryConfigured,
  uploadProductImage,
  persistMarketingAdviceImage,
  removeStoredImage
};