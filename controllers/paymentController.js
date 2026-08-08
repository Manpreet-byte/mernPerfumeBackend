import crypto from 'crypto';
import Razorpay from 'razorpay';

const getRazorpayConfig = () => ({
	keyId: process.env.RAZORPAY_KEY_ID,
	keySecret: process.env.RAZORPAY_KEY_SECRET,
});

const getInstance = () => {
	const { keyId, keySecret } = getRazorpayConfig();
	if (!keyId || !keySecret) return null;
	return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

export const createRazorpayOrder = async (req, res) => {
	try {
		const razorpay = getInstance();
		if (!razorpay) {
			return res.status(500).json({ message: 'Razorpay is not configured.' });
		}

		const amount = Math.max(1, Number(req.body.amount) || 0);
		const receipt = req.body.receipt || `order_${Date.now()}`;

		const order = await razorpay.orders.create({
			amount: Math.round(amount * 100),
			currency: 'INR',
			receipt,
			payment_capture: 1,
		});

		res.status(201).json({
			orderId: order.id,
			amount: order.amount,
			currency: order.currency,
		});
	} catch (error) {
		res.status(500).json({ message: error.message || 'Unable to create Razorpay order.' });
	}
};

export const verifyRazorpayPayment = async (req, res) => {
	try {
		const { orderId, paymentId, signature } = req.body;
		const { keySecret } = getRazorpayConfig();

		if (!orderId || !paymentId || !signature || !keySecret) {
			return res.status(400).json({ message: 'Missing payment verification data.' });
		}

		const expectedSignature = crypto
			.createHmac('sha256', keySecret)
			.update(`${orderId}|${paymentId}`)
			.digest('hex');

		if (expectedSignature !== signature) {
			return res.status(400).json({ message: 'Invalid Razorpay signature.' });
		}

		res.json({ verified: true });
	} catch (error) {
		res.status(500).json({ message: error.message || 'Unable to verify payment.' });
	}
};