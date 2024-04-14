import { beginCell, Cell, Address } from "@ton/ton";
import { Dictionary } from "@ton/core";
import { sha256_sync } from "@ton/crypto"

const ONCHAIN_CONTENT_PREFIX = 0x00;

function bufferToChunks(buff: Buffer, chunkSize: number) {
    let chunks: Buffer[] = [];
    while (buff.byteLength > 0) {
        chunks.push(buff.slice(0, chunkSize));
        buff = buff.slice(chunkSize);
    }
    return chunks;
}

export function makeSnakeCell(data: Buffer): Cell {
    const chunks = bufferToChunks(data, 127)

    if (chunks.length === 0) {
        return beginCell().endCell()
    }

    if (chunks.length === 1) {
        return beginCell().storeBuffer(chunks[0]).endCell()
    }

    let curCell = beginCell()

    for (let i = chunks.length - 1; i >= 0; i--) {
        const chunk = chunks[i]

        curCell.storeBuffer(chunk)

        if (i - 1 >= 0) {
            const nextCell = beginCell()
            nextCell.storeRef(curCell)
            curCell = nextCell
        }
    }

    return curCell.endCell()
}

const toKey = (key: string) => {
    const result = BigInt(`0x${sha256_sync(key).toString("hex")}`);
    // console.log(key, result);
    return result;
};

export function buildOnchainMetadata(data: {
    name: string;
    student: string;
    educational_stream_number: string;
    description: string;
    image: string;
}): Cell {
    let dict = Dictionary.empty(
        Dictionary.Keys.BigUint(256),
        Dictionary.Values.Cell()
    );
    Object.entries(data).forEach(([key, value]) => {
        dict.set(toKey(key), makeSnakeCell(Buffer.from(value as string, "utf8")));
    });

    return beginCell()
        .storeInt(ONCHAIN_CONTENT_PREFIX, 8)
        .storeDict(dict)
        .endCell();
}