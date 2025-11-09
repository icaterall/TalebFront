export interface UploadedEditorImageAsset {
    url: string;
    key: string;
    width?: number | null;
    height?: number | null;
    size?: number | null;
    mime?: string | null;
    filename?: string | null;
}

interface UploadAdapterOptions {
    uploadUrl: string;
    token?: string | null;
    onUploaded?: (asset: UploadedEditorImageAsset) => void;
    onError?: (error: Error) => void;
    onAbort?: (asset: UploadedEditorImageAsset | null) => void;
}

export class CKEditor5CustomUploadAdapter {
    private loader: any;
    private options: UploadAdapterOptions;
    private abortController: AbortController | null = null;
    private uploadedAsset: UploadedEditorImageAsset | null = null;

    constructor(loader: any, options: UploadAdapterOptions) {
        this.loader = loader;
        this.options = options;
    }

    upload(): Promise<{ default: string }> {
        return this.loader.file.then((file: File) => {
            return new Promise(async (resolve, reject) => {
                try {
                    this.abortController = new AbortController();
                    const formData = new FormData();
                    formData.append('image', file);

                    const headers: Record<string, string> = {};
                    if (this.options.token) {
                        headers['Authorization'] = `Bearer ${this.options.token}`;
                    }

                    const response = await fetch(this.options.uploadUrl, {
                        method: 'POST',
                        body: formData,
                        headers,
                        signal: this.abortController.signal
                    });

                    const rawText = await response.text();
                    let data: any = {};
                    if (rawText) {
                        try {
                            data = JSON.parse(rawText);
                        } catch (_err) {
                            data = {};
                        }
                    }

                    if (!response.ok) {
                        const message = data?.message || 'Image upload failed.';
                        const error = new Error(message);
                        this.options.onError?.(error);
                        reject(error);
                        return;
                    }

                    const asset = data?.asset as UploadedEditorImageAsset;
                    if (!asset || !asset.url) {
                        const error = new Error('Upload response missing image URL.');
                        this.options.onError?.(error);
                        reject(error);
                        return;
                    }

                    this.uploadedAsset = asset;
                                this.loader.uploadTotal = file.size;
                                this.loader.uploaded = file.size;
                    this.options.onUploaded?.(asset);

                    resolve({ default: asset.url });
                } catch (err) {
                    if ((err as Error).name === 'AbortError') {
                        this.options.onAbort?.(this.uploadedAsset);
                        reject(new Error('Upload aborted.'));
                        return;
                    }

                    const error = err instanceof Error ? err : new Error('Image upload failed.');
                    this.options.onError?.(error);
                    reject(error);
                }
            });
        });
    }

    abort(): void {
        if (this.abortController && !this.abortController.signal.aborted) {
            this.abortController.abort();
        }

        this.options.onAbort?.(this.uploadedAsset);
    }
}
