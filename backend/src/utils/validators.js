function fail(message){const error=new Error(message);error.statusCode=400;throw error;}
function clean(value){return String(value??"").trim();}
function required(value,field){if(!clean(value))fail(`${field} is required`);}
function email(value){const v=clean(value);if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v))fail("Enter a valid email address");return v.toLowerCase();}
function password(value){if(typeof value!=="string"||value.length<8||value.length>72)fail("Password must be 8-72 characters");if(/\s/.test(value)||!/[A-Za-z]/.test(value)||!/[0-9]/.test(value))fail("Password must contain letters and numbers and no spaces");}
function name(value,field="Name"){const v=clean(value);if(v.length<2||v.length>80||!/^[\p{L}][\p{L}\s.'-]{1,79}$/u.test(v))fail(`${field} must be 2-80 characters and contain valid characters`);return v;}
function phone(value,requiredField=false){const v=clean(value);if(!v){if(requiredField)fail("Phone number is required");return v;}if(!/^\+?[0-9\s()-]{7,20}$/.test(v))fail("Enter a valid phone number");return v;}
function number(value,field,{min=0,max=Infinity,requiredField=true}={}){if(value===undefined||value===null||value===""){if(requiredField)fail(`${field} is required`);return undefined;}const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)fail(`${field} must be between ${min} and ${max}`);return n;}
function positiveNumber(value,field){return number(value,field,{min:0});}
module.exports={required,email,password,name,phone,number,positiveNumber};
