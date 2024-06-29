import { ethers } from 'ethers'
import address from '@/contracts/contractAddress.json'
import { store } from '@/store'
import abi from '@/artifacts/contracts/TravelnCrypto.sol/TravelnCrypto.json'
import { globalActions } from '@/store/globalSlices'
import { containsNodeError } from 'viem/utils'

const toWei = (num) => ethers.parseEther(num.toString())
const fromWei = (num) => ethers.formatEther(num)

let ethereum, tx

if (typeof window !== 'undefined') {
  ethereum = window.ethereum
}

const { setBookings, setTimestamps, setReviews } = globalActions

//Get Ethereum Contracts functions allows us to interact with the blockchain

const readOnlyProvider = new ethers.JsonRpcProvider(process.env.ALCHEMY_SEPOLIA_URL)
const getEthereumContracts = async () => {
  const accounts = await ethereum?.request?.({ method: 'eth_accounts' })

  if (accounts?.length > 0) {
    const provider = new ethers.BrowserProvider(ethereum)
    const signer = await provider.getSigner() //A signer is needed for all blockchain projects as you need it to authorize transactions
    const contracts = new ethers.Contract(address.travelnCryptoContract, abi.abi, signer)

    return contracts
  } else {
    // //const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL) //value needs to be changed in env based on mainnet or testnet
    // const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_SEPOLIA_URL)
    // const wallet = ethers.Wallet.createRandom() //generates a random wallet address
    // const signer = wallet.connect(provider)
    // const contracts = new ethers.Contract(address.travelnCryptoContract, abi.abi, signer)
    const contracts = new ethers.Contract(address.travelnCryptoContract, abi.abi, readOnlyProvider)
    return contracts
  }
}

const structureApartments = (apartments) =>
  apartments
    .map((apartment) => ({
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
    .sort((a, b) => b.timestamp - a.timestamp)

const structureBookings = (bookings) =>
  bookings
    .map((booking) => ({
      id: Number(booking.id),
      apartment_id: Number(booking.apartment_id),
      tenant: booking.tenant,
      resale_tenant: booking.resale_tenant,
      date: Number(booking.date),
      price: fromWei(booking.price),
      checked: booking.checked,
      cancelled: booking.cancelled,
      resale: booking.resale,
      dateRebooked: booking.dateRebooked,
    }))
    .sort((a, b) => b.date - a.date)
    .reverse()

const structureReviews = (reviews) =>
  reviews
    .map((review) => ({
      id: Number(review.id),
      apartment_id: Number(review.apartment_id),
      reviewText: review.reviewText,
      timestamp: Number(review.timestamp),
      owner: review.owner,
    }))
    .sort((a, b) => b.timestamp - a.timestamp)

const structureResales = (resales) =>
  resales
    .map((resale) => ({
      price: fromWei(resale.price),
      booking_id: Number(resale.booking_id),
      date: Number(resale.date),
      reseller: resale.reseller,
      new_tenant: resale.new_tenant,
    }))
    .sort((a, b) => b.date - a.date)
    .reverse()

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

const createApartment = async (apartment) => {
  if (!ethereum) {
    reportError('Please install a browser provider')
    return Promise.reject(new Error('Browser provider not installed'))
  }

  console.log('Apartment Price: ', apartment.price)
  try {
    const contract = await getEthereumContracts()
    tx = await contract.createApartment(
      apartment.name,
      apartment.description,
      apartment.location,
      apartment.images,
      apartment.rooms,
      formatFromUSD(apartment.price)
    )
    await tx.wait()

    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const createResale = async (apartment_id, newPrice, booking_id) => {
  if (!ethereum) {
    reportError('Please install a browser provider')
    return Promise.reject(new Error('Browser provider not installed'))
  }
  console.log('createResale called with:', { apartment_id, newPrice, booking_id })
  try {
    const contract = await getEthereumContracts()
    console.log('Contract fetched:', contract)

    if (!contract) {
      throw new Error('Failed to get contract')
    }
    console.log('New Price: ', newPrice)
    console.log('Creating resale transaction...')
    tx = await contract.createResale(apartment_id, toWei(newPrice), booking_id)
    console.log('Transaction sent:', tx)
    await tx.wait()

    const bookings = await getAllBookings(apartment_id)

    store.dispatch(setBookings(bookings))

    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const formatFromUSD = async (price) => {
  //The following If statement is to ensure the user has a connected wallet
  console.log('Price to be formatted: ', price)
  if (!ethereum) {
    reportError('Please install a web3 wallet provider')
    return Promise.reject(new Error('Web3 Wallet provider not installed'))
  }
  try {
    const contract = await getEthereumContracts()
    const ethTousd = await getPrice()
    console.log('ETH-TO-USD ', ethTousd)
    const rate = 1 / ethTousd
    console.log('Rate: ', rate)
    const priceTobeFormated = rate * price

    const formatedPrice = toWei(priceTobeFormated)
    console.log('FormatedPrice: ', formatedPrice)
    return formatedPrice
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const getPrice = async () => {
  if (!ethereum) {
    reportError('Please install a web3 wallet provider')
    return Promise.reject(new Error('Web3 Wallet provider not installed'))
  }
  try {
    const contract = await getEthereumContracts()
    const rate = await contract.getPrice()
    console.log(fromWei(rate))
    return fromWei(rate)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const updateApartment = async (apartment) => {
  //The following If statement is to ensure the user has a connected wallet
  if (!ethereum) {
    reportError('Please install a web3 wallet provider')
    return Promise.reject(new Error('Web3 Wallet provider not installed'))
  }
  try {
    const contract = await getEthereumContracts()

    tx = await contract.updateApartment(
      apartment.id,
      apartment.name,
      apartment.description,
      apartment.location,
      apartment.images,
      apartment.rooms,
      toWei(apartment.price)
    )
    await tx.wait()

    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const deleteApartment = async (aid) => {
  if (!ethereum) {
    reportError('Please install a web3 wallet provider')
    return Promise.reject(new Error('Web3 Wallet provider not installed'))
  }

  try {
    const contract = await getEthereumContracts()
    tx = await contract.deleteApartment(aid)
    await tx.wait()

    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const addReview = async (apartment_id, comment) => {
  if (!ethereum) {
    reportError('Please install a web3 wallet provider')
    return Promise.reject(new Error('Web3 Wallet provider not installed'))
  }

  try {
    const contract = await getEthereumContracts()
    tx = await contract.addReview(apartment_id, comment)

    await tx.wait()
    const reviews = await getReviews(apartment_id)

    store.dispatch(setReviews(reviews))
    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const bookApartment = async ({ apartment_id, timestamps, amount }) => {
  if (!ethereum) {
    reportError('Please install a browser provider')
    return Promise.reject(new Error('Browser provider not installed'))
  }

  try {
    const contract = await getEthereumContracts()
    tx = await contract.bookApartment(apartment_id, timestamps, {
      value: toWei(amount),
    })

    await tx.wait()

    const bookedDates = await getBookedDates(apartment_id)

    store.dispatch(setTimestamps(bookedDates))
    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const checkIn = async (apartment_id, timestamps) => {
  if (!ethereum) {
    reportError('Please install a web3 wallet provider')
    return Promise.reject(new Error('Web3 Wallet provider not installed'))
  }

  try {
    const contract = await getEthereumContracts()
    tx = await contract.checkIn(apartment_id, timestamps)

    await tx.wait()
    const bookings = await getAllBookings(apartment_id)

    store.dispatch(setBookings(bookings))
    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const refund = async (apartment_id, booking_id) => {
  if (!ethereum) {
    reportError('Please install a web3 wallet provider')
    return Promise.reject(new Error('Web3 Wallet provider not installed'))
  }

  try {
    const contract = await getEthereumContracts()
    tx = await contract.refundBooking(apartment_id, booking_id)

    await tx.wait()
    const bookings = await getAllBookings(apartment_id)

    store.dispatch(setBookings(bookings))
    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const claimFunds = async (apartment_id, booking_id) => {
  if (!ethereum) {
    reportError('Please install a web3 wallet provider')
    return Promise.reject(new Error('Web3 Wallet provider not installed'))
  }

  try {
    const contract = await getEthereumContracts()
    tx = await contract.claimFunds(apartment_id, booking_id)

    await tx.wait()
    const bookings = await getAllBookings(apartment_id)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const displayPrice = async (apartment, dates) => {
  let price = 0
  let regular_dates = []
  let resale_dates = []

  if (!ethereum) {
    reportError('Please install a web3 wallet provider')
    return Promise.reject(new Error('Web3 Wallet provider not installed'))
  }

  try {
    const contract = await getEthereumContracts()
    for (let i = 0; i < dates.length; i++) {
      const resalePrice = await contract.getDisplayPrice(apartment.id, dates[i])
      if (fromWei(resalePrice) == 0) {
        price += Number(apartment.price)
        console.log('Apartment Price in displayPrice:', price)
        regular_dates.push(dates[i])
      } else {
        price += Number(fromWei(resalePrice))
        console.log('Apartment Price in displayPrice after resale:', price)
        resale_dates.push(dates[i])
      }
    }

    const perDayPrice = price / dates.length

    // Log the results
    console.log('Total Price:', price)
    console.log('Regular Dates:', regular_dates)
    console.log('Resale Dates:', resale_dates)
    console.log('Per Day Price:', perDayPrice)

    // Return the results
    return { price, regular_dates, resale_dates, perDayPrice }
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

export {
  getAllApartments,
  getApartment,
  getReviews,
  getAllBookings,
  getQualifiedReviewers,
  getBookedDates,
  getSecurityFee,
  updateApartment,
  createApartment,
  deleteApartment,
  addReview,
  bookApartment,
  checkIn,
  refund,
  claimFunds,
  createResale,
  displayPrice,
}
