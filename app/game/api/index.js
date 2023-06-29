
// at 19/08/2022
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const { TanksController, ClassesController } = require("../../blockchain/controllers");

const gameApi = {
  /**
   * get all tank classes
   * @param {*} req 
   * @param {*} res 
   */
  getTankClasses: async (req, res) => {
    try {
      var classes = await ClassesController.finds({});
      res.status(200).json({ status: true, data: classes });
    } catch (err) {
      console.error("gameApi/getAlltanks : ", err.message);
      res.status(500).json({ error: err.message });
    }
  },
  /**
   * get all tanks
   * @param {*} req 
   * @param {*} res 
   */
  getAlltanks: async (req, res) => {
    try {
      var tanks = await TanksController.finds({});
      res.status(200).json({ status: true, data: tanks });
    } catch (err) {
      console.error("gameApi/getAlltanks : ", err.message);
      res.status(500).json({ error: err.message });
    }
  },
  /**
   * get all tanks that owned by user
   * @param {userAddress:Address} req 
   * @param {*} res 
   */
  getUsertanks: async (req, res) => {
    try {
      const { userAddress } = req.body;
      var tanks = await TanksController.finds({ owner: String(userAddress).toUpperCase() });
      res.status(200).json({ status: true, data: tanks });
    } catch (err) {
      console.error("gameApi/getAlltanks : ", err.message);
      res.status(500).json({ error: err.message });
    }
  },
  /**
   * get tank infos with ids
   * @param {ids:Array<int>} req 
   * @param {*} res 
   */
  getTanks: async (req, res) => {
    try {
      const { ids } = req.body;
      var tanks = [];
      for (var i = 0; i < ids.length; i++) {
        var tank = await TanksController.find({ id: ids[i] });
        tanks.push(tank);
      }
      res.status(200).json({ status: true, data: tanks });
    } catch (err) {
      console.error("gameApi/getTanks : ", err.message);
      res.status(500).json({ error: err.message });
    }
  },
  /**
   * get metadata of token
   * @param {params:{id:sting}} req 
   * @param {*} res 
   */
  metadata: async (req, res) => {
    try {
      var id = req.params.id;
      var tank = await TanksController.find({ id: id });
      res.json({
        "image": tank.image,
        "name": tank.name,
        "description": tank.description,
        "owner": tank.owner,
        attributes: [
          {
            trait_type: "health",
            value: `${tank.health} + ${tank.healthAdd}`,
          },
          {
            trait_type: "fireRate",
            value: `${tank.fireRate} + ${tank.fireRateAdd}`,
          },
          {
            trait_type: "firePower",
            value: `${tank.firePower} + ${tank.firePowerAdd}`,
          },
          {
            trait_type: "speed",
            value: `${tank.speed} + ${tank.speedAdd}`,
          },
        ]
      })
    } catch (err) {
      res.json({
        "image": "",
        "name": "invalid id",
        "description": "invalid item"
      })
    }
  },
  /**
   * get sign for upgrade NFT
   * @param {tokenId} req 
   * @param {*} res 
   */
  getUpgradeSign: async (req, res) => {
    try {
      const { id } = req.body;
      var { availableLevel, signature } = await TanksController.getUpgradeSign({ id: id });
      res.status(200).json({ status: true, data: { availableLevel, signature } });
    } catch (err) {
      console.error("gameApi/getUpgradeSign : ", err.message);
      res.status(500).json({ error: err.message });
    }
  },
  /**
   * borrow tank in lending pool
   * @param {id, signature} req 
   * @param {*} res 
   */
  borrow: async (req, res) => {
    try {
      const { id, signature } = req.body;
      const address = await ethers.utils.verifyMessage(id, signature);
      var tank = await TanksController.find({ id: id });

      if (address.toUpperCase() != tank.owner.toUpperCase()) {
        if (!tank || tank.borrower != "") throw new Error("invalid tank id");
        // user action - return borrowed tanks
        let userTanks = await TanksController.finds({ borrower: address.toUpperCase() });
        let borrowTanks = userTanks.filter(tank => tank.owner != address.toUpperCase());
        borrowTanks.map((tank) => {
          TanksController.update({ id: tank.id }, { borrower: "" });
        });
      }
      await TanksController.update({ id: id }, { borrower: address.toUpperCase() });

      var tank = await TanksController.find({ id: id });
      res.status(200).json({ status: true, data: tank });
    } catch (err) {
      console.error("gameApi/borrow : ", err.message);
      res.status(500).json({ error: err.message });
    }
  },
  /**
   * lend tank to pool or other player
   * @param {id, to, signature} req 
   * @param {*} res 
   */
  lend: async (req, res) => {
    try {
      const { id, to, signature } = req.body;
      const address = await ethers.utils.verifyMessage(id, signature);
      var tank = await TanksController.find({ id: id });
      if (!tank) throw new Error("invalid tank id");
      // only owner or borrower
      if (tank.borrower.toUpperCase() != address.toUpperCase() && tank.owner.toUpperCase() != address.toUpperCase())
        throw new Error("Permission denied");
      await TanksController.update({ id: id }, { borrower: to ? to.toUpperCase() : "" });

      var tank = await TanksController.find({ id: id });
      res.status(200).json({ status: true, data: tank });
    } catch (err) {
      console.error("gameApi/lend : ", err.message);
      res.status(500).json({ error: err.message });
    }
  },
  /**
   * lend tank to pool or other player
   * @param {id, to, signature} req 
   * @param {*} res 
   */
  like: async (req, res) => {
    try {
      const { id, signature } = req.body;
      const address = await ethers.utils.verifyMessage(id, signature);
      var tank = await TanksController.find({ id: id });
      if (!tank) throw new Error("invalid tank id");

      let followerIndex = tank.followers.findIndex((follower) => follower == address.toUpperCase());
      console.log("followerIndex", followerIndex);
      if (followerIndex != -1) {
        // unlike
        tank.followers.splice(followerIndex, 1);
      } else {
        // like
        tank.followers = [...tank.followers, address.toUpperCase()];
      }

      await TanksController.update({ id: id }, { followers: tank.followers });
      var tank = await TanksController.find({ id: id });
      res.status(200).json({ status: true, data: tank });
    } catch (err) {
      console.error("gameApi/getUpgradeSign : ", err.message);
      res.status(500).json({ error: err.message });
    }
  },
  /**
   * change tank name
   * @param {id, newName, newDescription} req 
   * @param {*} res 
   */
  updateName: async (req, res) => {
    try {
      const { id, newName, newDescription, signature } = req.body;
      const address = await ethers.utils.verifyMessage(id, signature);
      var tank = await TanksController.find({ id: id });
      if (!tank) throw new Error("invalid tank id");

      if (tank.owner.toUpperCase() != address.toUpperCase()) {
        throw new Error("Permission Denied!")
      }

      var tankWithSameName = await TanksController.find({ name: newName });
      if (tankWithSameName && tankWithSameName.id != tank.id)
        throw new Error("Name is exist");

      await TanksController.update({ id: id }, { name: newName, description: newDescription });
      var tank = await TanksController.find({ id: id });
      res.status(200).json({ status: true, data: tank });
    } catch (err) {
      console.error("gameApi/getUpgradeSign : ", err.message);
      res.status(500).json({ error: err.message });
    }
  },
  /**
   * manual update Level
   */
  updateLevel: async (req, res) => {
    try {
      const { id } = req.body;
      await TanksController.updateLevel({ id: id });
      res.status(200).json({ status: true, data: true });
    } catch (err) {
      console.error("gameApi/getUpgradeSign : ", err.message);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = gameApi;