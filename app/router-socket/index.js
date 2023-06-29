// by Logan <https://github.com/loganworld>
// at 19/08/2022
const { AuthLisnter, userMiddleware } = require("../auth/api-socket");
const GameLisnter = require("../game/api-socket");

const SocketLisnter = (io) => {
    AuthLisnter(io);
    GameLisnter(io, userMiddleware);
}

module.exports = SocketLisnter;