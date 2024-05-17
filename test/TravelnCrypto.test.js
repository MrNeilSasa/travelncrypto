const { expect } = require('chai')
const { ethers } = require('hardhat')
const { describe, beforeEach } = require('node:test')

const toWei = (num) => ethers.parseEther(num.toString())
const fromWei = (num) => ethers.formatEther(num)

const dates1 = [1725587200000, 1727203400000, 1700313044089]
const dates2 = [1728652800000, 1730165100000]

describe('Contracts', () => {
  let contract, result
  const id = 1
  const booking_id = 0
  const taxPercent = 16
  const securityFee = 7
  const name = 'First apartment'
  const location = 'Kingston'
  const newName = 'Updated Name of apartment'
  const description = 'Describing the new apartment'
  const images = [
    'https://images.unsplash.com/photo-1515263487990-61b07816b324?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?im_w=720',
    'https://images.unsplash.com/photo-1628592102751-ba83b0314276?q=80&w=2597&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?im_w=720',
    'https://images.unsplash.com/photo-1630699144867-37acec97df5a?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?im_w=720',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?im_w=720',
    'https://plus.unsplash.com/premium_photo-1683769250375-1bdf0ec9d80f?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?im_w=720',
  ]
  const rooms = 3
  const price = 2.7
  const newPrice = 1.3

  beforeEach(async () => {
    ;[deployer, owner, tac1, tac2] = await ethers.getSigners()
    console.log('Deploying contract ...')
    contract = await ethers.deployContract('TravelnCrypto', [taxPercent, securityFee])
    await contract.waitForDeployment()
  })

  describe('Apartment Test', () => {
    beforeEach(async () => {
      console.log('Calling Apartments ...')
      await contract
        .connect(owner)
        .createApartment(name, description, location, images.join(','), rooms, toWei(price))
    })

    it('Apartment can be found in apartments array', async () => {
      result = await contract.getAllApartments()
      expect(result).to.have.lengthOf(1)

      result = await contract.getApartment(id)
      expect(result.name).to.be.equal(name)
      expect(result.description).to.be.equal(description)
      expect(result.images).to.be.equal(images.join(','))
    })

    it('Apartment can be updated', async () => {
      console.log('Updating Apartment...')
      result = await contract.getApartment(id)
      expect(result.name).to.be.equal(name)
      expect(result.price).to.be.equal(toWei(price))

      await contract
        .connect(owner)
        .updateApartment(
          id,
          newName,
          description,
          location,
          images.join(','),
          rooms,
          toWei(newPrice)
        )

      result = await contract.getApartment(id)
      expect(result.name).to.be.equal(newName)
      expect(result.price).to.be.equal(toWei(newPrice))
    })

    it('Apartment can be deleted', async () => {
      console.log('Deleting Apartment...')

      result = await contract.getAllApartments()
      expect(result).to.have.lengthOf(1)
      result = await contract.getApartment(id)
      expect(result.deleted).to.be.equal(false)

      await contract.connect(owner).deleteApartment(id)
      result = await contract.getAllApartments()
      expect(result).to.have.lengthOf(0)
      result = await contract.getApartment(id)
      expect(result.deleted).to.be.equal(true)
    })
  })

  describe('Booking Tests', () => {
    describe('Successful Booking', () => {
      beforeEach(async () => {
        await contract
          .connect(owner)
          .createApartment(name, description, location, images.join(','), rooms, toWei(price))
      })
    })
  })
})
