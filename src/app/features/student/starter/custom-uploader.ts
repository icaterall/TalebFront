import { environment } from "../../../../environments/environment";

// src/app/ckeditor-upload-adapter.ts
export class CKEditor5CustomUploadAdapter {
    private loader;
    private readonly STORAGE_PREFIX = 'ckeditor_image_';
    private readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB max

    constructor(loader: any) {
        this.loader = loader;
    }

    // Starts the upload process.
    upload() {
        return this.loader.file.then((file: any) => new Promise((resolve, reject) => {
            // Check file size
            if (file.size > this.MAX_IMAGE_SIZE) {
                reject(new Error(`Image size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`));
                return;
            }

            // Check if file is an image
            if (!file.type.startsWith('image/')) {
                reject(new Error('File must be an image'));
                return;
            }

            // Read file as base64
            const reader = new FileReader();
            
            reader.onload = () => {
                try {
                    const base64String = reader.result as string;
                    
                    // Compress/resize image if needed
                    this.resizeImage(file, base64String, (resizedBase64: string) => {
                        // Generate unique key for this image
                        const imageKey = this.STORAGE_PREFIX + Date.now() + '_' + Math.random().toString(36).substring(7);
                        
                        // Store in localStorage
                        try {
                            localStorage.setItem(imageKey, resizedBase64);
                            
                            // Create data URL for the editor
                            const dataUrl = resizedBase64;
                            
                            // Resolve with data URL
                            resolve({ default: dataUrl });
                        } catch (storageError) {
                            // localStorage might be full, try to clear old images
                            this.cleanupOldImages();
                            try {
                                localStorage.setItem(imageKey, resizedBase64);
                                resolve({ default: resizedBase64 });
                            } catch (retryError) {
                                reject(new Error('Failed to store image in localStorage. Storage might be full.'));
                            }
                        }
                    });
                } catch (error) {
                    reject(new Error('Failed to process image'));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read image file'));
            };
            
            reader.readAsDataURL(file);
        }));
    }

    // Resize image to reduce size while maintaining quality
    private resizeImage(file: File, base64String: string, callback: (resizedBase64: string) => void): void {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Max dimensions: 1920x1920
            const MAX_WIDTH = 1920;
            const MAX_HEIGHT = 1920;
            
            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                if (width > height) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                } else {
                    width = Math.round((width * MAX_HEIGHT) / height);
                    height = MAX_HEIGHT;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                callback(base64String); // Return original if canvas not available
                return;
            }
            
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to base64 with quality (0.85 for good balance)
            const quality = 0.85;
            const resizedBase64 = canvas.toDataURL(file.type, quality);
            
            callback(resizedBase64);
        };
        
        img.onerror = () => {
            callback(base64String); // Return original if resize fails
        };
        
        img.src = base64String;
    }

    // Cleanup old images from localStorage to free up space
    private cleanupOldImages(): void {
        try {
            const keys = Object.keys(localStorage);
            const imageKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
            
            // Sort by timestamp (newest first)
            imageKeys.sort((a, b) => {
                const timestampA = parseInt(a.split('_')[1]) || 0;
                const timestampB = parseInt(b.split('_')[1]) || 0;
                return timestampB - timestampA;
            });
            
            // Keep only the 100 most recent images, delete the rest
            if (imageKeys.length > 100) {
                const toDelete = imageKeys.slice(100);
                toDelete.forEach(key => {
                    localStorage.removeItem(key);
                });
            }
        } catch (error) {
            console.warn('Failed to cleanup old images:', error);
        }
    }

    // Aborts the upload process.
    abort() {
        // Implement logic to abort the upload if necessary.
        console.log('Upload aborted');
    }
}
