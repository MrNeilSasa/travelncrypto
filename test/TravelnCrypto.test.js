const { expect } = require('chai')
const { ethers } = require('hardhat')
const { describe } = require('node:test')

const toWei = (num) => ethers.parseEther(num.toString())

const dates1 = [1725587200000, 1727203400000, 1700313044089]

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
  /*
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
  }) */

  describe('Booking Tests', () => {
    describe('Successful Booking', () => {
      beforeEach(async () => {
        await contract
          .connect(owner)
          .createApartment(name, description, location, images.join(','), rooms, toWei(price))

        const amount = price * dates1.length + (price * dates1.length * securityFee) / 100
        await contract.connect(tac1).bookApartment(id, dates1, {
          value: toWei(amount),
        })
      })

      it('Apartment can be booked', async () => {
        result = await contract.getAllBookings(id)
        expect(result).to.be.lengthOf(dates1.length)

        result = await contract.getUnavailableDates(id)
        expect(result).to.have.lengthOf(dates1.length)
      })

      it('Testing for Qualified reviewers', async () => {
        result = await contract.getQualifiedReviewers(id)
        expect(result).to.have.lengthOf(0)

        await contract.connect(tac1).checkIn(id, 1)

        result = await contract.getQualifiedReviewers(id)
        expect(result).to.have.lengthOf(1)
      })

      it('Tenant can check in to apartment', async () => {
        result = await contract.getBooking(id, booking_id)
        expect(result.checked).to.be.equal(false)

        result = await contract.connect(tac1).tenantBooked(id)
        expect(result).to.be.equal(false)

        await contract.connect(tac1).checkIn(id, booking_id)

        result = await contract.getBooking(id, booking_id)
        expect(result.checked).to.be.equal(true)

        result = await contract.connect(tac1).tenantBooked(id)
        expect(result).to.be.equal(true)
      })

      it('Refunds should be possible', async () => {
        result = await contract.getBooking(id, booking_id)
        expect(result.cancelled).to.be.equal(false)

        await contract.connect(tac1).refundBooking(id, booking_id)

        result = await contract.getBooking(id, booking_id)
        expect(result.cancelled).to.be.equal(true)
      })

      it('Check for correct Fees and Taxes', async () => {
        result = await contract.securityFee()
        expect(result).to.be.equal(securityFee)
        result = await contract.taxPercent()
        expect(result).to.be.equal(taxPercent)
      })
    })

    describe('Failed Booking', () => {
      beforeEach(async () => {
        await contract
          .connect(owner)
          .createApartment(name, description, location, images.join(','), rooms, toWei(price))
      })

      it('Should prevent booking with wrong id', async () => {
        const amount = price * dates1.length + (price * dates1.length * securityFee) / 100
        await expect(
          contract.connect(tac1).bookApartment(666, dates1, {
            value: toWei(amount),
          })
        ).to.be.revertedWith('Error: Apartment cannot be found')
      })

      it('Should prevent booking with wrong pricing', async () => {
        await expect(
          contract.connect(tac1).bookApartment(id, dates1, {
            value: toWei(price * 0 + securityFee),
          })
        ).to.be.revertedWith('Insufficient fund!')
      })
    })
  })
})
