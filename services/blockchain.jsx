import { ethers } from 'ethers'
import address from '@/contracts/contractAddress.json'
import abi from '@/artifacts/contracts/TravelnCrypto.sol/TravelnCrypto.json'

const toWei = (num) => ethers.parseEther(num.toString())
const fromWei = (num) => ethers.formatEther(num)

let ethereum, tx

if (typeof window !== 'undefined') {
  ethereum = window.ethereum
}

//Get Ethereum Contracts functions allows us to interact with the blockchain
const getEthereumContracts = async () => {
  const accounts = await ethereum?.request?.({ method: 'eth_accounts' })

  if (accounts?.length > 0) {
    const provider = new ethers.BrowserProvider(ethereum)
    const signer = await provider.getSigner() //A signer is needed for all blockchain projects as you need it to authorize transactions
    const contracts = new ethers.Contract(address.travelnCryptoContract, abi.abi, signer)

    return contracts
  } else {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL) //value needs to be changed in env based on mainnet or testnet
    const wallet = ethers.Wallet.createRandom() //generates a random wallet address
    const signer = wallet.connect(provider)
    const contracts = new ethers.Contract(address.travelnCryptoContract, abi.abi, signer)

    return contracts
  }
}

const structureApartments = (apartments) =>
  apartments.map((apartment) => ({
    id: Number(apartment.id),
    name: apartment.name,
    owner: apartment.owner,
    description: apartment.description,
    location: apartment.location,
    price: fromWei(apartment.price),
    deleted: apartment.deleted,
    images: apartment.images.split(','),
    rooms: Number(apartment.rooms),
    timestamp: Number(apartment.timestamp),
    booked: apartment.booked,
  }))

const structureBookings = (bookings) =>
  bookings.map((booking) => ({
    id: Number(booking.id),
    apartment_id: Number(booking.apartment_id),
    tenant: booking.tenant,
    date: Number(booking.date),
    price: fromWei(booking.price),
    checked: booking.checked,
    cancelled: booking.cancelled,
  }))

const structureReviews = (reviews) =>
  reviews.map((review) => ({
    id: Number(review.id),
    apartment_id: Number(review.apartment_id),
    reviewText: review.reviewText,
    timestamp: Number(review.timestamp),
    owner: review.owner,
  }))

const getAllApartments = async () => {
  const contract = await getEthereumContracts()

  const apartments = await contract.getAllApartments()
  return structureApartments(apartments)
}

const getApartment = async (id) => {
  const contract = await getEthereumContracts()
  const apartment = await contract.getApartment(id)
  return structureApartments([apartment])[0]
}

const getReviews = async (id) => {
  const contract = await getEthereumContracts()
  const reviewers = await contract.getReviews(id)
  return structureReviews(reviewers)
}

const getQualifiedReviewers = async (id) => {
  const contract = await getEthereumContracts()
  const bookings = await contract.getQualifiedReviewers(id)
  return bookings
}

const getAllBookings = async (id) => {
  const contract = await getEthereumContracts()
  const bookings = await contract.getAllBookings(id)
  return structureBookings(bookings)
}

const getBookedDates = async (id) => {
  const contract = await getEthereumContracts()
  const bookings = await contract.getUnavailableDates(id)
  const timestamps = bookings.map((timestamp) => Number(timestamp))
  return timestamps
}

const getSecurityFee = async () => {
  const contract = await getEthereumContracts()
  const fee = await contract.securityFee()
  return Number(fee)
}

export {
  getAllApartments,
  getApartment,
  getReviews,
  getAllBookings,
  getQualifiedReviewers,
  getBookedDates,
  getSecurityFee,
}
