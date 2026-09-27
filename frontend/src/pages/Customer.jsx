import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../store/authStore";
import { useCart } from "../store/cartStore";
import { Empty, Loading, ErrorBox } from "../components/UI";
import { notify, askConfirm } from "../components/UX";

export function Dashboard(){
  const {user}=useAuth();
  const [orders,setOrders]=useState([]);
  const [notifs,setNotifs]=useState([]);
  const [favorites,setFavorites]=useState([]);
  const [error,setError]=useState("");

  useEffect(()=>{
    Promise.all([
      api.get('/orders/my'),
      api.get('/notifications'),
      api.get('/favorites')
    ])
      .then(([o,n,f])=>{
        setOrders(o.data.orders||[]);
        setNotifs(n.data.notifications||[]);
        setFavorites(f.data.favorites||[]);
      })
      .catch(e=>setError(e.response?.data?.message||'Could not load dashboard'));
  },[]);

  async function read(id){
    try{
      await api.patch(`/notifications/${id}/read`);
      setNotifs(n=>n.map(x=>x._id===id?{...x,isRead:true}:x));
    }catch{}
  }

  const ready=orders.filter(o=>o.status==='READY_FOR_PICKUP').length;
  const active=orders.filter(o=>['PLACED','ACCEPTED','READY_FOR_PICKUP'].includes(o.status)).length;
  const savedFarmers=favorites.filter(f=>f.type==='farmer'&&f.farmer);
  const savedProducts=favorites.filter(f=>f.type==='product'&&f.product);

  return <section className="section customer-dashboard-page">
    <div className="customer-dashboard-hero">
      <div className="customer-dashboard-copy">
        <div className="eyebrow">CUSTOMER SPACE · MARKETLINK</div>
        <h1>Hello, {user?.name?.split(' ')[0]}<span>.</span></h1>
        <p>Everything you need to discover local farmers, manage pickup orders and keep your favorite finds close.</p>
        <div className="customer-hero-actions">
          <Link className="button" to="/products">Shop fresh <span>→</span></Link>
          <Link className="button light" to="/farmers">Meet local farmers <span>→</span></Link>
          <Link className="customer-text-action" to="/ai-assistant">Ask MarketLink AI</Link>
        </div>
      </div>
      <div className="customer-dashboard-orbit" aria-hidden="true">
        <div className="customer-orbit-ring ring-one"></div>
        <div className="customer-orbit-ring ring-two"></div>
        <div className="customer-orbit-core"><span>FRESH</span><strong>LOCAL</strong><small>MARKET</small></div>
        <div className="customer-orbit-chip chip-one">{orders.length} orders</div>
        <div className="customer-orbit-chip chip-two">{favorites.length} saved</div>
      </div>
    </div>

    {error&&<ErrorBox message={error}/>}

    <div className="customer-stat-grid customer-stat-grid-premium">
      <Link className="customer-stat-card" to="/dashboard/orders">
        <span className="customer-stat-icon">↗</span><div><strong>{orders.length}</strong><span>Total orders</span></div><small>View orders →</small>
      </Link>
      <Link className="customer-stat-card" to="/dashboard/orders">
        <span className="customer-stat-icon">✓</span><div><strong>{ready}</strong><span>Ready for pickup</span></div><small>{ready?'Pickup details →':'All clear'}</small>
      </Link>
      <Link className="customer-stat-card" to="/dashboard/favorites">
        <span className="customer-stat-icon">♡</span><div><strong>{favorites.length}</strong><span>Saved items</span></div><small>Open favorites →</small>
      </Link>
      <div className="customer-stat-card customer-stat-static">
        <span className="customer-stat-icon">!</span><div><strong>{notifs.filter(n=>!n.isRead).length}</strong><span>Unread notices</span></div><small>{notifs.filter(n=>!n.isRead).length?'Needs attention':'You are all caught up'}</small>
      </div>
    </div>

    <div className="customer-dashboard-grid">
      <div className="customer-pulse-panel panel">
        <div className="customer-panel-kicker"><span className="eyebrow">YOUR MARKET PULSE</span><span className="customer-live-dot">LIVE</span></div>
        <h2>{active ? `${active} order${active===1?' is':'s are'} currently moving through pickup.` : orders.length ? 'Your order history is ready when you are.' : 'Start your local-market journey.'}</h2>
        <p>{ready ? `${ready} order${ready===1?' is':'s are'} ready for pickup.` : 'Browse fresh listings, discover farmers and reserve your pickup slot.'}</p>
        <div className="customer-pulse-actions"><Link className="button" to="/markets">Explore markets</Link><Link className="button light" to="/farmers">Discover farmers</Link></div>
      </div>
      <div className="customer-discovery-panel panel">
        <div className="customer-panel-kicker"><span className="eyebrow">SAVED COLLECTION</span><span>{favorites.length} saved</span></div>
        <div className="customer-discovery-stat"><strong>{savedFarmers.length}</strong><span>farmers saved</span></div>
        <div className="customer-discovery-stat"><strong>{savedProducts.length}</strong><span>products saved</span></div>
        <Link className="text-link" to="/dashboard/favorites">Manage your collection →</Link>
      </div>
    </div>

    <div className="customer-quick-links customer-quick-links-premium">
      <Link className="customer-quick-card" to="/dashboard/orders"><span className="quick-index">01</span><span className="quick-icon">↗</span><div><small>ORDERS</small><strong>My Orders</strong><p>Track, modify, cancel or reorder your purchases.</p></div><span className="quick-arrow">↗</span></Link>
      <Link className="customer-quick-card" to="/dashboard/favorites"><span className="quick-index">02</span><span className="quick-icon">♡</span><div><small>SAVED</small><strong>My Favorites</strong><p>Keep products, farmers and markets one tap away.</p></div><span className="quick-arrow">↗</span></Link>
      <Link className="customer-quick-card" to="/farmers"><span className="quick-index">03</span><span className="quick-icon">✦</span><div><small>DISCOVER</small><strong>Meet Farmers</strong><p>Explore local producers and open their profiles.</p></div><span className="quick-arrow">↗</span></Link>
    </div>

    <div className="info-grid customer-lower-grid">
      <div className="panel customer-list-panel">
        <div className="panel-heading-row"><div><span className="eyebrow">RECENT ACTIVITY</span><h3>Recent orders</h3></div><Link className="text-link" to="/dashboard/orders">View all →</Link></div>
        {orders.slice(0,5).map(o=><Link className="customer-list-row" key={o._id} to="/dashboard/orders"><span className="customer-list-status">{o.status?.replaceAll('_',' ')}</span><span>#{o._id.slice(-6)} · {o.market?.name||'Market'}</span><strong>PKR {Number(o.totalAmount).toLocaleString()}</strong></Link>)}
        {!orders.length&&<Empty>No orders yet. <Link className="text-link" to="/products">Shop fresh →</Link></Empty>}
      </div>

      <div className="panel customer-list-panel">
        <div className="panel-heading-row"><div><span className="eyebrow">YOUR SHORTLIST</span><h3>Saved farmers</h3></div><Link className="text-link" to="/dashboard/favorites">View all →</Link></div>
        {savedFarmers.slice(0,4).map(f=><Link className="customer-farmer-mini" key={f._id} to={`/farmers/${f.farmer._id}`}><span className="customer-farmer-avatar">{(f.farmer.farmerProfile?.stallName||f.farmer.name||'F').slice(0,1)}</span><span><strong>{f.farmer.farmerProfile?.stallName||f.farmer.name}</strong><small>{f.farmer.name}</small></span><b>→</b></Link>)}
        {!savedFarmers.length&&<div className="customer-discovery-empty"><span>✦</span><p>You have not saved a farmer yet.</p><Link className="button light small" to="/farmers">Browse farmers</Link></div>}
      </div>
    </div>

    <div className="panel customer-notifications-panel">
      <div className="panel-heading-row"><div><span className="eyebrow">INBOX</span><h3>Notifications</h3></div><span className="customer-inbox-count">{notifs.filter(n=>!n.isRead).length} unread</span></div>
      <div className="customer-notification-list">
        {notifs.slice(0,6).map(n=><button className={`customer-notification ${n.isRead?'read':''}`} key={n._id} onClick={()=>read(n._id)}><span className="notification-dot"></span><span><b>{n.title}</b><p>{n.message}</p></span><i>{n.isRead?'Read':'Open'}</i></button>)}
      </div>
      {!notifs.length&&<Empty>You are all caught up.</Empty>}
    </div>
  </section>
}
function Stat({n,t,icon}){return <div className="stat customer-stat"><span className="stat-icon">{icon}</span><div><strong>{n}</strong><span>{t}</span></div></div>}

export function Cart(){const {items,total,change,remove}=useCart();function removeItem(id){remove(id);notify("Item removed from your basket.","success");}return <section className="section"><div className="page-title customer-page-title"><div><div className="eyebrow">YOUR BASKET</div><h1>Basket</h1><p>Review quantities and continue to a convenient pickup slot.</p></div><div className="customer-total-pill"><span>{items.length} item{items.length===1?'':'s'}</span><strong>PKR {Number(total).toLocaleString()}</strong></div></div>{!items.length?<Empty>Your basket is empty. <Link className="text-link" to="/products">Browse products</Link></Empty>:<div className="cart-layout"><div>{items.map(i=><div className="cart-row" key={i._id}><div><h3>{i.name}</h3><p>PKR {Number(i.price).toLocaleString()} / {i.unit}</p></div><input type="number" min="1" max={i.weeklyStockRemaining??i.quantityAvailable} value={i.cartQty} onChange={e=>change(i._id,Number(e.target.value))}/><strong>PKR {(i.price*i.cartQty).toLocaleString()}</strong><button className="danger-link" onClick={()=>removeItem(i._id)}>Remove</button></div>)}</div><div className="checkout-card"><h3>Ready to pre-order?</h3><p>Choose a pickup slot from the farmer connected to these products.</p><Link className="button full" to="/checkout">Continue to pickup</Link></div></div>}</section>}

export function Checkout(){
  const {items,total,clear}=useCart();
  const [slots,setSlots]=useState([]);
  const [slot,setSlot]=useState('');
  const [error,setError]=useState('');
  const [loadingSlots,setLoadingSlots]=useState(true);
  const [resolvedIds,setResolvedIds]=useState({});
  const nav=useNavigate();

  async function loadSlots(){
    if(!items.length){setLoadingSlots(false);setSlots([]);return;}
    setLoadingSlots(true);
    setError('');
    setSlot('');
    try{
      const first=items[0];
      let farmer=first?.farmer?._id||first?.farmer;
      let market=first?.market?._id||first?.market;
      let currentProductId=first?._id;

      // Recover gracefully when a previously saved basket contains an id
      // from an older seed/database reset. Search the current catalogue by
      // the saved product name instead of showing "Product not found".
      if(currentProductId){
        try {
          const check=await api.get(`/products/${currentProductId}`);
          const current=check.data.product;
          farmer=current?.farmer?._id||current?.farmer||farmer;
          market=current?.market?._id||current?.market||market;
        } catch {
          const q=encodeURIComponent(String(first.name||'').trim());
          if(q){
            const search=await api.get('/products',{params:{search:first.name,limit:48}});
            const matches=(search.data.products||[]).filter(p=>String(p.name||'').trim().toLowerCase()===String(first.name||'').trim().toLowerCase());
            const match=matches.find(p=>Number(p.price)===Number(first.price)&&String(p.unit)===String(first.unit))||matches[0];
            if(match){
              currentProductId=match._id;
              farmer=match.farmer?._id||match.farmer||farmer;
              market=match.market?._id||match.market||market;
              setResolvedIds(prev=>({...prev,[String(first._id)]:match._id}));
            }
          }
        }
      }
      if(!farmer||!market) throw new Error('This basket item is missing its farmer or market. Please remove it and add the product again.');

      // Load the exact farmer + market slots first. If that query has no
      // results, retry with the farmer only so a valid slot is not hidden.
      let r=await api.get('/pickup-slots',{params:{farmer,market}});
      let rawSlots=r.data.slots||[];
      if(!rawSlots.length){
        const fallback=await api.get('/pickup-slots',{params:{farmer}});
        rawSlots=(fallback.data.slots||[]).filter(s=>{
          const slotMarket=s.market?._id||s.market;
          return !slotMarket || String(slotMarket)===String(market);
        });
      }

      const now=Date.now();
      const available=rawSlots
        .filter(s=>{
          const remaining=Number(s.capacity||0)-Number(s.bookedCount||0);
          if(s.isActive===false || remaining<=0 || !s.date || !s.startTime) return false;

          // PickupSlot.date is stored at midnight. Build the pickup time in
          // the user's local timezone without shifting the calendar day.
          const d=new Date(s.date);
          const year=d.getUTCFullYear();
          const month=d.getUTCMonth();
          const day=d.getUTCDate();
          const [hours,minutes]=String(s.startTime).split(':').map(Number);
          const start=new Date(
            year, month, day,
            Number.isFinite(hours)?hours:0,
            Number.isFinite(minutes)?minutes:0, 0, 0
          );
          return start.getTime()>now;
        })
        .sort((a,b)=>new Date(a.date)-new Date(b.date) || String(a.startTime).localeCompare(String(b.startTime)));

      setSlots(available);
    }catch(e){
      setError(e.response?.data?.message||e.message||'Could not load pickup slots');
      setSlots([]);
    }finally{
      setLoadingSlots(false);
    }
  }

  useEffect(()=>{
    loadSlots();
  },[items]);

  async function submit(){
    try{
      if(!slot){
        const msg='Please choose a pickup slot.';
        setError(msg);
        notify(msg,'error');
        return;
      }
      const orderItems=[];
      for(const i of items){
        let productId=resolvedIds[String(i._id)]||i._id;
        try {
          await api.get(`/products/${productId}`);
        } catch {
          const search=await api.get('/products',{params:{search:i.name,limit:48}});
          const matches=(search.data.products||[]).filter(p=>String(p.name||'').trim().toLowerCase()===String(i.name||'').trim().toLowerCase());
          const match=matches.find(p=>Number(p.price)===Number(i.price)&&String(p.unit)===String(i.unit))||matches[0];
          if(!match) throw new Error(`${i.name} is no longer available. Please add it again from Products.`);
          productId=match._id;
        }
        orderItems.push({product:productId,quantity:i.cartQty});
      }
      await api.post('/orders',{items:orderItems,pickupSlot:slot});
      notify('Pre-order placed successfully.','success');
      clear();
      nav('/orders');
    }catch(e){
      const msg=e.response?.data?.message||e.message||'Could not place pre-order';
      setError(msg);
      notify(msg,'error');
    }
  }

  if(!items.length)return <section className="section"><Empty>Your basket is empty.</Empty></section>;

  return <section className="section narrow">
    <div className="eyebrow">CHECKOUT · PICKUP ONLY</div>
    <h1>Choose your pickup</h1>
    <p className="lead">Payment is settled in person at pickup. No online payment gateway is used.</p>
    <div className="checkout-steps"><span className="active">01 Basket</span><span className="active">02 Pickup</span><span>03 Confirmation</span></div>
    <div className="panel">
      <label className="field">
        <span>Pickup slot</span>
        <select value={slot} onChange={e=>setSlot(e.target.value)} disabled={loadingSlots}>
          <option value="">{loadingSlots?'Loading pickup slots…':'Select a slot'}</option>
          {slots.map(s=>{
            const remaining=Number(s.capacity||0)-Number(s.bookedCount||0);
            return <option key={s._id} value={s._id}>{new Date(s.date).toLocaleDateString()} · {s.startTime}–{s.endTime} · {remaining} spaces</option>
          })}
        </select>
      </label>

      {loadingSlots&&<div className="notice">Loading available pickup slots…</div>}

      {!loadingSlots&&!slots.length&&
        <div className="notice">
          No pickup slots are available right now.
          <button type="button" className="text-link" onClick={loadSlots}>Refresh slots</button>
          <span> or ask the farmer to create a future slot.</span>
        </div>
      }

      {error&&<ErrorBox message={error}/>}

      <div className="checkout-total"><span>Total</span><strong>PKR {Number(total).toLocaleString()}</strong></div>
      <button className="button full" disabled={!slot||loadingSlots} onClick={submit}>Place pre-order</button>
    </div>
  </section>
}
export function Orders(){
  const [orders,setOrders]=useState([]); const [error,setError]=useState(''); const [editing,setEditing]=useState(null); const [statusFilter,setStatusFilter]=useState('ALL'); const [query,setQuery]=useState(''); const [slots,setSlots]=useState([]); const [itemDraft,setItemDraft]=useState({});
  const {add}=useCart();
  const location=useLocation();
  const load=()=>api.get('/orders/my').then(r=>setOrders(r.data.orders||[])).catch(e=>setError(e.response?.data?.message||'Could not load orders'));
  useEffect(()=>{load()},[]);
  const visibleOrders=orders.filter(o=>(statusFilter==='ALL'||o.status===statusFilter) && (`${o._id} ${o.market?.name||''} ${(o.items||[]).map(i=>i.nameSnapshot||'').join(' ')}`.toLowerCase().includes(query.toLowerCase())));
  async function cancel(id){if(!(await askConfirm({title:'Cancel this order?',message:'This action can only be completed before the farmer cutoff time.',confirmLabel:'Cancel order',danger:true})))return;try{await api.post(`/orders/${id}/cancel`,{reason:'Cancelled by customer'});notify('Order cancelled successfully.','success');load()}catch(e){const msg=e.response?.data?.message||'Could not cancel order';setError(msg);notify(msg,'error')}}
  async function openModify(o){try{const r=await api.get('/pickup-slots',{params:{farmer:o.farmer?._id||o.farmer,market:o.market?._id||o.market}});setSlots(r.data.slots||[]);setItemDraft(Object.fromEntries((o.items||[]).map(i=>[String(i.product),i.quantity])));setEditing(o)}catch(e){setError(e.response?.data?.message||'Could not load pickup slots')}}
  async function modify(o,pickupSlot,items){try{await api.patch(`/orders/${o._id}`,{pickupSlot,items});notify('Order updated successfully.','success');setEditing(null);load()}catch(e){const msg=e.response?.data?.message||'Could not modify order';setError(msg);notify(msg,'error')}}
  async function reorder(o){if(!(await askConfirm({title:'Prepare this order again?',message:'Available products will be added to your basket for a new pickup order.',confirmLabel:'Reorder'})))return;try{const r=await api.post(`/orders/${o._id}/reorder`);for(const item of r.data.items||[]){const full=await api.get(`/products/${item.product}`);for(let i=0;i<item.quantity;i++)add(full.data.product)}if(!r.data.items?.length){const msg='None of the original items are currently available.';setError(msg);notify(msg,'error');}else { notify('Available items were added to your basket.','success'); window.location.href='/checkout'; }}catch(e){const msg=e.response?.data?.message||'Could not prepare reorder';setError(msg);notify(msg,'error')}}
  const orderStats={total:orders.length,active:orders.filter(o=>['PLACED','ACCEPTED','READY_FOR_PICKUP'].includes(o.status)).length,completed:orders.filter(o=>o.status==='COMPLETED').length,cancelled:orders.filter(o=>o.status==='CANCELLED').length};
  return <section className="section"><div className="orders-page-hero"><div className="page-title" style={{margin:0}}><div><div className="eyebrow">CUSTOMER SPACE · ORDER HUB</div><h1>My orders</h1><p>Track every pickup, manage eligible changes and revisit your completed purchases.</p></div></div><div className="hero-mini-note"><span>●</span><strong>{orderStats.active} active</strong><span>orders in progress</span></div></div>{error&&<ErrorBox message={error}/>}<div className="orders-summary-strip"><div className="orders-summary-card"><strong>{orderStats.total}</strong><span>Total orders</span></div><div className="orders-summary-card"><strong>{orderStats.active}</strong><span>In progress</span></div><div className="orders-summary-card"><strong>{orderStats.completed}</strong><span>Completed</span></div><div className="orders-summary-card"><strong>{orderStats.cancelled}</strong><span>Cancelled</span></div></div><div className="customer-order-toolbar"><div className="customer-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search orders, markets or products"/></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="ALL">All statuses</option><option value="PLACED">Placed</option><option value="ACCEPTED">Accepted</option><option value="READY_FOR_PICKUP">Ready for pickup</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></div><div className="orders">{visibleOrders.map(o=><div className="order-card" key={o._id}><div><span className="status">{o.status}</span><h3>Order #{o._id.slice(-7)}</h3><p>{o.market?.name} · {new Date(o.pickupDate).toLocaleString()}</p>{o.cutoffAt&&<small>Changes/cancellation allowed until {new Date(o.cutoffAt).toLocaleString()}</small>}{(o.items||[]).map(i=><div key={i.product||i.nameSnapshot}>{i.nameSnapshot||'Product'} × {i.quantity||0}</div>)}</div><div className="order-side"><strong>PKR {Number(o.totalAmount).toLocaleString()}</strong>{o.status==='COMPLETED'&&<Link className="button small" to={`/orders?review=${o._id}#review-center`}>Review items</Link>}{o.status==='COMPLETED'&&<button className="button small light" onClick={()=>reorder(o)}>Reorder</button>}{['PLACED','ACCEPTED'].includes(o.status)&&<><button className="button small light" onClick={()=>openModify(o)}>Edit order</button><button className="danger-link" onClick={()=>cancel(o._id)}>Cancel</button></>}</div>{editing&&editing._id===o._id&&<div className="edit-panel"><h4>Edit order before cutoff</h4>{(o.items||[]).map(i=><label className="field" key={i.product}><span>{i.nameSnapshot} (current {i.quantity})</span><input type="number" min="1" value={itemDraft[String(i.product)]??i.quantity} onChange={e=>setItemDraft(d=>({...d,[String(i.product)]:Number(e.target.value)}))}/></label>)}<label className="field"><span>Pickup slot</span><select value={String(o.pickupSlot?._id||o.pickupSlot||'')} onChange={e=>setEditing({...o,pickupSlot:e.target.value})}>{slots.map(s=><option key={s._id} disabled={s.bookedCount>=s.capacity&&String(s._id)!==String(o.pickupSlot?._id||o.pickupSlot)} value={s._id}>{new Date(s.date).toLocaleDateString()} · {s.startTime}–{s.endTime} · {Math.max(0,s.capacity-s.bookedCount)} spaces</option>)}</select></label><div className="row"><button className="button" onClick={()=>modify(o,String(editing.pickupSlot?._id||editing.pickupSlot||o.pickupSlot?._id||o.pickupSlot),Object.entries(itemDraft).map(([product,quantity])=>({product,quantity})))}>Save changes</button><button className="button light" onClick={()=>setEditing(null)}>Close</button></div></div>}</div>)}{!visibleOrders.length&&<Empty>{orders.length?'No orders match your current filters.':'No orders yet.'}</Empty>}</div><ReviewCenter orders={orders}/></section>
}
function ReviewCenter({orders}){
  const completed=orders.filter(o=>o.status==='COMPLETED');
  const location=useLocation();
  const [reviews,setReviews]=useState([]);
  const [form,setForm]=useState({orderId:'',product:'',rating:5,comment:''});
  const [message,setMessage]=useState('');
  const [submitting,setSubmitting]=useState(false);
  useEffect(()=>{api.get('/reviews').then(r=>setReviews(r.data.reviews||[])).catch(()=>{})},[orders.length]);
  const selected=completed.find(o=>String(o._id)===String(form.orderId));
  const reviewed=(product,order)=>reviews.some(r=>String(r.product?._id||r.product)===String(product)&&String(r.order?._id||r.order)===String(order));
  useEffect(()=>{
    const reviewId=new URLSearchParams(location.search).get('review');
    if(!reviewId||!completed.length||form.orderId)return;
    const target=completed.find(o=>String(o._id)===String(reviewId));
    if(!target)return;
    const firstAvailable=(target.items||[]).find(i=>!reviewed(i.product,target._id));
    setForm(f=>({ ...f, orderId:target._id, product:firstAvailable?.product||'' }));
    requestAnimationFrame(()=>document.getElementById('review-center')?.scrollIntoView({behavior:'smooth',block:'start'}));
  },[location.search,orders.length,reviews.length,form.orderId]);
  async function submit(e){
    e.preventDefault();
    if(!form.orderId||!form.product)return;
    setSubmitting(true);
    try{
      await api.post('/reviews',form);
      notify('Review submitted successfully.','success');
      setMessage('Your review has been submitted. Thank you for helping other shoppers.');
      setForm({orderId:'',product:'',rating:5,comment:''});
      const r=await api.get('/reviews');
      setReviews(r.data.reviews||[]);
    }catch(e){
      const msg=e.response?.data?.message||'Could not submit review';
      setMessage(msg);
      notify(msg,'error');
    }finally{setSubmitting(false)}
  }
  if(!completed.length)return null;
  const selectedItems=(selected?.items||[]);
  const availableCount=selectedItems.filter(i=>!reviewed(i.product,selected?._id)).length;
  return <div id="review-center" className="panel review-center">
    <div className="review-center-head">
      <div><div className="eyebrow">FEEDBACK</div><h3>Review a completed order</h3><p>Share your experience with a product you have already purchased.</p></div>
      <div className="review-star-badge">★<span>{availableCount} to review</span></div>
    </div>
    {message&&<div className="notice">{message}</div>}
    <form onSubmit={submit}>
      <div className="form-grid review-form-grid">
        <label className="field"><span>Completed order</span><select required value={form.orderId} onChange={e=>setForm({...form,orderId:e.target.value,product:''})}><option value="">Select completed order</option>{completed.map(o=><option key={o._id} value={o._id}>#{o._id.slice(-7)} · {new Date(o.pickupDate).toLocaleDateString()}</option>)}</select></label>
        <label className="field"><span>Product</span><select required value={form.product} disabled={!selected} onChange={e=>setForm({...form,product:e.target.value})}><option value="">{selected?'Select product':'Select an order first'}</option>{selectedItems.map(i=><option disabled={reviewed(i.product,selected._id)} key={i.product} value={i.product}>{i.nameSnapshot}{reviewed(i.product,selected._id)?' · Already reviewed':''}</option>)}</select></label>
        <label className="field"><span>Rating</span><select value={form.rating} onChange={e=>setForm({...form,rating:Number(e.target.value)})}><option value="5">★★★★★ 5 stars</option><option value="4">★★★★☆ 4 stars</option><option value="3">★★★☆☆ 3 stars</option><option value="2">★★☆☆☆ 2 stars</option><option value="1">★☆☆☆☆ 1 star</option></select></label>
      </div>
      <label className="field review-comment-field"><span>Your review</span><textarea required maxLength="500" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} placeholder="Tell other shoppers what you liked about this product..."/><small>{form.comment.length}/500</small></label>
      <div className="review-form-actions"><button className="button" disabled={submitting||!form.orderId||!form.product}>{submitting?'Submitting…':'Submit review'}</button><span>Reviews are available after a completed pickup.</span></div>
    </form>
  </div>
}

export function Favorites(){
  const [favorites,setFavorites]=useState([]); const [error,setError]=useState(''); const [typeFilter,setTypeFilter]=useState('all'); const [query,setQuery]=useState('');
  const load=()=>api.get('/favorites').then(r=>setFavorites(r.data.favorites||[])).catch(e=>setError(e.response?.data?.message||'Could not load favorites'));
  useEffect(()=>{load()},[]);
  async function remove(id){if(!(await askConfirm({title:'Remove favorite?',message:'This item will be removed from your saved favorites.',confirmLabel:'Remove',danger:true})))return;try{await api.delete(`/favorites/${id}`);notify('Favorite removed.','success');load()}catch(e){const msg=e.response?.data?.message||'Could not remove favorite';setError(msg);notify(msg,'error')}}
  const counts={all:favorites.length,product:favorites.filter(f=>f.type==='product').length,farmer:favorites.filter(f=>f.type==='farmer').length,market:favorites.filter(f=>f.type==='market').length};
  const visible=favorites.filter(f=>typeFilter==='all'||f.type===typeFilter).filter(f=>{const label=f.product?.name||f.farmer?.farmerProfile?.stallName||f.farmer?.name||f.market?.name||'';return label.toLowerCase().includes(query.toLowerCase())});
  const labels={all:'Everything',product:'Products',farmer:'Farmers',market:'Markets'};
  return <section className="section customer-favorites-page">
    <div className="customer-favorites-hero">
      <div><div className="eyebrow">CUSTOMER SPACE · SAVED COLLECTION</div><h1>My favorites<span>.</span></h1><p>Build your personal shortlist of products, local farmers and pickup markets.</p><div className="customer-favorite-hero-actions"><Link className="button" to="/products">Browse products →</Link><Link className="button light" to="/farmers">Meet farmers →</Link><Link className="button light" to="/markets">Explore markets →</Link></div></div>
      <div className="favorites-hero-orb"><strong>{favorites.length}</strong><span>SAVED</span><small>items in your collection</small></div>
    </div>

    {error&&<ErrorBox message={error}/>} 

    <div className="favorite-summary-grid">
      {Object.entries(labels).map(([key,label])=><button key={key} className={`favorite-summary-card ${typeFilter===key?'active':''}`} onClick={()=>setTypeFilter(key)}><span>{label}</span><strong>{counts[key]}</strong><small>{key==='farmer'?'local producers':key==='market'?'pickup locations':key==='product'?'fresh listings':'all saved items'}</small></button>)}
    </div>

    <div className="customer-favorite-toolbar customer-favorite-toolbar-premium">
      <div className="customer-filter-pills">{Object.entries(labels).map(([t,label])=><button key={t} className={typeFilter===t?'active':''} onClick={()=>setTypeFilter(t)}>{label} <b>{counts[t]}</b></button>)}</div>
      <div className="customer-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your saved collection"/></div>
    </div>

    {typeFilter==='farmer'&&<div className="farmer-discovery-banner"><div><span className="eyebrow">FARMER DISCOVERY</span><h3>Looking for more local farmers?</h3><p>Your Farmers tab shows <strong>saved farmers only</strong>. Explore the full Farmers page to discover producers, open profiles and save them here.</p></div><Link className="button" to="/farmers">Browse all farmers →</Link></div>}

    {!visible.length&&!error&&<div className="customer-favorites-empty panel"><div className="favorites-empty-icon">♡</div><span className="eyebrow">{typeFilter==='farmer'?'NO SAVED FARMERS':typeFilter==='market'?'NO SAVED MARKETS':typeFilter==='product'?'NO SAVED PRODUCTS':'YOUR COLLECTION IS EMPTY'}</span><h2>{query?`No saved items match “${query}”.`:typeFilter==='farmer'?'Save farmers you want to follow.':typeFilter==='market'?'Keep your favorite pickup markets close.':typeFilter==='product'?'Save products for quick access and restock alerts.':'Start saving the things you want to find again.'}</h2><p>{typeFilter==='farmer'?'Open any farmer profile and choose “Save farmer”.':typeFilter==='market'?'Open a market and choose “Save market”.':typeFilter==='product'?'Use the heart on a product card.':'Browse products, farmers or markets and build your shortlist.'}</p><Link className="button" to={typeFilter==='farmer'?'/farmers':typeFilter==='market'?'/markets':'/products'}>{typeFilter==='farmer'?'Discover farmers':typeFilter==='market'?'Discover markets':'Start exploring'} →</Link></div>}

    <div className="favorite-collection-grid">
      {visible.map(f=>f.type==='product'&&f.product?<article className="favorite-premium-card" key={f._id}><div className="favorite-card-media">{f.product.image?<img src={f.product.image} alt={f.product.name} loading="lazy" decoding="async"/>:<span>FRESH</span>}<span className="favorite-type-badge">PRODUCT</span><button className="favorite-remove-btn" onClick={()=>remove(f._id)} aria-label={`Remove ${f.product.name} from favorites`}>♥</button></div><div className="favorite-card-body"><span className="eyebrow">FRESH LISTING</span><h3>{f.product.name}</h3><p className="favorite-price">PKR {Number(f.product.price).toLocaleString()} <small>/ {f.product.unit}</small></p><div className="favorite-card-footer"><Link className="button small" to={`/products/${f.product._id}`}>View product</Link><button className="text-link" onClick={()=>remove(f._id)}>Remove</button></div></div></article>
      :f.type==='farmer'&&f.farmer?<article className="favorite-premium-card farmer-favorite-card" key={f._id}><div className="farmer-favorite-visual"><span className="favorite-type-badge">FARMER</span><div className="farmer-favorite-avatar">{(f.farmer.farmerProfile?.stallName||f.farmer.name||'F').slice(0,1)}</div><div className="farmer-favorite-pattern"></div></div><div className="favorite-card-body"><span className="eyebrow">LOCAL PRODUCER</span><h3>{f.farmer.farmerProfile?.stallName||f.farmer.name}</h3><p>{f.farmer.name}</p><small className="favorite-location">{f.farmer.farmerProfile?.businessAddress||f.farmer.address||'Local producer'}</small><div className="favorite-card-footer"><Link className="button small" to={`/farmers/${f.farmer._id}`}>View farmer</Link><button className="text-link" onClick={()=>remove(f._id)}>Remove</button></div></div></article>
      :f.type==='market'&&f.market?<article className="favorite-premium-card market-favorite-card" key={f._id}><div className="market-favorite-visual"><span className="favorite-type-badge">MARKET</span><div className="market-favorite-icon">M</div><span>{f.market.operatingDays?.join(' · ')||'Weekly pickup'}</span></div><div className="favorite-card-body"><span className="eyebrow">PICKUP LOCATION</span><h3>{f.market.name}</h3><p>{f.market.address}</p><small className="favorite-location">{f.market.openingTime||'—'} to {f.market.closingTime||'—'}</small><div className="favorite-card-footer"><Link className="button small" to={`/markets/${f.market._id}`}>View market</Link><button className="text-link" onClick={()=>remove(f._id)}>Remove</button></div></div></article>:null)}
    </div>
  </section>
}
