const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscription.controller");
const authPolicy = require("../utils/auth.policy");



router.post("/create-subscription",authPolicy, subscriptionController.createSubscription);
router.get("/subscription-success", subscriptionController.subscriptionSuccess);




router.post("/reason", authPolicy,subscriptionController.saveCancelReason);
router.post("/discount", authPolicy,subscriptionController.applyDiscountAndKeepSubscription);
router.post("/cancel", authPolicy,subscriptionController.cancelSubscription);
router.post("/revertUnsub", authPolicy,subscriptionController.revertSubscriptionCancel);
router.get('/billing-info', authPolicy, subscriptionController.getBillingInfo);
router.post('/upgrade', authPolicy, subscriptionController.upgradePlan);




module.exports = router;
