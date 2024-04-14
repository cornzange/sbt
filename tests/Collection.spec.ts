import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransactions, printTransactionFees } from '@ton/sandbox';
import { Address, Cell, Slice, beginCell, toNano } from '@ton/core';
import { Collection } from '../wrappers/Collection';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { makeSnakeCell } from '../wrappers/buildOnchainData';

// const calculateItemStateInit = (itemIndex: bigint, itemCode: Cell, collectionAddress: Address): Cell => {
//     const data = beginCell().storeUint(itemIndex, 64).storeAddress(collectionAddress).endCell();
//     return beginCell().storeUint(0, 2).storeRef(itemCode).storeRef(data).storeUint(0, 1).endCell();
// }

// const calculateItemAddress = (wc: bigint, stateInit: Cell) => {
//     return beginCell().storeUint(4, 3).storeInt(wc, 8).storeUint(parseInt(stateInit.hash().toString('hex')), 256).endCell().beginParse()
// }

describe('Collection', () => {
    let code: Cell;
    let itemCode: Cell;

    beforeAll(async () => {
        code = await compile('Collection');
        itemCode = await compile('Item');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let collectionOwner: SandboxContract<TreasuryContract>;
    let sbtOwner: SandboxContract<TreasuryContract>;
    let sbtAuthority: SandboxContract<TreasuryContract>;
    let collection: SandboxContract<Collection>;
    let jsonAddress = "http:://some-address.com";

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        collectionOwner = deployer;
        sbtOwner = await blockchain.treasury('owner');
        sbtAuthority = await blockchain.treasury('authority');

        collection = blockchain.openContract(Collection.createFromConfig({
            owner_address: collectionOwner.address,
            next_item_index: 1,
            content: beginCell().storeRef(beginCell().storeBuffer(Buffer.from(jsonAddress, "ascii")).endCell()).endCell(),
            sbt_item_code: itemCode
        }, code));

        const deployResult = await collection.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: collection.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and collection are ready to use
    });

    it('should get collection content', async () => {
        const content = await collection.getContent();
        const cell: Cell = content.stack.readCell()
        const address = cell.beginParse().skip(8).loadBuffer(jsonAddress.length).toString('ascii')
        expect(address).toEqual(jsonAddress);
    });

    it('should deploy sbt', async () => {
        const sbtContent: Cell = beginCell().storeUint(7, 8).endCell();
        const deployResult = await collection.sendCreateSbt(deployer.getSender(), toNano('0.1'), sbtOwner.address, sbtAuthority.address, sbtContent);
        const res = await collection.getSbtAddressByIndex(1n);
        const newSbtAddress = res.stack.readCell().beginParse().loadAddress();
        expect(deployResult.transactions).toHaveTransaction({
            from: collection.address,
            to: newSbtAddress,
            deploy: true,
            success: true,
        });
    });
});
