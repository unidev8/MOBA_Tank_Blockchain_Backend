// by Logan <https://github.com/loganworld>
// at 19/08/2022

const { BlockNumbers, NFTTanks, Classes, AdminSetting, ReferralRewards, TransactionHistory, Notifications } = require("./models");
const ethers = require("ethers");
const { AdminWallet } = require("../contracts");
const UserController = require("../../auth/controller");

const BlockNumController = {
    create: async (props) => {
        const { id, latestBlock } = props;
        var result = await BlockNumbers.findOne({ id: id });
        if (!result) {
            const newData = new BlockNumbers({
                id: id,
                latestBlock: latestBlock,
            });
            result = await newData.save();
        } else {
            result.latestBlock = latestBlock;
            await result.save();
        }
        return result;
    },
    find: async (filter) => {
        return await BlockNumbers.findOne(filter);
    },
    update: async (filter, newData) => {
        return await BlockNumbers.updateOne(
            filter,
            { $set: newData }
        );
    },
    remove: async (filter) => {
        return await BlockNumbers.findOneAndDelete(
            filter
        );
    }
};

const ReferralController = {
    create: async (props) => {
        const { user, amount } = props;
        const isExists = await ReferralRewards.findOne({ user, status: 'pending' });
        if (!isExists) {
            const userInfo = await UserController.find({ user });
            if (userInfo.amount == 0) return { status: 500, message: "no claimable amount" }
            const newData = new ReferralRewards({
                user: user,
                amount: amount,
                action: "claimReferralReward",
                status: "pending",
                tx: "",
                log: ""
            });
            result = await newData.save();
            await UserController.update(
                { address: user },
                { referralReward: 0 }
            );
        } else {
            return { status: 500, message: "You already request claim" }
        }
        return { status: 200, message: "Claim request successed" }
    },
    find: async (filter) => {
        return await ReferralRewards.find(filter).limit(100);
    },
    update: async (filter, newData) => {
        return await ReferralRewards.updateOne(
            filter,
            { $set: newData }
        );
    },
    remove: async (filter) => {
        return await ReferralRewards.findOneAndDelete(
            filter
        );
    }
};
const TanksController = {
    create: async (props) => {
        const {
            id,
            owner,
            name,
            image,
            description,
            classType,
            health,
            fireRate,
            firePower,
            speed
        } = props;
        var result = await NFTTanks.findOne({ id: id });
        if (!result) {
            const newData = new NFTTanks({
                id,
                owner,
                level: 0,
                name,
                image,
                description,
                classType,
                energy: health * 10,
                maxEnergy: health * 10,
                experience: 0,
                health,
                fireRate,
                firePower,
                speed,
                borrower: owner
            });
            result = await newData.save();
        }
        return result;
    },
    find: async (filter) => {
        return await NFTTanks.findOne(filter);
    },
    finds: async (filter) => {
        return await NFTTanks.find(filter);
    },
    update: async (filter, newData) => {
        return await NFTTanks.updateOne(
            filter,
            { $set: newData }
        );
    },
    upgrade: async (filter, newData) => {
        return await NFTTanks.updateOne(
            filter,
            { $inc: newData }
        );
    },
    remove: async (filter) => {
        return await NFTTanks.findOneAndDelete(
            filter
        );
    },
    // update Energy
    updateEnergy: async (filter) => {
        var tank = await NFTTanks.findOne(filter);
        //update energy
        var now = Date.now();
        var from = new Date(tank.updatedAt);
        var duration = (now - from) / 1000;
        var chargedEnergy = duration * (tank.maxEnergy) / 24 / 3600; // duration * (energyPool + init recover power)*changeRate
        var newEnergy = tank.energy + chargedEnergy;
        newEnergy = newEnergy > tank.maxEnergy ? tank.maxEnergy : newEnergy;
        tank.energy = Math.round(newEnergy);
        await tank.save();
        return tank
    },
    // update all tank energy
    updateAllTankEnergy: async () => {
        var tanks = await NFTTanks.find({});
        //update energy
        tanks.map((tank) => {
            var now = Date.now();
            var from = new Date(tank.updatedAt);
            var duration = (now - from) / 1000;
            var chargedEnergy = duration * (tank.maxEnergy) / 24 / 3600; // duration * (energyPool + init recover power)*changeRate
            var newEnergy = tank.energy + chargedEnergy;
            newEnergy = newEnergy > tank.maxEnergy ? tank.maxEnergy : newEnergy;
            tank.energy = Math.round(newEnergy);
            tank.save();
        })
    },
    // update level
    updateLevel: async (filter) => {
        var tank = await NFTTanks.findOne(filter);
        var tankClassType = await Classes.findOne({ id: tank.classType });
        //update level
        var newLevel = Math.floor(Math.sqrt((tank.experience) / 1000));
        if (newLevel <= tank.tankLevel) return;

        tank.health = Number(tank.health) + Number(tankClassType.healthAdd * (newLevel - tank.tankLevel));
        tank.fireRate = Number(tank.fireRate) - Number(tankClassType.fireRateAdd * (newLevel - tank.tankLevel));
        if (tank.fireRate <= 40) tank.fireRate = 40;
        tank.firePower = Number(tank.firePower) + Number(tankClassType.firePowerAdd * (newLevel - tank.tankLevel));
        tank.speed = Number(tank.speed) + Number(tankClassType.speedAdd * (newLevel - tank.tankLevel));
        tank.tankLevel = newLevel;
        await tank.save();
    },
    // get sign for upgrade NFT
    getUpgradeSign: async (filter) => {
        var tank = await NFTTanks.findOne(filter);
        var availableLevel = Math.floor(tank.tankLevel);
        let messageHash = ethers.utils.solidityKeccak256(
            ["uint", "uint"],
            [tank.id, availableLevel]
        );
        let signature = await AdminWallet.signMessage(
            ethers.utils.arrayify(messageHash)
        );
        return { availableLevel, signature };
    }
};

const ClassesController = {
    create: async (props) => {
        const {
            id,
            name,
            image,
            description,
            health,
            fireRate,
            firePower,
            speed,
            healthAdd,
            fireRateAdd,
            firePowerAdd,
            speedAdd,
            price,
        } = props;
        var result = await Classes.findOne({ id: id });
        if (!result) {
            const newData = new Classes({
                id,
                name,
                image,
                description,
                health,
                fireRate,
                firePower,
                speed,
                healthAdd,
                fireRateAdd,
                firePowerAdd,
                speedAdd,
                price
            });
            result = await newData.save();
        }
        return result;
    },
    find: async (filter) => {
        return await Classes.findOne(filter);
    },
    finds: async (filter) => {
        return await Classes.find(filter);
    },
    update: async (filter, newData) => {
        return await Classes.updateOne(
            filter,
            { $set: newData }
        );
    },
    remove: async (filter) => {
        return await Classes.findOneAndDelete(
            filter
        );
    },
    dropDB: async () => {
        return await Classes.deleteMany({});
    }
};

const AdminSettingController = {
    create: async ({ type, value }) => {
        let res = await AdminSetting.findOne({ type: type });
        if (!res) {
            res = new AdminSetting({ type: type, value: value })
            await res.save();
        } else {
            res.value = value;
            await res.save();
        }
        return res;
    },
    find: async (filter) => {
        return await AdminSetting.findOne(filter);
    },
    finds: async (filter) => {
        return await AdminSetting.find(filter);
    },
    update: async (filter, newData) => {
        return await AdminSetting.updateOne(
            filter,
            { $set: newData }
        );
    },
};

const TxHistoryController = {
    create: async ({ type, value }) => {
        let res = new TransactionHistory({ type: type, value: value })
        await res.save();
        return res;
    },
    find: async (filter) => {
        return await TransactionHistory.findOne(filter);
    },
    finds: async (filter) => {
        return await TransactionHistory.find(filter);
    },
    update: async (filter, newData) => {
        return await TransactionHistory.updateOne(
            filter,
            { $set: newData }
        );
    },
}

const NotificationController = {
    create: async ({
        user,
        title,
        description,
        status,
        created
    }) => {
        let res = new Notifications({
            user,
            title,
            description,
            status,
            created
        })
        await res.save();
        return res;
    },
    find: async (filter) => {
        return await Notifications.findOne(filter);
    },
    finds: async (filter) => {
        return await Notifications.find(filter);
    },
    update: async (filter, newData) => {
        return await Notifications.updateOne(
            filter,
            { $set: newData }
        );
    },
}
module.exports = { BlockNumController, ReferralController, NotificationController, TanksController, ClassesController, AdminSettingController, TxHistoryController, TxHistoryController };

