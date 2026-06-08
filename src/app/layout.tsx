import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/lib/authContext";
import { Providers } from "./providers";
import { ToastContainer, toast } from 'react-toastify';
export const metadata: Metadata = {
  
  description: "ສັງລວມບັນຫາ ກ່ຽວກັບແອັບ Sokxay One Plus",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lo">
      <body>
        <AuthProvider>
          <Providers>
            <AppShell>{children}</AppShell>
           <ToastContainer
            position="top-center"
            autoClose={2500}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            theme="colored"
            
          />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
