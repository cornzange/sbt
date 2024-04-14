import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransactions, printTransactionFees } from '@ton/sandbox';
import { Address, Cell, Slice, beginCell, toNano } from '@ton/core';
import { Collection } from '../wrappers/Collection';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { buildOnchainMetadata, makeSnakeCell } from '../wrappers/buildOnchainData';
import { Item, opCodeToNum } from '../wrappers/Item';
import { OpCodes } from '../wrappers/Item';

const contentConfig = {
    name: "TON DEV STUDY Diploma",
    student: "@cornzange",
    educational_stream_number: "2",
    image: "http:://link.com",
    description: "something you can change"
}

enum ExitCode {
    forbidden = 403
}

describe('Item', () => {
    let itemCode: Cell;

    beforeAll(async () => {
        itemCode = await compile('Item');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let collectionOwner: SandboxContract<TreasuryContract>;
    let sbtOwner: SandboxContract<TreasuryContract>;
    let sbtAuthority: SandboxContract<TreasuryContract>;
    let item: SandboxContract<Item>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        collectionOwner = deployer;
        sbtOwner = await blockchain.treasury('owner');
        sbtAuthority = await blockchain.treasury('authority');

        const content: Cell = buildOnchainMetadata(contentConfig)

        const config = {
            item_id: 1,
            collection_address: collectionOwner.address,
            owner_address: sbtOwner.address,
            authority_address: sbtAuthority.address,
            content,
            revoked_at: 0
        }

        item = blockchain.openContract(Item.createFromConfig(config, itemCode));

        const deployResult = await item.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: item.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and collection are ready to use
    });

    it('shouldn\'t transfer', async () => {
        const res = await item.sendTransfer(deployer.getSender(), toNano('0.05'));
        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: item.address,
            op: opCodeToNum(OpCodes.transfer),
            exitCode: ExitCode.forbidden,
        });
    }); //
    it('should prove ownership', async () => {
        const dest: Address = deployer.address;
        const forwardPayload: Cell = beginCell().storeUint(32, 8).endCell();
        const withContent: boolean = false;
        const res = await item.sendProveOwnership(sbtOwner.getSender(), toNano('0.05'), dest, forwardPayload, withContent);
        expect(res.transactions).toHaveTransaction({
            from: sbtOwner.address,
            to: item.address,
            op: opCodeToNum(OpCodes.prove_ownership),
        });
        expect(res.transactions).toHaveTransaction({
            from: item.address,
            to: dest,
        });

    });
    it('should get static data', async () => {
        const res = await item.sendGetStaticData(deployer.getSender(), toNano('0.05'))
        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: item.address,
            op: opCodeToNum(OpCodes.get_static_data),
        });
        expect(res.transactions).toHaveTransaction({
            from: item.address,
            to: deployer.address,
        });
    });
    it('should request owner', async () => {
        const dest: Address = deployer.address;
        const forwardPayload: Cell = beginCell().endCell();
        const withContent: boolean = true;
        const res = await item.sendRequestOwner(sbtOwner.getSender(), toNano('0.05'), dest, forwardPayload, withContent)
        expect(res.transactions).toHaveTransaction({
            from: sbtOwner.address,
            to: item.address,
            op: opCodeToNum(OpCodes.request_owner),
        });
        expect(res.transactions).toHaveTransaction({
            from: item.address,
            to: dest,
        });
    });
    it('should destroy', async () => {
        const res = await item.sendDestroy(sbtOwner.getSender(), toNano('0.05'))
        expect(res.transactions).toHaveTransaction({
            from: sbtOwner.address,
            to: item.address,
            op: opCodeToNum(OpCodes.destroy),
        });
        expect(res.transactions).toHaveTransaction({
            from: item.address,
            to: sbtOwner.address,
        });
    });
    it('should revoke', async () => {
        const res = await item.sendRevoke(sbtAuthority.getSender(), toNano('0.05'));
        expect(res.transactions).toHaveTransaction({
            from: sbtAuthority.address,
            to: item.address,
            op: opCodeToNum(OpCodes.revoke),
        });
        const revokedTimeRes = await item.getRevokedTime();
        expect(revokedTimeRes.stack.readBigNumber()).toBeGreaterThan(0);

    });
    it('should take excess', async () => {
        const res = await item.sendTakeExcess(sbtOwner.getSender(), toNano('0.05'))
        expect(res.transactions).toHaveTransaction({
            from: sbtOwner.address,
            to: item.address,
            op: opCodeToNum(OpCodes.take_excess),
        });
        expect(res.transactions).toHaveTransaction({
            from: item.address,
            to: sbtOwner.address,
        });
    });
    it('should get student', async () => {
        const res = await item.getStudent();
        const student = res.stack.readCell().beginParse().loadRef().beginParse().loadBuffer(contentConfig.student.length).toString('utf-8');
        expect(student).toEqual(contentConfig.student);
    });

    it('should change description', async () => {
        const newDescription = "new description";

        const res = await item.sendChangeDescription(sbtOwner.getSender(), toNano('0.05'), newDescription);
        expect(res.transactions).toHaveTransaction({
            from: sbtOwner.address,
            to: item.address,
            op: opCodeToNum(OpCodes.change_description),
        });
        const resDescription = await item.getDescription();
        const description = resDescription.stack.readCell().beginParse().loadBuffer(newDescription.length).toString('utf-8')
        expect(newDescription).toEqual(description);
    });
});
