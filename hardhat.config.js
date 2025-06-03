require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
      chainId: 97,
    },
  },
};
