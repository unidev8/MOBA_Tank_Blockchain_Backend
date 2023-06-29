// by Logan <https://github.com/loganworld>
// at 19/08/2022
const UserApi = require("../auth/api");
const { initHandler } = require("../blockchain/api");
const gameApi = require("../game/api");
initHandler();

module.exports = (router) => {
  // User API
  router.post("/auth/signup", UserApi.signUp);
  router.post("/auth/login", UserApi.logIn);
  router.post("/auth/update-userdata", UserApi.updateUserData);
  router.post("/auth/check-userdata", UserApi.checkUserData);
  router.post("/auth/get-userdata", UserApi.getUserData);
  router.post("/auth/get-alldata", UserApi.getAllUserData);
  router.post("/auth/get-referrals", UserApi.getReferrals);
  router.post("/auth/get-referrerdata", UserApi.getReferrerInfo);
  router.post("/auth/like", UserApi.like);
  router.post("/auth/claim-reward", UserApi.claimReward);
  router.post("/auth/get-alert", UserApi.getAlert);
  router.post("/auth/read-alert", UserApi.readAlert);

  router.post("/tanks/classes", gameApi.getTankClasses);
  router.post("/tanks/all-tanks", gameApi.getAlltanks);
  router.post("/tanks/user-tanks", gameApi.getUsertanks);
  router.post("/tanks/get-tanks", gameApi.getTanks);
  router.post("/tanks/get-upgradesign", gameApi.getUpgradeSign);
  router.post("/tanks/update-name", gameApi.updateName);

  router.post("/tanks/borrow", gameApi.borrow);
  router.post("/tanks/lend", gameApi.lend);
  router.post("/tanks/like", gameApi.like);
  router.post("/tanks/update-level", gameApi.updateLevel);

  router.post("/tanks/:id", gameApi.metadata);
};
