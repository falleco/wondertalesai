// import { createCheckoutSession } from "@/actions/payments";

// import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";

// const _stripePromise = loadStripe(
//   process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
// );

export async function handlePurchase(priceId: string) {
  toast.success(`Purchase successful for priceId: ${priceId}`);
  return;
  // const { sessionId, error } = await createCheckoutSession(priceId);
  // if (error || !sessionId) {
  //   toast.error(error);
  //   return;
  // }
  // const stripe = await stripePromise;
  // const result = await stripe?.redirectToCheckout({ sessionId });
  // if (result?.error) {
  //   toast.error(result.error.message);
  // }
}
