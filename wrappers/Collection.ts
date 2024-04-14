import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, TupleItem } from '@ton/core';

export type CollectionConfig = {
    owner_address: Address,
    next_item_index: number,
    content: Cell,
    sbt_item_code: Cell
};

export function collectionConfigToCell(config: CollectionConfig): Cell {
    return beginCell()
        .storeAddress(config.owner_address)
        .storeUint(config.next_item_index, 64)
        .storeRef(config.content)
        .storeRef(config.sbt_item_code)
        .endCell();
}

export class Collection implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) { }

    static createFromAddress(address: Address) {
        return new Collection(address);
    }

    static createFromConfig(config: CollectionConfig, code: Cell, workchain = 0) {
        const data = collectionConfigToCell(config);
        const init = { code, data };
        return new Collection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendCreateSbt(provider: ContractProvider, via: Sender, value: bigint, sbtOwner: Address, sbtAuthority: Address, sbtContent: Cell) {
        // new_sbt#1 query_id:uint64 sbt_owner: MsgAddr ^[ onchain_prefix: int8 sbt_content: dict ] = ExtInMsgBody
        const op = 1;
        const queryId = 1;
        const body: Cell = beginCell()
            .storeUint(op, 32)
            .storeUint(queryId, 64)
            .storeAddress(sbtOwner)
            .storeAddress(sbtAuthority)
            .storeRef(sbtContent)
            .endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async getContent(provider: ContractProvider) {
        const index: TupleItem = { type: "int", value: 1n };
        const individualContent: TupleItem = { type: "cell", cell: beginCell().endCell() }
        return await provider.get("get_nft_content", [index, individualContent]);
    }

    async getCollectionData(provider: ContractProvider) {
        return await provider.get("get_collection_data", []);
    }

    async getSbtAddressByIndex(provider: ContractProvider, itemIdex: bigint) {
        const index: TupleItem = { type: "int", value: itemIdex };
        return await provider.get("get_nft_address_by_index", [index]);
    }
}
