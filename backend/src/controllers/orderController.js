const Order = require("../models/Order");
const Product = require("../models/Product");
const PickupSlot = require("../models/PickupSlot");
const Notification = require("../models/Notification");
const WeeklyStock = require("../models/WeeklyStock");
const User = require("../models/User");
const Market = require("../models/Market");
const { sendOrderConfirmationEmail, sendOrderStatusEmail } = require("../services/emailService");

function slotDateTime(date, time) { const value=new Date(date); const [hours,minutes]=String(time||"00:00").split(":").map(Number); value.setHours(hours||0,minutes||0,0,0); return value; }
function startOfWeek(input) { const date=new Date(input||new Date()); date.setHours(0,0,0,0); const day=date.getDay(); date.setDate(date.getDate()+(day===0?-6:1-day)); return date; }
function sameWeek(a,b){return startOfWeek(a).getTime()===startOfWeek(b).getTime();}
function httpError(message,statusCode=400){const e=new Error(message);e.statusCode=statusCode;return e;}

async function validateOrderSlot(slot, farmer, market) {
  const pickupDate = slotDateTime(slot.date, slot.startTime);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(pickupDate);
  if (market.operatingDays?.length && !market.operatingDays.includes(day)) throw httpError(`Market is not operating on ${day}`);
  if (farmer.farmerProfile?.operatingDays?.length && !farmer.farmerProfile.operatingDays.includes(day)) throw httpError(`Farmer is not operating on ${day}`);
  const fStart = farmer.farmerProfile?.pickupWindowStart; const fEnd = farmer.farmerProfile?.pickupWindowEnd;
  if (fStart && fEnd && (slot.startTime < fStart || slot.endTime > fEnd)) throw httpError("Pickup slot is outside the farmer pickup window");
  if (market.openingTime && slot.startTime < market.openingTime) throw httpError("Pickup slot starts before market opening time");
  if (market.closingTime && slot.endTime > market.closingTime) throw httpError("Pickup slot ends after market closing time");
  return pickupDate;
}

async function reserveProduct(product, qty, pickupDate, reservations) {
  const current = sameWeek(pickupDate, new Date());
  if (current) {
    const updated = await Product.findOneAndUpdate(
      { _id: product._id, temporarilyUnavailable:false, adminModerationBlocked:false, soldOut:false, quantityAvailable:{ $gte:qty } },
      { $inc:{ quantityAvailable:-qty } }, { new:true }
    );
    if (!updated) throw httpError(`Insufficient stock for ${product.name}`);
    await Product.updateOne({ _id:updated._id }, [{ $set:{ soldOut:{ $eq:["$quantityAvailable",0] } } }]);
    const reservation = { productId:product._id, qty, weeklyQty:0 };
    reservations.push(reservation);
    const weekly = await WeeklyStock.findOneAndUpdate(
      { product:product._id, weekStart:startOfWeek(pickupDate), $expr:{ $lte:[ { $add:["$soldQuantity",qty] }, "$quantity" ] } },
      { $inc:{ soldQuantity:qty } }, { new:true }
    );
    if (weekly) { reservation.weeklyQty = qty; await WeeklyStock.updateOne({ _id:weekly._id }, [{ $set:{ soldOut:{ $gte:["$soldQuantity","$quantity"] } } }]); }
    return { price: weekly?.price ?? product.price };
  }
  const weekly = await WeeklyStock.findOneAndUpdate(
    { product:product._id, weekStart:startOfWeek(pickupDate), $expr:{ $lte:[ { $add:["$soldQuantity",qty] }, "$quantity" ] }, soldOut:false },
    { $inc:{ soldQuantity:qty } }, { new:true }
  );
  if (!weekly) throw httpError(`No sufficient weekly stock is available for ${product.name}`);
  await WeeklyStock.updateOne({ _id:weekly._id }, [{ $set:{ soldOut:{ $gte:["$soldQuantity","$quantity"] } } }]);
  reservations.push({productId:product._id,qty,weeklyQty:qty});
  return { price: weekly.price ?? product.price };
}

async function rollbackReservations(reservations, pickupDate) {
  for (const r of reservations) {
    if (sameWeek(pickupDate,new Date())) {
      await Product.updateOne({ _id:r.productId }, { $inc:{quantityAvailable:r.qty} });
      await Product.updateOne({ _id:r.productId }, [{ $set:{soldOut:{ $eq:["$quantityAvailable",0] } } }]);
    }
    if (r.weeklyQty) {
      const weekly=await WeeklyStock.findOneAndUpdate({product:r.productId,weekStart:startOfWeek(pickupDate),soldQuantity:{$gte:r.weeklyQty}},{$inc:{soldQuantity:-r.weeklyQty}},{new:true});
      if(weekly) await WeeklyStock.updateOne({_id:weekly._id},[{$set:{soldOut:{$gte:["$soldQuantity","$quantity"]}}}]);
    }
  }
}

async function releaseInventoryItems(items, pickupDate) {
  for(const item of items){
    if(sameWeek(pickupDate,new Date())){
      await Product.updateOne({_id:item.product},{$inc:{quantityAvailable:item.quantity}});
      await Product.updateOne({_id:item.product},[{$set:{soldOut:{$eq:["$quantityAvailable",0]}}}]);
    }
    const weekly=await WeeklyStock.findOneAndUpdate({product:item.product,weekStart:startOfWeek(pickupDate),soldQuantity:{$gte:item.quantity}},{$inc:{soldQuantity:-item.quantity}},{new:true});
    if(weekly) await WeeklyStock.updateOne({_id:weekly._id},[{$set:{soldOut:{$gte:["$soldQuantity","$quantity"]}}}]);
  }
}

async function releaseOrderInventory(order) {
  await releaseInventoryItems(order.items, order.pickupDate);
  return PickupSlot.findOneAndUpdate({_id:order.pickupSlot,bookedCount:{$gt:0}},{$inc:{bookedCount:-1}},{new:true});
}

async function createOrder(req,res){
  const {items,pickupSlot:pickupSlotId}=req.body;
  if(!Array.isArray(items)||!items.length)return res.status(400).json({success:false,message:"Order items are required"});
  const grouped=new Map();
  for(const item of items){const id=String(item.product||"");const qty=Number(item.quantity);if(!id||!Number.isInteger(qty)||qty<1)return res.status(400).json({success:false,message:"Each product needs a positive integer quantity"});grouped.set(id,(grouped.get(id)||0)+qty);}
  const normalized=[...grouped.entries()].map(([product,quantity])=>({product,quantity}));
  const slot=await PickupSlot.findOne({_id:pickupSlotId,isActive:true}); if(!slot)return res.status(400).json({success:false,message:"Valid pickup slot is required"});
  const pickupDate=slotDateTime(slot.date,slot.startTime); if(pickupDate<=new Date())return res.status(400).json({success:false,message:"Pickup slot must be in the future"});
  const [farmer,market,products]=await Promise.all([
    User.findOne({_id:slot.farmer,role:"farmer",isActive:true,"farmerProfile.approvalStatus":"approved"}),
    Market.findOne({_id:slot.market,isActive:true}),
    Product.find({_id:{$in:normalized.map(x=>x.product)},temporarilyUnavailable:false,adminModerationBlocked:false}).populate("farmer","name farmerProfile").populate("market","name isActive")
  ]);
  if(!farmer)return res.status(400).json({success:false,message:"The selected farmer is not active or approved"});
  if(!market)return res.status(400).json({success:false,message:"The selected market is not active"});
  if(products.length!==normalized.length)return res.status(400).json({success:false,message:"One or more products are unavailable"});
  const first=products[0];
  if(products.some(p=>String(p.farmer._id||p.farmer)!==String(first.farmer._id||first.farmer)||String(p.market._id||p.market)!==String(first.market._id||first.market)))return res.status(400).json({success:false,message:"A pre-order must contain products from one farmer and one market"});
  if(String(slot.farmer)!==String(first.farmer._id||first.farmer)||String(slot.market)!==String(first.market._id||first.market))return res.status(400).json({success:false,message:"Pickup slot does not match the selected farmer/market"});
  try { await validateOrderSlot(slot, farmer, market); } catch (error) { return res.status(error.statusCode || 400).json({ success:false, message:error.message }); }
  const cutoffMinutes=Math.max(0,Number(farmer.farmerProfile?.cutoffMinutes??120)); const cutoffAt=new Date(pickupDate.getTime()-cutoffMinutes*60000); if(new Date()>=cutoffAt)return res.status(400).json({success:false,message:"The pickup cutoff time has passed for this slot"});
  const slotReserved=await PickupSlot.findOneAndUpdate({_id:slot._id,isActive:true,$expr:{$lt:["$bookedCount","$capacity"]}},{$inc:{bookedCount:1}},{new:true});
  if(!slotReserved)return res.status(409).json({success:false,message:"Pickup slot is full. Please choose another slot."});
  const reservations=[]; let total=0; const orderItems=[];
  try{
    for(const item of normalized){const product=products.find(p=>String(p._id)===String(item.product));const reservation=await reserveProduct(product,item.quantity,pickupDate,reservations);const price=Number(reservation.price ?? product.price);orderItems.push({product:product._id,nameSnapshot:product.name,priceSnapshot:price,quantity:item.quantity});total+=price*item.quantity;}
    const order=await Order.create({customer:req.user._id,farmer:first.farmer._id||first.farmer,market:first.market._id||first.market,pickupSlot:slot._id,items:orderItems,totalAmount:total,pickupDate,cutoffAt});
    await Notification.create({user:req.user._id,type:"ORDER_CONFIRMATION",title:"Order confirmed",message:`Your MarketLink pre-order ${order._id} has been placed for pickup.`});
    await sendOrderConfirmationEmail(req.user,order);
    return res.status(201).json({success:true,order});
  }catch(error){await rollbackReservations(reservations,pickupDate);await PickupSlot.updateOne({_id:slot._id,bookedCount:{$gt:0}},{$inc:{bookedCount:-1}});throw error;}
}

async function customerOrders(req,res){const orders=await Order.find({customer:req.user._id}).populate("farmer","name farmerProfile").populate("market","name address").populate("pickupSlot").sort({createdAt:-1});res.json({success:true,orders});}
async function farmerOrders(req,res){const orders=await Order.find({farmer:req.user._id}).populate("customer","name email phone").populate("market","name").populate("pickupSlot").sort({createdAt:-1});res.json({success:true,orders});}
async function allOrders(req,res){const orders=await Order.find().populate("customer","name email").populate("farmer","name").populate("market","name").sort({createdAt:-1});res.json({success:true,orders});}

async function modifyOrder(req,res){
  const order=await Order.findOne({_id:req.params.id,customer:req.user._id}); if(!order)return res.status(404).json({success:false,message:"Order not found"}); if(!["PLACED","ACCEPTED"].includes(order.status))return res.status(400).json({success:false,message:"This order can no longer be modified"}); if(new Date()>=order.cutoffAt)return res.status(400).json({success:false,message:"The order cutoff time has passed"});
  const requestedSlotId=req.body.pickupSlot||order.pickupSlot; const slot=await PickupSlot.findOne({_id:requestedSlotId,isActive:true}); if(!slot||String(slot.farmer)!==String(order.farmer)||String(slot.market)!==String(order.market))return res.status(400).json({success:false,message:"Invalid replacement pickup slot"});
  const farmer=await User.findById(order.farmer).select("farmerProfile isActive role"); const market=await Market.findById(order.market); const replacementPickupDate=slotDateTime(slot.date,slot.startTime); if(!farmer?.isActive||farmer.role!=="farmer")return res.status(400).json({success:false,message:"Farmer is not active"}); if(!sameWeek(order.pickupDate,replacementPickupDate))return res.status(400).json({success:false,message:"Pickup slot changes are limited to the same pickup week so stock reservations remain consistent"}); if(!market?.isActive)return res.status(400).json({success:false,message:"Market is not active"}); try{await validateOrderSlot(slot,farmer,market);}catch(error){return res.status(error.statusCode||400).json({success:false,message:error.message});} const cutoffMinutes=Math.max(0,Number(farmer?.farmerProfile?.cutoffMinutes??120)); const replacementCutoffAt=new Date(replacementPickupDate.getTime()-cutoffMinutes*60000); if(new Date()>=replacementCutoffAt)return res.status(400).json({success:false,message:"The replacement pickup slot is already past its cutoff"});
  if(req.body.items){
    if(!Array.isArray(req.body.items)||!req.body.items.length)return res.status(400).json({success:false,message:"Order must contain at least one item"});
    if(!sameWeek(order.pickupDate,replacementPickupDate))return res.status(400).json({success:false,message:"Item quantities can only be changed when the pickup week stays the same. Change the pickup slot separately."});
    const grouped=new Map(); for(const item of req.body.items){const id=String(item.product||"");const qty=Number(item.quantity);if(!id||!Number.isInteger(qty)||qty<1)return res.status(400).json({success:false,message:"Each modified item needs a positive integer quantity"});grouped.set(id,(grouped.get(id)||0)+qty);} const requested=[...grouped.entries()].map(([product,quantity])=>({product,quantity}));
    const products=await Product.find({_id:{$in:requested.map(x=>x.product)},temporarilyUnavailable:false,adminModerationBlocked:false}); if(products.length!==requested.length)return res.status(400).json({success:false,message:"One or more requested products are unavailable"});
    if(products.some(p=>String(p.farmer)!==String(order.farmer)||String(p.market)!==String(order.market)))return res.status(400).json({success:false,message:"Modified items must belong to the original farmer and market"});
    const oldMap=new Map(order.items.map(i=>[String(i.product),i.quantity])); const newMap=new Map(requested.map(i=>[i.product,i.quantity])); const added=[];
    try{
      for(const [productId,newQty] of newMap){const oldQty=oldMap.get(productId)||0;const delta=newQty-oldQty;if(delta>0){const product=products.find(p=>String(p._id)===productId);await reserveProduct(product,delta,replacementPickupDate,added);}}
      for(const [productId,oldQty] of oldMap){const newQty=newMap.get(productId)||0;const delta=oldQty-newQty;if(delta>0){await releaseInventoryItems([{product:productId,quantity:delta}],replacementPickupDate);}}
    }catch(error){await rollbackReservations(added,replacementPickupDate);throw error;}
    const freshProducts=new Map(products.map(p=>[String(p._id),p])); const weeklyRows=await WeeklyStock.find({product:{$in:requested.map(i=>i.product)},weekStart:startOfWeek(replacementPickupDate)}); const weeklyPrice=new Map(weeklyRows.map(row=>[String(row.product),row.price])); order.items=requested.map(i=>{const p=freshProducts.get(i.product);const price=Number(weeklyPrice.get(i.product) ?? p.price);return {product:p._id,nameSnapshot:p.name,priceSnapshot:price,quantity:i.quantity};}); order.totalAmount=order.items.reduce((sum,i)=>sum+i.priceSnapshot*i.quantity,0);
  }
  if(String(requestedSlotId)!==String(order.pickupSlot)){
    const reserved=await PickupSlot.findOneAndUpdate({_id:slot._id,isActive:true,$expr:{$lt:["$bookedCount","$capacity"]}},{$inc:{bookedCount:1}},{new:true}); if(!reserved)return res.status(409).json({success:false,message:"Replacement pickup slot is full"});
    const oldSlot=await PickupSlot.findOneAndUpdate({_id:order.pickupSlot,bookedCount:{$gt:0}},{$inc:{bookedCount:-1}},{new:true}); if(!oldSlot){await PickupSlot.updateOne({_id:slot._id,bookedCount:{$gt:0}},{$inc:{bookedCount:-1}});return res.status(409).json({success:false,message:"Original pickup slot is no longer available"});}
    order.pickupSlot=slot._id; order.pickupDate=replacementPickupDate; order.cutoffAt=replacementCutoffAt;
  }
  res.json({success:true,order:await order.save()});
}

async function cancelOrder(req,res){
  const order=await Order.findOne({_id:req.params.id,customer:req.user._id});if(!order)return res.status(404).json({success:false,message:"Order not found"});if(!["PLACED","ACCEPTED"].includes(order.status))return res.status(400).json({success:false,message:"This order cannot be cancelled"});if(new Date()>=order.cutoffAt)return res.status(400).json({success:false,message:"The order cutoff time has passed"});
  await releaseOrderInventory(order);order.status="CANCELLED";order.cancellationReason=req.body.reason||"Cancelled by customer";await order.save();await Notification.create({user:order.customer,type:"ORDER_STATUS",title:"Order cancelled",message:`Your MarketLink order ${order._id} has been cancelled.`});res.json({success:true,order});
}

async function updateOrderStatus(req,res){
  const order=await Order.findById(req.params.id);if(!order)return res.status(404).json({success:false,message:"Order not found"});if(req.user.role==="farmer"&&String(order.farmer)!==String(req.user._id))return res.status(403).json({success:false,message:"Access denied"});
  const transitions={PLACED:["ACCEPTED","DECLINED"],ACCEPTED:["READY_FOR_PICKUP","CANCELLED"],READY_FOR_PICKUP:["COMPLETED"],COMPLETED:[],DECLINED:[],CANCELLED:[]};const next=req.body.status;if(!transitions[order.status]?.includes(next))return res.status(400).json({success:false,message:`Invalid status transition from ${order.status} to ${next}`});
  if(next==="CANCELLED"&&new Date()>=order.cutoffAt)return res.status(400).json({success:false,message:"The order cutoff time has passed"});
  if(next==="DECLINED"||next==="CANCELLED")await releaseOrderInventory(order);
  order.status=next;if(next==="DECLINED"||next==="CANCELLED")order.cancellationReason=req.body.reason||(next==="DECLINED"?"Declined by farmer":"Cancelled by farmer");await order.save();
  const customer=await User.findById(order.customer).select("name email");
  if(next==="READY_FOR_PICKUP")await Notification.create({user:order.customer,type:"ORDER_READY",title:"Order ready for pickup",message:`Your order ${order._id} is ready for pickup.`});
  else if(["ACCEPTED","DECLINED","CANCELLED","COMPLETED"].includes(next)){const labels={ACCEPTED:"Order accepted",DECLINED:"Order declined",CANCELLED:"Order cancelled",COMPLETED:"Order completed"};await Notification.create({user:order.customer,type:"ORDER_STATUS",title:labels[next],message:`Your MarketLink order ${order._id} is now ${next.replaceAll("_"," ").toLowerCase()}.`});}
  if(customer)await sendOrderStatusEmail(customer,order,next);res.json({success:true,order});
}

async function reorder(req,res){const original=await Order.findOne({_id:req.params.id,customer:req.user._id}).populate("items.product");if(!original)return res.status(404).json({success:false,message:"Order not found"});const farmer=await User.findOne({_id:original.farmer,role:"farmer",isActive:true,"farmerProfile.approvalStatus":"approved"}).select("_id");const market=await Market.findOne({_id:original.market,isActive:true}).select("_id");if(!farmer||!market)return res.status(400).json({success:false,message:"The original farmer or market is no longer available"});const items=original.items.filter(i=>i.product&&!i.product.temporarilyUnavailable&&!i.product.adminModerationBlocked&&i.product.farmer?.toString()===farmer._id.toString()&&i.product.market?.toString()===market._id.toString()).map(i=>({product:i.product._id,quantity:i.quantity}));res.json({success:true,farmer:original.farmer,market:original.market,items,message:"Available items prepared for reorder"});}
module.exports={createOrder,customerOrders,farmerOrders,allOrders,modifyOrder,cancelOrder,updateOrderStatus,reorder};
