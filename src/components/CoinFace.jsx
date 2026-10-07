import { flag } from '../data/catalog.js'

export default function CoinFace({ coin, count, big, photo }) {
  if (photo && count > 0) {
    return (
      <span className={`coin has-photo${big ? ' coin--big' : ''}`} aria-hidden="true">
        <img src={photo} alt="" />
      </span>
    )
  }
  return (
    <span className={`coin ${count > 0 ? 'is-owned' : 'is-missing'}${big ? ' coin--big' : ''}`} aria-hidden="true">
      <span className="coin-core">
        <span className="coin-flag">{flag(coin.country)}</span>
        <span className="coin-year">{coin.sortYear}</span>
      </span>
    </span>
  )
}
