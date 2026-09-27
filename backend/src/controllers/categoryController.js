const mongoose=require("mongoose");
const Category=require("../models/Category");

async function listCategories(req,res){
  const categories=await Category.find({isActive:{$ne:false}}).sort({name:1}).lean();
  res.set("Cache-Control","no-store");
  res.json({success:true,categories});
}

module.exports={listCategories};
