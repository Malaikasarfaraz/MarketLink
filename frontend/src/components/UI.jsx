import { Link } from 'react-router-dom';

export function Loading({ label = 'Loading MarketLink…' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return <div className="grid skeleton-grid" aria-label="Loading content">{Array.from({ length: count }).map((_, index) => <div className="skeleton-card" key={index}><div className="skeleton-image shimmer" /><div className="skeleton-line wide shimmer" /><div className="skeleton-line shimmer" /><div className="skeleton-line short shimmer" /></div>)}</div>;
}

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const current = Number(page) || 1;
  const items = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(pages, current + 2);
  for (let value = start; value <= end; value += 1) items.push(value);
  return <nav className="pagination" aria-label="Pagination">
    <button type="button" className="page-button" disabled={current === 1} onClick={() => onChange(current - 1)} aria-label="Previous page">‹</button>
    {start > 1 && <><button type="button" className="page-button" onClick={() => onChange(1)}>1</button>{start > 2 && <span className="page-ellipsis">…</span>}</>}
    {items.map(value => <button type="button" key={value} className={`page-button ${value === current ? 'active' : ''}`} aria-current={value === current ? 'page' : undefined} onClick={() => onChange(value)}>{value}</button>)}
    {end < pages && <>{end < pages - 1 && <span className="page-ellipsis">…</span>}<button type="button" className="page-button" onClick={() => onChange(pages)}>{pages}</button></>}
    <button type="button" className="page-button" disabled={current === pages} onClick={() => onChange(current + 1)} aria-label="Next page">›</button>
  </nav>;
}


export function ErrorBox({ message }) {
  return (
    <div className="error" role="alert" aria-live="assertive">
      {message}
    </div>
  );
}


export function Empty({
  children = 'Nothing here yet.'
}) {
  return (
    <div className="state">
      {children}
    </div>
  );
}


/* =========================================================
   PRODUCT CARD
========================================================= */

export function ProductCard({
  product,
  onAdd,
  onFavorite,
  isFavorite = false
}) {
  const image = product.image;
  const category = product.category?.name || 'Local produce';
  const farmer = product.farmer?.name || 'Farmer';
  const stock = product.weeklyStock
    ? `${product.weeklyStockRemaining} this week`
    : `${product.quantityAvailable} available`;
  const unavailable = product.soldOut || product.temporarilyUnavailable;

  const favoriteButton = (
    <button
      type="button"
      className={`favorite-button ${isFavorite ? 'active' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        onFavorite?.(product);
      }}
      aria-label={isFavorite ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorite ? '♥' : '♡'}
    </button>
  );

  return (
    <article className="product-flip-card" tabIndex={0} aria-label={`${product.name} product card`}>
      <div className="product-flip-inner">
        {/* FRONT: full product image */}
        <div className="product-flip-face product-flip-front">
          {image ? (
            <img src={image} alt={product.name} loading="lazy" decoding="async" />
          ) : (
            <div className="product-image-fallback"><span>Fresh</span></div>
          )}

          <div className="product-front-overlay" />
          {onFavorite && favoriteButton}
          <div className="product-front-caption">
            <span>{category}</span>
            <h3>{product.name}</h3>
          </div>
        </div>

        {/* BACK: existing product details and actions */}
        <div className="product-flip-face product-flip-back">
          <div className="product-back-decoration" />
          {onFavorite && favoriteButton}

          <div className="product-back-content">
            <div className="eyebrow">{category}</div>
            <h3>{product.name}</h3>
            <p>{product.description || 'Freshly listed by a local farmer.'}</p>

            <div className="product-price-row">
              <strong>PKR {Number(product.price).toLocaleString()}</strong>
              <span>/ {product.unit}</span>
            </div>

            <div className="product-meta-row">
              <span>{farmer}</span>
              <span>{stock}</span>
            </div>

            <div className="product-card-actions">
              <Link
                className="text-link product-details-link"
                to={`/products/${product._id}`}
                onClick={(event) => event.stopPropagation()}
              >
                View details
              </Link>
              <button
                type="button"
                className="button small"
                disabled={unavailable}
                onClick={(event) => {
                  event.stopPropagation();
                  try {
                    if (onAdd) {
                      onAdd(product);
                    }
                  } catch (error) {
                    window.marketlinkToast?.(error.message || 'Could not add product to basket', 'error');
                  }
                }}
              >
                {product.soldOut ? 'Sold out' : product.temporarilyUnavailable ? 'Unavailable' : 'Add to basket'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
