'use server';

// import { sendWhatsAppMessage, type PhoneNumber } from '@/services/whatsapp'; // Keep if needed elsewhere
import { sendWhatsAppMessage } from '@/services/whatsapp'; // Simplified import
import { revalidatePath } from 'next/cache';

interface ActionResult {
  success: boolean;
  message: string;
}

// Updated to accept a simple string or undefined
export async function sendReminderAction(phoneNumber: string | undefined | null): Promise<ActionResult> {
  if (!phoneNumber) {
    return { success: false, message: 'Phone number not provided or not found.' };
  }

  // Construct the PhoneNumber object if your service still requires it
  // Otherwise, directly use the phoneNumber string if the service accepts it
  // const phone: PhoneNumber = { phoneNumber }; // Uncomment if needed by sendWhatsAppMessage
  const message = 'Remember to put the food in the fridge!';

  try {
    // Pass the phone number string directly if the service allows
    // Or pass the 'phone' object if required: await sendWhatsAppMessage(phone, message);
    const success = await sendWhatsAppMessage({ phoneNumber }, message); // Assuming service needs object

    if (success) {
        // revalidatePath('/'); // Optional: revalidate page if needed
        return { success: true, message: 'WhatsApp reminder sent successfully!' };
    } else {
        return { success: false, message: 'Failed to send WhatsApp reminder (service error).' };
    }
  } catch (error) {
    console.error('Error sending WhatsApp message via server action:', error);
    // Provide a more user-friendly error message
    return { success: false, message: 'An error occurred while attempting to send the reminder.' };
  }
}
