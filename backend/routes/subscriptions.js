import express from 'express';
import Stripe from 'stripe';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Initialize Stripe (use test key for now, should be in env vars)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
  apiVersion: '2023-10-16'
});

// Plan pricing mapping
const PLAN_PRICES = {
  starter: {
    monthly: 'price_1234starter', // Replace with actual Stripe price IDs
    amount: 999,
    currency: 'php'
  },
  professional: {
    monthly: 'price_1234professional',
    amount: 1999,
    currency: 'php'
  },
  enterprise: {
    monthly: 'price_1234enterprise',
    amount: 3999,
    currency: 'php'
  }
};

// Create checkout session for subscription upgrade
router.post('/create-checkout-session', protect, async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const user = req.user;

    // Validate plan
    if (!PLAN_PRICES[planId]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }

    // Create or get Stripe customer
    let customerId = user.customerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString(),
          businessName: user.businessName
        }
      });
      customerId = customer.id;
      
      // Update user with customer ID
      await User.findByIdAndUpdate(user._id, {
        customerId: customerId
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PLAN_PRICES[planId].monthly,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.origin}/pricing`,
      metadata: {
        userId: user._id.toString(),
        planId: planId,
        businessName: user.businessName
      },
      subscription_data: {
        metadata: {
          userId: user._id.toString(),
          planId: planId
        }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto'
      }
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: error.message
    });
  }
});

// Create customer portal session for subscription management
router.post('/create-portal-session', protect, async (req, res) => {
  try {
    const user = req.user;
    const { returnUrl } = req.body;

    if (!user.customerId) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.customerId,
      return_url: returnUrl || `${req.headers.origin}/settings`,
    });

    res.json({
      success: true,
      url: session.url
    });

  } catch (error) {
    console.error('Portal session creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create portal session',
      error: error.message
    });
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Get current subscription details
router.get('/current', protect, async (req, res) => {
  try {
    const user = req.user;

    if (!user.subscriptionId) {
      return res.json({
        success: true,
        subscription: null,
        status: 'no_subscription'
      });
    }

    const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        plan: user.subscriptionPlan,
        cancel_at_period_end: subscription.cancel_at_period_end
      }
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription details'
    });
  }
});

// Helper functions for webhook handlers
async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;
  const planId = session.metadata.planId;

  if (session.mode === 'subscription') {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    
    await User.findByIdAndUpdate(userId, {
      subscriptionId: subscription.id,
      customerId: session.customer,
      subscriptionPlan: planId,
      subscriptionStatus: 'active',
      subscriptionEndsAt: new Date(subscription.current_period_end * 1000)
    });

    console.log(`Subscription activated for user ${userId}, plan: ${planId}`);
  }
}

async function handleSubscriptionUpdated(subscription) {
  const userId = subscription.metadata.userId;

  await User.findByIdAndUpdate(userId, {
    subscriptionStatus: subscription.status,
    subscriptionEndsAt: new Date(subscription.current_period_end * 1000)
  });

  console.log(`Subscription updated for user ${userId}, status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription) {
  const userId = subscription.metadata.userId;

  await User.findByIdAndUpdate(userId, {
    subscriptionStatus: 'cancelled',
    subscriptionId: null
  });

  console.log(`Subscription cancelled for user ${userId}`);
}

async function handlePaymentSucceeded(invoice) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.userId;

    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'active',
      subscriptionEndsAt: new Date(subscription.current_period_end * 1000)
    });

    console.log(`Payment succeeded for user ${userId}`);
  }
}

async function handlePaymentFailed(invoice) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.userId;

    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'past_due'
    });

    console.log(`Payment failed for user ${userId}`);
  }
}

export default router;