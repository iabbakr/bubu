// services/emailService.ts
import { Resend } from 'resend';

const resend = new Resend("re_123"); 

// export const resend = new Resend(process.env.RESEND_API_KEY);

export const emailService = {
  async sendOrderConfirmation(
    buyerEmail: string,
    buyerName: string,
    orderId: string,
    totalAmount: number,
    products: any[]
  ) {
    try {
      await resend.emails.send({
        from: 'Bubu <orders@yourdomain.com>',
        to: buyerEmail,
        subject: `Order Confirmed - #${orderId.slice(-6)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007AFF;">Order Confirmed!</h2>
            <p>Hi ${buyerName},</p>
            <p>Thank you for your order. Your order has been confirmed and is being processed.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> #${orderId.slice(-6)}</p>
              <p><strong>Total Amount:</strong> ₦${totalAmount.toFixed(2)}</p>
              <p><strong>Status:</strong> Processing</p>
              
              <h4>Items:</h4>
              <ul>
                ${products.map(p => `<li>${p.quantity}x ${p.productName} - ₦${p.price.toFixed(2)}</li>`).join('')}
              </ul>
            </div>
            
            <p>You will receive another email when your order is delivered.</p>
            <p>If you have any questions, please contact our support team.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">
                This is an automated email from Bubu. Please do not reply to this email.
              </p>
            </div>
          </div>
        `
      });
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
    }
  },

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
              <p><strong>Status:</strong> ✅ Delivered</p>
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
              <p><strong>Status:</strong> ❌ Cancelled</p>
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

  // Notify user when a dispute is resolved
  async sendDisputeResolved(
    buyerEmail: string,
    sellerEmail: string,
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
        subject: `🚨 Dispute Opened - Order #${orderId.slice(-6)}`,
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
        subject: `🚨 New Dispute - Order #${orderId.slice(-6)}`,
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
