/**
 * Reads an image file and returns a resized JPEG data URL.
 *
 * Avatars are stored directly on the staff row (no external file storage), so
 * the image is scaled down and re-encoded to keep the payload small.
 */
export const fileToAvatarDataUrl = (file: File, maxSize = 256): Promise<string> =>
    new Promise((resolve, reject) => {
        if (!file.type.startsWith("image/")) {
            reject(new Error("Please choose an image file."));
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error("That file is not a valid image."));
            image.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
                const width = Math.max(1, Math.round(image.width * scale));
                const height = Math.max(1, Math.round(image.height * scale));

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const context = canvas.getContext("2d");
                if (!context) {
                    reject(new Error("Image processing is not supported here."));
                    return;
                }

                // Flatten transparency so a transparent PNG doesn't render black.
                context.fillStyle = "#ffffff";
                context.fillRect(0, 0, width, height);
                context.drawImage(image, 0, 0, width, height);

                resolve(canvas.toDataURL("image/jpeg", 0.85));
            };
            image.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
