// by Logan <https://github.com/loganworld>
// at 19/08/2022
var colors = require("colors");
const cron = require("node-cron");
const ethers = require("ethers");

/**
 * Blockchain Event handler
 * @param { String } id
 * @param { JSONRPCProvider } provider
 * @param { ethers .Contract} contract
 * @param { String } event
 * @param { Number } times
 * @param { CallBack } handler
 * @param { DBController } BlockNumController
 */

const handleEvent = async (props) => {
  const {
    id,
    provider,
    contract,
    event,
    times,
    handler,
    BlockNumController,
  } = props;

  var latestblocknumber;
  const handletransactions = async () => {
    try {
      let blockNumber = await provider.getBlockNumber();
      console.log(
        "handle transactions : ",
        contract.address,
        event,
        latestblocknumber,
        blockNumber
      );
      if (blockNumber > latestblocknumber) {
        blockNumber =
          blockNumber > latestblocknumber + 20
            ? latestblocknumber + 100
            : blockNumber;

        var txhistory = contract.queryFilter(
          event,
          latestblocknumber + 1,
          blockNumber
        );
        await txhistory.then(async (res) => {
          for (var index in res) {
            try {
              console.log("handle transaction", id, res[index].args);
            } catch (err) {
              
            }
            handler(res[index], id);
          }
        });
        latestblocknumber = blockNumber;

        await BlockNumController.update(
          { id: id },
          { latestBlock: blockNumber }
        );
      }
    } catch (err) {
      if (err.reason === "missing response") {
        console.log(colors.red("you seem offline"));
      } else {
        console.log("handleEvent err ", event, err.reason);
      }
    }
  };
  const handleEvent = async () => {
    try {
      var blockNumber = (await BlockNumController.find({ id: id }))
        .latestBlock;
      if (!blockNumber) throw new Error("not find");
    } catch (err) {
      blockNumber = await provider.getBlockNumber();
      await BlockNumController.create({
        id: id,
        latestBlock: blockNumber,
      });
    }
    latestblocknumber = blockNumber;
    cron.schedule(`*/${times} * * * * *`, () => {
      // console.log(`running a transaction handle every ${times} second`);
      handletransactions();
    });
  };
  handleEvent();
};

module.exports = {
  handleEvent
};
