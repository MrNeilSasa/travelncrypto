import Head from 'next/head'
import { getAllApartments } from '@/services/blockchain'
import { Category, Collection } from '@/components'

export default function Home({ apartmentsData }) {
  return (
    <div>
      <Head>
        <title>TravelnCrypto</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Category />
      <Collection apartments={apartmentsData} />
    </div>
  )
}

export const getServerSideProps = async () => {
  const apartmentsData = await getAllApartments()
  return {
    props: {
      apartmentsData: JSON.parse(JSON.stringify(apartmentsData)),
    },
  }
}
