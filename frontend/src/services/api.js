import axios from 'axios';
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api',headers:{'Content-Type':'application/json'}});
api.interceptors.request.use(config=>{
  const token=localStorage.getItem('marketlink_token');
  if(token) config.headers.Authorization=`Bearer ${token}`;
  if(String(config.method||'get').toLowerCase()==='get'){
    config.headers['Cache-Control']='no-cache';
    config.headers.Pragma='no-cache';
    config.params={...(config.params||{}),_refresh:Date.now()};
  }
  return config;
});
api.interceptors.response.use(r=>r,e=>{if(e.response?.status===401){localStorage.removeItem('marketlink_token');localStorage.removeItem('marketlink_user');} return Promise.reject(e);});
export default api;
