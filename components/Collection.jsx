import { Card } from '.'

const Collection = ({ apartments }) => {
  return (
    <div className="py-8 px-14 flex justify-center flex-wrap space-x-4 w-full">
      {apartments.map((room, i) => (
        <Card apartment={room} key={i} />
      ))}
      {apartments.length < 1 && <span>No apartments yet!</span>}
    </div>
  )
}

export default Collection
