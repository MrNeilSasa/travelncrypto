const { faker } = require('@faker-js/faker')
const { ethers } = require('hardhat')
const fs = require('fs')

const toWei = (num) => ethers.parseEther(num.toString())

const dataCount = 1
const maxPrice = 0.000005
imagesUrls = [
  'https://images.unsplash.com/photo-1515263487990-61b07816b324?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?im_w=720',
  'https://images.unsplash.com/photo-1628592102751-ba83b0314276?q=80&w=2597&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?im_w=720',
  'https://images.unsplash.com/photo-1630699144867-37acec97df5a?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?im_w=720',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?im_w=720',
  'https://plus.unsplash.com/premium_photo-1683769250375-1bdf0ec9d80f?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?im_w=720',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?img_w=720',
  'https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?im_w=720',
  'https://images.pexels.com/photos/280239/pexels-photo-280239.jpeg?im_w=720',
  'https://a0.muscache.com/im/pictures/49ee362b-b47f-49fa-b8c0-18a41dbd4c4d.jpg?im_w=720',
  'https://a0.muscache.com/im/pictures/miso/Hosting-569315897060112509/original/7db7c768-fb46-4934-904e-74a9771f9a60.jpeg?im_w=720',
  'https://a0.muscache.com/im/pictures/309bee53-311d-4f07-a2e7-14daadbbfb77.jpg?im_w=720',
  'https://a0.muscache.com/im/pictures/miso/Hosting-660654516377752568/original/be407e38-ad1e-4b2b-a547-2185068229f6.jpeg?im_w=720',
  'https://a0.muscache.com/im/pictures/miso/Hosting-10989371/original/46c0c87f-d9bc-443c-9b64-24d9e594b54c.jpeg?im_w=1200',
  'https://a0.muscache.com/im/pictures/miso/Hosting-653943444831285144/original/73346136-e0bb-46a8-8ce4-a9fb5229e6b3.jpeg?im_w=720',
  'https://a0.muscache.com/im/pictures/71993873/b158891b_original.jpg?im_w=720',
  'https://a0.muscache.com/im/pictures/prohost-api/Hosting-686901689015576288/original/2cd072fa-8c03-4ef3-a061-268b9b957e28.jpeg?im_w=720',
  'https://a0.muscache.com/im/pictures/b88162e9-9ce3-4254-8129-2ea8719ab2c3.jpg?im_w=720',
  'https://a0.muscache.com/im/pictures/prohost-api/Hosting-585362898291824332/original/8a92bd09-9795-4586-bc32-6ab474d0922b.jpeg?im_w=720',
  'https://a0.muscache.com/im/pictures/3757edd0-8d4d-4d51-9d2e-3000e8c3797e.jpg?im_w=720',
  'https://a0.muscache.com/im/pictures/b7811ddd-b5e6-43ee-aa41-1fa28cf5ef95.jpg?im_w=720',
]

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

const generateFakeApartment = (count) => {
  const apartments = []
  for (let i = 0; i < count; i++) {
    const id = i + 1
    const name = faker.word.words(5)
    const deleted = faker.datatype.boolean()
    const description = faker.lorem.paragraph()
    const location = faker.lorem.word()
    //const price = Math.random() * (maxPrice - 0.000001) + 0.000001
    const priceInWei = BigInt(Math.floor(Math.random() * (maxPrice * 1e18 - 1e18) + 1e18))
    const rooms = faker.number.int({ min: 2, max: 5 })
    const owner = faker.string.hexadecimal({
      length: { min: 42, max: 42 },
      prefix: '0x',
    })
    const timestamp = faker.date.past().getTime()
    const images = []

    for (let i = 0; i < 5; i++) {
      images.push(shuffleArray(imagesUrls)[0])
    }

    apartments.push({
      id,
      name,
      description,
      location,
      price: priceInWei, //toWei(price),
      images: images.join(', '),
      rooms,
      owner,
      timestamp,
      deleted,
    })
  }

  return apartments
}

async function createApartments(contract, apartment) {
  const tx = await contract.createApartment(
    apartment.name,
    apartment.description,
    apartment.location,
    apartment.images,
    apartment.rooms,
    apartment.price
  )
  await tx.wait()
}

async function bookApartments(contract, aid, dates) {
  const tx = await contract.bookApartment(aid, dates, {
    value: BigInt(maxPrice * 1e18) * BigInt(dates.length),
  })
  await tx.wait()
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  let travelnCryptoContract

  try {
    const contractAddresses = fs.readFileSync('./contracts/contractAddress.json', 'utf8')
    const { travelnCryptoContract: travelnCryptoAddress } = JSON.parse(contractAddresses)

    travelnCryptoContract = await ethers.getContractAt('TravelnCrypto', travelnCryptoAddress)
    const dates1 = [1678492800000, 1678579200000, 1678665600000]

    // Process #1
    await Promise.all(
      generateFakeApartment(dataCount).map(async (apartment) => {
        await createApartments(travelnCryptoContract, apartment)
      })
    )

    await delay(2500) // Wait for 2.5 seconds
    /*
    // Process #2
    await Promise.all(
      Array(dataCount)
        .fill()
        .map(async (_, i) => {
          await bookApartments(travelnCryptoContract, i + 1, dates1)
        })
    ) */

    console.log('Items dummy data seeded...')
  } catch (error) {
    console.error('Unhandled error:', error)
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exitCode = 1
})
