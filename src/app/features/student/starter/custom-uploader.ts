import { environment } from "../../../../environments/environment";

// src/app/ckeditor-upload-adapter.ts
export class CKEditor5CustomUploadAdapter {
    private loader;

    constructor(loader: any) {
        this.loader = loader;
    }

    // Starts the upload process.
    upload() {
        return this.loader.file.then((file:any) => new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('photo', file);

            fetch(`${environment.apiUrl}/articles/editor/uploader/upload-image`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.url) {
                    resolve({ default: data.url });
                } else {
                    reject('Upload failed');
                }
            })
            .catch(error => {
                reject('Upload failed');
            });
        }));
    }

    // Aborts the upload process.
    abort() {
        // Implement logic to abort the upload if necessary.
        console.log('Upload aborted');
    }
}
