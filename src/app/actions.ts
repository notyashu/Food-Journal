'use server';

import { sendWhatsAppMessage, type PhoneNumber } from '@/services/whatsapp';
import { revalidatePath } from 'next/cache';

interface ActionResult {
  success: boolean;
  message: string;
}

export async function sendReminderAction(phoneNumber: string | undefined): Promise<ActionResult> {
  if (!phoneNumber) {
    return { success: false, message: 'Phone number not provided.' };
  }

  const phone: PhoneNumber = { phoneNumber };
  const message = 'Remember to put the food in the fridge!';

  try {
    const success = await sendWhatsAppMessage(phone, message);
    if (success) {
        revalidatePath('/'); // Optional: revalidate page if needed, though likely not for this action
        return { success: true, message: 'WhatsApp reminder sent successfully!' };
    } else {
        return { success: false, message: 'Failed to send WhatsApp reminder.' };
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, message: 'An error occurred while sending the reminder.' };
  }
}
