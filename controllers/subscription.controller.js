const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Plan = require("../models/plans.model");
const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");


const UserSubscription = require("../models/userSubscriptionModel");
const SubscriptionCancellation = require("../models/subscriptionCancellation.model");
const SubscriptionPlan = require("../models/subscriptionPlans.model");

const methods = {


  createCreditCheckout: async (req, res) => {
    try {
      const { credits } = req.body;
      const userId = req.token._id;


      if (!credits || credits <= 0) {
        return res.status(400).json({ success: false, msg: "Invalid credit quantity." });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, msg: "User not found" });

      // Create Stripe Customer if not exists
      if (!user.stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName,
        });

        user.stripeCustomerId = customer.id;
        await user.save();
      }

      const amountInCents = credits * 15; // $0.15 per credit

      const session = await stripe.checkout.sessions.create({
        customer: user.stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${credits} Extra Job Credits`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',

        success_url: `https://staging.robo-apply.com/plan-purchase-success`,
        cancel_url: `https://staging.robo-apply.com//plan-purchase-failure`,

        metadata: {
          userId: userId,
          creditsPurchased: credits,
        },
      });

      return res.status(200).json({ success: true, checkoutUrl: session.url });
    } catch (error) {
      console.error("Stripe Checkout Error:", error);
      return res.status(500).json({ success: false, msg: "Checkout failed", error: error.message });
    }
  },

  createSubscription: async (req, res) => {
    try {
      const { identifier } = req.body;

      const userId = req.token._id;


      // Validate User
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, error: "User not found" });


      //Check current plan
 
      const userPlan = await UserSubscription.findOne({ userId, isActive: true });

      if (userPlan && userPlan.planSnapshot.identifier !== "free_plan") {
        return res.status(200).json({
          success: true,
          message: `You are currently subscribed to ${userPlan.planSnapshot.name}`
        });
      } 

      const plan = await SubscriptionPlan.findOne({ identifier })
      if (!plan) return res.status(404).json({ success: false, error: "Subscription plan not Availiable" });

      //Will add logic to check if the user already has this subscription

      if (!plan.priceId || !plan.productId) {
        return res.status(404).json({ success: false, error: "Subscription plan not Availiable" });
      }

      // Check if user has a Stripe customer ID, if not create one
      if (!user.stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName,
        });

        user.stripeCustomerId = customer.id;
        await user.save();
      }


      // return res.status(200).json({success:true,plan})


      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        // customer_email: user.email,
        customer: user.stripeCustomerId,

        line_items: [{ price: plan.priceId, quantity: 1 }],
        success_url: `https://staging.robo-apply.com/plan-purchase-success`,
        cancel_url: `https://staging.robo-apply.com//plan-purchase-failure`,
        metadata: { userId: user._id.toString(), planIdentifier: identifier },
      });

      res.json({ success: true, checkoutUrl: session.url });
    } catch (error) {
      console.error("Error creating subscription:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

//   cancelSubscription : async (req, res) => {
//   try {
//       const userId = req.token._id;

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         msg: "userId is required.",
//       });
//     }

//     // Get active subscription for user
//     const userSub = await UserSubscription.findOne({ userId, isActive: true });

//     if (!userSub) {
//       return res.status(404).json({
//         success: false,
//         msg: "No active subscription found for this user.",
//       });
//     }

//     if (!userSub.stripeSubscriptionId) {
//       return res.status(400).json({
//         success: false,
//         msg: "No Stripe subscription ID found for this user.",
//       });
//     }

//     // Cancel on Stripe
//     await stripe.subscriptions.cancel(userSub.stripeSubscriptionId);

//     // Update local DB
//     userSub.isActive = false;
//     userSub.isCancelled = true;
//     await userSub.save();

//     return res.status(200).json({
//       success: true,
//       msg: "Subscription cancelled successfully.",
//     });

//   } catch (error) {
//     console.error("Error cancelling subscription:", error.message);
//     return res.status(500).json({
//       success: false,
//       msg: "Failed to cancel subscription.",
//       error: error.message,
//     });
//   }
// },

// cancelSubscription: async (req, res) => {
//   try {
//     const userId = req.token._id;

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         msg: "User ID is required.",
//       });
//     }

//     // Find active subscription
//     const userSub = await UserSubscription.findOne({ userId, isActive: true });

//     if (!userSub) {
//       return res.status(404).json({
//         success: false,
//         msg: "No active subscription found for this user.",
//       });
//     }

//     if (!userSub.stripeSubscriptionId) {
//       return res.status(400).json({
//         success: false,
//         msg: "No Stripe subscription ID found for this user.",
//       });
//     }

//     // Set Stripe subscription to cancel at period end
//     const updatedSub = await stripe.subscriptions.update(userSub.stripeSubscriptionId, {
//       cancel_at_period_end: true,
//     });

//     // Update local DB
//     userSub.isCancelled = true;
//     userSub.cancelAt = new Date(updatedSub.cancel_at * 1000); // Save cancel date
//     await userSub.save();

//     return res.status(200).json({
//       success: true,
//       msg: "Subscription will cancel at the end of the billing cycle.",
//       cancelAt: userSub.cancelAt,
//     });

//   } catch (error) {
//     console.error("Error cancelling subscription:", error.message);
//     return res.status(500).json({
//       success: false,
//       msg: "Failed to cancel subscription.",
//       error: error.message,
//     });
//   }
// },




  /**
   * Save Subscription in Database After Successful Payment
   */
  subscriptionSuccess: async (req, res) => {
    try {
      const { session_id } = req.query;

      if (!session_id) return res.status(400).json({ error: "Session ID missing" });

      // Retrieve session from Stripe
      const session = await stripe.checkout.sessions.retrieve(session_id);
      const subscriptionId = session.subscription;

      if (!subscriptionId) {
        console.error("❌ No subscription ID found in session.");
        return res.status(400).json({ error: "Subscription ID missing from session." });
      }

      // Retrieve subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = session.metadata.userId;
      const planId = session.metadata.planId;

      console.log("✅ Subscription Created in Stripe:", subscription.id);

      // Check if Subscription already exists in DB
      const existingSubscription = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
      if (!existingSubscription) {
        // Save Subscription in Database
        const newSubscription = new Subscription({
          userId,
          planId,
          stripeSubscriptionId: subscription.id,
          status: "active", // ✅ Mark as active
          startDate: new Date(subscription.current_period_start * 1000),
          endDate: new Date(subscription.current_period_end * 1000),
        });

        await newSubscription.save();
        console.log("✅ Subscription saved in MongoDB:", subscription.id);
      }

      res.json({ success: true, message: "Subscription activated successfully!" });
    } catch (error) {
      console.error("Error handling subscription success:", error.message);
      res.status(500).json({ error: error.message });
    }
  },


saveCancelReason: async (req, res) => {
  const userId = req.token._id;
  const { cancelReason, cancelReasonText } = req.body;

  const activeSub = await UserSubscription.findOne({ userId, isActive: true });
  if (!activeSub) {
    return res.status(404).json({ success: false, msg: "No active subscription found." });
  }

  await SubscriptionCancellation.create({
    userId,
    subscriptionId: activeSub._id,
    cancelReason,
    cancelReasonText,
    type: "send_to_team"
  });

  return res.status(200).json({ success: true, msg: "Reason submitted successfully." });
},

// applyDiscountAndKeepSubscription: async (req, res) => {
//   const userId = req.token._id;
//   const {identifier} = req.body;


//   const userSub = await UserSubscription.findOne({ userId, isActive: true });
//   if (!userSub) return res.status(404).json({ success: false, msg: "Active subscription not found." });

//   const originalSub = await stripe.subscriptions.retrieve(userSub.stripeSubscriptionId);
//   const currentPriceId = originalSub.items.data[0].price.id;

//   // Create 30% off coupon if not already created in Stripe dashboard
//   const coupon = await stripe.coupons.create({
//     percent_off: 30,
//     duration: "repeating",
//     duration_in_months: 3
//   });

//   // Apply discount
//   await stripe.subscriptions.update(userSub.stripeSubscriptionId, {
//     coupon: coupon.id
//   });

//   await SubscriptionCancellation.create({
//     userId,
//     subscriptionId: userSub._id,
//     cancelReason: [],
//     cancelReasonText: "",
//     type: "cancel",
//     appliedDiscount: true
//   });

//   return res.status(200).json({ success: true, msg: "30% discount applied for 3 months." });
// },

// applyDiscountAndKeepSubscription: async (req, res) => {
//   try {
//     const userId = req.token._id;
//     const { identifier } = req.body;

//     // Validate user
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ success: false, msg: "User not found." });

//     // Validate active subscription
//     const currentSub = await UserSubscription.findOne({ userId, isActive: true });
//     if (!currentSub || !currentSub.stripeSubscriptionId) {
//       return res.status(404).json({ success: false, msg: "Active subscription not found." });
//     }

//     // Get selected plan details
//     const selectedPlan = await SubscriptionPlan.findOne({ identifier });
//     if (!selectedPlan || !selectedPlan.priceId || !selectedPlan.productId) {
//       return res.status(404).json({ success: false, msg: "Subscription plan not available." });
//     }

//     // Create a 30% discount coupon (valid for 3 months)
//     const coupon = await stripe.coupons.create({
//       percent_off: 30,
//       duration: "repeating",
//       duration_in_months: 3,
//     });

//     // If user selected the same plan → Apply 30% coupon directly to current subscription
//     if (
//       currentSub.planSnapshot &&
//       currentSub.planSnapshot.identifier === identifier
//     ) {
//       await stripe.subscriptions.update(currentSub.stripeSubscriptionId, {
//         coupon: coupon.id,
//       });

//       await SubscriptionCancellation.create({
//         userId,
//         subscriptionId: currentSub._id,
//         cancelReason: [],
//         cancelReasonText: "30% discount applied to same plan",
//         type: "cancel",
//         appliedDiscount: true,
//       });

//       return res.status(200).json({
//         success: true,
//         msg: "30% discount applied to your current plan.",
//       });
//     }

//     // If user selected a different plan → Cancel current at period end & redirect to discounted checkout
//     await stripe.subscriptions.update(currentSub.stripeSubscriptionId, {
//       cancel_at_period_end: true,
//     });

//     currentSub.isCancelled = true;
//     currentSub.cancelAt = new Date(
//       (await stripe.subscriptions.retrieve(currentSub.stripeSubscriptionId)).cancel_at * 1000
//     );
//     await currentSub.save();

//     // Ensure Stripe customer exists
//     if (!user.stripeCustomerId) {
//       const customer = await stripe.customers.create({
//         email: user.email,
//         name: user.fullName,
//       });
//       user.stripeCustomerId = customer.id;
//       await user.save();
//     }

//     // Create discounted checkout session for the new plan
//     const session = await stripe.checkout.sessions.create({
//       mode: "subscription",
//       payment_method_types: ["card"],
//       customer: user.stripeCustomerId,
//       line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
//       discounts: [{ coupon: coupon.id }],
//       metadata: {
//         userId: user._id.toString(),
//         planIdentifier: identifier,
//         fromDiscountFlow: "true"
//       },
//       success_url: `https://staging.robo-apply.com/plan-purchase-success`,
//       cancel_url: `https://staging.robo-apply.com/plan-purchase-failure`,
//     });

//     return res.status(200).json({
//       success: true,
//       checkoutUrl: session.url,
//       msg: "Redirecting to discounted plan checkout."
//     });

//   } catch (error) {
//     console.error("Error applying discount:", error.message);
//     return res.status(500).json({
//       success: false,
//       msg: "Failed to apply discount or change plan.",
//       error: error.message,
//     });
//   }
// },

applyDiscountAndKeepSubscription: async (req, res) => {
  try {
    const userId = req.token._id;
    const { identifier } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, msg: "User not found." });

    const currentSub = await UserSubscription.findOne({ userId, isActive: true });
    if (!currentSub || !currentSub.stripeSubscriptionId) {
      return res.status(404).json({ success: false, msg: "Active subscription not found." });
    }

    const selectedPlan = await SubscriptionPlan.findOne({ identifier });
    if (!selectedPlan || !selectedPlan.priceId || !selectedPlan.productId) {
      return res.status(404).json({ success: false, msg: "Subscription plan not available." });
    }

    // Create a 30% discount coupon (valid for 3 months)
    const coupon = await stripe.coupons.create({
      percent_off: 30,
      duration: "repeating",
      duration_in_months: 3,
    });

    if (currentSub.planSnapshot?.identifier === identifier) {
      await stripe.subscriptions.update(currentSub.stripeSubscriptionId, {
        coupon: coupon.id,
      });

      await SubscriptionCancellation.create({
        userId,
        subscriptionId: currentSub._id,
        cancelReason: [],
        cancelReasonText: "30% discount applied to same plan",
        type: "cancel",
        appliedDiscount: true,
      });

      return res.status(200).json({
        success: true,
        msg: "30% discount applied to your current plan.",
      });
    }

    // If different plan → cancel current and redirect to new checkout
    await stripe.subscriptions.update(currentSub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    const cancelAt = (await stripe.subscriptions.retrieve(currentSub.stripeSubscriptionId)).cancel_at;
    currentSub.isCancelled = true;
    currentSub.cancelAt = new Date(cancelAt * 1000);
    await currentSub.save();

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: user.stripeCustomerId,
      line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
      discounts: [{ coupon: coupon.id }],
      metadata: {
        userId: user._id.toString(),
        planIdentifier: identifier,
        fromDiscountFlow: "true",
      },
      success_url: `https://staging.robo-apply.com/plan-purchase-success`,
      cancel_url: `https://staging.robo-apply.com/plan-purchase-failure`,
    });

    return res.status(200).json({
      success: true,
      checkoutUrl: session.url,
      msg: "Redirecting to discounted plan checkout.",
    });

  } catch (error) {
    console.error("Error applying discount:", error.message);
    return res.status(500).json({
      success: false,
      msg: "Failed to apply discount or change plan.",
      error: error.message,
    });
  }
},


// cancelSubscription: async (req, res) => {
//   try {
//     const userId = req.token._id;
//     const { cancelReason, cancelReasonText } = req.body;

//     const userSub = await UserSubscription.findOne({ userId, isActive: true });
//     if (!userSub || !userSub.stripeSubscriptionId) {
//       return res.status(404).json({ success: false, msg: "Subscription not found." });
//     }

//     const stripeSub = await stripe.subscriptions.update(userSub.stripeSubscriptionId, {
//       cancel_at_period_end: true,
//     });

//     // Store cancellation reason
//     await SubscriptionCancellation.create({
//       userId,
//       subscriptionId: userSub._id,
//       cancelReason,
//       cancelReasonText,
//       type: "cancel"
//     });

//     userSub.isCancelled = true;
//     userSub.cancelAt = new Date(stripeSub.cancel_at * 1000);

//     let daysLeft=
//     userSub.notice=`Your ${userSub.planSnapshot.name} will expire in ${daysLeft} Days.`
//     await userSub.save();

//     return res.status(200).json({
//       success: true,
//       msg: "Subscription cancellation scheduled at period end.",
//       cancelAt: userSub.cancelAt
//     });

//   } catch (error) {
//     console.error("Cancel error:", error.message);
//     return res.status(500).json({ success: false, msg: "Cancellation failed", error: error.message });
//   }
// },

cancelSubscription: async (req, res) => {
  try {
    const userId = req.token._id;
    const { cancelReason, cancelReasonText } = req.body;

    const userSub = await UserSubscription.findOne({ userId, isActive: true });
    if (!userSub || !userSub.stripeSubscriptionId) {
      return res.status(404).json({ success: false, msg: "Subscription not found." });
    }

    const stripeSub = await stripe.subscriptions.update(userSub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Store cancellation reason
    await SubscriptionCancellation.create({
      userId,
      subscriptionId: userSub._id,
      cancelReason,
      cancelReasonText,
      type: "cancel"
    });

    // Update user subscription cancellation status
    userSub.isCancelled = true;

    if (stripeSub.cancel_at) {
      const cancelAtDate = new Date(stripeSub.cancel_at * 1000);
      userSub.cancelAt = cancelAtDate;

      // Calculate days left
      const now = new Date();
      const diffTime = cancelAtDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert ms to days

      userSub.notice = `Your ${userSub.planSnapshot.name} will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`;
    } else {
      userSub.notice = `Your ${userSub.planSnapshot.name} has been cancelled.`;
    }

    await userSub.save();

    return res.status(200).json({
      success: true,
      msg: "Subscription cancellation scheduled at period end.",
      cancelAt: userSub.cancelAt
    });

  } catch (error) {
    console.error("Cancel error:", error.message);
    return res.status(500).json({ success: false, msg: "Cancellation failed", error: error.message });
  }
},

revertSubscriptionCancel: async (req, res) => {
  try {
    const userId = req.token._id;

    const userSub = await UserSubscription.findOne({ userId, isActive: true });

    if (!userSub || !userSub.stripeSubscriptionId || !userSub.isCancelled) {
      return res.status(400).json({
        success: false,
        msg: "No cancellable subscription found.",
      });
    }

    const updatedSub = await stripe.subscriptions.update(userSub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update local DB
    userSub.isCancelled = false;
    userSub.cancelAt = null;
    await userSub.save();

    return res.status(200).json({
      success: true,
      msg: "Subscription cancellation reverted.",
    });

  } catch (error) {
    console.error("Error reverting cancellation:", error.message);
    return res.status(500).json({
      success: false,
      msg: "Failed to revert cancellation.",
      error: error.message,
    });
  }
},

upgradePlan: async (req, res) => {
  try {
    const userId = req.token._id;
    const { identifier } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, msg: "User not found." });

    const currentSub = await UserSubscription.findOne({ userId, isActive: true });
    if (!currentSub || !currentSub.stripeSubscriptionId) {
      return res.status(404).json({ success: false, msg: "Active subscription not found." });
    }

    const selectedPlan = await SubscriptionPlan.findOne({ identifier });
    if (!selectedPlan || !selectedPlan.priceId || !selectedPlan.productId) {
      return res.status(404).json({ success: false, msg: "Subscription plan not available." });
    }

    if (currentSub.planSnapshot?.identifier === identifier) {
      return res.status(400).json({
        success: false,
        msg: "You are already subscribed to this plan.",
      });
    }

    // Mark current subscription to cancel at period end
    await stripe.subscriptions.update(currentSub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    const cancelAt = (await stripe.subscriptions.retrieve(currentSub.stripeSubscriptionId)).cancel_at;
    currentSub.isCancelled = true;
    currentSub.cancelAt = new Date(cancelAt * 1000);
    await currentSub.save();

    // Ensure stripe customer exists
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    // Create Stripe checkout session for new plan (no discount)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: user.stripeCustomerId,
      line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
      metadata: {
        userId: user._id.toString(),
        planIdentifier: identifier,
        fromUpgradeFlow: "true", // ✅ Send flag for webhook
      },
      success_url: `https://staging.robo-apply.com/plan-purchase-success`,
      cancel_url: `https://staging.robo-apply.com/plan-purchase-failure`,
    });

    return res.status(200).json({
      success: true,
      checkoutUrl: session.url,
      msg: "Redirecting to upgraded plan checkout.",
    });

  } catch (error) {
    console.error("Error upgrading plan:", error.message);
    return res.status(500).json({
      success: false,
      msg: "Failed to upgrade plan.",
      error: error.message,
    });
  }
},


getBillingInfo: async (req, res) => {
  try {
    const userId = req.token._id;

    const userSub = await UserSubscription.findOne({ userId, isActive: true });
    if (!userSub || !userSub.stripeSubscriptionId) {
      return res.status(404).json({ success: false, msg: "No active subscription found." });
    }

    const subscription = await stripe.subscriptions.retrieve(userSub.stripeSubscriptionId);
    const price = subscription.items.data[0].price;
    const product = await stripe.products.retrieve(price.product);

    // ✅ Fetch the upcoming invoice to get actual discounted price
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      subscription: subscription.id,
      customer: subscription.customer,
    });

    // Convert cents to dollars
    const originalAmount = price.unit_amount / 100;
    const discountedAmount = upcomingInvoice.total / 100;
    const discountPercent = subscription.discount?.coupon?.percent_off || 0;

    return res.status(200).json({
      success: true,
      data: {
        nextBillingDate: new Date(subscription.current_period_end * 1000),
        originalAmount,
        discountedAmount,
        discountPercent,
        currency: price.currency,
        interval: price.recurring.interval,
        productName: product.name,
        priceId: price.id,
        subscriptionStatus: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      }
    });

  } catch (error) {
    console.error("Error fetching billing info:", error.message);
    return res.status(500).json({
      success: false,
      msg: "Failed to fetch billing info",
      error: error.message
    });
  }
},






  // cancelSubscription: async (req, res) => {
  //   try {
  //     const { userId } = req.body;

  //     // ✅ Validate User
  //     const user = await User.findById(userId);
  //     if (!user) return res.status(404).json({ error: "User not found" });

  //     // ✅ Find the Active Subscription for the User
  //     const subscription = await Subscription.findOne({
  //       userId,
  //       status: "active",
  //     });

  //     if (!subscription) {
  //       return res.status(404).json({ error: "No active subscription found for this user." });
  //     }

  //     // ✅ Cancel Subscription on Stripe
  //     await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

  //     // ✅ Update Subscription Status in MongoDB
  //     subscription.status = "canceled";
  //     await subscription.save();

  //     console.log("✅ Subscription canceled successfully:", subscription.stripeSubscriptionId);

  //     res.json({ success: true, message: "Subscription canceled successfully!" });
  //   } catch (error) {
  //     console.error("❌ Error canceling subscription:", error.message);
  //     res.status(500).json({ error: error.message });
  //   }
  // },

  /**
   * Handle Stripe Webhooks (Sync Subscription Status)
   */
  // handleWebhook: async (req, res) => {
  //   let event;
  //   try {
  //     const sig = req.headers["stripe-signature"];
  //     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  //     if (!webhookSecret) {
  //       console.error("❌ STRIPE_WEBHOOK_SECRET is missing in .env");
  //       return res.status(400).send("Webhook secret is missing.");
  //     }

  //     // ✅ Use req.body directly because express.raw() is applied
  //     event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  //     console.log("EVENTTTTTTTTTTTTTTTTTT", event)
  //   } catch (err) {
  //     console.error("❌ Webhook signature verification failed:", err.message);
  //     return res.status(400).send(`Webhook Error: ${err.message}`);
  //   }

  //   try {
  //     switch (event.type) {
  //       case "customer.subscription.deleted":
  //         const deletedSubscription = event.data.object;
  //         console.log("🔴 Subscription Canceled:", deletedSubscription.id);

  //         // Update subscription in MongoDB
  //         const updatedSubscription = await Subscription.findOneAndUpdate(
  //           { stripeSubscriptionId: deletedSubscription.id },
  //           { status: "canceled" },
  //           { new: true }
  //         );

  //         if (updatedSubscription) {
  //           console.log("✅ Subscription marked as canceled in DB:", updatedSubscription);
  //         } else {
  //           console.error("❌ Subscription not found in DB:", deletedSubscription.id);
  //         }
  //         break;

  //       case "checkout.session.completed":
  //         const session = event.data.object;

  //         const stripeSubscriptionId = session.subscription;
  //         const stripeCustomerId = session.customer;
  //         const userId = session.metadata.userId;
  //         const planIdentifier = session.metadata.planIdentifier;

  //         if (!userId || !planIdentifier) {
  //           console.error("❌ Missing metadata in Stripe session");
  //           break;
  //         }

  //         const user = await User.findById(userId);
  //         if (!user) {
  //           console.error("❌ User not found for subscription");
  //           break;
  //         }

  //         const plan = await SubscriptionPlan.findOne({ identifier: planIdentifier });
  //         if (!plan) {
  //           console.error("❌ Subscription plan not found");
  //           break;
  //         }

  //         const planSnapshot = {
  //           name: plan.name,
  //           identifier: plan.identifier,
  //           billingCycle: plan.billingCycle,
  //           price: plan.price,
  //           dailyLimit: plan.jobLimits.dailyLimit,
  //           monthlyCredits: plan.monthlyCredits,
  //           resumeProfiles: plan.resumeProfiles,
  //           freeTailoredResumes: plan.freeTailoredResumes,
  //           freeAutoApplies: plan.freeAutoApplies,
  //           includesAutoApply: plan.includesAutoApply,
  //           includesResumeBuilder: plan.includesResumeBuilder,
  //           includesResumeScore: plan.includesResumeScore,
  //           includesAICoverLetters: plan.includesAICoverLetters,
  //           includesInterviewBuddy: plan.includesInterviewBuddy,
  //           includesTailoredResumes: plan.includesTailoredResumes,
  //           descriptionNote: plan.descriptionNote
  //         };

  //         // deactivate previous subscription if needed

  //         let currentPlan = await UserSubscription.findOne({userId:userId,isActive:true})

  //         if(currentPlan){
  //           currentPlan.isActive = false,
  //           currentPlan.isCancelled=true
  //             await currentPlan.save();

  //         }



  //         // Create user subscription record
  //         await UserSubscription.create({
  //           userId: userId,
  //           subscriptionPlanId: plan._id,
  //           stripeSubscriptionId,
  //           stripeCustomerId,
  //           planSnapshot,
  //           usage: {
  //             jobApplicationsToday: 0,
  //             monthlyCreditsUsed: 0,
  //             resumeProfilesUsed: 0,
  //             tailoredResumesUsed: 0,
  //             autoAppliesUsed: 0,
  //           },
  //           startDate: new Date(),
  //           endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days (for monthly)
  //           isActive: true
  //         });

  //         console.log("✅ User subscription created for:", user.email);
  //         break;

  //       default:
  //         console.log(`Unhandled event type: ${event.type}`);
  //     }

  //     res.status(200).json({ received: true });
  //   } catch (error) {
  //     console.error("❌ Webhook processing error:", error.message);
  //     res.status(500).json({ error: error.message });
  //   }
  // },

  // handleWebhook: async (req, res) => {
  //   let event;

  //   try {
  //     const sig = req.headers["stripe-signature"];
  //     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  //     if (!webhookSecret) {
  //       console.error("❌ STRIPE_WEBHOOK_SECRET is missing in .env");
  //       return res.status(400).send("Webhook secret is missing.");
  //     }

  //     event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  //     console.log("✅ Stripe Event Received:", event.type);
  //   } catch (err) {
  //     console.error("❌ Webhook signature verification failed:", err.message);
  //     return res.status(400).send(`Webhook Error: ${err.message}`);
  //   }

  //   try {
  //     switch (event.type) {
  //       case "customer.subscription.deleted": {
  //         const deletedSubscription = event.data.object;

  //         const updated = await UserSubscription.findOneAndUpdate(
  //           { stripeSubscriptionId: deletedSubscription.id },
  //           { isActive: false, isCancelled: true },
  //           { new: true }
  //         );

  //         if (updated) {
  //           console.log("✅ Subscription marked as canceled:", updated._id);
  //         } else {
  //           console.warn("⚠️ No subscription found for canceled ID:", deletedSubscription.id);
  //         }

  //         break;
  //       }

  //       case "checkout.session.completed": {
  //         const session = event.data.object;

  //         const { userId, planIdentifier, creditsPurchased } = session.metadata || {};

  //         if (!userId) {
  //           console.error("❌ Missing userId in session metadata.");
  //           break;
  //         }

  //         const user = await User.findById(userId);
  //         if (!user) {
  //           console.error("❌ User not found for ID:", userId);
  //           break;
  //         }


  //         // ✅ Place this safety check here
  //         if (!user.stripeCustomerId) {
  //           user.stripeCustomerId = session.customer;
  //           await user.save();
  //         }

  //         // One-time Credit Purchase
  //         if (creditsPurchased && session.mode === "payment") {
  //           const extraCredits = parseInt(creditsPurchased, 10);

  //           user.credits = (user.credits || 0) + extraCredits;
  //           await user.save();

  //           console.log(`✅ Added ${extraCredits} extra credits to user ${user.email}`);
  //           break;
  //         }

  //         // Subscription Purchase
  //         if (planIdentifier && session.mode === "subscription" && session.subscription) {
  //           const plan = await SubscriptionPlan.findOne({ identifier: planIdentifier });
  //           if (!plan) {
  //             console.error("❌ Subscription plan not found for identifier:", planIdentifier);
  //             break;
  //           }

  //           // Deactivate any existing active subscription
  //           const existing = await UserSubscription.findOne({ userId, isActive: true });
  //           if (existing) {

  //             //If existing is a free plan move its credits to user.credits
  //             if(existing.planSnapshot.identifier === "free_plan" && user.isFreePlanExpired === false){
  //               user.credits = existing.planSnapshot.monthlyCredits - existing.usage.monthlyCreditsUsed
  //               await user.save();
  //             }
  //             existing.isActive = false;
  //             existing.isCancelled = true;
  //             await existing.save();
  //           }

  //           // Snapshot of plan data
  //           const planSnapshot = {
  //             name: plan.name,
  //             identifier: plan.identifier,
  //             billingCycle: plan.billingCycle,
  //             price: plan.price,
  //             dailyLimit: plan.jobLimits.dailyLimit,
  //             monthlyCredits: plan.monthlyCredits,
  //             resumeProfiles: plan.resumeProfiles,
  //             freeTailoredResumes: plan.freeTailoredResumes,
  //             freeAutoApplies: plan.freeAutoApplies,
  //             includesAutoApply: plan.includesAutoApply,
  //             includesResumeBuilder: plan.includesResumeBuilder,
  //             includesResumeScore: plan.includesResumeScore,
  //             includesAICoverLetters: plan.includesAICoverLetters,
  //             includesInterviewBuddy: plan.includesInterviewBuddy,
  //             includesTailoredResumes: plan.includesTailoredResumes,
  //             descriptionNote: plan.descriptionNote
  //           };

  //           // Create new subscription record
  //           await UserSubscription.create({
  //             userId: user._id,
  //             subscriptionPlanId: plan._id,
  //             stripeSubscriptionId: session.subscription,
  //             stripeCustomerId: session.customer,
  //             planSnapshot,
  //             usage: {
  //               jobApplicationsToday: 0,
  //               monthlyCreditsUsed: 0,
  //               resumeProfilesUsed: 0,
  //               tailoredResumesUsed: 0,
  //               autoAppliesUsed: 0,
  //               jobDescriptionGenerations: 0,
  //               jobSkillsGenerations: 0,
  //               jobTitleGenerations: 0,
  //               generationsWithoutTailoring: 0,
  //             },
  //             startDate: new Date(),
  //             endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  //             isActive: true,
  //           });

  //           user.isFreePlanExpired = false,
  //           await user.save();

  //           console.log(`✅ Created new subscription for ${user.email}`);
  //         }

  //         break;
  //       }

  //       default:
  //         console.log(`ℹ️ Unhandled event type: ${event.type}`);
  //     }

  //     res.status(200).json({ received: true });
  //   } catch (error) {
  //     console.error("❌ Error processing webhook:", error.message);
  //     res.status(500).json({ error: error.message });
  //   }
  // }

//   handleWebhook: async (req, res) => {
//   let event;

//   try {
//     const sig = req.headers["stripe-signature"];
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

//     if (!webhookSecret) {
//       console.error("❌ STRIPE_WEBHOOK_SECRET is missing in .env");
//       return res.status(400).send("Webhook secret is missing.");
//     }

//     event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
//     console.log("✅ Stripe Event Received:", event.type);
//   } catch (err) {
//     console.error("❌ Webhook signature verification failed:", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   try {
//     switch (event.type) {

//       // 🔁 Actual cancellation at end of billing cycle
//       case "customer.subscription.deleted": {
//         const deletedSubscription = event.data.object;

//         const updated = await UserSubscription.findOneAndUpdate(
//           { stripeSubscriptionId: deletedSubscription.id },
//           {
//             isActive: false,
//             isCancelled: true,
//             cancelAt: null,
//             endDate: new Date(),
//           },
//           { new: true }
//         );

//         if (updated) {
//           console.log("✅ Subscription marked as canceled:", updated._id);
//         } else {
//           console.warn("⚠️ No subscription found for canceled ID:", deletedSubscription.id);
//         }

//         break;
//       }

//       // 🔄 Updates for cancellation reversions or changes
//       case "customer.subscription.updated": {
//         const sub = event.data.object;

//         const updated = await UserSubscription.findOneAndUpdate(
//           { stripeSubscriptionId: sub.id },
//           {
//             isCancelled: sub.cancel_at_period_end,
//             cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
//           },
//           { new: true }
//         );

//         if (updated) {
//           console.log("✅ Subscription updated (cancel status):", updated._id);
//         } else {
//           console.warn("⚠️ No subscription found for update ID:", sub.id);
//         }

//         break;
//       }

//       // ✅ New checkout (subscription or credits)
//       case "checkout.session.completed": {
//         const session = event.data.object;
//         const { userId, planIdentifier, creditsPurchased } = session.metadata || {};

//         if (!userId) {
//           console.error("❌ Missing userId in session metadata.");
//           break;
//         }

//         const user = await User.findById(userId);
//         if (!user) {
//           console.error("❌ User not found for ID:", userId);
//           break;
//         }

//         // Save customer ID if not already present
//         if (!user.stripeCustomerId) {
//           user.stripeCustomerId = session.customer;
//           await user.save();
//         }

//         // One-time credit purchase
//         if (creditsPurchased && session.mode === "payment") {
//           const extraCredits = parseInt(creditsPurchased, 10);
//           user.credits = (user.credits || 0) + extraCredits;
//           await user.save();

//           console.log(`✅ Added ${extraCredits} extra credits to user ${user.email}`);
//           break;
//         }

//         // Subscription creation
//         if (planIdentifier && session.mode === "subscription" && session.subscription) {
//           const plan = await SubscriptionPlan.findOne({ identifier: planIdentifier });
//           if (!plan) {
//             console.error("❌ Subscription plan not found for identifier:", planIdentifier);
//             break;
//           }

//           // Cancel existing active subscription
//           const existing = await UserSubscription.findOne({ userId, isActive: true });
//           if (existing) {
//             // Move unused free credits to user
//             if (existing.planSnapshot.identifier === "free_plan" && user.isFreePlanExpired === false) {
//               user.credits += Math.max(
//                 0,
//                 existing.planSnapshot.monthlyCredits - existing.usage.monthlyCreditsUsed
//               );
//               await user.save();
//             }

//             existing.isActive = false;
//             existing.isCancelled = true;
//             await existing.save();
//           }

//           // Create snapshot
//           const planSnapshot = {
//             name: plan.name,
//             identifier: plan.identifier,
//             billingCycle: plan.billingCycle,
//             price: plan.price,
//             dailyLimit: plan.jobLimits.dailyLimit,
//             monthlyCredits: plan.monthlyCredits,
//             resumeProfiles: plan.resumeProfiles,
//             freeTailoredResumes: plan.freeTailoredResumes,
//             freeAutoApplies: plan.freeAutoApplies,
//             includesAutoApply: plan.includesAutoApply,
//             includesResumeBuilder: plan.includesResumeBuilder,
//             includesResumeScore: plan.includesResumeScore,
//             includesAICoverLetters: plan.includesAICoverLetters,
//             includesInterviewBuddy: plan.includesInterviewBuddy,
//             includesTailoredResumes: plan.includesTailoredResumes,
//             descriptionNote: plan.descriptionNote
//           };

//           // Save new subscription
//           await UserSubscription.create({
//             userId: user._id,
//             subscriptionPlanId: plan._id,
//             stripeSubscriptionId: session.subscription,
//             stripeCustomerId: session.customer,
//             planSnapshot,
//             usage: {
//               jobApplicationsToday: 0,
//               monthlyCreditsUsed: 0,
//               resumeProfilesUsed: 0,
//               tailoredResumesUsed: 0,
//               autoAppliesUsed: 0,
//               jobDescriptionGenerations: 0,
//               jobSkillsGenerations: 0,
//               jobTitleGenerations: 0,
//               generationsWithoutTailoring: 0,
//             },
//             startDate: new Date(),
//             endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//             isActive: true,
//             isCancelled: false,
//             cancelAt: null,
//           });

//           user.isFreePlanExpired = false;
//           await user.save();

//           console.log(`✅ Created new subscription for ${user.email}`);
//         }

//         break;
//       }

//       default:
//         console.log(`ℹ️ Unhandled event type: ${event.type}`);
//     }

//     res.status(200).json({ received: true });
//   } catch (error) {
//     console.error("❌ Error processing webhook:", error.message);
//     res.status(500).json({ error: error.message });
//   }
// }

// handleWebhook : async (req, res) => {
//   let event;

//   try {
//     const sig = req.headers["stripe-signature"];
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

//     if (!webhookSecret) {
//       console.error("❌ STRIPE_WEBHOOK_SECRET is missing in .env");
//       return res.status(400).send("Webhook secret is missing.");
//     }

//     event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
//     console.log("✅ Stripe Event Received:", event.type);
//   } catch (err) {
//     console.error("❌ Webhook signature verification failed:", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   try {
//     switch (event.type) {
//       // ✅ Actual cancellation at period end
//       case "customer.subscription.deleted": {
//         const deletedSub = event.data.object;

//         const updated = await UserSubscription.findOneAndUpdate(
//           { stripeSubscriptionId: deletedSub.id },
//           {
//             isActive: false,
//             isCancelled: true,
//             cancelAt: null,
//             endDate: new Date()
//           },
//           { new: true }
//         );

//         if (updated) {
//           console.log("✅ Subscription marked as cancelled:", updated._id);
//         } else {
//           console.warn("⚠️ No subscription found for deleted ID:", deletedSub.id);
//         }

//         break;
//       }

//       // ✅ Reversion or change to subscription status
//       case "customer.subscription.updated": {
//         const updatedSub = event.data.object;

//         const result = await UserSubscription.findOneAndUpdate(
//           { stripeSubscriptionId: updatedSub.id },
//           {
//             isCancelled: updatedSub.cancel_at_period_end,
//             cancelAt: updatedSub.cancel_at ? new Date(updatedSub.cancel_at * 1000) : null
//           },
//           { new: true }
//         );

//         if (result) {
//           console.log("🔄 Subscription updated (cancel/revert):", result._id);
//         } else {
//           console.warn("⚠️ No subscription found to update:", updatedSub.id);
//         }

//         break;
//       }

//       // ✅ New subscription or one-time payment
//       case "checkout.session.completed": {
//         const session = event.data.object;
//         const { userId, planIdentifier, creditsPurchased } = session.metadata || {};

//         if (!userId) {
//           console.error("❌ Missing userId in session metadata.");
//           break;
//         }

//         const user = await User.findById(userId);
//         if (!user) {
//           console.error("❌ User not found:", userId);
//           break;
//         }

//         if (!user.stripeCustomerId) {
//           user.stripeCustomerId = session.customer;
//           await user.save();
//         }

//         // ✅ Handle one-time credit purchase
//         if (creditsPurchased && session.mode === "payment") {
//           const extraCredits = parseInt(creditsPurchased, 10);
//           user.credits += extraCredits;
//           await user.save();

//           console.log(`✅ Added ${extraCredits} credits to user ${user.email}`);
//           break;
//         }

//         // ✅ Handle subscription purchase
//         if (planIdentifier && session.mode === "subscription" && session.subscription) {
//           const plan = await SubscriptionPlan.findOne({ identifier: planIdentifier });
//           if (!plan) {
//             console.error("❌ Subscription plan not found for identifier:", planIdentifier);
//             break;
//           }

//           const existing = await UserSubscription.findOne({ userId, isActive: true });
//           if (existing) {
//             // Move unused free plan credits to user
//             if (
//               existing.planSnapshot.identifier === "free_plan" &&
//               user.isFreePlanExpired === false
//             ) {
//               const remainingCredits = existing.planSnapshot.monthlyCredits - existing.usage.monthlyCreditsUsed;
//               if (remainingCredits > 0) {
//                 user.credits += remainingCredits;
//                 await user.save();
//               }
//             }

//             existing.isActive = false;
//             existing.isCancelled = true;
//             await existing.save();
//           }

//           const planSnapshot = {
//             name: plan.name,
//             identifier: plan.identifier,
//             billingCycle: plan.billingCycle,
//             price: plan.price,
//             dailyLimit: plan.jobLimits.dailyLimit,
//             monthlyCredits: plan.monthlyCredits,
//             resumeProfiles: plan.resumeProfiles,
//             freeTailoredResumes: plan.freeTailoredResumes,
//             freeAutoApplies: plan.freeAutoApplies,
//             includesAutoApply: plan.includesAutoApply,
//             includesResumeBuilder: plan.includesResumeBuilder,
//             includesResumeScore: plan.includesResumeScore,
//             includesAICoverLetters: plan.includesAICoverLetters,
//             includesInterviewBuddy: plan.includesInterviewBuddy,
//             includesTailoredResumes: plan.includesTailoredResumes,
//             descriptionNote: plan.descriptionNote
//           };

//           await UserSubscription.create({
//             userId: user._id,
//             subscriptionPlanId: plan._id,
//             stripeSubscriptionId: session.subscription,
//             stripeCustomerId: session.customer,
//             planSnapshot,
//             usage: {
//               jobApplicationsToday: 0,
//               monthlyCreditsUsed: 0,
//               resumeProfilesUsed: 0,
//               tailoredResumesUsed: 0,
//               autoAppliesUsed: 0,
//               jobDescriptionGenerations: 0,
//               jobSkillsGenerations: 0,
//               jobTitleGenerations: 0,
//               generationsWithoutTailoring: 0,
//             },
//             startDate: new Date(),
//             endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // optional estimate
//             isActive: true,
//             isCancelled: false,
//             cancelAt: null
//           });

//           user.isFreePlanExpired = false;
//           await user.save();

//           console.log(`✅ New subscription created for ${user.email}`);
//         }

//         break;
//       }

//       default:
//         console.log(`ℹ️ Unhandled event type: ${event.type}`);
//     }

//     res.status(200).json({ received: true });
//   } catch (err) {
//     console.error("❌ Error processing webhook:", err.message);
//     res.status(500).json({ error: err.message });
//   }
// },

// handleWebhook: async (req, res) => {
//   let event;

//   try {
//     const sig = req.headers["stripe-signature"];
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

//     if (!webhookSecret) return res.status(400).send("Webhook secret is missing.");

//     event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
//     console.log("✅ Stripe Event Received:", event.type);
//   } catch (err) {
//     console.error("❌ Webhook signature verification failed:", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   try {
//     switch (event.type) {
//       case "customer.subscription.deleted": {
//         const deletedSub = event.data.object;
//         await UserSubscription.findOneAndUpdate(
//           { stripeSubscriptionId: deletedSub.id },
//           {
//             isActive: false,
//             isCancelled: true,
//             cancelAt: null,
//             endDate: new Date(),
//           }
//         );
//         break;
//       }

//       case "customer.subscription.updated": {
//         const sub = event.data.object;
//         await UserSubscription.findOneAndUpdate(
//           { stripeSubscriptionId: sub.id },
//           {
//             isCancelled: sub.cancel_at_period_end,
//             cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
//           }
//         );
//         break;
//       }

//       case "checkout.session.completed": {
//         const session = event.data.object;
//         const { userId, planIdentifier, creditsPurchased, fromDiscountFlow } = session.metadata || {};

//         if (!userId) break;
//         const user = await User.findById(userId);
//         if (!user) break;

//         if (!user.stripeCustomerId) {
//           user.stripeCustomerId = session.customer;
//           await user.save();
//         }

//         if (creditsPurchased && session.mode === "payment") {
//           const extraCredits = parseInt(creditsPurchased, 10);
//           user.credits += extraCredits;
//           await user.save();
//           break;
//         }

//         if (planIdentifier && session.mode === "subscription" && session.subscription) {
//           const plan = await SubscriptionPlan.findOne({ identifier: planIdentifier });
//           if (!plan) break;

//           const existing = await UserSubscription.findOne({ userId, isActive: true });

//           if (existing && fromDiscountFlow !== "true") {
//             // Free plan credit migration
//             if (
//               existing.planSnapshot.identifier === "free_plan" &&
//               user.isFreePlanExpired === false
//             ) {
//               const remainingCredits = existing.planSnapshot.monthlyCredits - existing.usage.monthlyCreditsUsed;
//               if (remainingCredits > 0) {
//                 user.credits += remainingCredits;
//                 await user.save();
//               }
//             }

//             existing.isActive = false;
//             existing.isCancelled = true;
//             await existing.save();
//           }

//           const planSnapshot = {
//             name: plan.name,
//             identifier: plan.identifier,
//             billingCycle: plan.billingCycle,
//             price: plan.price,
//             dailyLimit: plan.jobLimits.dailyLimit,
//             monthlyCredits: plan.monthlyCredits,
//             resumeProfiles: plan.resumeProfiles,
//             freeTailoredResumes: plan.freeTailoredResumes,
//             freeAutoApplies: plan.freeAutoApplies,
//             includesAutoApply: plan.includesAutoApply,
//             includesResumeBuilder: plan.includesResumeBuilder,
//             includesResumeScore: plan.includesResumeScore,
//             includesAICoverLetters: plan.includesAICoverLetters,
//             includesInterviewBuddy: plan.includesInterviewBuddy,
//             includesTailoredResumes: plan.includesTailoredResumes,
//             descriptionNote: plan.descriptionNote
//           };

//           await UserSubscription.create({
//             userId: user._id,
//             subscriptionPlanId: plan._id,
//             stripeSubscriptionId: session.subscription,
//             stripeCustomerId: session.customer,
//             planSnapshot,
//             usage: {
//               jobApplicationsToday: 0,
//               monthlyCreditsUsed: 0,
//               resumeProfilesUsed: 0,
//               tailoredResumesUsed: 0,
//               autoAppliesUsed: 0,
//               jobDescriptionGenerations: 0,
//               jobSkillsGenerations: 0,
//               jobTitleGenerations: 0,
//               generationsWithoutTailoring: 0,
//             },
//             startDate: new Date(),
//             endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//             isActive: true,
//             isCancelled: false,
//             cancelAt: null
//           });

//           user.isFreePlanExpired = false;
//           await user.save();
//         }

//         break;
//       }

//       default:
//         console.log(`ℹ️ Unhandled event type: ${event.type}`);
//     }

//     res.status(200).json({ received: true });
//   } catch (err) {
//     console.error("❌ Error processing webhook:", err.message);
//     res.status(500).json({ error: err.message });
//   }
// }

// handleWebhook: async (req, res) => {
//   let event;

//   try {
//     const sig = req.headers["stripe-signature"];
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

//     if (!webhookSecret) return res.status(400).send("Webhook secret is missing.");

//     event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
//     console.log("✅ Stripe Event Received:", event.type);
//   } catch (err) {
//     console.error("❌ Webhook signature verification failed:", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   try {
//     switch (event.type) {
//       case "customer.subscription.deleted": {
//         const deletedSub = event.data.object;
//         await UserSubscription.findOneAndUpdate(
//           { stripeSubscriptionId: deletedSub.id },
//           {
//             isActive: false,
//             isCancelled: true,
//             cancelAt: null,
//             endDate: new Date(),
//           }
//         );
//         break;
//       }

//       case "customer.subscription.updated": {
//         const sub = event.data.object;
//         await UserSubscription.findOneAndUpdate(
//           { stripeSubscriptionId: sub.id },
//           {
//             isCancelled: sub.cancel_at_period_end,
//             cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
//           }
//         );
//         break;
//       }

// case "checkout.session.completed": {
//   const session = event.data.object;
//   const { userId, planIdentifier, creditsPurchased, fromDiscountFlow } = session.metadata || {};

//   if (!userId) break;

//   const user = await User.findById(userId);
//   if (!user) break;

//   if (!user.stripeCustomerId) {
//     user.stripeCustomerId = session.customer;
//     await user.save();
//   }

//   // If it's a one-time credit purchase
//   if (creditsPurchased && session.mode === "payment") {
//     const extraCredits = parseInt(creditsPurchased, 10);
//     user.credits += extraCredits;
//     await user.save();
//     break;
//   }

//   // For subscriptions
//   if (planIdentifier && session.mode === "subscription" && session.subscription) {
//     const existingSub = await UserSubscription.findOne({
//       stripeSubscriptionId: session.subscription,
//       userId: user._id,
//     });

//     if (existingSub) {
//       console.log("⚠️ Subscription already exists for this session.subscription ID.");
//       break;
//     }

//     const plan = await SubscriptionPlan.findOne({ identifier: planIdentifier });
//     if (!plan) break;

//     // Cancel any previous subscriptions if not discount flow
//     const activeExisting = await UserSubscription.findOne({ userId, isActive: true });
//     if (activeExisting && fromDiscountFlow !== "true") {
//       if (
//         activeExisting.planSnapshot.identifier === "free_plan" &&
//         user.isFreePlanExpired === false
//       ) {
//         const remainingCredits =
//           activeExisting.planSnapshot.monthlyCredits - activeExisting.usage.monthlyCreditsUsed;
//         if (remainingCredits > 0) {
//           user.credits += remainingCredits;
//           await user.save();
//         }
//       }

//       activeExisting.isActive = false;
//       activeExisting.isCancelled = true;
//       await activeExisting.save();
//     }

//     const planSnapshot = {
//       name: plan.name,
//       identifier: plan.identifier,
//       billingCycle: plan.billingCycle,
//       price: plan.price,
//       dailyLimit: plan.jobLimits.dailyLimit,
//       monthlyCredits: plan.monthlyCredits,
//       resumeProfiles: plan.resumeProfiles,
//       freeTailoredResumes: plan.freeTailoredResumes,
//       freeAutoApplies: plan.freeAutoApplies,
//       includesAutoApply: plan.includesAutoApply,
//       includesResumeBuilder: plan.includesResumeBuilder,
//       includesResumeScore: plan.includesResumeScore,
//       includesAICoverLetters: plan.includesAICoverLetters,
//       includesInterviewBuddy: plan.includesInterviewBuddy,
//       includesTailoredResumes: plan.includesTailoredResumes,
//       descriptionNote: plan.descriptionNote,
//     };

//     await UserSubscription.create({
//       userId: user._id,
//       subscriptionPlanId: plan._id,
//       stripeSubscriptionId: session.subscription,
//       stripeCustomerId: session.customer,
//       planSnapshot,
//       usage: {
//         jobApplicationsToday: 0,
//         monthlyCreditsUsed: 0,
//         resumeProfilesUsed: 0,
//         tailoredResumesUsed: 0,
//         autoAppliesUsed: 0,
//         jobDescriptionGenerations: 0,
//         jobSkillsGenerations: 0,
//         jobTitleGenerations: 0,
//         generationsWithoutTailoring: 0,
//       },
//       startDate: new Date(),
//       endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//       isActive: true,
//       isCancelled: false,
//       cancelAt: null,
//     });

//     user.isFreePlanExpired = false;
//     await user.save();
//   }

//   break;
// }



//       default:
//         console.log(`ℹ️ Unhandled event type: ${event.type}`);
//     }

//     res.status(200).json({ received: true });
//   } catch (err) {
//     console.error("❌ Error processing webhook:", err.message);
//     res.status(500).json({ error: err.message });
//   }
// }

// handleWebhook: async (req, res) => {
//   let event;

//   try {
//     const sig = req.headers["stripe-signature"];
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

//     if (!webhookSecret) return res.status(400).send("Webhook secret is missing.");

//     event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
//     console.log("✅ Stripe Event Received:", event.type);
//   } catch (err) {
//     console.error("❌ Webhook signature verification failed:", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   try {
//     switch (event.type) {
//       // 🟢 Deletion (canceled immediately)
//       case "customer.subscription.deleted": {
//         const deletedSub = event.data.object;
//         await UserSubscription.findOneAndUpdate(
//           { stripeSubscriptionId: deletedSub.id },
//           {
//             isActive: false,
//             isCancelled: true,
//             cancelAt: null,
//             endDate: new Date(),
//           }
//         );
//         break;
//       }

//       // 🟢 Cancel scheduled (or changes to subscription status)
//       case "customer.subscription.updated": {
//         const sub = event.data.object;
//         await UserSubscription.findOneAndUpdate(
//           { stripeSubscriptionId: sub.id },
//           {
//             isCancelled: sub.cancel_at_period_end,
//             cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
//           }
//         );
//         break;
//       }

//       // 🟢 New checkout session completed
//       case "checkout.session.completed": {
//         const session = event.data.object;
//         const {
//           userId,
//           planIdentifier,
//           creditsPurchased,
//           fromDiscountFlow,
//           fromUpgradeFlow,
//         } = session.metadata || {};

//         if (!userId) break;

//         const user = await User.findById(userId);
//         if (!user) break;

//         if (!user.stripeCustomerId) {
//           user.stripeCustomerId = session.customer;
//           await user.save();
//         }

//         // 🟡 One-time credits purchase
//         if (creditsPurchased && session.mode === "payment") {
//           const extraCredits = parseInt(creditsPurchased, 10);
//           user.credits += extraCredits;
//           await user.save();
//           break;
//         }

//         // 🟢 Subscription creation
//         if (planIdentifier && session.mode === "subscription" && session.subscription) {
//           const existingSub = await UserSubscription.findOne({
//             stripeSubscriptionId: session.subscription,
//             userId: user._id,
//           });

//           if (existingSub) {
//             console.log("⚠️ Subscription already exists for this session.subscription ID.");
//             break;
//           }

//           const plan = await SubscriptionPlan.findOne({ identifier: planIdentifier });
//           if (!plan) break;

//           const isFromDiscount = fromDiscountFlow === "true";
//           const isFromUpgrade = fromUpgradeFlow === "true";

//           // Deactivate old subscription (if not discount flow)
//           const activeExisting = await UserSubscription.findOne({ userId, isActive: true });
//           if (activeExisting && !isFromDiscount) {
//             if (
//               activeExisting.planSnapshot.identifier === "free_plan" &&
//               user.isFreePlanExpired === false
//             ) {
//               const remainingCredits =
//                 activeExisting.planSnapshot.monthlyCredits - activeExisting.usage.monthlyCreditsUsed;
//               if (remainingCredits > 0) {
//                 user.credits += remainingCredits;
//                 await user.save();
//               }
//             }

//             activeExisting.isActive = false;
//             activeExisting.isCancelled = true;
//             await activeExisting.save();
//           }

//           const planSnapshot = {
//             name: plan.name,
//             identifier: plan.identifier,
//             billingCycle: plan.billingCycle,
//             price: plan.price,
//             dailyLimit: plan.jobLimits.dailyLimit,
//             monthlyCredits: plan.monthlyCredits,
//             resumeProfiles: plan.resumeProfiles,
//             freeTailoredResumes: plan.freeTailoredResumes,
//             freeAutoApplies: plan.freeAutoApplies,
//             includesAutoApply: plan.includesAutoApply,
//             includesResumeBuilder: plan.includesResumeBuilder,
//             includesResumeScore: plan.includesResumeScore,
//             includesAICoverLetters: plan.includesAICoverLetters,
//             includesInterviewBuddy: plan.includesInterviewBuddy,
//             includesTailoredResumes: plan.includesTailoredResumes,
//             descriptionNote: plan.descriptionNote,
//           };

//           await UserSubscription.create({
//             userId: user._id,
//             subscriptionPlanId: plan._id,
//             stripeSubscriptionId: session.subscription,
//             stripeCustomerId: session.customer,
//             planSnapshot,
//             usage: {
//               jobApplicationsToday: 0,
//               monthlyCreditsUsed: 0,
//               resumeProfilesUsed: 0,
//               tailoredResumesUsed: 0,
//               autoAppliesUsed: 0,
//               jobDescriptionGenerations: 0,
//               jobSkillsGenerations: 0,
//               jobTitleGenerations: 0,
//               generationsWithoutTailoring: 0,
//             },
//             startDate: new Date(),
//             endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//             isActive: true,
//             isCancelled: false,
//             cancelAt: null,
//           });

//           if (isFromDiscount) {
//             await SubscriptionCancellation.create({
//               userId,
//               subscriptionId: session.subscription,
//               cancelReason: [],
//               cancelReasonText: "30% discount flow completed",
//               type: "cancel",
//               appliedDiscount: true,
//             });
//           }

//           if (isFromUpgrade) {
//             await SubscriptionCancellation.create({
//               userId,
//               subscriptionId: session.subscription,
//               cancelReason: [],
//               cancelReasonText: "User upgraded/downgraded plan",
//               type: "upgrade",
//               appliedDiscount: false,
//             });
//           }

//           user.isFreePlanExpired = false;
//           await user.save();
//         }

//         break;
//       }

//       default:
//         console.log(`ℹ️ Unhandled event type: ${event.type}`);
//     }

//     res.status(200).json({ received: true });
//   } catch (err) {
//     console.error("❌ Error processing webhook:", err.message);
//     res.status(500).json({ error: err.message });
//   }
// }


// handleWebhook: async (req, res) => {
//   let event;

//   try {
//     const sig = req.headers["stripe-signature"];
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

//     if (!webhookSecret) return res.status(400).send("Webhook secret is missing.");

//     event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
//     console.log("✅ Stripe Event Received:", event.type);
//   } catch (err) {
//     console.error("❌ Webhook signature verification failed:", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   try {
//     switch (event.type) {
//       case "customer.subscription.deleted": {
//         const deletedSub = event.data.object;

//         await UserSubscription.findOneAndUpdate(
//           { stripeSubscriptionId: deletedSub.id },
//           {
//             isActive: false,
//             isCancelled: true,
//             cancelAt: null,
//             endDate: new Date(),
//           }
//         );

//         break;
//       }

//       case "customer.subscription.updated": {
//         const sub = event.data.object;

//         await UserSubscription.findOneAndUpdate(
//           { stripeSubscriptionId: sub.id },
//           {
//             isCancelled: sub.cancel_at_period_end,
//             cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
//           }
//         );

//         break;
//       }

//       case "checkout.session.completed": {
//         const session = event.data.object;
//         const { userId, planIdentifier, creditsPurchased, fromDiscountFlow, fromUpgradeFlow } =
//           session.metadata || {};

//         if (!userId) break;

//         const user = await User.findById(userId);
//         if (!user) break;

//         // Store Stripe customerId if not already set
//         if (!user.stripeCustomerId) {
//           user.stripeCustomerId = session.customer;
//           await user.save();
//         }

//         // One-time credits purchase
//         if (creditsPurchased && session.mode === "payment") {
//           user.credits += parseInt(creditsPurchased, 10);
//           await user.save();
//           break;
//         }

//         // Subscription flow
//         if (planIdentifier && session.mode === "subscription" && session.subscription) {
//           const existingSub = await UserSubscription.findOne({
//             stripeSubscriptionId: session.subscription,
//             userId: user._id,
//           });

//           if (existingSub) {
//             console.log("⚠️ Subscription already exists for this session.subscription ID.");
//             break;
//           }

//           const plan = await SubscriptionPlan.findOne({ identifier: planIdentifier });
//           if (!plan) break;

//           const planSnapshot = {
//             name: plan.name,
//             identifier: plan.identifier,
//             billingCycle: plan.billingCycle,
//             price: plan.price,
//             dailyLimit: plan.jobLimits.dailyLimit,
//             monthlyCredits: plan.monthlyCredits,
//             resumeProfiles: plan.resumeProfiles,
//             freeTailoredResumes: plan.freeTailoredResumes,
//             freeAutoApplies: plan.freeAutoApplies,
//             includesAutoApply: plan.includesAutoApply,
//             includesResumeBuilder: plan.includesResumeBuilder,
//             includesResumeScore: plan.includesResumeScore,
//             includesAICoverLetters: plan.includesAICoverLetters,
//             includesInterviewBuddy: plan.includesInterviewBuddy,
//             includesTailoredResumes: plan.includesTailoredResumes,
//             descriptionNote: plan.descriptionNote,
//           };

//           // Save new subscription
//           const newSub = await UserSubscription.create({
//             userId: user._id,
//             subscriptionPlanId: plan._id,
//             stripeSubscriptionId: session.subscription,
//             stripeCustomerId: session.customer,
//             planSnapshot,
//             usage: {
//               jobApplicationsToday: 0,
//               monthlyCreditsUsed: 0,
//               resumeProfilesUsed: 0,
//               tailoredResumesUsed: 0,
//               autoAppliesUsed: 0,
//               jobDescriptionGenerations: 0,
//               jobSkillsGenerations: 0,
//               jobTitleGenerations: 0,
//               generationsWithoutTailoring: 0,
//             },
//             startDate: new Date(),
//             endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//             isActive: true,
//             isCancelled: false,
//             cancelAt: null,
//           });

//           // Optional logs for plan flow
//           if (fromDiscountFlow === "true") {
//             await SubscriptionCancellation.create({
//               userId,
//               subscriptionId: newSub._id,
//               cancelReason: [],
//               cancelReasonText: "30% discount flow completed",
//               type: "cancel",
//               appliedDiscount: true,
//             });
//           }

//           if (fromUpgradeFlow === "true") {
//             await SubscriptionCancellation.create({
//               userId,
//               subscriptionId: newSub._id,
//               cancelReason: [],
//               cancelReasonText: "Plan upgraded or downgraded",
//               type: "upgrade",
//               appliedDiscount: false,
//             });
//           }

//           // Mark free plan expired if user was on free
//           const activeExisting = await UserSubscription.findOne({
//             userId,
//             isActive: true,
//             isCancelled: true, // ← this ensures you don’t deactivate active plans prematurely
//             stripeSubscriptionId: { $ne: session.subscription },
//           });

//           if (
//             activeExisting &&
//             activeExisting.planSnapshot.identifier === "free_plan" &&
//             user.isFreePlanExpired === false
//           ) {
//             const remainingCredits =
//               activeExisting.planSnapshot.monthlyCredits - activeExisting.usage.monthlyCreditsUsed;

//             if (remainingCredits > 0) {
//               user.credits += remainingCredits;
//               await user.save();
//             }

//             user.isFreePlanExpired = true;
//             await user.save();
//           }
//         }

//         break;
//       }

//       default:
//         console.log(`ℹ️ Unhandled event type: ${event.type}`);
//     }

//     return res.status(200).json({ received: true });
//   } catch (err) {
//     console.error("❌ Error processing webhook:", err.message);
//     return res.status(500).json({ error: err.message });
//   }
// }


handleWebhook: async (req, res) => {
  let event;

  try {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) return res.status(400).send("Webhook secret is missing.");

    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log("✅ Stripe Event Received:", event.type);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "customer.subscription.deleted": {
        const deletedSub = event.data.object;

        await UserSubscription.findOneAndUpdate(
          { stripeSubscriptionId: deletedSub.id },
          {
            isActive: false,
            isCancelled: true,
            cancelAt: null,
            endDate: new Date(),
          }
        );
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;

        await UserSubscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          {
            isCancelled: sub.cancel_at_period_end,
            cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
          }
        );
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object;
        const {
          userId,
          planIdentifier,
          creditsPurchased,
          fromDiscountFlow,
          fromUpgradeFlow,
        } = session.metadata || {};

        if (!userId) break;

        const user = await User.findById(userId);
        if (!user) break;

        if (!user.stripeCustomerId) {
          user.stripeCustomerId = session.customer;
          await user.save();
        }

        // 🟨 One-time credit purchase
        if (creditsPurchased && session.mode === "payment") {
          const extraCredits = parseInt(creditsPurchased, 10);
          user.credits += extraCredits;
          await user.save();
          break;
        }

        // 🟦 New subscription purchase
        if (planIdentifier && session.mode === "subscription" && session.subscription) {
          const alreadyExists = await UserSubscription.findOne({
            stripeSubscriptionId: session.subscription,
            userId: user._id,
          });

          if (alreadyExists) {
            console.log("⚠️ Subscription already exists for this session.subscription ID.");
            break;
          }

          const plan = await SubscriptionPlan.findOne({ identifier: planIdentifier });
          if (!plan) break;

          const planSnapshot = {
            name: plan.name,
            identifier: plan.identifier,
            billingCycle: plan.billingCycle,
            price: plan.price,
            dailyLimit: plan.jobLimits.dailyLimit,
            monthlyCredits: plan.monthlyCredits,
            resumeProfiles: plan.resumeProfiles,
            freeTailoredResumes: plan.freeTailoredResumes,
            freeAutoApplies: plan.freeAutoApplies,
            includesAutoApply: plan.includesAutoApply,
            includesResumeBuilder: plan.includesResumeBuilder,
            includesResumeScore: plan.includesResumeScore,
            includesAICoverLetters: plan.includesAICoverLetters,
            includesInterviewBuddy: plan.includesInterviewBuddy,
            includesTailoredResumes: plan.includesTailoredResumes,
            descriptionNote: plan.descriptionNote,
          };

          const newSub = await UserSubscription.create({
            userId: user._id,
            subscriptionPlanId: plan._id,
            stripeSubscriptionId: session.subscription,
            stripeCustomerId: session.customer,
            planSnapshot,
            usage: {
              jobApplicationsToday: 0,
              monthlyCreditsUsed: 0,
              resumeProfilesUsed: 0,
              tailoredResumesUsed: 0,
              autoAppliesUsed: 0,
              jobDescriptionGenerations: 0,
              jobSkillsGenerations: 0,
              jobTitleGenerations: 0,
              generationsWithoutTailoring: 0,
            },
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isActive: true,
            isCancelled: false,
            cancelAt: null,
          });

          // 🟥 If free plan was active → deactivate immediately
          const freeSub = await UserSubscription.findOne({
            userId,
            isActive: true,
            isCancelled: false,
            "planSnapshot.identifier": "free_plan",
          });

          if (freeSub) {
            const remainingCredits =
              freeSub.planSnapshot.monthlyCredits - freeSub.usage.monthlyCreditsUsed;

            if (remainingCredits > 0) {
              user.credits += remainingCredits;
            }

            freeSub.isActive = false;
            freeSub.isCancelled = true;
            freeSub.cancelAt = new Date();
            await freeSub.save();

            user.isFreePlanExpired = false;
            await user.save();
          }

          // 🟧 Create SubscriptionCancellation for analytics/log
          if (fromDiscountFlow === "true") {
            await SubscriptionCancellation.create({
              userId,
              subscriptionId: newSub._id,
              cancelReason: [],
              cancelReasonText: "30% discount flow completed",
              type: "cancel",
              appliedDiscount: true,
            });
          }

          if (fromUpgradeFlow === "true") {
            await SubscriptionCancellation.create({
              userId,
              subscriptionId: newSub._id,
              cancelReason: [],
              cancelReasonText: "Plan upgraded or downgraded",
              type: "upgrade",
              appliedDiscount: false,
            });
          }
        }

        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Error processing webhook:", err.message);
    res.status(500).json({ error: err.message });
  }
}










};

module.exports = methods;
