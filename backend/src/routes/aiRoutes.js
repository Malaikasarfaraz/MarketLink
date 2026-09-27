const router = require("express").Router();
const controller = require("../controllers/aiController");

// The assistant only uses public marketplace data (products, approved farmers,
// markets and active pickup slots), so it can be used without a login just
// like the standalone chatbot demo.
router.post("/ask", controller.ask);

module.exports = router;
