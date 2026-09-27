const PickupSlot = require("../models/PickupSlot");
const User = require("../models/User");
const Market = require("../models/Market");

function normalizeDate(value) {
  const d = new Date(value); if (Number.isNaN(d.getTime())) return null; d.setHours(0, 0, 0, 0); return d;
}
function validTime(value) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || "")); }
function dayName(date) { return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date); }

async function validateSlotSchedule(farmerId, marketId, date, startTime, endTime) {
  const [farmer, market] = await Promise.all([User.findOne({ _id: farmerId, role: "farmer", isActive: true, "farmerProfile.approvalStatus": "approved" }), Market.findOne({ _id: marketId, isActive: true })]);
  if (!farmer) { const e = new Error("Farmer is not active or approved"); e.statusCode = 400; throw e; }
  if (!market) { const e = new Error("Market is not active"); e.statusCode = 400; throw e; }
  if (!farmer.farmerProfile?.markets?.some(id => id.toString() === String(marketId)) || !market.farmers.some(id => id.toString() === String(farmerId))) { const e = new Error("Farmer is not assigned to this market"); e.statusCode = 400; throw e; }
  const day = dayName(date);
  if (market.operatingDays?.length && !market.operatingDays.includes(day)) { const e = new Error(`Market is not operating on ${day}`); e.statusCode = 400; throw e; }
  if (farmer.farmerProfile.operatingDays?.length && !farmer.farmerProfile.operatingDays.includes(day)) { const e = new Error(`Farmer is not operating on ${day}`); e.statusCode = 400; throw e; }
  const fStart = farmer.farmerProfile.pickupWindowStart; const fEnd = farmer.farmerProfile.pickupWindowEnd;
  if (fStart && fEnd && (startTime < fStart || endTime > fEnd)) { const e = new Error("Pickup slot must stay inside the farmer pickup window"); e.statusCode = 400; throw e; }
  if (market.openingTime && startTime < market.openingTime || market.closingTime && endTime > market.closingTime) { const e = new Error("Pickup slot must stay inside market opening hours"); e.statusCode = 400; throw e; }
}

async function listSlots(req, res) {
  const filter = { isActive: true };
  if (req.query.farmer) filter.farmer = req.query.farmer; if (req.query.market) filter.market = req.query.market;
  if (req.query.date) { const start = normalizeDate(req.query.date); if (!start) return res.status(400).json({ success:false,message:"Invalid date" }); const end = new Date(start); end.setDate(end.getDate()+1); filter.date={ $gte:start,$lt:end }; }
  const slots = await PickupSlot.find(filter).populate("farmer", "name farmerProfile").populate("market", "name address").sort({ date:1,startTime:1 });
  res.json({ success:true, slots });
}

async function createSlot(req, res) {
  const { market, date, startTime, endTime, capacity=10 } = req.body;
  if (!market || !date || !startTime || !endTime) return res.status(400).json({success:false,message:"Market, date, start time and end time are required"});
  const slotDate=normalizeDate(date); const cap=Number(capacity);
  if (!slotDate || slotDate < normalizeDate(new Date())) return res.status(400).json({success:false,message:"Pickup date cannot be in the past"});
  if (!validTime(startTime)||!validTime(endTime)||startTime>=endTime) return res.status(400).json({success:false,message:"Valid start/end times are required"});
  if (!Number.isInteger(cap)||cap<1||cap>1000) return res.status(400).json({success:false,message:"Capacity must be an integer between 1 and 1000"});
  const farmer=await User.findById(req.user._id);
  if (req.user.role === "farmer" && !farmer?.farmerProfile?.markets?.some(id=>id.toString()===String(market))) return res.status(403).json({success:false,message:"You can only create slots for your assigned markets"});
  await validateSlotSchedule(req.user._id, market, slotDate, startTime, endTime);
  const exists=await PickupSlot.findOne({farmer:req.user._id,market,date:slotDate,startTime,isActive:true}); if(exists)return res.status(409).json({success:false,message:"A pickup slot with this start time already exists"});
  const slot=await PickupSlot.create({farmer:req.user._id,market,date:slotDate,startTime,endTime,capacity:cap}); res.status(201).json({success:true,slot});
}

async function updateSlot(req,res){
  const slot=await PickupSlot.findById(req.params.id); if(!slot)return res.status(404).json({success:false,message:"Pickup slot not found"});
  if(req.user.role!=="admin"&&slot.farmer.toString()!==req.user._id.toString())return res.status(403).json({success:false,message:"Access denied"});
  const date=req.body.date?normalizeDate(req.body.date):slot.date; const startTime=req.body.startTime||slot.startTime; const endTime=req.body.endTime||slot.endTime; const market=req.body.market||slot.market; const capacity=req.body.capacity===undefined?slot.capacity:Number(req.body.capacity);
  if(!date||date<normalizeDate(new Date()))return res.status(400).json({success:false,message:"Pickup date cannot be in the past"});
  if(!validTime(startTime)||!validTime(endTime)||startTime>=endTime)return res.status(400).json({success:false,message:"Valid start/end times are required"});
  if(!Number.isInteger(capacity)||capacity<slot.bookedCount||capacity<1||capacity>1000)return res.status(400).json({success:false,message:`Capacity must be an integer and cannot be below booked count (${slot.bookedCount})`});
  if(String(market)!==String(slot.market))return res.status(400).json({success:false,message:"A pickup slot cannot be moved to another market"});
  await validateSlotSchedule(slot.farmer, market, date, startTime, endTime);
  const update={date,startTime,endTime,capacity}; if(req.body.isActive!==undefined)update.isActive=Boolean(req.body.isActive);
  const duplicate=await PickupSlot.findOne({_id:{$ne:slot._id},farmer:slot.farmer,market,date,startTime,isActive:true}); if(duplicate)return res.status(409).json({success:false,message:"Another active slot already uses this start time"});
  Object.assign(slot,update); await slot.save(); res.json({success:true,slot});
}

async function deleteSlot(req,res){const slot=await PickupSlot.findById(req.params.id);if(!slot)return res.status(404).json({success:false,message:"Pickup slot not found"});if(req.user.role!=="admin"&&slot.farmer.toString()!==req.user._id.toString())return res.status(403).json({success:false,message:"Access denied"});if(slot.bookedCount>0)return res.status(400).json({success:false,message:"Booked pickup slots cannot be deleted. Deactivate them after existing orders are handled."});slot.isActive=false;await slot.save();res.json({success:true,message:"Pickup slot disabled"});}
module.exports={listSlots,createSlot,updateSlot,deleteSlot};
