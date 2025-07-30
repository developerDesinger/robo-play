const AWS = require("aws-sdk");
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');  // v3 import
const dotenv = require("dotenv");
const sharp = require("sharp");
dotenv.config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_S3_ACCESS_KEY,
  secretAccessKey: process.env.AWS_S3_KEY_SECRET,
  region: process.env.AWS_S3_REGION,
  maxRetries: 3,
  retryDelayOptions: { base: 200 },
});

const s3SharpImageUpload = async (file) => {
  try {
    const buffer = Buffer.from(
      file.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    // Get metadata to determine image format
    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
      // console.log("Detected metadata:", metadata);
    } catch (err) {
      // console.warn("Unable to extract metadata, falling back to raw upload.");
      metadata = { format: "heic" }; // Fallback for HEIC/HEIF
    }

    // Handle HEIC/HEIF fallback
    if (metadata.format === "heic" || metadata.format === "heif") {
      // console.warn("HEIC/HEIF detected. Uploading raw HEIC file...");
      return await uploadToS3(buffer, "image/heic");
    }

    // Process supported formats
    const processedImage = await sharp(buffer)
      .resize(300)
      .png({ quality: 40 })
      .toBuffer();

    // Upload processed image
    return await uploadToS3(processedImage, "image/png");
  } catch (error) {
    // console.error("Error uploading image:", error);
    throw new Error("Image upload failed");
  }
};

// Function to upload an image to S3
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_KEY_SECRET,
  }
});

const uploadToS3 = async (imageBase64, contentType) => {
  try {
    const buffer = Buffer.from(imageBase64, "base64");

    // Generate a unique file name
    const key = `${Date.now()}.jpg`; // Or use a more structured naming convention

    // Prepare the parameters for the S3 upload
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,  // Bucket name from environment variable
      Key: key,                             // Unique file name
      Body: buffer,                         // File content
      ContentType: contentType,             // Content type (image/png, image/jpeg, etc.)
    };

    // Perform the upload to S3 using the PutObjectCommand
    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);

    return { success: true, url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}` };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return { success: false, message: "Upload failed" };
  }
};

const s3SharpImageUploadArray = async (file) => {
  const buffer = Buffer.from(
    file.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );
  const data = await sharp(buffer).resize(300).png({ quality: 40 }).toBuffer(); // Convert the sharp output to buffer
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Body: data,
    Key: Date.now() + ".png",
    ContentType: `image/png`,
    CreateBucketConfiguration: {
      LocationConstraint: process.env.AWS_S3_REGION,
    },
  };
  return await s3UploadArray(params);
};

const s3UploadArray = async (params) => {
  try {
    let result = await s3.upload(params).promise();
    return result.Key;
  } catch (e) {
    console.log("s3Upload error", e);
  }
};

module.exports = { s3SharpImageUpload, s3SharpImageUploadArray, uploadToS3 };
