require('@nomicfoundation/hardhat-toolbox')
require('dotenv').config()

const url = process.env.INFURA_SEPOLIA_RPC_URL
const privateKey = process.env.SEPOLIA_PRIVATE_KEY

module.exports = {
  defaultNetwork: 'localhost',
  networks: {
    hardhat: {},
    sepolia: {
      url: url,
      accounts: [privateKey],
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
  },
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 40000,
  },
}
