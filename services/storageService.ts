// services/storageService.ts
import { storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Upload a prescription file to Firebase Storage
 * @param uri - Local file URI
 * @param fileName - Name of the file
 * @param userId - User ID who is uploading
 * @param productId - Product ID the prescription is for
 * @returns Download URL of the uploaded file
 */
export const uploadPrescription = async (
  uri: string,
  fileName: string,
  userId: string,
  productId: string
): Promise<string> => {
  try {
    console.log("Starting prescription upload:", { uri, fileName, userId, productId });

    // Create a unique path for the prescription
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `prescriptions/${userId}/${productId}_${timestamp}_${sanitizedFileName}`;
    
    console.log("Storage path:", storagePath);
    
    const storageRef = ref(storage, storagePath);

    // Fetch the file as a blob
    console.log("Fetching file from URI...");
    const response = await fetch(uri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log("Blob created:", { size: blob.size, type: blob.type });

    // Validate blob
    if (blob.size === 0) {
      throw new Error("File is empty");
    }

    if (blob.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error("File size exceeds 10MB limit");
    }

    // Upload to Firebase Storage with metadata
    console.log("Uploading to Firebase Storage...");
    const metadata = {
      contentType: blob.type || 'image/jpeg',
      customMetadata: {
        uploadedBy: userId,
        productId: productId,
        uploadTimestamp: timestamp.toString()
      }
    };

    await uploadBytes(storageRef, blob, metadata);
    console.log("Upload successful");

    // Get the download URL
    const downloadUrl = await getDownloadURL(storageRef);
    console.log("Download URL obtained:", downloadUrl);

    return downloadUrl;
  } catch (error: any) {
    console.error("Error uploading prescription:", error);
    
    // Provide more specific error messages
    if (error.code === 'storage/unauthorized') {
      throw new Error("Permission denied. Please check if you're logged in and have the correct permissions.");
    } else if (error.code === 'storage/canceled') {
      throw new Error("Upload was cancelled");
    } else if (error.code === 'storage/unknown') {
      throw new Error("Upload failed. Please check your Firebase Storage configuration and security rules.");
    } else if (error.code === 'storage/quota-exceeded') {
      throw new Error("Storage quota exceeded. Please contact support.");
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error("Failed to upload prescription. Please try again.");
    }
  }
};

/**
 * Upload product images to Firebase Storage
 * @param uri - Local file URI
 * @param fileName - Name of the file
 * @param sellerId - Seller ID
 * @returns Download URL of the uploaded image
 */
export const uploadProductImage = async (
  uri: string,
  fileName: string,
  sellerId: string
): Promise<string> => {
  try {
    console.log("Starting product image upload:", { uri, fileName, sellerId });

    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `products/${sellerId}/${timestamp}_${sanitizedFileName}`;
    
    const storageRef = ref(storage, storagePath);

    const response = await fetch(uri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    const blob = await response.blob();

    if (blob.size === 0) {
      throw new Error("File is empty");
    }

    if (blob.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error("Image size exceeds 10MB limit");
    }

    const metadata = {
      contentType: blob.type || 'image/jpeg',
      customMetadata: {
        uploadedBy: sellerId,
        uploadTimestamp: timestamp.toString()
      }
    };

    await uploadBytes(storageRef, blob, metadata);
    const downloadUrl = await getDownloadURL(storageRef);

    console.log("Product image upload successful:", downloadUrl);
    return downloadUrl;
  } catch (error: any) {
    console.error("Error uploading product image:", error);
    
    if (error.code === 'storage/unauthorized') {
      throw new Error("Permission denied. Please check if you're logged in.");
    } else if (error.code === 'storage/unknown') {
      throw new Error("Upload failed. Please check your Firebase Storage configuration.");
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error("Failed to upload image. Please try again.");
    }
  }
};