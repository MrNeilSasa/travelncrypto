require('@nomicfoundation/hardhat-toolbox')
require('dotenv').config()

const url = process.env.ALCHEMY_SEPOLIA_URL
const privateKey = process.env.SEPOLIA_PRIVATE_KEY

module.exports = {
  defaultNetwork: 'sepolia',
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY, // Or directly insert your API key here
  },
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
