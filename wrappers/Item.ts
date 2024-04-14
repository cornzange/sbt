import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { makeSnakeCell } from './buildOnchainData';

export type ItemConfig = {
    item_id: number,
    collection_address: Address,
    owner_address: Address,
    authority_address: Address,
    content: Cell,
    revoked_at: number
};

export function itemConfigToCell(config: ItemConfig): Cell {
    return beginCell()
        .storeUint(config.item_id, 64)
        .storeAddress(config.collection_address)
        .storeAddress(config.owner_address)
        .storeAddress(config.authority_address)
        .storeRef(config.content)
        .storeUint(config.revoked_at, 64)
        .endCell();
}

export enum OpCodes {
    transfer = "0x5fcc3d14",
    get_static_data = "0x2fcb26a2",
    report_static_data = "0x8b771735",
    excesses = "0xd53276db",
    revoke = "0x6f89f5e3",
    destroy = "0x1f04537a",
    owner_info = "0x0dd607e3",
    request_owner = "0xd0c3bfea",
    ownership_proof = "0x0524c7ae",
    prove_ownership = "0x04ded148",
    init_sbt = "0x97dc3e21",
    take_excess = "0xb3f3b959",
    change_description = "0x7587fb7c"
}

export const opCodeToNum = (op: string) => {
    return Number.parseInt(op, 16)
}

const queryId = 1;

export class Item implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) { }

    static createFromAddress(address: Address) {
        return new Item(address);
    }

    static createFromConfig(config: ItemConfig, code: Cell, workchain = 0) {
        const data = itemConfigToCell(config);
        const init = { code, data };
        return new Item(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendTransfer(provider: ContractProvider, via: Sender, value: bigint) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(opCodeToNum(OpCodes.transfer), 32).storeUint(queryId, 64).endCell(),
        });
    }

    //TODO prove ownership
    async sendProveOwnership(provider: ContractProvider, via: Sender, value: bigint, dest: Address, forwardPayload: Cell, withContent: boolean) {
        // prove_ownership#04ded148 query_id:uint64 dest:MsgAddress forward_payload:^Cell with_content:Bool = InternalMsgBody;
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opCodeToNum(OpCodes.prove_ownership), 32)
                .storeUint(queryId, 64)
                .storeAddress(dest)
                .storeRef(forwardPayload)
                .storeInt(withContent ? -1 : 0, 8)
                .endCell(),
        });
    }
    async sendGetStaticData(provider: ContractProvider, via: Sender, value: bigint) {
        // get_static_data#2fcb26a2 query_id:uint64 = InternalMsgBody;
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opCodeToNum(OpCodes.get_static_data), 32)
                .storeUint(queryId, 64)
                .endCell(),
        });
    }
    async sendRequestOwner(provider: ContractProvider, via: Sender, value: bigint, dest: Address, forwardPayload: Cell, withContent: boolean) {
        // request_owner#d0c3bfea query_id:uint64 dest:MsgAddress forward_payload:^Cell with_content:Bool = InternalMsgBody;
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opCodeToNum(OpCodes.request_owner), 32)
                .storeUint(queryId, 64)
                .storeAddress(dest)
                .storeRef(forwardPayload)
                .storeInt(withContent ? -1 : 0, 8)
                .endCell(),
        });
    }
    async sendDestroy(provider: ContractProvider, via: Sender, value: bigint) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(opCodeToNum(OpCodes.destroy), 32).storeUint(queryId, 64).endCell(),
        });
    }
    async sendRevoke(provider: ContractProvider, via: Sender, value: bigint) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(opCodeToNum(OpCodes.revoke), 32).storeUint(queryId, 64).endCell(),
        });
    }
    async sendTakeExcess(provider: ContractProvider, via: Sender, value: bigint) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(opCodeToNum(OpCodes.take_excess), 32).storeUint(queryId, 64).endCell(),
        });
    }
    async sendChangeDescription(provider: ContractProvider, via: Sender, value: bigint, description: string) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opCodeToNum(OpCodes.change_description), 32)
                .storeUint(queryId, 64)
                .storeRef(makeSnakeCell(Buffer.from(description, "utf8")))
                .endCell(),
        });
    }
    async getRevokedTime(provider: ContractProvider) {
        return await provider.get("get_revoked_time", []);
    }
    async getStudent(provider: ContractProvider) {
        return await provider.get("get_student", []);
    }
    async getDescription(provider: ContractProvider) {
        return await provider.get("get_description", []);
    }
}
