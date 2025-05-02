# Food Journal App

A Next.js application built with Firebase for authentication and data storage, and integrated with Genkit AI. This project serves as a food journal application, allowing users to log events and potentially utilize AI features (via Genkit) in the future.

## Core Features:

- Food Intake Logging: Allow users to manually log when they eat food with a timestamp.
- Fridge Storage Logging: Enable users to log when they put food in the fridge with a timestamp.
- Event History Display: Display a clear and chronological history of logged food intakes and fridge storage events.
- Server Sync: Sync data to a server for backup and multi-device access.
- 
## Technologies Used

*   **Next.js** (React Framework)
*   **TypeScript**
*   **Firebase** (Authentication, Firestore Database)
*   **Genkit AI**
*   **Radix UI** and other UI components (`@/components/ui`)
*   **Tailwind CSS** (for styling)

## Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/notyashu/Food-Journal
    cd nextn
    ```

2.  **Install Dependencies:**

    ```bash
    npm install
    ```

3.  **Set up Firebase:**

    *   Create a new project in the [Firebase Console](https://console.firebase.google.com/).
    *   Set up Firebase Authentication (e.g., Email/Password).
    *   Set up Firestore Database.
    *   Obtain your Firebase configuration details.
    *   Create a `.env.local` file in the root of the project and add your Firebase configuration:

        ```env
        NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
        NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
        NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID # Optional
        ```

4.  **Set up Genkit AI:**

    *   Follow the Genkit AI setup instructions, including configuring your AI model (e.g., Google AI) as referenced in `src/ai/dev.ts`.
    *   Ensure necessary environment variables for Genkit are set up (refer to Genkit documentation).

## Running the Project

*   **Run the development server (with Turbopack):**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:9004`.

*   **Run Genkit development:**

    ```bash
    npm run genkit:dev
    ```

*   **Run Genkit with watch mode:**

    ```bash
    npm run genkit:watch
    ```

*   **Build for production:**

    ```bash
    npm run build
    ```

*   **Start production server:**

    ```bash
    npm start
    ```

*   **Run linting:**

    ```bash
    npm run lint
    ```

*   **Run type checking:**

    ```bash
    npm run typecheck
    ```

## Project Structure

*   `src/app`: Next.js App Router pages and API routes.
*   `src/components`: Reusable UI components (including `ui` folder for shadcn/ui or similar).
*   `src/lib`: Utility functions and Firebase initialization.
*   `src/context`: React contexts (e.g., AuthContext).
*   `src/hooks`: Custom React hooks.
*   `src/ai`: Genkit AI related files.

