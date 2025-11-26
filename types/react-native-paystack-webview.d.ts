declare module "react-native-paystack-webview" {
  import { ComponentType } from "react";
  interface PaystackProps {
    paystackKey: string;
    amount: number;
    billingEmail: string;
    billingName?: string;
    channels?: string[];
    onCancel?: () => void;
    onSuccess?: (res: any) => void;
    autoStart?: boolean;
    refNumber?: string;
    metadata?: any;
  }
  const PaystackWebView: ComponentType<PaystackProps>;
  export default PaystackWebView;
}
