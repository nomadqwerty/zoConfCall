import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";

//bootstrap imports

// import { SocketContext, socket } from "./context/SocketContext";
import { ConferenceProvider } from "@/context/conference.context";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ZN1",
  description: "ZN1 video chat",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head></head>
      <body className={inter.className}>
        {/* <div  > */}

        <ConferenceProvider>{children}</ConferenceProvider>
        {/* </div> */}
      </body>
    </html>
  );
}
