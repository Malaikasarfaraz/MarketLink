import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../services/api";
import { useCart } from "../store/cartStore";
import { useAuth } from "../store/authStore";
import { notify } from "../components/UX";

import {
  Loading,
  SkeletonGrid,
  Pagination,
  ErrorBox,
  Empty,
  ProductCard,
} from "../components/UI";

/* =========================================================
   HOME
========================================================= */

export function Home() {
  const { add } = useCart();

  const [products, setProducts] = useState([]);
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/products"), api.get("/markets")])
      .then(([productResponse, marketResponse]) => {
        setProducts(productResponse.data.products?.slice(0, 6) || []);

        setMarkets(marketResponse.data.markets?.slice(0, 3) || []);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div>
          <div className="eyebrow">LOCAL • FRESH • TRUSTED</div>

          <h1>Fresh food, closer to home.</h1>

          <p>
            Discover local farmers, trusted markets and pre-order fresh produce
            for convenient pickup.
          </p>

          <div className="hero-actions">
            <Link className="button" to="/products">
              Explore produce
            </Link>

            <Link className="button light" to="/farmers">
              Meet farmers
            </Link>
          </div>
        </div>

        <div className="hero-art">
          <div className="hero-orbit-badge badge-one">FRESH TODAY</div>
          <div className="hero-orbit-badge badge-two">LOCAL FARMERS</div>
          <div className="hero-orbit-badge badge-three">PICKUP READY</div>
          <div className="marketlink-logo-stage" aria-label="MarketLink logo">
            <div className="marketlink-logo-orbit orbit-outer"></div>
            <div className="marketlink-logo-orbit orbit-inner"></div>
            <div className="marketlink-logo-core">
              <span>ML</span>
              <small>LOCAL / TRUSTED</small>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">CURATED FOR YOU</div>

            <h2>Fresh from the market</h2>
          </div>

          <Link to="/products" className="text-link">
            View all →
          </Link>
        </div>

        <div className="grid">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} onAdd={add} />
          ))}
        </div>
      </section>

      {/* MARKETS */}
      <section className="section soft">
        <div className="section-head">
          <div>
            <div className="eyebrow">DISCOVER</div>

            <h2>Markets near your routine</h2>
          </div>
        </div>

        <div className="market-grid">
          {markets.map((market) => (
            <Link
              className="market-card"
              to={`/markets/${market._id}`}
              key={market._id}
            >
              <span className="market-icon">M</span>

              <h3>{market.name}</h3>

              <p>{market.address}</p>

              <small>{market.operatingDays?.join(" • ")}</small>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

/* =========================================================
   PRODUCTS
========================================================= */

export function Products() {
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [markets, setMarkets] = useState([]);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [market, setMarket] = useState("");
  const [day, setDay] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const requestController = useRef(null);

  /* FAVORITES */
  const [favorites, setFavorites] = useState([]);

  const { add } = useCart();

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  /* =========================================================
     LOAD FAVORITES
  ========================================================= */

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const response = await api.get("/favorites");

        if (response.data?.success) {
          setFavorites(response.data.favorites || []);
        }
      } catch (e) {
        /*
          Favorites API is customer-only.

          If the visitor is not logged in or does not have
          customer access, products should still load normally.
        */
        setFavorites([]);
      }
    };

    loadFavorites();
  }, []);

  /* =========================================================
     LOAD PRODUCTS
  ========================================================= */

  const loadProducts = async () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    try {
      setLoading(true);
      setError("");

      const params = { page, limit: 12 };

      if (q.trim()) {
        params.search = q.trim();
      }

      if (category) {
        params.category = category;
      }

      if (market) {
        params.market = market;
      }

      if (day) {
        params.day = day;
      }

      if (minPrice !== "") {
        params.minPrice = minPrice;
      }

      if (maxPrice !== "") {
        params.maxPrice = maxPrice;
      }

      const response = await api.get("/products", {
        params,
        signal: controller.signal,
      });

      setData(response.data.products || []);
      setPages(Number(response.data.pages) || 1);
      setTotal(Number(response.data.total) || 0);
    } catch (e) {
      if (e.code === "ERR_CANCELED" || e.name === "CanceledError") return;
      setError(e.response?.data?.message || "Could not load products");
    } finally {
      if (requestController.current === controller) setLoading(false);
    }
  };

  /* =========================================================
     LOAD FILTER OPTIONS
  ========================================================= */

  useEffect(() => {
    Promise.all([api.get("/categories"), api.get("/markets")])
      .then(([categoryResponse, marketResponse]) => {
        setCategories(categoryResponse.data.categories || []);

        setMarkets(marketResponse.data.markets || []);
      })
      .catch(() => {});
  }, []);

  /* =========================================================
     SEARCH / FILTER
  ========================================================= */

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [q, category, market, day, minPrice, maxPrice, page]);

  useEffect(() => {
    setPage(1);
  }, [q, category, market, day, minPrice, maxPrice]);
  useEffect(() => () => requestController.current?.abort(), []);

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  const clearFilters = () => {
    setQ("");
    setCategory("");
    setMarket("");
    setDay("");
    setMinPrice("");
    setMaxPrice("");
  };

  const hasFilters = q || category || market || day || minPrice || maxPrice;

  /* =========================================================
     FIND FAVORITE
  ========================================================= */

  const getFavorite = (productId) => {
    return favorites.find(
      (favorite) =>
        favorite.type === "product" && favorite.product?._id === productId,
    );
  };

  /* =========================================================
     TOGGLE FAVORITE
  ========================================================= */

  const toggleFavorite = async (product) => {
    const existingFavorite = getFavorite(product._id);

    try {
      /* -----------------------------------------
         REMOVE FAVORITE
      ----------------------------------------- */

      if (existingFavorite) {
        await api.delete(`/favorites/${existingFavorite._id}`);

        setFavorites((previous) =>
          previous.filter((favorite) => favorite._id !== existingFavorite._id),
        );
        notify("Product removed from favorites.", "success");

        return;
      }

      /* -----------------------------------------
         ADD FAVORITE
      ----------------------------------------- */

      const response = await api.post("/favorites", {
        type: "product",
        product: product._id,
      });

      if (response.data?.success) {
        setFavorites((previous) => [
          ...previous,
          {
            ...response.data.favorite,
            product,
          },
        ]);
        notify("Product saved to favorites.", "success");
      }
    } catch (e) {
      console.error("Favorite error:", e);

      /* Already favorite */
      if (e.response?.status === 409) {
        return;
      }

      /* Login / permission issue */
      if (e.response?.status === 401 || e.response?.status === 403) {
        notify("Please login as a customer to use favorites.", "warning");

        return;
      }

      notify(
        e.response?.data?.message || "Unable to update favorite.",
        "error",
      );
    }
  };

  return (
    <section className="section">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="page-title">
        <div>
          <div className="eyebrow">MARKETPLACE</div>

          <h1>Fresh products</h1>

          <p>Browse fresh produce listed by approved local farmers.</p>
        </div>

        <input
          className="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search products"
          placeholder="Search produce…"
        />
      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="product-filters">
        {/* CATEGORY */}
        <div className="filter-group">
          <label>Category</label>

          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>

            {categories.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {/* MARKET */}
        <div className="filter-group">
          <label>Market</label>

          <select
            aria-label="Filter by market"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
          >
            <option value="">All markets</option>

            {markets.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {/* DAY */}
        <div className="filter-group">
          <label>Market day</label>

          <select
            aria-label="Filter by market day"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            <option value="">Any day</option>

            {days.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* MIN PRICE */}
        <div className="filter-group">
          <label>Min price</label>

          <input
            aria-label="Minimum price"
            type="number"
            min="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="PKR"
          />
        </div>

        {/* MAX PRICE */}
        <div className="filter-group">
          <label>Max price</label>

          <input
            aria-label="Maximum price"
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="PKR"
          />
        </div>

        {/* CLEAR */}
        {hasFilters && (
          <button type="button" className="filter-clear" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && <ErrorBox message={error} />}

      {/* =====================================================
          RESULTS BAR
      ===================================================== */}

      {!loading && (
        <div className="results-bar">
          <span>
            {total} product{total !== 1 ? "s" : ""} found
            {pages > 1 && (
              <span className="muted">
                {" "}
                · Page {page} of {pages}
              </span>
            )}
          </span>

          {hasFilters && (
            <span className="active-filter-text">Filters applied</span>
          )}
        </div>
      )}

      {/* =====================================================
          PRODUCTS
      ===================================================== */}

      {loading ? (
        <SkeletonGrid count={6} />
      ) : data.length ? (
        <div className="grid">
          {data.map((product) => {
            const favorite = getFavorite(product._id);

            return (
              <ProductCard
                key={product._id}
                product={product}
                onAdd={add}
                onFavorite={toggleFavorite}
                isFavorite={Boolean(favorite)}
              />
            );
          })}
        </div>
      ) : (
        <Empty>No products match your selected filters.</Empty>
      )}

      {!loading && <Pagination page={page} pages={pages} onChange={setPage} />}
    </section>
  );
}

/* =========================================================
   PRODUCT DETAILS
========================================================= */

export function ProductDetails() {
  const { id } = useParams();

  const [p, setP] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");

  const { add } = useCart();

  useEffect(() => {
    Promise.all([
      api.get(`/products/${id}`),
      api.get("/reviews", { params: { product: id } }),
    ])
      .then(([response, reviewResponse]) => {
        setP(response.data.product);
        setReviews(reviewResponse.data.reviews || []);
      })
      .catch((e) => {
        setError(e.response?.data?.message || "Product not found");
      });
  }, [id]);

  if (error) {
    return (
      <section className="section">
        <ErrorBox message={error} />
      </section>
    );
  }

  if (!p) {
    return <Loading />;
  }

  return (
    <section className="section detail">
      {/* IMAGE */}
      <div className="detail-image">
        {p.image ? (
          <img src={p.image} alt={p.name} loading="lazy" decoding="async" />
        ) : (
          <span>Fresh produce</span>
        )}
      </div>

      {/* INFORMATION */}
      <div>
        <div className="eyebrow">{p.category?.name || "Produce"}</div>

        <h1>{p.name}</h1>

        <p className="lead">{p.description}</p>

        <h2>
          PKR {Number(p.price).toLocaleString()}
          <small> / {p.unit}</small>
        </h2>

        <p>
          Available:{" "}
          {p.weeklyStock
            ? `${p.weeklyStockRemaining} this week`
            : p.quantityAvailable}
        </p>

        <p>
          Farmer:{" "}
          <Link className="text-link" to={`/farmers/${p.farmer?._id}`}>
            {p.farmer?.name}
          </Link>
        </p>

        <p>Market: {p.market?.name}</p>

        <button
          className="button"
          disabled={p.soldOut || p.temporarilyUnavailable}
          onClick={() => {
            try {
              add(p);
              notify("Added to your basket.", "success");
            } catch (e) {
              notify(e.message, "error");
            }
          }}
        >
          {p.temporarilyUnavailable
            ? "Temporarily unavailable"
            : p.soldOut
              ? "Sold out"
              : "Add to basket"}
        </button>
      </div>

      <div className="panel review-list" style={{ gridColumn: "1 / -1" }}>
        <div className="page-title">
          <div>
            <div className="eyebrow">CUSTOMER FEEDBACK</div>
            <h2>Product reviews</h2>
          </div>
          <span>
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        </div>
        {reviews.map((r) => (
          <div className="review-item" key={r._id}>
            <div className="row">
              <strong>{r.customer?.name || "Customer"}</strong>
              <span>
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </span>
            </div>
            <p>{r.comment || "No written comment."}</p>
            {r.farmerResponse && (
              <div className="notice">
                <b>Farmer response</b>
                <p>{r.farmerResponse}</p>
              </div>
            )}
          </div>
        ))}
        {!reviews.length && (
          <Empty>
            No reviews yet. Completed customers can leave the first review.
          </Empty>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   MARKETS
========================================================= */

export function Markets() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState("");
  const [nearby, setNearby] = useState(false);
  const [radius, setRadius] = useState("25");
  const [location, setLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (day) params.day = day;
      if (nearby && location) {
        params.lat = location.lat;
        params.lng = location.lng;
        params.radiusKm = radius;
      }
      api
        .get("/markets", { params })
        .then((r) => {
          setItems(r.data.markets || []);
          setError("");
        })
        .catch((e) =>
          setError(e.response?.data?.message || "Could not load markets"),
        )
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, day, nearby, location, radius]);
  function useLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Your browser does not support location.");
      return;
    }
    setLocationMessage("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearby(true);
        setLocationMessage("Showing markets near your current location.");
      },
      () =>
        setLocationMessage(
          "Location permission was not granted. You can still search by market or area.",
        ),
    );
  }
  return (
    <section className="section discovery-page markets-page">
      <div className="discovery-hero">
        <div className="discovery-copy">
          <div className="eyebrow">LOCAL PLACES / MARKET DISCOVERY</div>
          <h1>Find the market that fits your week.</h1>
          <p className="lead">
            Explore local pickup points, see when they operate, and discover the
            farmers behind the stalls — before you make the trip.
          </p>
          <div className="discovery-metrics">
            <div>
              <strong>{items.length}</strong>
              <span>markets shown</span>
            </div>
            <div>
              <strong>7</strong>
              <span>days searchable</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>online discovery</span>
            </div>
          </div>
        </div>
        <div className="discovery-art" aria-hidden="true">
          <div className="discovery-ring ring-one"></div>
          <div className="discovery-ring ring-two"></div>
          <div className="discovery-seal">
            <span>MARKET</span>
            <b>ML</b>
            <small>LOCAL • FRESH</small>
          </div>
        </div>
      </div>
      <div className="discovery-toolbar panel">
        <div className="toolbar-search">
          <span>⌕</span>
          <input
            aria-label="Search markets"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search market, area or pickup point"
          />
        </div>
        <select
          aria-label="Filter markets by day"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        >
          <option value="">Any day</option>
          {days.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          disabled={!nearby}
        >
          <option value="5">Within 5 km</option>
          <option value="10">Within 10 km</option>
          <option value="25">Within 25 km</option>
          <option value="50">Within 50 km</option>
        </select>
        <button type="button" className="button" onClick={useLocation}>
          ⌖ Find near me
        </button>
      </div>
      {locationMessage && (
        <div className="location-pill">● {locationMessage}</div>
      )}
      <div className="results-heading">
        <div>
          <span className="eyebrow">DISCOVER</span>
          <h2>Markets worth knowing</h2>
        </div>
        <span>
          {loading
            ? "Updating…"
            : `${items.length} result${items.length === 1 ? "" : "s"}`}
        </span>
      </div>
      {error && <ErrorBox message={error} />}{" "}
      {loading ? (
        <SkeletonGrid count={6} />
      ) : !error && !items.length ? (
        <Empty>No markets match your search.</Empty>
      ) : (
        <div className="market-grid">
          {items.map((m, index) => (
            <Link
              className="market-card premium-market-card"
              to={`/markets/${m._id}`}
              key={m._id}
              style={{ "--card-delay": `${index * 70}ms` }}
            >
              <div className="market-card-top">
                <span className="market-icon">
                  {m.name?.slice(0, 1).toUpperCase() || "M"}
                </span>
                <span className="market-index">0{index + 1}</span>
              </div>
              <div className="market-card-copy">
                <div className="eyebrow">LOCAL MARKET</div>
                <h3>{m.name}</h3>
                <p>{m.address || "Pickup location available"}</p>
              </div>
              <div className="market-meta">
                <span>
                  ◷{" "}
                  {m.operatingDays?.length
                    ? `${m.operatingDays.length} operating day${m.operatingDays.length === 1 ? "" : "s"}`
                    : "Schedule available"}
                </span>
                {Number.isFinite(m.distanceKm) && (
                  <span>⌖ {m.distanceKm} km</span>
                )}
              </div>
              <div className="market-card-footer">
                <span>Explore market</span>
                <b>↗</b>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function LiveLocationMap({ latitude, longitude, label, height = 360 }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const userMarker = useRef(null);
  const destinationMarker = useRef(null);
  const routeLayer = useRef(null);
  const watchId = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [status, setStatus] = useState(
    "Tap “Use my location” to see your position and route.",
  );
  const [routeInfo, setRouteInfo] = useState(null);

  const lat = Number(latitude);
  const lon = Number(longitude);
  const validDestination = Number.isFinite(lat) && Number.isFinite(lon);

  useEffect(() => {
    if (!validDestination) return;
    let cancelled = false;
    const setup = () => {
      if (cancelled || !window.L || !mapRef.current || mapInstance.current)
        return;
      const L = window.L;
      const map = L.map(mapRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView([lat, lon], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      destinationMarker.current = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(label || "Destination");
      mapInstance.current = map;
    };
    if (window.L) setup();
    else {
      const existing = document.querySelector("script[data-leaflet]");
      if (existing) existing.addEventListener("load", setup, { once: true });
      else {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.dataset.leaflet = "true";
        script.onload = setup;
        document.body.appendChild(script);
      }
    }
    return () => {
      cancelled = true;
      if (watchId.current !== null && navigator.geolocation)
        navigator.geolocation.clearWatch(watchId.current);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [lat, lon, label, validDestination]);

  async function updateRoute(origin) {
    if (!validDestination || !origin) return;
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${lon},${lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Routing service unavailable");
      const data = await response.json();
      const route = data.routes?.[0];
      if (!route || !mapInstance.current || !window.L)
        throw new Error("No route found");
      const L = window.L;
      if (routeLayer.current) routeLayer.current.remove();
      routeLayer.current = L.geoJSON(route.geometry, {
        style: { weight: 5, opacity: 0.8 },
      }).addTo(mapInstance.current);
      const bounds = L.latLngBounds([
        [origin.lat, origin.lng],
        [lat, lon],
      ]);
      mapInstance.current.fitBounds(bounds.pad(0.18));
      setRouteInfo({
        km: (route.distance / 1000).toFixed(1),
        min: Math.round(route.duration / 60),
      });
      setStatus(
        "Live location connected. Route updated from your current position.",
      );
    } catch (e) {
      setStatus(
        "Live location is on. Use Get directions for full turn-by-turn navigation.",
      );
    }
  }

  function useLiveLocation() {
    if (!navigator.geolocation) {
      setStatus("Your browser does not support location.");
      return;
    }
    setStatus("Requesting your location…");
    if (watchId.current !== null)
      navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(next);
        if (mapInstance.current && window.L) {
          const L = window.L;
          if (!userMarker.current) {
            userMarker.current = L.circleMarker([next.lat, next.lng], {
              radius: 9,
              weight: 3,
              opacity: 1,
              fillOpacity: 0.85,
            })
              .addTo(mapInstance.current)
              .bindPopup("Your live location");
          } else userMarker.current.setLatLng([next.lat, next.lng]);
          updateRoute(next);
        }
      },
      () =>
        setStatus(
          "Location permission was not granted. You can still open directions manually.",
        ),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  }

  if (!validDestination) return null;
  const googleDirections = userLocation
    ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${lat},${lon}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  const osmDirections = userLocation
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLocation.lat}%2C${userLocation.lng}%3B${lat}%2C${lon}`
    : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

  return (
    <div className="live-map-card panel">
      <div className="live-map-head">
        <div>
          <div className="eyebrow">LIVE LOCATION</div>
          <h3>Find your way to {label || "this pickup point"}</h3>
          <p>{status}</p>
        </div>
        <span className={`live-dot ${userLocation ? "on" : ""}`}>
          {userLocation ? "LIVE" : "READY"}
        </span>
      </div>
      <div
        ref={mapRef}
        className="live-map-canvas"
        style={{ height }}
        aria-label={`${label || "Destination"} map`}
      />
      <div className="live-map-actions">
        <button type="button" className="button" onClick={useLiveLocation}>
          ⌖ Use my live location
        </button>
        <a
          className="button light"
          href={googleDirections}
          target="_blank"
          rel="noreferrer"
        >
          🧭 Get directions
        </a>
      </div>
      {routeInfo && (
        <div className="route-summary">
          <strong>{routeInfo.km} km</strong>
          <span>estimated driving route</span>
          <strong>{routeInfo.min} min</strong>
          <span>estimated time</span>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MARKET DETAILS
========================================================= */

export function MarketDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [m, setM] = useState(null);
  const [favorite, setFavorite] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/markets/${id}`)
      .then((r) => setM(r.data.market))
      .catch((e) => setError(e.response?.data?.message || "Market not found"));
  }, [id]);

  useEffect(() => {
    if (user?.role !== "customer") return;
    api
      .get("/favorites")
      .then((r) =>
        setFavorite(
          (r.data.favorites || []).find(
            (x) =>
              x.type === "market" &&
              String(x.market?._id || x.market) === String(id),
          ) || null,
        ),
      )
      .catch(() => {});
  }, [user, id]);

  async function toggleFavorite() {
    try {
      if (favorite) {
        await api.delete(`/favorites/${favorite._id}`);
        setFavorite(null);
        notify("Market removed from favorites.", "success");
      } else {
        const r = await api.post("/favorites", { type: "market", market: id });
        setFavorite(r.data.favorite);
        notify("Market saved to favorites.", "success");
      }
    } catch (e) {
      const msg = e.response?.data?.message || "Please login as a customer to save markets.";
      setError(msg);
      notify(msg, "error");
    }
  }

  if (error && !m)
    return (
      <section className="section">
        <ErrorBox message={error} />
      </section>
    );
  if (!m) return <Loading />;
  return (
    <section className="section">
      <div className="page-title">
        <div>
          <div className="eyebrow">MARKET</div>
          <h1>{m.name}</h1>
          <p className="lead">{m.address}</p>
        </div>
        {user?.role === "customer" && (
          <button className="button light" onClick={toggleFavorite}>
            {favorite ? "♥ Saved market" : "♡ Save market"}
          </button>
        )}
      </div>
      {error && <ErrorBox message={error} />}
      <div className="info-grid">
        <div className="panel">
          <h3>Operating days</h3>
          <p>{m.operatingDays?.join(" • ") || "Schedule not listed"}</p>
          <p>
            {m.openingTime || "—"} to {m.closingTime || "—"}
          </p>
        </div>
        <div className="panel">
          <h3>Farmers</h3>
          {m.farmers?.length ? (
            m.farmers.map((farmer) => (
              <Link
                className="list-link"
                key={farmer._id}
                to={`/farmers/${farmer._id}`}
              >
                {farmer.farmerProfile?.stallName || farmer.name}
              </Link>
            ))
          ) : (
            <p>No farmers listed.</p>
          )}
        </div>
      </div>
      <LiveLocationMap
        latitude={m.latitude}
        longitude={m.longitude}
        label={m.name}
      />
      {m.mapLink && (
        <a
          className="button light"
          href={m.mapLink}
          target="_blank"
          rel="noreferrer"
        >
          Get directions
        </a>
      )}
    </section>
  );
}

/* =========================================================
   FARMERS
========================================================= */

export function Farmers() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState("");
  const [nearby, setNearby] = useState(false);
  const [radius, setRadius] = useState("25");
  const [location, setLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (day) params.day = day;
      if (nearby && location) {
        params.lat = location.lat;
        params.lng = location.lng;
        params.radiusKm = radius;
      }
      api
        .get("/farmer", { params })
        .then((r) => {
          setItems(r.data.farmers || []);
          setError("");
        })
        .catch((e) =>
          setError(e.response?.data?.message || "Could not load farmers"),
        )
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, day, nearby, location, radius]);
  function useLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Your browser does not support location.");
      return;
    }
    setLocationMessage("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearby(true);
        setLocationMessage("Showing farmers near your current location.");
      },
      () =>
        setLocationMessage(
          "Location permission was not granted. You can still search by farmer or area.",
        ),
    );
  }
  return (
    <section className="section discovery-page farmers-page">
      <div className="discovery-hero farmer-hero">
        <div className="discovery-copy">
          <div className="eyebrow">LOCAL PRODUCERS / FARMER DISCOVERY</div>
          <h1>Know who grows your food.</h1>
          <p className="lead">
            Meet approved local farmers, discover their stalls and find the
            markets where you can connect with them.
          </p>
          <div className="discovery-metrics">
            <div>
              <strong>{items.length}</strong>
              <span>farmers shown</span>
            </div>
            <div>
              <strong>LOCAL</strong>
              <span>producer-first</span>
            </div>
            <div>
              <strong>NEARBY</strong>
              <span>location search</span>
            </div>
          </div>
        </div>
        <div className="discovery-art" aria-hidden="true">
          <div className="farmer-stamp">
            <span>GROWN WITH</span>
            <b>CARE</b>
            <small>DIRECT • LOCAL • HUMAN</small>
          </div>
          <div className="leaf-orbit leaf-a"></div>
          <div className="leaf-orbit leaf-b"></div>
        </div>
      </div>
      <div className="discovery-toolbar panel">
        <div className="toolbar-search">
          <span>⌕</span>
          <input
            aria-label="Search farmers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farmer, stall or area"
          />
        </div>
        <select
          aria-label="Filter farmers by day"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        >
          <option value="">Any market day</option>
          {days.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          disabled={!nearby}
        >
          <option value="5">Within 5 km</option>
          <option value="10">Within 10 km</option>
          <option value="25">Within 25 km</option>
          <option value="50">Within 50 km</option>
        </select>
        <button type="button" className="button" onClick={useLocation}>
          ⌖ Find near me
        </button>
      </div>
      {locationMessage && (
        <div className="location-pill">● {locationMessage}</div>
      )}
      <div className="results-heading">
        <div>
          <span className="eyebrow">MEET THE MAKERS</span>
          <h2>People behind the produce</h2>
        </div>
        <span>
          {loading
            ? "Updating…"
            : `${items.length} result${items.length === 1 ? "" : "s"}`}
        </span>
      </div>
      {error && <ErrorBox message={error} />}{" "}
      {loading ? (
        <SkeletonGrid count={6} />
      ) : !error && !items.length ? (
        <Empty>No farmers match your search.</Empty>
      ) : (
        <div className="farmer-grid">
          {items.map((farmer, index) => (
            <Link
              className="farmer-card premium-farmer-card"
              to={`/farmers/${farmer._id}`}
              key={farmer._id}
              style={{ "--card-delay": `${index * 70}ms` }}
            >
              <div className="farmer-avatar-wrap">
                <div className="avatar">
                  {farmer.name?.slice(0, 1).toUpperCase()}
                </div>
                <span>LOCAL</span>
              </div>
              <div className="farmer-card-main">
                <div className="eyebrow">
                  FARMER {String(index + 1).padStart(2, "0")}
                </div>
                <h3>{farmer.farmerProfile?.stallName || farmer.name}</h3>
                <p className="farmer-name">{farmer.name}</p>
                <small>
                  {farmer.farmerProfile?.businessAddress ||
                    farmer.address ||
                    "Local producer"}
                  {Number.isFinite(farmer.distanceKm)
                    ? ` · ${farmer.distanceKm} km away`
                    : ""}
                </small>
                <div className="farmer-card-footer">
                  <span>View farmer profile</span>
                  <b>↗</b>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   FARMER DETAILS
========================================================= */

export function FarmerDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [f, setF] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [favorite, setFavorite] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api.get(`/farmer/${id}`),
      api.get("/reviews", { params: { farmer: id } }),
    ])
      .then(([farmerResponse, reviewResponse]) => {
        setF(farmerResponse.data.farmer);
        setReviews(reviewResponse.data.reviews || []);
      })
      .catch((e) => setError(e.response?.data?.message || "Farmer not found"));
  }, [id]);
  useEffect(() => {
    if (user?.role === "customer")
      api
        .get("/favorites")
        .then((r) =>
          setFavorite(
            (r.data.favorites || []).find(
              (x) =>
                x.type === "farmer" &&
                String(x.farmer?._id || x.farmer) === String(id),
            ) || null,
          ),
        )
        .catch(() => {});
  }, [user, id]);
  async function toggleFavorite() {
    try {
      if (favorite) {
        await api.delete(`/favorites/${favorite._id}`);
        setFavorite(null);
        notify("Farmer removed from favorites.", "success");
      } else {
        const r = await api.post("/favorites", { type: "farmer", farmer: id });
        setFavorite(r.data.favorite);
        notify("Farmer saved to favorites.", "success");
      }
    } catch (e) {
      const msg = e.response?.data?.message || "Please login as a customer to save farmers.";
      setError(msg);
      notify(msg, "error");
    }
  }
  if (error && !f)
    return (
      <section className="section">
        <ErrorBox message={error} />
      </section>
    );
  if (!f) return <Loading />;
  const profile = f.farmerProfile || {};
  return (
    <section className="section">
      <div className="profile-head">
        <div className="avatar large">{f.name?.slice(0, 1)}</div>
        <div>
          <div className="eyebrow">FARMER</div>
          <h1>{profile.stallName || f.name}</h1>
          <p>
            {f.name} ·{" "}
            {profile.businessAddress || f.address || "Local producer"}
          </p>
        </div>
        <div className="profile-actions">
          {user?.role === "customer" && (
            <button className="button light" onClick={toggleFavorite}>
              {favorite ? "♥ Saved farmer" : "♡ Save farmer"}
            </button>
          )}
        </div>
      </div>
      {error && <ErrorBox message={error} />}
      <div className="info-grid">
        <div className="panel">
          <h3>Pickup</h3>
          <p>
            {profile.pickupWindowStart || "—"} to{" "}
            {profile.pickupWindowEnd || "—"}
          </p>
          <p>{profile.operatingDays?.join(" • ") || "Flexible schedule"}</p>
          <p>
            Order cutoff: {profile.cutoffMinutes ?? 120} minutes before pickup.
          </p>
        </div>
        <div className="panel">
          <h3>Markets</h3>
          {profile.markets?.length ? (
            profile.markets.map((m) => (
              <p key={m._id}>
                <Link className="text-link" to={`/markets/${m._id}`}>
                  {m.name}
                </Link>
              </p>
            ))
          ) : (
            <p>No markets listed.</p>
          )}
        </div>
      </div>
      <LiveLocationMap
        latitude={profile.latitude}
        longitude={profile.longitude}
        label={profile.stallName || f.name}
      />
      <div className="panel review-list">
        <div className="page-title">
          <div>
            <div className="eyebrow">CUSTOMER FEEDBACK</div>
            <h2>Reviews</h2>
          </div>
          <span>
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        </div>
        {reviews.map((r) => (
          <div className="review-item" key={r._id}>
            <div className="row">
              <strong>{r.product?.name}</strong>
              <span>
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </span>
            </div>
            <p>{r.comment || "No written comment."}</p>
            <small>By {r.customer?.name || "Customer"}</small>
            {r.farmerResponse && (
              <div className="notice">
                <b>Farmer response</b>
                <p>{r.farmerResponse}</p>
              </div>
            )}
          </div>
        ))}
        {!reviews.length && <Empty>No reviews yet.</Empty>}
      </div>
    </section>
  );
}

export function About() {
  return (
    <section className="section about-page">
      <div className="about-hero panel">
        <div>
          <div className="eyebrow">THE MARKETLINK STORY</div>
          <h1>Local food deserves a better digital experience.</h1>
          <p className="lead">
            MarketLink brings farmers, weekly market discovery and customer
            pre-orders into one clear marketplace experience — helping people
            discover what is available before they make the trip.
          </p>
          <div className="about-hero-actions">
            <Link className="button" to="/products">
              Explore the marketplace
            </Link>
            <Link className="button light" to="/farmers">
              Meet local farmers
            </Link>
          </div>
        </div>
        <div className="about-visual">
          <div
            className="marketlink-logo-stage about-logo-stage"
            aria-label="MarketLink logo"
          >
            <div className="marketlink-logo-orbit orbit-outer"></div>
            <div className="marketlink-logo-orbit orbit-inner"></div>
            <div className="marketlink-logo-core">
              <span>ML</span>
              <small>LOCAL / TRUSTED</small>
            </div>
          </div>
        </div>
      </div>

      <div className="section-intro">
        <div className="eyebrow">WHAT MARKETLINK CONNECTS</div>
        <h2>One marketplace, three connected experiences.</h2>
      </div>

      <div className="about-pillars">
        <article className="about-pillar panel">
          <span className="about-number">01</span>
          <h3>Discover</h3>
          <p>
            Customers can explore products, markets and farmer profiles from one
            place, with search and filters designed around real marketplace
            discovery.
          </p>
          <Link className="text-link" to="/products">
            Browse produce →
          </Link>
        </article>
        <article className="about-pillar panel">
          <span className="about-number">02</span>
          <h3>Pre-order</h3>
          <p>
            Weekly stock and pickup availability make it easier to plan
            purchases before visiting a market, reducing uncertainty for both
            sides.
          </p>
          <Link className="text-link" to="/markets">
            Find a market →
          </Link>
        </article>
        <article className="about-pillar panel">
          <span className="about-number">03</span>
          <h3>Connect</h3>
          <p>
            Farmer profiles, reviews, favorites and marketplace communication
            create a stronger relationship between the people growing food and
            the people buying it.
          </p>
          <Link className="text-link" to="/farmers">
            Meet farmers →
          </Link>
        </article>
      </div>

      <div className="about-split">
        <div className="panel about-feature-panel">
          <div className="eyebrow">FOR CUSTOMERS</div>
          <h3>A calmer way to shop local.</h3>
          <ul className="feature-list">
            <li>Discover weekly products and prices</li>
            <li>Explore markets and pickup locations</li>
            <li>Save products, farmers and markets</li>
            <li>Reserve pickup slots and manage orders</li>
            <li>Share feedback through reviews</li>
          </ul>
        </div>
        <div className="panel about-feature-panel dark">
          <div className="eyebrow">FOR FARMERS</div>
          <h3>A clearer digital storefront.</h3>
          <ul className="feature-list">
            <li>Present a dedicated farmer/stall profile</li>
            <li>Publish products and weekly stock</li>
            <li>Set pickup windows around market activity</li>
            <li>Manage incoming pre-orders</li>
            <li>Respond to customer feedback</li>
          </ul>
        </div>
      </div>

      <div className="about-values panel">
        <div>
          <div className="eyebrow">DESIGN PRINCIPLES</div>
          <h2>Built around clarity, trust and local discovery.</h2>
        </div>
        <div className="value-grid">
          <div>
            <b>01</b>
            <strong>Clarity</strong>
            <span>Useful information stays visible and easy to scan.</span>
          </div>
          <div>
            <b>02</b>
            <strong>Trust</strong>
            <span>
              Farmer identity, reviews and market context support informed
              shopping.
            </span>
          </div>
          <div>
            <b>03</b>
            <strong>Convenience</strong>
            <span>
              Discovery and pickup planning happen in one connected journey.
            </span>
          </div>
          <div>
            <b>04</b>
            <strong>Community</strong>
            <span>The experience keeps local producers at the center.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section className="section contact-page">
      <div className="contact-hero panel">
        <div>
          <div className="eyebrow">CONTACT MARKETLINK</div>
          <h1>Have a question? Let’s talk.</h1>
          <p className="lead">
            For project enquiries, marketplace questions or feedback, reach the
            MarketLink team through the details below.
          </p>
        </div>
        <div
          className="marketlink-logo-stage contact-logo-stage"
          aria-label="MarketLink logo"
        >
          <div className="marketlink-logo-orbit orbit-outer"></div>
          <div className="marketlink-logo-orbit orbit-inner"></div>
          <div className="marketlink-logo-core">
            <span>ML</span>
            <small>LOCAL / TRUSTED</small>
          </div>
        </div>
      </div>

      <div className="contact-grid">
        <a
          className="contact-card panel"
          href="mailto:marketlink.project@gmail.com"
        >
          <span className="contact-icon">@</span>
          <div>
            <small>EMAIL</small>
            <h3>marketlink.project@gmail.com</h3>
            <p>For project enquiries, questions and feedback.</p>
          </div>
          <span className="contact-arrow">↗</span>
        </a>

        <div className="contact-card panel">
          <span className="contact-icon">⌖</span>
          <div>
            <small>LOCATION</small>
            <h3>Karachi, Pakistan</h3>
            <p>MarketLink project team location.</p>
          </div>
        </div>
      </div>

      <div className="contact-bottom">
        <div className="panel contact-copy">
          <div className="eyebrow">QUICK RESPONSE</div>
          <h2>Choose the channel that works for you.</h2>
          <p>
            Email is ideal for detailed project enquiries, while phone is useful
            when you need a direct conversation. For location context, use the
            map beside this panel.
          </p>
          <div className="contact-actions">
            <a className="button" href="mailto:marketlink.project@gmail.com">
              Email the team
            </a>
            
          </div>
        </div>
        <div className="panel contact-map-wrap">
          <div className="map-label">
            <span className="eyebrow">PROJECT LOCATION</span>
            <strong>Karachi</strong>
          </div>
          <div className="map-panel">
            <iframe
              title="MarketLink contact location"
              src="https://www.openstreetmap.org/export/embed.html?bbox=66.98%2C24.84%2C67.03%2C24.88&layer=mapnik&marker=24.8607%2C67.0011"
              loading="lazy"
            />
            <a
              className="text-link"
              href="https://www.openstreetmap.org/?mlat=24.8607&mlon=67.0011#map=14/24.8607/67.0011"
              target="_blank"
              rel="noreferrer"
            >
              Open Karachi map →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AIAssistant() {
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  async function ask(e, preset) {
    if (e?.preventDefault) e.preventDefault();

    const question = String(preset ?? q).trim();
    if (!question || loading) return;

    setQ("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);

    try {
      const response = await api.post("/ai/ask", { question });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            response.data.answer ||
            "I could not find an answer in the current MarketLink data.",
        },
      ]);
    } catch (error) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            error.response?.data?.message ||
            "The assistant could not reach the MarketLink server.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    if (!loading) setMessages([]);
  }

  return (
    <section className="section narrow">
      <div className="eyebrow">AI MARKETPLACE ASSISTANT</div>
      <div className="ai-title-row">
        <div>
          <h1>Ask MarketLink</h1>
          <p>
            Ask about products, farmers, markets, pickup, orders — or just ask
            how MarketLink works.
          </p>
        </div>
        {messages.length > 0 && (
          <button type="button" className="button light" onClick={clearChat}>
            New chat
          </button>
        )}
      </div>

      <div className="panel chat">
        <div className="chat-messages">
          {!messages.length && (
            <div className="ai-welcome">
              <div className="ai-welcome-icon">✦</div>
              <div>
                <strong>How can I help?</strong>
                <p>
                  Ask naturally. You don't need to use the suggested questions.
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              className={`chat-bubble ${message.role}`}
              key={`${message.role}-${index}`}
            >
              <b>{message.role === "user" ? "You" : "MarketLink AI"}</b>
              <p>{message.text}</p>
            </div>
          ))}

          {loading && (
            <div className="chat-bubble assistant">
              <b>MarketLink AI</b>
              <p>Checking the latest MarketLink data…</p>
            </div>
          )}
        </div>

        <form className="row" onSubmit={ask}>
          <input
            className="wide-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask about tomatoes, farmers, markets, pickup..."
            disabled={loading}
          />
          <button className="button" disabled={loading || !q.trim()}>
            Ask
          </button>
        </form>

        <p className="ai-grounding-note">
          Live product, farmer, market and pickup answers use current MarketLink
          data. General questions can also be answered without a preset prompt.
        </p>
      </div>
    </section>
  );
}
