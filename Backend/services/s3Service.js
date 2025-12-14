const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// MODIFIED: Accepts 'isPublic' flag
exports.uploadToS3 = async (file, filename, isPublic = false) => {
  const body = file.buffer ? file.buffer : file;
  const contentType = file.mimetype ? file.mimetype : 'application/pdf';

  const params = {
    Bucket: BUCKET_NAME,
    Key: filename,
    Body: body,
    ContentType: contentType,
    ContentDisposition: isPublic ? 'inline' : 'attachment',

  };

  await s3Client.send(new PutObjectCommand(params));

  if (isPublic) {
    // Ensure AWS_BUCKET_REGION is defined in your .env file!
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${filename}`;
  }

  return filename;
};

exports.getPresignedUrl = async (filename) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

exports.deleteFromS3 = async (filename) => {
  const params = { Bucket: BUCKET_NAME, Key: filename };
  try {
    await s3Client.send(new DeleteObjectCommand(params));
  } catch (err) {
    console.error("Error deleting file from S3:", err);
  }
};