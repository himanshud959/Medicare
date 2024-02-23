import User from "../models/UserSchema.js";
import Doctor from "../models/DoctorSchema.js";
import Booking from "../models/BookingSchema.js";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

export const getCheckoutSession = async (req, res) => {
  try {
    // Get the currently booked doctor
    const doctor = await Doctor.findById(req.params.doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    }

    // Get the current user
    const user = await User.findById(req.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Create a new Stripe instance with your API key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const suuccess_url = `${process.env.CLIENT_SITE_URL}/checkout-success`;
    console.log(suuccess_url);

    const ccancel_url = `${req.protocol}://${req.get("host")}/doctor/${
      doctor.id
    }`;
    console.log(ccancel_url);

    // Create stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${process.env.CLIENT_SITE_URL}/checkout-success`,
      cancel_url: `${req.protocol}://${req.get("host")}/doctor/${doctor.id}`,
      customer_email: user?.email,
      client_reference_id: req.params.doctorId,
      billing_address_collection: "required",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: doctor.ticketPrice * 100,
            product_data: {
              name: doctor.name,
              description: doctor.bio,
              images: [doctor?.photo],
            },
          },
          quantity: 1,
        },
      ],
    });

    // Create a new booking
    const booking = new Booking({
      doctor: doctor._id,
      user: user._id,
      ticketPrice: doctor.ticketPrice,
      session: session.id,
    });

    // Save the booking to the database
    await booking.save();

    // Return success response with the checkout session
    res
      .status(200)
      .json({ success: true, message: "Successfully paid", session });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res
      .status(500)
      .json({ success: false, message: "Error creating checkout session" });
  }
};
