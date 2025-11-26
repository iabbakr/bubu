// services/emailService.ts
import { Resend } from 'resend';

// Use your real key in production
const resend = new Resend(process.env.EXPO_RESEND_API_KEY || "re_123");

export const emailService = {
  // ─────────────────────────────────────────────────────
  // 1. Order Confirmation (Buyer) - Your Original + Upgraded Style
  // ─────────────────────────────────────────────────────
  async sendOrderConfirmation(
    buyerEmail: string,
    buyerName: string,
    orderId: string,
    totalAmount: number,
    products: { quantity: number; productName: string; price: number }[]
  ) {
    const shortId = orderId.slice(-6);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 30px; }
          .order-box { background: #f8f9ff; padding: 20px; border-radius: 10px; border-left: 5px solid #667eea; margin: 20px 0; }
          .items { background: white; padding: 15px; border-radius: 8px; margin-top: 15px; }
          .item { padding: 8px 0; border-bottom: 1px solid #eee; }
          .item:last-child { border-bottom: none; }
          .total { font-size: 24px; font-weight: bold; color: #667eea; margin-top: 20px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; padding: 30px; background: #f9f9f9; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Thank you for shopping with Bubu</p>
          </div>
          <div class="content">
            <p>Hi <strong>${buyerName}</strong>,</p>
            <p>Your order has been confirmed and is being prepared by the seller.</p>
            
            <div class="order-box">
              <h3>Order #${shortId}</h3>
              <p><strong>Total:</strong> <span class="total">₦${totalAmount.toLocaleString()}</span></p>
              
              <div class="items">
                ${products.map(p => `
                  <div class="item">
                    <strong>${p.quantity} × ${p.productName}</strong><br>
                    <span style="color: #666;">₦${p.price.toFixed(2)} each</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <p>We’ll notify you when your order is on its way!</p>
            <a href="https://yourapp.com/orders/${orderId}" class="button">Track Your Order</a>
          </div>
          <div class="footer">
            <p>This is an automated message from <strong>Bubu</strong></p>
            <p>Need help? Contact support@bubu.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await resend.emails.send({
        from: "Bubu <orders@yourdomain.com>",
        to: buyerEmail,
        subject: `Order Confirmed • #${shortId}`,
        html: htmlContent,
      });
    } catch (error) {
      console.error("Failed to send order confirmation:", error);
    }
  },

  // ─────────────────────────────────────────────────────
  // 2. Order Tracking Update (NEW - Beautiful!)
  // ─────────────────────────────────────────────────────
  async sendOrderTrackingUpdate(
    toEmail: string,
    buyerName: string,
    orderId: string,
    status: string,
    message: string
  ) {
    const statusDisplay = {
      acknowledged: "Processing",
      enroute: "In Transit",
      ready_for_pickup: "Ready for Pickup",
      delivered: "Delivered",
    }[status] || "Update";

    const shortId = orderId.slice(-6);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px 0; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 30px; }
          .status-box { background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%); padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #667eea30; }
          .status { font-size: 28px; font-weight: bold; color: #667eea; margin: 10px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { text-align: center; padding: 30px; background: #f9f9f9; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusDisplay} Order Update</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${buyerName}</strong>,</p>
            <p>Great news! Your order has a new status:</p>
            
            <div class="status-box">
              <div class="status">${status.replace(/_/g, " ").toUpperCase()}</div>
              <p><strong>Order ID:</strong> #${shortId}</p>
              <p style="margin: 15px 0; font-size: 16px;">${message}</p>
            </div>
            
            <p>You can track your order in real-time from the app.</p>
            <a href="https://yourapp.com/orders/${orderId}" class="button">View Order Details</a>
          </div>
          <div class="footer">
            <p>Bubu • Fast. Reliable. Trusted.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await resend.emails.send({
        from: "Bubu <orders@yourdomain.com>",
        to: toEmail,
        subject: `${statusDisplay} Order Update • #${shortId}`,
        html: htmlContent,
      });
    } catch (error) {
      console.error("Failed to send tracking update email:", error);
    }
  },

  // ─────────────────────────────────────────────────────
  // 3. Ready for Pickup / Delivery Confirmation (NEW!)
  // ─────────────────────────────────────────────────────
  async sendReadyForPickupNotification(
    toEmail: string,
    buyerName: string,
    orderId: string,
    deliveryAddress: string
  ) {
    const shortId = orderId.slice(-6);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px 0; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 30px; }
          .alert { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .address { background: #f8f9fa; padding: 18px; border-radius: 10px; border-left: 5px solid #28a745; margin: 20px 0; }
          .steps { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .button { display: inline-block; background: #28a745; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
          .footer { text-align: center; padding: 30px; background: #f9f9f9; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Order Has Arrived!</h1>
            <p>Time to confirm delivery</p>
          </div>
          <div class="content">
            <p>Hi <strong>${buyerName}</strong>,</p>
            
            <div class="alert">
              <h2>Your order is ready and waiting!</h2>
              <p><strong>Order ID:</strong> #${shortId}</p>
            </div>
            
            <div class="address">
              <strong>Delivery Address:</strong><br>
              ${deliveryAddress.replace(/\n/g, "<br>")}
            </div>
            
            <div class="steps">
              <p><strong>Next Steps:</strong></p>
              <ol style="padding-left: 20px;">
                <li>Receive your package from the delivery agent</li>
                <li>Check all items carefully</li>
                <li>Confirm delivery in the app to release payment</li>
              </ol>
              <p style="color: #d32f2f; font-weight: bold; margin-top: 15px;">
                Important: Do not confirm if items are damaged or missing.
              </p>
            </div>
            
            <div style="text-align: center;">
              <a href="https://yourapp.com/orders/${orderId}" class="button">Confirm Delivery Now</a>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for shopping with Bubu</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await resend.emails.send({
        from: "Bubu <orders@yourdomain.com>",
        to: toEmail,
        subject: `Your Order is Ready • #${shortId}`,
        html: htmlContent,
      });
    } catch (error) {
      console.error("Failed to send ready for pickup email:", error);
    }
  },

  // ─────────────────────────────────────────────────────
// 4. Buyer Welcome Email
// ─────────────────────────────────────────────────────
async sendBuyerWelcomeEmail(toEmail: string, fullName: string) {
  const firstName = fullName.split(" ")[0];

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 30px; text-align: center; color: white; }
        .content { padding: 30px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #fafafa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Bubu, ${firstName}! 🎉</h1>
          <p>Shop fast. Shop safe.</p>
        </div>
        <div class="content">
          <p>Hi <strong>${firstName}</strong>,</p>
          <p>Congratulations! Your Bubu account is ready.</p>
          <p>Enjoy thousands of products from trusted sellers, real-time order tracking, and secure wallet payments.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://yourapp.com" class="button">Start Shopping Now</a>
          </div>
        </div>
        <div class="footer">
          <p>Bubu • Fast. Reliable. Trusted.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: "Bubu <welcome@yourdomain.com>",
      to: toEmail,
      subject: `Welcome to Bubu, ${firstName}! 🛍️`,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Failed to send buyer welcome email:", error);
  }
},

// ─────────────────────────────────────────────────────
// 5. Seller Welcome Email
// ─────────────────────────────────────────────────────
async sendSellerWelcomeEmail(toEmail: string, fullName: string) {
  const firstName = fullName.split(" ")[0];

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); padding: 50px 30px; text-align: center; color: white; }
        .content { padding: 30px; }
        .button { display: inline-block; background: #f97316; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #fafafa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Congratulations, ${firstName}! 🚀</h1>
          <p>Your Seller Account is Live!</p>
        </div>
        <div class="content">
          <p>Hi <strong>${firstName}</strong>,</p>
          <p>Welcome to the Bubu seller community!</p>
          <p>You can now:</p>
          <ul>
            <li>📦 List unlimited products</li>
            <li>💰 Receive payments directly to your wallet</li>
            <li>📊 Track sales & earnings in real-time</li>
            <li>🛡️ Enjoy buyer protection & dispute handling</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://yourapp.com/seller/dashboard" class="button">Go to Seller Dashboard</a>
          </div>
        </div>
        <div class="footer">
          <p>Bubu • Sell with confidence</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: "Bubu Sellers <welcome@yourdomain.com>",
      to: toEmail,
      subject: `Your Bubu Seller Account is Ready, ${firstName}! 💼`,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Failed to send seller welcome email:", error);
  }
},


  // ─────────────────────────────────────────────────────
  // Your Original Methods (Unchanged & Working)
  // ─────────────────────────────────────────────────────
  async sendOrderDelivered(
    buyerEmail: string,
    buyerName: string,
    orderId: string,
    totalAmount: number
  ) {
    try {
      await resend.emails.send({
        from: 'Bubu <orders@yourdomain.com>',
        to: buyerEmail,
        subject: `Order Delivered - #${orderId.slice(-6)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Order Delivered!</h2>
            <p>Hi ${buyerName},</p>
            <p>Great news! Your order has been marked as delivered.</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> #${orderId.slice(-6)}</p>
              <p><strong>Total Amount:</strong> ₦${totalAmount.toFixed(2)}</p>
              <p><strong>Status:</strong> Delivered</p>
            </div>
            
            <p><strong>Please confirm receipt:</strong> If you have received your items in good condition, please confirm in the app.</p>
            <p>If you haven't received your order or there's an issue, please open a dispute immediately.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">
                This is an automated email from Bubu.
              </p>
            </div>
          </div>
        `
      });
    } catch (error) {
      console.error('Error sending delivery email:', error);
    }
  },

  async sendOrderCancelled(
    buyerEmail: string,
    buyerName: string,
    orderId: string,
    totalAmount: number,
    reason: string
  ) {
    try {
      await resend.emails.send({
        from: 'Bubu <orders@yourdomain.com>',
        to: buyerEmail,
        subject: `Order Cancelled - #${orderId.slice(-6)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Order Cancelled</h2>
            <p>Hi ${buyerName},</p>
            <p>We regret to inform you that your order has been cancelled.</p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> #${orderId.slice(-6)}</p>
              <p><strong>Amount:</strong> ₦${totalAmount.toFixed(2)}</p>
              <p><strong>Status:</strong> Cancelled</p>
              <p><strong>Reason:</strong> ${reason}</p>
            </div>
            
            <p><strong>Refund:</strong> Your payment of ₦${totalAmount.toFixed(2)} has been refunded to your wallet.</p>
            <p>If you have any concerns, please contact our support team or open a dispute.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">
                This is an automated email from Bubu.
              </p>
            </div>
          </div>
        `
      });
    } catch (error) {
      console.error('Error sending cancellation email:', error);
    }
  },

  async sendDisputeResolved(
    buyerEmail: string,
    buyerName: string,
    sellerEmail: string,
    SellerName: string,
    orderId: string,
    resolution: "refund_buyer" | "release_to_seller",
    adminNotes: string
  ) {
    try {
      const buyerMessage =
        resolution === "refund_buyer"
          ? `The admin has resolved the dispute in your favor. ${adminNotes}`
          : `The admin has resolved the dispute and released the payment to the seller. ${adminNotes}`;

      const sellerMessage =
        resolution === "refund_buyer"
          ? `The admin has resolved the dispute and refunded the buyer. ${adminNotes}`
          : `The admin has resolved the dispute in your favor. ${adminNotes}`;

      await resend.emails.send({
        from: 'Bubu <disputes@yourdomain.com>',
        to: buyerEmail,
        subject: `Dispute Resolved - Order #${orderId.slice(-6)}`,
        html: `<p>${buyerMessage}</p>`
      });

      await resend.emails.send({
        from: 'Bubu <disputes@yourdomain.com>',
        to: sellerEmail,
        subject: `Dispute Resolved - Order #${orderId.slice(-6)}`,
        html: `<p>${sellerMessage}</p>`
      });
    } catch (error) {
      console.error('Error sending dispute resolved email:', error);
    }
  },

  async sendDisputeNotification(
    email: string,
    name: string,
    orderId: string
  ) {
    try {
      await resend.emails.send({
        from: 'Bubu <disputes@yourdomain.com>',
        to: email,
        subject: `Dispute Opened - Order #${orderId.slice(-6)}`,
        html: `<p>Hi ${name}, a dispute has been opened for order #${orderId.slice(-6)}. Please check your dashboard for details.</p>`
      });
    } catch (error) {
      console.error('Error sending dispute notification email:', error);
    }
  },

  async sendDisputeOpened(
    adminEmail: string,
    orderId: string,
    disputeDetails: string,
    buyerName: string
  ) {
    try {
      await resend.emails.send({
        from: 'Bubu <disputes@yourdomain.com>',
        to: adminEmail,
        subject: `New Dispute - Order #${orderId.slice(-6)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">New Dispute Opened</h2>
            <p>A dispute has been opened for order #${orderId.slice(-6)}</p>
            
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Dispute Details</h3>
              <p><strong>Order ID:</strong> #${orderId.slice(-6)}</p>
              <p><strong>Buyer:</strong> ${buyerName}</p>
              <p><strong>Details:</strong> ${disputeDetails}</p>
            </div>
            
            <p><strong>Action Required:</strong> Please review this dispute and take appropriate action.</p>
            
            <a href="https://yourdomain.com/admin/disputes/${orderId}" 
               style="display: inline-block; background: #007AFF; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; margin-top: 20px;">
              Review Dispute
            </a>
          </div>
        `
      });
    } catch (error) {
      console.error('Error sending dispute email:', error);
    }
  },

  async sendSellerNotification(
    sellerEmail: string,
    sellerName: string,
    orderId: string,
    totalAmount: number,
    notification: 'new_order' | 'cancelled_by_buyer' | 'delivered' | 'cancelled_by_seller'
  ) {
    const subjects = {
      new_order: `New Order Received - #${orderId.slice(-6)}`,
      cancelled_by_buyer: `Order Cancelled - #${orderId.slice(-6)}`,
      delivered: `Order Confirmed as Delivered - #${orderId.slice(-6)}`
    };

    const messages = {
      new_order: `You have received a new order! Amount: ₦${totalAmount.toFixed(2)}`,
      cancelled_by_buyer: `An order has been cancelled by the buyer.`,
      delivered: `The buyer has confirmed receipt of order #${orderId.slice(-6)}.`
    };

    try {
      await resend.emails.send({
        from: 'Bubu <orders@yourdomain.com>',
        to: sellerEmail,
        subject: subjects[notification],
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Order Update</h2>
            <p>Hi ${sellerName},</p>
            <p>${messages[notification]}</p>
            <p><strong>Order ID:</strong> #${orderId.slice(-6)}</p>
            <p>Please log in to your seller dashboard for more details.</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Error sending seller notification:', error);
    }
  }
};