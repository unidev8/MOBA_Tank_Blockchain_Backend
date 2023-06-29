// by Logan <https://github.com/loganworld>
// at 19/08/2022

const jwt = require("jsonwebtoken");
const UserController = require("../controller");
const { getHash } = require("../utils")
const { encryptFromJson, decryptToJson, securityCode } = require("../../utils");

//login, disconnect, autoLogin

const userMiddleware = async (socket) => {
  if (!global.users[socket.id]) {
    socket.emit(securityCode["authError"]);
    return null;
  }
  const Result = await UserController.find({
    name: global.users[socket.id].name
  });
  global.users[socket.id] = Result._doc;
  return global.users[socket.id];
};

const AuthLisnter = (io) => {
  global.users = [];
  io.on("connection", async (socket) => {
    console.log('socket connected: ', socket.id);
    socket.on('disconnect', () => {
      if (!global.users[socket.id])
        delete global.users[socket.id];
      console.log('socket disconnected: ' + socket.id);
    });
    socket.on(securityCode['login'], async (req) => {
      console.log('socket login: ', socket.id);
      try {
        const { name, password } = decryptToJson(req.data);
        const hashedPassword = getHash(name, password);
        var userData = await UserController.find({ name: name });
        if (!userData) throw new Error("Invalid username");
        if (userData.password != hashedPassword) throw new Error("Invalid password");

        global.users[socket.id] = userData;

        const encryptedData = encryptFromJson({ name: userData.name, address: userData.address, email: userData.email, avata_url: userData.image, merit: userData.merit });

        console.log('socket logined: ', socket.id);
        socket.emit(securityCode['loginSuccess'], { data: encryptedData });
      } catch (err) {
        console.error("Auth/logIn : ", err.message);
        const encryptedData = encryptFromJson({ error: err.message });
        socket.emit(securityCode['loginError'], { data: encryptedData })
      }
    })
    // get user data 
    socket.on(securityCode['auth-data'], async (req) => {
      try {
        if (!global.users[socket.id]) return;
        var userData = await UserController.find({ name: global.users[socket.id].name });
        if (!userData) return;

        global.users[socket.id] = userData;

        const encryptedData = encryptFromJson({ name: userData.name, address: userData.address, email: userData.email, avata_url: userData.image, merit: userData.merit });

        console.log('socket logined: ', socket.id);
        socket.emit(securityCode['loginSuccess'], { data: encryptedData });
      } catch (err) {
        console.error("Auth/logIn : ", err.message);
        const encryptedData = encryptFromJson({ error: err.message });
        socket.emit(securityCode['loginError'], { data: encryptedData })
      }
    })
    // temp 
    socket.on(securityCode['signup'], async (req) => {
      try {
        const { name, email, password } = decryptToJson(req.data);
        var address = "0xfB4d81A31BcBC5E2024f6c4247DD2Ce913bd7c95";
        const hashedPassword = getHash(name, password);
        // create user data 
        await UserController.create({ name, email, hashedPassword, address });
        socket.emit(securityCode['signupSuccess'], encryptFromJson({}));

      } catch (err) {
        console.error("Auth/signup : ", err.message);
        const encryptedData = encryptFromJson({ error: err.message });
        socket.emit(securityCode['signupError'], { data: encryptedData })
      }
    })
  })
}

module.exports = { AuthLisnter, userMiddleware };
