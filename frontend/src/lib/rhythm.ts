import { decode } from '@msgpack/msgpack';

/**
 * Decompiles the rhythm data from a base64 string.
 * This handles base64 decoding, zlib decompression (via DecompressionStream), 
 * and MessagePack decoding.
 */
export async function decompileRhythm(base64Data: string): Promise<any> {
    try {
        // 1. Base64 to ArrayBuffer
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // 2. Wrap in a Response and use DecompressionStream (deflate for Zlib)
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(bytes);
                controller.close();
            }
        });

        if (typeof DecompressionStream === 'undefined') {
            throw new Error("DecompressionStream is not supported in this browser. Please use a modern browser (Chrome 113+, Firefox 113+, Safari 16.4+).");
        }

        const ds = new DecompressionStream('deflate');
        const decompressedStream = stream.pipeThrough(ds);

        // 3. Convert stream to ArrayBuffer
        const decompressedResponse = new Response(decompressedStream);
        const arrayBuffer = await decompressedResponse.arrayBuffer();

        // 4. Decode MessagePack to Object
        return decode(new Uint8Array(arrayBuffer));
    } catch (err) {
        console.error('Failed to decompile rhythm data:', err);
        throw err;
    }
}
