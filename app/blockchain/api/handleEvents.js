// by Logan <https://github.com/loganworld>
// at 19/08/2022

const { ethers } = require("ethers");
const {
    provider,
    NFTTANK,
    EnergyPool
} = require("../contracts");
const { BlockNumController, TanksController, ClassesController, NotificationController } = require("../controllers");
const UserController = require("../../auth/controller");
const { handleEvent, fromBigNum, toBigNum } = require("../utils");

const blockchainHandler = async () => {
    try {
        /**
         * 
         * 
         * Handle transfer event, mint + transfer
         * Event : "Transfer"
         * @param {from,to,tokenId} tx 
         * @param {Transfer} id 
         */
        const transferHandler = async (tx, id) => {
            let txData = {
                from: tx.args.from,
                to: tx.args.to,
                tokenId: fromBigNum(tx.args.tokenId, 0)
            };
            if (txData.from == ethers.constants.AddressZero) {
                var tankInfo;
                //temp
                if (txData.isTempType != undefined) tankInfo = { class: txData.isTempType };
                else tankInfo = await NFTTANK.tanks(txData.tokenId);
                //mint 
                const tankType = await ClassesController.find({ id: String(tankInfo.class) });
                if (!tankType) throw new Error("blockchainHandler/transferHandler :invalid type ");
                await TanksController.create({
                    id: txData.tokenId,
                    owner: String(txData.to).toUpperCase(),
                    classType: tankType.id,

                    name: "tank" + txData.tokenId,
                    image: tankType.image,
                    description: tankType.description,
                    health: tankType.health,
                    fireRate: tankType.fireRate,
                    firePower: tankType.firePower,
                    speed: tankType.speed,
                    borrower: String(txData.to).toUpperCase()
                })
            } else {
                //transfer
                await TanksController.update({ id: txData.tokenId }, { owner: String(txData.to).toUpperCase(), borrower: String(txData.to).toUpperCase() });
            }
        } /**
    * Handle transfer event, mint + transfer
    * Event : "Transfer"
    * @param {from,to,tokenId} tx 
    * @param {Transfer} id 
    */
        const mintHandler = async (tx, id) => {
            let txData = {
                id: tx.args.id,
                user: tx.args.user,
                refCode: tx.args.refCode,
                price: tx.args.price
            };
            if (txData.user != ethers.constants.AddressZero) {
                try {
                    const userData = await UserController.find({ address: txData.user });
                    const referrerData = userData.referrer ?
                        await UserController.find({ address: userData.referrer }) :
                        await UserController.find({ referralCode: txData.refCode });
                    const price = ethers.utils.formatUnits(txData.price, 18);
                    if (userData && referrerData) {
                        if (userData.referralCode == txData.refCode) return;
                        await UserController.update({ address: txData.user }, {
                            referrer: referrerData.address
                        });
                        await UserController.update({ address: referrerData.address }, {
                            referrallers: [...new Set([...referrerData.referrallers, txData.user])],
                            referralReward: (referrerData.referralReward + price * 0.2)
                        });
                        await NotificationController.create({
                            user: referrerData.address,
                            title: `Get Referrer reward ${price * 0.2}`,
                            description: `${userData.address} buy a tank ${txData.id}`,
                            status: "pending",
                            created: +new Date()
                        })
                    }
                } catch (err) {
                    console.log(err.message);
                }
            }
        }
        /**
         * handle level upgrade
         * Event : "LevelUpgrade"
         * @param {tokenId, level} tx
         * @param {"LevelUpgrade"} id
         */
        const upgradeHandler = async (tx, id) => {
            let txData = {
                tokenId: fromBigNum(tx.args.tokenId, 0),
                newLevel: Number(tx.args.level)
            };
            await TanksController.update({ id: txData.tokenId }, {
                level: txData.newLevel,
                maxEnergyPool: txData.newLevel * 1000
            });
        }
        /**
         * handle stake and unstake
         * Event : "TransferSingle"
         * @param {from, to, id, value} tx
         * @param {"TransferSingle"} id
         */
        const stakeHandler = async (tx, id) => {
            let txData = {
                from: tx.args.from,
                to: tx.args.to,
                tokenId: fromBigNum(tx.args.id, 0),
                amount: fromBigNum(tx.args.value, 18)
            };
            await TanksController.updateEnergy({ id: txData.tokenId });
            var totalStake = await EnergyPool.supplies(tx.args.id);
            await TanksController.update(
                { id: txData.tokenId },
                {
                    energyPool: Number(fromBigNum(totalStake, 18)),
                    maxEnergy: Number(fromBigNum(totalStake, 18)) * 0.2 + 1000,
                });
            await TanksController.updateEnergy({ id: txData.tokenId });
        }

        const handleStart = () => {
            handleEvent({
                id: "Transfer",
                provider: provider,
                contract: NFTTANK,
                event: "Transfer",
                times: 15,
                handler: transferHandler,
                BlockNumController: BlockNumController,
            });
            handleEvent({
                id: "Mint",
                provider: provider,
                contract: NFTTANK,
                event: "Mint",
                times: 15,
                handler: mintHandler,
                BlockNumController: BlockNumController,
            });
            handleEvent({
                id: "LevelUpgrade",
                provider: provider,
                contract: NFTTANK,
                event: "LevelUpgrade",
                times: 15,
                handler: upgradeHandler,
                BlockNumController: BlockNumController,
            });
            handleEvent({
                id: "TransferSingle",
                provider: provider,
                contract: EnergyPool,
                event: "TransferSingle",
                times: 15,
                handler: stakeHandler,
                BlockNumController: BlockNumController,
            });
        }
        handleStart();

        const demo = async () => {
            await transferHandler({
                args: {
                    from: ethers.constants.AddressZero,
                    to: "0xfB4d81A31BcBC5E2024f6c4247DD2Ce913bd7c95",
                    tokenId: toBigNum(0, 0),
                    isTempType: 1
                }
            })
            await transferHandler({
                args: {
                    from: ethers.constants.AddressZero,
                    to: "0xfB4d81A31BcBC5E2024f6c4247DD2Ce913bd7c95",
                    tokenId: toBigNum(1, 0),
                    isTempType: 2
                }
            })
            await transferHandler({
                args: {
                    from: ethers.constants.AddressZero,
                    to: "0xfB4d81A31BcBC5E2024f6c4247DD2Ce913bd7c99",
                    tokenId: toBigNum(2, 0),
                    isTempType: 2
                }
            })
            await stakeHandler({
                args: {
                    from: ethers.constants.AddressZero,
                    to: "0xfB4d81A31BcBC5E2024f6c4247DD2Ce913bd7c95",
                    id: toBigNum(0, 0),
                    value: toBigNum("100", 18)
                }
            })
            await stakeHandler({
                args: {
                    from: "0xfB4d81A31BcBC5E2024f6c4247DD2Ce913bd7c95",
                    to: ethers.constants.AddressZero,
                    id: toBigNum(0, 0),
                    value: toBigNum("100", 18)
                }
            })
        }
        // await demo();
    } catch (err) {
        console.log("blockchainhandler : ", err.message);
    }
}

module.exports = { blockchainHandler };