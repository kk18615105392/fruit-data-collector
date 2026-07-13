const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buf: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export function strToU8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function writeUint16(buf: Uint8Array, offset: number, val: number): void {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >>> 8) & 0xff;
}

function writeUint32(buf: Uint8Array, offset: number, val: number): void {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >>> 8) & 0xff;
  buf[offset + 2] = (val >>> 16) & 0xff;
  buf[offset + 3] = (val >>> 24) & 0xff;
}

export interface ZipFileEntry {
  name: string;
  data: Uint8Array;
}

export function createZip(files: ZipFileEntry[]): Uint8Array {
  const localHeaders: { data: Uint8Array; offset: number }[] = [];
  const centralHeaders: Uint8Array[] = [];
  let localOffset = 0;

  files.forEach((file) => {
    const nameBuf = strToU8(file.name);
    const dataBuf = file.data;
    const crc = crc32(dataBuf);
    const dosTime = 0;
    const dosDate = 0x21;

    const lh = new Uint8Array(30 + nameBuf.length + dataBuf.length);
    writeUint32(lh, 0, 0x04034b50);
    writeUint16(lh, 4, 10);
    writeUint16(lh, 6, 0);
    writeUint16(lh, 8, 0);
    writeUint16(lh, 10, dosTime);
    writeUint16(lh, 12, dosDate);
    writeUint32(lh, 14, crc);
    writeUint32(lh, 18, dataBuf.length);
    writeUint32(lh, 22, dataBuf.length);
    writeUint16(lh, 26, nameBuf.length);
    writeUint16(lh, 28, 0);
    lh.set(nameBuf, 30);
    lh.set(dataBuf, 30 + nameBuf.length);
    localHeaders.push({ data: lh, offset: localOffset });

    const ch = new Uint8Array(46 + nameBuf.length);
    writeUint32(ch, 0, 0x02014b50);
    writeUint16(ch, 4, 10);
    writeUint16(ch, 6, 10);
    writeUint16(ch, 8, 0);
    writeUint16(ch, 10, 0);
    writeUint16(ch, 12, dosTime);
    writeUint16(ch, 14, dosDate);
    writeUint32(ch, 16, crc);
    writeUint32(ch, 20, dataBuf.length);
    writeUint32(ch, 24, dataBuf.length);
    writeUint16(ch, 28, nameBuf.length);
    writeUint16(ch, 30, 0);
    writeUint16(ch, 32, 0);
    writeUint16(ch, 34, 0);
    writeUint16(ch, 36, 0);
    writeUint32(ch, 38, 0);
    writeUint32(ch, 42, localOffset);
    ch.set(nameBuf, 46);
    centralHeaders.push(ch);
    localOffset += lh.length;
  });

  const totalLocalSize = localOffset;
  const totalCentralSize = centralHeaders.reduce((acc, val) => acc + val.length, 0);
  const eocd = new Uint8Array(22);
  writeUint32(eocd, 0, 0x06054b50);
  writeUint16(eocd, 4, 0);
  writeUint16(eocd, 6, 0);
  writeUint16(eocd, 8, files.length);
  writeUint16(eocd, 10, files.length);
  writeUint32(eocd, 12, totalCentralSize);
  writeUint32(eocd, 16, totalLocalSize);
  writeUint16(eocd, 20, 0);

  const out = new Uint8Array(totalLocalSize + totalCentralSize + eocd.length);
  let outOffset = 0;
  localHeaders.forEach((lh) => {
    out.set(lh.data, outOffset);
    outOffset += lh.data.length;
  });
  centralHeaders.forEach((ch) => {
    out.set(ch, outOffset);
    outOffset += ch.length;
  });
  out.set(eocd, outOffset);
  return out;
}

export function base64ToU8(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}
