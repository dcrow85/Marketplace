import { useEffect, useMemo, useState } from 'react'
import { retryImg } from '../binder/helpers.jsx'
import { avatarSVG } from '../identity.js'
import AskAnko from '../trade/AskAnko.jsx'
import './card-page.css'

const SCAN_REQUEST_USDC = 10
const assetSrc = (src = '') => /^(?:https?:|data:|blob:|\/)/i.test(src)
  ? src
  : `${(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}${src}`

function Avatar({ seller, size = 34 }) {
  if (seller.photo) return <span className="av"><img src={seller.photo} width={size} height={size} alt="" /></span>
  return <span className="av" dangerouslySetInnerHTML={{ __html: avatarSVG(seller.id, size) }} />
}

function Fact({ label, children, className = '' }) {
  if (children == null || children === '') return null
  return <span className={`cp-fact ${className}`}><small>{label}</small><b>{children}</b></span>
}

function EvidenceMark({ listing }) {
  if (listing.witness) return <span className="cp-evidence recorded"><i>✓</i><span><b>{listing.witness} scan{listing.witness === 1 ? '' : 's'} recorded</b><small>views of this seller copy</small></span></span>
  if (Number(listing.ask) > SCAN_REQUEST_USDC) return <span className="cp-evidence needed"><i>!</i><span><b>Seller photos needed</b><small>catalogue art is shown</small></span></span>
  return <span className="cp-evidence optional"><i>○</i><span><b>Catalogue art</b><small>photos optional at this ask</small></span></span>
}

function CardDetails({ card, listings, sales }) {
  const typeLine = [...new Set([...(card.types || []), ...(card.subtypes || [])].filter(Boolean))].join(' · ')
  const effects = Array.isArray(card.effects) ? card.effects.map((effect) => typeof effect === 'string' ? effect : [effect?.label, effect?.text].filter(Boolean).join(': ')).filter(Boolean).join(' · ') : card.effects
  const rules = card.card_text || card.definition_text || card.ruling_text || effects
  const asks = listings.map(({ l }) => Number(l.ask) || 0).filter((ask) => ask > 0)
  return <div className="cp-detailsgrid">
    <details className="cp-detail" open>
      <summary><span>Card details</span><small>{typeLine || 'recorded catalogue fields'}</small></summary>
      <div className="cp-detailbody">
        <div className="cp-statline">
          <Fact label="Type">{typeLine}</Fact>
          <Fact label="Element">{card.element}</Fact>
          <Fact label="IKZ cost">{card.ikz_cost}</Fact>
          <Fact label="Attack">{card.attack}</Fact>
          <Fact label="Health">{card.health}</Fact>
        </div>
        {rules && <p className="cp-rules">{rules}</p>}
        {card.flavor_text && <p className="cp-flavor">{card.flavor_text}</p>}
      </div>
    </details>
    <details className="cp-detail">
      <summary><span>Market record</span><small>seller claims and recorded outcomes</small></summary>
      <div className="cp-detailbody">
        <div className="cp-statline">
          <Fact label="Current asks" className="money">{asks.length ? `${Math.min(...asks)}${Math.max(...asks) !== Math.min(...asks) ? `–${Math.max(...asks)}` : ''} USDC` : 'none'}</Fact>
          <Fact label="Tables">{listings.length}</Fact>
          <Fact label="Recorded settlements">{sales.length}</Fact>
        </div>
        {sales.length ? <div className="cp-sales mono">{sales.slice(0, 5).map((sale, index) => <span key={`${sale.t || 'sale'}:${index}`}><b className="money">{sale.p} USDC</b><small>{sale.t || 'date not recorded'}</small></span>)}</div>
          : <p className="cp-marketnote">No settlement has been recorded for this catalogue entry yet.</p>}
        <p className="cp-marketnote">Asks are active seller claims. Settlements are recorded outcomes—not an appraisal.</p>
      </div>
    </details>
    <details className="cp-detail">
      <summary><span>Identity & provenance</span><small>what this catalogue row represents</small></summary>
      <div className="cp-detailbody mono cp-provenance">
        <p><b>Catalogue entry</b>{card.uid}</p>
        {card.source_authority && <p><b>Source</b>{card.source_authority.replaceAll('_', ' ')}</p>}
        {card.illustrator && <p><b>Illustrator</b>{card.illustrator}</p>}
        {card.image_status && <p><b>Image</b>{card.image_status.replaceAll('_', ' ')}</p>}
      </div>
    </details>
  </div>
}

export default function CardPage({
  card, listings, sales = [], myEntry, initialSellerId, agentName = 'Anko', roomNote,
  sellerName, inPile, onPickUp, onVisitSeller, onBack, onChangeStance,
}) {
  const [sort, setSort] = useState('best')
  const [selectedSellerId, setSelectedSellerId] = useState(initialSellerId || listings[0]?.s.id || null)
  const [ankoRead, setAnkoRead] = useState(null)
  const sorted = useMemo(() => [...listings].sort((a, b) => {
    if (sort === 'price_asc') return a.l.ask - b.l.ask || sellerName(a.s).localeCompare(sellerName(b.s))
    if (sort === 'price_desc') return b.l.ask - a.l.ask || sellerName(a.s).localeCompare(sellerName(b.s))
    if (sort === 'evidence') return (b.l.witness || 0) - (a.l.witness || 0) || a.l.ask - b.l.ask
    if (sort === 'copies') return (b.l.copies || 1) - (a.l.copies || 1) || a.l.ask - b.l.ask
    const value = ({ l }) => (Number(l.ask) > SCAN_REQUEST_USDC && !l.witness ? 1 : 0)
    return value(a) - value(b) || a.l.ask - b.l.ask || sellerName(a.s).localeCompare(sellerName(b.s))
  }), [listings, sellerName, sort])
  const selected = listings.find(({ s }) => s.id === selectedSellerId) || sorted[0] || null
  const asks = listings.map(({ l }) => Number(l.ask) || 0).filter((ask) => ask > 0)
  const totalCopies = listings.reduce((sum, { l }) => sum + Math.max(1, Number(l.copies) || 1), 0)
  const lowestAsk = asks.length ? Math.min(...asks) : null
  const highestAsk = asks.length ? Math.max(...asks) : null
  const latestSale = sales[0] || null
  const stance = myEntry?.stance || 'none'
  const selectedPile = selected ? inPile(selected.s.id, card.uid) : null

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${card.name_en || card.num || 'Card'} · Cairn`
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    return () => { document.title = previousTitle }
  }, [card])
  const selectCopy = (sellerId) => {
    setSelectedSellerId(sellerId)
    setAnkoRead(null)
  }
  const stageAndVisit = (flow, cash = null, note = '') => {
    if (!selected) return
    onPickUp(selected.s.id, card.uid, 'buy')
    onVisitSeller(selected.s.id, flow, cash, note)
  }
  const suggestedCounter = selected
    ? Math.round(Math.max(0, Number(latestSale?.p ?? Number(selected.l.ask) * .9)) * 100) / 100
    : 0
  const decision = selected ? {
    decision_ref: `card-page:${selected.s.id}:${card.uid}:${selected.l.ask}:${selected.l.witness || 0}`,
    kind: 'listing_evidence',
    question: 'What can I reasonably conclude about this specific seller copy before I buy it or make an offer?',
    terms: {
      seller: selected.s.id, uid: card.uid, card: card.name_en, ask_usdc: selected.l.ask,
      seller_condition_claim: selected.l.cond, copies: selected.l.copies || 1,
    },
    principal_context: {
      recorded_policy: Number(selected.l.ask) > SCAN_REQUEST_USDC
        ? 'Fresh seller photos are requested for listings over 10 USDC.'
        : 'Seller photos are optional for listings at 10 USDC or less.',
    },
    evidence: {
      recorded_scan_count: selected.l.witness || 0,
      latest_recorded_settlement_usdc: latestSale?.p ?? null,
      stock_catalog_image_only: !selected.l.witness,
    },
  } : null
  const actionsForRead = (read) => {
    if (!selected) return []
    if (read.lean === 'accept') return [{
      id: 'continue-buy', label: `Checkout · ${selected.l.ask} USDC`, primary: true,
      onSelect: () => stageAndVisit('buy'),
    }]
    if (read.lean === 'counter') return [{
      id: 'counter-copy', kind: 'amount', label: 'Make an offer at', amount: suggestedCounter,
      confirmLabel: 'Open offer', hint: latestSale?.p != null ? 'Starts at the latest recorded settlement. Edit it if you like.' : 'Starts 10% below the ask. Edit it if you like.',
      onConfirm: (amount) => stageAndVisit('offer', String(amount)),
    }]
    if (read.lean === 'request_evidence') return [{
      id: 'request-copy-evidence', label: 'Ask this seller for fresh photos', primary: true,
      onSelect: () => stageAndVisit('offer', null, `Before we settle, please add fresh front, back, corners, and holo-tilt photos for ${card.name_en}.`),
    }]
    return []
  }

  return <article className="cp-page">
    {roomNote}
    <button type="button" className="cp-back mono" onClick={onBack}>← All tables</button>
    <header className="cp-hero">
      <div className="cp-artstage">
        {card.image
          ? <img src={assetSrc(card.image)} alt={card.name_en || card.num} onError={(event) => retryImg(event, assetSrc(card.image))} />
          : <div className="cp-noart">{card.image_suppressed ? 'Reference image not displayed' : 'Catalogue image not recorded'}</div>}
        {card.holo && <span className="cp-holo">{card.star_alt ? '★ alternate art' : '✦ holo'}</span>}
      </div>
      <div className="cp-identity">
        <div className="cp-kicker mono"><span>{card.release_family_label || card.release_family || 'Azuki TCG'}</span><i>Card record</i></div>
        <h1>{card.name_en || card.name_ja || card.uid}</h1>
        <p className="cp-meta mono"><b>{card.num}</b><span>{card.rarity}</span><span>{card.category}</span>{card.element && <span>{card.element}</span>}</p>
        {card.name_ja && card.name_ja !== card.name_en && <p className="cp-altname">{card.name_ja}{card.romaji ? ` · ${card.romaji}` : ''}</p>}
        <div className="cp-stance" aria-label="Your collection status">
          <span className="mono">Your Binder</span>
          <button className={stance === 'have' ? 'have on' : 'have'} onClick={() => onChangeStance(card.uid, 'have')}>✓ Have</button>
          <button className={stance === 'want' ? 'want on' : 'want'} onClick={() => onChangeStance(card.uid, 'want')}>Want</button>
          <small>{stance === 'have' ? 'In your collection' : stance === 'want' ? 'On your hunt list' : 'Not marked yet'}</small>
        </div>
        <div className="cp-marketstrip">
          <Fact label="Available from" className="money">{lowestAsk != null ? `${lowestAsk} USDC` : '—'}</Fact>
          <Fact label="Public copies">{totalCopies}</Fact>
          <Fact label="Tables">{listings.length}</Fact>
          <Fact label="Latest recorded settlement" className="recorded">{latestSale?.p != null ? `${latestSale.p} USDC` : 'none yet'}</Fact>
        </div>
        <p className="cp-truth mono">Asks and condition are seller claims. Recorded scans show what Cairn can point to—not a guarantee of authenticity or grade.</p>
      </div>
    </header>

    <section className="cp-marketsection" aria-labelledby="available-copies">
      <div className="cp-sectionhead">
        <div><span className="ek">The market</span><h2 id="available-copies">Available copies</h2>
          <p>{listings.length ? `${totalCopies} cop${totalCopies === 1 ? 'y' : 'ies'} from ${listings.length} table${listings.length === 1 ? '' : 's'}` : 'No seller has this entry on their table right now.'}
            {lowestAsk != null && highestAsk !== lowestAsk ? <span className="money"> · {lowestAsk}–{highestAsk} USDC</span> : null}</p></div>
        {listings.length > 1 && <label className="cp-sort mono">Sort
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="best">Best balance</option>
            <option value="price_asc">Price · low first</option>
            <option value="price_desc">Price · high first</option>
            <option value="evidence">Evidence · most first</option>
            <option value="copies">Copies · most first</option>
          </select>
        </label>}
      </div>

      {listings.length ? <div className="cp-marketgrid">
        <div className="cp-copylist" role="list" aria-label="Seller copies">
          {sorted.map(({ s, l }) => {
            const active = selected?.s.id === s.id
            const pile = inPile(s.id, card.uid)
            const ankoActive = active && !!ankoRead
            return <section key={`${s.id}:${card.uid}`} role="listitem" className={`cp-copy${active ? ' selected' : ''}${ankoActive ? ' anko-picked' : ''}`}>
              <button type="button" className="cp-copyselect" aria-pressed={active} onClick={() => selectCopy(s.id)}>
                <span className="cp-seller"><Avatar seller={s} /><span><b>{sellerName(s)}</b><small>{s.live ? '● live table' : 'sample table'} · {Math.max(1, Number(l.copies) || 1)} cop{Math.max(1, Number(l.copies) || 1) === 1 ? 'y' : 'ies'}</small></span></span>
                <span className="cp-condition"><small>Condition claim</small><b>{l.cond || 'not listed'}</b></span>
                <EvidenceMark listing={l} />
                <span className="cp-price"><small>Seller ask</small><b>{l.ask} <i>USDC</i></b></span>
              </button>
              <div className="cp-copyactions">
                <button type="button" className={`cp-buy${pile?.mode === 'buy' ? ' on' : ''}`} onClick={() => { selectCopy(s.id); onPickUp(s.id, card.uid, 'buy') }}>
                  {pile?.mode === 'buy' ? '✓ In pile' : <>Buy <span>{l.ask} USDC</span></>}
                </button>
                <button type="button" className={`cp-trade${pile?.mode === 'trade' ? ' on' : ''}`} onClick={() => { selectCopy(s.id); onPickUp(s.id, card.uid, 'trade') }}>
                  {pile?.mode === 'trade' ? '✓ Trade' : '⇄ Trade'}
                </button>
                <button type="button" className="cp-tablelink" onClick={() => onVisitSeller(s.id, 'table')}>View table →</button>
              </div>
              {ankoActive && <span className="cp-ankoflag mono">{agentName} is reading this copy</span>}
            </section>
          })}
        </div>

        {selected && <aside className="cp-anko">
          <div className="cp-ankohead">
            <img src={(import.meta.env.BASE_URL || '/') + 'agent/anko-avatar-v3.png'} alt="" />
            <span><b>A second set of eyes</b><small>{sellerName(selected.s)} · <span className="money">{selected.l.ask} USDC</span></small></span>
          </div>
          <p>{selected.l.witness
            ? `Ask ${agentName} what the recorded scans and market record can actually support.`
            : Number(selected.l.ask) > SCAN_REQUEST_USDC
              ? `This copy needs seller photos. ${agentName} can help turn that gap into a clear next step.`
              : `This is a lower-cost copy using catalogue art. ${agentName} can still read the ask against what is recorded.`}</p>
          <AskAnko key={`${card.uid}:${selected.s.id}`} decision={decision}
            recommended={Number(selected.l.ask) > SCAN_REQUEST_USDC && !selected.l.witness}
            label={`Ask ${agentName} about this copy`} onRead={setAnkoRead} actionsForRead={actionsForRead} />
        </aside>}
      </div> : <div className="cp-empty">
        <strong>No copies on the floor.</strong>
        <p>Mark it Want and Cairn can keep the card visible in your hunt.</p>
        <button className={stance === 'want' ? 'on' : ''} onClick={() => onChangeStance(card.uid, 'want')}>{stance === 'want' ? '✓ On your hunt list' : 'Add to Want'}</button>
      </div>}
    </section>

    <CardDetails card={card} listings={listings} sales={sales} />

    {selected && selectedPile && <aside className="cp-dock" aria-label="Selected seller copy">
      <span><small className="mono">Your pile at {sellerName(selected.s)}</small><b>{card.name_en}</b></span>
      <span className="cp-dockprice money mono">{selectedPile.mode === 'buy' ? `${selected.l.ask} USDC` : 'Trade'}</span>
      <button type="button" className={selectedPile.mode === 'buy' ? 'money-action' : ''}
        onClick={() => onVisitSeller(selected.s.id, selectedPile.mode === 'buy' ? 'buy' : 'table')}>
        {selectedPile.mode === 'buy' ? 'Checkout' : 'Build trade'} →
      </button>
    </aside>}
  </article>
}
