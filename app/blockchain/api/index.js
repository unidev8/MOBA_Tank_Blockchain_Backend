// by Logan <https://github.com/loganworld>
// at 19/08/2022

const ethers = require("ethers");
const { blockchainHandler } = require("./handleEvents");
const { ClassesController } = require("../controllers")
const classes = require("./classes.json");
const { dbUpdator } = require("./dbUpdator");

const initClasses = async () => {
  await ClassesController.dropDB();
  await Promise.all(
    classes.map(async (newClass) => {
      await ClassesController.create({
        id: newClass.id,
        name: newClass.name,
        image: newClass.image,
        description: newClass.description,
        health: newClass.health,
        fireRate: newClass.fireRate,
        firePower: newClass.firePower,
        speed: newClass.speed,
        healthAdd: newClass.healthAdd,
        fireRateAdd: newClass.fireRateAdd,
        firePowerAdd: newClass.firePowerAdd,
        speedAdd: newClass.speedAdd,
        price: newClass.price
      })
    }));
}

const initHandler = async () => {
  // class init
  await initClasses();
  // start block handle
  blockchainHandler();
  dbUpdator();
}

module.exports = { initHandler };