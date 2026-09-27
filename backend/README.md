# MarketLink Backend

Express/MongoDB API for MarketLink — eGreen Basket.

## Run

```cmd
cd backend
npm install
copy .env.example .env
npm run dev
```

Health endpoint:

`http://localhost:5000/api/health`

## Image uploads (Cloudinary)

Product photos and farmer stall photos are uploaded to Cloudinary instead of being
stored on the local disk.

1. Create a free account at https://cloudinary.com
2. From the Cloudinary dashboard copy your **Cloud Name**, **API Key**, and **API Secret**.
3. Paste them into `backend/.env`:

   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. That's it — no extra Cloudinary dashboard configuration is needed. Uploads go
   through the backend (never directly from the browser), so the API secret is
   never exposed to the client.

### Upload endpoints

| Method | Endpoint                     | Access               | Purpose                                   |
|--------|-------------------------------|-----------------------|--------------------------------------------|
| POST   | `/api/uploads/product-image` | farmer, admin (auth)  | Upload a product photo, returns `{ url, publicId }` |
| POST   | `/api/uploads/farmer-image`  | farmer, admin (auth)  | Upload a farmer stall/profile photo |
| DELETE | `/api/uploads`               | farmer, admin (auth)  | Delete an image from Cloudinary by `publicId` |

The frontend uploads the file first, gets back a Cloudinary `url` + `publicId`,
then sends those two fields along with the rest of the product form to the normal
`/api/products` create/update endpoints. Old images are automatically deleted from
Cloudinary when a product's image is replaced or the product itself is deleted.

## Seed

```cmd
npm run seed
```

The seed resets the database and creates:

- Admin: `admin@marketlink.com`
- Farmer: `farmer@marketlink.com`
- Customer: `customer@marketlink.com`
- Password: `MarketLink@123`

## API modules

- `/api/auth`
- `/api/products`
- `/api/categories`
- `/api/markets`
- `/api/orders`
- `/api/pickup-slots`
- `/api/weekly-stock`
- `/api/favorites`
- `/api/reviews`
- `/api/farmer`
- `/api/admin`
- `/api/notifications`
- `/api/ai`

## Important business rules

- Customers can place pickup orders only.
- One order contains products from one farmer and one market.
- Pickup slot capacity is enforced.
- Farmer cutoff minutes are used to calculate `cutoffAt` for each order.
- Eligible cancellation/decline restores product stock, weekly stock and slot capacity.
- Order transitions are validated server-side.
- Reviews require a completed order and an ordered product.
- Farmers can only manage their own products, weekly stock, pickup slots and reviews.
- Admin controls approvals, markets, categories, moderation, announcements and reports.
