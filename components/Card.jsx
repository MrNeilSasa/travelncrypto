import React from 'react'
import Link from 'next/link'
import { ImageSlider } from '.'
import { FaStar, FaEthereum } from 'react-icons/fa'
import { formatDate } from '@/utils/helper'

const Card = ({ apartment }) => {
  return (
    <div className="shadow-md w-96 text-xl pb-5 rounded-b-2xl mb-20">
      <Link href={'/room/' + apartment.id}>
        <ImageSlider images={apartment.images} />
      </Link>
      <div className="px-4">
        <div className="flex justify-between items-start mt-2">
          <p className="font-semibold capitalize text-[15px]">{apartment.name}</p>
          <p className="flex justify-start items-center space-x-2 text-sm">
            <FaStar />
            <span>New</span>
          </p>
        </div>
        <div className="flex justify-between items-center text-sm">
          <p className="text-gray-700">{formatDate(apartment.timestamp)}</p>
          <b className="flex justify-start items-center space-x-1 font-semibold">
            <FaEthereum />
            <span>{apartment.price} Night</span>
          </b>
        </div>
      </div>
    </div>
  )
}

export default Card
