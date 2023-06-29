const { TanksController, AdminSettingController, ReferralController, NotificationController } = require("../controllers");

const cron = require("node-cron");
const UserController = require("../../auth/controller");
const { toBigNum, fromBigNum } = require("../utils");
const { RewardPool, TANKTOKEN } = require("../contracts");

const rewardRate = [3000, 2700, 2400, 2100, 1800, 1500, 1200, 900, 600, 300];

const rewardHandler = async () => {
    await AdminSettingController.create({ type: "lastReward", value: new Date().toString() });

    const rewardHandle = async () => {
        try {
            console.log(`running a reward every day`);
            let totalRewardAmount = fromBigNum(await RewardPool.rewardPoolAmount())/100;

            var users = await UserController.findsWithSort({}, { merit: 1 });
            users.splice(10);
            let rewardUsers = users.filter((user) => user.merit > 0);
            // proceed reward
            const rewardUserAddresses = [];
            const rewardUserAmounts = [];
            rewardUsers.map((rewardUser, index) => {
                rewardUserAddresses.push(rewardUser.address);
                rewardUserAmounts.push(toBigNum(totalRewardAmount * rewardRate[index] / 300 / 55));
            })

            // remove merit for rewarded users
            if (rewardUsers.length == 0) return;
            var tx = await RewardPool.award(rewardUserAddresses, rewardUserAmounts);
            await tx.wait();

            console.log("reward tx", tx.hash);

            rewardUsers.map((rewardUser, index) => {
                UserController.update({ address: rewardUser.address }, { merit: 0 });

                NotificationController.create({
                    user: rewardUser.address,
                    title: `Daily Reward!`,
                    description: `You got ${rewardUserAmounts[index]}DTL!`,
                    status: "pending",
                    created: +new Date()
                })
            });

            await AdminSettingController.update({ type: "lastReward" }, { value: new Date().toString() });
        } catch (err) {
            console.log('blockchain/api/rewardHandler', err.message);
        }
    }
    cron.schedule(`0 0 0 * * *`, rewardHandle, { timezone: "Etc/GMT+0" });
}

const energyUpdateHandler = async () => {
    cron.schedule(`*/30 * * * * *`, async () => {
        console.log(`running a dbUpdator  every 30 second`);
        await TanksController.updateAllTankEnergy();
    });
}
const referralRewardHandler = async () => {
    cron.schedule(`*/30 * * * * *`, async () => {
        console.log(`running a referralReward handler  every 30 second`);
        try {
            var rewardUsers = await ReferralController.find({ status: "pending", tx: "" }, { _id: 1 });
            const rewardUserAddresses = [];
            const rewardUserAmounts = [];
            rewardUsers.map((refer, index) => {
                rewardUserAddresses.push(refer.user);
                rewardUserAmounts.push(toBigNum(refer.amount));
            })
            // remove merit for rewarded users
            if (rewardUsers.length == 0) return;

            rewardUsers.map((rewardUser) => {
                ReferralController.update({ address: rewardUser.user, status: "pending" }, { status: "onprocessing" });
            });
            try {
                var tx = await RewardPool.multiSendToken(TANKTOKEN.address, rewardUserAddresses, rewardUserAmounts);
                await tx.wait();
                if (tx.type === 2) {
                    rewardUsers.map((rewardUser) => {
                        ReferralController.update({ address: rewardUser.user, status: "onprocessing" }, { tx: tx.hash, status: "success" });

                        NotificationController.create({
                            user: rewardUser.user,
                            title: `Claim Reward Success`,
                            description: `You got ${rewardUser.amount}DTL!`,
                            status: "pending",
                            created: +new Date()
                        })
                    });
                }
                else {
                    rewardUsers.map((rewardUser) => {
                        ReferralController.update({ address: rewardUser.user, status: "pending" }, { tx: tx.hash, status: "failed", log: "denied due to error" });
                    });
                }
            } catch (err) {
                rewardUsers.map((rewardUser) => {
                    ReferralController.update({ address: rewardUser.user, status: "onprocessing" }, { status: "pending" });
                });
            }
            await AdminSettingController.update({ type: "last Claim Reward" }, { value: new Date().toString() });
        } catch (err) {
            console.log('blockchain/api/rewardHandler', err.message);
        }
    });
}

const dbUpdator = async () => {
    try {
        energyUpdateHandler();
        rewardHandler();
        referralRewardHandler()
    } catch (err) {
        console.log("blockchain/api/dbupdator", err.message)
    }
}

module.exports = { dbUpdator };