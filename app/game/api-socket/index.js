// by Logan <https://github.com/loganworld>
// at 19/08/2022

const UserController = require("../../auth/controller");
const { TanksController } = require("../../blockchain/controllers");
const { encryptFromJson, decryptToJson, securityCode } = require("../../utils");

/**
 * game socket module
 * @param {socket io} io 
 * @param {*} userMiddleware 
 */
const GameLisnter = (io, userMiddleware) => {
  io.on("connection", async (socket) => {
    console.log('game socket connected: ', socket.id);

    /**
     * get all tanks 
     */
    socket.on(securityCode['getAlltanks'], async (req) => {
      try {
        var tanks = await TanksController.finds({});
        socket.emit(securityCode["all-tanks"], { data: encryptFromJson({ tanks: tanks }) });
      } catch (err) {
        console.log("game/api-socket/gameLisnter: ", err.message);
        socket.emit(securityCode["error"], { data: encryptFromJson({ error: err.message }) });
      }
    });

    socket.on(securityCode['getEnegy'], async (req) => {
      try {
        const { socketID, nft_id, level } = decryptToJson(req.data);
        const tank = await TanksController.find({ id: nft_id })
        socket.emit(securityCode["update-tank-energy"], {
          data: encryptFromJson({
            energy: tank.energy
          })
        });
      } catch (err) {
        console.log("game/api-socket/addExperience: ", err.message);
        socket.emit(securityCode["error"], { data: encryptFromJson({ error: err.message }) });
      }
    });
    /**
     * get all tanks 
     * @param {String} socketId
     */
    socket.on(securityCode['getUsertanks'], async (req) => {
      try {
        var data = decryptToJson(req.data);
        var { socketId } = data;
        // get user info
        var user = global.users[socketId];
        var tanks = await TanksController.finds({ borrower: String(user.address).toUpperCase() });
        var sendDataList = [];
        for (const i of tanks) {
          await TanksController.updateEnergy({ id: i.id });
        }
        tanks = await TanksController.finds({ borrower: String(user.address).toUpperCase() });
        tanks.forEach(i => {
          const tank = {
            ...i._doc,
            ownerNickName: user.name,
            maxEnergy: Math.round(i.maxEnergy),
            energyPool: Math.round(i.energyPool),
            energy: Math.round(i.energy)
          }
          sendDataList.push(tank);
        });
        socket.emit(securityCode["user-tanks"], { data: encryptFromJson({ tanks: sendDataList }) });
      } catch (err) {
        console.log("game/api-socket/gameLisnter: ", err.message);
        socket.emit(securityCode["error"], { data: encryptFromJson({ error: err.message }) });
      }
    });
    /**
     * get all tanks 
     * @param {String} id // tank id
     * @param {exp} id // tank id
     */
    socket.on(securityCode['addExperience'], async (req) => {
      try {
        const { socketID, nft_id, level } = decryptToJson(req.data);
        let exp = (level + 1) * 100;
        var user = global.users[socketID];
        await UserController.update({ address: user.address }, { merit: Number(user.merit) + exp });
        global.users[socketID] = await UserController.find({ address: user.address });

        await TanksController.upgrade({ id: nft_id }, { experience: exp });
        await TanksController.updateLevel({ id: nft_id })
        const UpdatedTank = await TanksController.find({ id: nft_id })
        socket.emit(securityCode["update-tank"], {
          data: encryptFromJson({
            ...UpdatedTank._doc,
            ownerNickName: user.name,
            maxEnergy: Math.round(UpdatedTank.maxEnergy),
            energyPool: Math.round(UpdatedTank.energyPool),
            energy: Math.round(UpdatedTank.energy)
          })
        });
      } catch (err) {
        console.log("game/api-socket/addExperience: ", err.message);
        socket.emit(securityCode["error"], { data: encryptFromJson({ error: err.message }) });
      }
    });
    socket.on(securityCode['killed'], async (req) => {
      try {
        const { socketID, nft_id, level } = decryptToJson(req.data);
        var user = global.users[socketID];
        const tank = await TanksController.updateEnergy({ id: nft_id });

        if (Number(tank.energy) >= Number(tank.health))
          await TanksController.upgrade({ id: nft_id }, { energy: -1 * tank.health });
        else
          socket.emit(securityCode["kicked"], {
            data: encryptFromJson({
              ownerNickName: user.name
            })
          });
      } catch (err) {
        console.log("game/api-socket/killed: ", err.message);
        socket.emit(securityCode["error"], { data: encryptFromJson({ error: err.message }) });
      }
    });
  })
}


module.exports = GameLisnter;