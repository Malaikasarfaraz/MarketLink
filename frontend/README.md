# MarketLink Frontend

React + Vite frontend for MarketLink.

## Run

```cmd
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set:

```env
VITE_API_URL=http://localhost:5000/api
```

For production, point `VITE_API_URL` to the deployed backend `/api` URL.

## Customer routes

- `/products`
- `/markets`
- `/farmers`
- `/favorites`
- `/cart`
- `/checkout`
- `/orders`
- `/dashboard`
- `/ai-assistant`

## Farmer routes

- `/farmer`
- `/farmer/profile`
- `/farmer/products`
- `/farmer/weekly-stock`
- `/farmer/pickup-slots`
- `/farmer/orders`
- `/farmer/reviews`

## Admin routes

- `/admin`
- `/admin/users`
- `/admin/markets`
- `/admin/categories`
- `/admin/moderation`
- `/admin/announcements`
- `/admin/reports`
