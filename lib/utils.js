const convertRGB565ToRGB24 = (buffer, width, height, stride) => {
    const rgb24 = Buffer.allocUnsafe(width * height * 3);
    const source = new Uint16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIdx = y * (stride / 2) + x;
            const dstIdx = (y * width + x) * 3;
            
            const pixel = source[srcIdx];
            const r = ((pixel >> 11) & 0x1F) << 3;
            const g = ((pixel >> 5) & 0x3F) << 2;
            const b = (pixel & 0x1F) << 3;
            
            rgb24[dstIdx] = r;
            rgb24[dstIdx + 1] = g;
            rgb24[dstIdx + 2] = b;
        }
    }
    
    return rgb24;
}

module.exports = {
    convertRGB565ToRGB24
}